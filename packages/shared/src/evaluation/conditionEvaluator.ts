/**
 * 条件表达式求值器
 *
 * 安全地执行字段间条件依赖表达式
 *
 * 支持的表达式示例：
 * - "fields.device_change === false"
 * - "fields.problem_type !== 'other'"
 * - "evaluated.field_a.passed && evaluated.field_b.score > 0.8"
 */

// 求值上下文
export type EvaluationContext = {
  // 当前解析出的字段值
  fields: Record<string, unknown>
  // 已评估的字段结果
  evaluated: Record<string, {
    passed: boolean
    score?: number
    skipped?: boolean
  }>
  // 期望值
  expected?: Record<string, unknown>
}

// 验证结果
export type ValidationResult = {
  valid: boolean
  error?: string
}

// 求值结果
export type ConditionEvalResult = {
  success: boolean
  result?: boolean
  error?: string
}

// 危险关键字白名单外的关键字
const FORBIDDEN_KEYWORDS = [
  'eval',
  'Function',
  'constructor',
  'prototype',
  '__proto__',
  'window',
  'global',
  'globalThis',
  'process',
  'require',
  'import',
  'export',
  'module',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'document',
  'alert',
  'console',
  'debugger',
]

// 允许的操作符和标识符模式
const ALLOWED_PATTERN = /^[\w\s.[\]'"<>=!&|()+-/*%?:,]+$/

// 安全的字符串/数字字面量
const LITERAL_PATTERN = /^[\w\s'".\[\]]+$/

/**
 * 条件表达式求值器类
 */
export class ConditionEvaluator {
  /**
   * 验证表达式是否安全
   */
  static validate(expression: string): ValidationResult {
    if (!expression || typeof expression !== 'string') {
      return { valid: false, error: '表达式不能为空' }
    }

    const trimmed = expression.trim()
    if (trimmed.length === 0) {
      return { valid: false, error: '表达式不能为空' }
    }

    if (trimmed.length > 500) {
      return { valid: false, error: '表达式过长，最大 500 字符' }
    }

    // 检查禁止的关键字
    const lowerExpr = trimmed.toLowerCase()
    for (const keyword of FORBIDDEN_KEYWORDS) {
      // 使用单词边界检查
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
      if (regex.test(lowerExpr)) {
        return { valid: false, error: `表达式包含禁止的关键字: ${keyword}` }
      }
    }

    // 检查基本字符集
    if (!ALLOWED_PATTERN.test(trimmed)) {
      return { valid: false, error: '表达式包含不允许的字符' }
    }

    // 检查括号匹配
    let parenCount = 0
    let bracketCount = 0
    for (const char of trimmed) {
      if (char === '(') parenCount++
      if (char === ')') parenCount--
      if (char === '[') bracketCount++
      if (char === ']') bracketCount--

      if (parenCount < 0 || bracketCount < 0) {
        return { valid: false, error: '括号不匹配' }
      }
    }

    if (parenCount !== 0 || bracketCount !== 0) {
      return { valid: false, error: '括号不匹配' }
    }

    return { valid: true }
  }

  /**
   * 执行条件表达式求值
   */
  static evaluate(expression: string, context: EvaluationContext): ConditionEvalResult {
    // 1. 验证表达式安全性
    const validation = this.validate(expression)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    try {
      // 2. 创建安全的上下文对象（深拷贝防止修改）
      const safeContext = {
        fields: Object.freeze({ ...context.fields }),
        evaluated: Object.freeze(
          Object.fromEntries(
            Object.entries(context.evaluated).map(([k, v]) => [k, Object.freeze({ ...v })])
          )
        ),
        expected: context.expected ? Object.freeze({ ...context.expected }) : undefined,
      }

      // 3. 使用 Function 构造器创建沙箱函数
      // 注意：这比 eval 稍安全，因为它在独立的作用域中执行
      const evaluator = new Function(
        'fields',
        'evaluated',
        'expected',
        `"use strict"; return (${expression});`
      )

      // 4. 执行表达式
      const result = evaluator(
        safeContext.fields,
        safeContext.evaluated,
        safeContext.expected
      )

      return {
        success: true,
        result: Boolean(result),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `表达式执行错误: ${message}`,
      }
    }
  }

  /**
   * 检查条件是否满足（简化版，返回 boolean）
   *
   * @param expression - 条件表达式
   * @param context - 求值上下文
   * @returns true 表示条件满足（应该执行评估），false 表示条件不满足（应该跳过）
   */
  static shouldEvaluate(expression: string | undefined, context: EvaluationContext): boolean {
    // 无条件表达式，默认执行评估
    if (!expression || expression.trim() === '') {
      return true
    }

    const result = this.evaluate(expression, context)

    // 表达式执行失败时，默认执行评估（避免意外跳过）
    if (!result.success) {
      console.warn(`Condition expression error: ${result.error}`)
      return true
    }

    return result.result === true
  }
}

/**
 * 便捷函数：验证条件表达式
 */
export function validateCondition(expression: string): ValidationResult {
  return ConditionEvaluator.validate(expression)
}

/**
 * 便捷函数：执行条件表达式
 */
export function evaluateCondition(
  expression: string,
  context: EvaluationContext
): ConditionEvalResult {
  return ConditionEvaluator.evaluate(expression, context)
}

/**
 * 便捷函数：检查是否应该执行评估
 */
export function shouldEvaluateField(
  condition: string | undefined,
  context: EvaluationContext
): boolean {
  return ConditionEvaluator.shouldEvaluate(condition, context)
}

export default ConditionEvaluator
