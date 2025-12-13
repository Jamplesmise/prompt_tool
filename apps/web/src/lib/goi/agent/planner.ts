/**
 * GOI Agent Planner
 *
 * 负责将用户目标拆解为原子操作的 TODO List
 */

import type {
  TodoList,
  CreateTodoListInput,
  CreateTodoItemInput,
  GoiOperation,
} from '@platform/shared'
import {
  buildPlanMessages,
  parsePlanResponse,
  validatePlan,
  type PlanContext,
  type PlanOutput,
  type PlanItem,
} from '../prompts/planPrompt'
import { createTodoList } from '../todo/todoList'
import { todoStore } from '../todo/todoStore'
import { eventBus } from '../../events'
import { prisma } from '../../prisma'
import { invokeModel, type ModelConfig } from '../../modelInvoker'

// ============================================
// 类型定义
// ============================================

/**
 * Planner 配置
 */
export type PlannerConfig = {
  /** 使用的模型 ID（必填，由用户选择） */
  modelId: string
  /** 最大重试次数 */
  maxRetries?: number
  /** 是否自动保存 */
  autoSave?: boolean
  /** 模型调用参数 */
  modelParams?: {
    temperature?: number
    maxTokens?: number
  }
}

/**
 * 计划生成结果
 */
export type PlanResult = {
  success: boolean
  todoList?: TodoList
  goalAnalysis?: string
  warnings?: string[]
  error?: string
  /** Token 使用统计 */
  tokenUsage?: {
    input: number
    output: number
    total: number
  }
  /** 调用耗时 */
  latencyMs?: number
}

// ============================================
// 模型配置获取
// ============================================

/**
 * 获取模型配置（支持本地模型和 FastGPT 模型）
 */
async function getModelConfig(modelId: string): Promise<ModelConfig | null> {
  // 首先尝试从同步的 FastGPT 模型表查找
  const syncedModel = await prisma.syncedModel.findUnique({
    where: { id: modelId },
  })

  if (syncedModel) {
    return {
      id: syncedModel.id,
      modelId: syncedModel.modelId,
      provider: {
        type: 'openai',
        baseUrl: '',
        apiKey: '',
        headers: {},
      },
      config: {},
      pricing: {
        inputPerMillion: syncedModel.inputPrice ? syncedModel.inputPrice * 1000 : undefined,
        outputPerMillion: syncedModel.outputPrice ? syncedModel.outputPrice * 1000 : undefined,
        currency: 'CNY',
      },
      source: 'fastgpt',
    }
  }

  // 从本地模型表查找
  const localModel = await prisma.model.findUnique({
    where: { id: modelId },
    include: { provider: true },
  })

  if (localModel) {
    return {
      id: localModel.id,
      modelId: localModel.modelId,
      provider: {
        type: localModel.provider.type,
        baseUrl: localModel.provider.baseUrl,
        apiKey: localModel.provider.apiKey,
        headers: (localModel.provider.headers as Record<string, string>) || {},
      },
      config: (localModel.config as Record<string, unknown>) || {},
      pricing: localModel.pricing as ModelConfig['pricing'],
      source: 'local',
    }
  }

  return null
}

/**
 * 调用 LLM 生成计划
 */
async function callLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: PlannerConfig
): Promise<{ content: string; tokenUsage?: { input: number; output: number }; latencyMs: number }> {
  const modelConfig = await getModelConfig(config.modelId)
  if (!modelConfig) {
    throw new Error(`Model not found: ${config.modelId}`)
  }

  const result = await invokeModel(modelConfig, {
    messages,
    temperature: config.modelParams?.temperature ?? 0.3,
    maxTokens: config.modelParams?.maxTokens ?? 4000,
  })

  return {
    content: result.output,
    tokenUsage: {
      input: result.tokens.input,
      output: result.tokens.output,
    },
    latencyMs: result.latencyMs,
  }
}

