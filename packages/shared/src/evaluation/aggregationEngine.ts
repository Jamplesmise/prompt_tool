/**
 * 聚合引擎
 *
 * 根据配置的聚合策略，将字段级评估结果聚合为最终结果
 */

import type { AggregationConfig, OutputFieldDefinition } from '../types/schema'
import type { FieldEvaluationResultData } from './fieldEvaluationEngine'

// 聚合结果
export type AggregationResult = {
  passed: boolean
  score: number
  reason: string
  details: {
    mode: AggregationConfig['mode']
    totalFields: number
    evaluatedFields: number
    passedFields: number
    failedFields: number
    skippedFields: number
    criticalFailed: boolean
    criticalFields?: string[]
    weightedScores?: Record<string, number>
    passThreshold?: number
  }
}

/**
 * 聚合引擎
 */
export class AggregationEngine {
  /**
   * 聚合字段评估结果
   */
  aggregate(
    fieldResults: FieldEvaluationResultData[],
    fields: OutputFieldDefinition[],
    config: AggregationConfig
  ): AggregationResult {
    const mode = config.mode || 'all_pass'

    // 建立字段映射
    const fieldMap = new Map<string, OutputFieldDefinition>()
    for (const field of fields) {
      fieldMap.set(field.key, field)
    }

    // 计算基础统计
    const evaluatedResults = fieldResults.filter((r) => !r.skipped)
    const passedResults = evaluatedResults.filter((r) => r.passed)
    const failedResults = evaluatedResults.filter((r) => !r.passed)
    const skippedResults = fieldResults.filter((r) => r.skipped)

    // 检查关键字段
    const criticalFields = fields.filter((f) => f.evaluation.isCritical)
    const criticalResults = fieldResults.filter((r) => {
      const field = fieldMap.get(r.fieldKey)
      return field?.evaluation.isCritical && !r.skipped
    })
    const criticalFailed = criticalResults.some((r) => !r.passed)
    const failedCriticalFields = criticalResults
      .filter((r) => !r.passed)
      .map((r) => r.fieldKey)

    switch (mode) {
      case 'all_pass':
        return this.aggregateAllPass(
          evaluatedResults,
          passedResults,
          failedResults,
          skippedResults,
          criticalFailed,
          failedCriticalFields
        )

      case 'weighted_average':
        return this.aggregateWeightedAverage(
          fieldResults,
          fields,
          fieldMap,
          config.passThreshold ?? 0.6,
          skippedResults,
          criticalFailed,
          failedCriticalFields
        )

      case 'critical_first':
        return this.aggregateCriticalFirst(
          fieldResults,
          fields,
          fieldMap,
          evaluatedResults,
          passedResults,
          failedResults,
          skippedResults,
          criticalFields,
          criticalFailed,
          failedCriticalFields
        )

      case 'custom':
        return this.aggregateCustom(
          fieldResults,
          fields,
          fieldMap,
          config.customExpression,
          config.passThreshold ?? 0.6,
          skippedResults,
          criticalFailed,
          failedCriticalFields
        )

      default:
        // 默认使用 all_pass
        return this.aggregateAllPass(
          evaluatedResults,
          passedResults,
          failedResults,
          skippedResults,
          criticalFailed,
          failedCriticalFields
        )
    }
  }

  /**
   * all_pass 模式：所有评估字段必须通过
   */
  private aggregateAllPass(
    evaluatedResults: FieldEvaluationResultData[],
    passedResults: FieldEvaluationResultData[],
    failedResults: FieldEvaluationResultData[],
    skippedResults: FieldEvaluationResultData[],
    criticalFailed: boolean,
    failedCriticalFields: string[]
  ): AggregationResult {
    const allPassed = failedResults.length === 0
    const score =
      evaluatedResults.length > 0
        ? passedResults.length / evaluatedResults.length
        : 1

    let reason: string
    if (allPassed) {
      reason = `所有 ${evaluatedResults.length} 个字段评估通过`
    } else {
      const failedNames = failedResults.map((r) => r.fieldName).join(', ')
      reason = `${failedResults.length}/${evaluatedResults.length} 个字段未通过: ${failedNames}`
    }

    return {
      passed: allPassed,
      score,
      reason,
      details: {
        mode: 'all_pass',
        totalFields: evaluatedResults.length + skippedResults.length,
        evaluatedFields: evaluatedResults.length,
        passedFields: passedResults.length,
        failedFields: failedResults.length,
        skippedFields: skippedResults.length,
        criticalFailed,
        criticalFields: failedCriticalFields.length > 0 ? failedCriticalFields : undefined,
      },
    }
  }

