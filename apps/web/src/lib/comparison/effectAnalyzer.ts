/**
 * 效果变化分析器
 * 分析版本变化带来的效果影响，提供改进建议和风险提示
 */

import type { MetricsComparison, VersionMetrics, MetricChange } from './metricsCalculator'
import type { DiffResult } from './diffGenerator'

export type ImpactLevel = 'high' | 'medium' | 'low'

export type Improvement = {
  label: string
  description: string
  impact: ImpactLevel
  metric?: string
  change?: number
}

export type Risk = {
  label: string
  description: string
  severity: ImpactLevel
  metric?: string
  change?: number
}

export type Recommendation = 'publish' | 'review' | 'rollback'

export type EffectAnalysis = {
  improvements: Improvement[]
  risks: Risk[]
  recommendation: Recommendation
  recommendationReason: string
  confidenceLevel: number      // 分析置信度 (0-1)
  summary: string              // 一句话总结
}

/**
 * 判断影响程度
 */
function getImpactLevel(percentage: number): ImpactLevel {
  const absPercentage = Math.abs(percentage)
  if (absPercentage >= 20) return 'high'
  if (absPercentage >= 10) return 'medium'
  return 'low'
}

/**
 * 分析指标变化产生的改进
 */
function analyzeImprovements(comparison: MetricsComparison): Improvement[] {
  const improvements: Improvement[] = []
  const { changes, old, new: newMetrics } = comparison

  // 通过率改进
  if (changes.passRate.isImprovement && changes.passRate.direction !== 'same') {
    const impact = getImpactLevel(changes.passRate.percentage)
    improvements.push({
      label: '通过率提升',
      description: `通过率从 ${(old.passRate * 100).toFixed(1)}% 提升至 ${(newMetrics.passRate * 100).toFixed(1)}%，提升了 ${changes.passRate.percentage.toFixed(1)}%`,
      impact,
      metric: 'passRate',
      change: changes.passRate.value,
    })
  }

  // 延迟改进（降低）
  if (changes.avgLatency.isImprovement && changes.avgLatency.direction !== 'same') {
    const impact = getImpactLevel(changes.avgLatency.percentage)
    improvements.push({
      label: '响应更快',
      description: `平均延迟从 ${old.avgLatency.toFixed(2)}s 降至 ${newMetrics.avgLatency.toFixed(2)}s，减少了 ${Math.abs(changes.avgLatency.percentage).toFixed(1)}%`,
      impact,
      metric: 'avgLatency',
      change: changes.avgLatency.value,
    })
  }

  // Token 改进（降低）
  if (changes.avgTokens.isImprovement && changes.avgTokens.direction !== 'same') {
    const impact = getImpactLevel(changes.avgTokens.percentage)
    improvements.push({
      label: 'Token 消耗降低',
      description: `平均 Token 从 ${old.avgTokens} 降至 ${newMetrics.avgTokens}，节省了 ${Math.abs(changes.avgTokens.percentage).toFixed(1)}%`,
      impact,
      metric: 'avgTokens',
      change: changes.avgTokens.value,
    })
  }

  // 成本改进（降低）
  if (changes.estimatedCost.isImprovement && changes.estimatedCost.direction !== 'same') {
    const impact = getImpactLevel(changes.estimatedCost.percentage)
    improvements.push({
      label: '成本降低',
      description: `预估成本从 $${old.estimatedCost.toFixed(4)} 降至 $${newMetrics.estimatedCost.toFixed(4)}，节省了 ${Math.abs(changes.estimatedCost.percentage).toFixed(1)}%`,
      impact,
      metric: 'estimatedCost',
      change: changes.estimatedCost.value,
    })
  }

  // 格式准确率改进
  if (changes.formatAccuracy.isImprovement && changes.formatAccuracy.direction !== 'same') {
    const impact = getImpactLevel(changes.formatAccuracy.percentage)
    improvements.push({
      label: '格式准确率提升',
      description: `格式准确率从 ${(old.formatAccuracy * 100).toFixed(1)}% 提升至 ${(newMetrics.formatAccuracy * 100).toFixed(1)}%`,
      impact,
      metric: 'formatAccuracy',
      change: changes.formatAccuracy.value,
    })
  }

  // 评分改进
  if (changes.avgScore?.isImprovement && changes.avgScore.direction !== 'same') {
    const impact = getImpactLevel(changes.avgScore.percentage)
    improvements.push({
      label: '评估分数提升',
      description: `平均评分从 ${old.avgScore?.toFixed(2)} 提升至 ${newMetrics.avgScore?.toFixed(2)}`,
      impact,
      metric: 'avgScore',
      change: changes.avgScore.value,
    })
  }

  // 按影响程度排序
  return improvements.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.impact] - order[b.impact]
  })
}

/**
 * 分析指标变化产生的风险
 */
