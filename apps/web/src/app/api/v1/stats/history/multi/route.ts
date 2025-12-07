/**
 * 多维度历史统计 API
 * GET /api/v1/stats/history/multi - 获取按提示词/模型分组的历史统计
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
 * 计算趋势方向
 */
function calculateTrend(dataPoints: number[]): 'up' | 'down' | 'stable' {
  if (dataPoints.length < 2) return 'stable'

  // 使用最后3个点（或所有点）计算趋势
  const recentPoints = dataPoints.slice(-3)
  const firstHalf = recentPoints.slice(0, Math.ceil(recentPoints.length / 2))
  const secondHalf = recentPoints.slice(Math.floor(recentPoints.length / 2))

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const diff = secondAvg - firstAvg
  const threshold = 5 // 5% 的变化阈值

  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'stable'
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
    const period = (searchParams.get('period') || '7d') as '7d' | '30d'
    const teamId = searchParams.get('teamId')

    const startDate = getDateRange(period)

    // 构建任务查询条件
    const taskWhereClause: Record<string, unknown> = {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
      },
    }

    if (teamId) {
      taskWhereClause.teamId = teamId
    }

    // 获取所有相关的任务结果
    const results = await prisma.taskResult.findMany({
      where: {
        task: taskWhereClause,
      },
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
        promptVersion: {
          select: {
            prompt: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 按提示词分组统计
    const promptStats = new Map<string, {
      name: string
      dailyRates: Map<string, { passed: number; total: number }>
      taskIds: Set<string>
    }>()

    // 按模型分组统计
    const modelStats = new Map<string, {
      name: string
      dailyRates: Map<string, { passed: number; total: number }>
      taskIds: Set<string>
    }>()

    // 总体统计
    const overallDailyRates = new Map<string, { passed: number; total: number }>()
    const overallTaskIds = new Set<string>()

    for (const result of results) {
      const date = result.task.completedAt
        ? result.task.completedAt.toISOString().split('T')[0]
        : result.createdAt.toISOString().split('T')[0]

      const promptId = result.promptVersion.prompt.id
      const promptName = result.promptVersion.prompt.name
      const modelId = result.model.id
      const modelName = result.model.name

      // 检查是否通过
      const passed = result.evaluations.length > 0 &&
        result.evaluations.every(e => e.passed)

      // 更新提示词统计
      if (!promptStats.has(promptId)) {
        promptStats.set(promptId, {
          name: promptName,
          dailyRates: new Map(),
          taskIds: new Set(),
        })
      }
      const pStats = promptStats.get(promptId)!
      pStats.taskIds.add(result.task.id)
      if (!pStats.dailyRates.has(date)) {
        pStats.dailyRates.set(date, { passed: 0, total: 0 })
      }
      const pDay = pStats.dailyRates.get(date)!
      pDay.total++
      if (passed) pDay.passed++

      // 更新模型统计
      if (!modelStats.has(modelId)) {
        modelStats.set(modelId, {
          name: modelName,
          dailyRates: new Map(),
          taskIds: new Set(),
        })
      }
      const mStats = modelStats.get(modelId)!
      mStats.taskIds.add(result.task.id)
      if (!mStats.dailyRates.has(date)) {
        mStats.dailyRates.set(date, { passed: 0, total: 0 })
      }
      const mDay = mStats.dailyRates.get(date)!
      mDay.total++
      if (passed) mDay.passed++

      // 更新总体统计
      overallTaskIds.add(result.task.id)
      if (!overallDailyRates.has(date)) {
        overallDailyRates.set(date, { passed: 0, total: 0 })
      }
      const oDay = overallDailyRates.get(date)!
      oDay.total++
      if (passed) oDay.passed++
    }

    // 计算提示词维度结果
    const byPrompt = Array.from(promptStats.entries()).map(([promptId, stats]) => {
      const dailyRates: number[] = []
      for (const day of stats.dailyRates.values()) {
        dailyRates.push(day.total > 0 ? (day.passed / day.total) * 100 : 0)
      }

      const avgPassRate = dailyRates.length > 0
        ? dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length
        : 0

      return {
        promptId,
        promptName: stats.name,
        avgPassRate: Math.round(avgPassRate * 100) / 100,
        stdDeviation: Math.round(calculateStdDeviation(dailyRates) * 100) / 100,
        taskCount: stats.taskIds.size,
        trend: calculateTrend(dailyRates),
      }
    }).sort((a, b) => b.taskCount - a.taskCount)

    // 计算模型维度结果
    const byModel = Array.from(modelStats.entries()).map(([modelId, stats]) => {
      const dailyRates: number[] = []
      for (const day of stats.dailyRates.values()) {
        dailyRates.push(day.total > 0 ? (day.passed / day.total) * 100 : 0)
      }

      const avgPassRate = dailyRates.length > 0
        ? dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length
        : 0

      return {
        modelId,
        modelName: stats.name,
        avgPassRate: Math.round(avgPassRate * 100) / 100,
        stdDeviation: Math.round(calculateStdDeviation(dailyRates) * 100) / 100,
        taskCount: stats.taskIds.size,
        trend: calculateTrend(dailyRates),
      }
    }).sort((a, b) => b.taskCount - a.taskCount)

    // 计算总体统计
    const overallRates: number[] = []
    for (const day of overallDailyRates.values()) {
      overallRates.push(day.total > 0 ? (day.passed / day.total) * 100 : 0)
    }

    const overallAvgPassRate = overallRates.length > 0
      ? overallRates.reduce((a, b) => a + b, 0) / overallRates.length
      : 0

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        byPrompt,
        byModel,
        overall: {
          avgPassRate: Math.round(overallAvgPassRate * 100) / 100,
          stdDeviation: Math.round(calculateStdDeviation(overallRates) * 100) / 100,
          totalTasks: overallTaskIds.size,
        },
      },
    })
  } catch (error) {
    console.error('Get multi-dimension stats error:', error)
    return NextResponse.json({
      code: 500001,
      message: '获取多维度统计失败',
      data: null,
    })
  }
}
