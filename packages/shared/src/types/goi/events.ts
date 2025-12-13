/**
 * GOI (Guided Orchestration Intelligence) 事件系统类型定义
 *
 * 事件系统用于记录和同步所有操作，支持：
 * - 统一记录：无论操作来自用户还是 AI，都通过事件记录
 * - 实时同步：AI 可以感知用户操作，用户可以看到 AI 操作
 * - 状态重建：支持回滚和断点续作
 * - 审计追踪：所有操作可追溯
 */

// ============================================
// 事件分类
// ============================================

/**
 * 事件分类
 */
export type EventCategory = 'operation' | 'flow' | 'collaboration' | 'context'

/**
 * 事件来源
 */
export type EventSource = 'user' | 'ai' | 'system'

// ============================================
// 操作事件 (Operation Events)
// ============================================

/**
 * 操作事件类型 - 资源的 CRUD 操作
 */
export type OperationEventType =
  | 'RESOURCE_ACCESSED'
  | 'RESOURCE_CREATED'
  | 'RESOURCE_UPDATED'
  | 'RESOURCE_DELETED'
  | 'TASK_EXECUTED'
  | 'TASK_PAUSED'
  | 'TASK_RESUMED'
  | 'TASK_STOPPED'

/**
 * 资源类型
 */
export type ResourceType =
  | 'prompt'
  | 'prompt_version'
  | 'prompt_branch'
  | 'dataset'
  | 'dataset_version'
  | 'model'
  | 'provider'
  | 'evaluator'
  | 'task'
  | 'task_result'
  | 'evaluation_schema'
  | 'input_schema'
  | 'output_schema'
  | 'scheduled_task'
  | 'alert_rule'
  | 'notify_channel'
  // 系统页面
  | 'settings'
  | 'dashboard'
  | 'monitor'
  | 'schema'
  | 'comparison'  // 对比分析

/**
 * 资源访问事件载荷
 */
export type ResourceAccessedPayload = {
  resourceType: ResourceType
  resourceId: string
  resourceName?: string
}

/**
 * 资源创建事件载荷
 */
export type ResourceCreatedPayload = {
  resourceType: ResourceType
  resourceId: string
  resourceName?: string
  data: Record<string, unknown>
}

/**
 * 资源更新事件载荷
 */
export type ResourceUpdatedPayload = {
  resourceType: ResourceType
  resourceId: string
  resourceName?: string
  changes: {
    field: string
    oldValue: unknown
    newValue: unknown
  }[]
}

/**
 * 资源删除事件载荷
 */
export type ResourceDeletedPayload = {
  resourceType: ResourceType
  resourceId: string
  resourceName?: string
  data?: Record<string, unknown>
}

/**
 * 任务执行事件载荷
 */
export type TaskExecutedPayload = {
  taskId: string
  taskName: string
  action: 'started' | 'completed' | 'failed'
  progress?: {
    total: number
    completed: number
    failed: number
  }
  error?: string
}

// ============================================
// 流程事件 (Flow Events)
// ============================================

/**
 * 流程事件类型 - TODO List 执行进度
 */
export type FlowEventType =
  | 'TODO_PLANNED'
  | 'TODO_ITEM_STARTED'
  | 'TODO_ITEM_COMPLETED'
  | 'TODO_ITEM_FAILED'
  | 'TODO_ITEM_SKIPPED'
  | 'TODO_REPLANNED'
  // Agent Loop 状态事件
  | 'AGENT_STARTED'
  | 'AGENT_PAUSED'
  | 'AGENT_RESUMED'
  | 'AGENT_COMPLETED'
  | 'AGENT_FAILED'
  | 'AGENT_WAITING'
  | 'AGENT_STEP_COMPLETED'

/**
 * TODO 项状态
 * 注意：这里定义事件载荷中的简化状态，完整状态定义在 todoItem.ts
 */
export type EventTodoItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

/**
 * TODO 规划事件载荷
 */
export type TodoPlannedPayload = {
  todoListId: string
  items: {
    id: string
    title: string
    description?: string
    order: number
  }[]
  totalItems: number
}

/**
 * TODO 项开始事件载荷
 */
