import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTimeRangeDate, getTrendData, getMetricValue } from '@/lib/metrics/aggregator'
import type { TimeRange } from '@platform/shared'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    taskResult: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('UT-8.4 指标聚合器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTimeRangeDate', () => {
    it('应该正确计算 24 小时范围', () => {
      const now = new Date('2024-01-15T12:00:00Z')
      const { start, end } = getTimeRangeDate('24h', undefined, now)

      expect(end.getTime()).toBe(now.getTime())
      expect(start.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000)
    })

    it('应该正确计算 7 天范围', () => {
      const now = new Date('2024-01-15T12:00:00Z')
      const { start, end } = getTimeRangeDate('7d', undefined, now)

      expect(end.getTime()).toBe(now.getTime())
      expect(start.getTime()).toBe(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    })

    it('应该正确计算 30 天范围', () => {
      const now = new Date('2024-01-15T12:00:00Z')
      const { start, end } = getTimeRangeDate('30d', undefined, now)

      expect(end.getTime()).toBe(now.getTime())
      expect(start.getTime()).toBe(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    })

    it('应该支持自定义范围', () => {
      const customStart = new Date('2024-01-01T00:00:00Z')
      const customEnd = new Date('2024-01-10T00:00:00Z')
      const { start, end } = getTimeRangeDate('custom', customStart, customEnd)

      expect(start.getTime()).toBe(customStart.getTime())
      expect(end.getTime()).toBe(customEnd.getTime())
    })

    it('自定义范围缺少开始时间时应使用默认 7 天', () => {
      const customEnd = new Date('2024-01-15T12:00:00Z')
      const { start, end } = getTimeRangeDate('custom', undefined, customEnd)

      expect(end.getTime()).toBe(customEnd.getTime())
      expect(start.getTime()).toBe(customEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
    })
  })

  describe('getTrendData', () => {
    const mockResults = [
      {
        id: '1',
        status: 'COMPLETED',
        latencyMs: 1000,
        cost: 0.01,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        evaluations: [{ passed: true }],
      },
      {
        id: '2',
        status: 'COMPLETED',
        latencyMs: 1500,
        cost: 0.02,
        createdAt: new Date('2024-01-15T11:00:00Z'),
        evaluations: [{ passed: true }],
      },
      {
        id: '3',
        status: 'FAILED',
        latencyMs: 500,
        cost: 0.005,
        createdAt: new Date('2024-01-15T12:00:00Z'),
        evaluations: [{ passed: false }],
      },
    ]

    it('应该按小时聚合 24h 范围的数据', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue(mockResults as never)

      const result = await getTrendData({
        range: '24h',
        userId: 'user-1',
      })

      expect(result.points).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.summary.totalTasks).toBe(3)
    })

    it('应该正确计算通过率', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue(mockResults as never)

      const result = await getTrendData({
        range: '24h',
        userId: 'user-1',
      })

      // 3 个结果中 2 个通过，汇总通过率
      expect(result.summary.avgPassRate).toBeDefined()
    })

    it('应该正确计算平均耗时', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue(mockResults as never)

      const result = await getTrendData({
        range: '24h',
        userId: 'user-1',
      })

      expect(result.summary.avgLatency).toBeDefined()
    })

    it('应该正确计算总成本', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue(mockResults as never)

      const result = await getTrendData({
        range: '24h',
        userId: 'user-1',
      })

      expect(result.summary.totalCost).toBe(0.01 + 0.02 + 0.005)
    })

    it('应该正确计算错误率', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue(mockResults as never)

      const result = await getTrendData({
        range: '24h',
        userId: 'user-1',
      })

      // 1 个 FAILED / 3 个总数
      expect(result.summary.errorRate).toBeCloseTo(1 / 3)
    })

    it('应该在没有数据时返回空结果', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([])

      const result = await getTrendData({
        range: '24h',
        userId: 'user-1',
      })

      expect(result.points).toHaveLength(0)
      expect(result.summary.totalTasks).toBe(0)
      expect(result.summary.avgPassRate).toBe(0)
    })

    it('应该支持按任务 ID 过滤', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue(mockResults as never)

      await getTrendData({
        range: '24h',
        userId: 'user-1',
        taskIds: ['task-1', 'task-2'],
      })

      expect(prisma.taskResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskId: { in: ['task-1', 'task-2'] },
          }),
        })
      )
    })
  })

  describe('getMetricValue', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('应该正确计算通过率', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [{ passed: true }] },
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [{ passed: true }] },
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [{ passed: false }] },
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [{ passed: true }] },
      ] as never)

      const passRate = await getMetricValue('pass_rate', 60)

      expect(passRate).toBe(0.75) // 3/4
    })

    it('应该正确计算平均耗时', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [] },
        { status: 'COMPLETED', latencyMs: 2000, cost: 0.01, evaluations: [] },
        { status: 'COMPLETED', latencyMs: 3000, cost: 0.01, evaluations: [] },
      ] as never)

      const avgLatency = await getMetricValue('avg_latency', 60)

      expect(avgLatency).toBe(2000) // (1000+2000+3000)/3
    })

    it('应该正确计算错误率', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [] },
        { status: 'ERROR', latencyMs: null, cost: null, evaluations: [] },
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [] },
        { status: 'FAILED', latencyMs: null, cost: null, evaluations: [] },
      ] as never)

      const errorRate = await getMetricValue('error_rate', 60)

      expect(errorRate).toBe(0.5) // 2/4
    })

    it('应该正确计算成本', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [] },
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.02, evaluations: [] },
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.03, evaluations: [] },
      ] as never)

      const cost = await getMetricValue('cost', 60)

      expect(cost).toBeCloseTo(0.06)
    })

    it('应该在没有数据时返回 0', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([])

      const passRate = await getMetricValue('pass_rate', 60)
      const avgLatency = await getMetricValue('avg_latency', 60)
      const errorRate = await getMetricValue('error_rate', 60)
      const cost = await getMetricValue('cost', 60)

      expect(passRate).toBe(0)
      expect(avgLatency).toBe(0)
      expect(errorRate).toBe(0)
      expect(cost).toBe(0)
    })

    it('应该支持按 scope 过滤', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([])

      await getMetricValue('pass_rate', 60, {
        taskIds: ['task-1'],
        promptIds: ['prompt-1'],
        modelIds: ['model-1'],
      })

      expect(prisma.taskResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskId: { in: ['task-1'] },
            promptId: { in: ['prompt-1'] },
            modelId: { in: ['model-1'] },
          }),
        })
      )
    })

    it('应该跳过 null 值的耗时计算', async () => {
      vi.mocked(prisma.taskResult.findMany).mockResolvedValue([
        { status: 'COMPLETED', latencyMs: 1000, cost: 0.01, evaluations: [] },
        { status: 'COMPLETED', latencyMs: null, cost: 0.01, evaluations: [] },
        { status: 'COMPLETED', latencyMs: 2000, cost: 0.01, evaluations: [] },
      ] as never)

      const avgLatency = await getMetricValue('avg_latency', 60)

      expect(avgLatency).toBe(1500) // (1000+2000)/2，忽略 null
    })
  })
})
