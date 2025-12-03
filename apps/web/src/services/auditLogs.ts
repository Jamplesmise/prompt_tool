import type { ApiResponse, AuditLog, AuditAction, AuditResource } from '@platform/shared'

const API_BASE = '/api/v1'

// 审计日志列表项
type AuditLogListItem = AuditLog & {
  user: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    name: string
  } | null
}

// 审计日志列表响应
type AuditLogListResponse = {
  list: AuditLogListItem[]
  total: number
  page: number
  pageSize: number
}

// 查询参数
type AuditLogQueryParams = {
  page?: number
  pageSize?: number
  action?: AuditAction
  resource?: AuditResource
  userId?: string
  projectId?: string
  startDate?: string
  endDate?: string
}

export const auditLogsService = {
  // 获取审计日志列表
  async list(params?: AuditLogQueryParams): Promise<ApiResponse<AuditLogListResponse>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.action) searchParams.set('action', params.action)
    if (params?.resource) searchParams.set('resource', params.resource)
    if (params?.userId) searchParams.set('userId', params.userId)
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)

    const url = `${API_BASE}/audit-logs${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url)
    return response.json()
  },
}

export type {
  AuditLogListItem,
  AuditLogListResponse,
  AuditLogQueryParams,
}
