// 告警条件评估器

import type { AlertCondition } from '@platform/shared'

/**
 * 评估告警条件
 */
export function evaluateCondition(
  value: number,
  condition: AlertCondition,
  threshold: number
): boolean {
  switch (condition) {
    case 'LT':
      return value < threshold
    case 'GT':
      return value > threshold
    case 'EQ':
      return value === threshold
    case 'LTE':
      return value <= threshold
    case 'GTE':
      return value >= threshold
    default:
      return false
  }
}

/**
 * 获取条件描述
 */
export function getConditionDescription(
  condition: AlertCondition,
  threshold: number,
  metric: string
): string {
  const metricNames: Record<string, string> = {
    PASS_RATE: '通过率',
    AVG_LATENCY: '平均耗时',
    ERROR_RATE: '错误率',
    COST: '成本',
  }

  const conditionNames: Record<string, string> = {
    LT: '低于',
    GT: '高于',
    EQ: '等于',
    LTE: '不超过',
    GTE: '不低于',
  }

  const metricName = metricNames[metric] || metric
  const conditionName = conditionNames[condition] || condition

  // 格式化阈值
  let formattedThreshold: string
  if (metric === 'PASS_RATE' || metric === 'ERROR_RATE') {
    formattedThreshold = `${(threshold * 100).toFixed(1)}%`
  } else if (metric === 'AVG_LATENCY') {
    formattedThreshold = `${threshold}ms`
  } else if (metric === 'COST') {
    formattedThreshold = `$${threshold.toFixed(4)}`
  } else {
    formattedThreshold = String(threshold)
  }

  return `${metricName}${conditionName}${formattedThreshold}`
}
