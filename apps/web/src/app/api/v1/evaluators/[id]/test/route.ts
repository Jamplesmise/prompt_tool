import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import {
  runPresetEvaluator,
  runLLMEvaluator,
  runCompositeEvaluator,
  type EvaluatorInput,
  type PresetType,
  type PresetParams,
  type LLMEvaluatorConfig as LLMConfig,
  type CompositeEvaluatorConfig,
} from '@platform/evaluators'
import { executeInSandbox, type CodeLanguage } from '@/lib/sandbox'
import { invokeModel, type ModelConfig } from '@/lib/modelInvoker'

type RouteParams = { params: Promise<{ id: string }> }

type CodeConfig = {
  language?: CodeLanguage
  code: string
  timeout?: number
}

type PresetConfig = {
  presetType: PresetType
  params?: PresetParams
}

type LLMEvaluatorConfigWithModel = LLMConfig & {
  modelId: string
}

// POST /api/v1/evaluators/:id/test - 测试评估器
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const evaluator = await prisma.evaluator.findUnique({
      where: { id },
    })

    if (!evaluator) {
      return NextResponse.json(
        notFound('评估器不存在'),
        { status: 404 }
      )
    }

    const body = await request.json()
    const { input, output, expected, metadata } = body

    // 验证必填参数
    if (input === undefined || output === undefined) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, 'input 和 output 为必填参数'),
        { status: 400 }
      )
    }

    const evaluatorInput: EvaluatorInput = {
      input: String(input),
      output: String(output),
      expected: expected !== undefined ? String(expected) : null,
      metadata: metadata || {},
    }

    const startTime = Date.now()
    let result: { passed: boolean; score?: number; reason?: string; details?: Record<string, unknown> }
    let evalError: string | null = null

    try {
      if (evaluator.type === 'PRESET') {
        const config = evaluator.config as PresetConfig
        result = runPresetEvaluator(
          config.presetType,
          evaluatorInput,
          config.params
        )
      } else if (evaluator.type === 'CODE') {
        const config = evaluator.config as CodeConfig
        result = await executeInSandbox(
          config.code,
          evaluatorInput,
          config.timeout || 5000,
          config.language || 'nodejs'
        )
      } else if (evaluator.type === 'LLM') {
        const config = evaluator.config as LLMEvaluatorConfigWithModel

        // 获取模型配置
        const model = await prisma.model.findUnique({
          where: { id: config.modelId },
          include: { provider: true },
        })

        if (!model) {
          throw new Error('评估模型不存在')
        }

        // 创建模型调用器
        const modelInvoker = async (
          _modelId: string,
          messages: Array<{ role: string; content: string }>
        ) => {
          const modelConfig: ModelConfig = {
            id: model.id,
            modelId: model.modelId,
            provider: {
              type: model.provider.type,
              baseUrl: model.provider.baseUrl,
              apiKey: model.provider.apiKey,
              headers: (model.provider.headers as Record<string, string>) || {},
            },
            config: (model.config as Record<string, unknown>) || {},
            pricing: model.pricing as { inputPerMillion?: number; outputPerMillion?: number } | undefined,
          }
          return invokeModel(modelConfig, { messages })
        }

        const llmResult = await runLLMEvaluator(config, evaluatorInput, modelInvoker)
        result = {
          passed: llmResult.passed,
          score: llmResult.score,
          reason: llmResult.reason,
          details: {
            ...llmResult.details,
            tokenUsage: llmResult.tokenUsage,
            cost: llmResult.cost,
          },
        }
      } else if (evaluator.type === 'COMPOSITE') {
        const config = evaluator.config as CompositeEvaluatorConfig

        // 创建递归子评估器执行器
        const createExecutor = (visitedIds: Set<string>) => {
          const executor = async (childId: string, childInput: EvaluatorInput): Promise<{ passed: boolean; score?: number; reason?: string; details?: Record<string, unknown> }> => {
            // 检测循环依赖
            if (visitedIds.has(childId)) {
              return {
                passed: false,
                score: 0,
                reason: `检测到循环依赖: ${childId}`,
              }
            }

            const childEvaluator = await prisma.evaluator.findUnique({
              where: { id: childId },
            })

            if (!childEvaluator) {
              return {
                passed: false,
                score: 0,
                reason: `子评估器不存在: ${childId}`,
              }
            }

            // 递归执行子评估器
            if (childEvaluator.type === 'PRESET') {
              const childConfig = childEvaluator.config as PresetConfig
              return runPresetEvaluator(
                childConfig.presetType,
                childInput,
                childConfig.params
              )
            } else if (childEvaluator.type === 'CODE') {
              const childConfig = childEvaluator.config as CodeConfig
              return executeInSandbox(
                childConfig.code,
                childInput,
                childConfig.timeout || 5000,
                childConfig.language || 'nodejs'
              )
            } else if (childEvaluator.type === 'LLM') {
              const childConfig = childEvaluator.config as LLMEvaluatorConfigWithModel
              const model = await prisma.model.findUnique({
                where: { id: childConfig.modelId },
                include: { provider: true },
              })

              if (!model) {
                return {
                  passed: false,
                  score: 0,
                  reason: '评估模型不存在',
                }
              }

              const modelInvoker = async (
                _modelId: string,
                messages: Array<{ role: string; content: string }>
              ) => {
                const modelConfig: ModelConfig = {
                  id: model.id,
                  modelId: model.modelId,
                  provider: {
                    type: model.provider.type,
                    baseUrl: model.provider.baseUrl,
                    apiKey: model.provider.apiKey,
                    headers: (model.provider.headers as Record<string, string>) || {},
                  },
                  config: (model.config as Record<string, unknown>) || {},
                  pricing: model.pricing as { inputPerMillion?: number; outputPerMillion?: number } | undefined,
                }
                return invokeModel(modelConfig, { messages })
              }

              return runLLMEvaluator(childConfig, childInput, modelInvoker)
            } else if (childEvaluator.type === 'COMPOSITE') {
              const childConfig = childEvaluator.config as CompositeEvaluatorConfig
              const newVisitedIds = new Set(visitedIds)
              newVisitedIds.add(childId)
              return runCompositeEvaluator({
                config: childConfig,
                input: childInput,
                executor: createExecutor(newVisitedIds),
                visitedIds: newVisitedIds,
              })
            }

            return {
              passed: false,
              score: 0,
              reason: `不支持的子评估器类型: ${childEvaluator.type}`,
            }
          }
          return executor
        }

        const visitedIds = new Set<string>([id])
        result = await runCompositeEvaluator({
          config,
          input: evaluatorInput,
          executor: createExecutor(visitedIds),
          visitedIds,
        })
      } else {
        throw new Error(`不支持的评估器类型: ${evaluator.type}`)
      }
    } catch (err) {
      evalError = err instanceof Error ? err.message : '评估器执行失败'
      result = {
        passed: false,
        score: 0,
        reason: evalError,
      }
    }

    const latencyMs = Date.now() - startTime

    return NextResponse.json(
      success({
        passed: result.passed,
        score: result.score ?? (result.passed ? 1 : 0),
        reason: result.reason ?? null,
        latencyMs,
        error: evalError,
        details: result.details,
      })
    )
  } catch (err) {
    console.error('Test evaluator error:', err)
    return NextResponse.json(
      error(ERROR_CODES.EVALUATOR_ERROR, '测试评估器失败'),
      { status: 500 }
    )
  }
}
