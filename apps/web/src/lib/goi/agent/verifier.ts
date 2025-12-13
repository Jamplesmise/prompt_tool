/**
 * GOI Agent Verifier
 *
 * 负责验证 TODO Item 执行结果的正确性
 */

import type { TodoItem } from '@platform/shared'
import { prisma } from '../../prisma'
import { invokeModel, type ModelConfig } from '../../modelInvoker'
import {
  buildVerifyMessages,
  parseVerifyResponse,
  ruleBasedVerify,
  canUseRuleVerification,
  type VerifyResult,
  type VerifyContext,
} from '../prompts/verifyPrompt'

// ============================================
// 类型定义
// ============================================

/**
 * Verifier 配置
 */
export type VerifierConfig = {
  /** 使用的模型 ID（可选，仅 LLM 验证时需要） */
  modelId?: string
  /** 是否优先使用规则验证 */
  preferRuleVerification?: boolean
  /** LLM 验证的置信度阈值 */
  confidenceThreshold?: number
  /** 模型参数 */
  modelParams?: {
    temperature?: number
    maxTokens?: number
  }
}

/**
 * 验证结果（扩展）
 */
export type ExtendedVerifyResult = VerifyResult & {
  /** Token 使用（仅 LLM 验证） */
  tokenUsage?: {
    input: number
    output: number
    total: number
  }
  /** 验证耗时 */
  latencyMs: number
}

// ============================================
// 模型配置获取
// ============================================

/**
 * 获取模型配置
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
      source: 'local',
    }
  }

  return null
}

// ============================================
// Verifier 类
// ============================================

/**
 * GOI Verifier - 结果验证器
 */
export class Verifier {
  private sessionId: string
  private config: VerifierConfig

  constructor(sessionId: string, config?: VerifierConfig) {
    this.sessionId = sessionId
    this.config = {
      preferRuleVerification: true,
      confidenceThreshold: 0.8,
      ...config,
    }
  }

  /**
   * 验证执行结果
   */
  async verify(
    todoItem: TodoItem,
    executionResult: unknown,
    context?: VerifyContext
  ): Promise<ExtendedVerifyResult> {
    const startTime = Date.now()

    // 1. 尝试规则验证（如果启用）
    if (this.config.preferRuleVerification && canUseRuleVerification(todoItem)) {
      const ruleResult = ruleBasedVerify(todoItem, executionResult)
      if (ruleResult) {
        return {
          ...ruleResult,
          latencyMs: Date.now() - startTime,
        }
      }
    }

    // 2. 如果没有配置模型，返回需要人工确认
    if (!this.config.modelId) {
      return {
        success: true, // 默认通过，但需要人工确认
        method: 'rule',
        reason: '无法进行自动验证（未配置验证模型），请人工确认',
        confidence: 0.5,
        needsHumanReview: true,
        suggestedAction: 'continue',
        latencyMs: Date.now() - startTime,
      }
    }

    // 3. 使用 LLM 验证
    try {
      const llmResult = await this.llmVerify(todoItem, executionResult, context)
      return {
        ...llmResult,
        latencyMs: Date.now() - startTime,
      }
    } catch (error) {
      console.error('[Verifier] LLM verification failed:', error)
      return {
        success: false,
        method: 'llm',
        reason: `LLM 验证失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        needsHumanReview: true,
        suggestedAction: 'retry',
        latencyMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 使用 LLM 验证
   */
  private async llmVerify(
    todoItem: TodoItem,
    executionResult: unknown,
    context?: VerifyContext
  ): Promise<ExtendedVerifyResult & { tokenUsage?: ExtendedVerifyResult['tokenUsage'] }> {
    if (!this.config.modelId) {
      throw new Error('Model ID is required for LLM verification')
    }

    const modelConfig = await getModelConfig(this.config.modelId)
    if (!modelConfig) {
      throw new Error(`Model not found: ${this.config.modelId}`)
    }

    // 构建消息
    const messages = buildVerifyMessages(todoItem, executionResult, context)

    // 调用 LLM
    const result = await invokeModel(modelConfig, {
      messages,
      temperature: this.config.modelParams?.temperature ?? 0.2,
      maxTokens: this.config.modelParams?.maxTokens ?? 1000,
    })

    // 解析响应
    const verifyResult = parseVerifyResponse(result.output)

    // 根据置信度决定是否需要人工确认
    if (verifyResult.confidence < this.config.confidenceThreshold!) {
      verifyResult.needsHumanReview = true
    }

    return {
      ...verifyResult,
      tokenUsage: {
        input: result.tokens.input,
        output: result.tokens.output,
        total: result.tokens.input + result.tokens.output,
      },
      latencyMs: result.latencyMs,
    }
  }

  /**
   * 快速验证（仅规则，不调用 LLM）
   */
  quickVerify(todoItem: TodoItem, executionResult: unknown): VerifyResult | null {
    if (!canUseRuleVerification(todoItem)) {
      return null
    }
    return ruleBasedVerify(todoItem, executionResult)
  }

  /**
   * 批量验证
   */
  async verifyBatch(
    items: Array<{ todoItem: TodoItem; result: unknown; context?: VerifyContext }>
  ): Promise<ExtendedVerifyResult[]> {
    const results: ExtendedVerifyResult[] = []

    for (const item of items) {
      const result = await this.verify(item.todoItem, item.result, item.context)
      results.push(result)
    }

    return results
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建 Verifier 实例
 */
export function createVerifier(sessionId: string, config?: VerifierConfig): Verifier {
  return new Verifier(sessionId, config)
}

/**
 * 快速验证执行结果
 */
export async function verify(
  sessionId: string,
  todoItem: TodoItem,
  executionResult: unknown,
  modelId?: string,
  context?: VerifyContext
): Promise<ExtendedVerifyResult> {
  const verifier = createVerifier(sessionId, { modelId })
  return verifier.verify(todoItem, executionResult, context)
}

/**
 * 仅规则验证（不调用 LLM）
 */
export function quickVerify(
  todoItem: TodoItem,
  executionResult: unknown
): VerifyResult | null {
  if (!canUseRuleVerification(todoItem)) {
    return null
  }
  return ruleBasedVerify(todoItem, executionResult)
}

// 导出类型
export type { VerifyResult, VerifyContext }
