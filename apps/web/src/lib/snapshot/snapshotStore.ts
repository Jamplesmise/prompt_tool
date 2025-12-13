/**
 * GOI Snapshot Store - 快照持久化存储
 *
 * 功能：
 * - 保存快照到 PostgreSQL
 * - 按条件查询快照
 * - 清理过期快照
 */

import { prisma } from '../prisma'
import type {
  GoiSnapshot,
  CreateSnapshotInput,
  SnapshotQueryOptions,
  SnapshotTrigger,
  SessionState,
  TodoState,
  ResourceState,
  ContextState,
} from '@platform/shared'
import type { Prisma } from '@prisma/client'

/**
 * GOI Snapshot Store 实现
 */
class GoiSnapshotStore {
  /**
   * 保存快照
   */
  async save(input: CreateSnapshotInput): Promise<GoiSnapshot> {
    const record = await prisma.goiSnapshot.create({
      data: {
        sessionId: input.sessionId,
        todoItemId: input.todoItemId,
        trigger: input.trigger,
        sessionState: input.sessionState as unknown as Prisma.JsonObject,
        todoState: input.todoState as unknown as Prisma.JsonObject | undefined,
        resourceState: input.resourceState as unknown as Prisma.JsonObject | undefined,
        contextState: input.contextState as unknown as Prisma.JsonObject | undefined,
      },
    })

    return this.toGoiSnapshot(record)
  }

  /**
   * 获取单个快照
   */
  async getById(id: string): Promise<GoiSnapshot | null> {
    const record = await prisma.goiSnapshot.findUnique({
      where: { id },
    })

    return record ? this.toGoiSnapshot(record) : null
  }

  /**
   * 按会话 ID 获取快照列表
   */
  async getBySessionId(
    sessionId: string,
    options: Omit<SnapshotQueryOptions, 'sessionId'> = {}
  ): Promise<GoiSnapshot[]> {
    return this.query({ ...options, sessionId })
  }

  /**
   * 查询快照
   */
  async query(options: SnapshotQueryOptions = {}): Promise<GoiSnapshot[]> {
    const { sessionId, trigger, from, to, limit = 100, offset = 0 } = options

    const where: Record<string, unknown> = {}

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (trigger) {
      where.trigger = trigger
    }

    if (from || to) {
      where.createdAt = {}
      if (from) {
        (where.createdAt as Record<string, Date>).gte = from
      }
      if (to) {
        (where.createdAt as Record<string, Date>).lte = to
      }
    }

    const records = await prisma.goiSnapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return records.map((record) => this.toGoiSnapshot(record))
  }

  /**
   * 获取最新快照
   */
  async getLatest(sessionId: string): Promise<GoiSnapshot | null> {
    const record = await prisma.goiSnapshot.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    return record ? this.toGoiSnapshot(record) : null
  }

  /**
   * 获取指定 TODO 项的快照
   */
  async getByTodoItemId(todoItemId: string): Promise<GoiSnapshot | null> {
    const record = await prisma.goiSnapshot.findFirst({
      where: { todoItemId },
      orderBy: { createdAt: 'desc' },
    })

    return record ? this.toGoiSnapshot(record) : null
  }

  /**
   * 获取快照数量
   */
  async count(sessionId?: string): Promise<number> {
    const where = sessionId ? { sessionId } : {}
    return prisma.goiSnapshot.count({ where })
  }

  /**
   * 删除快照
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.goiSnapshot.delete({
        where: { id },
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * 删除会话的所有快照
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await prisma.goiSnapshot.deleteMany({
      where: { sessionId },
    })
    return result.count
  }

  /**
   * 清理过期快照
   */
  async cleanup(olderThan: Date): Promise<number> {
    const result = await prisma.goiSnapshot.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    })
    return result.count
  }

  /**
   * 限制会话的快照数量（保留最新的 N 个）
   */
  async limitBySession(sessionId: string, maxCount: number): Promise<number> {
    // 获取需要删除的快照 ID
    const snapshots = await prisma.goiSnapshot.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      skip: maxCount,
      select: { id: true },
    })

    if (snapshots.length === 0) return 0

    const idsToDelete = snapshots.map((s) => s.id)
    const result = await prisma.goiSnapshot.deleteMany({
      where: { id: { in: idsToDelete } },
    })

    return result.count
  }

  /**
   * 转换数据库记录为 GoiSnapshot
   */
  private toGoiSnapshot(record: {
    id: string
    sessionId: string
    todoItemId: string | null
    trigger: string
    sessionState: Prisma.JsonValue
    todoState: Prisma.JsonValue | null
    resourceState: Prisma.JsonValue | null
    contextState: Prisma.JsonValue | null
    createdAt: Date
  }): GoiSnapshot {
    return {
      id: record.id,
      sessionId: record.sessionId,
      todoItemId: record.todoItemId || undefined,
      trigger: record.trigger as SnapshotTrigger,
      sessionState: record.sessionState as unknown as SessionState,
      todoState: record.todoState as unknown as TodoState | undefined,
      resourceState: record.resourceState as unknown as ResourceState | undefined,
      contextState: record.contextState as unknown as ContextState | undefined,
      createdAt: record.createdAt,
    }
  }
}

// 导出单例实例
export const snapshotStore = new GoiSnapshotStore()

// 导出类
export { GoiSnapshotStore }
