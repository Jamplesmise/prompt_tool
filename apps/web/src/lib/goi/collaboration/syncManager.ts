/**
 * 同步管理器
 *
 * 负责：
 * - 监听用户操作事件
 * - 更新 AI 理解状态
 * - 判断操作是否与当前 TODO 相关
 * - 触发重新规划
 */

import type {
  GoiEvent,
  GoiEventType,
  ResourceType,
  AIUnderstanding,
} from '@platform/shared'
import type { TodoItem, TodoList } from '@platform/shared'
import { eventBus } from '../../events'

// ============================================
// 同步管理器配置
// ============================================

export type SyncManagerConfig = {
  /** 防抖间隔（毫秒） */
  debounceInterval: number
  /** 是否自动标记完成 */
  autoMarkComplete: boolean
  /** 触发重规划的阈值 */
  replanThreshold: number
}

const DEFAULT_CONFIG: SyncManagerConfig = {
  debounceInterval: 300,
  autoMarkComplete: true,
  replanThreshold: 3,
}

// ============================================
// 同步管理器类
// ============================================

export class SyncManager {
  private config: SyncManagerConfig
  private currentTodoList: TodoList | null = null
  private understanding: AIUnderstanding
  private conflictCount: number = 0
  private subscriptionId: string | null = null
  private updateTimer: ReturnType<typeof setTimeout> | null = null

