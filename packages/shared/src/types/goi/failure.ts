/**
 * GOI 失败处理类型定义
 *
 * 任何失败都应该可恢复：
 * - 失败分类：临时性/数据性/逻辑性/权限性/系统性
 * - 自动重试：临时性失败最多重试3次
 * - 状态回滚：恢复到安全状态
 * - 用户选择：重试/修改/跳过/重规划/放弃/接管
 */

import type { ResourceType } from './events'

// ============================================
// 失败分类
// ============================================

/**
 * 失败类型
 *
 * - temporary: 临时性失败（网络超时、服务暂时不可用）- 自动重试
 * - data: 数据性失败（资源不存在、数据校验不通过）- 回滚并报告
 * - logic: 逻辑性失败（操作前置条件不满足）- 尝试重规划
 * - permission: 权限性失败（无权限执行某操作）- 回滚并报告
 * - system: 系统性失败（服务崩溃、数据库异常）- 回滚并告警
 */
export type FailureType =
  | 'temporary'
  | 'data'
  | 'logic'
  | 'permission'
  | 'system'

/**
 * 失败严重程度
 */
export type FailureSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 失败状态
 */
export type FailureStatus =
  | 'detected'     // 已检测到
  | 'classifying'  // 分类中
  | 'rolling_back' // 回滚中
  | 'rolled_back'  // 已回滚
  | 'waiting_user' // 等待用户决策
  | 'retrying'     // 重试中
  | 'resolved'     // 已解决
  | 'abandoned'    // 已放弃

// ============================================
// 失败信息
// ============================================

/**
 * 失败详情
 */
export type FailureInfo = {
  /** 失败 ID */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 失败类型 */
  type: FailureType
  /** 严重程度 */
  severity: FailureSeverity
  /** 错误代码 */
  code: string
  /** 错误消息 */
  message: string
  /** 关联的 TODO 项 ID */
  todoItemId: string
  /** TODO 项标题 */
  todoItemTitle: string
  /** 失败的操作 */
  operation: FailedOperation
  /** 原始错误 */
  originalError: {
    name: string
    message: string
    stack?: string
  }
  /** 失败时间 */
  timestamp: Date
  /** 是否可重试 */
  retryable: boolean
  /** 已重试次数 */
  retryCount: number
  /** 最大重试次数 */
  maxRetries: number
  /** 上下文信息 */
  context?: Record<string, unknown>
  /** 当前状态 */
  status: FailureStatus
}

/**
 * 失败的操作信息
 */
export type FailedOperation = {
  /** 操作类型 */
  type: string
  /** 操作名称 */
  name: string
  /** 操作参数 */
  params?: Record<string, unknown>
  /** 目标资源 */
  targetResource?: {
    type: ResourceType
    id?: string
    name?: string
  }
  /** 操作开始时间 */
  startedAt: Date
  /** 失败时间 */
  failedAt: Date
}

// ============================================
// 失败报告
// ============================================

/**
 * 失败报告（用户可读）
 */
export type FailureReport = {
  /** 报告 ID */
  id: string
  /** 失败 ID */
  failureId: string
  /** 失败位置 */
  location: FailureLocation
  /** 失败原因 */
  reason: FailureReason
  /** 回滚信息 */
  rollback: RollbackInfo
  /** 建议的恢复选项 */
  suggestions: RecoveryOption[]
  /** 生成时间 */
  generatedAt: Date
}

/**
 * 失败位置
 */
export type FailureLocation = {
  /** TODO 项名称 */
  todoItem: string
  /** 所属阶段 */
  phase: string
  /** 进度描述 */
  progress: string  // 例如: "第3项，共12项"
  /** 当前页面 */
  page?: string
}

/**
 * 失败原因
 */
export type FailureReason = {
  /** 摘要 */
  summary: string
  /** 可能的原因列表 */
  possibleCauses: string[]
  /** 技术详情（可选显示） */
  technicalDetails?: string
}

/**
 * 回滚信息
 */
export type RollbackInfo = {
  /** 是否已执行回滚 */
  executed: boolean
  /** 回滚的操作列表 */
  actions: string[]
  /** 恢复到的状态描述 */
  restoredTo: string
  /** 目标快照 ID */
  snapshotId?: string
}

// ============================================
// 恢复选项
// ============================================

/**
 * 恢复操作类型
 */
export type RecoveryAction =
  | 'retry'      // 重新尝试
  | 'modify'     // 修改参数后重试
  | 'skip'       // 跳过此步骤
  | 'replan'     // 重新规划
  | 'abort'      // 放弃任务
  | 'takeover'   // 用户接管

/**
 * 恢复选项
 */
export type RecoveryOption = {
  /** 选项 ID */
  id: string
  /** 选项标签 */
  label: string
  /** 选项描述 */
  description: string
  /** 恢复动作 */
  action: RecoveryAction
  /** 是否推荐 */
  recommended?: boolean
  /** 是否需要额外输入 */
  requiresInput?: boolean
  /** 输入提示 */
  inputPrompt?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 禁用原因 */
  disabledReason?: string
}

/**
 * 用户选择的恢复操作
 */
export type RecoverySelection = {
  /** 选择的选项 ID */
  optionId: string
  /** 恢复动作 */
  action: RecoveryAction
  /** 用户输入（如果需要） */
  userInput?: string
  /** 选择时间 */
  selectedAt: Date
}

// ============================================
// 重试策略
// ============================================

/**
 * 重试策略类型
 */
