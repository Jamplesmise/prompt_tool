// 精确匹配评估器
import type { EvaluatorInput, EvaluatorOutput } from '../types'

/**
 * 精确匹配评估器
 * 规则：output === expected
 * 使用场景：分类任务、提取任务
 */
export function exactMatch(input: EvaluatorInput): EvaluatorOutput {
  const { output, expected } = input

  if (expected === null || expected === undefined) {
    return {
      passed: false,
      score: 0,
      reason: '缺少期望值 (expected)',
    }
  }

  const passed = output === expected

  return {
    passed,
    score: passed ? 1 : 0,
    reason: passed ? '输出与期望值完全匹配' : '输出与期望值不匹配',
  }
}
