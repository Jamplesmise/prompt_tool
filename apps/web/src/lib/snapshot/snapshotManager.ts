/**
 * GOI Snapshot Manager - 快照创建和恢复管理
 *
 * 功能：
 * - 创建快照（收集各种状态）
 * - 恢复快照（回滚资源变更）
 * - 管理快照生命周期
 */

import { snapshotStore } from './snapshotStore'
import { prisma } from '../prisma'
import type {
  GoiSnapshot,
  SnapshotTrigger,
  SessionState,
  TodoState,
  ResourceState,
  ContextState,
  RestoreResult,
  CreatedResource,
  ModifiedResource,
  DeletedResource,
} from '@platform/shared'

/**
 * 快照管理器配置
 */
export type SnapshotManagerConfig = {
  /** 每个会话最大快照数 */
  maxSnapshotsPerSession: number
  /** 快照过期时间（毫秒） */
  snapshotTTL: number
  /** 是否自动清理 */
  autoCleanup: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SnapshotManagerConfig = {
  maxSnapshotsPerSession: 50,
  snapshotTTL: 7 * 24 * 60 * 60 * 1000, // 7 天
  autoCleanup: true,
}

/**
 * 会话状态收集器接口
 */
export type SessionStateCollector = () => Promise<SessionState>

/**
 * TODO 状态收集器接口
 */
export type TodoStateCollector = () => Promise<TodoState | undefined>

/**
 * 上下文状态收集器接口
 */
export type ContextStateCollector = () => Promise<ContextState | undefined>

/**
 * GOI Snapshot Manager 实现
 */
class GoiSnapshotManager {
  private config: SnapshotManagerConfig
  private resourceChanges: Map<string, ResourceState> = new Map()
  private sessionStateCollector?: SessionStateCollector
  private todoStateCollector?: TodoStateCollector
  private contextStateCollector?: ContextStateCollector

  constructor(config: Partial<SnapshotManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 设置会话状态收集器
   */
  setSessionStateCollector(collector: SessionStateCollector): void {
    this.sessionStateCollector = collector
  }

  /**
   * 设置 TODO 状态收集器
   */
  setTodoStateCollector(collector: TodoStateCollector): void {
    this.todoStateCollector = collector
  }

  /**
   * 设置上下文状态收集器
   */
  setContextStateCollector(collector: ContextStateCollector): void {
    this.contextStateCollector = collector
  }

  /**
   * 创建快照
   */
  async createSnapshot(
    sessionId: string,
    trigger: SnapshotTrigger,
    todoItemId?: string
  ): Promise<GoiSnapshot> {
    // 收集各种状态
    const [sessionState, todoState, contextState] = await Promise.all([
      this.collectSessionState(sessionId),
      this.collectTodoState(sessionId),
      this.collectContextState(sessionId),
    ])

    // 获取资源变更状态
    const resourceState = this.getResourceState(sessionId)

    // 保存快照
    const snapshot = await snapshotStore.save({
      sessionId,
      trigger,
      todoItemId,
      sessionState,
      todoState,
      resourceState,
      contextState,
    })

    // 自动清理旧快照
    if (this.config.autoCleanup) {
      await snapshotStore.limitBySession(sessionId, this.config.maxSnapshotsPerSession)
    }

    return snapshot
  }

  /**
   * 恢复到快照
   */
  async restoreSnapshot(snapshotId: string): Promise<RestoreResult> {
    const snapshot = await snapshotStore.getById(snapshotId)

    if (!snapshot) {
      return {
        success: false,
        snapshotId,
        restoredAt: new Date(),
        rolledBackResources: { created: 0, modified: 0, deleted: 0 },
        errors: [{ resourceType: 'task', resourceId: '', error: 'Snapshot not found' }],
      }
    }

    const errors: RestoreResult['errors'] = []
    let createdCount = 0
    let modifiedCount = 0
    let deletedCount = 0

    // 回滚资源变更
    if (snapshot.resourceState) {
      // 1. 撤销创建的资源（删除它们）
      for (const resource of snapshot.resourceState.createdResources) {
        try {
          await this.deleteResource(resource.type, resource.id)
          createdCount++
        } catch (error) {
          errors.push({
            resourceType: resource.type,
            resourceId: resource.id,
            error: `Failed to delete: ${error}`,
          })
        }
      }

      // 2. 恢复修改的资源
      for (const resource of snapshot.resourceState.modifiedResources) {
        try {
          await this.restoreResource(resource.type, resource.id, resource.beforeData)
          modifiedCount++
        } catch (error) {
          errors.push({
            resourceType: resource.type,
            resourceId: resource.id,
            error: `Failed to restore: ${error}`,
          })
        }
      }

      // 3. 恢复删除的资源（重新创建它们）
      for (const resource of snapshot.resourceState.deletedResources) {
        try {
          await this.recreateResource(resource.type, resource.id, resource.data)
          deletedCount++
        } catch (error) {
          errors.push({
            resourceType: resource.type,
            resourceId: resource.id,
            error: `Failed to recreate: ${error}`,
          })
        }
      }
    }

    // 清除该会话的资源变更记录
    this.clearResourceState(snapshot.sessionId)

    return {
      success: errors.length === 0,
      snapshotId,
      restoredAt: new Date(),
      rolledBackResources: {
        created: createdCount,
        modified: modifiedCount,
        deleted: deletedCount,
      },
      errors,
    }
  }

  /**
   * 收集会话状态
   */
  private async collectSessionState(sessionId: string): Promise<SessionState> {
    if (this.sessionStateCollector) {
      return this.sessionStateCollector()
    }

    // 默认空状态
    return {
      currentPage: '/',
      openDialogs: [],
      formStates: [],
      selectedItems: [],
      expandedItems: [],
      scrollPositions: [],
    }
  }

  /**
   * 收集 TODO 状态
   */
  private async collectTodoState(sessionId: string): Promise<TodoState | undefined> {
    if (this.todoStateCollector) {
      return this.todoStateCollector()
    }
    return undefined
  }

  /**
   * 收集上下文状态
   */
  private async collectContextState(sessionId: string): Promise<ContextState | undefined> {
    if (this.contextStateCollector) {
      return this.contextStateCollector()
    }
    return undefined
  }

  /**
   * 获取资源状态
   */
  private getResourceState(sessionId: string): ResourceState | undefined {
    return this.resourceChanges.get(sessionId)
  }

  /**
   * 清除资源状态
   */
  private clearResourceState(sessionId: string): void {
    this.resourceChanges.delete(sessionId)
  }

  // ============================================
  // 资源变更追踪
  // ============================================

  /**
   * 记录资源创建
   */
  recordResourceCreated(
    sessionId: string,
    resource: Omit<CreatedResource, 'createdAt'>
  ): void {
    const state = this.getOrCreateResourceState(sessionId)
    state.createdResources.push({
      ...resource,
      createdAt: new Date(),
    })
  }

  /**
   * 记录资源修改
   */
  recordResourceModified(
    sessionId: string,
    resource: Omit<ModifiedResource, 'modifiedAt'>
  ): void {
    const state = this.getOrCreateResourceState(sessionId)

    // 检查是否已有该资源的修改记录
    const existingIndex = state.modifiedResources.findIndex(
      (r) => r.type === resource.type && r.id === resource.id
    )

    if (existingIndex >= 0) {
      // 更新现有记录，保留原始 beforeData
      const existing = state.modifiedResources[existingIndex]
      state.modifiedResources[existingIndex] = {
        ...resource,
        beforeData: existing.beforeData, // 保留最初的数据
        modifiedAt: new Date(),
      }
    } else {
      state.modifiedResources.push({
        ...resource,
        modifiedAt: new Date(),
      })
    }
  }

  /**
   * 记录资源删除
   */
  recordResourceDeleted(
    sessionId: string,
    resource: Omit<DeletedResource, 'deletedAt'>
  ): void {
    const state = this.getOrCreateResourceState(sessionId)
    state.deletedResources.push({
      ...resource,
      deletedAt: new Date(),
    })
  }

  /**
   * 获取或创建资源状态
   */
  private getOrCreateResourceState(sessionId: string): ResourceState {
    let state = this.resourceChanges.get(sessionId)
    if (!state) {
      state = {
        createdResources: [],
        modifiedResources: [],
        deletedResources: [],
      }
      this.resourceChanges.set(sessionId, state)
    }
    return state
  }

  // ============================================
  // 资源操作（用于恢复）
  // ============================================

  /**
   * 删除资源（用于撤销创建）
   */
  private async deleteResource(type: string, id: string): Promise<void> {
    // 根据资源类型执行删除
    // 这里需要根据实际的资源类型来实现
    switch (type) {
      case 'prompt':
        await prisma.prompt.delete({ where: { id } })
        break
      case 'dataset':
        await prisma.dataset.delete({ where: { id } })
        break
      case 'evaluator':
        await prisma.evaluator.delete({ where: { id } })
        break
      case 'task':
        await prisma.task.delete({ where: { id } })
        break
      // 添加其他资源类型...
      default:
        console.warn(`[SnapshotManager] Unknown resource type: ${type}`)
    }
  }

  /**
   * 恢复资源（用于撤销修改）
   */
  private async restoreResource(
    type: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // 根据资源类型执行恢复
    switch (type) {
      case 'prompt':
        await prisma.prompt.update({ where: { id }, data: data as Prisma.PromptUpdateInput })
        break
      case 'dataset':
        await prisma.dataset.update({ where: { id }, data: data as Prisma.DatasetUpdateInput })
        break
      case 'evaluator':
        await prisma.evaluator.update({ where: { id }, data: data as Prisma.EvaluatorUpdateInput })
        break
      case 'task':
        await prisma.task.update({ where: { id }, data: data as Prisma.TaskUpdateInput })
        break
      // 添加其他资源类型...
      default:
        console.warn(`[SnapshotManager] Unknown resource type: ${type}`)
    }
  }

  /**
   * 重新创建资源（用于撤销删除）
   */
  private async recreateResource(
    type: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // 根据资源类型执行重新创建
    // 注意：这可能需要特殊处理，因为原始 ID 可能已被占用
    switch (type) {
      case 'prompt':
        await prisma.prompt.create({ data: { id, ...data } as Prisma.PromptCreateInput })
        break
      case 'dataset':
        await prisma.dataset.create({ data: { id, ...data } as Prisma.DatasetCreateInput })
        break
      case 'evaluator':
        await prisma.evaluator.create({ data: { id, ...data } as Prisma.EvaluatorCreateInput })
        break
      // 添加其他资源类型...
      default:
        console.warn(`[SnapshotManager] Unknown resource type: ${type}`)
    }
  }

  // ============================================
  // 清理
  // ============================================

  /**
   * 清理过期快照
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const expireDate = new Date(Date.now() - this.config.snapshotTTL)
    return snapshotStore.cleanup(expireDate)
  }
}

// 需要导入 Prisma 类型
import type { Prisma } from '@prisma/client'

// 导出单例实例
export const snapshotManager = new GoiSnapshotManager()

// 导出类
export { GoiSnapshotManager }