  /**
   * weighted_average 模式：加权平均分 >= 阈值
   */
  private aggregateWeightedAverage(
    fieldResults: FieldEvaluationResultData[],
    fields: OutputFieldDefinition[],
    fieldMap: Map<string, OutputFieldDefinition>,
    passThreshold: number,
    skippedResults: FieldEvaluationResultData[],
    criticalFailed: boolean,
    failedCriticalFields: string[]
  ): AggregationResult {
    let totalWeight = 0
    let weightedScore = 0
    const weightedScores: Record<string, number> = {}

    for (const result of fieldResults) {
      if (result.skipped) continue

      const field = fieldMap.get(result.fieldKey)
      const weight = field?.evaluation.weight ?? 1

      totalWeight += weight
      const fieldScore = result.score ?? (result.passed ? 1 : 0)
      weightedScore += fieldScore * weight
      weightedScores[result.fieldKey] = fieldScore * weight
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0
    const passed = finalScore >= passThreshold

    const evaluatedResults = fieldResults.filter((r) => !r.skipped)
    const passedResults = evaluatedResults.filter((r) => r.passed)
    const failedResults = evaluatedResults.filter((r) => !r.passed)

    return {
      passed,
      score: finalScore,
      reason: `加权平均分 ${(finalScore * 100).toFixed(1)}% ${passed ? '>=' : '<'} 阈值 ${(passThreshold * 100).toFixed(1)}%`,
      details: {
        mode: 'weighted_average',
        totalFields: fieldResults.length,
        evaluatedFields: evaluatedResults.length,
        passedFields: passedResults.length,
        failedFields: failedResults.length,
        skippedFields: skippedResults.length,
        criticalFailed,
        criticalFields: failedCriticalFields.length > 0 ? failedCriticalFields : undefined,
        weightedScores,
        passThreshold,
      },
    }
  }

  /**
   * critical_first 模式：关键字段优先，关键字段全过则按加权计算
   */
  private aggregateCriticalFirst(
    fieldResults: FieldEvaluationResultData[],
    fields: OutputFieldDefinition[],
    fieldMap: Map<string, OutputFieldDefinition>,
    evaluatedResults: FieldEvaluationResultData[],
    passedResults: FieldEvaluationResultData[],
    failedResults: FieldEvaluationResultData[],
    skippedResults: FieldEvaluationResultData[],
    criticalFields: OutputFieldDefinition[],
    criticalFailed: boolean,
    failedCriticalFields: string[]
  ): AggregationResult {
    // 如果有关键字段失败，直接判定失败
    if (criticalFailed) {
      const failedNames = failedCriticalFields.join(', ')
      return {
        passed: false,
        score: 0,
        reason: `关键字段未通过: ${failedNames}`,
        details: {
          mode: 'critical_first',
          totalFields: fieldResults.length,
          evaluatedFields: evaluatedResults.length,
          passedFields: passedResults.length,
          failedFields: failedResults.length,
          skippedFields: skippedResults.length,
          criticalFailed: true,
          criticalFields: failedCriticalFields,
        },
      }
    }

    // 关键字段全部通过，计算非关键字段的加权平均
    let totalWeight = 0
    let weightedScore = 0
    const weightedScores: Record<string, number> = {}

    for (const result of fieldResults) {
      if (result.skipped) continue

      const field = fieldMap.get(result.fieldKey)
      const weight = field?.evaluation.weight ?? 1

      totalWeight += weight
      const fieldScore = result.score ?? (result.passed ? 1 : 0)
      weightedScore += fieldScore * weight
      weightedScores[result.fieldKey] = fieldScore * weight
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 1

    return {
      passed: true,
      score: finalScore,
      reason:
        criticalFields.length > 0
          ? `${criticalFields.length} 个关键字段全部通过，加权平均分 ${(finalScore * 100).toFixed(1)}%`
          : `无关键字段，加权平均分 ${(finalScore * 100).toFixed(1)}%`,
      details: {
        mode: 'critical_first',
        totalFields: fieldResults.length,
        evaluatedFields: evaluatedResults.length,
        passedFields: passedResults.length,
        failedFields: failedResults.length,
        skippedFields: skippedResults.length,
        criticalFailed: false,
        criticalFields:
          criticalFields.length > 0
            ? criticalFields.map((f) => f.key)
            : undefined,
        weightedScores,
      },
    }
  }

  /**
   * custom 模式：使用自定义表达式计算
   *
   * 表达式示例：
   * - "fields.problem_type.passed && fields.get_device.score > 0.8"
   * - "(fields.a.score + fields.b.score) / 2 > 0.7"
   */
  private aggregateCustom(
    fieldResults: FieldEvaluationResultData[],
    fields: OutputFieldDefinition[],
    fieldMap: Map<string, OutputFieldDefinition>,
    customExpression: string | undefined,
    passThreshold: number,
    skippedResults: FieldEvaluationResultData[],
    criticalFailed: boolean,
    failedCriticalFields: string[]
  ): AggregationResult {
    const evaluatedResults = fieldResults.filter((r) => !r.skipped)
    const passedResults = evaluatedResults.filter((r) => r.passed)
    const failedResults = evaluatedResults.filter((r) => !r.passed)

    // 如果没有表达式，回退到 weighted_average
    if (!customExpression || customExpression.trim() === '') {
      return this.aggregateWeightedAverage(
        fieldResults,
        fields,
        fieldMap,
        passThreshold,
        skippedResults,
        criticalFailed,
        failedCriticalFields
      )
    }

    // 构建字段结果映射供表达式使用
    const fieldsMap: Record<string, { passed: boolean; score: number; value: unknown }> = {}
    for (const result of fieldResults) {
      fieldsMap[result.fieldKey] = {
        passed: result.passed,
        score: result.score ?? (result.passed ? 1 : 0),
        value: result.fieldValue,
      }
    }

    try {
      // 安全检查表达式
      const forbiddenPatterns = [
        /eval\s*\(/i,
        /Function\s*\(/i,
        /constructor/i,
        /__proto__/i,
        /prototype/i,
        /window/i,
        /global/i,
        /process/i,
        /require/i,
        /import/i,
      ]

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(customExpression)) {
          throw new Error(`表达式包含禁止的关键字`)
        }
      }

      // 使用 Function 构造器执行表达式
      const evaluator = new Function(
        'fields',
        `"use strict"; return (${customExpression});`
      )

      const result = evaluator(fieldsMap)

      // 结果可以是 boolean 或 number
      let passed: boolean
      let score: number

      if (typeof result === 'boolean') {
        passed = result
        score = result ? 1 : 0
      } else if (typeof result === 'number') {
        score = Math.max(0, Math.min(1, result))  // 限制在 0-1 范围
        passed = score >= passThreshold
      } else {
        throw new Error('表达式必须返回 boolean 或 number 类型')
      }

      return {
        passed,
        score,
        reason: `自定义表达式计算结果: ${passed ? '通过' : '未通过'}，得分 ${(score * 100).toFixed(1)}%`,
        details: {
          mode: 'custom',
          totalFields: fieldResults.length,
          evaluatedFields: evaluatedResults.length,
          passedFields: passedResults.length,
          failedFields: failedResults.length,
          skippedFields: skippedResults.length,
          criticalFailed,
          criticalFields: failedCriticalFields.length > 0 ? failedCriticalFields : undefined,
          passThreshold,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        passed: false,
        score: 0,
        reason: `自定义表达式执行错误: ${message}`,
        details: {
          mode: 'custom',
          totalFields: fieldResults.length,
          evaluatedFields: evaluatedResults.length,
          passedFields: passedResults.length,
          failedFields: failedResults.length,
          skippedFields: skippedResults.length,
          criticalFailed,
          criticalFields: failedCriticalFields.length > 0 ? failedCriticalFields : undefined,
          passThreshold,
        },
      }
    }
  }
}

/**
 * 便捷函数：执行聚合
 */
export function aggregateFieldResults(
  fieldResults: FieldEvaluationResultData[],
  fields: OutputFieldDefinition[],
  config: AggregationConfig
): AggregationResult {
  const engine = new AggregationEngine()
  return engine.aggregate(fieldResults, fields, config)
}
