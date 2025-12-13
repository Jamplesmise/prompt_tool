/**
 * GOI Event Store - 事件持久化存储
 *
 * 功能：
 * - 保存事件到 PostgreSQL
 * - 批量写入优化
 * - 按条件查询事件
 * - 清理过期事件
 */

import { prisma } from '../prisma'
import type { GoiEvent, GoiEventType, EventCategory, EventSource } from '@platform/shared'
import type { Prisma } from '@prisma/client'

/**
 * 事件存储查询选项
 */
export type EventQueryOptions = {
  sessionId?: string
  types?: GoiEventType[]
  categories?: EventCategory[]
  sources?: EventSource[]
  from?: Date
  to?: Date
  limit?: number
  offset?: number
  orderBy?: 'asc' | 'desc'
}

/**
 * 事件统计结果
 */
export type EventStats = {
  total: number
  byCategory: Record<EventCategory, number>
  bySource: Record<EventSource, number>
  byType: Record<string, number>
}

/**
 * GOI Event Store 实现
 */
class GoiEventStore {
  /**
   * 保存单个事件
   */
  async save(event: GoiEvent): Promise<void> {
    await prisma.goiEvent.create({
      data: {
        id: event.id,
        sessionId: event.sessionId,
        type: event.type,
        category: event.category,
        source: event.source,
        payload: event.payload as object,
        metadata: event.metadata as object | undefined,
        createdAt: event.timestamp,
      },
    })
  }

  /**
   * 批量保存事件
   */
  async saveBatch(events: GoiEvent[]): Promise<number> {
    if (events.length === 0) return 0

    const result = await prisma.goiEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        sessionId: event.sessionId,
        type: event.type,
        category: event.category,
        source: event.source,
        payload: event.payload as object,
        metadata: event.metadata as object | undefined,
        createdAt: event.timestamp,
      })),
      skipDuplicates: true,
    })

    return result.count
  }

  /**
   * 查询事件
   */
  async query(options: EventQueryOptions = {}): Promise<GoiEvent[]> {
    const {
      sessionId,
      types,
      categories,
      sources,
      from,
      to,
      limit = 100,
      offset = 0,
      orderBy = 'desc',
    } = options

    const where: Record<string, unknown> = {}

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (types && types.length > 0) {
      where.type = { in: types }
    }

    if (categories && categories.length > 0) {
      where.category = { in: categories }
    }

    if (sources && sources.length > 0) {
      where.source = { in: sources }
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

    const events = await prisma.goiEvent.findMany({
      where,
      orderBy: { createdAt: orderBy },
      take: limit,
      skip: offset,
    })

    return events.map((event) => this.toGoiEvent(event))
  }

  /**
   * 按会话 ID 获取事件
   */
  async getBySessionId(
    sessionId: string,
    options: Omit<EventQueryOptions, 'sessionId'> = {}
  ): Promise<GoiEvent[]> {
    return this.query({ ...options, sessionId })
  }

  /**
   * 获取事件数量
   */
  async count(options: Omit<EventQueryOptions, 'limit' | 'offset' | 'orderBy'> = {}): Promise<number> {
    const { sessionId, types, categories, sources, from, to } = options

    const where: Record<string, unknown> = {}

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (types && types.length > 0) {
      where.type = { in: types }
    }

    if (categories && categories.length > 0) {
      where.category = { in: categories }
    }

    if (sources && sources.length > 0) {
      where.source = { in: sources }
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

    return prisma.goiEvent.count({ where })
  }

  /**
   * 获取事件统计
   */
  async getStats(sessionId?: string): Promise<EventStats> {
    const where = sessionId ? { sessionId } : {}

    const [total, categoryStats, sourceStats, typeStats] = await Promise.all([
      prisma.goiEvent.count({ where }),
      prisma.goiEvent.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.goiEvent.groupBy({
        by: ['source'],
        where,
        _count: true,
      }),
      prisma.goiEvent.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ])

    const byCategory: Record<string, number> = {}
    categoryStats.forEach((stat: { category: string; _count: number }) => {
      byCategory[stat.category] = stat._count
    })

    const bySource: Record<string, number> = {}
    sourceStats.forEach((stat: { source: string; _count: number }) => {
      bySource[stat.source] = stat._count
    })

    const byType: Record<string, number> = {}
    typeStats.forEach((stat: { type: string; _count: number }) => {
      byType[stat.type] = stat._count
    })

    return {
      total,
      byCategory: byCategory as Record<EventCategory, number>,
      bySource: bySource as Record<EventSource, number>,
      byType,
    }
  }

  /**
   * 获取单个事件
   */
  async getById(id: string): Promise<GoiEvent | null> {
    const event = await prisma.goiEvent.findUnique({
      where: { id },
    })

    return event ? this.toGoiEvent(event) : null
  }

  /**
   * 删除会话的所有事件
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await prisma.goiEvent.deleteMany({
      where: { sessionId },
    })

    return result.count
  }

  /**
   * 清理过期事件
   */
  async cleanup(olderThan: Date): Promise<number> {
    const result = await prisma.goiEvent.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    })

    return result.count
  }

  /**
   * 获取最新事件
   */
  async getLatest(sessionId: string, count: number = 10): Promise<GoiEvent[]> {
    const events = await prisma.goiEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: count,
    })

    return events.map((event) => this.toGoiEvent(event))
  }

  /**
   * 检查事件是否存在
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.goiEvent.count({
      where: { id },
    })

    return count > 0
  }

  /**
   * 转换数据库记录为 GoiEvent
   */
  private toGoiEvent(record: {
    id: string
    sessionId: string
    type: string
    category: string
    source: string
    payload: Prisma.JsonValue
    metadata: Prisma.JsonValue | null
    createdAt: Date
  }): GoiEvent {
    return {
      id: record.id,
      sessionId: record.sessionId,
      type: record.type as GoiEventType,
      category: record.category as EventCategory,
      source: record.source as EventSource,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: record.payload as any,
      timestamp: record.createdAt,
      metadata: record.metadata as GoiEvent['metadata'],
    }
  }
}

// 导出单例实例
export const eventStore = new GoiEventStore()

// 导出类
export { GoiEventStore }
