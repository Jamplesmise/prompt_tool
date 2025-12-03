// 包含匹配评估器
import type { EvaluatorInput, EvaluatorOutput } from '../types'

/**
 * 包含匹配评估器
 * 规则：output.includes(expected)
 * 使用场景：关键词检测、答案包含验证
 */
export function contains(input: EvaluatorInput): EvaluatorOutput {
  const { output, expected } = input

  if (expected === null || expected === undefined) {
    return {
      passed: false,
      score: 0,
      reason: '缺少期望值 (expected)',
    }
  }

  if (expected === '') {
    return {
      passed: true,
      score: 1,
      reason: '期望值为空字符串，任何输出都包含空字符串',
    }
  }

  const passed = output.includes(expected)

  return {
    passed,
    score: passed ? 1 : 0,
    reason: passed
      ? `输出包含期望内容: "${expected}"`
      : `输出不包含期望内容: "${expected}"`,
  }
}
