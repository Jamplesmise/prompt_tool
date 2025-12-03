import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/tasks/:id/ab-results - 获取 A/B 测试结果
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 获取任务
    const task = await prisma.task.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    if (task.type !== 'AB_TEST') {
      return NextResponse.json(badRequest('该任务不是 A/B 测试'), { status: 400 })
    }

    // 获取 A/B 测试记录
    const abTest = await prisma.aBTest.findUnique({
      where: { taskId: id },
      include: {
        results: {
          orderBy: { rowIndex: 'asc' },
        },
      },
    })

    if (!abTest) {
      return NextResponse.json(notFound('A/B 测试记录不存在'), { status: 404 })
    }

    // 获取所有相关的 TaskResult
    const resultIds = abTest.results.flatMap((r) => [r.resultAId, r.resultBId])
    const taskResults = await prisma.taskResult.findMany({
      where: { id: { in: resultIds } },
      include: {
        evaluations: true,
      },
    })
    const resultMap = new Map(taskResults.map((r) => [r.id, r]))

    // 构建响应数据
    const comparisonResults = abTest.results.map((abResult) => {
      const resultA = resultMap.get(abResult.resultAId)
      const resultB = resultMap.get(abResult.resultBId)

      return {
        rowIndex: abResult.rowIndex,
        winner: abResult.winner,
        configA: {
          resultId: abResult.resultAId,
          output: resultA?.output ?? null,
          status: resultA?.status ?? 'PENDING',
          latencyMs: resultA?.latencyMs ?? null,
          tokens: resultA?.tokens ?? { input: 0, output: 0, total: 0 },
          cost: resultA?.cost ? Number(resultA.cost) : null,
          evaluations: resultA?.evaluations.map((e) => ({
            passed: e.passed,
            score: e.score ? Number(e.score) : null,
            reason: e.reason,
          })) ?? [],
        },
        configB: {
          resultId: abResult.resultBId,
          output: resultB?.output ?? null,
          status: resultB?.status ?? 'PENDING',
          latencyMs: resultB?.latencyMs ?? null,
          tokens: resultB?.tokens ?? { input: 0, output: 0, total: 0 },
          cost: resultB?.cost ? Number(resultB.cost) : null,
          evaluations: resultB?.evaluations.map((e) => ({
            passed: e.passed,
            score: e.score ? Number(e.score) : null,
            reason: e.reason,
          })) ?? [],
        },
      }
    })

    return NextResponse.json(success({
      id: abTest.id,
      taskId: abTest.taskId,
      compareType: abTest.compareType,
      configA: abTest.configA,
      configB: abTest.configB,
      summary: abTest.summary,
      results: comparisonResults,
    }))
  } catch (err) {
    console.error('Get A/B test results error:', err)
    const errorMessage = err instanceof Error ? err.message : '获取 A/B 测试结果失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
