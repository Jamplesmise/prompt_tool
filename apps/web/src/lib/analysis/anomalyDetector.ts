/**
 * 异常检测算法
 * 基于统计方法检测通过率、延迟等指标的异常
 */

import type { HistoryStats, HistoryDataPoint } from '@/services/historyStats'

/**
 * 异常类型
 */
export type AnomalyType =
  | 'sudden_drop'      // 突然下降
  | 'sudden_rise'      // 突然上升
  | 'trend_deviation'  // 趋势偏离
  | 'unusual_pattern'  // 异常模式
  | 'sustained_low'    // 持续低于阈值

/**
 * 异常严重程度
 */
export type AnomalySeverity = 'high' | 'medium' | 'low'

/**
 * 异常检测结果
 */
export type Anomaly = {
  type: AnomalyType
  severity: AnomalySeverity
  metric: 'passRate' | 'latency' | 'cost'
  currentValue: number
  expectedValue: number
  expectedRange: { min: number; max: number }
  deviation: number  // 偏离标准差的倍数
  deviationPercent: number  // 偏离百分比
  possibleCauses: string[]
  detectedAt: string
  description: string
}

/**
 * 检测配置
 */
export type DetectionConfig = {
  /** 标准差阈值（默认 2，超过 2 个标准差视为异常） */
  stdThreshold: number
  /** 最小数据点数量（少于此数量不检测） */
  minDataPoints: number
  /** 突降阈值（百分比，默认 15%） */
  dropThreshold: number
  /** 持续低阈值（连续 N 天低于平均值） */
  sustainedLowDays: number
  /** 绝对低阈值（通过率低于此值必定告警） */
  absoluteLowThreshold: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: DetectionConfig = {
  stdThreshold: 2,
  minDataPoints: 3,
  dropThreshold: 15,
  sustainedLowDays: 3,
  absoluteLowThreshold: 50,
}

/**
 * 计算线性回归趋势
 */
function calculateTrend(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] || 0 }

  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean

  return { slope, intercept }
}

/**
 * 计算预期值（基于趋势）
 */
function getExpectedValue(
  dataPoints: HistoryDataPoint[],
  metric: 'passRate' | 'avgLatency' | 'totalCost'
): number {
  if (dataPoints.length === 0) return 0

  const values = dataPoints.map(p => {
    if (metric === 'passRate') return p.passRate
    if (metric === 'avgLatency') return p.avgLatency || 0
    return p.totalCost
  })

  const { slope, intercept } = calculateTrend(values)
  return intercept + slope * dataPoints.length
}

/**
 * 检测突降异常
 */
function detectSuddenDrop(
  currentValue: number,
  previousValue: number,
  avgValue: number,
  stdDev: number,
  config: DetectionConfig
): Anomaly | null {
  const dropPercent = ((previousValue - currentValue) / previousValue) * 100

  if (dropPercent < config.dropThreshold) return null

  const deviation = stdDev > 0 ? (avgValue - currentValue) / stdDev : 0

  let severity: AnomalySeverity = 'low'
  if (deviation > 3 || dropPercent > 30) {
    severity = 'high'
  } else if (deviation > 2 || dropPercent > 20) {
    severity = 'medium'
  }

  return {
    type: 'sudden_drop',
    severity,
    metric: 'passRate',
    currentValue,
    expectedValue: previousValue,
    expectedRange: {
      min: Math.max(0, avgValue - config.stdThreshold * stdDev),
      max: Math.min(100, avgValue + config.stdThreshold * stdDev),
    },
    deviation,
    deviationPercent: dropPercent,
    possibleCauses: [
      '提示词内容可能被修改',
      '模型配置可能发生变化',
      '测试数据可能包含新的边缘用例',
      '模型服务可能不稳定',
    ],
    detectedAt: new Date().toISOString(),
    description: `通过率从 ${previousValue.toFixed(1)}% 突降至 ${currentValue.toFixed(1)}%，降幅 ${dropPercent.toFixed(1)}%`,
  }
}

/**
 * 检测趋势偏离
 */