  // 回调函数
  private onUnderstandingUpdate?: (understanding: AIUnderstanding) => void
  private onTodoComplete?: (todoItemId: string, event: GoiEvent) => void
  private onReplanNeeded?: (reason: string) => void

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.understanding = {
      summary: '等待用户操作...',
      selectedResources: [],
      confidence: 0,
      updatedAt: new Date(),
    }
  }

  /**
   * 启动同步管理器
   */
  async start(sessionId: string): Promise<void> {
    // 订阅用户操作事件
    this.subscriptionId = await eventBus.subscribe(
      sessionId,
      this.handleEvent.bind(this),
      [
        'RESOURCE_ACCESSED',
        'RESOURCE_CREATED',
        'RESOURCE_UPDATED',
        'RESOURCE_DELETED',
        'TASK_EXECUTED',
      ]
    )
  }

  /**
   * 停止同步管理器
   */
  async stop(): Promise<void> {
    if (this.subscriptionId) {
      await eventBus.unsubscribe(this.subscriptionId)
      this.subscriptionId = null
    }

    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * 设置当前 TODO List
   */
  setTodoList(todoList: TodoList | null): void {
    this.currentTodoList = todoList
    this.conflictCount = 0
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onUnderstandingUpdate?: (understanding: AIUnderstanding) => void
    onTodoComplete?: (todoItemId: string, event: GoiEvent) => void
    onReplanNeeded?: (reason: string) => void
  }): void {
    this.onUnderstandingUpdate = callbacks.onUnderstandingUpdate
    this.onTodoComplete = callbacks.onTodoComplete
    this.onReplanNeeded = callbacks.onReplanNeeded
  }

  /**
   * 处理事件
   */
  private handleEvent(event: GoiEvent): void {
    // 只处理用户操作
    if (event.source !== 'user') return

    // 更新理解状态
    this.updateUnderstanding(event)

    // 检查是否与当前 TODO 相关
    if (this.currentTodoList) {
      const currentTodo = this.getCurrentTodoItem()
      if (currentTodo && this.isRelatedTo(event, currentTodo)) {
        if (this.isCompleting(event, currentTodo)) {
          // 用户完成了 AI 的 TODO
          if (this.config.autoMarkComplete && this.onTodoComplete) {
            this.onTodoComplete(currentTodo.id, event)
          }
        }
      }

      // 检查是否需要重新规划
      if (this.conflictsWithPlan(event)) {
        this.conflictCount++
        if (
          this.conflictCount >= this.config.replanThreshold &&
          this.onReplanNeeded
        ) {
          this.onReplanNeeded('用户操作与当前计划冲突')
          this.conflictCount = 0
        }
      }
    }
  }

  /**
   * 更新 AI 理解状态
   */
  private updateUnderstanding(event: GoiEvent): void {
    // 使用防抖
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
    }

    this.updateTimer = setTimeout(() => {
      const newUnderstanding = this.buildUnderstanding(event)
      this.understanding = newUnderstanding

      if (this.onUnderstandingUpdate) {
        this.onUnderstandingUpdate(newUnderstanding)
      }
    }, this.config.debounceInterval)
  }

  /**
   * 构建理解状态
   */
  private buildUnderstanding(event: GoiEvent): AIUnderstanding {
    const payload = event.payload as Record<string, unknown>
    const resourceType = payload.resourceType as ResourceType | undefined
    const resourceId = payload.resourceId as string | undefined
    const resourceName = payload.resourceName as string | undefined

    // 更新已选择的资源
    const selectedResources = [...this.understanding.selectedResources]
    if (resourceType && resourceId) {
      const existingIndex = selectedResources.findIndex(
        (r) => r.type === resourceType && r.id === resourceId
      )
      if (existingIndex === -1) {
        selectedResources.push({
          id: resourceId,
          type: resourceType,
          name: resourceName || resourceId,
        })
        // 保持最多 5 个资源
        if (selectedResources.length > 5) {
          selectedResources.shift()
        }
      }
    }

    // 生成摘要
    const summary = this.generateSummary(event, selectedResources)

    return {
      summary,
      selectedResources,
      currentPage: this.getCurrentPage(event),
      currentPhase: this.getCurrentPhase(event),
      confidence: Math.min(this.understanding.confidence + 10, 100),
      updatedAt: new Date(),
    }
  }

  /**
   * 生成理解摘要
   */
  private generateSummary(
    event: GoiEvent,
    selectedResources: AIUnderstanding['selectedResources']
  ): string {
    const payload = event.payload as Record<string, unknown>
    const resourceType = payload.resourceType as string | undefined

    switch (event.type) {
      case 'RESOURCE_ACCESSED':
        return `用户正在查看${this.getResourceTypeName(resourceType)}...`
      case 'RESOURCE_CREATED':
        return `用户正在创建${this.getResourceTypeName(resourceType)}...`
      case 'RESOURCE_UPDATED':
        return `用户正在编辑${this.getResourceTypeName(resourceType)}...`
      case 'RESOURCE_DELETED':
        return `用户删除了${this.getResourceTypeName(resourceType)}`
      case 'TASK_EXECUTED':
        return '用户正在执行测试任务...'
      default:
        if (selectedResources.length > 0) {
          return `用户已选择 ${selectedResources.length} 个资源`
        }
        return '等待用户操作...'
    }
  }

  /**
   * 获取资源类型名称
   */
  private getResourceTypeName(type?: string): string {
    const names: Record<string, string> = {
      prompt: '提示词',
      prompt_version: '提示词版本',
      dataset: '数据集',
      model: '模型',
      evaluator: '评估器',
      task: '测试任务',
      task_result: '测试结果',
    }
    return type ? names[type] || type : '资源'
  }

  /**
   * 获取当前页面
   */
  private getCurrentPage(event: GoiEvent): string | undefined {
    // 根据事件推断当前页面
    const payload = event.payload as Record<string, unknown>
    const resourceType = payload.resourceType as string | undefined

    if (!resourceType) return undefined

    const pageMap: Record<string, string> = {
      prompt: '/prompts',
      dataset: '/datasets',
      model: '/models',
      evaluator: '/evaluators',
      task: '/tasks',
    }

    return pageMap[resourceType]
  }

  /**
   * 获取当前阶段
   */
  private getCurrentPhase(event: GoiEvent): string | undefined {
    switch (event.type) {
      case 'RESOURCE_ACCESSED':
        return '浏览'
      case 'RESOURCE_CREATED':
        return '创建'
      case 'RESOURCE_UPDATED':
        return '编辑'
      case 'TASK_EXECUTED':
        return '执行'
      default:
        return undefined
    }
  }

  /**
   * 获取当前 TODO Item
   */
  private getCurrentTodoItem(): TodoItem | null {
    if (!this.currentTodoList) return null
    const index = this.currentTodoList.currentItemIndex
    if (index < 0 || index >= this.currentTodoList.items.length) return null
    return this.currentTodoList.items[index]
  }

  /**
   * 判断事件是否与 TODO Item 相关
   */
  private isRelatedTo(event: GoiEvent, todoItem: TodoItem): boolean {
    const payload = event.payload as Record<string, unknown>
    const eventResourceType = payload.resourceType as string | undefined
    const eventResourceId = payload.resourceId as string | undefined

    const operation = todoItem.goiOperation
    if (operation.type === 'access' || operation.type === 'state') {
      const todoResourceType = operation.target.resourceType
      const todoResourceId = operation.target.resourceId

      // 资源类型匹配
      if (todoResourceType !== eventResourceType) return false

      // 如果 TODO 指定了资源 ID，需要匹配
      if (todoResourceId && todoResourceId !== eventResourceId) return false

      return true
    }

    return false
  }

  /**
   * 判断事件是否完成了 TODO Item
   */
  private isCompleting(event: GoiEvent, todoItem: TodoItem): boolean {
    const operation = todoItem.goiOperation

    if (operation.type === 'access') {
      // 访问操作：访问事件即为完成
      return event.type === 'RESOURCE_ACCESSED'
    }

    if (operation.type === 'state') {
      // 状态操作：对应的 CRUD 事件
      const actionMap: Record<string, GoiEventType> = {
        create: 'RESOURCE_CREATED',
        update: 'RESOURCE_UPDATED',
        delete: 'RESOURCE_DELETED',
      }
      return event.type === actionMap[operation.action]
    }

    return false
  }

  /**
   * 判断事件是否与计划冲突
   */
  private conflictsWithPlan(event: GoiEvent): boolean {
    if (!this.currentTodoList) return false

    // 如果用户操作的资源与计划中待执行的项目相关，可能需要重新规划
    const pendingItems = this.currentTodoList.items.filter(
      (item) => item.status === 'pending' || item.status === 'waiting'
    )

    const payload = event.payload as Record<string, unknown>
    const eventResourceType = payload.resourceType as string | undefined

    for (const item of pendingItems) {
      const op = item.goiOperation
      if (op.type === 'state' && op.action === 'create') {
        // 用户先创建了计划中要创建的资源
        if (op.target.resourceType === eventResourceType) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 获取当前理解状态
   */
  getUnderstanding(): AIUnderstanding {
    return this.understanding
  }
}

// ============================================
// 导出单例
// ============================================

let syncManagerInstance: SyncManager | null = null

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager()
  }
  return syncManagerInstance
}

export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.stop()
  }
  syncManagerInstance = null
}
