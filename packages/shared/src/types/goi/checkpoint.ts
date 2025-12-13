/**
 * GOI 检查点系统类型定义
 *
 * 检查点用于实现人机协作中的确认机制：
 * - 规则驱动：根据操作类型、资源类型、风险等级自动判断
 * - 灵活配置：支持用户自定义规则覆盖
 * - 智能判断：支持基于上下文的智能决策
 */

import type { TodoItem, TodoItemCategory } from './todoItem'
import type { StateAction } from './operations'

// ============================================
// 检查点触发条件
// ============================================

/**
 * 检查点触发类型
 */
export type CheckpointTrigger =
  | 'operation_type'   // 基于操作类型（access/state/observation）
  | 'resource_type'    // 基于资源类型
  | 'risk_level'       // 基于风险等级
  | 'user_preference'  // 基于用户偏好
  | 'first_time'       // 首次执行某类操作

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ============================================
// 检查点规则
// ============================================

/**
 * 检查点规则动作
 */
export type CheckpointRuleAction =
  | 'require'   // 必须确认
  | 'skip'      // 跳过确认
  | 'smart'     // 智能判断

/**
 * 检查点规则条件
 */
export type CheckpointRuleCondition = {
  /** 操作类别 */
  operationType?: TodoItemCategory
  /** 状态变更动作 */
  stateAction?: StateAction
  /** 资源类型 */
  resourceType?: string
  /** 风险等级 */
  riskLevel?: RiskLevel
  /** 资源 ID 模式（正则） */
  resourceIdPattern?: string
  /** 自定义表达式 */
  expression?: string
}

/**
 * 检查点规则定义
 */
export type CheckpointRule = {
  /** 规则 ID */
  id: string
  /** 规则名称 */
  name: string
  /** 规则描述 */
  description?: string
  /** 触发类型 */
  trigger: CheckpointTrigger
  /** 匹配条件 */
  condition: CheckpointRuleCondition
  /** 规则动作 */
  action: CheckpointRuleAction
  /** 规则优先级（数字越大优先级越高） */
  priority: number
  /** 是否启用 */
  enabled: boolean
  /** 创建者 */
  createdBy?: string
  /** 创建时间 */
  createdAt?: Date
}

// ============================================
// 检查点响应
// ============================================

/**
 * 检查点响应动作
 */
export type CheckpointResponseAction =
  | 'approve'   // 批准，继续执行
  | 'modify'    // 修改后继续
  | 'reject'    // 拒绝，停止执行
  | 'takeover'  // 用户接管，手动完成

/**
 * 检查点响应
 */
export type CheckpointResponse = {
  /** 响应动作 */
  action: CheckpointResponseAction
  /** 修改内容（当 action 为 modify 时） */
  modifications?: Partial<TodoItem>
  /** 响应原因/备注 */
  reason?: string
  /** 响应时间 */
  timestamp: Date
  /** 响应者 ID */
  respondedBy?: string
}

// ============================================
// 待处理检查点
// ============================================

/**
 * 检查点状态
 */
export type PendingCheckpointStatus =
  | 'pending'    // 等待响应
  | 'responded'  // 已响应
  | 'expired'    // 已超时
  | 'cancelled'  // 已取消

/**
 * 检查点选项（用于多选场景）
 */
export type CheckpointOption = {
  /** 选项 ID */
  id: string
  /** 选项标签 */
  label: string
  /** 选项描述 */
  description?: string
  /** 是否为默认选项 */
  isDefault?: boolean
  /** 是否为推荐选项 */
  isRecommended?: boolean
}

/**
 * 待处理检查点
 */
export type PendingCheckpoint = {
  /** 检查点 ID */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 关联的 TODO Item ID */
  todoItemId: string
  /** 关联的 TODO Item */
  todoItem: TodoItem
  /** 需要确认的原因 */
  reason: string
  /** 匹配的规则 ID */
  matchedRuleId?: string
  /** 预览数据（用于展示给用户） */
  preview?: unknown
  /** 可选操作列表 */
  options: CheckpointOption[]
  /** 状态 */
  status: PendingCheckpointStatus
  /** 响应信息 */
  response?: CheckpointResponse
  /** 创建时间 */
  createdAt: Date
  /** 超时时间 */
  expiresAt?: Date
  /** 响应时间 */
  respondedAt?: Date
}

// ============================================
// 检查点检查结果
// ============================================

/**
 * 检查点检查结果
 */
