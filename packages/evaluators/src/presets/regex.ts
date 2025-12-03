// 正则匹配评估器
import type { EvaluatorInput, EvaluatorOutput, RegexParams } from '../types'

/**
 * 正则匹配评估器
 * 规则：new RegExp(pattern, flags).test(output)
 * 使用场景：格式验证（日期、邮箱等）
 */
export function regex(
  input: EvaluatorInput,
  params?: RegexParams
): EvaluatorOutput {
  const { output } = input

  if (!params?.pattern) {
    return {
      passed: false,
      score: 0,
      reason: '缺少正则表达式 pattern 参数',
    }
  }

  try {
    const re = new RegExp(params.pattern, params.flags)
    const passed = re.test(output)

    return {
      passed,
      score: passed ? 1 : 0,
      reason: passed
        ? `输出匹配正则表达式: /${params.pattern}/${params.flags || ''}`
        : `输出不匹配正则表达式: /${params.pattern}/${params.flags || ''}`,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '未知错误'
    return {
      passed: false,
      score: 0,
      reason: `无效的正则表达式: ${errorMessage}`,
    }
  }
}
