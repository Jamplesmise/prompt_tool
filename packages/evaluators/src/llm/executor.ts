// LLM 评估器执行器

import type { EvaluatorInput, EvaluatorOutput } from '../types'
import { renderTemplate, DEFAULT_EVALUATION_PROMPT } from './templates'
import { parseLLMOutput, type ScoreRange } from './parser'

export type LLMEvaluatorConfig = {
  modelId: string
  prompt?: string
  scoreRange?: ScoreRange
  passThreshold?: number
}

export type ModelInvoker = (
  modelId: string,
  messages: Array<{ role: string; content: string }>
) => Promise<{
  output: string
  tokens: { input: number; output: number; total: number }
  latencyMs: number
  cost: number | null
}>

/**
 * 执行 LLM 评估
 */
export async function runLLMEvaluator(
  config: LLMEvaluatorConfig,
  input: EvaluatorInput,
  modelInvoker: ModelInvoker
): Promise<EvaluatorOutput & { tokenUsage?: { input: number; output: number; total: number }; cost?: number | null }> {
  const {
    modelId,
    prompt = DEFAULT_EVALUATION_PROMPT,
    scoreRange = { min: 0, max: 10 },
    passThreshold = 0.6,
  } = config

  try {
    // 渲染提示词模板
    const renderedPrompt = renderTemplate(prompt, {
      input: input.input,
      output: input.output,
      expected: input.expected,
    })

    // 调用模型
    const result = await modelInvoker(modelId, [
      { role: 'user', content: renderedPrompt },
    ])

    // 解析输出
    const evaluation = parseLLMOutput(result.output, scoreRange, passThreshold)

    return {
      ...evaluation,
      details: {
        ...evaluation.details,
        latencyMs: result.latencyMs,
      },
      tokenUsage: result.tokens,
      cost: result.cost,
    }
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reason: `LLM 评估失败: ${error instanceof Error ? error.message : '未知错误'}`,
      details: {
        error: error instanceof Error ? error.message : '未知错误',
      },
    }
  }
}
