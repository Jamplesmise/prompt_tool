/**
 * 版本指标计算器
 * 计算和对比提示词版本的性能指标
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export type VersionMetrics = {
  versionId: string
  version: number
  passRate: number           // 通过率 (0-1)
  avgLatency: number         // 平均延迟（秒）
  avgTokens: number          // 平均 Token 消耗
  estimatedCost: number      // 预估成本（美元）
  formatAccuracy: number     // 格式准确率 (0-1)
  totalTests: number         // 测试总数
  passedTests: number        // 通过的测试数
  failedTests: number        // 失败的测试数
  avgScore: number | null    // 平均评分 (0-1)
}

export type ChangeDirection = 'up' | 'down' | 'same'

export type MetricChange = {
  value: number
  percentage: number
  direction: ChangeDirection
  isImprovement: boolean     // 是否是改进（考虑指标特性）
}

export type MetricsComparison = {
  old: VersionMetrics
  new: VersionMetrics
  changes: {
    passRate: MetricChange
    avgLatency: MetricChange
    avgTokens: MetricChange
    estimatedCost: MetricChange
    formatAccuracy: MetricChange
    avgScore: MetricChange | null
  }
  overallImprovement: boolean  // 整体是否改进
  improvementScore: number     // 改进分数 (-100 到 100)
}

/**
 * 计算变化方向
 */
function getChangeDirection(oldValue: number, newValue: number, threshold = 0.001): ChangeDirection {
  const diff = newValue - oldValue
  if (Math.abs(diff) < threshold) return 'same'
  return diff > 0 ? 'up' : 'down'
}

/**
 * 计算变化百分比
 */
function getChangePercentage(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100
  }
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * 判断变化是否是改进
 * @param direction 变化方向
 * @param higherIsBetter 是否值越高越好
 */
function isChangeImprovement(direction: ChangeDirection, higherIsBetter: boolean): boolean {
  if (direction === 'same') return true
  return higherIsBetter ? direction === 'up' : direction === 'down'
}

/**
 * 计算指定任务的版本指标
 * @param taskId 任务 ID
 * @param promptVersionId 提示词版本 ID
 */
export async function calculateMetricsForTask(
  taskId: string,
  promptVersionId: string
): Promise<VersionMetrics | null> {
  // 获取版本信息
  const version = await prisma.promptVersion.findUnique({
    where: { id: promptVersionId },
  })

  if (!version) return null

  // 获取该版本在任务中的所有结果
  const results = await prisma.taskResult.findMany({
    where: {
      taskId,
      promptVersionId,
      status: { in: ['SUCCESS', 'FAILED'] },
    },
    include: {
      evaluations: true,
    },
  })

  if (results.length === 0) {
    return {
      versionId: promptVersionId,
      version: version.version,
      passRate: 0,
      avgLatency: 0,
      avgTokens: 0,
      estimatedCost: 0,
      formatAccuracy: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      avgScore: null,
    }
  }

  // 计算指标
  let totalLatency = 0
  let totalTokens = 0
  let totalCost = 0
  let passedCount = 0
  let formatPassedCount = 0
  let totalScore = 0
  let scoreCount = 0

  for (const result of results) {
    // 延迟（毫秒转秒）
    if (result.latencyMs) {
      totalLatency += result.latencyMs / 1000
    }

    // Token
    const tokens = result.tokens as { total?: number } | null
    if (tokens?.total) {
      totalTokens += tokens.total
    }

    // 成本
    if (result.cost) {
      totalCost += Number(result.cost)
    }

    // 评估结果
    const hasEvaluations = result.evaluations.length > 0
    const allPassed = hasEvaluations && result.evaluations.every(e => e.passed)

    if (allPassed) {
      passedCount++
    }

    // 格式准确率（基于 JSON 格式评估器或类似的）
    const formatEval = result.evaluations.find(e =>
      e.evaluatorId.includes('format') || e.evaluatorId.includes('json')
    )
    if (formatEval?.passed) {
      formatPassedCount++
    } else if (!formatEval && result.status === 'SUCCESS') {
      // 如果没有格式评估器，默认成功的都算格式正确
      formatPassedCount++
    }

    // 评分
    for (const evalResult of result.evaluations) {
      if (evalResult.score !== null) {
        totalScore += Number(evalResult.score)
        scoreCount++
      }
    }
  }

  const totalTests = results.length

  return {
    versionId: promptVersionId,
    version: version.version,
    passRate: totalTests > 0 ? passedCount / totalTests : 0,
    avgLatency: totalTests > 0 ? totalLatency / totalTests : 0,
    avgTokens: totalTests > 0 ? Math.round(totalTokens / totalTests) : 0,
    estimatedCost: totalCost,
    formatAccuracy: totalTests > 0 ? formatPassedCount / totalTests : 0,
    totalTests,
    passedTests: passedCount,
    failedTests: totalTests - passedCount,
    avgScore: scoreCount > 0 ? totalScore / scoreCount : null,
  }
}

