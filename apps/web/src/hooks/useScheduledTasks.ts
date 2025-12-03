import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import {
  scheduledTasksService,
  type ScheduledTaskListParams,
  type CreateScheduledTaskInput,
  type UpdateScheduledTaskInput,
  type ExecutionListParams,
} from '@/services/scheduledTasks'

// 查询键
const QUERY_KEYS = {
  list: (params: ScheduledTaskListParams) => ['scheduled-tasks', 'list', params] as const,
  detail: (id: string) => ['scheduled-tasks', 'detail', id] as const,
  executions: (id: string, params: ExecutionListParams) =>
    ['scheduled-tasks', 'executions', id, params] as const,
}

/**
 * 获取定时任务列表
 */
export function useScheduledTasks(params: ScheduledTaskListParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await scheduledTasksService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

/**
 * 获取定时任务详情
 */
export function useScheduledTask(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await scheduledTasksService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * 获取定时任务执行历史
 */
export function useScheduledTaskExecutions(id: string, params: ExecutionListParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.executions(id, params),
    queryFn: async () => {
      const response = await scheduledTasksService.getExecutions(id, params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * 创建定时任务
 */
export function useCreateScheduledTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateScheduledTaskInput) => {
      const response = await scheduledTasksService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('创建定时任务成功')
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', 'list'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '创建定时任务失败')
    },
  })
}

/**
 * 更新定时任务
 */
export function useUpdateScheduledTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateScheduledTaskInput }) => {
      const response = await scheduledTasksService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      message.success('更新定时任务成功')
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.id) })
    },
    onError: (error: Error) => {
      message.error(error.message || '更新定时任务失败')
    },
  })
}

/**
 * 删除定时任务
 */
export function useDeleteScheduledTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await scheduledTasksService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('删除定时任务成功')
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', 'list'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '删除定时任务失败')
    },
  })
}

/**
 * 切换定时任务启用状态
 */
export function useToggleScheduledTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await scheduledTasksService.toggle(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (data) => {
      message.success(data.isActive ? '定时任务已启用' : '定时任务已禁用')
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', 'list'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '操作失败')
    },
  })
}

/**
 * 立即执行定时任务
 */
export function useRunScheduledTaskNow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await scheduledTasksService.runNow(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      message.success('定时任务已加入执行队列')
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '执行失败')
    },
  })
}