function analyzeRisks(comparison: MetricsComparison): Risk[] {
  const risks: Risk[] = []
  const { changes, old, new: newMetrics } = comparison

  // 通过率下降
  if (!changes.passRate.isImprovement && changes.passRate.direction !== 'same') {
    const severity = getImpactLevel(changes.passRate.percentage)
    risks.push({
      label: '通过率下降',
      description: `通过率从 ${(old.passRate * 100).toFixed(1)}% 下降至 ${(newMetrics.passRate * 100).toFixed(1)}%，下降了 ${Math.abs(changes.passRate.percentage).toFixed(1)}%`,
      severity,
      metric: 'passRate',
      change: changes.passRate.value,
    })
  }

  // 延迟增加
  if (!changes.avgLatency.isImprovement && changes.avgLatency.direction !== 'same') {
    const severity = getImpactLevel(changes.avgLatency.percentage)
    risks.push({
      label: '响应变慢',
      description: `平均延迟从 ${old.avgLatency.toFixed(2)}s 增至 ${newMetrics.avgLatency.toFixed(2)}s，增加了 ${Math.abs(changes.avgLatency.percentage).toFixed(1)}%`,
      severity,
      metric: 'avgLatency',
      change: changes.avgLatency.value,
    })
  }

  // Token 增加
  if (!changes.avgTokens.isImprovement && changes.avgTokens.direction !== 'same') {
    const severity = getImpactLevel(changes.avgTokens.percentage)
    risks.push({
      label: 'Token 消耗增加',
      description: `平均 Token 从 ${old.avgTokens} 增至 ${newMetrics.avgTokens}，增加了 ${Math.abs(changes.avgTokens.percentage).toFixed(1)}%`,
      severity,
      metric: 'avgTokens',
      change: changes.avgTokens.value,
    })
  }

  // 成本增加
  if (!changes.estimatedCost.isImprovement && changes.estimatedCost.direction !== 'same') {
    const severity = getImpactLevel(changes.estimatedCost.percentage)
    risks.push({
      label: '成本增加',
      description: `预估成本从 $${old.estimatedCost.toFixed(4)} 增至 $${newMetrics.estimatedCost.toFixed(4)}，增加了 ${Math.abs(changes.estimatedCost.percentage).toFixed(1)}%`,
      severity,
      metric: 'estimatedCost',
      change: changes.estimatedCost.value,
    })
  }

  // 格式准确率下降
  if (!changes.formatAccuracy.isImprovement && changes.formatAccuracy.direction !== 'same') {
    const severity = getImpactLevel(changes.formatAccuracy.percentage)
    risks.push({
      label: '格式准确率下降',
      description: `格式准确率从 ${(old.formatAccuracy * 100).toFixed(1)}% 下降至 ${(newMetrics.formatAccuracy * 100).toFixed(1)}%`,
      severity,
      metric: 'formatAccuracy',
      change: changes.formatAccuracy.value,
    })
  }

  // 评分下降
  if (changes.avgScore && !changes.avgScore.isImprovement && changes.avgScore.direction !== 'same') {
    const severity = getImpactLevel(changes.avgScore.percentage)
    risks.push({
      label: '评估分数下降',
      description: `平均评分从 ${old.avgScore?.toFixed(2)} 下降至 ${newMetrics.avgScore?.toFixed(2)}`,
      severity,
      metric: 'avgScore',
      change: changes.avgScore.value,
    })
  }

  // 按严重程度排序
  return risks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })
}

/**
 * 生成推荐建议
 */
function generateRecommendation(
  improvements: Improvement[],
  risks: Risk[],
  comparison: MetricsComparison
): { recommendation: Recommendation; reason: string } {
  const highRisks = risks.filter(r => r.severity === 'high')
  const highImprovements = improvements.filter(i => i.impact === 'high')

  // 有高严重度风险且通过率下降
  if (highRisks.some(r => r.metric === 'passRate')) {
    return {
      recommendation: 'rollback',
      reason: '通过率显著下降，建议回滚到之前的版本',
    }
  }

  // 多个高严重度风险
  if (highRisks.length >= 2) {
    return {
      recommendation: 'rollback',
      reason: '存在多个高风险问题，建议回滚并重新优化',
    }
  }

  // 有风险但也有改进，需要人工评审
  if (risks.length > 0 && improvements.length > 0) {
    return {
      recommendation: 'review',
      reason: '版本变化存在风险和改进，建议人工评审后决定',
    }
  }

  // 只有风险没有改进
  if (risks.length > 0 && improvements.length === 0) {
    return {
      recommendation: 'rollback',
      reason: '版本变化没有带来改进，且存在风险',
    }
  }

  // 只有改进没有风险
  if (improvements.length > 0 && risks.length === 0) {
    // 有高影响改进
    if (highImprovements.length > 0) {
      return {
        recommendation: 'publish',
        reason: '版本改进显著，建议发布新版本',
      }
    }
    return {
      recommendation: 'publish',
      reason: '版本有所改进且无风险，可以发布',
    }
  }

  // 没有明显变化
  return {
    recommendation: 'review',
    reason: '版本变化不明显，建议评估是否需要发布',
  }
}

