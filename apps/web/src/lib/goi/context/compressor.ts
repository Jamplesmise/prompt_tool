/**
 * 上下文压缩器
 *
 * 负责执行上下文压缩：
 * - 多级别压缩策略
 * - 调用 LLM 生成摘要
 * - 保留关键信息
 * - 压缩结果验证
 */

import type {
  CompressionLevel,
  CompressionResult,
  CompressionConfig,
  ContextSummary,
  UncompressibleMarker,
  LayerContent,
  ContextLayer,
} from '@platform/shared'
import { COMPRESSION_CONFIGS } from '@platform/shared'
import { TokenCounter, tokenCounter } from './tokenCounter'
import {
  STANDARD_COMPRESSION_PROMPT,
  DEEP_COMPRESSION_PROMPT,
  PHASE_COMPRESSION_PROMPT,
  renderCompressionPrompt,
  createEmptySummary,
  parseSummaryFromLLM,
  validateSummary,
} from './templates'

// ============================================
// 类型定义
// ============================================

/**
 * LLM 调用函数类型
 */
export type LLMInvoker = (prompt: string) => Promise<string>

/**
 * 压缩选项
 */
export type CompressOptions = {
  /** 压缩级别 */
  level: CompressionLevel
  /** 不可压缩项 */
  uncompressibleItems?: UncompressibleMarker[]
  /** 自定义配置 */
  config?: Partial<CompressionConfig>
  /** 是否使用 LLM（默认 true） */
  useLLM?: boolean
}

/**
 * 压缩上下文输入
 */
export type CompressContextInput = {
  /** 各层内容 */
  layers: LayerContent[]
  /** 额外的上下文文本 */
  additionalContext?: string
  /** 之前的摘要（如果有） */
  previousSummary?: ContextSummary
}

// ============================================
// 压缩器类
// ============================================

/**
 * 上下文压缩器
 */
export class ContextCompressor {
  /** Token 计数器 */
  private counter: TokenCounter
  /** LLM 调用函数 */
  private llmInvoker?: LLMInvoker
  /** 默认配置 */
  private defaultConfig: CompressionConfig

  constructor(options?: {
    counter?: TokenCounter
    llmInvoker?: LLMInvoker
    defaultLevel?: CompressionLevel
  }) {
    this.counter = options?.counter ?? tokenCounter
    this.llmInvoker = options?.llmInvoker
    this.defaultConfig = COMPRESSION_CONFIGS[options?.defaultLevel ?? 'standard']
  }

  /**
   * 设置 LLM 调用函数
   */
  setLLMInvoker(invoker: LLMInvoker): void {
    this.llmInvoker = invoker
  }

  /**
   * 执行压缩
   */
  async compress(
    input: CompressContextInput,
    options: CompressOptions
  ): Promise<CompressionResult> {
    const startTime = Date.now()
    const config = this.mergeConfig(options.level, options.config)

    // 计算压缩前的 token 数
    const beforeTokens = this.calculateTotalTokens(input.layers)

    // 准备压缩内容
    const contentToCompress = this.prepareContent(input, options.uncompressibleItems)

    // 执行压缩
    let summary: ContextSummary
    let droppedInfo: string[] = []

    if (options.useLLM !== false && this.llmInvoker) {
      // 使用 LLM 压缩
      const result = await this.compressWithLLM(contentToCompress, config, options.level)
      summary = result.summary
      droppedInfo = result.droppedInfo
    } else {
      // 使用规则压缩
      const result = this.compressWithRules(input, config)
      summary = result.summary
      droppedInfo = result.droppedInfo
    }

    // 计算压缩后的 token 数
    const summaryText = JSON.stringify(summary)
    const afterTokens = this.counter.countTokens(summaryText)

    const duration = Date.now() - startTime

    return {
      success: true,
      beforeTokens,
      afterTokens,
      compressionRatio: beforeTokens > 0 ? afterTokens / beforeTokens : 1,
      summary,
      droppedInfo: droppedInfo.length > 0 ? droppedInfo : undefined,
      duration,
      compressedAt: new Date(),
    }
  }

