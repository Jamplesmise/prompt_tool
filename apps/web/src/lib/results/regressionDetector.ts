/**
 * 回归检测器
 * 自动检测版本间的回归问题
 */

import type { VersionSnapshot, Regression } from '@/components/results/types'

/**
 * 回归检测阈值配置
 */
type RegressionThresholds = {
  /** 通过率下降阈值（百分点） */
  passRateDropThreshold: number
  /** 延迟增加阈值（百分比） */
  latencyIncreaseThreshold: number
  /** 成本增加阈值（百分比） */
  costIncreaseThreshold: number
}

const DEFAULT_THRESHOLDS: RegressionThresholds = {
  passRateDropThreshold: 5,      // 通过率下降超过 5 个百分点
  latencyIncreaseThreshold: 20,  // 延迟增加超过 20%
  costIncreaseThreshold: 30,     // 成本增加超过 30%
}

/**
 * 计算变化百分比
 */
function calculateChangePercent(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * 判断严重程度
 */
function determineSeverity(
  type: Regression['type'],
  changePercent: number
): Regression['severity'] {
  switch (type) {
    case 'passRate_drop':
      if (changePercent >= 20) return 'high'
      if (changePercent >= 10) return 'medium'
      return 'low'

    case 'latency_increase':
      if (changePercent >= 50) return 'high'
      if (changePercent >= 30) return 'medium'
      return 'low'

    case 'cost_increase':
      if (changePercent >= 100) return 'high'
      if (changePercent >= 50) return 'medium'
      return 'low'

    default:
      return 'low'
  }
}

/**
 * 检测两个版本之间的回归
 */
function detectRegressionBetweenVersions(
  oldSnapshot: VersionSnapshot,
  newSnapshot: VersionSnapshot,
  thresholds: RegressionThresholds
): Regression[] {
  const regressions: Regression[] = []

  // 检测通过率下降
  const passRateDrop = oldSnapshot.metrics.passRate - newSnapshot.metrics.passRate
  if (passRateDrop >= thresholds.passRateDropThreshold) {
    regressions.push({
      type: 'passRate_drop',
      severity: determineSeverity('passRate_drop', passRateDrop),
      fromVersion: oldSnapshot.version,
      toVersion: newSnapshot.version,
      oldValue: oldSnapshot.metrics.passRate,
      newValue: newSnapshot.metrics.passRate,
      changePercent: -passRateDrop, // 负值表示下降
      affectedTests: [], // 需要进一步分析
    })
  }

  // 检测延迟增加
  if (oldSnapshot.metrics.avgLatency > 0) {
    const latencyChange = calculateChangePercent(
      oldSnapshot.metrics.avgLatency,
      newSnapshot.metrics.avgLatency
    )
    if (latencyChange >= thresholds.latencyIncreaseThreshold) {
      regressions.push({
        type: 'latency_increase',
        severity: determineSeverity('latency_increase', latencyChange),
        fromVersion: oldSnapshot.version,
        toVersion: newSnapshot.version,
        oldValue: oldSnapshot.metrics.avgLatency,
        newValue: newSnapshot.metrics.avgLatency,
        changePercent: latencyChange,
        affectedTests: [],
      })
    }
  }

  // 检测成本增加
  if (oldSnapshot.metrics.avgCost > 0) {
    const costChange = calculateChangePercent(
      oldSnapshot.metrics.avgCost,
      newSnapshot.metrics.avgCost
    )
    if (costChange >= thresholds.costIncreaseThreshold) {
      regressions.push({
        type: 'cost_increase',
        severity: determineSeverity('cost_increase', costChange),
        fromVersion: oldSnapshot.version,
        toVersion: newSnapshot.version,
        oldValue: oldSnapshot.metrics.avgCost,
        newValue: newSnapshot.metrics.avgCost,
        changePercent: costChange,
        affectedTests: [],
      })
    }
  }

  return regressions
}

/**
 * 检测所有版本之间的回归
 * @param snapshots 版本快照列表（按时间/版本升序）
 * @param thresholds 检测阈值
 * @returns 检测到的回归列表
 */
export function detectRegressions(
  snapshots: VersionSnapshot[],
  thresholds: Partial<RegressionThresholds> = {}
): Regression[] {
  if (snapshots.length < 2) {
    return []
  }

  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
  const regressions: Regression[] = []

  // 按版本排序
  const sortedSnapshots = [...snapshots].sort((a, b) => a.version - b.version)

  // 逐对比较相邻版本
  for (let i = 1; i < sortedSnapshots.length; i++) {
    const oldSnapshot = sortedSnapshots[i - 1]
    const newSnapshot = sortedSnapshots[i]

    const versionRegressions = detectRegressionBetweenVersions(
      oldSnapshot,
      newSnapshot,
      mergedThresholds
    )

    regressions.push(...versionRegressions)
  }

  // 按严重程度排序
  regressions.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return regressions
}

/**
 * 检测最近版本与基准版本之间的回归
 */
export function detectRegressionFromBaseline(
  baseline: VersionSnapshot,
  current: VersionSnapshot,
  thresholds: Partial<RegressionThresholds> = {}
): Regression[] {
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
  return detectRegressionBetweenVersions(baseline, current, mergedThresholds)
}

/**
 * 获取回归类型的中文名称
 */
export function getRegressionTypeName(type: Regression['type']): string {
  const names: Record<Regression['type'], string> = {
    passRate_drop: '通过率下降',
    latency_increase: '延迟增加',
    cost_increase: '成本增加',
  }
  return names[type]
}

/**
 * 获取严重程度的样式
 */
export function getSeverityStyle(severity: Regression['severity']): {
  color: string
  background: string
  text: string
} {
  const styles = {
    high: { color: '#ff4d4f', background: '#fff2f0', text: '高' },
    medium: { color: '#faad14', background: '#fffbe6', text: '中' },
    low: { color: '#1890ff', background: '#e6f7ff', text: '低' },
  }
  return styles[severity]
}

/**
 * 计算版本趋势
 */
export function calculateTrend(
  snapshots: VersionSnapshot[],
  metric: 'passRate' | 'avgLatency' | 'avgCost'
): 'up' | 'down' | 'stable' {
  if (snapshots.length < 2) return 'stable'

  const sortedSnapshots = [...snapshots].sort((a, b) => a.version - b.version)
  const values = sortedSnapshots.map(s => s.metrics[metric])

  // 简单线性回归计算斜率
  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((sum, val, i) => sum + i * val, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const avgValue = sumY / n

  // 判断趋势（相对于平均值的变化）
  const relativeSlope = avgValue !== 0 ? (slope / avgValue) * 100 : 0

  if (metric === 'passRate') {
    // 通过率：上升是好的
    if (relativeSlope > 2) return 'up'
    if (relativeSlope < -2) return 'down'
  } else {
    // 延迟和成本：下降是好的
    if (relativeSlope < -2) return 'up'
    if (relativeSlope > 2) return 'down'
  }

  return 'stable'
}