/**
 * 生成一句话总结
 */
function generateSummary(
  improvements: Improvement[],
  risks: Risk[],
  recommendation: Recommendation
): string {
  if (improvements.length === 0 && risks.length === 0) {
    return '两个版本的效果基本相同，无明显变化'
  }

  const parts: string[] = []

  if (improvements.length > 0) {
    const mainImprovement = improvements[0]
    parts.push(`主要改进：${mainImprovement.label}`)
  }

  if (risks.length > 0) {
    const mainRisk = risks[0]
    parts.push(`主要风险：${mainRisk.label}`)
  }

  const recommendationText = {
    publish: '建议发布',
    review: '建议评审',
    rollback: '建议回滚',
  }

  parts.push(recommendationText[recommendation])

  return parts.join('；')
}

/**
 * 计算分析置信度
 */
function calculateConfidence(comparison: MetricsComparison): number {
  const { old, new: newMetrics } = comparison

  // 基于测试数量的置信度
  const minTests = Math.min(old.totalTests, newMetrics.totalTests)

  if (minTests === 0) return 0
  if (minTests < 10) return 0.3
  if (minTests < 50) return 0.6
  if (minTests < 100) return 0.8
  return 0.95
}

/**
 * 分析版本变化的效果
 */
export function analyzeEffect(
  comparison: MetricsComparison,
  diff?: DiffResult
): EffectAnalysis {
  const improvements = analyzeImprovements(comparison)
  const risks = analyzeRisks(comparison)
  const { recommendation, reason } = generateRecommendation(improvements, risks, comparison)
  const summary = generateSummary(improvements, risks, recommendation)
  const confidenceLevel = calculateConfidence(comparison)

  // 如果有 diff 信息，可以添加基于文本变化的分析
  if (diff) {
    // 大量删除可能是风险
    if (diff.stats.deletions > 10 && diff.stats.additions < diff.stats.deletions / 2) {
      risks.push({
        label: '大量内容删除',
        description: `删除了 ${diff.stats.deletions} 行内容，可能丢失重要信息`,
        severity: 'medium',
      })
    }

    // 大量新增可能需要关注
    if (diff.stats.additions > 20) {
      // 不一定是风险，但值得注意
    }
  }

  return {
    improvements,
    risks,
    recommendation,
    recommendationReason: reason,
    confidenceLevel,
    summary,
  }
}

/**
 * 快速分析（不需要完整的 MetricsComparison）
 */
export function quickAnalyze(
  oldMetrics: VersionMetrics,
  newMetrics: VersionMetrics
): {
  isImproved: boolean
  mainChange: string
  riskLevel: 'none' | 'low' | 'medium' | 'high'
} {
  // 计算通过率变化
  const passRateDiff = newMetrics.passRate - oldMetrics.passRate

  // 简单判断
  const isImproved = passRateDiff >= 0

  let mainChange: string
  if (Math.abs(passRateDiff) < 0.01) {
    mainChange = '效果基本持平'
  } else if (passRateDiff > 0) {
    mainChange = `通过率提升 ${(passRateDiff * 100).toFixed(1)}%`
  } else {
    mainChange = `通过率下降 ${(Math.abs(passRateDiff) * 100).toFixed(1)}%`
  }

  let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none'
  if (passRateDiff < -0.2) {
    riskLevel = 'high'
  } else if (passRateDiff < -0.1) {
    riskLevel = 'medium'
  } else if (passRateDiff < 0) {
    riskLevel = 'low'
  }

  return { isImproved, mainChange, riskLevel }
}

/**
 * 获取推荐操作的说明
 */
export function getRecommendationExplanation(recommendation: Recommendation): {
  title: string
  description: string
  color: string
  actions: string[]
} {
  switch (recommendation) {
    case 'publish':
      return {
        title: '建议发布',
        description: '新版本表现良好，建议发布到生产环境',
        color: 'green',
        actions: [
          '确认测试覆盖足够',
          '发布新版本',
          '监控上线后指标',
        ],
      }
    case 'review':
      return {
        title: '建议评审',
        description: '版本变化需要人工评估，权衡利弊后决定',
        color: 'orange',
        actions: [
          '仔细查看改进和风险项',
          '评估业务影响',
          '考虑是否需要更多测试',
        ],
      }
    case 'rollback':
      return {
        title: '建议回滚',
        description: '新版本存在明显问题，建议继续使用旧版本',
        color: 'red',
        actions: [
          '分析问题原因',
          '优化提示词内容',
          '重新测试后再评估',
        ],
      }
  }
}
