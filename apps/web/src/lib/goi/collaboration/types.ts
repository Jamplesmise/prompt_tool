/**
 * 人工操作感知系统类型定义
 *
 * 用于追踪用户在接管期间的手动操作，支持：
 * - 操作追踪：记录用户的点击、输入、选择等操作
 * - 资源识别：识别操作涉及的资源类型和 ID
 * - 状态同步：检测页面状态变化
 * - 偏离检测：检测用户操作是否偏离计划
 */

import type { ResourceType } from '@platform/shared'

// ============================================
// 可追踪的操作类型
// ============================================

/**
 * 可追踪的操作类型
 */
export type TrackableAction =
  | 'navigate'   // 页面导航
  | 'click'      // 点击元素
  | 'input'      // 输入内容
  | 'select'     // 选择选项
  | 'submit'     // 提交表单
  | 'toggle'     // 切换开关
  | 'upload'     // 上传文件
  | 'delete'     // 删除操作
  | 'drag'       // 拖拽操作

// ============================================
// 追踪的操作
// ============================================

/**
 * 操作目标
 */
export type ActionTarget = {
  /** 元素选择器 */
  element: string
  /** 资源类型 */
  resourceType?: ResourceType
  /** 资源 ID */
  resourceId?: string
  /** 人类可读标签 */
  label?: string
}

/**
 * 操作数据
 */
export type ActionData = {
  /** 当前值 */
  value?: unknown
  /** 之前的值 */
  previousValue?: unknown
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 操作上下文
 */
export type ActionContext = {
  /** 当前 URL */
  url: string
  /** 页面标题 */
  pageTitle?: string
  /** 会话 ID */
  sessionId: string
}

/**
 * 追踪的操作
 */
export type TrackedAction = {
  /** 操作 ID */
  id: string
  /** 操作类型 */
  type: TrackableAction
  /** 时间戳 */
  timestamp: Date
  /** 操作目标 */
  target: ActionTarget
  /** 操作数据 */
  data?: ActionData
  /** 操作上下文 */
  context: ActionContext
}

// ============================================
// 资源检测
// ============================================

/**
 * 检测到的资源
 */
export type DetectedResource = {
  /** 资源类型 */
  type: ResourceType
  /** 资源 ID */
  id: string
  /** 资源名称 */
  name?: string
  /** 匹配置信度 (0-1) */
  confidence: number
}

// ============================================
// 状态同步
// ============================================

/**
 * 状态差异类型
 */
export type StateDiffType = 'add' | 'remove' | 'change'

/**
 * 状态差异
 */
export type StateDiff = {
  /** 变化路径 */
  path: string[]
  /** 差异类型 */
  type: StateDiffType
  /** 旧值 */
  oldValue?: unknown
  /** 新值 */
  newValue?: unknown
}

/**
 * 状态快照
 */
export type StateSnapshot = {
  /** 当前 URL */
  url: string
  /** 表单状态 */
  forms: Record<string, Record<string, unknown>>
  /** 选中项 */
  selectedItems: Array<{
    type?: ResourceType
    id?: string
  }>
  /** 输入值 */
  inputs: Record<string, unknown>
  /** 快照时间 */
  capturedAt: Date
}

// ============================================
// 计划协调
// ============================================

/**
 * 步骤完成者
 */
export type StepCompletedBy = 'user' | 'ai'

/**
 * 协调后的步骤（扩展 PlanStep）
 */
export type ReconciledStep = {
  /** 步骤 ID */
  id: string
  /** 步骤描述 */
  description: string
  /** 操作类型 */
  action: string
  /** 操作参数 */
  params?: Record<string, unknown>
  /** 步骤状态 */
  status: 'pending' | 'completed' | 'failed' | 'skipped'
  /** 完成者 */
  completedBy?: StepCompletedBy
  /** 完成时间 */
  completedAt?: Date
  /** 匹配的用户操作 */
  matchedAction?: TrackedAction
  /** 是否必需 */
  required?: boolean
}

/**
 * 协调后的计划
 */
export type ReconciledPlan = {
  /** 计划 ID */
  id: string
  /** 目标描述 */
  goal: string
  /** 步骤列表 */
  steps: ReconciledStep[]
  /** 用户完成的步骤数 */
  userCompletedCount: number
  /** AI 完成的步骤数 */
  aiCompletedCount: number
  /** 待执行的步骤数 */
  pendingCount: number
  /** 总进度百分比 */
  progressPercent: number
}

/**
 * 续跑建议
 */
export type ContinuationSuggestion = {
  /** 是否可以继续 */
  canContinue: boolean
  /** 下一个待执行步骤 */
  nextStep?: ReconciledStep
  /** 建议消息 */
  message: string
  /** 用户完成的步骤 */
  userCompletedSteps: ReconciledStep[]
}

// ============================================
// 偏离检测
// ============================================

/**
 * 偏离程度
 */
export type DeviationType = 'none' | 'minor' | 'major' | 'incompatible'

/**
 * 偏离问题严重程度
 */
export type DeviationSeverity = 'info' | 'warning' | 'error'

/**
 * 偏离问题
 */
export type DeviationIssue = {
  /** 严重程度 */
  severity: DeviationSeverity
  /** 问题描述 */
  message: string
  /** 相关步骤 */
  step?: ReconciledStep
  /** 相关操作 */
  action?: TrackedAction
}

/**
 * 偏离检测结果
 */
export type Deviation = {
  /** 偏离类型 */
  type: DeviationType
  /** 是否阻止继续 */
  isBlocking: boolean
  /** 偏离问题列表 */
  issues: DeviationIssue[]
  /** 建议 */
  suggestions: string[]
}

// ============================================
// 交还对话框
// ============================================

/**
 * 交还对话框数据
 */
export type HandbackDialogData = {
  /** 协调后的计划 */
  plan: ReconciledPlan
  /** 用户操作列表 */
  userActions: TrackedAction[]
  /** 偏离检测结果 */
  deviation: Deviation
}

// ============================================
// 操作追踪器事件
// ============================================

/**
 * 操作追踪器事件类型
 */
export type ActionTrackerEvent = 'action' | 'start' | 'stop'

/**
 * 操作追踪器事件回调
 */
export type ActionTrackerCallback = (action: TrackedAction) => void
