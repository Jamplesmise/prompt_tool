/**
 * GOI Agent Gatherer
 *
 * 负责在执行 TODO Item 前收集所需的上下文信息
 */

import type { TodoItem, TodoList } from '@platform/shared'
import { prisma } from '../../prisma'
import {
  extractResourceReferences,
  resolveAllResourceReferences,
  replaceResourceReferences,
  type ResourceCandidate,
  type ResourceHint,
} from './resourceResolver'

// ============================================
// 类型定义
// ============================================

/**
 * 待确认的资源选择
 */
export type PendingResourceSelection = {
  /** 原始引用字符串（如 "$prompt:情感分析"） */
  reference: string
  /** 资源类型 */
  resourceType: string
  /** 用户描述 */
  hint: string
  /** 候选资源列表 */
  candidates: ResourceCandidate[]
}

/**
 * 收集的上下文信息
 */
export type GatheredContext = {
  /** 系统状态 */
  system: {
    currentPage?: string
    selectedResources: Array<{ type: string; id: string; name?: string }>
  }

  /** 已完成项的历史信息 */
  completedItems: Array<{
    id: string
    title: string
    result: unknown
    completedAt?: Date
  }>

  /** 相关资源信息 */
  relatedResources: Array<{
    type: string
    id: string
    name?: string
    summary: string
    data?: Record<string, unknown>
  }>

  /** 依赖项结果 */
  dependencyResults: Record<string, unknown>

  /** 已解析的资源引用（引用字符串 -> 资源ID） */
  resolvedResources: Record<string, string>

  /** 待确认的资源选择（需要用户选择） */
  pendingResourceSelections: PendingResourceSelection[]

  /** 解析失败的资源引用 */
  failedResourceResolutions: Array<{
    reference: string
    resourceType: string
    hint: string
    error: string
  }>

  /** Token 估算 */
  tokenEstimate: number

  /** 收集时间 */
  gatheredAt: Date
}

/**
 * Gatherer 配置
 */
export type GathererConfig = {
  /** 最大 token 限制 */
  maxTokens?: number
  /** 是否包含详细资源数据 */
  includeResourceData?: boolean
  /** 最大历史项数 */
  maxHistoryItems?: number
  /** 最大相关资源数 */
  maxRelatedResources?: number
}

// ============================================
// Token 估算
// ============================================

/**
 * 简单的 Token 估算（按字符数）
 * 粗略估计：中文 1 字符 ≈ 2 token，英文 4 字符 ≈ 1 token
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars * 2 + otherChars / 4)
}

/**
 * 估算对象的 Token 数
 */
function estimateObjectTokens(obj: unknown): number {
  return estimateTokens(JSON.stringify(obj))
}

// ============================================
// Gatherer 类
// ============================================

/**
 * GOI Gatherer - 上下文收集器
 */
export class Gatherer {
  private sessionId: string
  private config: GathererConfig

  constructor(sessionId: string, config?: GathererConfig) {
    this.sessionId = sessionId
    this.config = {
      maxTokens: 4000,
      includeResourceData: true,
      maxHistoryItems: 10,
      maxRelatedResources: 5,
      ...config,
    }
  }

  /**
   * 收集执行 TODO Item 所需的上下文
   */
  async gatherContext(todoItem: TodoItem, todoList: TodoList): Promise<GatheredContext> {
    const context: GatheredContext = {
      system: {
        selectedResources: [],
      },
      completedItems: [],
      relatedResources: [],
      dependencyResults: {},
      resolvedResources: {},
      pendingResourceSelections: [],
      failedResourceResolutions: [],
      tokenEstimate: 0,
      gatheredAt: new Date(),
    }

    // 1. 收集系统状态
    await this.gatherSystemState(context)

    // 2. 收集已完成项信息
    this.gatherCompletedItems(context, todoList)

    // 3. 收集依赖项结果
    this.gatherDependencyResults(context, todoItem, todoList)

    // 4. 收集相关资源
    await this.gatherRelatedResources(context, todoItem)

    // 5. 解析资源引用（如 $prompt:情感分析）
    await this.resolveResourceReferences(context, todoItem)

    // 6. 压缩上下文（如果超过限制）
    this.compressContext(context)

    // 7. 计算 Token 估算
    context.tokenEstimate = estimateObjectTokens(context)

    return context
  }

  /**
   * 收集系统状态
   */
  private async gatherSystemState(context: GatheredContext): Promise<void> {
    // 从 session 状态中获取（如果有的话）
    // 这里简化处理，实际可以从 Redis 或其他存储中获取
    try {
      // 暂时使用空状态，实际实现时可以从前端传递或从存储中获取
      context.system = {
        currentPage: undefined,
        selectedResources: [],
      }
    } catch (error) {
      console.warn('[Gatherer] Failed to gather system state:', error)
    }
  }

