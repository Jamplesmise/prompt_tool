/**
 * GOI TODO List 管理
 *
 * 负责 TODO List 的创建、更新、查询等核心操作
 */

import { nanoid } from 'nanoid'
import type {
  TodoItem,
  TodoList,
  TodoItemStatus,
  TodoListStatus,
  CreateTodoItemInput,
  CreateTodoListInput,
  UpdateTodoItemInput,
  UpdateTodoListInput,
  createDefaultCheckpointConfig,
  createDefaultRollbackConfig,
  isTodoItemExecutable,
  calculateTodoListProgress,
} from '@platform/shared'

// ============================================
// TODO List Manager
// ============================================

/**
 * TODO List 管理器
 */
export class TodoListManager {
  private todoList: TodoList

  constructor(todoList: TodoList) {
    this.todoList = todoList
  }

  /**
   * 获取 TODO List
   */
  getTodoList(): TodoList {
    return this.todoList
  }

  /**
   * 获取 TODO List ID
   */
  getId(): string {
    return this.todoList.id
  }

  /**
   * 获取所有 TODO Items
   */
  getItems(): TodoItem[] {
    return this.todoList.items
  }

  /**
   * 获取单个 TODO Item
   */
  getItem(itemId: string): TodoItem | undefined {
    return this.todoList.items.find((item) => item.id === itemId)
  }

  /**
   * 获取下一个待执行的 TODO Item
   */
  getNextItem(): TodoItem | null {
    // 按优先级和依赖关系排序，找到第一个可执行的项
    const sortedItems = [...this.todoList.items].sort((a, b) => {
      // 优先级越小越优先
      const priorityA = a.priority ?? 100
      const priorityB = b.priority ?? 100
      return priorityA - priorityB
    })

    for (const item of sortedItems) {
      if (this.isItemExecutable(item)) {
        return item
      }
    }

    return null
  }

