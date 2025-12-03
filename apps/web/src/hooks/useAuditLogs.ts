'use client'

import { useQuery } from '@tanstack/react-query'
import { auditLogsService } from '@/services/auditLogs'
import type { AuditLogQueryParams } from '@/services/auditLogs'

// 查询 key
const AUDIT_LOGS_KEY = ['audit-logs']

// 审计日志列表
export function useAuditLogs(params?: AuditLogQueryParams) {
  return useQuery({
    queryKey: [...AUDIT_LOGS_KEY, params],
    queryFn: async () => {
      const response = await auditLogsService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}