export type CheckpointCheckResult = {
  /** 是否需要确认 */
  required: boolean
  /** 需要确认的原因 */
  reason?: string
  /** 匹配的规则 */
  matchedRule?: CheckpointRule
  /** 风险等级 */
  riskLevel?: RiskLevel
  /** 预览数据 */
  preview?: unknown
  /** 建议选项 */
  suggestedOptions?: CheckpointOption[]
}

// ============================================
// 智能判断上下文
// ============================================

/**
 * 智能判断上下文
 */
export type SmartCheckContext = {
  /** 会话 ID */
  sessionId: string
  /** 用户 ID */
  userId?: string
  /** 团队 ID */
  teamId?: string
  /** 用户历史操作统计 */
  userHistory?: {
    /** 该操作类型的执行次数 */
    operationCount: number
    /** 该资源类型的操作次数 */
    resourceCount: number
    /** 最近是否有失败 */
    recentFailures: number
    /** 上次执行时间 */
    lastExecutedAt?: Date
  }
  /** 资源信息 */
  resourceInfo?: {
    /** 资源名称 */
    name: string
    /** 资源是否为新创建 */
    isNew: boolean
    /** 资源重要性 */
    importance?: 'low' | 'medium' | 'high'
    /** 影响范围 */
    impactScope?: number
  }
  /** 当前时间 */
  currentTime: Date
}

// ============================================
// 规则集配置
// ============================================

/**
 * 规则集
 */
export type CheckpointRuleSet = {
  /** 规则集 ID */
  id: string
  /** 规则集名称 */
  name: string
  /** 规则集描述 */
  description?: string
  /** 规则列表 */
  rules: CheckpointRule[]
  /** 是否为默认规则集 */
  isDefault: boolean
  /** 创建者 */
  createdBy?: string
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

// ============================================
// API 请求/响应类型
// ============================================

/**
 * 获取待处理检查点请求
 */
export type GetPendingCheckpointsRequest = {
  sessionId: string
  status?: PendingCheckpointStatus[]
  limit?: number
}

/**
 * 响应检查点请求
 */
export type RespondCheckpointRequest = {
  checkpointId: string
  response: Omit<CheckpointResponse, 'timestamp'>
}

/**
 * 配置规则请求
 */
export type ConfigureRulesRequest = {
  sessionId: string
  rules: Omit<CheckpointRule, 'createdAt'>[]
  /** 是否覆盖现有规则 */
  replace?: boolean
}

// ============================================
// 辅助函数
// ============================================

/**
 * 创建默认检查点规则
 */
export function createDefaultCheckpointRule(
  id: string,
  name: string,
  trigger: CheckpointTrigger,
  condition: CheckpointRuleCondition,
  action: CheckpointRuleAction,
  priority: number = 50
): CheckpointRule {
  return {
    id,
    name,
    trigger,
    condition,
    action,
    priority,
    enabled: true,
    createdAt: new Date(),
  }
}

/**
 * 创建检查点响应
 */
export function createCheckpointResponse(
  action: CheckpointResponseAction,
  options?: {
    modifications?: Partial<TodoItem>
    reason?: string
    respondedBy?: string
  }
): CheckpointResponse {
  return {
    action,
    modifications: options?.modifications,
    reason: options?.reason,
    respondedBy: options?.respondedBy,
    timestamp: new Date(),
  }
}

/**
 * 根据操作类别获取默认风险等级
 */
export function getDefaultRiskLevel(
  category: TodoItemCategory,
  stateAction?: StateAction
): RiskLevel {
  // 观察类操作风险最低
  if (category === 'observation') return 'low'

  // 访问类操作风险低
  if (category === 'access') return 'low'

  // 验证类操作风险低
  if (category === 'verify') return 'low'

  // 状态变更类操作需要进一步判断
  if (category === 'state') {
    switch (stateAction) {
      case 'delete':
        return 'high'
      case 'create':
        return 'medium'
      case 'update':
        return 'medium'
      default:
        return 'medium'
    }
  }

  // 复合操作默认中等风险
  if (category === 'compound') return 'medium'

  return 'medium'
}

/**
 * 判断检查点是否已超时
 */
export function isCheckpointExpired(checkpoint: PendingCheckpoint): boolean {
  if (!checkpoint.expiresAt) return false
  return new Date() > checkpoint.expiresAt
}

/**
 * 判断检查点是否可响应
 */
export function isCheckpointRespondable(checkpoint: PendingCheckpoint): boolean {
  return (
    checkpoint.status === 'pending' &&
    !isCheckpointExpired(checkpoint)
  )
}
