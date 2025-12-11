import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, notFound, internalError } from '@/lib/api'

export const dynamic = 'force-dynamic'

// 字段统计
type FieldStats = {
  fieldKey: string
  fieldName: string
  isCritical: boolean
  passRate: number
  avgScore: number
  passCount: number
  failCount: number
  totalCount: number
}

// 字段对比结果
type FieldComparison = {
  fieldKey: string
  fieldName: string
  isCritical: boolean
  basePassRate: number
  comparePassRate: number
  change: number
  isRegression: boolean
  baseAvgScore: number
  compareAvgScore: number
  scoreChange: number
}

// 获取任务字段统计
async function getTaskFieldStats(taskId: string): Promise<FieldStats[]> {
  // 获取任务和 OutputSchema 配置
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      prompts: {
        take: 1,
        select: {
          prompt: {
            select: {
              outputSchema: {
                select: { fields: true },
              },
            },
          },
        },
      },
    },
  })

  const fieldsConfig = task?.prompts[0]?.prompt?.outputSchema?.fields as Array<{
    key: string
    name: string
    evaluation?: { isCritical?: boolean }
  }> || []

  const fieldConfigMap = new Map(fieldsConfig.map(f => [f.key, f]))

  // 获取成功的任务结果 ID
  const taskResultIds = await prisma.taskResult.findMany({
    where: {
      taskId,
      status: 'SUCCESS',
    },
    select: { id: true },
  })

  const resultIds = taskResultIds.map(r => r.id)

  if (resultIds.length === 0) {
    return []
  }

  // 获取字段评估结果
  const fieldEvaluations = await prisma.fieldEvaluationResult.findMany({
    where: {
      taskResultId: { in: resultIds },
      skipped: false,
    },
    select: {
      fieldKey: true,
      fieldName: true,
      passed: true,
      score: true,
    },
  })

  // 按字段分组统计
  const statsMap = new Map<string, {
    fieldKey: string
    fieldName: string
    passCount: number
    failCount: number
    totalScore: number
    scoreCount: number
  }>()

  for (const fe of fieldEvaluations) {
    let stats = statsMap.get(fe.fieldKey)
    if (!stats) {
      stats = {
        fieldKey: fe.fieldKey,
        fieldName: fe.fieldName,
        passCount: 0,
        failCount: 0,
        totalScore: 0,
        scoreCount: 0,
      }
      statsMap.set(fe.fieldKey, stats)
    }

    if (fe.passed) {
      stats.passCount++
    } else {
      stats.failCount++
    }
    if (fe.score !== null) {
      stats.totalScore += Number(fe.score)
      stats.scoreCount++
    }
  }

  // 格式化结果
  return Array.from(statsMap.values()).map(stats => {
    const config = fieldConfigMap.get(stats.fieldKey)
    const totalCount = stats.passCount + stats.failCount

    return {
      fieldKey: stats.fieldKey,
      fieldName: stats.fieldName,
      isCritical: config?.evaluation?.isCritical ?? false,
      passRate: totalCount > 0 ? stats.passCount / totalCount : 0,
      avgScore: stats.scoreCount > 0 ? stats.totalScore / stats.scoreCount : 0,
      passCount: stats.passCount,
      failCount: stats.failCount,
      totalCount,
    }
  })
}

// POST /api/v1/tasks/compare - 对比两个任务
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { baseTaskId, compareTaskId, threshold = 0.05 } = body

    if (!baseTaskId || !compareTaskId) {
      return NextResponse.json(
        badRequest('请提供 baseTaskId 和 compareTaskId'),
        { status: 400 }
      )
    }

    if (baseTaskId === compareTaskId) {
      return NextResponse.json(
        badRequest('不能与自身对比'),
        { status: 400 }
      )
    }

    // 验证两个任务存在且属于当前用户
    const [baseTask, compareTask] = await Promise.all([
      prisma.task.findFirst({
        where: { id: baseTaskId, createdById: session.id },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          prompts: {
            take: 1,
            select: {
              prompt: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.task.findFirst({
        where: { id: compareTaskId, createdById: session.id },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          prompts: {
            take: 1,
            select: {
              prompt: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ])

    if (!baseTask) {
      return NextResponse.json(notFound('基准任务不存在'), { status: 404 })
    }
    if (!compareTask) {
      return NextResponse.json(notFound('对比任务不存在'), { status: 404 })
    }

    // 获取两个任务的字段统计
    const [baseStats, compareStats] = await Promise.all([
      getTaskFieldStats(baseTaskId),
      getTaskFieldStats(compareTaskId),
    ])

    // 构建基准统计映射
    const baseStatsMap = new Map(baseStats.map(s => [s.fieldKey, s]))

    // 计算字段对比
    const fieldComparison: FieldComparison[] = []
    const regressions: FieldComparison[] = []

    // 以对比任务的字段为基准进行对比
    for (const compareStat of compareStats) {
      const baseStat = baseStatsMap.get(compareStat.fieldKey)

      const basePassRate = baseStat?.passRate ?? 0
      const change = compareStat.passRate - basePassRate
      const baseAvgScore = baseStat?.avgScore ?? 0
      const scoreChange = compareStat.avgScore - baseAvgScore

      // 判断是否回归
      // 关键字段阈值较低（5%），普通字段阈值较高（threshold 参数）
      const regressionThreshold = compareStat.isCritical ? 0.05 : threshold
      const isRegression = change < -regressionThreshold && baseStat !== undefined

      const comparison: FieldComparison = {
        fieldKey: compareStat.fieldKey,
        fieldName: compareStat.fieldName,
        isCritical: compareStat.isCritical,
        basePassRate,
        comparePassRate: compareStat.passRate,
        change,
        isRegression,
        baseAvgScore,
        compareAvgScore: compareStat.avgScore,
        scoreChange,
      }

      fieldComparison.push(comparison)

      if (isRegression) {
        regressions.push(comparison)
      }
    }

    // 按回归程度排序（变化最大的在前）
    fieldComparison.sort((a, b) => a.change - b.change)
    regressions.sort((a, b) => a.change - b.change)

    // 计算总体统计
    const baseOverallPassRate = baseStats.length > 0
      ? baseStats.reduce((sum, s) => sum + s.passRate * s.totalCount, 0) /
        baseStats.reduce((sum, s) => sum + s.totalCount, 0)
      : 0

    const compareOverallPassRate = compareStats.length > 0
      ? compareStats.reduce((sum, s) => sum + s.passRate * s.totalCount, 0) /
        compareStats.reduce((sum, s) => sum + s.totalCount, 0)
      : 0

    return NextResponse.json(success({
      baseTask: {
        id: baseTask.id,
        name: baseTask.name,
        status: baseTask.status,
        createdAt: baseTask.createdAt,
        promptName: baseTask.prompts[0]?.prompt?.name,
      },
      compareTask: {
        id: compareTask.id,
        name: compareTask.name,
        status: compareTask.status,
        createdAt: compareTask.createdAt,
        promptName: compareTask.prompts[0]?.prompt?.name,
      },
      summary: {
        basePassRate: baseOverallPassRate,
        comparePassRate: compareOverallPassRate,
        change: compareOverallPassRate - baseOverallPassRate,
        totalFields: fieldComparison.length,
        regressionCount: regressions.length,
        hasRegression: regressions.length > 0,
      },
      fieldComparison,
      regressions,
    }))
  } catch (err) {
    console.error('Task compare error:', err)
    return NextResponse.json(internalError('任务对比失败'), { status: 500 })
  }
}