export type TodoItemStartedPayload = {
  todoListId: string
  todoItemId: string
  title: string
  order: number
}

/**
 * TODO 项完成事件载荷
 */
export type TodoItemCompletedPayload = {
  todoListId: string
  todoItemId: string
  title: string
  order: number
  result?: Record<string, unknown>
}

/**
 * TODO 项失败事件载荷
 */
export type TodoItemFailedPayload = {
  todoListId: string
  todoItemId: string
  title: string
  order: number
  error: string
  canRetry: boolean
}

/**
 * TODO 项跳过事件载荷
 */
export type TodoItemSkippedPayload = {
  todoListId: string
  todoItemId: string
  title: string
  order: number
  reason: string
}

/**
 * TODO 重新规划事件载荷
 */
export type TodoReplannedPayload = {
  todoListId: string
  reason: string
  addedItems: {
    id: string
    title: string
    order: number
  }[]
  removedItemIds: string[]
  reorderedItems: {
    id: string
    oldOrder: number
    newOrder: number
  }[]
}

// ============================================
// Agent Loop 事件载荷
// ============================================

/**
 * Agent 启动事件载荷
 */
export type AgentStartedPayload = {
  sessionId: string
  goal: string
  modelId: string
  todoListId?: string
}

/**
 * Agent 暂停事件载荷
 */
export type AgentPausedPayload = {
  sessionId: string
  reason: string
  currentTodoItemId?: string
  progress: {
    total: number
    completed: number
    failed: number
  }
}

/**
 * Agent 恢复事件载荷
 */
export type AgentResumedPayload = {
  sessionId: string
  fromCheckpoint?: string
}

/**
 * Agent 完成事件载荷
 */
export type AgentCompletedPayload = {
  sessionId: string
  todoListId: string
  summary: {
    total: number
    completed: number
    failed: number
    skipped: number
  }
  duration: number
}

/**
 * Agent 失败事件载荷
 */
export type AgentFailedPayload = {
  sessionId: string
  error: string
  lastTodoItemId?: string
  canRetry: boolean
}

/**
 * Agent 等待事件载荷
 */
export type AgentWaitingPayload = {
  sessionId: string
  waitingFor: 'checkpoint' | 'user_input' | 'rate_limit' | 'external'
  checkpointId?: string
  message?: string
}

/**
 * Agent 步骤完成事件载荷
 */
export type AgentStepCompletedPayload = {
  sessionId: string
  todoItemId: string
  todoItemTitle: string
  result: {
    success: boolean
    data?: Record<string, unknown>
    error?: string
  }
  progress: {
    total: number
    completed: number
    current: number
  }
}

// ============================================
// 协作事件 (Collaboration Events)
// ============================================

/**
 * 协作事件类型 - 人机交互记录
 */
export type CollaborationEventType =
  | 'CHECKPOINT_REACHED'
  | 'CHECKPOINT_APPROVED'
  | 'CHECKPOINT_REJECTED'
  | 'CHECKPOINT_MODIFIED'
  | 'CONTROL_TRANSFERRED'
  | 'FEEDBACK_PROVIDED'
  | 'QUESTION_ASKED'
  | 'QUESTION_ANSWERED'

// CheckpointType 已在 todoItem.ts 中定义，这里导入使用
import type { CheckpointType } from './todoItem'
export type { CheckpointType }

/**
 * 检查点到达事件载荷
 */
export type CheckpointReachedPayload = {
  checkpointId: string
  checkpointType: CheckpointType
  title: string
  description?: string
  todoItemId?: string
  options?: {
    id: string
    label: string
    description?: string
  }[]
  requiresApproval: boolean
}

/**
 * 检查点批准事件载荷
 */
export type CheckpointApprovedPayload = {
  checkpointId: string
  checkpointType: CheckpointType
  selectedOptionId?: string
  comment?: string
}

/**
 * 检查点拒绝事件载荷
 */
export type CheckpointRejectedPayload = {
  checkpointId: string
  checkpointType: CheckpointType
  reason: string
  suggestedChanges?: string
}

/**
 * 检查点修改事件载荷
 */