  /**
   * 收集已完成项信息
   */
  private gatherCompletedItems(context: GatheredContext, todoList: TodoList): void {
    const completedItems = todoList.items
      .filter((item) => item.status === 'completed')
      .slice(-this.config.maxHistoryItems!)
      .map((item) => ({
        id: item.id,
        title: item.title,
        result: item.result,
        completedAt: item.completedAt,
      }))

    context.completedItems = completedItems
  }

  /**
   * 收集依赖项结果
   */
  private gatherDependencyResults(
    context: GatheredContext,
    todoItem: TodoItem,
    todoList: TodoList
  ): void {
    for (const depId of todoItem.dependsOn) {
      const depItem = todoList.items.find((item) => item.id === depId)
      if (depItem && depItem.status === 'completed') {
        context.dependencyResults[depId] = {
          title: depItem.title,
          result: depItem.result,
        }
      }
    }
  }

  /**
   * 收集相关资源信息
   */
  private async gatherRelatedResources(
    context: GatheredContext,
    todoItem: TodoItem
  ): Promise<void> {
    const operation = todoItem.goiOperation
    if (!operation) return

    try {
      // 根据操作类型收集相关资源
      if (operation.type === 'access' || operation.type === 'state') {
        const target = operation.target as { resourceType: string; resourceId?: string }
        if (target?.resourceId) {
          const resource = await this.fetchResource(target.resourceType, target.resourceId)
          if (resource) {
            context.relatedResources.push(resource)
          }
        }
      } else if (operation.type === 'observation') {
        const queries = (operation as { queries?: Array<{ resourceType: string; resourceId?: string }> }).queries || []
        for (const query of queries.slice(0, this.config.maxRelatedResources!)) {
          if (query.resourceId) {
            const resource = await this.fetchResource(query.resourceType, query.resourceId)
            if (resource) {
              context.relatedResources.push(resource)
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Gatherer] Failed to gather related resources:', error)
    }
  }

  /**
   * 获取资源信息
   */
  private async fetchResource(
    resourceType: string,
    resourceId: string
  ): Promise<GatheredContext['relatedResources'][0] | null> {
    try {
      let data: Record<string, unknown> | null = null
      let name: string | undefined
      let summary = ''

      switch (resourceType) {
        case 'prompt': {
          const prompt = await prisma.prompt.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              name: true,
              description: true,
              currentVersion: true,
            },
          })
          if (prompt) {
            name = prompt.name
            summary = prompt.description || `提示词 v${prompt.currentVersion}`
            if (this.config.includeResourceData) {
              data = prompt as unknown as Record<string, unknown>
            }
          }
          break
        }

        case 'dataset': {
          const dataset = await prisma.dataset.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              name: true,
              description: true,
              rowCount: true,
            },
          })
          if (dataset) {
            name = dataset.name
            summary = `${dataset.description || '数据集'} (${dataset.rowCount} 行)`
            if (this.config.includeResourceData) {
              data = dataset as unknown as Record<string, unknown>
            }
          }
          break
        }

