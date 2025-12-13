/**
 * 回滚执行器
 *
 * 负责执行状态回滚：
 * - 找到回滚目标快照
 * - 撤销已创建的资源
 * - 恢复已修改的资源
 * - 恢复已删除的资源
 */

import type {
  RollbackTarget,
  RollbackResult,
  RollbackAction,
  RollbackError,
  ResourceState,
  GoiSnapshot,
  ResourceType,
  CreatedResource,
  ModifiedResource,
  DeletedResource,
} from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 资源操作函数类型
 */
export type ResourceOperations = {
  /** 删除资源 */
  delete: (type: ResourceType, id: string) => Promise<void>
  /** 更新资源 */
  update: (type: ResourceType, id: string, data: Record<string, unknown>) => Promise<void>
  /** 恢复软删除 */
  restore: (type: ResourceType, id: string) => Promise<void>
}

/**
 * 快照存储接口
 */
export type SnapshotStore = {
  getById: (id: string) => Promise<GoiSnapshot | null>
  getBySessionId: (sessionId: string, limit?: number) => Promise<GoiSnapshot[]>
  getBeforeTodoItem: (sessionId: string, todoItemId: string) => Promise<GoiSnapshot | null>
  getLastCheckpoint: (sessionId: string) => Promise<GoiSnapshot | null>
}

/**
 * 事件发布器
 */
export type EventPublisher = {
  publish: (event: { type: string; payload: unknown }) => Promise<void>
}

// ============================================
// 回滚执行器类
// ============================================

/**
 * 回滚执行器
 */
export class RollbackExecutor {
  /** 快照存储 */
  private snapshotStore: SnapshotStore
  /** 资源操作 */
  private resourceOps: ResourceOperations
  /** 事件发布器 */
  private eventPublisher?: EventPublisher

  constructor(options: {
    snapshotStore: SnapshotStore
    resourceOperations: ResourceOperations
    eventPublisher?: EventPublisher
  }) {
    this.snapshotStore = options.snapshotStore
    this.resourceOps = options.resourceOperations
    this.eventPublisher = options.eventPublisher
  }

  /**
   * 找到回滚目标
   */
  async findRollbackTarget(
    sessionId: string,
    todoItemId: string
  ): Promise<RollbackTarget | null> {
    // 1. 优先找到当前 TODO 项开始前的快照
    const beforeSnapshot = await this.snapshotStore.getBeforeTodoItem(sessionId, todoItemId)
    if (beforeSnapshot) {
      return {
        snapshotId: beforeSnapshot.id,
        snapshotCreatedAt: beforeSnapshot.createdAt,
        snapshotTrigger: beforeSnapshot.trigger,
        todoItemId: beforeSnapshot.todoItemId,
        description: `回滚到 TODO 项开始前 (${this.formatDate(beforeSnapshot.createdAt)})`,
      }
    }

    // 2. 找到上一个检查点
    const checkpoint = await this.snapshotStore.getLastCheckpoint(sessionId)
    if (checkpoint) {
      return {
        snapshotId: checkpoint.id,
        snapshotCreatedAt: checkpoint.createdAt,
        snapshotTrigger: checkpoint.trigger,
        todoItemId: checkpoint.todoItemId,
        description: `回滚到上一个检查点 (${this.formatDate(checkpoint.createdAt)})`,
      }
    }

    // 3. 找到最近的任意快照
    const recentSnapshots = await this.snapshotStore.getBySessionId(sessionId, 1)
    if (recentSnapshots.length > 0) {
      const snapshot = recentSnapshots[0]
      return {
        snapshotId: snapshot.id,
        snapshotCreatedAt: snapshot.createdAt,
        snapshotTrigger: snapshot.trigger,
        todoItemId: snapshot.todoItemId,
        description: `回滚到最近的快照 (${this.formatDate(snapshot.createdAt)})`,
      }
    }

    return null
  }

