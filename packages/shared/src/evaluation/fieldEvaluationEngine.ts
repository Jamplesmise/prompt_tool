/**
 * 字段级评估引擎
 *
 * 遍历 OutputSchema 的字段定义，对每个字段执行独立评估
 */

import type { OutputFieldDefinition } from '../types/schema'

// 评估器执行器函数类型
export type EvaluatorExecutor = (
  fieldValue: unknown,
  expectedValue: unknown,
  evaluatorId: string,
  metadata?: Record<string, unknown>
) => Promise<EvaluatorResult>

// 单个评估器结果
export type EvaluatorResult = {
  passed: boolean
  score?: number
  reason?: string
  details?: Record<string, unknown>
  latencyMs?: number
}

// 单个字段评估结果
export type FieldEvaluationResultData = {
  fieldName: string
  fieldKey: string
  fieldValue: unknown
  expectedValue: unknown
  evaluatorId?: string
  evaluatorName?: string
  passed: boolean
  score?: number
  reason?: string
  details?: Record<string, unknown>
  skipped: boolean
  skipReason?: string
  latencyMs?: number
}

// 字段评估引擎配置
export type FieldEvaluationEngineConfig = {
  // 评估器执行器（由上层注入）
  evaluatorExecutor?: EvaluatorExecutor
  // 默认评估器 ID（当字段未指定时使用）
  defaultEvaluatorId?: string
  // 元数据（传递给评估器）
  metadata?: Record<string, unknown>
}

// 评估输入
export type FieldEvaluationInput = {
  parsedOutput: Record<string, unknown>
  expectedValues: Record<string, unknown>
  fields: OutputFieldDefinition[]
}

// 评估输出
export type FieldEvaluationOutput = {
  fieldResults: FieldEvaluationResultData[]
  allPassed: boolean
  totalFields: number
  evaluatedFields: number
  passedFields: number
  skippedFields: number
}

/**
 * 默认评估器 - 简单相等比较
 */
async function defaultEvaluator(
  fieldValue: unknown,
  expectedValue: unknown
): Promise<EvaluatorResult> {
  const startTime = Date.now()

  // 如果没有期望值，视为通过（仅检查解析成功）
  if (expectedValue === undefined || expectedValue === null) {
    return {
      passed: true,
      score: 1,
      reason: '无期望值，仅检查字段存在',
      latencyMs: Date.now() - startTime,
    }
  }

  // 深度比较
  const passed = deepEqual(fieldValue, expectedValue)

  return {
    passed,
    score: passed ? 1 : 0,
    reason: passed ? '值匹配' : `期望 ${JSON.stringify(expectedValue)}，实际 ${JSON.stringify(fieldValue)}`,
    latencyMs: Date.now() - startTime,
  }
}

/**
 * 深度相等比较
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (typeof a !== typeof b) return false

  if (a === null || b === null) return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>)
    const bKeys = Object.keys(b as Record<string, unknown>)

    if (aKeys.length !== bKeys.length) return false

    return aKeys.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    )
  }

  return false
}

/**
 * 字段级评估引擎
 */
export class FieldEvaluationEngine {
  private config: FieldEvaluationEngineConfig

  constructor(config: FieldEvaluationEngineConfig = {}) {
    this.config = config
  }

  /**
   * 执行字段级评估
   */
  async evaluate(input: FieldEvaluationInput): Promise<FieldEvaluationOutput> {
    const { parsedOutput, expectedValues, fields } = input
    const fieldResults: FieldEvaluationResultData[] = []

    for (const field of fields) {
      const result = await this.evaluateField(
        field,
        parsedOutput[field.key],
        expectedValues[field.key]
      )
      fieldResults.push(result)
    }

    const evaluatedFields = fieldResults.filter((r) => !r.skipped).length
    const passedFields = fieldResults.filter((r) => r.passed && !r.skipped).length
    const skippedFields = fieldResults.filter((r) => r.skipped).length

    return {
      fieldResults,
      allPassed: fieldResults.every((r) => r.passed || r.skipped),
      totalFields: fields.length,
      evaluatedFields,
      passedFields,
      skippedFields,
    }
  }

  /**
   * 评估单个字段
   */
  private async evaluateField(
    field: OutputFieldDefinition,
    fieldValue: unknown,
    expectedValue: unknown
  ): Promise<FieldEvaluationResultData> {
    const startTime = Date.now()
    const evaluation = field.evaluation

    // 检查字段是否缺失
    if (fieldValue === undefined) {
      if (field.required) {
        return {
          fieldName: field.name,
          fieldKey: field.key,
          fieldValue: undefined,
          expectedValue,
          passed: false,
          score: 0,
          reason: '必填字段缺失',
          skipped: false,
          latencyMs: Date.now() - startTime,
        }
      } else {
        return {
          fieldName: field.name,
          fieldKey: field.key,
          fieldValue: undefined,
          expectedValue,
          passed: true,
          score: 1,
          reason: '可选字段缺失，跳过评估',
          skipped: true,
          skipReason: '字段非必填且未返回',
          latencyMs: Date.now() - startTime,
        }
      }
    }

    // 条件评估（Phase 2 实现）
    // if (evaluation.condition) {
    //   const shouldEvaluate = evaluateCondition(evaluation.condition, parsedOutput)
    //   if (!shouldEvaluate) {
    //     return { ...skipped result }
    //   }
    // }

    // 执行评估
    try {
      let result: EvaluatorResult

      if (evaluation.evaluatorId && this.config.evaluatorExecutor) {
        // 使用指定的评估器
        result = await this.config.evaluatorExecutor(
          fieldValue,
          expectedValue,
          evaluation.evaluatorId,
          this.config.metadata
        )
      } else if (this.config.defaultEvaluatorId && this.config.evaluatorExecutor) {
        // 使用默认评估器
        result = await this.config.evaluatorExecutor(
          fieldValue,
          expectedValue,
          this.config.defaultEvaluatorId,
          this.config.metadata
        )
      } else {
        // 使用内置默认评估器
        result = await defaultEvaluator(fieldValue, expectedValue)
      }

      return {
        fieldName: field.name,
        fieldKey: field.key,
        fieldValue,
        expectedValue,
        evaluatorId: evaluation.evaluatorId || this.config.defaultEvaluatorId,
        passed: result.passed,
        score: result.score,
        reason: result.reason,
        details: result.details,
        skipped: false,
        latencyMs: result.latencyMs ?? Date.now() - startTime,
      }
    } catch (error) {
      return {
        fieldName: field.name,
        fieldKey: field.key,
        fieldValue,
        expectedValue,
        evaluatorId: evaluation.evaluatorId,
        passed: false,
        score: 0,
        reason: `评估器执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        skipped: false,
        latencyMs: Date.now() - startTime,
      }
    }
  }
}

/**
 * 便捷函数：创建字段评估引擎并执行评估
 */
export async function evaluateFields(
  input: FieldEvaluationInput,
  config?: FieldEvaluationEngineConfig
): Promise<FieldEvaluationOutput> {
  const engine = new FieldEvaluationEngine(config)
  return engine.evaluate(input)
}
