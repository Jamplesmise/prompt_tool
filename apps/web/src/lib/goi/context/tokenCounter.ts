/**
 * Token 计数器
 *
 * 用于准确估算上下文的 Token 使用量
 * 使用基于规则的估算方式，可后续集成 tiktoken
 */

import type {
  ContextUsage,
  ContextLayer,
  ContextWarningLevel,
  ContextThresholds,
  LayerContent,
} from '@platform/shared'
import {
  DEFAULT_CONTEXT_THRESHOLDS,
  CLAUDE_CONTEXT_LIMITS,
} from '@platform/shared'

// ============================================
// Token 估算规则
// ============================================

/**
 * Token 估算配置
 * 基于 cl100k_base 编码的经验值
 */
const TOKEN_ESTIMATION_CONFIG = {
  /** 英文字符与 token 的比例 */
  englishCharsPerToken: 4,
  /** 中文字符与 token 的比例 */
  chineseCharsPerToken: 1.5,
  /** 日文/韩文字符与 token 的比例 */
  cjkCharsPerToken: 1.5,
  /** 特殊字符的 token 估算 */
  specialCharTokens: {
    newline: 1,
    tab: 1,
    space: 0.25,
  },
  /** JSON 结构开销（每层嵌套） */
  jsonOverheadPerLevel: 2,
  /** 安全系数（略微高估以确保不超限） */
  safetyFactor: 1.05,
}

// ============================================
// 字符分类正则表达式
// ============================================

/** 中文字符范围 */
const CHINESE_REGEX = /[\u4e00-\u9fff]/g
/** 日文字符范围 */
const JAPANESE_REGEX = /[\u3040-\u309f\u30a0-\u30ff]/g
/** 韩文字符范围 */
const KOREAN_REGEX = /[\uac00-\ud7af]/g
/** 英文单词边界 */
const ENGLISH_WORD_REGEX = /[a-zA-Z]+/g
/** 数字 */
const NUMBER_REGEX = /\d+/g

// ============================================
// Token 计数器类
// ============================================

/**
 * Token 计数器
 */
export class TokenCounter {
  /** 缓存：文本 -> token 数 */
  private cache = new Map<string, number>()
  /** 缓存最大容量 */
  private maxCacheSize = 1000
  /** 默认最大 token 限制 */
  private defaultMaxTokens = CLAUDE_CONTEXT_LIMITS.safeLimit

  /**
   * 计算文本的 token 数
   * @param text 待计算的文本
   * @returns token 数量
   */
  countTokens(text: string): number {
    if (!text) return 0

    // 检查缓存
    const cached = this.cache.get(text)
    if (cached !== undefined) {
      return cached
    }

    // 执行计算
    const count = this.estimateTokens(text)

    // 存入缓存（控制缓存大小）
    if (this.cache.size >= this.maxCacheSize) {
      // 简单的 LRU：删除最早的一半
      const entries = Array.from(this.cache.entries())
      entries.slice(0, this.maxCacheSize / 2).forEach(([key]) => {
        this.cache.delete(key)
      })
    }
    this.cache.set(text, count)

    return count
  }

  /**
   * 批量计算 token 数
   * @param texts 文本数组
   * @returns token 数量数组
   */
  countTokensBatch(texts: string[]): number[] {
    return texts.map((text) => this.countTokens(text))
  }

  /**
   * 计算对象的 token 数（序列化为 JSON）
   * @param obj 对象
   * @returns token 数量
   */
  countObjectTokens(obj: unknown): number {
    if (obj === null || obj === undefined) return 0
    const json = JSON.stringify(obj)
    // 加上 JSON 结构开销
    const depth = this.getJsonDepth(obj)
    const overhead = depth * TOKEN_ESTIMATION_CONFIG.jsonOverheadPerLevel
    return this.countTokens(json) + overhead
  }

  /**
   * 计算上下文使用量
   * @param layers 各层内容
   * @param maxTokens 最大 token 限制
   * @param thresholds 阈值配置
   * @returns 使用量统计
   */
  countContextUsage(
    layers: LayerContent[],
    maxTokens: number = this.defaultMaxTokens,
    thresholds: ContextThresholds = DEFAULT_CONTEXT_THRESHOLDS
  ): ContextUsage {
    const layerBreakdown: Record<ContextLayer, number> = {
      system: 0,
      session: 0,
      working: 0,
      instant: 0,
    }

    // 计算各层 token
    for (const layer of layers) {
      layerBreakdown[layer.layer] += layer.tokens
    }

    const totalTokens = Object.values(layerBreakdown).reduce((a, b) => a + b, 0)
    const usagePercent = (totalTokens / maxTokens) * 100
    const warningLevel = this.getWarningLevel(usagePercent, thresholds)

    return {
      totalTokens,
      maxTokens,
      usagePercent,
      layerBreakdown,
      warningLevel,
      calculatedAt: new Date(),
    }
  }

