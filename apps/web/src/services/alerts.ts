import type {
  ApiResponse,
  AlertMetric,
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  AlertScope,
} from '@platform/shared'

const API_BASE = '/api/v1'

// 告警规则列表项
type AlertRuleListItem = {
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
  createdAt: string
  updatedAt: string
  _count: {
    alerts: number
  }
}

// 告警列表项
type AlertListItem = {
  id: string
  ruleId: string
  value: number
  status: AlertStatus
  acknowledgedAt: string | null
  acknowledgedById: string | null
  resolvedAt: string | null
  createdAt: string
  rule: {
    id: string
    name: string
    metric: AlertMetric
    condition: AlertCondition
    threshold: number
    severity: AlertSeverity
  }
  acknowledgedBy?: {
    id: string
    name: string
  }
}

// 分页响应
type PaginatedResponse<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 告警规则列表查询参数
type AlertRuleListParams = {
  page?: number
  pageSize?: number
  isActive?: boolean
  severity?: AlertSeverity
}

// 告警列表查询参数
type AlertListParams = {
  page?: number
  pageSize?: number
  status?: AlertStatus
  ruleId?: string
}

// 创建告警规则参数
type CreateAlertRuleInput = {
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

// 更新告警规则参数
type UpdateAlertRuleInput = {
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
}

export const alertsService = {
  // ============ 告警规则 ============

  // 获取告警规则列表
  async listRules(
    params: AlertRuleListParams = {}
  ): Promise<ApiResponse<PaginatedResponse<AlertRuleListItem>>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive))
    if (params.severity) searchParams.set('severity', params.severity)

    const response = await fetch(`${API_BASE}/alert-rules?${searchParams.toString()}`)
    return response.json()
  },

  // 获取告警规则详情
  async getRule(id: string): Promise<ApiResponse<AlertRuleListItem>> {
    const response = await fetch(`${API_BASE}/alert-rules/${id}`)
    return response.json()
  },

  // 创建告警规则
  async createRule(data: CreateAlertRuleInput): Promise<ApiResponse<AlertRuleListItem>> {
    const response = await fetch(`${API_BASE}/alert-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新告警规则
  async updateRule(
    id: string,
    data: UpdateAlertRuleInput
  ): Promise<ApiResponse<AlertRuleListItem>> {
    const response = await fetch(`${API_BASE}/alert-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除告警规则
  async deleteRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const response = await fetch(`${API_BASE}/alert-rules/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 切换告警规则状态
  async toggleRule(id: string): Promise<ApiResponse<AlertRuleListItem>> {
    const response = await fetch(`${API_BASE}/alert-rules/${id}/toggle`, {
      method: 'POST',
    })
    return response.json()
  },

  // ============ 告警 ============

  // 获取告警列表
  async listAlerts(
    params: AlertListParams = {}
  ): Promise<ApiResponse<PaginatedResponse<AlertListItem>>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.status) searchParams.set('status', params.status)
    if (params.ruleId) searchParams.set('ruleId', params.ruleId)

    const response = await fetch(`${API_BASE}/alerts?${searchParams.toString()}`)
    return response.json()
  },

  // 确认告警
  async acknowledgeAlert(id: string): Promise<ApiResponse<AlertListItem>> {
    const response = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
      method: 'POST',
    })
    return response.json()
  },

  // 解决告警
  async resolveAlert(id: string): Promise<ApiResponse<AlertListItem>> {
    const response = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
      method: 'POST',
    })
    return response.json()
  },
}

export type {
  AlertRuleListItem,
  AlertListItem,
  PaginatedResponse,
  AlertRuleListParams,
  AlertListParams,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
}
