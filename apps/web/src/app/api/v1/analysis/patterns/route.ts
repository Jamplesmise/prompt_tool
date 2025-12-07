import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { detectPatterns, clusterFailures, generateClusterSummary } from '@/lib/analysis'
import type { FailedResult } from '@/lib/analysis'

// 强制动态渲染
export const dynamic = 'force-dynamic'

// POST /api/v1/analysis/patterns - 分析任务的失败模式
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json(badRequest('taskId 是必填项'), { status: 400 })
    }

    // 验证任务存在且属于当前用户
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        createdById: session.id,
      },
      select: { id: true, status: true },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 获取失败的结果
    const failedResults = await prisma.taskResult.findMany({
      where: {
        taskId,
        OR: [
          { status: { in: ['FAILED', 'ERROR', 'TIMEOUT'] } },
          { evaluations: { some: { passed: false } } },
        ],
      },
      include: {
        datasetRow: {
          select: {
            data: true,
          },
        },
        evaluations: {
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      take: 500, // 限制最大分析数量
    })

    // 转换为分析所需的格式
    const analysisResults: FailedResult[] = failedResults.map(r => ({
      id: r.id,
      input: r.input as Record<string, unknown>,
      output: r.output,
      expected: r.expected,
      status: r.status,
      error: r.error,
      evaluations: r.evaluations.map(e => ({
        evaluatorId: e.evaluator.id,
        evaluatorName: e.evaluator.name,
        passed: e.passed,
        score: e.score ? Number(e.score) : null,
        reason: e.reason,
      })),
    }))

    // 执行分析
    const detectionResult = detectPatterns(analysisResults)

    // 执行聚类分析
    let clusterSummary = null
    if (analysisResults.length >= 2) {
      const clusters = clusterFailures(analysisResults, 0.7)
      clusterSummary = generateClusterSummary(clusters)
    }

    return NextResponse.json(
      success({
        taskId,
        totalFailed: detectionResult.totalFailed,
        patterns: detectionResult.patterns,
        dominantPattern: detectionResult.dominantPattern,
        clusters: clusterSummary,
      })
    )
  } catch (err) {
    console.error('Analyze patterns error:', err)
    return NextResponse.json(internalError('分析失败模式失败'), { status: 500 })
  }
}