  /**
   * 计算单层内容
   * @param layer 层级
   * @param content 内容
   * @returns 层内容对象
   */
  createLayerContent(
    layer: ContextLayer,
    content: string,
    options: {
      compressible?: boolean
      priority?: number
    } = {}
  ): LayerContent {
    const tokens = this.countTokens(content)
    return {
      layer,
      content,
      tokens,
      compressible: options.compressible ?? (layer !== 'system'),
      priority: options.priority ?? this.getDefaultPriority(layer),
      updatedAt: new Date(),
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 估算文本的 token 数
   */
  private estimateTokens(text: string): number {
    let tokens = 0

    // 统计中文字符
    const chineseMatches = text.match(CHINESE_REGEX) || []
    const chineseCount = chineseMatches.length
    tokens += chineseCount / TOKEN_ESTIMATION_CONFIG.chineseCharsPerToken

    // 统计日韩字符
    const japaneseMatches = text.match(JAPANESE_REGEX) || []
    const koreanMatches = text.match(KOREAN_REGEX) || []
    const cjkCount = japaneseMatches.length + koreanMatches.length
    tokens += cjkCount / TOKEN_ESTIMATION_CONFIG.cjkCharsPerToken

    // 移除已统计的字符，计算剩余英文
    let remainingText = text
      .replace(CHINESE_REGEX, '')
      .replace(JAPANESE_REGEX, '')
      .replace(KOREAN_REGEX, '')

    // 统计英文单词
    const englishWords = remainingText.match(ENGLISH_WORD_REGEX) || []
    for (const word of englishWords) {
      // 短词通常是 1 token，长词按字符数估算
      if (word.length <= 4) {
        tokens += 1
      } else {
        tokens += word.length / TOKEN_ESTIMATION_CONFIG.englishCharsPerToken
      }
    }
    remainingText = remainingText.replace(ENGLISH_WORD_REGEX, '')

    // 统计数字
    const numbers = remainingText.match(NUMBER_REGEX) || []
    for (const num of numbers) {
      // 每 3-4 位数字约 1 token
      tokens += Math.ceil(num.length / 3)
    }
    remainingText = remainingText.replace(NUMBER_REGEX, '')

    // 统计换行符
    const newlines = (text.match(/\n/g) || []).length
    tokens += newlines * TOKEN_ESTIMATION_CONFIG.specialCharTokens.newline

    // 统计 tab
    const tabs = (text.match(/\t/g) || []).length
    tokens += tabs * TOKEN_ESTIMATION_CONFIG.specialCharTokens.tab

    // 剩余特殊字符按保守估算
    const remainingSpecial = remainingText.replace(/\s/g, '').length
    tokens += remainingSpecial / 2 // 特殊字符平均 2 个一个 token

    // 应用安全系数
    return Math.ceil(tokens * TOKEN_ESTIMATION_CONFIG.safetyFactor)
  }

  /**
   * 获取 JSON 对象的嵌套深度
   */
  private getJsonDepth(obj: unknown, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth
    }

    let maxDepth = currentDepth
    const values = Array.isArray(obj) ? obj : Object.values(obj)

    for (const value of values) {
      const depth = this.getJsonDepth(value, currentDepth + 1)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    }

    return maxDepth
  }

  /**
   * 根据使用率获取预警级别
   */
  private getWarningLevel(
    usagePercent: number,
    thresholds: ContextThresholds
  ): ContextWarningLevel {
    if (usagePercent >= thresholds.critical) return 'critical'
    if (usagePercent >= thresholds.urgent) return 'high'
    if (usagePercent >= thresholds.warning) return 'warning'
    return 'normal'
  }

  /**
   * 获取层级默认优先级
   */
  private getDefaultPriority(layer: ContextLayer): number {
    const priorities: Record<ContextLayer, number> = {
      system: 100,   // 最高优先级，永不压缩
      session: 80,   // 高优先级
      working: 50,   // 中优先级
      instant: 20,   // 低优先级，优先压缩
    }
    return priorities[layer]
  }
}

// ============================================
// 单例导出
// ============================================

/** 全局 Token 计数器实例 */
export const tokenCounter = new TokenCounter()

// ============================================
// 工具函数
// ============================================

/**
 * 快速计算文本 token 数
 * @param text 文本
 * @returns token 数量
 */
export function countTokens(text: string): number {
  return tokenCounter.countTokens(text)
}

/**
 * 快速计算对象 token 数
 * @param obj 对象
 * @returns token 数量
 */
export function countObjectTokens(obj: unknown): number {
  return tokenCounter.countObjectTokens(obj)
}

/**
 * 估算是否会超出限制
 * @param currentTokens 当前 token 数
 * @param additionalText 要添加的文本
 * @param maxTokens 最大限制
 * @returns 是否会超出
 */
export function wouldExceedLimit(
  currentTokens: number,
  additionalText: string,
  maxTokens: number = CLAUDE_CONTEXT_LIMITS.safeLimit
): boolean {
  const additional = tokenCounter.countTokens(additionalText)
  return currentTokens + additional > maxTokens
}

/**
 * 获取剩余可用 token 数
 * @param currentTokens 当前使用量
 * @param maxTokens 最大限制
 * @returns 剩余可用量
 */
export function getRemainingTokens(
  currentTokens: number,
  maxTokens: number = CLAUDE_CONTEXT_LIMITS.safeLimit
): number {
  return Math.max(0, maxTokens - currentTokens)
}