export type RetryStrategyType =
  | 'immediate'    // 立即重试
  | 'linear'       // 线性退避
  | 'exponential'  // 指数退避

/**
 * 重试策略配置
 */
export type RetryStrategy = {
  /** 策略类型 */
  type: RetryStrategyType
  /** 最大重试次数 */
  maxRetries: number
  /** 初始延迟（毫秒） */
  initialDelay: number
  /** 最大延迟（毫秒） */
  maxDelay: number
  /** 延迟倍数（指数退避时使用） */
  multiplier?: number
  /** 是否添加随机抖动 */
  jitter?: boolean
}

/**
 * 默认重试策略
 */
export const DEFAULT_RETRY_STRATEGIES: Record<FailureType, RetryStrategy> = {
  temporary: {
    type: 'exponential',
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    multiplier: 2,
    jitter: true,
  },
  data: {
    type: 'immediate',
    maxRetries: 0,  // 数据错误不重试
    initialDelay: 0,
    maxDelay: 0,
  },
  logic: {
    type: 'immediate',
    maxRetries: 1,  // 逻辑错误最多重试1次（可能是时序问题）
    initialDelay: 500,
    maxDelay: 500,
  },
  permission: {
    type: 'immediate',
    maxRetries: 0,  // 权限错误不重试
    initialDelay: 0,
    maxDelay: 0,
  },
  system: {
    type: 'exponential',
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 30000,
    multiplier: 3,
    jitter: true,
  },
}

// ============================================
// 回滚相关
// ============================================

/**
 * 回滚目标
 */
export type RollbackTarget = {
  /** 目标快照 ID */
  snapshotId: string
  /** 快照创建时间 */
  snapshotCreatedAt: Date
  /** 快照触发原因 */
  snapshotTrigger: string
  /** 关联的 TODO 项 */
  todoItemId?: string
  /** 描述 */
  description: string
}

/**
 * 回滚执行结果
 */
export type RollbackResult = {
  /** 是否成功 */
  success: boolean
  /** 目标快照 ID */
  snapshotId: string
  /** 回滚的操作列表 */
  rollbackActions: RollbackAction[]
  /** 恢复到的时间点 */
  restoredTo: Date
  /** 执行耗时（毫秒） */
  duration: number
  /** 错误信息（如果失败） */
  errors?: RollbackError[]
}

/**
 * 单个回滚操作
 */
export type RollbackAction = {
  /** 操作类型 */
  type: 'undo_create' | 'restore_modify' | 'restore_delete' | 'restore_ui'
  /** 资源类型 */
  resourceType?: ResourceType
  /** 资源 ID */
  resourceId?: string
  /** 描述 */
  description: string
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

/**
 * 回滚错误
 */
export type RollbackError = {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源 ID */
  resourceId: string
  /** 错误类型 */
  errorType: 'not_found' | 'permission_denied' | 'conflict' | 'unknown'
  /** 错误消息 */
  message: string
}

// ============================================
// 错误代码
// ============================================

/**
 * GOI 错误代码前缀
 */
export const GOI_ERROR_PREFIX = 'GOI'

/**
 * 预定义的错误代码
 */
export const GOI_ERROR_CODES = {
  // 临时性错误 (1xxx)
  NETWORK_TIMEOUT: 'GOI1001',
  SERVICE_UNAVAILABLE: 'GOI1002',
  RATE_LIMITED: 'GOI1003',
  CONNECTION_FAILED: 'GOI1004',

  // 数据性错误 (2xxx)
  RESOURCE_NOT_FOUND: 'GOI2001',
  VALIDATION_FAILED: 'GOI2002',
  DATA_CONFLICT: 'GOI2003',
  INVALID_STATE: 'GOI2004',
  REFERENCE_NOT_FOUND: 'GOI2005',

  // 逻辑性错误 (3xxx)
  PRECONDITION_FAILED: 'GOI3001',
  DEPENDENCY_NOT_MET: 'GOI3002',
  INVALID_OPERATION: 'GOI3003',
  SEQUENCE_ERROR: 'GOI3004',

  // 权限性错误 (4xxx)
  PERMISSION_DENIED: 'GOI4001',
  AUTH_REQUIRED: 'GOI4002',
  QUOTA_EXCEEDED: 'GOI4003',
  SCOPE_LIMITED: 'GOI4004',

  // 系统性错误 (5xxx)
  INTERNAL_ERROR: 'GOI5001',
  DATABASE_ERROR: 'GOI5002',
  SERVICE_CRASH: 'GOI5003',
  CONFIGURATION_ERROR: 'GOI5004',
} as const

export type GoiErrorCode = (typeof GOI_ERROR_CODES)[keyof typeof GOI_ERROR_CODES]

// ============================================
// 事件载荷
// ============================================

/**
 * 失败检测事件载荷
 */
export type FailureDetectedPayload = {
  failureId: string
  sessionId: string
  type: FailureType
  severity: FailureSeverity
  code: string
  message: string
  todoItemId: string
  retryable: boolean
}

/**
 * 回滚开始事件载荷
 */
export type RollbackStartedPayload = {
  failureId: string
  sessionId: string
  targetSnapshotId: string
}

/**
 * 回滚完成事件载荷
 */
export type RollbackCompletedPayload = {
  failureId: string
  sessionId: string
  snapshotId: string
  success: boolean
  actionsCount: number
  errorsCount: number
}

/**
 * 恢复选择事件载荷
 */
export type RecoverySelectedPayload = {
  failureId: string
  sessionId: string
  optionId: string
  action: RecoveryAction
  userInput?: string
}