// ============================================
// Planner 类
// ============================================

/**
 * GOI Planner - 计划生成器
 */
export class Planner {
  private config: PlannerConfig
  private sessionId: string

  constructor(sessionId: string, config: PlannerConfig) {
    if (!config.modelId) {
      throw new Error('modelId is required for Planner')
    }
    this.sessionId = sessionId
    this.config = {
      maxRetries: 3,
      autoSave: true,
      ...config,
    }
  }

  /**
   * 生成计划
   */
  async generatePlan(goal: string, context?: PlanContext): Promise<PlanResult> {
    let lastError: Error | null = null
    let totalTokenUsage = { input: 0, output: 0, total: 0 }
    let totalLatency = 0

    for (let attempt = 0; attempt < (this.config.maxRetries || 3); attempt++) {
      try {
        // 1. 构建消息
        const messages = buildPlanMessages(goal, context)

        // 2. 调用 LLM
        const llmResult = await callLLM(messages, this.config)

        // 记录 token 使用
        if (llmResult.tokenUsage) {
          totalTokenUsage.input += llmResult.tokenUsage.input
          totalTokenUsage.output += llmResult.tokenUsage.output
          totalTokenUsage.total = totalTokenUsage.input + totalTokenUsage.output
        }
        totalLatency += llmResult.latencyMs

        // 3. 解析响应
        const planOutput = parsePlanResponse(llmResult.content)

        // 4. 验证计划
        const validation = validatePlan(planOutput)
        if (!validation.valid) {
          throw new Error(`Invalid plan: ${validation.errors.join(', ')}`)
        }

        // 5. 转换为 TODO List
        const todoList = this.convertToTodoList(goal, planOutput)

        // 6. 保存（如果启用）
        if (this.config.autoSave) {
          await todoStore.save(todoList)
        }

        // 7. 发布事件
        await this.publishPlanEvent(todoList, planOutput)

        return {
          success: true,
          todoList,
          goalAnalysis: planOutput.goalAnalysis,
          warnings: planOutput.warnings,
          tokenUsage: totalTokenUsage,
          latencyMs: totalLatency,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`[Planner] Attempt ${attempt + 1} failed:`, lastError.message)

        // 如果是解析错误，可能需要重试
        if (attempt < (this.config.maxRetries || 3) - 1) {
          await this.delay(1000 * (attempt + 1)) // 递增延迟
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      tokenUsage: totalTokenUsage,
      latencyMs: totalLatency,
    }
  }

  /**
   * 将 LLM 输出转换为 TODO List
   */
  private convertToTodoList(goal: string, planOutput: PlanOutput): TodoList {
    const items: CreateTodoItemInput[] = planOutput.items.map((item) =>
      this.convertPlanItem(item)
    )

    const input: CreateTodoListInput = {
      sessionId: this.sessionId,
      goal,
      goalAnalysis: planOutput.goalAnalysis,
      items,
      metadata: {
        warnings: planOutput.warnings,
        generatedAt: new Date().toISOString(),
      },
    }

    const todoList = createTodoList(input)

    // 建立 LLM ID 到实际 nanoid 的映射
    // LLM 生成的 ID 是 '1', '2', '3' 等，需要映射到实际的 nanoid
    const idMapping: Record<string, string> = {}
    planOutput.items.forEach((planItem, index) => {
      if (todoList.items[index]) {
        idMapping[planItem.id] = todoList.items[index].id
      }
    })

    // 更新所有 item 的 dependsOn，将 LLM ID 替换为实际 ID
    todoList.items.forEach((item) => {
      item.dependsOn = item.dependsOn
        .map((depId) => idMapping[depId] || depId)
        .filter((depId) => {
          // 过滤掉无效的依赖（映射不到实际 ID 的）
          const exists = todoList.items.some((i) => i.id === depId)
          if (!exists) {
            console.warn(`[Planner] Invalid dependency ID: ${depId}, removing`)
          }
          return exists
        })
    })

    console.log('[Planner] ID mapping:', idMapping)
    console.log('[Planner] Items with resolved dependencies:', todoList.items.map((i) => ({
      id: i.id,
      title: i.title,
      dependsOn: i.dependsOn,
    })))

    return todoList
  }

  /**
   * 将计划项转换为 TODO Item 输入
   */
  private convertPlanItem(item: PlanItem): CreateTodoItemInput {
    return {
      title: item.title,
      description: item.description,
      category: item.category,
      goiOperation: item.goiOperation as GoiOperation,
      dependsOn: item.dependsOn,
      priority: parseInt(item.id, 10) || undefined, // 使用 id 作为默认优先级
      estimatedDuration: item.estimatedDuration,
      checkpoint: {
        required: item.checkpoint.required,
        type: item.checkpoint.type || 'confirmation',
        message: item.checkpoint.message,
      },
      rollback: {
        enabled: item.goiOperation.type === 'state', // 状态变更启用回滚
        strategy: 'auto',
      },
    }
  }

  /**
   * 发布计划事件
   */
  private async publishPlanEvent(todoList: TodoList, planOutput: PlanOutput): Promise<void> {
    try {
      await eventBus.publish({
        sessionId: this.sessionId,
        type: 'TODO_PLANNED',
        source: 'ai',
        payload: {
          todoListId: todoList.id,
          items: todoList.items.map((item, index) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            order: index,
          })),
          totalItems: todoList.items.length,
        },
      })
    } catch (error) {
      console.error('[Planner] Failed to publish event:', error)
    }
  }