  /**
   * 判断 TODO Item 是否可执行
   */
  isItemExecutable(item: TodoItem): boolean {
    // 只有 pending 状态的项才能执行
    if (item.status !== 'pending') {
      return false
    }

    // 检查所有依赖是否完成
    for (const depId of item.dependsOn) {
      const dep = this.todoList.items.find((i) => i.id === depId)
      if (!dep || dep.status !== 'completed') {
        return false
      }
    }

    // 检查条件表达式
    if (item.condition) {
      if (!this.evaluateCondition(item.condition)) {
        return false
      }
    }

    return true
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // 简单的条件评估
      // 支持: item.xxx.status === 'completed'
      const context = {
        items: this.todoList.items.reduce(
          (acc, item) => {
            acc[item.id] = item
            return acc
          },
          {} as Record<string, TodoItem>
        ),
        list: this.todoList,
      }

      // 使用 Function 构造器评估表达式（简化实现）
      // 注意：生产环境应使用更安全的表达式评估器
      const fn = new Function('items', 'list', `return ${condition}`)
      return fn(context.items, context.list)
    } catch (error) {
      console.warn(`[TodoList] Failed to evaluate condition: ${condition}`, error)
      return true // 默认返回 true，不阻塞执行
    }
  }

  /**
   * 更新 TODO Item
   */
  updateItem(itemId: string, updates: UpdateTodoItemInput): TodoItem | null {
    const itemIndex = this.todoList.items.findIndex((item) => item.id === itemId)
    if (itemIndex === -1) {
      return null
    }

    const item = this.todoList.items[itemIndex]
    const updatedItem: TodoItem = {
      ...item,
      ...updates,
      updatedAt: new Date(),
    }

    // 处理状态变更的副作用
    if (updates.status) {
      if (updates.status === 'in_progress' && !item.startedAt) {
        updatedItem.startedAt = new Date()
      }
      if (['completed', 'failed', 'skipped'].includes(updates.status) && !item.completedAt) {
        updatedItem.completedAt = new Date()
      }
    }

    this.todoList.items[itemIndex] = updatedItem

    // 更新 TODO List 统计
    this.updateListStats()

    return updatedItem
  }

  /**
   * 添加 TODO Item
   */
  addItem(input: CreateTodoItemInput): TodoItem {
    const item = createTodoItem(input)
    this.todoList.items.push(item)
    this.updateListStats()
    return item
  }

  /**
   * 移除 TODO Item
   */
  removeItem(itemId: string): boolean {
    const initialLength = this.todoList.items.length
    this.todoList.items = this.todoList.items.filter((item) => item.id !== itemId)

    if (this.todoList.items.length !== initialLength) {
      // 移除其他项对被删除项的依赖
      for (const item of this.todoList.items) {
        item.dependsOn = item.dependsOn.filter((depId) => depId !== itemId)
      }
      this.updateListStats()
      return true
    }

    return false
  }

  /**
   * 重新规划（替换 TODO Items）
   */
  replan(newItems: CreateTodoItemInput[], reason?: string): void {
    // 标记当前未完成的项为 replanned
    for (const item of this.todoList.items) {
      if (!['completed', 'failed', 'skipped', 'replanned'].includes(item.status)) {
        item.status = 'replanned'
        item.updatedAt = new Date()
      }
    }

    // 添加新项
    const createdItems = newItems.map((input) => createTodoItem(input))
    this.todoList.items.push(...createdItems)

    // 更新元数据
    this.todoList.metadata = {
      ...this.todoList.metadata,
      lastReplanReason: reason,
      lastReplanAt: new Date(),
    }

    this.updateListStats()
  }

  /**
   * 更新 TODO List 状态
   */
  updateListStatus(status: TodoListStatus): void {
    this.todoList.status = status
    this.todoList.updatedAt = new Date()

    if (status === 'running' && !this.todoList.startedAt) {
      this.todoList.startedAt = new Date()
    }
    if (['completed', 'failed', 'cancelled'].includes(status) && !this.todoList.completedAt) {
      this.todoList.completedAt = new Date()
    }
  }

  /**
   * 更新 TODO List
   */
  updateList(updates: UpdateTodoListInput): void {
    if (updates.status) {
      this.updateListStatus(updates.status)
    }
    if (updates.currentItemIndex !== undefined) {
      this.todoList.currentItemIndex = updates.currentItemIndex
    }
    if (updates.metadata) {
      this.todoList.metadata = { ...this.todoList.metadata, ...updates.metadata }
    }
    this.todoList.updatedAt = new Date()
  }

  /**
   * 更新 TODO List 统计信息
   */
  private updateListStats(): void {
    const items = this.todoList.items
    this.todoList.totalItems = items.length
    this.todoList.completedItems = items.filter((i) => i.status === 'completed').length
    this.todoList.failedItems = items.filter((i) => i.status === 'failed').length
    this.todoList.skippedItems = items.filter((i) => i.status === 'skipped').length
    this.todoList.progress = this.calculateProgress()
    this.todoList.updatedAt = new Date()
  }

  /**
   * 计算进度
   */
  private calculateProgress(): number {
    const items = this.todoList.items
    if (items.length === 0) return 0

    const terminalStatuses: TodoItemStatus[] = ['completed', 'skipped', 'replanned']
    const terminalItems = items.filter((item) => terminalStatuses.includes(item.status))
    return Math.round((terminalItems.length / items.length) * 100)
  }

  /**
   * 检查是否全部完成
   */
  isAllCompleted(): boolean {
    return this.todoList.items.every(
      (item) =>
        item.status === 'completed' || item.status === 'skipped' || item.status === 'replanned'
    )
  }

  /**
   * 检查是否有失败项
   */
  hasFailedItems(): boolean {
    return this.todoList.items.some((item) => item.status === 'failed')
  }

  /**
   * 获取等待检查点的项
   */
  getWaitingItems(): TodoItem[] {
    return this.todoList.items.filter((item) => item.status === 'waiting')
  }

  /**
   * 获取失败的项
   */
  getFailedItems(): TodoItem[] {
    return this.todoList.items.filter((item) => item.status === 'failed')
  }

  /**
   * 重试失败的项
   */
  retryFailedItem(itemId: string): boolean {
    const item = this.getItem(itemId)
    if (!item || item.status !== 'failed') {
      return false
    }

    const maxRetries = item.maxRetries ?? 3
    const currentRetries = item.retryCount ?? 0

    if (currentRetries >= maxRetries) {
      return false
    }

    this.updateItem(itemId, {
      status: 'pending',
      error: undefined,
      retryCount: currentRetries + 1,
    })

    return true
  }

  /**
   * 跳过项
   */
  skipItem(itemId: string, reason?: string): boolean {
    const item = this.getItem(itemId)
    if (!item) {
      return false
    }

    this.updateItem(itemId, {
      status: 'skipped',
      userFeedback: reason,
    })

    return true
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建 TODO Item
 */
export function createTodoItem(input: CreateTodoItemInput): TodoItem {
  const now = new Date()

  return {
    id: nanoid(),
    title: input.title,
    description: input.description,
    category: input.category,
    goiOperation: input.goiOperation,
    dependsOn: input.dependsOn ?? [],
    condition: input.condition,
    priority: input.priority,
    estimatedDuration: input.estimatedDuration,
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    checkpoint: {
      required: false,
      type: 'confirmation',
      timeoutAction: 'skip',
      ...input.checkpoint,
    },
    rollback: {
      enabled: true,
      strategy: 'auto',
      requireConfirmation: false,
      ...input.rollback,
    },
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
  }
}

/**
 * 创建 TODO List
 */
export function createTodoList(input: CreateTodoListInput): TodoList {
  const now = new Date()
  const items = (input.items ?? []).map((itemInput) => createTodoItem(itemInput))

  return {
    id: nanoid(),
    sessionId: input.sessionId,
    goal: input.goal,
    goalAnalysis: input.goalAnalysis,
    status: 'planning',
    items,
    currentItemIndex: 0,
    progress: 0,
    totalItems: items.length,
    completedItems: 0,
    failedItems: 0,
    skippedItems: 0,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
  }
}

/**
 * 创建 TODO List 管理器
 */
export function createTodoListManager(input: CreateTodoListInput): TodoListManager {
  const todoList = createTodoList(input)
  return new TodoListManager(todoList)
}

/**
 * 从现有 TODO List 创建管理器
 */
export function wrapTodoList(todoList: TodoList): TodoListManager {
  return new TodoListManager(todoList)
}
