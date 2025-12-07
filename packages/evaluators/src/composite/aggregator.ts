// 组合评估器结果聚合器

import type { EvaluatorOutput } from '../types'

export type AggregationType = 'and' | 'or' | 'weighted_average'

/**
 * 聚合多个评估结果
 */
export function aggregate(
  results: EvaluatorOutput[],
  aggregation: AggregationType,
  weights?: number[]
): EvaluatorOutput {
  if (results.length === 0) {
    return {
      passed: true,
      score: 1,
      reason: '无子评估器',
    }
  }

  switch (aggregation) {
    case 'and':
      return aggregateAnd(results)
    case 'or':
      return aggregateOr(results)
    case 'weighted_average':
      return aggregateWeightedAverage(results, weights)
    default:
      return aggregateAnd(results)
  }
}

/**
 * AND 聚合：所有评估器都必须通过
 */
function aggregateAnd(results: EvaluatorOutput[]): EvaluatorOutput {
  const allPassed = results.every((r) => r.passed)
  const scores = results.map((r) => r.score ?? (r.passed ? 1 : 0))
  const minScore = Math.min(...scores)

  const failedCount = results.filter((r) => !r.passed).length

  return {
    passed: allPassed,
    score: minScore,
    reason: allPassed
      ? `所有 ${results.length} 个评估器通过`
      : `${failedCount}/${results.length} 个评估器未通过`,
    details: {
      aggregation: 'and',
      totalCount: results.length,
      passedCount: results.length - failedCount,
      failedCount,
      individualResults: results,
    },
  }
}

/**
 * OR 聚合：至少一个评估器通过
 */
function aggregateOr(results: EvaluatorOutput[]): EvaluatorOutput {
  const anyPassed = results.some((r) => r.passed)
  const scores = results.map((r) => r.score ?? (r.passed ? 1 : 0))
  const maxScore = Math.max(...scores)

  const passedCount = results.filter((r) => r.passed).length

  return {
    passed: anyPassed,
    score: maxScore,
    reason: anyPassed
      ? `${passedCount}/${results.length} 个评估器通过`
      : `所有 ${results.length} 个评估器未通过`,
    details: {
      aggregation: 'or',
      totalCount: results.length,
      passedCount,
      failedCount: results.length - passedCount,
      individualResults: results,
    },
  }
}

/**
 * 加权平均聚合
 */
function aggregateWeightedAverage(
  results: EvaluatorOutput[],
  weights?: number[]
): EvaluatorOutput {
  // 如果没有提供权重，使用等权重
  const actualWeights = weights && weights.length === results.length
    ? weights
    : results.map(() => 1)

  const totalWeight = actualWeights.reduce((a, b) => a + b, 0)
  const weightedScore = results.reduce(
    (sum, r, i) => sum + (r.score ?? (r.passed ? 1 : 0)) * actualWeights[i],
    0
  ) / totalWeight

  // 默认通过阈值为 0.6
  const passed = weightedScore >= 0.6
  const passedCount = results.filter((r) => r.passed).length

  return {
    passed,
    score: weightedScore,
    reason: `加权平均分: ${(weightedScore * 100).toFixed(1)}%`,
    details: {
      aggregation: 'weighted_average',
      totalCount: results.length,
      passedCount,
      failedCount: results.length - passedCount,
      weights: actualWeights,
      individualResults: results,
    },
  }
}
