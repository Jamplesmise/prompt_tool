import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import {
  alertsService,
  type AlertRuleListParams,
  type AlertListParams,
  type CreateAlertRuleInput,
  type UpdateAlertRuleInput,
} from '@/services/alerts'

// 查询键
const QUERY_KEYS = {
  rulesList: (params: AlertRuleListParams) => ['alert-rules', 'list', params] as const,
  ruleDetail: (id: string) => ['alert-rules', 'detail', id] as const,
  alertsList: (params: AlertListParams) => ['alerts', 'list', params] as const,
  activeAlerts: () => ['alerts', 'active'] as const,
}

// ============ 告警规则 Hooks ============

/**
 * 获取告警规则列表
 */
export function useAlertRules(params: AlertRuleListParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.rulesList(params),
    queryFn: async () => {
      const response = await alertsService.listRules(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

/**
 * 获取告警规则详情
 */
export function useAlertRule(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.ruleDetail(id),
    queryFn: async () => {
      const response = await alertsService.getRule(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * 创建告警规则
 */
export function useCreateAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAlertRuleInput) => {
      const response = await alertsService.createRule(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('创建告警规则成功')
      queryClient.invalidateQueries({ queryKey: ['alert-rules', 'list'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '创建告警规则失败')
    },
  })
}

/**
 * 更新告警规则
 */
export function useUpdateAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAlertRuleInput }) => {
      const response = await alertsService.updateRule(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      message.success('更新告警规则成功')
      queryClient.invalidateQueries({ queryKey: ['alert-rules', 'list'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ruleDetail(variables.id) })
    },
    onError: (error: Error) => {
      message.error(error.message || '更新告警规则失败')
    },
  })
}

/**
 * 删除告警规则
 */
export function useDeleteAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await alertsService.deleteRule(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('删除告警规则成功')
      queryClient.invalidateQueries({ queryKey: ['alert-rules', 'list'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '删除告警规则失败')
    },
  })
}

/**
 * 切换告警规则状态
 */
export function useToggleAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await alertsService.toggleRule(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (data) => {
      message.success(data.isActive ? '告警规则已启用' : '告警规则已禁用')
      queryClient.invalidateQueries({ queryKey: ['alert-rules', 'list'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '操作失败')
    },
  })
}

// ============ 告警 Hooks ============

/**
 * 获取告警列表
 */
export function useAlerts(params: AlertListParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.alertsList(params),
    queryFn: async () => {
      const response = await alertsService.listAlerts(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

/**
 * 获取活跃告警（用于监控中心）
 */
export function useActiveAlerts() {
  return useQuery({
    queryKey: QUERY_KEYS.activeAlerts(),
    queryFn: async () => {
      const response = await alertsService.listAlerts({
        status: 'TRIGGERED',
        pageSize: 10,
      })
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list
    },
    refetchInterval: 30000, // 每 30 秒刷新
  })
}

/**
 * 确认告警
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await alertsService.acknowledgeAlert(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('告警已确认')
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '确认告警失败')
    },
  })
}

/**
 * 解决告警
 */
export function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await alertsService.resolveAlert(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('告警已解决')
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '解决告警失败')
    },
  })
}