function detectTrendDeviation(
  currentValue: number,
  expectedValue: number,
  avgValue: number,
  stdDev: number,
  config: DetectionConfig
): Anomaly | null {
  if (stdDev === 0) return null

  const deviation = (currentValue - expectedValue) / stdDev

  if (Math.abs(deviation) < config.stdThreshold) return null

  const isBelow = currentValue < expectedValue

  let severity: AnomalySeverity = 'low'
  if (Math.abs(deviation) > 3) {
    severity = 'high'
  } else if (Math.abs(deviation) > 2.5) {
    severity = 'medium'
  }

  return {
    type: 'trend_deviation',
    severity,
    metric: 'passRate',
    currentValue,
    expectedValue,
    expectedRange: {
      min: Math.max(0, avgValue - config.stdThreshold * stdDev),
      max: Math.min(100, avgValue + config.stdThreshold * stdDev),
    },
    deviation,
    deviationPercent: ((currentValue - expectedValue) / expectedValue) * 100,
    possibleCauses: isBelow
      ? [
          '近期表现持续下滑',
          '可能存在系统性问题',
          '数据集质量可能下降',
        ]
      : [
          '近期表现异常好',
          '可能存在数据异常',
          '评估标准可能过于宽松',
        ],
    detectedAt: new Date().toISOString(),
    description: isBelow
      ? `当前通过率 ${currentValue.toFixed(1)}% 显著低于预期趋势 ${expectedValue.toFixed(1)}%`
      : `当前通过率 ${currentValue.toFixed(1)}% 显著高于预期趋势 ${expectedValue.toFixed(1)}%`,
  }
}

/**
 * 检测持续低于阈值
 */
function detectSustainedLow(
  dataPoints: HistoryDataPoint[],
  avgValue: number,
  config: DetectionConfig
): Anomaly | null {
  if (dataPoints.length < config.sustainedLowDays) return null

  const recentPoints = dataPoints.slice(-config.sustainedLowDays)
  const allBelowAverage = recentPoints.every(p => p.passRate < avgValue)

  if (!allBelowAverage) return null

  const currentValue = recentPoints[recentPoints.length - 1].passRate
  const avgRecentValue = recentPoints.reduce((sum, p) => sum + p.passRate, 0) / recentPoints.length

  let severity: AnomalySeverity = 'low'
  if (avgRecentValue < config.absoluteLowThreshold) {
    severity = 'high'
  } else if (avgRecentValue < avgValue * 0.8) {
    severity = 'medium'
  }

  return {
    type: 'sustained_low',
    severity,
    metric: 'passRate',
    currentValue,
    expectedValue: avgValue,
    expectedRange: {
      min: avgValue * 0.9,
      max: avgValue * 1.1,
    },
    deviation: (avgValue - currentValue) / (avgValue || 1),
    deviationPercent: ((avgValue - currentValue) / (avgValue || 1)) * 100,
    possibleCauses: [
      '可能存在长期未解决的问题',
      '提示词可能需要优化',
      '模型选择可能不合适',
      '评估器配置可能需要调整',
    ],
    detectedAt: new Date().toISOString(),
    description: `最近 ${config.sustainedLowDays} 天通过率持续低于历史平均值 ${avgValue.toFixed(1)}%`,
  }
}

/**
 * 检测绝对低值
 */
function detectAbsoluteLow(
  currentValue: number,
  config: DetectionConfig
): Anomaly | null {
  if (currentValue >= config.absoluteLowThreshold) return null

  let severity: AnomalySeverity = 'medium'
  if (currentValue < 30) {
    severity = 'high'
  } else if (currentValue >= 40) {
    severity = 'low'
  }

  return {
    type: 'unusual_pattern',
    severity,
    metric: 'passRate',
    currentValue,
    expectedValue: config.absoluteLowThreshold,
    expectedRange: {
      min: config.absoluteLowThreshold,
      max: 100,
    },
    deviation: 0,
    deviationPercent: ((config.absoluteLowThreshold - currentValue) / config.absoluteLowThreshold) * 100,
    possibleCauses: [
      '通过率过低，需要立即关注',
      '可能存在严重的配置问题',
      '提示词可能与任务不匹配',
      '模型能力可能不足以处理此类任务',
    ],
    detectedAt: new Date().toISOString(),
    description: `当前通过率 ${currentValue.toFixed(1)}% 低于最低阈值 ${config.absoluteLowThreshold}%`,
  }
}

