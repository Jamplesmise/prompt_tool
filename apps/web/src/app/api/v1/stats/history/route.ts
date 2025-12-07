/**
 * 历史统计 API
 * GET /api/v1/stats/history - 获取提示词/模型的历史统计数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type HistoryDataPoint = {
  date: string
  passRate: number
  taskCount: number
  avgLatency: number | null
  totalCost: number
}

/**
 * 计算标准差
 */
function calculateStdDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}

/**
 * 获取日期范围
 */
function getDateRange(period: '7d' | '30d'): Date {
  const now = new Date()
  const days = period === '7d' ? 7 : 30
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('promptId')
    const modelId = searchParams.get('modelId')
    const period = (searchParams.get('period') || '7d') as '7d' | '30d'

    // 至少需要 promptId 或 modelId
    if (!promptId && !modelId) {
      return NextResponse.json({
        code: 400001,
        message: '请提供 promptId 或 modelId',
        data: null,
      })
    }

    const startDate = getDateRange(period)

    // 构建查询条件
    const whereClause: Record<string, unknown> = {
      task: {
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
        },
      },
    }

    if (promptId) {
      whereClause.promptId = promptId
    }
    if (modelId) {
      whereClause.modelId = modelId
    }

    // 获取所有相关的任务结果
    const results = await prisma.taskResult.findMany({
      where: whereClause,
      include: {
        task: {
          select: {
            id: true,
            completedAt: true,
          },
        },
        evaluations: {
          select: {
            passed: true,
          },
        },
        model: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 按日期分组统计
    const dailyStats = new Map<string, {
      passed: number
      total: number
      latencies: number[]
      costs: number[]
      taskIds: Set<string>
    }>()

    for (const result of results) {
      const date = result.task.completedAt
        ? result.task.completedAt.toISOString().split('T')[0]
        : result.createdAt.toISOString().split('T')[0]

      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          passed: 0,
          total: 0,
          latencies: [],
          costs: [],
          taskIds: new Set(),
        })
      }

      const dayStats = dailyStats.get(date)!
      dayStats.total++
      dayStats.taskIds.add(result.task.id)

      // 检查是否通过（所有评估都通过）
      const allPassed = result.evaluations.length > 0 &&
        result.evaluations.every(e => e.passed)
      if (allPassed) {
        dayStats.passed++
      }

      if (result.latencyMs) {
        dayStats.latencies.push(result.latencyMs)
      }

      if (result.cost) {
        dayStats.costs.push(Number(result.cost))
      }
    }

    // 转换为数据点数组
    const dataPoints: HistoryDataPoint[] = []
    const passRates: number[] = []

    for (const [date, stats] of dailyStats) {
      const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
      passRates.push(passRate)

      dataPoints.push({
        date,
        passRate,
        taskCount: stats.taskIds.size,
        avgLatency: stats.latencies.length > 0
          ? Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length)
          : null,
        totalCost: stats.costs.reduce((a, b) => a + b, 0),
      })
    }

    // 排序数据点
    dataPoints.sort((a, b) => a.date.localeCompare(b.date))

    // 计算统计指标
    const avgPassRate = passRates.length > 0
      ? passRates.reduce((a, b) => a + b, 0) / passRates.length
      : 0
    const stdDeviation = calculateStdDeviation(passRates)
    const minPassRate = passRates.length > 0 ? Math.min(...passRates) : 0
    const maxPassRate = passRates.length > 0 ? Math.max(...passRates) : 0

    // 获取提示词和模型信息
    let promptName = ''
    let modelName = ''

    if (promptId) {
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: { name: true },
      })
      promptName = prompt?.name || ''
    }

    if (modelId) {
      const model = await prisma.model.findUnique({
        where: { id: modelId },
        select: { name: true },
      })
      modelName = model?.name || ''
    }

    // 统计总任务数
    const uniqueTaskIds = new Set<string>()
    for (const stats of dailyStats.values()) {
      for (const taskId of stats.taskIds) {
        uniqueTaskIds.add(taskId)
      }
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        promptId: promptId || '',
        promptName,
        modelId: modelId || '',
        modelName,
        period,
        avgPassRate: Math.round(avgPassRate * 100) / 100,
        stdDeviation: Math.round(stdDeviation * 100) / 100,
        minPassRate: Math.round(minPassRate * 100) / 100,
        maxPassRate: Math.round(maxPassRate * 100) / 100,
        totalTasks: uniqueTaskIds.size,
        totalExecutions: results.length,
        dataPoints,
      },
    })
  } catch (error) {
    console.error('Get history stats error:', error)
    return NextResponse.json({
      code: 500001,
      message: '获取历史统计失败',
      data: null,
    })
  }
}
