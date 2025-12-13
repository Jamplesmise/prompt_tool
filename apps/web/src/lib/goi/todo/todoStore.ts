/**
 * GOI TODO List 持久化存储
 *
 * 负责 TODO List 的数据库存储和检索
 */

import { prisma } from '../../prisma'
import type { Prisma } from '@prisma/client'
import type {
  TodoList,
  TodoItem,
  TodoListStatus,
  CreateTodoListInput,
} from '@platform/shared'
import { createTodoList, createTodoItem } from './todoList'

// ============================================
// 数据转换
// ============================================

/**
 * 将数据库记录转换为 TodoList
 */
function dbToTodoList(record: {
  id: string
  sessionId: string
  goal: string
  goalAnalysis: string | null
  status: string
  items: unknown
  currentIdx: number
  progress: number
  totalItems: number
  completed: number
  failed: number
  skipped: number
  metadata: unknown
  createdBy: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  version: number
}): TodoList {
  return {
    id: record.id,
    sessionId: record.sessionId,
    goal: record.goal,
    goalAnalysis: record.goalAnalysis ?? undefined,
    status: record.status as TodoListStatus,
    items: (record.items as TodoItem[]) || [],
    currentItemIndex: record.currentIdx,
    progress: record.progress,
    totalItems: record.totalItems,
    completedItems: record.completed,
    failedItems: record.failed,
    skippedItems: record.skipped,
    metadata: (record.metadata as Record<string, unknown>) ?? undefined,
    createdBy: record.createdBy ?? undefined,
    startedAt: record.startedAt ?? undefined,
    completedAt: record.completedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/**
 * 将 TodoList 转换为数据库记录
 */
function todoListToDb(todoList: TodoList): Prisma.GoiTodoListCreateInput {
  return {
    id: todoList.id,
    sessionId: todoList.sessionId,
    goal: todoList.goal,
    goalAnalysis: todoList.goalAnalysis,
    status: todoList.status,
    items: todoList.items as Prisma.InputJsonValue,
    currentIdx: todoList.currentItemIndex,
    progress: todoList.progress,
    totalItems: todoList.totalItems,
    completed: todoList.completedItems,
    failed: todoList.failedItems,
    skipped: todoList.skippedItems,
    metadata: todoList.metadata as Prisma.InputJsonValue,
    createdBy: todoList.createdBy,
    startedAt: todoList.startedAt,
    completedAt: todoList.completedAt,
  }
}

// ============================================
// TODO Store 类
// ============================================

/**
 * TODO List 存储
 */
export class TodoStore {
  /**
   * 保存 TODO List（创建或更新）
   */
  async save(todoList: TodoList): Promise<TodoList> {
    const data = todoListToDb(todoList)

    const record = await prisma.goiTodoList.upsert({
      where: { id: todoList.id },
      create: data,
      update: {
        sessionId: data.sessionId,
        goal: data.goal,
        goalAnalysis: data.goalAnalysis,
        status: data.status,
        items: data.items,
        currentIdx: data.currentIdx,
        progress: data.progress,
        totalItems: data.totalItems,
        completed: data.completed,
        failed: data.failed,
        skipped: data.skipped,
        metadata: data.metadata,
        createdBy: data.createdBy,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        version: { increment: 1 },
      },
    })

    return dbToTodoList(record)
  }

  /**
   * 保存并检查版本（乐观锁）
   */
  async saveWithVersion(todoList: TodoList, expectedVersion: number): Promise<TodoList | null> {
    const data = todoListToDb(todoList)

    try {
      const record = await prisma.goiTodoList.update({
        where: {
          id: todoList.id,
          version: expectedVersion,
        },
        data: {
          sessionId: data.sessionId,
          goal: data.goal,
          goalAnalysis: data.goalAnalysis,
          status: data.status,
          items: data.items,
          currentIdx: data.currentIdx,
          progress: data.progress,
          totalItems: data.totalItems,
          completed: data.completed,
          failed: data.failed,
          skipped: data.skipped,
          metadata: data.metadata,
          createdBy: data.createdBy,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          version: { increment: 1 },
        },
      })

      return dbToTodoList(record)
    } catch (error) {
      // 版本不匹配，返回 null
      if ((error as { code?: string }).code === 'P2025') {
        return null
      }
      throw error
    }
  }

  /**
   * 根据 ID 获取 TODO List
   */
  async getById(id: string): Promise<TodoList | null> {
    const record = await prisma.goiTodoList.findUnique({
      where: { id },
    })

    if (!record) return null
    return dbToTodoList(record)
  }

  /**
   * 根据会话 ID 获取 TODO List 列表
   */
  async getBySessionId(sessionId: string): Promise<TodoList[]> {
    const records = await prisma.goiTodoList.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    return records.map(dbToTodoList)
  }

  /**
   * 获取会话的最新 TODO List
   */
  async getLatestBySessionId(sessionId: string): Promise<TodoList | null> {
    const record = await prisma.goiTodoList.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) return null
    return dbToTodoList(record)
  }

  /**
   * 获取活跃的 TODO List（非终态）
   */
  async getActiveBySessionId(sessionId: string): Promise<TodoList | null> {
    const record = await prisma.goiTodoList.findFirst({
      where: {
        sessionId,
        status: { in: ['planning', 'ready', 'running', 'paused'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) return null
    return dbToTodoList(record)
  }

  /**
   * 查询 TODO List
   */
  async query(options: {
    sessionId?: string
    status?: TodoListStatus | TodoListStatus[]
    createdBy?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  }): Promise<{ items: TodoList[]; total: number }> {
    const where: Prisma.GoiTodoListWhereInput = {}

    if (options.sessionId) {
      where.sessionId = options.sessionId
    }
    if (options.status) {
      where.status = Array.isArray(options.status) ? { in: options.status } : options.status
    }
    if (options.createdBy) {
      where.createdBy = options.createdBy
    }
    if (options.from || options.to) {
      where.createdAt = {}
      if (options.from) {
        where.createdAt.gte = options.from
      }
      if (options.to) {
        where.createdAt.lte = options.to
      }
    }

    const [records, total] = await Promise.all([
      prisma.goiTodoList.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 20,
        skip: options.offset ?? 0,
      }),
      prisma.goiTodoList.count({ where }),
    ])

    return {
      items: records.map(dbToTodoList),
      total,
    }
  }

  /**
   * 删除 TODO List
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.goiTodoList.delete({ where: { id } })
      return true
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        return false
      }
      throw error
    }
  }

  /**
   * 删除会话的所有 TODO List
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await prisma.goiTodoList.deleteMany({
      where: { sessionId },
    })
    return result.count
  }

  /**
   * 更新 TODO Item
   */
  async updateItem(
    listId: string,
    itemId: string,
    updates: Partial<TodoItem>
  ): Promise<TodoList | null> {
    const todoList = await this.getById(listId)
    if (!todoList) return null

    const itemIndex = todoList.items.findIndex((item) => item.id === itemId)
    if (itemIndex === -1) return null

    // 更新 item
    todoList.items[itemIndex] = {
      ...todoList.items[itemIndex],
      ...updates,
      updatedAt: new Date(),
    }

    // 重新计算统计
    todoList.totalItems = todoList.items.length
    todoList.completedItems = todoList.items.filter((i) => i.status === 'completed').length
    todoList.failedItems = todoList.items.filter((i) => i.status === 'failed').length
    todoList.skippedItems = todoList.items.filter((i) => i.status === 'skipped').length
    todoList.progress = this.calculateProgress(todoList.items)
    todoList.updatedAt = new Date()

    return this.save(todoList)
  }

  /**
   * 计算进度
   */
  private calculateProgress(items: TodoItem[]): number {
    if (items.length === 0) return 0
    const terminalStatuses = ['completed', 'skipped', 'replanned']
    const terminalItems = items.filter((item) => terminalStatuses.includes(item.status))
    return Math.round((terminalItems.length / items.length) * 100)
  }

  /**
   * 创建并保存 TODO List
   */
  async create(input: CreateTodoListInput): Promise<TodoList> {
    const todoList = createTodoList(input)
    return this.save(todoList)
  }

  /**
   * 清理过期的 TODO List
   */
  async cleanup(olderThan: Date): Promise<number> {
    const result = await prisma.goiTodoList.deleteMany({
      where: {
        createdAt: { lt: olderThan },
        status: { in: ['completed', 'failed', 'cancelled'] },
      },
    })
    return result.count
  }
}

// ============================================
// 单例实例
// ============================================

/**
 * TODO Store 单例
 */
export const todoStore = new TodoStore()
