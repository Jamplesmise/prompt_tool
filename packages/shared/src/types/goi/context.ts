/**
 * GOI 上下文管理类型定义
 *
 * 上下文是稀缺资源，需要精心管理：
 * - 分层管理：系统/会话/工作/即时四层
 * - 阈值监控：70%预警/85%自动压缩/90%紧急压缩
 * - 智能压缩：保留关键信息，丢弃冗余内容
 */

// ============================================
// 上下文分层
// ============================================

/**
 * 上下文层级
 *
 * - system: 系统常量层（~2K tokens）- 平台能力、GOI接口、行为准则
 * - session: 会话上下文层（5-20K tokens）- 目标、TODO状态、操作摘要、决策
 * - working: 工作上下文层（3-10K tokens）- 当前TODO详情、最近操作、页面状态
 * - instant: 即时上下文层（1-5K tokens）- 系统提醒、检查点、错误信息
 */
export type ContextLayer = 'system' | 'session' | 'working' | 'instant'

/**
 * 各层上下文内容
 */
export type LayerContent = {
  /** 层级标识 */
  layer: ContextLayer
  /** 内容文本 */
  content: string
  /** Token 数量 */
  tokens: number
  /** 是否可压缩 */
  compressible: boolean
  /** 优先级（数值越高越重要） */
  priority: number
  /** 最后更新时间 */
  updatedAt: Date
}

/**
 * 系统层内容结构
 */
export type SystemLayerContent = {
  /** 平台能力说明 */
  platformCapabilities: string
  /** GOI 接口定义 */
  goiInterface: string
  /** 行为准则 */
  behaviorRules: string
}

/**
 * 会话层内容结构
 */
export type SessionLayerContent = {
  /** 用户原始目标 */
  userGoal: string
  /** TODO List 当前状态 */
  todoListState: string
  /** 已完成操作的摘要 */
  completedOperationsSummary: string
  /** 关键决策记录 */
  keyDecisions: string[]
  /** 约束条件 */
  constraints: string[]
}

/**
 * 工作层内容结构
 */
export type WorkingLayerContent = {
  /** 当前 TODO 项详细信息 */
  currentTodoDetail: string
  /** 最近几次操作的结果 */
  recentOperations: {
    operation: string
    result: string
    timestamp: Date
  }[]
  /** 当前页面/弹窗状态 */
  uiState: string
  /** 临时查询结果 */
  queryResults: string[]
}

/**
 * 即时层内容结构
 */
export type InstantLayerContent = {
  /** 当前步骤的系统提醒 */
  systemReminders: string[]
  /** 检查点信息 */
  checkpointInfo?: string
  /** 错误信息 */
  errorInfo?: string
  /** 临时注入内容 */
  injectedContent?: string
}

// ============================================
// 上下文使用量
// ============================================

/**
 * 上下文使用量统计
 */
export type ContextUsage = {
  /** 已使用的 Token 总数 */
  totalTokens: number
  /** 最大 Token 限制 */
  maxTokens: number
  /** 使用百分比 */
  usagePercent: number
  /** 各层使用量明细 */
  layerBreakdown: Record<ContextLayer, number>
  /** 预警级别 */
  warningLevel: ContextWarningLevel
  /** 统计时间 */
  calculatedAt: Date
}

/**
 * 上下文预警级别
 */
export type ContextWarningLevel = 'normal' | 'warning' | 'high' | 'critical'

/**
 * 上下文阈值配置
 */
export type ContextThresholds = {
  /** 预警阈值（显示预警） */
  warning: number
  /** 自动压缩阈值 */
  autoCompress: number
  /** 紧急压缩阈值 */
  urgent: number
  /** 临界阈值（必须压缩） */
  critical: number
}

/**
 * 默认阈值配置
 */
export const DEFAULT_CONTEXT_THRESHOLDS: ContextThresholds = {
  warning: 70,
  autoCompress: 85,
  urgent: 90,
  critical: 95,
}

/**
 * Claude 模型的上下文限制
 */
export const CLAUDE_CONTEXT_LIMITS = {
  /** Claude 3.5 Sonnet / Opus 上下文窗口 */
  default: 200000,
  /** 安全边界（预留响应空间） */
  safeLimit: 180000,
  /** 推荐最大使用量 */
  recommended: 150000,
} as const

// ============================================
// 压缩相关
// ============================================

/**
 * 压缩级别
 *
 * - standard: 标准压缩（保留率约60%）
 * - deep: 深度压缩（保留率约30%）
 * - phase: 阶段压缩（完成一个阶段后）
 * - checkpoint: 检查点压缩（检查点通过后）
 */
export type CompressionLevel = 'standard' | 'deep' | 'phase' | 'checkpoint'

/**
 * 压缩配置
 */
export type CompressionConfig = {
  /** 压缩级别 */
  level: CompressionLevel
  /** 保留最近N个操作的详情 */
  keepRecentOperations: number
  /** 是否保留所有决策点 */
  preserveDecisions: boolean
  /** 是否保留资源ID */
  preserveResourceIds: boolean
  /** 自定义保留的关键词 */
  preserveKeywords?: string[]
}