/**
 * 计算指定提示词版本的历史指标（跨所有任务）
 * @param promptVersionId 提示词版本 ID
 */
export async function calculateMetricsForVersion(
  promptVersionId: string
): Promise<VersionMetrics | null> {
  const version = await prisma.promptVersion.findUnique({
    where: { id: promptVersionId },
  })

  if (!version) return null

  // 获取该版本的所有结果
  const results = await prisma.taskResult.findMany({
    where: {
      promptVersionId,
      status: { in: ['SUCCESS', 'FAILED'] },
    },
    include: {
      evaluations: true,
    },
  })

  if (results.length === 0) {
    return {
      versionId: promptVersionId,
      version: version.version,
      passRate: 0,
      avgLatency: 0,
      avgTokens: 0,
      estimatedCost: 0,
      formatAccuracy: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      avgScore: null,
    }
  }

  // 计算指标（同上）
  let totalLatency = 0
  let totalTokens = 0
  let totalCost = 0
  let passedCount = 0
  let formatPassedCount = 0
  let totalScore = 0
  let scoreCount = 0

  for (const result of results) {
    if (result.latencyMs) {
      totalLatency += result.latencyMs / 1000
    }

    const tokens = result.tokens as { total?: number } | null
    if (tokens?.total) {
      totalTokens += tokens.total
    }

    if (result.cost) {
      totalCost += Number(result.cost)
    }

    const hasEvaluations = result.evaluations.length > 0
    const allPassed = hasEvaluations && result.evaluations.every(e => e.passed)

    if (allPassed) {
      passedCount++
    }

    if (result.status === 'SUCCESS') {
      formatPassedCount++
    }

    for (const evalResult of result.evaluations) {
      if (evalResult.score !== null) {
        totalScore += Number(evalResult.score)
        scoreCount++
      }
    }
  }

  const totalTests = results.length

  return {
    versionId: promptVersionId,
    version: version.version,
    passRate: totalTests > 0 ? passedCount / totalTests : 0,
    avgLatency: totalTests > 0 ? totalLatency / totalTests : 0,
    avgTokens: totalTests > 0 ? Math.round(totalTokens / totalTests) : 0,
    estimatedCost: totalCost,
    formatAccuracy: totalTests > 0 ? formatPassedCount / totalTests : 0,
    totalTests,
    passedTests: passedCount,
    failedTests: totalTests - passedCount,
    avgScore: scoreCount > 0 ? totalScore / scoreCount : null,
  }
}

/**
 * 对比两个版本的指标
 */
