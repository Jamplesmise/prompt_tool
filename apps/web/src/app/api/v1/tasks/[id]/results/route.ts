import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/tasks/:id/results - 获取任务结果列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const status = searchParams.get('status')
    const passed = searchParams.get('passed')

    // 验证任务存在且属于当前用户
    const task = await prisma.task.findFirst({
      where: {
        id,
        createdById: session.id,
      },
      select: { id: true },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 构建查询条件
    type WhereCondition = {
      taskId: string
      status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'ERROR'
      evaluations?: {
        every?: { passed: boolean }
        some?: { passed: boolean }
      }
    }

    const where: WhereCondition = {
      taskId: id,
    }

    if (status) {
      where.status = status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'ERROR'
    }

    // 根据评估结果筛选
    if (passed === 'true') {
      where.evaluations = { every: { passed: true } }
    } else if (passed === 'false') {
      where.evaluations = { some: { passed: false } }
    }

    const [results, total] = await Promise.all([
      prisma.taskResult.findMany({
        where,
        include: {
          datasetRow: {
            select: {
              rowIndex: true,
              data: true,
            },
          },
          promptVersion: {
            select: {
              version: true,
              promptId: true,
            },
          },
          model: {
            select: {
              id: true,
              name: true,
              modelId: true,
            },
          },
          evaluations: {
            include: {
              evaluator: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: [
          { datasetRow: { rowIndex: 'asc' } },
          { createdAt: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.taskResult.count({ where }),
    ])

    // 获取提示词名称
    const promptIds = [...new Set(results.map((r) => r.promptVersion.promptId))]
    const prompts = await prisma.prompt.findMany({
      where: { id: { in: promptIds } },
      select: { id: true, name: true },
    })
    const promptMap = new Map(prompts.map((p) => [p.id, p.name]))

    // 格式化响应
    const formattedResults = results.map((r) => ({
      id: r.id,
      rowIndex: r.datasetRow.rowIndex,
      promptId: r.promptId,
      promptName: promptMap.get(r.promptVersion.promptId),
      promptVersion: r.promptVersion.version,
      modelId: r.model.id,
      modelName: r.model.name,
      modelIdentifier: r.model.modelId,
      input: r.input,
      output: r.output,
      expected: r.expected,
      status: r.status,
      latencyMs: r.latencyMs,
      tokens: r.tokens,
      cost: r.cost ? Number(r.cost) : null,
      costCurrency: r.costCurrency ?? 'USD',
      error: r.error,
      evaluations: r.evaluations.map((e) => ({
        evaluatorId: e.evaluator.id,
        evaluatorName: e.evaluator.name,
        evaluatorType: e.evaluator.type,
        passed: e.passed,
        score: e.score ? Number(e.score) : null,
        reason: e.reason,
        details: e.details,
        latencyMs: e.latencyMs,
      })),
      createdAt: r.createdAt,
    }))

    return NextResponse.json(
      success({
        list: formattedResults,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get task results error:', err)
    return NextResponse.json(internalError('获取任务结果失败'), { status: 500 })
  }
}
