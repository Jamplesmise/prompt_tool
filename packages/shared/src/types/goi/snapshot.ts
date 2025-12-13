/**
 * GOI 状态快照类型定义
 *
 * 快照用于：
 * - 精确回滚：失败时恢复到安全状态
 * - 断点续作：用户接管后可从任意步骤继续
 * - 上下文恢复：会话中断后可重建上下文
 */

import type { ResourceType } from './events'
import type { TodoItem as FullTodoItem, TodoItemStatus } from './todoItem'

// ============================================
// 快照触发类型
// ============================================

/**
 * 快照触发原因
 */
export type SnapshotTrigger =
  | 'todo_start'    // TODO 项开始执行
  | 'checkpoint'    // 检查点通过
  | 'compact'       // 上下文压缩
  | 'manual'        // 手动创建
  | 'session_start' // 会话开始
  | 'error'         // 错误发生时
  | 'state_change'  // 状态变更前

// ============================================
// 会话状态
// ============================================

/**
 * 会话状态 - 记录用户当前的 UI 状态
 */
export type SessionState = {
  /** 当前页面路径 */
  currentPage: string
  /** 页面参数 */
  pageParams?: Record<string, string>
  /** 打开的弹窗列表 */
  openDialogs: DialogState[]
  /** 表单状态 */
  formStates: FormState[]
  /** 选中的资源 */
  selectedItems: SelectedItem[]
  /** 展开的面板/节点 */
  expandedItems: string[]
  /** 滚动位置 */
  scrollPositions: {
    path: string
    x: number
    y: number
  }[]
}

/**
 * 弹窗状态
 */
export type DialogState = {
  id: string
  type: string
  props?: Record<string, unknown>
  formData?: Record<string, unknown>
}

/**
 * 表单状态
 */
export type FormState = {
  id: string
  path: string
  values: Record<string, unknown>
  touched: string[]
  errors: Record<string, string>
  isDirty: boolean
}

/**
 * 选中项
 */
export type SelectedItem = {
  type: ResourceType
  id: string
  name?: string
}

// ============================================
// TODO 状态
// ============================================

/**
 * TODO 列表状态
 */
export type TodoState = {
  /** TODO 列表 ID */
  todoListId: string
  /** 当前执行的项索引 */
  currentItemIndex: number
  /** 已完成的项 ID 列表 */
  completedItems: string[]
  /** 失败的项 ID 列表 */
  failedItems: string[]
  /** 跳过的项 ID 列表 */
  skippedItems: string[]
  /** 所有 TODO 项 */
  items: SnapshotTodoItem[]
}

/**
 * 快照中的 TODO 项（简化版本）
 * 用于快照存储，只包含恢复所需的关键信息
 */
export type SnapshotTodoItem = {
  id: string
  title: string
  description?: string
  status: TodoItemStatus
  order: number
  result?: Record<string, unknown>
  error?: string
}

/**
 * 从完整 TodoItem 转换为快照 TodoItem
 */
export function toSnapshotTodoItem(item: FullTodoItem, order: number): SnapshotTodoItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    order,
    result: item.result as Record<string, unknown> | undefined,
    error: item.error,
  }
}

// ============================================
// 资源状态
// ============================================

/**
 * 资源状态 - 记录自快照起点以来的资源变更
 */
export type ResourceState = {
  /** 创建的资源 */
  createdResources: CreatedResource[]
  /** 修改的资源 */
  modifiedResources: ModifiedResource[]
  /** 删除的资源 */
  deletedResources: DeletedResource[]
}

/**
 * 创建的资源记录
 */
export type CreatedResource = {
  type: ResourceType
  id: string
  name?: string
  data: Record<string, unknown>
  createdAt: Date
}

/**
 * 修改的资源记录
 */
export type ModifiedResource = {
  type: ResourceType
  id: string
  name?: string
  /** 修改前的数据快照 */
  beforeData: Record<string, unknown>
  /** 修改的字段 */
  changes: {
    field: string
    oldValue: unknown
    newValue: unknown
  }[]
  modifiedAt: Date
}

/**
 * 删除的资源记录
 */
export type DeletedResource = {
  type: ResourceType
  id: string
  name?: string
  /** 删除前的完整数据（用于恢复） */
  data: Record<string, unknown>
  deletedAt: Date
}

// ============================================
// 上下文状态
// ============================================

/**
 * 上下文状态 - 记录 AI 对话上下文
 */
export type ContextState = {
  /** 上下文摘要 */
  contextSummary?: string
  /** Token 使用情况 */
  tokenUsage: {
    used: number
    limit: number
    percentage: number
  }
  /** 关键信息 */
  keyInformation: KeyInformation[]
  /** 活跃的变量/引用 */
  activeReferences: ActiveReference[]
}

/**
 * 关键信息
 */
export type KeyInformation = {
  type: 'decision' | 'constraint' | 'requirement' | 'context'
  content: string
  importance: 'high' | 'medium' | 'low'
  source?: string
}

/**
 * 活跃引用
 */
export type ActiveReference = {
  type: ResourceType
  id: string
  name?: string
  role: 'target' | 'dependency' | 'context'
}

// ============================================
// 完整快照类型
// ============================================

/**
 * GOI 状态快照
 */
export type GoiSnapshot = {
  /** 快照 ID */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 关联的 TODO 项 ID */
  todoItemId?: string
  /** 触发原因 */
  trigger: SnapshotTrigger
  /** 会话状态 */
  sessionState: SessionState
  /** TODO 状态 */
  todoState?: TodoState
  /** 资源状态 */
  resourceState?: ResourceState
  /** 上下文状态 */
  contextState?: ContextState
  /** 创建时间 */
  createdAt: Date
}

/**
 * 创建快照的输入
 */
export type CreateSnapshotInput = {
  sessionId: string
  trigger: SnapshotTrigger
  todoItemId?: string
  sessionState: SessionState
  todoState?: TodoState
  resourceState?: ResourceState
  contextState?: ContextState
}

/**
 * 快照查询选项
 */
export type SnapshotQueryOptions = {
  sessionId?: string
  trigger?: SnapshotTrigger
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

/**
 * 快照恢复结果
 */
export type RestoreResult = {
  success: boolean
  snapshotId: string
  restoredAt: Date
  /** 回滚的资源 */
  rolledBackResources: {
    created: number  // 撤销创建的数量
    modified: number // 恢复修改的数量
    deleted: number  // 恢复删除的数量
  }
  /** 恢复过程中的错误 */
  errors: {
    resourceType: ResourceType
    resourceId: string
    error: string
  }[]
}
