// LLM 输出解析器

import type { EvaluatorOutput } from '../types'

export type ScoreRange = {
  min: number
  max: number
}

export type LLMEvaluationResult = {
  overall: number
  dimensions?: Record<string, number>
  reason?: string
}

/**
 * 从 LLM 输出中提取 JSON
 */
function extractJson(text: string): string | null {
  // 尝试提取 ```json ... ``` 代码块
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // 尝试提取 { ... } JSON 对象
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return null
}

/**
 * 解析 LLM 评估输出
 */
export function parseLLMOutput(
  output: string,
  scoreRange: ScoreRange = { min: 0, max: 10 },
  passThreshold: number = 0.6
): EvaluatorOutput {
  const jsonStr = extractJson(output)

  if (!jsonStr) {
    return {
      passed: false,
      score: 0,
      reason: '无法从 LLM 输出中提取 JSON 结果',
      details: {
        rawOutput: output.slice(0, 500),
      },
    }
  }

  try {
    const result = JSON.parse(jsonStr) as LLMEvaluationResult

    // 验证必需字段
    if (typeof result.overall !== 'number') {
      return {
        passed: false,
        score: 0,
        reason: 'LLM 返回结果缺少 overall 评分',
        details: {
          parsedResult: result,
        },
      }
    }

    // 归一化分数到 0-1
    const normalizedScore =
      (result.overall - scoreRange.min) / (scoreRange.max - scoreRange.min)

    // 限制在 0-1 范围
    const clampedScore = Math.max(0, Math.min(1, normalizedScore))

    return {
      passed: clampedScore >= passThreshold,
      score: clampedScore,
      reason: result.reason || `评分: ${result.overall}/${scoreRange.max}`,
      details: {
        rawScore: result.overall,
        scoreRange,
        dimensions: result.dimensions,
        normalizedScore: clampedScore,
      },
    }
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reason: `解析 LLM 输出失败: ${error instanceof Error ? error.message : '未知错误'}`,
      details: {
        rawJson: jsonStr.slice(0, 500),
        error: error instanceof Error ? error.message : '未知错误',
      },
    }
  }
}

/**
 * 尝试从文本中提取分数（fallback）
 * 当无法解析 JSON 时使用
 */
export function extractScoreFromText(
  text: string,
  scoreRange: ScoreRange = { min: 0, max: 10 }
): number | null {
  // 尝试匹配常见的评分模式
  const patterns = [
    /(?:评分|分数|score|rating)[：:\s]*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*[\/／]\s*(\d+)/,
    /(?:overall|总分)[：:\s]*(\d+(?:\.\d+)?)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const score = parseFloat(match[1])
      if (!isNaN(score)) {
        // 归一化到 0-1
        return (score - scoreRange.min) / (scoreRange.max - scoreRange.min)
      }
    }
  }

  return null
}
