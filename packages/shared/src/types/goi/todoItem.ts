/**
 * GOI TODO List 类型定义
 *
 * TODO List 是 GOI Agent Loop 的核心数据结构，用于：
 * - 将用户目标分解为原子操作
 * - 管理执行依赖和顺序
 * - 支持检查点和回滚
 * - 记录执行状态和结果
 */

import type { GoiOperation } from './operations'

// ============================================
// TODO Item 状态
// ============================================

/**
 * TODO Item 状态
 */
export type TodoItemStatus =
  | 'pending'      // 待执行
  | 'in_progress'  // 执行中
  | 'waiting'      // 等待检查点确认
  | 'completed'    // 已完成
  | 'failed'       // 执行失败
  | 'skipped'      // 已跳过
  | 'replanned'    // 已重新规划（生成新的 TODO Item）

/**
 * TODO Item 类别
 */
export type TodoItemCategory =
  | 'access'       // 访问操作
  | 'state'        // 状态变更
  | 'observation'  // 信息查询
  | 'verify'       // 验证操作
  | 'compound'     // 复合操作（包含多个子操作）

// ============================================
// 检查点配置
// ============================================

/**
 * 检查点类型
 */
export type CheckpointType =
  | 'review'              // 需要人工审查
  | 'approval'            // 需要人工批准
  | 'decision'            // 需要人工决策
  | 'confirmation'        // 需要人工确认
  | 'resource_selection'  // 资源选择（多个匹配时需要用户选择）
  | 'resource_not_found'  // 资源未找到（需要用户创建或取消）

/**
 * 检查点配置
 */
export type CheckpointConfig = {
  /** 是否需要人工确认 */
  required: boolean
  /** 检查点类型 */
  type?: CheckpointType
  /** 自动通过规则（表达式） */
  autoApproveRule?: string
  /** 超时时间（毫秒），超时后自动跳过或失败 */
  timeout?: number
  /** 超时后的行为 */
  timeoutAction?: 'skip' | 'fail' | 'auto_approve'
  /** 提示信息 */
  message?: string
  /** 选项列表（用于决策类检查点） */
  options?: Array<{
    id: string
    label: string
    description?: string
    isDefault?: boolean
  }>
}

// ============================================
// 回滚配置
// ============================================

/**
 * 回滚配置
 */
export type RollbackConfig = {
  /** 是否支持回滚 */
  enabled: boolean
  /** 状态快照 ID */
  snapshotId?: string
  /** 回滚策略 */
  strategy?: 'auto' | 'manual' | 'disabled'
  /** 回滚前需要确认 */
  requireConfirmation?: boolean
}

// ============================================
// TODO Item 定义
// ============================================

/**
 * TODO Item - 单个待办项
 */