export type CheckpointModifiedPayload = {
  checkpointId: string
  checkpointType: CheckpointType
  modifications: Record<string, unknown>
  comment?: string
}

/**
 * 控制权转移事件载荷
 */
export type ControlTransferredPayload = {
  from: EventSource
  to: EventSource
  reason: string
  context?: string
}

/**
 * 反馈提供事件载荷
 */
export type FeedbackProvidedPayload = {
  targetType: 'todo_item' | 'checkpoint' | 'result' | 'general'
  targetId?: string
  rating?: number
  comment: string
}

/**
 * 问题提问事件载荷
 */
export type QuestionAskedPayload = {
  questionId: string
  question: string
  context?: string
  options?: string[]
  requiresAnswer: boolean
}

/**
 * 问题回答事件载荷
 */
export type QuestionAnsweredPayload = {
  questionId: string
  answer: string
  selectedOption?: string
}

// ============================================
// 上下文事件 (Context Events)
// ============================================

/**
 * 上下文事件类型 - 记忆管理
 */
export type ContextEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'CONTEXT_COMPACTED'
  | 'CONTEXT_RESTORED'
  | 'CONTEXT_UPDATED'

/**
 * 会话开始事件载荷
 */
export type SessionStartedPayload = {
  sessionId: string
  userId: string
  teamId?: string
  initialContext?: {
    page?: string
    resourceId?: string
    resourceType?: ResourceType
  }
}

/**
 * 会话结束事件载荷
 */
export type SessionEndedPayload = {
  sessionId: string
  reason: 'completed' | 'timeout' | 'user_exit' | 'error'
  summary?: {
    duration: number
    eventsCount: number
    todoItemsCompleted: number
    resourcesModified: number
  }
}

/**
 * 会话暂停事件载荷
 */
export type SessionPausedPayload = {
  sessionId: string
  reason: string
  canResume: boolean
}

/**
 * 会话恢复事件载荷
 */
export type SessionResumedPayload = {
  sessionId: string
  fromSnapshotId?: string
}

/**
 * 上下文压缩事件载荷
 */
export type ContextCompactedPayload = {
  sessionId: string
  beforeTokens: number
  afterTokens: number
  compactionRatio: number
  preservedItems: string[]
}

/**
 * 上下文恢复事件载荷
 */
export type ContextRestoredPayload = {
  sessionId: string
  snapshotId: string
  restoredItems: string[]
}

/**
 * 上下文更新事件载荷
 */
export type ContextUpdatedPayload = {
  sessionId: string
  updates: {
    key: string
    value: unknown
  }[]
}

// ============================================
// 事件类型联合
// ============================================

/**
 * 所有事件类型
 */
export type GoiEventType =
  | OperationEventType
  | FlowEventType
  | CollaborationEventType
  | ContextEventType

/**
 * 事件类型到载荷的映射
 */
export type EventPayloadMap = {
  // 操作事件
  RESOURCE_ACCESSED: ResourceAccessedPayload
  RESOURCE_CREATED: ResourceCreatedPayload
  RESOURCE_UPDATED: ResourceUpdatedPayload
  RESOURCE_DELETED: ResourceDeletedPayload
  TASK_EXECUTED: TaskExecutedPayload
  TASK_PAUSED: TaskExecutedPayload
  TASK_RESUMED: TaskExecutedPayload
  TASK_STOPPED: TaskExecutedPayload

  // 流程事件
  TODO_PLANNED: TodoPlannedPayload
  TODO_ITEM_STARTED: TodoItemStartedPayload
  TODO_ITEM_COMPLETED: TodoItemCompletedPayload
  TODO_ITEM_FAILED: TodoItemFailedPayload
  TODO_ITEM_SKIPPED: TodoItemSkippedPayload
  TODO_REPLANNED: TodoReplannedPayload

  // Agent Loop 事件
  AGENT_STARTED: AgentStartedPayload
  AGENT_PAUSED: AgentPausedPayload
  AGENT_RESUMED: AgentResumedPayload
  AGENT_COMPLETED: AgentCompletedPayload
  AGENT_FAILED: AgentFailedPayload
  AGENT_WAITING: AgentWaitingPayload
  AGENT_STEP_COMPLETED: AgentStepCompletedPayload

  // 协作事件
  CHECKPOINT_REACHED: CheckpointReachedPayload
  CHECKPOINT_APPROVED: CheckpointApprovedPayload
  CHECKPOINT_REJECTED: CheckpointRejectedPayload
  CHECKPOINT_MODIFIED: CheckpointModifiedPayload
  CONTROL_TRANSFERRED: ControlTransferredPayload
  FEEDBACK_PROVIDED: FeedbackProvidedPayload
  QUESTION_ASKED: QuestionAskedPayload
  QUESTION_ANSWERED: QuestionAnsweredPayload

  // 上下文事件
  SESSION_STARTED: SessionStartedPayload
  SESSION_ENDED: SessionEndedPayload
  SESSION_PAUSED: SessionPausedPayload
  SESSION_RESUMED: SessionResumedPayload
  CONTEXT_COMPACTED: ContextCompactedPayload
  CONTEXT_RESTORED: ContextRestoredPayload
  CONTEXT_UPDATED: ContextUpdatedPayload
}