/**
 * 各级别的默认压缩配置
 */
export const COMPRESSION_CONFIGS: Record<CompressionLevel, CompressionConfig> = {
  standard: {
    level: 'standard',
    keepRecentOperations: 3,
    preserveDecisions: true,
    preserveResourceIds: true,
  },
  deep: {
    level: 'deep',
    keepRecentOperations: 1,
    preserveDecisions: true,
    preserveResourceIds: true,
  },
  phase: {
    level: 'phase',
    keepRecentOperations: 0,
    preserveDecisions: true,
    preserveResourceIds: true,
  },
  checkpoint: {
    level: 'checkpoint',
    keepRecentOperations: 2,
    preserveDecisions: true,
    preserveResourceIds: true,
  },
}

/**
 * 压缩结果
 */
export type CompressionResult = {
  /** 是否成功 */
  success: boolean
  /** 压缩前 Token 数 */
  beforeTokens: number
  /** 压缩后 Token 数 */
  afterTokens: number
  /** 压缩比例 */
  compressionRatio: number
  /** 压缩后的摘要 */
  summary: ContextSummary
  /** 被丢弃的信息描述 */
  droppedInfo?: string[]
  /** 压缩耗时（毫秒） */
  duration: number
  /** 压缩时间 */
  compressedAt: Date
}

// ============================================
// 上下文摘要
// ============================================

/**
 * 上下文摘要（压缩后的结构化信息）
 */
export type ContextSummary = {
  /** 用户目标 */
  goal: string
  /** 已完成的阶段 */
  completedPhases: CompletedPhase[]
  /** 当前状态 */
  currentState: CurrentState
  /** 关键决策 */
  keyDecisions: string[]
  /** 下一步操作 */
  nextStep: string
  /** 约束条件 */
  constraints: string[]
  /** 摘要版本 */
  version: number
  /** 生成时间 */
  generatedAt: Date
}

/**
 * 已完成的阶段摘要
 */
export type CompletedPhase = {
  /** 阶段名称 */
  name: string
  /** 阶段摘要 */
  summary: string
  /** 完成的 TODO 项数量 */
  itemCount: number
  /** 产出物 ID（如果有） */
  outputIds?: string[]
}

/**
 * 当前状态
 */
export type CurrentState = {
  /** 当前页面 */
  page: string
  /** 已选资源列表 */
  selectedResources: SelectedResource[]
  /** 待配置项 */
  pendingConfigurations?: string[]
  /** 进度百分比 */
  progressPercent?: number
}

/**
 * 已选资源
 */
export type SelectedResource = {
  /** 资源类型 */
  type: string
  /** 资源 ID */
  id: string
  /** 资源名称 */
  name: string
}

// ============================================
// 上下文管理器类型
// ============================================

/**
 * 上下文管理器状态
 */
export type ContextManagerState = {
  /** 会话 ID */
  sessionId: string
  /** 当前使用量 */
  usage: ContextUsage
  /** 各层内容 */
  layers: LayerContent[]
  /** 最近一次压缩结果 */
  lastCompression?: CompressionResult
  /** 是否启用自动压缩 */
  autoCompressEnabled: boolean
  /** 压缩历史 */
  compressionHistory: CompressionHistoryItem[]
}

/**
 * 压缩历史项
 */
export type CompressionHistoryItem = {
  /** 压缩时间 */
  timestamp: Date
  /** 压缩级别 */
  level: CompressionLevel
  /** 触发原因 */
  trigger: CompressionTrigger
  /** 压缩前 Token 数 */
  beforeTokens: number
  /** 压缩后 Token 数 */
  afterTokens: number
}

/**
 * 压缩触发原因
 */
export type CompressionTrigger =
  | 'threshold_auto'    // 达到阈值自动触发
  | 'threshold_urgent'  // 紧急阈值触发
  | 'phase_complete'    // 阶段完成触发
  | 'checkpoint_pass'   // 检查点通过触发
  | 'manual'            // 手动触发

// ============================================
// 不可压缩标记
// ============================================

/**
 * 不可压缩项标记
 */
export type UncompressibleMarker = {
  /** 项目 ID */
  id: string
  /** 项目类型 */
  type: 'todo_item' | 'decision' | 'resource' | 'constraint'
  /** 原因 */
  reason: string
  /** 标记时间 */
  markedAt: Date
}

// ============================================
// 事件类型扩展
// ============================================

/**
 * 上下文压缩事件载荷（扩展现有的 ContextCompactedPayload）
 */
export type ContextCompressionEventPayload = {
  sessionId: string
  level: CompressionLevel
  trigger: CompressionTrigger
  beforeTokens: number
  afterTokens: number
  compressionRatio: number
  preservedItems: string[]
  droppedItems?: string[]
}

/**
 * 上下文预警事件载荷
 */
export type ContextWarningEventPayload = {
  sessionId: string
  usagePercent: number
  warningLevel: ContextWarningLevel
  suggestedAction: 'none' | 'manual_compress' | 'auto_compress' | 'urgent_compress'
}