export type TodoItem = {
  /** 唯一标识 */
  id: string
  /** 简短标题（用户可见） */
  title: string
  /** 详细描述（AI 理解用） */
  description: string

  // ---- 执行信息 ----
  /** 操作类别 */
  category: TodoItemCategory
  /** GOI 操作定义 */
  goiOperation: GoiOperation
  /** 前置依赖项 ID 列表 */
  dependsOn: string[]
  /** 条件执行表达式 */
  condition?: string
  /** 执行优先级（数字越小优先级越高） */
  priority?: number
  /** 预估执行时间（毫秒） */
  estimatedDuration?: number

  // ---- 状态信息 ----
  /** 当前状态 */
  status: TodoItemStatus
  /** 开始执行时间 */
  startedAt?: Date
  /** 完成时间 */
  completedAt?: Date
  /** 执行结果 */
  result?: unknown
  /** 错误信息 */
  error?: string
  /** 重试次数 */
  retryCount?: number
  /** 最大重试次数 */
  maxRetries?: number

  // ---- 检查点配置 ----
  /** 检查点配置 */
  checkpoint: CheckpointConfig
  /** 用户选择的选项（用于决策类检查点） */
  selectedOption?: string
  /** 用户反馈 */
  userFeedback?: string

  // ---- 回滚配置 ----
  /** 回滚配置 */
  rollback: RollbackConfig

  // ---- 元数据 ----
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

// ============================================
// TODO List 定义
// ============================================

/**
 * TODO List 状态
 */
export type TodoListStatus =
  | 'planning'   // 正在规划
  | 'ready'      // 准备就绪
  | 'running'    // 执行中
  | 'paused'     // 已暂停
  | 'completed'  // 已完成
  | 'failed'     // 执行失败
  | 'cancelled'  // 已取消

/**
 * TODO List - 待办列表
 */
export type TodoList = {
  /** 唯一标识 */
  id: string
  /** 所属会话 ID */
  sessionId: string
  /** 用户目标描述 */
  goal: string
  /** 目标的详细分析 */
  goalAnalysis?: string

  // ---- 状态信息 ----
  /** 当前状态 */
  status: TodoListStatus
  /** TODO 项列表 */
  items: TodoItem[]
  /** 当前执行项索引 */
  currentItemIndex: number
  /** 执行进度（0-100） */
  progress: number

  // ---- 统计信息 ----
  /** 总项数 */
  totalItems: number
  /** 已完成项数 */
  completedItems: number
  /** 失败项数 */
  failedItems: number
  /** 跳过项数 */
  skippedItems: number

  // ---- 时间信息 ----
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 开始执行时间 */
  startedAt?: Date
  /** 完成时间 */
  completedAt?: Date

  // ---- 元数据 ----
  /** 创建者 ID */
  createdBy?: string
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

// ============================================
// 创建输入类型
// ============================================

/**
 * 创建 TODO Item 的输入
 */
export type CreateTodoItemInput = {
  title: string
  description: string
  category: TodoItemCategory
  goiOperation: GoiOperation
  dependsOn?: string[]
  condition?: string
  priority?: number
  estimatedDuration?: number
  checkpoint?: Partial<CheckpointConfig>
  rollback?: Partial<RollbackConfig>
  metadata?: Record<string, unknown>
}

/**
 * 创建 TODO List 的输入
 */
export type CreateTodoListInput = {
  sessionId: string
  goal: string
  goalAnalysis?: string
  items?: CreateTodoItemInput[]
  metadata?: Record<string, unknown>
}

/**
 * 更新 TODO Item 的输入
 */
export type UpdateTodoItemInput = {
  status?: TodoItemStatus
  result?: unknown
  error?: string
  selectedOption?: string
  userFeedback?: string
  retryCount?: number
  metadata?: Record<string, unknown>
  /** 检查点配置（可动态更新） */
  checkpoint?: CheckpointConfig
}

/**
 * 更新 TODO List 的输入
 */
export type UpdateTodoListInput = {
  status?: TodoListStatus
  currentItemIndex?: number
  metadata?: Record<string, unknown>
}

// ============================================
// 执行相关类型
// ============================================

/**
 * TODO Item 执行结果
 */
export type TodoItemExecutionResult = {
  /** 是否成功 */
  success: boolean
  /** TODO Item ID */
  itemId: string
  /** 执行结果 */
  result?: unknown
  /** 错误信息 */
  error?: string
  /** 执行耗时（毫秒） */
  duration: number
  /** 是否需要等待检查点 */
  waitingForCheckpoint: boolean
  /** 是否需要重新规划 */
  needsReplan: boolean
  /** 重新规划原因 */
  replanReason?: string
}

/**
 * TODO List 执行摘要
 */
export type TodoListExecutionSummary = {
  /** TODO List ID */
  listId: string
  /** 目标 */
  goal: string
  /** 总耗时（毫秒） */
  totalDuration: number
  /** 统计信息 */
  stats: {
    total: number
    completed: number
    failed: number
    skipped: number
  }
  /** 是否成功 */
  success: boolean
  /** 失败原因 */
  failureReason?: string
}

// ============================================
// 辅助函数
// ============================================

/**
 * 创建默认的检查点配置
 */
export function createDefaultCheckpointConfig(): CheckpointConfig {
  return {
    required: false,
    type: 'confirmation',
    timeoutAction: 'skip',
  }
}

/**
 * 创建默认的回滚配置
 */
export function createDefaultRollbackConfig(): RollbackConfig {
  return {
    enabled: true,
    strategy: 'auto',
    requireConfirmation: false,
  }
}

/**
 * 判断 TODO Item 是否可执行
 */
export function isTodoItemExecutable(item: TodoItem, allItems: TodoItem[]): boolean {
  // 只有 pending 状态的项才能执行
  if (item.status !== 'pending') {
    return false
  }

  // 检查所有依赖是否完成
  for (const depId of item.dependsOn) {
    const dep = allItems.find((i) => i.id === depId)
    if (!dep || dep.status !== 'completed') {
      return false
    }
  }

  return true
}

/**
 * 判断 TODO Item 是否为终态
 */
export function isTodoItemTerminal(status: TodoItemStatus): boolean {
  return ['completed', 'skipped', 'replanned'].includes(status)
}

/**
 * 计算 TODO List 进度
 */
export function calculateTodoListProgress(items: TodoItem[]): number {
  if (items.length === 0) return 0

  const terminalItems = items.filter((item) => isTodoItemTerminal(item.status))
  return Math.round((terminalItems.length / items.length) * 100)
}