/**
 * 主检测函数：检测通过率异常
 */
export function detectAnomaly(
  currentValue: number,
  historyStats: HistoryStats,
  config: Partial<DetectionConfig> = {}
): Anomaly | null {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const { dataPoints, avgPassRate, stdDeviation } = historyStats

  // 数据点不足，不检测
  if (dataPoints.length < cfg.minDataPoints) {
    return null
  }

  // 获取前一个值
  const previousValue = dataPoints.length > 1
    ? dataPoints[dataPoints.length - 2].passRate
    : avgPassRate

  // 计算预期值
  const expectedValue = getExpectedValue(dataPoints, 'passRate')

  // 按优先级检测各类异常

  // 1. 检测绝对低值（最高优先级）
  const absoluteLowAnomaly = detectAbsoluteLow(currentValue, cfg)
  if (absoluteLowAnomaly && absoluteLowAnomaly.severity === 'high') {
    return absoluteLowAnomaly
  }

  // 2. 检测突降
  const suddenDropAnomaly = detectSuddenDrop(
    currentValue,
    previousValue,
    avgPassRate,
    stdDeviation,
    cfg
  )
  if (suddenDropAnomaly) {
    return suddenDropAnomaly
  }

  // 3. 检测趋势偏离
  const trendDeviationAnomaly = detectTrendDeviation(
    currentValue,
    expectedValue,
    avgPassRate,
    stdDeviation,
    cfg
  )
  if (trendDeviationAnomaly) {
    return trendDeviationAnomaly
  }

  // 4. 检测持续低于阈值
  const sustainedLowAnomaly = detectSustainedLow(dataPoints, avgPassRate, cfg)
  if (sustainedLowAnomaly) {
    return sustainedLowAnomaly
  }

  // 5. 返回较低优先级的绝对低值异常
  if (absoluteLowAnomaly) {
    return absoluteLowAnomaly
  }

  return null
}

/**
 * 批量检测多个维度的异常
 */
export function detectAnomalies(
  historyStatsList: HistoryStats[],
  config: Partial<DetectionConfig> = {}
): Array<Anomaly & { promptId: string; modelId: string }> {
  const anomalies: Array<Anomaly & { promptId: string; modelId: string }> = []

  for (const stats of historyStatsList) {
    if (stats.dataPoints.length === 0) continue

    const currentValue = stats.dataPoints[stats.dataPoints.length - 1].passRate
    const anomaly = detectAnomaly(currentValue, stats, config)

    if (anomaly) {
      anomalies.push({
        ...anomaly,
        promptId: stats.promptId,
        modelId: stats.modelId,
      })
    }
  }

  // 按严重程度排序
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * 获取异常类型的显示名称
 */
export function getAnomalyTypeName(type: AnomalyType): string {
  const names: Record<AnomalyType, string> = {
    sudden_drop: '通过率突降',
    sudden_rise: '通过率突升',
    trend_deviation: '趋势偏离',
    unusual_pattern: '异常模式',
    sustained_low: '持续低迷',
  }
  return names[type]
}

/**
 * 获取严重程度的显示样式
 */
export function getSeverityStyle(severity: AnomalySeverity): {
  color: string
  bgColor: string
  label: string
} {
  const styles: Record<AnomalySeverity, { color: string; bgColor: string; label: string }> = {
    high: { color: '#cf1322', bgColor: '#fff1f0', label: '严重' },
    medium: { color: '#d46b08', bgColor: '#fff7e6', label: '中等' },
    low: { color: '#d48806', bgColor: '#fffbe6', label: '轻微' },
  }
  return styles[severity]
}