  /**
   * 生成摘要（仅生成，不压缩）
   */
  async generateSummary(
    input: CompressContextInput,
    level: CompressionLevel = 'standard'
  ): Promise<ContextSummary> {
    if (!this.llmInvoker) {
      // 无 LLM 时使用规则生成
      return this.compressWithRules(input, COMPRESSION_CONFIGS[level]).summary
    }

    const content = this.prepareContent(input)
    const result = await this.compressWithLLM(content, COMPRESSION_CONFIGS[level], level)
    return result.summary
  }

  /**
   * 标记不可压缩项
   */
  preserveKeyInfo(
    content: string,
    markers: UncompressibleMarker[]
  ): { preserved: string; rest: string } {
    const preservedParts: string[] = []
    let rest = content

    for (const marker of markers) {
      // 根据标记类型提取需要保留的内容
      const pattern = this.getPreservePattern(marker)
      const matches = content.match(pattern)

      if (matches) {
        preservedParts.push(...matches)
        // 不从 rest 中移除，因为 LLM 需要完整上下文
      }
    }

    return {
      preserved: preservedParts.join('\n'),
      rest,
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 合并配置
   */
  private mergeConfig(
    level: CompressionLevel,
    customConfig?: Partial<CompressionConfig>
  ): CompressionConfig {
    const baseConfig = COMPRESSION_CONFIGS[level]
    return {
      ...baseConfig,
      ...customConfig,
    }
  }

  /**
   * 计算总 token 数
   */
  private calculateTotalTokens(layers: LayerContent[]): number {
    return layers.reduce((total, layer) => total + layer.tokens, 0)
  }

  /**
   * 准备压缩内容
   */
  private prepareContent(
    input: CompressContextInput,
    uncompressibleItems?: UncompressibleMarker[]
  ): string {
    const parts: string[] = []

    // 按优先级排序层
    const sortedLayers = [...input.layers].sort((a, b) => b.priority - a.priority)

    for (const layer of sortedLayers) {
      if (layer.content) {
        parts.push(`### ${this.getLayerLabel(layer.layer)}`)
        parts.push(layer.content)
        parts.push('')
      }
    }

    if (input.additionalContext) {
      parts.push('### 附加上下文')
      parts.push(input.additionalContext)
    }

    // 标记不可压缩项
    if (uncompressibleItems && uncompressibleItems.length > 0) {
      parts.push('')
      parts.push('### 不可压缩项（必须保留）')
      for (const item of uncompressibleItems) {
        parts.push(`- [${item.type}] ${item.id}: ${item.reason}`)
      }
    }

    return parts.join('\n')
  }

  /**
   * 获取层标签
   */
  private getLayerLabel(layer: ContextLayer): string {
    const labels: Record<ContextLayer, string> = {
      system: '系统层',
      session: '会话层',
      working: '工作层',
      instant: '即时层',
    }
    return labels[layer]
  }

  /**
   * 使用 LLM 压缩
   */
  private async compressWithLLM(
    content: string,
    config: CompressionConfig,
    level: CompressionLevel
  ): Promise<{ summary: ContextSummary; droppedInfo: string[] }> {
    if (!this.llmInvoker) {
      throw new Error('LLM invoker not configured')
    }

    // 选择合适的 prompt
    const promptTemplate = this.getPromptTemplate(level)
    const prompt = renderCompressionPrompt(promptTemplate, content, {
      KEEP_RECENT: String(config.keepRecentOperations),
    })

    // 调用 LLM
    const response = await this.llmInvoker(prompt)

    // 解析响应
    const summary = parseSummaryFromLLM(response)
    if (!summary) {
      // 解析失败，使用规则压缩作为后备
      console.warn('Failed to parse LLM response, falling back to rule-based compression')
      return this.compressWithRules(
        { layers: [], additionalContext: content },
        config
      )
    }

    // 验证摘要
    const validation = validateSummary(summary)
    if (!validation.valid) {
      console.warn('Summary validation failed:', validation.errors)
    }

    // 计算丢弃的信息
    const droppedInfo = this.calculateDroppedInfo(content, summary, config)

    return { summary, droppedInfo }
  }

  /**
   * 使用规则压缩
   */
  private compressWithRules(
    input: CompressContextInput,
    config: CompressionConfig
  ): { summary: ContextSummary; droppedInfo: string[] } {
    const droppedInfo: string[] = []

    // 如果有之前的摘要，基于它更新
    if (input.previousSummary) {
      return {
        summary: {
          ...input.previousSummary,
          version: input.previousSummary.version + 1,
          generatedAt: new Date(),
        },
        droppedInfo,
      }
    }

    // 否则创建新摘要
    const summary = createEmptySummary()

    // 从层内容中提取信息
    for (const layer of input.layers) {
      if (layer.layer === 'session') {
        // 尝试从会话层提取目标
        const goalMatch = layer.content.match(/## 用户目标\n(.+?)(\n|$)/s)
        if (goalMatch) {
          summary.goal = goalMatch[1].trim()
        }

        // 提取约束条件
        const constraintMatch = layer.content.match(/## 约束条件\n([\s\S]+?)(\n##|$)/)
        if (constraintMatch) {
          summary.constraints = constraintMatch[1]
            .split('\n')
            .filter((line) => line.trim().match(/^\d+\./))
            .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        }
      }

      if (layer.layer === 'working') {
        // 提取当前页面
        const pageMatch = layer.content.match(/## UI 状态\n.*?页面[：:]\s*(\S+)/s)
        if (pageMatch) {
          summary.currentState.page = pageMatch[1]
        }

        // 提取当前 TODO
        const todoMatch = layer.content.match(/## 当前 TODO\n(.+?)(\n##|$)/s)
        if (todoMatch) {
          summary.nextStep = todoMatch[1].trim().slice(0, 100) // 限制长度
        }
      }
    }

    // 根据配置丢弃信息
    if (config.keepRecentOperations === 0) {
      droppedInfo.push('所有操作详情')
    } else if (config.keepRecentOperations < 3) {
      droppedInfo.push(`保留最近${config.keepRecentOperations}个操作，其余丢弃`)
    }

    return { summary, droppedInfo }
  }

  /**
   * 获取压缩 Prompt 模板
   */
  private getPromptTemplate(level: CompressionLevel): string {
    switch (level) {
      case 'deep':
        return DEEP_COMPRESSION_PROMPT
      case 'phase':
        return PHASE_COMPRESSION_PROMPT
      default:
        return STANDARD_COMPRESSION_PROMPT
    }
  }

  /**
   * 计算丢弃的信息
   */
  private calculateDroppedInfo(
    originalContent: string,
    summary: ContextSummary,
    config: CompressionConfig
  ): string[] {
    const dropped: string[] = []

    // 检查是否丢弃了操作详情
    if (config.keepRecentOperations === 0) {
      dropped.push('所有操作详情')
    }

    // 检查查询结果
    if (originalContent.includes('## 查询结果')) {
      dropped.push('中间查询结果')
    }

    // 检查调试信息
    if (originalContent.includes('debug') || originalContent.includes('DEBUG')) {
      dropped.push('调试日志')
    }

    return dropped
  }

  /**
   * 获取保留模式
   */
  private getPreservePattern(marker: UncompressibleMarker): RegExp {
    switch (marker.type) {
      case 'todo_item':
        return new RegExp(`TODO.*${marker.id}.*`, 'gi')
      case 'decision':
        return new RegExp(`决策.*${marker.id}.*`, 'gi')
      case 'resource':
        return new RegExp(`${marker.id}`, 'g')
      case 'constraint':
        return new RegExp(`约束.*${marker.id}.*`, 'gi')
      default:
        return new RegExp(marker.id, 'g')
    }
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建压缩器
 */
export function createCompressor(options?: {
  llmInvoker?: LLMInvoker
  defaultLevel?: CompressionLevel
}): ContextCompressor {
  return new ContextCompressor(options)
}

// ============================================
// 单例导出
// ============================================

/** 全局压缩器实例（需要调用 setLLMInvoker 设置 LLM） */
export const compressor = new ContextCompressor()
