// 指标聚合器

import { prisma } from '../prisma'
import type { TrendDataPoint, TrendSummary, TimeRange, GroupBy } from '@platform/shared'

type MetricsQuery = {
  range: TimeRange
  start?: Date
  end?: Date
  groupBy?: GroupBy
  taskIds?: string[]
  promptIds?: string[]
  modelIds?: string[]
  userId: string
}

/**
 * 根据时间范围计算起止时间
 */
export function getTimeRangeDate(range: TimeRange, customStart?: Date, customEnd?: Date): {
  start: Date
  end: Date
} {
  const end = customEnd || new Date()
  let start: Date

  switch (range) {
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'custom':
      start = customStart || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    default:
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return { start, end }
}

/**
 * 获取趋势数据
 */
export async function getTrendData(query: MetricsQuery): Promise<{
  points: TrendDataPoint[]
  summary: TrendSummary
}> {
  const { start, end } = getTimeRangeDate(query.range, query.start, query.end)
  const groupBy = query.groupBy || (query.range === '24h' ? 'hour' : 'day')

  // 构建查询条件
  const where: Record<string, unknown> = {
    createdAt: { gte: start, lte: end },
    task: {
      createdById: query.userId,
    },
  }

  if (query.taskIds?.length) {
    where.taskId = { in: query.taskIds }
  }
  if (query.promptIds?.length) {
    where.promptId = { in: query.promptIds }
  }
  if (query.modelIds?.length) {
    where.modelId = { in: query.modelIds }
  }

  // 获取所有结果
  const results = await prisma.taskResult.findMany({
    where,
    select: {
      id: true,
      status: true,
      latencyMs: true,
      cost: true,
      createdAt: true,
      evaluations: {
        select: {
          passed: true,
        },
      },
    },
  })

  // 按时间分组
  const groups = new Map<string, typeof results>()

  for (const result of results) {
    const date = new Date(result.createdAt)
    let key: string

    if (groupBy === 'hour') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00:00Z`
    } else if (groupBy === 'week') {
      // 获取周一日期
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(date.setDate(diff))
      key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}T00:00:00Z`
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T00:00:00Z`
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(result)
  }

  // 计算每个时间点的指标
  const points: TrendDataPoint[] = []
  let totalPassRate = 0
  let totalLatency = 0
  let totalCost = 0
  let totalTasks = 0
  let totalErrors = 0

  const sortedKeys = Array.from(groups.keys()).sort()

  for (const timestamp of sortedKeys) {
    const groupResults = groups.get(timestamp)!
    const count = groupResults.length

    // 计算通过率（基于评估结果）
    let passedCount = 0
    let evaluatedCount = 0

    for (const r of groupResults) {
      if (r.evaluations.length > 0) {
        evaluatedCount++
        const allPassed = r.evaluations.every((e) => e.passed)
        if (allPassed) passedCount++
      }
    }

    const passRate = evaluatedCount > 0 ? passedCount / evaluatedCount : 0

    // 计算平均耗时
    const latencies = groupResults
      .filter((r) => r.latencyMs !== null)
      .map((r) => r.latencyMs!)
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0

    // 计算成本
    const costs = groupResults
      .filter((r) => r.cost !== null)
      .map((r) => Number(r.cost))
    const sumCost = costs.reduce((a, b) => a + b, 0)

    // 计算错误率
    const errorCount = groupResults.filter((r) => r.status === 'ERROR' || r.status === 'FAILED').length
    const errorRate = count > 0 ? errorCount / count : 0

    points.push({
      timestamp,
      passRate,
      avgLatency,
      totalCost: sumCost,
      taskCount: count,
      errorRate,
    })

    // 累计总数
    totalPassRate += passRate
    totalLatency += avgLatency
    totalCost += sumCost
    totalTasks += count
    totalErrors += errorCount
  }

  // 计算汇总
  const pointCount = points.length || 1
  const summary: TrendSummary = {
    avgPassRate: totalPassRate / pointCount,
    avgLatency: totalLatency / pointCount,
    totalCost,
    totalTasks,
    errorRate: totalTasks > 0 ? totalErrors / totalTasks : 0,
  }

  return { points, summary }
}

/**
 * 获取指定指标的当前值
 */
export async function getMetricValue(
  metric: 'pass_rate' | 'avg_latency' | 'error_rate' | 'cost',
  durationMinutes: number,
  scope?: {
    taskIds?: string[]
    promptIds?: string[]
    modelIds?: string[]
  },
  userId?: string
): Promise<number> {
  const since = new Date(Date.now() - durationMinutes * 60 * 1000)

  const where: Record<string, unknown> = {
    createdAt: { gte: since },
  }

  if (userId) {
    where.task = { createdById: userId }
  }
  if (scope?.taskIds?.length) {
    where.taskId = { in: scope.taskIds }
  }
  if (scope?.promptIds?.length) {
    where.promptId = { in: scope.promptIds }
  }
  if (scope?.modelIds?.length) {
    where.modelId = { in: scope.modelIds }
  }

  const results = await prisma.taskResult.findMany({
    where,
    select: {
      status: true,
      latencyMs: true,
      cost: true,
      evaluations: {
        select: {
          passed: true,
        },
      },
    },
  })

  if (results.length === 0) {
    return 0
  }

  switch (metric) {
    case 'pass_rate': {
      let passedCount = 0
      let evaluatedCount = 0

      for (const r of results) {
        if (r.evaluations.length > 0) {
          evaluatedCount++
          const allPassed = r.evaluations.every((e) => e.passed)
          if (allPassed) passedCount++
        }
      }

      return evaluatedCount > 0 ? passedCount / evaluatedCount : 0
    }

    case 'avg_latency': {
      const latencies = results
        .filter((r) => r.latencyMs !== null)
        .map((r) => r.latencyMs!)

      return latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0
    }

    case 'error_rate': {
      const errorCount = results.filter(
        (r) => r.status === 'ERROR' || r.status === 'FAILED'
      ).length

      return errorCount / results.length
    }

    case 'cost': {
      const costs = results
        .filter((r) => r.cost !== null)
        .map((r) => Number(r.cost))

      return costs.reduce((a, b) => a + b, 0)
    }

    default:
      return 0
  }
}
