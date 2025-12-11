// Phase 8: 定时任务、监控、告警相关类型

// ============================================
// 定时任务类型
// ============================================

export type ScheduledExecutionStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export type ScheduledTask = {
  id: string
  name: string
  description: string | null
  taskTemplateId: string
  cronExpression: string
  timezone: string
  isActive: boolean
  lastRunAt: Date | null
  nextRunAt: Date | null
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export type ScheduledExecution = {
  id: string
  scheduledTaskId: string
  taskId: string
  status: ScheduledExecutionStatus
  error: string | null
  createdAt: Date
}

export type CreateScheduledTaskInput = {
  name: string
  description?: string
  taskTemplateId: string
  cronExpression: string
  timezone?: string
  isActive?: boolean
}

export type UpdateScheduledTaskInput = {
  name?: string
  description?: string
  cronExpression?: string
  timezone?: string
  isActive?: boolean
}

export type ScheduledTaskWithRelations = ScheduledTask & {
  taskTemplate?: {
    id: string
    name: string
  }
  executions?: ScheduledExecution[]
  createdBy?: {
    id: string
    name: string
  }
}

// ============================================
// 监控指标类型
// ============================================

export type TrendDataPoint = {
  timestamp: string
  passRate: number
  avgLatency: number
  totalCost: number
  taskCount: number
  errorRate: number
}

export type TrendSummary = {
  avgPassRate: number
  avgLatency: number
  totalCost: number
  totalTasks: number
  errorRate: number
}

export type TrendData = {
  points: TrendDataPoint[]
  summary: TrendSummary
}

export type TimeRange = '24h' | '7d' | '14d' | '30d' | '60d' | 'custom'

export type GroupBy = 'hour' | 'day' | 'week'

export type MetricsQuery = {
  range: TimeRange
  start?: string
  end?: string
  groupBy?: GroupBy
  taskIds?: string[]
  promptIds?: string[]
  modelIds?: string[]
}

// ============================================
// 告警规则类型
// ============================================

// 告警指标类型（包含字段级）
export type AlertMetric =
  | 'PASS_RATE'           // 总体通过率
  | 'AVG_LATENCY'         // 平均延迟
  | 'ERROR_RATE'          // 错误率
  | 'COST'                // 成本
  | 'FIELD_PASS_RATE'     // 字段通过率
  | 'FIELD_AVG_SCORE'     // 字段平均分
  | 'FIELD_REGRESSION'    // 字段回归检测

export type AlertCondition = 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE'

export type AlertSeverity = 'WARNING' | 'CRITICAL' | 'URGENT'

export type AlertStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED'

// 字段级告警配置
export type FieldAlertConfig = {
  fieldKey: string         // 目标字段 key
  fieldName?: string       // 字段名称（显示用）
  isCritical?: boolean     // 是否为关键字段
  baselineTaskId?: string  // 回归检测的基准任务 ID
}

export type AlertScope = {
  taskIds?: string[]
  promptIds?: string[]
  modelIds?: string[]
  // 字段级告警配置（仅 FIELD_* 指标使用）
  fieldConfig?: FieldAlertConfig
}

export type AlertRule = {
  id: string
  name: string
  description: string | null
  metric: AlertMetric
  condition: AlertCondition
  threshold: number
  duration: number
  severity: AlertSeverity
  silencePeriod: number
  notifyChannels: string[]
  scope: AlertScope | null
  isActive: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export type Alert = {
  id: string
  ruleId: string
  value: number
  status: AlertStatus
  acknowledgedAt: Date | null
  acknowledgedById: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export type CreateAlertRuleInput = {
  name: string
  description?: string
  metric: AlertMetric
  condition: AlertCondition
  threshold: number
  duration: number
  severity?: AlertSeverity
  silencePeriod?: number
  notifyChannels?: string[]
  scope?: AlertScope
  isActive?: boolean
}

export type UpdateAlertRuleInput = {
  name?: string
  description?: string
  metric?: AlertMetric
  condition?: AlertCondition
  threshold?: number
  duration?: number
  severity?: AlertSeverity
  silencePeriod?: number
  notifyChannels?: string[]
  scope?: AlertScope
  isActive?: boolean
}

export type AlertWithRelations = Alert & {
  rule?: AlertRule
  acknowledgedBy?: {
    id: string
    name: string
  }
}

export type AlertRuleWithRelations = AlertRule & {
  alerts?: Alert[]
  createdBy?: {
    id: string
    name: string
  }
}

// ============================================
// 通知渠道类型
// ============================================

export type NotifyChannelType = 'EMAIL' | 'WEBHOOK' | 'INTERNAL'

export type EmailChannelConfig = {
  recipients: string[]
}

export type WebhookChannelConfig = {
  url: string
  headers?: Record<string, string>
  template?: string
}

export type InternalChannelConfig = {
  userIds?: string[]
}

export type NotifyChannelConfig = EmailChannelConfig | WebhookChannelConfig | InternalChannelConfig

export type NotifyChannel = {
  id: string
  name: string
  type: NotifyChannelType
  config: NotifyChannelConfig
  isActive: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export type CreateNotifyChannelInput = {
  name: string
  type: NotifyChannelType
  config: NotifyChannelConfig
  isActive?: boolean
}

export type UpdateNotifyChannelInput = {
  name?: string
  type?: NotifyChannelType
  config?: NotifyChannelConfig
  isActive?: boolean
}

// ============================================
// Webhook 请求体类型
// ============================================

export type AlertWebhookPayload = {
  alertId: string
  ruleName: string
  severity: AlertSeverity
  metric: AlertMetric
  value: number
  threshold: number
  condition: AlertCondition
  triggeredAt: string
  context?: {
    taskId?: string
    taskName?: string
    promptId?: string
    promptName?: string
    modelId?: string
    modelName?: string
  }
}

// ============================================
// Cron 预设
// ============================================

export type CronPreset = {
  label: string
  value: string
  description: string
}

export const CRON_PRESETS: CronPreset[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每6小时', value: '0 */6 * * *', description: '每6小时执行一次' },
  { label: '每天', value: '0 0 * * *', description: '每天 00:00 执行' },
  { label: '每天 9:00', value: '0 9 * * *', description: '每天早上 9:00 执行' },
  { label: '工作日 9:00', value: '0 9 * * 1-5', description: '周一至周五 9:00 执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一 00:00 执行' },
  { label: '每月1号', value: '0 0 1 * *', description: '每月1号 00:00 执行' },
]