  /**
   * 执行回滚
   */
  async executeRollback(snapshotId: string): Promise<RollbackResult> {
    const startTime = Date.now()
    const rollbackActions: RollbackAction[] = []
    const errors: RollbackError[] = []

    // 1. 获取快照
    const snapshot = await this.snapshotStore.getById(snapshotId)
    if (!snapshot) {
      return {
        success: false,
        snapshotId,
        rollbackActions: [],
        restoredTo: new Date(),
        duration: Date.now() - startTime,
        errors: [
          {
            resourceType: 'task' as ResourceType,
            resourceId: snapshotId,
            errorType: 'not_found',
            message: '快照不存在',
          },
        ],
      }
    }

    // 2. 回滚资源变更
    if (snapshot.resourceState) {
      const resourceResult = await this.rollbackResources(snapshot.resourceState)
      rollbackActions.push(...resourceResult.actions)
      errors.push(...resourceResult.errors)
    }

    // 3. 发布回滚事件
    if (this.eventPublisher) {
      await this.eventPublisher.publish({
        type: 'ROLLBACK_EXECUTED',
        payload: {
          snapshotId,
          actionsCount: rollbackActions.length,
          errorsCount: errors.length,
          timestamp: new Date(),
        },
      })
    }

    const duration = Date.now() - startTime

    return {
      success: errors.length === 0,
      snapshotId,
      rollbackActions,
      restoredTo: snapshot.createdAt,
      duration,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * 回滚资源变更
   */
  async rollbackResources(
    resourceState: ResourceState
  ): Promise<{ actions: RollbackAction[]; errors: RollbackError[] }> {
    const actions: RollbackAction[] = []
    const errors: RollbackError[] = []

    // 1. 撤销创建（倒序，后创建的先删除）
    const createdResources = [...resourceState.createdResources].reverse()
    for (const resource of createdResources) {
      const result = await this.undoCreate(resource)
      actions.push(result.action)
      if (result.error) {
        errors.push(result.error)
      }
    }

    // 2. 恢复修改（倒序）
    const modifiedResources = [...resourceState.modifiedResources].reverse()
    for (const resource of modifiedResources) {
      const result = await this.restoreModify(resource)
      actions.push(result.action)
      if (result.error) {
        errors.push(result.error)
      }
    }

    // 3. 恢复删除
    for (const resource of resourceState.deletedResources) {
      const result = await this.restoreDelete(resource)
      actions.push(result.action)
      if (result.error) {
        errors.push(result.error)
      }
    }

    return { actions, errors }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 撤销创建操作
   */
  private async undoCreate(
    resource: CreatedResource
  ): Promise<{ action: RollbackAction; error?: RollbackError }> {
    const action: RollbackAction = {
      type: 'undo_create',
      resourceType: resource.type,
      resourceId: resource.id,
      description: `撤销创建: ${resource.name || resource.id}`,
      success: false,
    }

    try {
      await this.resourceOps.delete(resource.type, resource.id)
      action.success = true
      return { action }
    } catch (err) {
      const error = err as Error
      action.error = error.message
      return {
        action,
        error: {
          resourceType: resource.type,
          resourceId: resource.id,
          errorType: this.classifyResourceError(error),
          message: error.message,
        },
      }
    }
  }

  /**
   * 恢复修改操作
   */
  private async restoreModify(
    resource: ModifiedResource
  ): Promise<{ action: RollbackAction; error?: RollbackError }> {
    const action: RollbackAction = {
      type: 'restore_modify',
      resourceType: resource.type,
      resourceId: resource.id,
      description: `恢复修改: ${resource.name || resource.id}`,
      success: false,
    }

    try {
      await this.resourceOps.update(resource.type, resource.id, resource.beforeData)
      action.success = true
      return { action }
    } catch (err) {
      const error = err as Error
      action.error = error.message
      return {
        action,
        error: {
          resourceType: resource.type,
          resourceId: resource.id,
          errorType: this.classifyResourceError(error),
          message: error.message,
        },
      }
    }
  }

  /**
   * 恢复删除操作
   */
  private async restoreDelete(
    resource: DeletedResource
  ): Promise<{ action: RollbackAction; error?: RollbackError }> {
    const action: RollbackAction = {
      type: 'restore_delete',
      resourceType: resource.type,
      resourceId: resource.id,
      description: `恢复删除: ${resource.name || resource.id}`,
      success: false,
    }

    try {
      await this.resourceOps.restore(resource.type, resource.id)
      action.success = true
      return { action }
    } catch (err) {
      const error = err as Error
      action.error = error.message
      return {
        action,
        error: {
          resourceType: resource.type,
          resourceId: resource.id,
          errorType: this.classifyResourceError(error),
          message: error.message,
        },
      }
    }
  }

  /**
   * 分类资源操作错误
   */
  private classifyResourceError(
    error: Error
  ): 'not_found' | 'permission_denied' | 'conflict' | 'unknown' {
    const message = error.message.toLowerCase()

    if (message.includes('not found') || message.includes('does not exist')) {
      return 'not_found'
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'permission_denied'
    }
    if (message.includes('conflict') || message.includes('already exists')) {
      return 'conflict'
    }

    return 'unknown'
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建回滚执行器
 */
export function createRollbackExecutor(options: {
  snapshotStore: SnapshotStore
  resourceOperations: ResourceOperations
  eventPublisher?: EventPublisher
}): RollbackExecutor {
  return new RollbackExecutor(options)
}

// ============================================
// Mock 实现（用于测试）
// ============================================

/**
 * 创建 Mock 快照存储
 */
export function createMockSnapshotStore(): SnapshotStore {
  const snapshots = new Map<string, GoiSnapshot>()

  return {
    getById: async (id) => snapshots.get(id) || null,
    getBySessionId: async (sessionId, limit = 10) => {
      return Array.from(snapshots.values())
        .filter((s) => s.sessionId === sessionId)
        .slice(0, limit)
    },
    getBeforeTodoItem: async (sessionId, todoItemId) => {
      const sessionSnapshots = Array.from(snapshots.values())
        .filter((s) => s.sessionId === sessionId && s.trigger === 'todo_start')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return sessionSnapshots[0] || null
    },
    getLastCheckpoint: async (sessionId) => {
      const checkpoints = Array.from(snapshots.values())
        .filter((s) => s.sessionId === sessionId && s.trigger === 'checkpoint')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return checkpoints[0] || null
    },
  }
}

/**
 * 创建 Mock 资源操作
 */
export function createMockResourceOperations(): ResourceOperations {
  return {
    delete: async (type, id) => {
      console.log(`[Mock] Delete ${type}: ${id}`)
    },
    update: async (type, id, data) => {
      console.log(`[Mock] Update ${type}: ${id}`, data)
    },
    restore: async (type, id) => {
      console.log(`[Mock] Restore ${type}: ${id}`)
    },
  }
}
