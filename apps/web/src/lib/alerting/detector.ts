// 告警检测器

import { prisma } from '../prisma'
import { getMetricValue } from '../metrics/aggregator'
import { evaluateCondition } from './evaluator'
import type { AlertMetric, AlertScope } from '@platform/shared'

/**
 * 检查单个告警规则
 */
async function checkAlertRule(ruleId: string): Promise<{
  triggered: boolean
  value: number
}> {
  const rule = await prisma.alertRule.findUnique({
    where: { id: ruleId },
  })

  if (!rule || !rule.isActive) {
    return { triggered: false, value: 0 }
  }

  // 检查静默期
  const lastAlert = await prisma.alert.findFirst({
    where: {
      ruleId,
      createdAt: {
        gte: new Date(Date.now() - rule.silencePeriod * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (lastAlert) {
    // 在静默期内，不触发新告警
    return { triggered: false, value: 0 }
  }

  // 获取指标值
  const metricMap: Record<string, 'pass_rate' | 'avg_latency' | 'error_rate' | 'cost'> = {
    PASS_RATE: 'pass_rate',
    AVG_LATENCY: 'avg_latency',
    ERROR_RATE: 'error_rate',
    COST: 'cost',
  }

  const metric = metricMap[rule.metric]
  const scope = rule.scope as AlertScope | null

  const value = await getMetricValue(
    metric,
    rule.duration,
    {
      taskIds: scope?.taskIds,
      promptIds: scope?.promptIds,
      modelIds: scope?.modelIds,
    },
    rule.createdById
  )

  // 评估条件
  const triggered = evaluateCondition(
    value,
    rule.condition as 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE',
    rule.threshold
  )

  return { triggered, value }
}

/**
 * 触发告警
 */
async function triggerAlert(
  ruleId: string,
  value: number
): Promise<void> {
  const rule = await prisma.alertRule.findUnique({
    where: { id: ruleId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!rule) return

  // 创建告警记录
  const alert = await prisma.alert.create({
    data: {
      ruleId,
      value,
      status: 'TRIGGERED',
    },
  })

  console.log(`[Alert] Triggered alert ${alert.id} for rule ${rule.name}, value: ${value}`)

  // TODO: 发送通知（将在 8.6 实现）
  // await dispatchNotifications(rule, alert)
}

/**
 * 检测所有活跃的告警规则
 */
export async function detectAlerts(): Promise<void> {
  const rules = await prisma.alertRule.findMany({
    where: { isActive: true },
  })

  console.log(`[Alert] Checking ${rules.length} active alert rules...`)

  for (const rule of rules) {
    try {
      const { triggered, value } = await checkAlertRule(rule.id)

      if (triggered) {
        await triggerAlert(rule.id, value)
      }
    } catch (error) {
      console.error(`[Alert] Error checking rule ${rule.id}:`, error)
    }
  }
}

/**
 * 启动告警检测定时器
 */
let alertCheckInterval: NodeJS.Timeout | null = null

export function startAlertDetector(intervalMs: number = 60000): void {
  if (alertCheckInterval) {
    return
  }

  console.log(`[Alert] Starting alert detector with ${intervalMs}ms interval`)

  // 立即执行一次
  detectAlerts().catch(console.error)

  // 定时执行
  alertCheckInterval = setInterval(() => {
    detectAlerts().catch(console.error)
  }, intervalMs)
}

export function stopAlertDetector(): void {
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval)
    alertCheckInterval = null
    console.log('[Alert] Alert detector stopped')
  }
}