  /**
   * 重新规划
   */
  async replan(
    todoListId: string,
    reason: string,
    additionalContext?: PlanContext
  ): Promise<PlanResult> {
    // 获取现有 TODO List
    const existingList = await todoStore.getById(todoListId)
    if (!existingList) {
      return {
        success: false,
        error: 'TODO List not found',
      }
    }

    // 收集已完成项的信息作为上下文
    const completedItems = existingList.items
      .filter((item) => item.status === 'completed')
      .map((item) => ({
        title: item.title,
        result: item.result,
      }))

    // 构建重规划上下文
    const replanContext: PlanContext = {
      ...additionalContext,
      systemSummary: `正在重新规划。原因：${reason}。已完成 ${completedItems.length} 项操作。`,
      recentResources: completedItems.slice(-5).map((item) => ({
        type: 'completed_task',
        id: item.title,
        name: item.title,
        action: 'completed',
      })),
    }

    // 生成新计划
    const result = await this.generatePlan(
      `${existingList.goal}（续）- ${reason}`,
      replanContext
    )

    if (result.success && result.todoList) {
      // 发布重规划事件
      await eventBus.publish({
        sessionId: this.sessionId,
        type: 'TODO_REPLANNED',
        source: 'ai',
        payload: {
          todoListId: result.todoList.id,
          reason,
          addedItems: result.todoList.items.map((item, index) => ({
            id: item.id,
            title: item.title,
            order: index,
          })),
          removedItemIds: [], // 新计划不删除旧项
          reorderedItems: [], // 新计划无需重排
        },
      })
    }

    return result
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建 Planner 实例
 */
export function createPlanner(sessionId: string, config: PlannerConfig): Planner {
  return new Planner(sessionId, config)
}

/**
 * 快速生成计划
 *
 * @param sessionId 会话 ID
 * @param goal 用户目标
 * @param modelId 模型 ID（由用户选择，必填）
 * @param context 上下文信息
 * @param config 其他配置
 */
export async function generatePlan(
  sessionId: string,
  goal: string,
  modelId: string,
  context?: PlanContext,
  config?: Omit<PlannerConfig, 'modelId'>
): Promise<PlanResult> {
  const planner = createPlanner(sessionId, { modelId, ...config })
  return planner.generatePlan(goal, context)
}
