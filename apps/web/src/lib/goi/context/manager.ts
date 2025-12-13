/**
 * 上下文管理器
 *
 * 负责监控和管理上下文使用量：
 * - 实时监控各层 token 使用
 * - 阈值检查和预警
 * - 触发自动压缩
 * - 发布上下文相关事件
 */

import type {
  ContextUsage,
  ContextLayer,
  ContextWarningLevel,
  ContextThresholds,
  ContextManagerState,
  CompressionLevel,
  CompressionTrigger,
  LayerContent,
  SystemLayerContent,
  SessionLayerContent,
  WorkingLayerContent,
  InstantLayerContent,
} from '@platform/shared'
import {
  DEFAULT_CONTEXT_THRESHOLDS,
  CLAUDE_CONTEXT_LIMITS,
} from '@platform/shared'
import { TokenCounter, tokenCounter } from './tokenCounter'

// ============================================
// 类型定义
// ============================================

/**
 * 上下文更新选项
 */
export type UpdateContextOptions = {
  /** 是否立即检查阈值 */
  checkThreshold?: boolean
  /** 是否触发事件 */
  emitEvent?: boolean
}

/**
 * 压缩建议
 */
export type CompressionSuggestion = {
  /** 是否需要压缩 */
  shouldCompress: boolean
  /** 建议的压缩级别 */
  level?: CompressionLevel
  /** 触发原因 */
  trigger?: CompressionTrigger
  /** 紧急程度 */
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical'
  /** 建议消息 */
  message?: string
}

/**
 * 上下文事件监听器
 */
export type ContextEventListener = (event: ContextEvent) => void | Promise<void>

/**
 * 上下文事件
 */
export type ContextEvent = {
  type: 'warning' | 'compress_needed' | 'compressed' | 'updated'
  sessionId: string
  usage: ContextUsage
  suggestion?: CompressionSuggestion
  timestamp: Date
}

// ============================================
// 上下文管理器类
// ============================================

/**
 * 上下文管理器
 */
export class ContextManager {
  /** 会话 ID */
  private sessionId: string
  /** Token 计数器 */
  private counter: TokenCounter
  /** 阈值配置 */
  private thresholds: ContextThresholds
  /** 最大 token 限制 */
  private maxTokens: number
  /** 各层内容 */
  private layers: Map<ContextLayer, LayerContent>
  /** 是否启用自动压缩 */
  private autoCompressEnabled: boolean
  /** 事件监听器 */
  private listeners: Set<ContextEventListener>
  /** 上次检查时间 */
  private lastCheckTime: Date
  /** 上次预警级别 */
  private lastWarningLevel: ContextWarningLevel

