// 评估器执行引擎
import type {
  EvaluatorInput,
  EvaluatorOutput,
  PresetType,
  PresetParams,
} from './types'
import { runPresetEvaluator } from './presets'

export type EvaluatorConfig = {
  type: 'PRESET' | 'CODE'
  presetType?: PresetType
  params?: PresetParams
  code?: string
  language?: 'nodejs' | 'python'
  timeout?: number
}

export type RunEvaluatorOptions = {
  config: EvaluatorConfig
  input: EvaluatorInput
  sandboxExecutor?: (
    code: string,
    input: EvaluatorInput,
    timeout: number
  ) => Promise<EvaluatorOutput>
}

/**
 * 执行评估器
 */
export async function runEvaluator(
  options: RunEvaluatorOptions
): Promise<EvaluatorOutput> {
  const { config, input, sandboxExecutor } = options
  const startTime = Date.now()

  try {
    let result: EvaluatorOutput

    if (config.type === 'PRESET') {
      if (!config.presetType) {
        throw new Error('预置评估器需要指定 presetType')
      }
      result = runPresetEvaluator(config.presetType, input, config.params)
    } else if (config.type === 'CODE') {
      if (!config.code) {
        throw new Error('代码评估器需要指定 code')
      }
      if (!sandboxExecutor) {
        throw new Error('代码评估器需要提供 sandboxExecutor')
      }
      result = await sandboxExecutor(
        config.code,
        input,
        config.timeout ?? 5000
      )
    } else {
      throw new Error(`不支持的评估器类型: ${config.type}`)
    }

    return {
      ...result,
      details: {
        ...result.details,
        latencyMs: Date.now() - startTime,
      },
    }
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reason: `评估器执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
      details: {
        error: error instanceof Error ? error.message : '未知错误',
        latencyMs: Date.now() - startTime,
      },
    }
  }
}

/**
 * 批量执行评估器
 */
export async function runEvaluators(
  configs: EvaluatorConfig[],
  input: EvaluatorInput,
  sandboxExecutor?: (
    code: string,
    input: EvaluatorInput,
    timeout: number
  ) => Promise<EvaluatorOutput>
): Promise<EvaluatorOutput[]> {
  const results = await Promise.all(
    configs.map((config) =>
      runEvaluator({ config, input, sandboxExecutor })
    )
  )
  return results
}

/**
 * 聚合多个评估结果
 */
export function aggregateResults(
  results: EvaluatorOutput[],
  mode: 'all' | 'any' | 'average' = 'all'
): EvaluatorOutput {
  if (results.length === 0) {
    return {
      passed: true,
      score: 1,
      reason: '无评估器执行',
    }
  }

  const scores = results.map((r) => r.score ?? (r.passed ? 1 : 0))
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  let passed: boolean
  let reason: string

  switch (mode) {
    case 'all':
      passed = results.every((r) => r.passed)
      reason = passed
        ? '所有评估器通过'
        : `${results.filter((r) => !r.passed).length}/${results.length} 个评估器未通过`
      break
    case 'any':
      passed = results.some((r) => r.passed)
      reason = passed
        ? `${results.filter((r) => r.passed).length}/${results.length} 个评估器通过`
        : '所有评估器都未通过'
      break
    case 'average':
      passed = avgScore >= 0.5
      reason = `平均分数: ${(avgScore * 100).toFixed(1)}%`
      break
    default:
      passed = results.every((r) => r.passed)
      reason = '默认模式: 所有评估器需通过'
  }

  return {
    passed,
    score: avgScore,
    reason,
    details: {
      mode,
      totalEvaluators: results.length,
      passedCount: results.filter((r) => r.passed).length,
      failedCount: results.filter((r) => !r.passed).length,
      individualResults: results,
    },
  }
}
