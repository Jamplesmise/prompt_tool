import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// 字段统计项
type FieldStats = {
  fieldKey: string
  fieldName: string
  isCritical: boolean
  passRate: number
  avgScore: number
  passCount: number
  failCount: number
  skipCount: number
  totalCount: number
}

// 失败原因统计
type FailureReason = {
  reason: string
  count: number
}

// GET /api/v1/tasks/:id/stats/fields - 获取字段级统计
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: taskId } = await params

    // 验证任务存在且属于当前用户
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        createdById: session.id,
      },
      select: {
        id: true,
        prompts: {
          take: 1,
          select: {
            prompt: {
              select: {
                outputSchemaId: true,
                outputSchema: {
                  select: {
                    fields: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 获取 OutputSchema 字段配置
    const firstPrompt = task.prompts[0]?.prompt
    const outputSchema = firstPrompt?.outputSchema
    const fieldsConfig = outputSchema?.fields as Array<{
      key: string
      name: string
      evaluation?: {
        isCritical?: boolean
        weight?: number
      }
    }> || []

    const fieldConfigMap = new Map(fieldsConfig.map(f => [f.key, f]))

    // 获取所有任务结果的 ID
    const taskResultIds = await prisma.taskResult.findMany({
      where: {
        taskId,
        status: 'SUCCESS',  // 只统计成功的结果
      },
      select: { id: true },
    })

    const resultIds = taskResultIds.map(r => r.id)

    if (resultIds.length === 0) {
      return NextResponse.json(success({
        fields: [],
        failureReasons: {},
        summary: {
          totalResults: 0,
          totalFieldEvaluations: 0,
        },
      }))
    }

    // 获取所有字段评估结果
    const fieldEvaluations = await prisma.fieldEvaluationResult.findMany({
      where: {
        taskResultId: { in: resultIds },
      },
      select: {
        fieldKey: true,
        fieldName: true,
        passed: true,
        score: true,
        reason: true,
        skipped: true,
      },
    })

    // 按字段分组统计
    const statsMap = new Map<string, {
      fieldKey: string
      fieldName: string
      passCount: number
      failCount: number
      skipCount: number
      totalScore: number
      scoreCount: number
      failureReasons: Map<string, number>
    }>()

    for (const fe of fieldEvaluations) {
      let stats = statsMap.get(fe.fieldKey)

      if (!stats) {
        stats = {
          fieldKey: fe.fieldKey,
          fieldName: fe.fieldName,
          passCount: 0,
          failCount: 0,
          skipCount: 0,
          totalScore: 0,
          scoreCount: 0,
          failureReasons: new Map(),
        }
        statsMap.set(fe.fieldKey, stats)
      }

      if (fe.skipped) {
        stats.skipCount++
      } else if (fe.passed) {
        stats.passCount++
        if (fe.score !== null) {
          stats.totalScore += Number(fe.score)
          stats.scoreCount++
        }
      } else {
        stats.failCount++
        if (fe.score !== null) {
          stats.totalScore += Number(fe.score)
          stats.scoreCount++
        }
        // 统计失败原因
        if (fe.reason) {
          const currentCount = stats.failureReasons.get(fe.reason) || 0
          stats.failureReasons.set(fe.reason, currentCount + 1)
        }
      }
    }

    // 格式化字段统计结果
    const fields: FieldStats[] = Array.from(statsMap.values()).map(stats => {
      const config = fieldConfigMap.get(stats.fieldKey)
      const totalEvaluated = stats.passCount + stats.failCount
      const totalCount = totalEvaluated + stats.skipCount

      return {
        fieldKey: stats.fieldKey,
        fieldName: stats.fieldName,
        isCritical: config?.evaluation?.isCritical ?? false,
        passRate: totalEvaluated > 0 ? stats.passCount / totalEvaluated : 0,
        avgScore: stats.scoreCount > 0 ? stats.totalScore / stats.scoreCount : 0,
        passCount: stats.passCount,
        failCount: stats.failCount,
        skipCount: stats.skipCount,
        totalCount,
      }
    })

    // 按关键字段优先，然后按通过率排序
    fields.sort((a, b) => {
      if (a.isCritical !== b.isCritical) {
        return a.isCritical ? -1 : 1
      }
      return a.passRate - b.passRate  // 通过率低的排前面，便于发现问题
    })

    // 格式化失败原因统计
    const failureReasons: Record<string, FailureReason[]> = {}

    for (const [fieldKey, stats] of statsMap) {
      if (stats.failureReasons.size > 0) {
        const reasons: FailureReason[] = Array.from(stats.failureReasons.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)  // 按出现次数降序
          .slice(0, 10)  // 只取前 10 个

        failureReasons[fieldKey] = reasons
      }
    }

    return NextResponse.json(success({
      fields,
      failureReasons,
      summary: {
        totalResults: resultIds.length,
        totalFieldEvaluations: fieldEvaluations.length,
        totalFields: fields.length,
        criticalFields: fields.filter(f => f.isCritical).length,
        avgPassRate: fields.length > 0
          ? fields.reduce((sum, f) => sum + f.passRate, 0) / fields.length
          : 0,
      },
    }))
  } catch (err) {
    console.error('Get field stats error:', err)
    return NextResponse.json(internalError('获取字段统计失败'), { status: 500 })
  }
}