export function compareMetrics(
  oldMetrics: VersionMetrics,
  newMetrics: VersionMetrics
): MetricsComparison {
  // 通过率：越高越好
  const passRateChange: MetricChange = {
    value: newMetrics.passRate - oldMetrics.passRate,
    percentage: getChangePercentage(oldMetrics.passRate, newMetrics.passRate),
    direction: getChangeDirection(oldMetrics.passRate, newMetrics.passRate),
    isImprovement: isChangeImprovement(
      getChangeDirection(oldMetrics.passRate, newMetrics.passRate),
      true
    ),
  }

  // 延迟：越低越好
  const latencyChange: MetricChange = {
    value: newMetrics.avgLatency - oldMetrics.avgLatency,
    percentage: getChangePercentage(oldMetrics.avgLatency, newMetrics.avgLatency),
    direction: getChangeDirection(oldMetrics.avgLatency, newMetrics.avgLatency),
    isImprovement: isChangeImprovement(
      getChangeDirection(oldMetrics.avgLatency, newMetrics.avgLatency),
      false
    ),
  }

  // Token：越低越好
  const tokensChange: MetricChange = {
    value: newMetrics.avgTokens - oldMetrics.avgTokens,
    percentage: getChangePercentage(oldMetrics.avgTokens, newMetrics.avgTokens),
    direction: getChangeDirection(oldMetrics.avgTokens, newMetrics.avgTokens, 1),
    isImprovement: isChangeImprovement(
      getChangeDirection(oldMetrics.avgTokens, newMetrics.avgTokens, 1),
      false
    ),
  }

  // 成本：越低越好
  const costChange: MetricChange = {
    value: newMetrics.estimatedCost - oldMetrics.estimatedCost,
    percentage: getChangePercentage(oldMetrics.estimatedCost, newMetrics.estimatedCost),
    direction: getChangeDirection(oldMetrics.estimatedCost, newMetrics.estimatedCost, 0.0001),
    isImprovement: isChangeImprovement(
      getChangeDirection(oldMetrics.estimatedCost, newMetrics.estimatedCost, 0.0001),
      false
    ),
  }

  // 格式准确率：越高越好
  const formatChange: MetricChange = {
    value: newMetrics.formatAccuracy - oldMetrics.formatAccuracy,
    percentage: getChangePercentage(oldMetrics.formatAccuracy, newMetrics.formatAccuracy),
    direction: getChangeDirection(oldMetrics.formatAccuracy, newMetrics.formatAccuracy),
    isImprovement: isChangeImprovement(
      getChangeDirection(oldMetrics.formatAccuracy, newMetrics.formatAccuracy),
      true
    ),
  }

  // 评分：越高越好
  let scoreChange: MetricChange | null = null
  if (oldMetrics.avgScore !== null && newMetrics.avgScore !== null) {
    scoreChange = {
      value: newMetrics.avgScore - oldMetrics.avgScore,
      percentage: getChangePercentage(oldMetrics.avgScore, newMetrics.avgScore),
      direction: getChangeDirection(oldMetrics.avgScore, newMetrics.avgScore),
      isImprovement: isChangeImprovement(
        getChangeDirection(oldMetrics.avgScore, newMetrics.avgScore),
        true
      ),
    }
  }

  // 计算整体改进分数
  // 权重：通过率 40%，延迟 20%，成本 20%，格式 20%
  const weights = {
    passRate: 0.4,
    latency: 0.2,
    cost: 0.2,
    format: 0.2,
  }

  let improvementScore = 0
  improvementScore += (passRateChange.isImprovement ? 1 : -1) * Math.abs(passRateChange.percentage) * weights.passRate
  improvementScore += (latencyChange.isImprovement ? 1 : -1) * Math.abs(latencyChange.percentage) * weights.latency
  improvementScore += (costChange.isImprovement ? 1 : -1) * Math.abs(costChange.percentage) * weights.cost
  improvementScore += (formatChange.isImprovement ? 1 : -1) * Math.abs(formatChange.percentage) * weights.format

  // 限制在 -100 到 100 之间
  improvementScore = Math.max(-100, Math.min(100, improvementScore))

  return {
    old: oldMetrics,
    new: newMetrics,
    changes: {
      passRate: passRateChange,
      avgLatency: latencyChange,
      avgTokens: tokensChange,
      estimatedCost: costChange,
      formatAccuracy: formatChange,
      avgScore: scoreChange,
    },
    overallImprovement: improvementScore > 0,
    improvementScore,
  }
}

/**
 * 格式化指标为显示文本
 */
export function formatMetricValue(
  metric: keyof VersionMetrics,
  value: number | null
): string {
  if (value === null) return '-'

  switch (metric) {
    case 'passRate':
    case 'formatAccuracy':
      return `${(value * 100).toFixed(1)}%`
    case 'avgLatency':
      return `${value.toFixed(2)}s`
    case 'avgTokens':
      return `${Math.round(value)}`
    case 'estimatedCost':
      return `$${value.toFixed(4)}`
    case 'avgScore':
      return value.toFixed(2)
    default:
      return String(value)
  }
}

/**
 * 获取变化的显示文本
 */
export function formatChangeText(change: MetricChange, metric: string): string {
  if (change.direction === 'same') {
    return '无变化'
  }

  const arrow = change.direction === 'up' ? '↑' : '↓'
  const sign = change.value > 0 ? '+' : ''

  // 根据指标类型格式化
  if (metric === 'passRate' || metric === 'formatAccuracy') {
    return `${arrow} ${sign}${(change.value * 100).toFixed(1)}%`
  }
  if (metric === 'avgLatency') {
    return `${arrow} ${sign}${change.value.toFixed(2)}s`
  }
  if (metric === 'estimatedCost') {
    return `${arrow} ${sign}$${change.value.toFixed(4)}`
  }

  return `${arrow} ${sign}${change.percentage.toFixed(1)}%`
}
