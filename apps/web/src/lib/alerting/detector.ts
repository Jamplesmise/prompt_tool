// 告警检测器

import { prisma } from '../prisma'
import { getMetricValue, getFieldMetricValue, getFieldRegressionValue } from '../metrics/aggregator'
import { evaluateCondition } from './evaluator'
import { dispatchAlertNotifications } from '../notify/dispatcher'
import type { AlertMetric, AlertScope, FieldAlertConfig } from '@platform/shared'

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

  const scope = rule.scope as AlertScope | null
  let value = 0

  // 根据指标类型获取值
  if (rule.metric.startsWith('FIELD_')) {
    // 字段级指标
    value = await getFieldMetricValueForRule(rule.metric as AlertMetric, rule.duration, scope, rule.createdById)
  } else {
    // 传统指标
    const metricMap: Record<string, 'pass_rate' | 'avg_latency' | 'error_rate' | 'cost'> = {
      PASS_RATE: 'pass_rate',
      AVG_LATENCY: 'avg_latency',
      ERROR_RATE: 'error_rate',
      COST: 'cost',
    }

    const metric = metricMap[rule.metric]
    value = await getMetricValue(
      metric,
      rule.duration,
      {
        taskIds: scope?.taskIds,
        promptIds: scope?.promptIds,
        modelIds: scope?.modelIds,
      },
      rule.createdById
    )
  }

  // 评估条件
  const triggered = evaluateCondition(
    value,
    rule.condition as 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE',
    rule.threshold
  )

  return { triggered, value }
}

/**
 * 获取字段级指标值
 */
async function getFieldMetricValueForRule(
  metric: AlertMetric,
  duration: number,
  scope: AlertScope | null,
  userId: string
): Promise<number> {
  const fieldConfig = scope?.fieldConfig as FieldAlertConfig | undefined

  if (!fieldConfig?.fieldKey) {
    console.warn('[Alert] Field metric rule missing fieldKey in scope.fieldConfig')
    return 0
  }

  switch (metric) {
    case 'FIELD_PASS_RATE':
      return getFieldMetricValue(
        'pass_rate',
        duration,
        fieldConfig.fieldKey,
        { taskIds: scope?.taskIds, promptIds: scope?.promptIds },
        userId
      )

    case 'FIELD_AVG_SCORE':
      return getFieldMetricValue(
        'avg_score',
        duration,
        fieldConfig.fieldKey,
        { taskIds: scope?.taskIds, promptIds: scope?.promptIds },
        userId
      )

    case 'FIELD_REGRESSION': {
      // 回归检测需要基准任务
      if (!fieldConfig.baselineTaskId) {
        console.warn('[Alert] FIELD_REGRESSION rule missing baselineTaskId')
        return 0
      }

      // 获取最近完成的任务作为当前任务
      const latestTask = await prisma.task.findFirst({
        where: {
          createdById: userId,
          status: 'COMPLETED',
          ...(scope?.promptIds?.length ? { promptId: { in: scope.promptIds } } : {}),
        },
        orderBy: { completedAt: 'desc' },
        select: { id: true },
      })

      if (!latestTask) {
        return 0
      }

      return getFieldRegressionValue(
        fieldConfig.fieldKey,
        latestTask.id,
        fieldConfig.baselineTaskId
      )
    }

    default:
      return 0
  }
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

  // 发送通知到配置的渠道
  try {
    await dispatchAlertNotifications(alert.id, ruleId)
  } catch (notifyError) {
    console.error(`[Alert] Failed to dispatch notifications for alert ${alert.id}:`, notifyError)
  }
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
