import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string; resultId: string }>
}

// GET /api/v1/tasks/:id/results/:resultId - 获取单个结果详情（含字段级评估）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: taskId, resultId } = await params

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
                    aggregation: true,
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

    // 获取第一个 prompt 的 outputSchema
    const firstPrompt = task.prompts[0]?.prompt

    // 获取结果详情
    const result = await prisma.taskResult.findFirst({
      where: {
        id: resultId,
        taskId,
      },
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
        fieldEvaluations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!result) {
      return NextResponse.json(notFound('结果不存在'), { status: 404 })
    }

    // 获取提示词名称
    const prompt = await prisma.prompt.findUnique({
      where: { id: result.promptVersion.promptId },
      select: { id: true, name: true },
    })

    // 获取 OutputSchema 字段配置（用于获取 isCritical 等信息）
    const outputSchema = firstPrompt?.outputSchema
    const fieldsConfig = outputSchema?.fields as Array<{
      key: string
      name: string
      evaluation?: {
        isCritical?: boolean
        weight?: number
      }
    }> || []

    // 构建字段配置映射
    const fieldConfigMap = new Map(fieldsConfig.map(f => [f.key, f]))

    // 格式化字段级评估结果
    const fieldEvaluations = result.fieldEvaluations.map(fe => {
      const config = fieldConfigMap.get(fe.fieldKey)
      return {
        id: fe.id,
        fieldName: fe.fieldName,
        fieldKey: fe.fieldKey,
        fieldValue: fe.fieldValue,
        expectedValue: fe.expectedValue,
        evaluatorId: fe.evaluatorId,
        evaluatorName: fe.evaluatorName,
        passed: fe.passed,
        score: fe.score ? Number(fe.score) : null,
        reason: fe.reason,
        details: fe.details,
        skipped: fe.skipped,
        skipReason: fe.skipReason,
        latencyMs: fe.latencyMs,
        isCritical: config?.evaluation?.isCritical ?? false,
        weight: config?.evaluation?.weight ?? 0,
      }
    })

    // 计算聚合信息
    const aggregationConfig = outputSchema?.aggregation as {
      mode?: string
      passThreshold?: number
    } | undefined

    const aggregation = {
      mode: aggregationConfig?.mode || 'all_pass',
      passThreshold: aggregationConfig?.passThreshold ?? 0.6,
      totalFields: fieldEvaluations.length,
      evaluatedFields: fieldEvaluations.filter(f => !f.skipped).length,
      passedFields: fieldEvaluations.filter(f => f.passed && !f.skipped).length,
      failedFields: fieldEvaluations.filter(f => !f.passed && !f.skipped).length,
      skippedFields: fieldEvaluations.filter(f => f.skipped).length,
      criticalPassed: fieldEvaluations.filter(f => f.isCritical && !f.skipped).every(f => f.passed),
      criticalFailed: fieldEvaluations.filter(f => f.isCritical && !f.passed && !f.skipped).map(f => f.fieldKey),
    }

    // 格式化响应
    const formattedResult = {
      id: result.id,
      taskId,
      rowIndex: result.datasetRow.rowIndex,
      rowData: result.datasetRow.data,
      promptId: prompt?.id,
      promptName: prompt?.name,
      promptVersion: result.promptVersion.version,
      modelId: result.model.id,
      modelName: result.model.name,
      modelIdentifier: result.model.modelId,
      input: result.input,
      output: result.output,
      expected: result.expected,
      parsedOutput: result.outputParsed,
      parseSuccess: result.parseSuccess,
      parseError: result.parseError,
      status: result.status,
      latencyMs: result.latencyMs,
      tokens: result.tokens,
      cost: result.cost ? Number(result.cost) : null,
      costCurrency: result.costCurrency ?? 'USD',
      error: result.error,
      evaluations: result.evaluations.map(e => ({
        evaluatorId: e.evaluator.id,
        evaluatorName: e.evaluator.name,
        evaluatorType: e.evaluator.type,
        passed: e.passed,
        score: e.score ? Number(e.score) : null,
        reason: e.reason,
        details: e.details,
        latencyMs: e.latencyMs,
      })),
      fieldEvaluations,
      aggregation,
      createdAt: result.createdAt,
    }

    return NextResponse.json(success(formattedResult))
  } catch (err) {
    console.error('Get task result detail error:', err)
    return NextResponse.json(internalError('获取结果详情失败'), { status: 500 })
  }
}