        case 'model': {
          const model = await prisma.model.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              name: true,
              modelId: true,
              provider: { select: { name: true } },
            },
          })
          if (model) {
            name = model.name
            summary = `${model.provider.name} - ${model.modelId}`
            if (this.config.includeResourceData) {
              data = { ...model, providerName: model.provider.name } as unknown as Record<string, unknown>
            }
          }
          break
        }

        case 'evaluator': {
          const evaluator = await prisma.evaluator.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
            },
          })
          if (evaluator) {
            name = evaluator.name
            summary = `${evaluator.type} 评估器: ${evaluator.description || ''}`
            if (this.config.includeResourceData) {
              data = evaluator as unknown as Record<string, unknown>
            }
          }
          break
        }

        case 'task': {
          const task = await prisma.task.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              name: true,
              status: true,
              progress: true,
            },
          })
          if (task) {
            name = task.name
            summary = `任务 ${task.status} (${task.progress}%)`
            if (this.config.includeResourceData) {
              data = task as unknown as Record<string, unknown>
            }
          }
          break
        }

        default:
          return null
      }

      if (!name) return null

      return {
        type: resourceType,
        id: resourceId,
        name,
        summary,
        data: data || undefined,
      }
    } catch (error) {
      console.warn(`[Gatherer] Failed to fetch ${resourceType}/${resourceId}:`, error)
      return null
    }
  }

  /**
   * 解析 TODO Item 中的资源引用
   *
   * 处理如 "$prompt:情感分析" 这样的引用，解析为实际的资源 ID。
   * 如果有多个匹配，需要用户确认选择。
   */
  private async resolveResourceReferences(
    context: GatheredContext,
    todoItem: TodoItem
  ): Promise<void> {
    const operation = todoItem.goiOperation
    if (!operation) return

    try {
      // 检查操作中是否包含资源引用
      const references = extractResourceReferences(operation)
      if (references.length === 0) {
        return
      }

      console.log('[Gatherer] Found resource references:', references)

      // 解析所有资源引用
      const resolutionResult = await resolveAllResourceReferences(operation)

      // 记录已解析的引用
      context.resolvedResources = resolutionResult.resolved

      // 记录需要确认的引用
      context.pendingResourceSelections = resolutionResult.needsConfirmation.map((nc) => ({
        reference: nc.reference,
        resourceType: nc.resourceType,
        hint: nc.hint,
        candidates: nc.candidates,
      }))

      // 记录解析失败的引用
      context.failedResourceResolutions = resolutionResult.failed

      // 如果有解析成功的引用，替换操作中的引用为实际 ID
      if (Object.keys(resolutionResult.resolved).length > 0) {
        const resolvedOperation = replaceResourceReferences(
          operation,
          resolutionResult.resolved
        )
        // 更新 todoItem 的 goiOperation（注意：这会修改原始对象）
        Object.assign(todoItem.goiOperation!, resolvedOperation)
      }

      // 日志输出
      if (context.pendingResourceSelections.length > 0) {
        console.log(
          '[Gatherer] Resource references need confirmation:',
          context.pendingResourceSelections.map((p) => p.reference)
        )
      }
      if (context.failedResourceResolutions.length > 0) {
        console.warn(
          '[Gatherer] Failed to resolve resources:',
          context.failedResourceResolutions.map((f) => `${f.reference}: ${f.error}`)
        )
      }
    } catch (error) {
      console.error('[Gatherer] Failed to resolve resource references:', error)
    }
  }

  /**
   * 压缩上下文（如果超过 token 限制）
   */
  private compressContext(context: GatheredContext): void {
    let currentTokens = estimateObjectTokens(context)

    // 如果没有超过限制，直接返回
    if (currentTokens <= this.config.maxTokens!) {
      return
    }

    // 1. 首先移除资源详细数据
    for (const resource of context.relatedResources) {
      if (resource.data) {
        delete resource.data
        currentTokens = estimateObjectTokens(context)
        if (currentTokens <= this.config.maxTokens!) return
      }
    }

    // 2. 减少历史项数
    while (context.completedItems.length > 3 && currentTokens > this.config.maxTokens!) {
      context.completedItems.shift()
      currentTokens = estimateObjectTokens(context)
    }

    // 3. 减少相关资源
    while (context.relatedResources.length > 2 && currentTokens > this.config.maxTokens!) {
      context.relatedResources.pop()
      currentTokens = estimateObjectTokens(context)
    }

    // 4. 简化历史项结果
    for (const item of context.completedItems) {
      if (typeof item.result === 'object' && item.result !== null) {
        item.result = '[结果已压缩]'
        currentTokens = estimateObjectTokens(context)
        if (currentTokens <= this.config.maxTokens!) return
      }
    }
  }

  /**
   * 获取压缩的上下文摘要（用于 prompt）
   */
  getContextSummary(context: GatheredContext): string {
    const parts: string[] = []

    // 系统状态
    if (context.system.currentPage) {
      parts.push(`当前页面: ${context.system.currentPage}`)
    }
    if (context.system.selectedResources.length > 0) {
      parts.push(`选中资源: ${context.system.selectedResources.map((r) => `${r.type}/${r.name || r.id}`).join(', ')}`)
    }

    // 已完成项
    if (context.completedItems.length > 0) {
      parts.push(`已完成 ${context.completedItems.length} 项操作`)
      const recentItems = context.completedItems.slice(-3)
      for (const item of recentItems) {
        parts.push(`  - ${item.title}`)
      }
    }

    // 相关资源
    if (context.relatedResources.length > 0) {
      parts.push(`相关资源:`)
      for (const resource of context.relatedResources) {
        parts.push(`  - ${resource.type}: ${resource.name} - ${resource.summary}`)
      }
    }

    return parts.join('\n')
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建 Gatherer 实例
 */
export function createGatherer(sessionId: string, config?: GathererConfig): Gatherer {
  return new Gatherer(sessionId, config)
}

/**
 * 快速收集上下文
 */
export async function gatherContext(
  sessionId: string,
  todoItem: TodoItem,
  todoList: TodoList,
  config?: GathererConfig
): Promise<GatheredContext> {
  const gatherer = createGatherer(sessionId, config)
  return gatherer.gatherContext(todoItem, todoList)
}
