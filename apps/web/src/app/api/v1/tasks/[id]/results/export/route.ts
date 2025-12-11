import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { unauthorized, notFound, badRequest } from '@/lib/api'
import {
  transformResultsForExport,
  transformFieldEvaluationsForExport,
  transformAggregationForExport,
  exportResults,
  type ExportFormat,
} from '@/lib/exporter'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/tasks/:id/results/export - 导出任务结果
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: taskId } = await params
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat
    const includeFieldEvaluations = searchParams.get('includeFieldEvaluations') === 'true'
    const includeAggregation = searchParams.get('includeAggregation') === 'true'

    // 验证格式
    if (!['xlsx', 'csv', 'json'].includes(format)) {
      return NextResponse.json(
        badRequest('不支持的导出格式，请使用 xlsx、csv 或 json'),
        { status: 400 }
      )
    }

    // 检查任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        name: true,
        createdById: true,
        prompts: {
          take: 1,
          select: {
            prompt: {
              select: {
                outputSchema: {
                  select: { fields: true, aggregation: true },
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

    // 获取 OutputSchema 字段配置（用于判断是否关键字段）
    const fieldsConfig = task.prompts[0]?.prompt?.outputSchema?.fields as Array<{
      key: string
      evaluation?: { isCritical?: boolean; weight?: number }
    }> || []
    const fieldConfigMap = new Map(fieldsConfig.map(f => [f.key, f]))

    // 获取聚合配置
    const aggregationConfig = task.prompts[0]?.prompt?.outputSchema?.aggregation as {
      mode?: string
      passThreshold?: number
    } | null

    // 获取任务结果
    const results = await prisma.taskResult.findMany({
      where: { taskId },
      include: {
        datasetRow: { select: { rowIndex: true } },
        promptVersion: {
          select: {
            version: true,
            prompt: { select: { name: true } },
          },
        },
        model: { select: { name: true } },
        evaluations: { select: { passed: true } },
        // 如果需要字段级评估或聚合详情，一起查询字段评估结果
        ...((includeFieldEvaluations || includeAggregation) ? {
          fieldEvaluations: {
            select: {
              fieldName: true,
              fieldKey: true,
              fieldValue: true,
              expectedValue: true,
              evaluatorName: true,
              passed: true,
              score: true,
              reason: true,
            },
          },
        } : {}),
      },
      orderBy: { datasetRow: { rowIndex: 'asc' } },
    })

    // 转换数据格式
    const exportData = transformResultsForExport(results)

    // 处理字段级评估数据
    let fieldEvaluationsData
    if (includeFieldEvaluations) {
      const allFieldEvaluations: Array<{
        rowIndex: number
        fieldName: string
        fieldKey: string
        fieldValue: unknown
        expectedValue: unknown
        evaluatorName: string | null
        passed: boolean
        score: unknown
        reason: string | null
        isCritical: boolean
      }> = []

      for (const result of results) {
        const fieldEvaluations = (result as { fieldEvaluations?: Array<{
          fieldName: string
          fieldKey: string
          fieldValue: unknown
          expectedValue: unknown
          evaluatorName: string | null
          passed: boolean
          score: unknown
          reason: string | null
        }> }).fieldEvaluations || []

        for (const fe of fieldEvaluations) {
          const config = fieldConfigMap.get(fe.fieldKey)
          allFieldEvaluations.push({
            rowIndex: result.datasetRow.rowIndex,
            fieldName: fe.fieldName,
            fieldKey: fe.fieldKey,
            fieldValue: fe.fieldValue,
            expectedValue: fe.expectedValue,
            evaluatorName: fe.evaluatorName,
            passed: fe.passed,
            score: fe.score,
            reason: fe.reason,
            isCritical: config?.evaluation?.isCritical ?? false,
          })
        }
      }

      fieldEvaluationsData = transformFieldEvaluationsForExport(allFieldEvaluations)
    }

    // 处理聚合详情数据
    let aggregationsData
    if (includeAggregation) {
      const aggregationMode = aggregationConfig?.mode || 'weighted_average'
      const passThreshold = aggregationConfig?.passThreshold ?? 0.6

      const allAggregations: Array<{
        rowIndex: number
        aggregationMode: string
        criticalTotal: number
        criticalPassed: number
        weightedScore: number
        passed: boolean
        reason: string
      }> = []

      for (const result of results) {
        const fieldEvaluations = (result as { fieldEvaluations?: Array<{
          fieldKey: string
          passed: boolean
          score: unknown
        }> }).fieldEvaluations || []

        // 统计关键字段
        let criticalTotal = 0
        let criticalPassed = 0
        let weightedScore = 0
        let totalWeight = 0

        for (const fe of fieldEvaluations) {
          const config = fieldConfigMap.get(fe.fieldKey)
          const isCritical = config?.evaluation?.isCritical ?? false
          const weight = config?.evaluation?.weight ?? 0

          if (isCritical) {
            criticalTotal++
            if (fe.passed) criticalPassed++
          }

          if (weight > 0) {
            totalWeight += weight
            const score = typeof fe.score === 'number' ? fe.score : (fe.passed ? 1 : 0)
            weightedScore += score * weight
          }
        }

        // 计算加权得分
        const finalWeightedScore = totalWeight > 0 ? weightedScore / totalWeight : -1

        // 判断是否通过
        let passed = false
        let reason = ''

        switch (aggregationMode) {
          case 'all_pass':
            passed = fieldEvaluations.every(fe => fe.passed)
            reason = passed ? '所有字段均通过' : '存在未通过字段'
            break
          case 'critical_first':
            if (criticalTotal > 0) {
              passed = criticalPassed === criticalTotal
              reason = passed
                ? `关键字段全部通过 (${criticalPassed}/${criticalTotal})`
                : `关键字段未全部通过 (${criticalPassed}/${criticalTotal})`
            } else {
              passed = finalWeightedScore >= passThreshold
              reason = `无关键字段，加权得分 ${(finalWeightedScore * 100).toFixed(1)}%`
            }
            break
          case 'weighted_average':
          default:
            passed = finalWeightedScore >= passThreshold
            reason = `加权得分 ${(finalWeightedScore * 100).toFixed(1)}% ${passed ? '>=' : '<'} 阈值 ${(passThreshold * 100).toFixed(0)}%`
            break
        }

        allAggregations.push({
          rowIndex: result.datasetRow.rowIndex,
          aggregationMode,
          criticalTotal,
          criticalPassed,
          weightedScore: finalWeightedScore,
          passed,
          reason,
        })
      }

      aggregationsData = transformAggregationForExport(allAggregations)
    }

    // 导出
    const { content, contentType, extension } = exportResults(
      exportData,
      format,
      (includeFieldEvaluations || includeAggregation) ? {
        includeFieldEvaluations,
        fieldEvaluations: fieldEvaluationsData,
        includeAggregation,
        aggregations: aggregationsData,
      } : undefined
    )

    // 生成文件名
    const fileName = `${task.name}_results_${Date.now()}.${extension}`

    // 返回文件
    const responseBody = typeof content === 'string' ? content : content as unknown as BodyInit
    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  } catch (err) {
    console.error('Export results error:', err)
    return NextResponse.json(
      { code: 500, message: '导出失败', data: null },
      { status: 500 }
    )
  }
}