  constructor(
    sessionId: string,
    options: {
      thresholds?: ContextThresholds
      maxTokens?: number
      autoCompress?: boolean
      counter?: TokenCounter
    } = {}
  ) {
    this.sessionId = sessionId
    this.counter = options.counter ?? tokenCounter
    this.thresholds = options.thresholds ?? DEFAULT_CONTEXT_THRESHOLDS
    this.maxTokens = options.maxTokens ?? CLAUDE_CONTEXT_LIMITS.safeLimit
    this.autoCompressEnabled = options.autoCompress ?? true
    this.layers = new Map()
    this.listeners = new Set()
    this.lastCheckTime = new Date()
    this.lastWarningLevel = 'normal'

    // 初始化各层
    this.initializeLayers()
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 获取当前使用量
   */
  getUsage(): ContextUsage {
    const layerContents = Array.from(this.layers.values())
    return this.counter.countContextUsage(layerContents, this.maxTokens, this.thresholds)
  }

  /**
   * 检查是否达到阈值
   */
  checkThreshold(): CompressionSuggestion {
    const usage = this.getUsage()
    return this.getSuggestion(usage)
  }

  /**
   * 判断是否需要压缩
   */
  shouldTriggerCompression(): boolean {
    const suggestion = this.checkThreshold()
    return suggestion.shouldCompress
  }

  /**
   * 更新系统层内容
   */
  updateSystemLayer(content: SystemLayerContent): void {
    const text = this.serializeSystemLayer(content)
    this.updateLayer('system', text, { compressible: false, priority: 100 })
  }

  /**
   * 更新会话层内容
   */
  updateSessionLayer(content: SessionLayerContent): void {
    const text = this.serializeSessionLayer(content)
    this.updateLayer('session', text, { compressible: true, priority: 80 })
  }

  /**
   * 更新工作层内容
   */
  updateWorkingLayer(content: WorkingLayerContent): void {
    const text = this.serializeWorkingLayer(content)
    this.updateLayer('working', text, { compressible: true, priority: 50 })
  }

  /**
   * 更新即时层内容
   */
  updateInstantLayer(content: InstantLayerContent): void {
    const text = this.serializeInstantLayer(content)
    this.updateLayer('instant', text, { compressible: true, priority: 20 })
  }

  /**
   * 清空即时层（通常在每次请求后）
   */
  clearInstantLayer(): void {
    this.updateLayer('instant', '', { compressible: true, priority: 20 })
  }

  /**
   * 获取层内容
   */
  getLayer(layer: ContextLayer): LayerContent | undefined {
    return this.layers.get(layer)
  }

  /**
   * 获取所有层内容
   */
  getAllLayers(): LayerContent[] {
    return Array.from(this.layers.values())
  }

  /**
   * 获取管理器状态
   */
  getState(): ContextManagerState {
    return {
      sessionId: this.sessionId,
      usage: this.getUsage(),
      layers: this.getAllLayers(),
      autoCompressEnabled: this.autoCompressEnabled,
      compressionHistory: [], // TODO: 实现压缩历史记录
    }
  }

  /**
   * 执行定期检查（每次 Agent Loop 前调用）
   */
  async performCheck(): Promise<CompressionSuggestion> {
    const usage = this.getUsage()
    const suggestion = this.getSuggestion(usage)

    // 检查预警级别变化
    if (usage.warningLevel !== this.lastWarningLevel) {
      await this.emitEvent({
        type: 'warning',
        sessionId: this.sessionId,
        usage,
        suggestion,
        timestamp: new Date(),
      })
      this.lastWarningLevel = usage.warningLevel
    }

    // 如果需要压缩，发布事件
    if (suggestion.shouldCompress) {
      await this.emitEvent({
        type: 'compress_needed',
        sessionId: this.sessionId,
        usage,
        suggestion,
        timestamp: new Date(),
      })
    }

    this.lastCheckTime = new Date()
    return suggestion
  }

  /**
   * 启用/禁用自动压缩
   */
  setAutoCompress(enabled: boolean): void {
    this.autoCompressEnabled = enabled
  }

  /**
   * 添加事件监听器
   */
  addListener(listener: ContextEventListener): void {
    this.listeners.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeListener(listener: ContextEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * 获取剩余可用 token
   */
  getRemainingTokens(): number {
    const usage = this.getUsage()
    return Math.max(0, this.maxTokens - usage.totalTokens)
  }

  /**
   * 检查是否可以添加内容
   */
  canAddContent(text: string): boolean {
    const additionalTokens = this.counter.countTokens(text)
    const usage = this.getUsage()
    return usage.totalTokens + additionalTokens <= this.maxTokens
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 初始化各层
   */
  private initializeLayers(): void {
    const defaultLayers: Array<{
      layer: ContextLayer
      compressible: boolean
      priority: number
    }> = [
      { layer: 'system', compressible: false, priority: 100 },
      { layer: 'session', compressible: true, priority: 80 },
      { layer: 'working', compressible: true, priority: 50 },
      { layer: 'instant', compressible: true, priority: 20 },
    ]

    for (const { layer, compressible, priority } of defaultLayers) {
      this.layers.set(layer, {
        layer,
        content: '',
        tokens: 0,
        compressible,
        priority,
        updatedAt: new Date(),
      })
    }
  }

  /**
   * 更新指定层
   */
  private updateLayer(
    layer: ContextLayer,
    content: string,
    options: { compressible: boolean; priority: number }
  ): void {
    const tokens = this.counter.countTokens(content)
    this.layers.set(layer, {
      layer,
      content,
      tokens,
      compressible: options.compressible,
      priority: options.priority,
      updatedAt: new Date(),
    })
  }

  /**
   * 获取压缩建议
   */
  private getSuggestion(usage: ContextUsage): CompressionSuggestion {
    const { usagePercent, warningLevel } = usage

    if (usagePercent >= this.thresholds.critical) {
      return {
        shouldCompress: true,
        level: 'deep',
        trigger: 'threshold_urgent',
        urgency: 'critical',
        message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，必须立即压缩`,
      }
    }

    if (usagePercent >= this.thresholds.urgent) {
      return {
        shouldCompress: true,
        level: 'deep',
        trigger: 'threshold_urgent',
        urgency: 'high',
        message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，建议立即压缩`,
      }
    }

    if (usagePercent >= this.thresholds.autoCompress && this.autoCompressEnabled) {
      return {
        shouldCompress: true,
        level: 'standard',
        trigger: 'threshold_auto',
        urgency: 'medium',
        message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，自动触发压缩`,
      }
    }

    if (usagePercent >= this.thresholds.warning) {
      return {
        shouldCompress: false,
        urgency: 'low',
        message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，建议手动压缩`,
      }
    }

    return {
      shouldCompress: false,
      urgency: 'none',
    }
  }

  /**
   * 发布事件
   */
  private async emitEvent(event: ContextEvent): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(event)
      } catch (error) {
        console.error('Context event listener error:', error)
      }
    }
  }

  /**
   * 序列化系统层内容
   */
  private serializeSystemLayer(content: SystemLayerContent): string {
    return [
      '## 平台能力',
      content.platformCapabilities,
      '',
      '## GOI 接口',
      content.goiInterface,
      '',
      '## 行为准则',
      content.behaviorRules,
    ].join('\n')
  }

  /**
   * 序列化会话层内容
   */
  private serializeSessionLayer(content: SessionLayerContent): string {
    const parts = [
      '## 用户目标',
      content.userGoal,
      '',
      '## TODO 状态',
      content.todoListState,
      '',
      '## 已完成操作摘要',
      content.completedOperationsSummary,
    ]

    if (content.keyDecisions.length > 0) {
      parts.push('', '## 关键决策')
      content.keyDecisions.forEach((d, i) => parts.push(`${i + 1}. ${d}`))
    }

    if (content.constraints.length > 0) {
      parts.push('', '## 约束条件')
      content.constraints.forEach((c, i) => parts.push(`${i + 1}. ${c}`))
    }

    return parts.join('\n')
  }

  /**
   * 序列化工作层内容
   */
  private serializeWorkingLayer(content: WorkingLayerContent): string {
    const parts = [
      '## 当前 TODO',
      content.currentTodoDetail,
      '',
      '## UI 状态',
      content.uiState,
    ]

    if (content.recentOperations.length > 0) {
      parts.push('', '## 最近操作')
      content.recentOperations.forEach((op) => {
        parts.push(`- ${op.operation}: ${op.result}`)
      })
    }

    if (content.queryResults.length > 0) {
      parts.push('', '## 查询结果')
      content.queryResults.forEach((r) => parts.push(r))
    }

    return parts.join('\n')
  }

  /**
   * 序列化即时层内容
   */
  private serializeInstantLayer(content: InstantLayerContent): string {
    const parts: string[] = []

    if (content.systemReminders.length > 0) {
      parts.push('## 系统提醒')
      content.systemReminders.forEach((r) => parts.push(`- ${r}`))
    }

    if (content.checkpointInfo) {
      parts.push('', '## 检查点', content.checkpointInfo)
    }

    if (content.errorInfo) {
      parts.push('', '## 错误信息', content.errorInfo)
    }

    if (content.injectedContent) {
      parts.push('', content.injectedContent)
    }

    return parts.join('\n')
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建上下文管理器
 */
export function createContextManager(
  sessionId: string,
  options?: {
    thresholds?: ContextThresholds
    maxTokens?: number
    autoCompress?: boolean
  }
): ContextManager {
  return new ContextManager(sessionId, options)
}