// ============================================
// 基础事件接口
// ============================================

/**
 * GOI 事件基础接口
 */
export type GoiEventBase = {
  id: string
  sessionId: string
  type: GoiEventType
  category: EventCategory
  source: EventSource
  timestamp: Date
  metadata?: {
    userId?: string
    teamId?: string
    correlationId?: string
    parentEventId?: string
  }
}

/**
 * 类型安全的 GOI 事件
 */
export type GoiEvent<T extends GoiEventType = GoiEventType> = GoiEventBase & {
  type: T
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : Record<string, unknown>
}

/**
 * 创建事件的输入类型
 */
export type CreateGoiEventInput<T extends GoiEventType> = {
  sessionId: string
  type: T
  source: EventSource
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : Record<string, unknown>
  metadata?: GoiEventBase['metadata']
}

/**
 * 事件查询过滤器
 */
export type GoiEventFilter = {
  sessionId?: string
  types?: GoiEventType[]
  categories?: EventCategory[]
  sources?: EventSource[]
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

/**
 * 事件订阅选项
 */
export type GoiEventSubscription = {
  sessionId: string
  types?: GoiEventType[]
  categories?: EventCategory[]
  callback: (event: GoiEvent) => void | Promise<void>
}

// ============================================
// 工具函数类型
// ============================================

/**
 * 根据事件类型获取分类
 */
export const getEventCategory = (type: GoiEventType): EventCategory => {
  const operationTypes: OperationEventType[] = [
    'RESOURCE_ACCESSED',
    'RESOURCE_CREATED',
    'RESOURCE_UPDATED',
    'RESOURCE_DELETED',
    'TASK_EXECUTED',
    'TASK_PAUSED',
    'TASK_RESUMED',
    'TASK_STOPPED',
  ]

  const flowTypes: FlowEventType[] = [
    'TODO_PLANNED',
    'TODO_ITEM_STARTED',
    'TODO_ITEM_COMPLETED',
    'TODO_ITEM_FAILED',
    'TODO_ITEM_SKIPPED',
    'TODO_REPLANNED',
    'AGENT_STARTED',
    'AGENT_PAUSED',
    'AGENT_RESUMED',
    'AGENT_COMPLETED',
    'AGENT_FAILED',
    'AGENT_WAITING',
    'AGENT_STEP_COMPLETED',
  ]

  const collaborationTypes: CollaborationEventType[] = [
    'CHECKPOINT_REACHED',
    'CHECKPOINT_APPROVED',
    'CHECKPOINT_REJECTED',
    'CHECKPOINT_MODIFIED',
    'CONTROL_TRANSFERRED',
    'FEEDBACK_PROVIDED',
    'QUESTION_ASKED',
    'QUESTION_ANSWERED',
  ]

  if (operationTypes.includes(type as OperationEventType)) return 'operation'
  if (flowTypes.includes(type as FlowEventType)) return 'flow'
  if (collaborationTypes.includes(type as CollaborationEventType)) return 'collaboration'
  return 'context'
}
