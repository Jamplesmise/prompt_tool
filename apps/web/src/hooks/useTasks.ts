'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksService } from '@/services/tasks'
import type { CreateTaskInput, CreateABTestInput, TaskListParams, ResultListParams } from '@/services/tasks'
import { appMessage } from '@/lib/message'

// 查询 key
const TASKS_KEY = ['tasks']
const TASK_KEY = (id: string) => ['task', id]
const TASK_RESULTS_KEY = (id: string) => ['task-results', id]

// 任务列表
export function useTasks(params: TaskListParams = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, params],
    queryFn: async () => {
      const response = await tasksService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 任务详情
export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: TASK_KEY(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('任务 ID 不能为空')
      const response = await tasksService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建任务
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const response = await tasksService.create(data)
      if (response.code !== 200 && response.code !== 201) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      appMessage.success('任务创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 删除任务
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tasksService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      appMessage.success('任务删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 启动任务
export function useRunTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tasksService.run(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      queryClient.invalidateQueries({ queryKey: TASK_KEY(id) })
      appMessage.success('任务已启动')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '启动失败')
    },
  })
}

// 停止任务
export function useStopTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tasksService.stop(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      queryClient.invalidateQueries({ queryKey: TASK_KEY(id) })
      appMessage.success('任务已终止')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '终止失败')
    },
  })
}

// 重试任务
export function useRetryTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tasksService.retry(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      queryClient.invalidateQueries({ queryKey: TASK_KEY(id) })
      queryClient.invalidateQueries({ queryKey: TASK_RESULTS_KEY(id) })
      appMessage.success('重试已启动')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '重试失败')
    },
  })
}

// 暂停任务
export function usePauseTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tasksService.pause(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      queryClient.invalidateQueries({ queryKey: TASK_KEY(id) })
      appMessage.success('任务已暂停')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '暂停失败')
    },
  })
}

// 续跑任务
export function useResumeTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tasksService.resume(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      queryClient.invalidateQueries({ queryKey: TASK_KEY(id) })
      appMessage.success('任务已从断点继续执行')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '续跑失败')
    },
  })
}

// 任务结果列表
export function useTaskResults(id: string | undefined, params: ResultListParams = {}) {
  return useQuery({
    queryKey: [...TASK_RESULTS_KEY(id ?? ''), params],
    queryFn: async () => {
      if (!id) throw new Error('任务 ID 不能为空')
      const response = await tasksService.getResults(id, params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 导出结果
export function useExportResults() {
  return useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'xlsx' | 'csv' | 'json' }) => {
      const blob = await tasksService.exportResults(id, format)
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `task-results.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      appMessage.success('导出成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '导出失败')
    },
  })
}

// 刷新任务数据
export function useRefreshTask() {
  const queryClient = useQueryClient()

  return useCallback(
    (id: string) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEY(id) })
      queryClient.invalidateQueries({ queryKey: TASK_RESULTS_KEY(id) })
    },
    [queryClient]
  )
}

// 创建 A/B 测试任务
export function useCreateABTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateABTestInput) => {
      const response = await tasksService.createABTest(data)
      if (response.code !== 200 && response.code !== 201) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      appMessage.success('A/B 测试任务创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// A/B 测试结果 query key
const AB_TEST_RESULTS_KEY = (id: string) => ['ab-test-results', id]

// A/B 测试结果
export function useABTestResults(id: string | undefined) {
  return useQuery({
    queryKey: AB_TEST_RESULTS_KEY(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('任务 ID 不能为空')
      const response = await tasksService.getABTestResults(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 结果详情 query key
const TASK_RESULT_DETAIL_KEY = (taskId: string, resultId: string) => ['task-result-detail', taskId, resultId]

// 获取单个结果详情（含字段级评估）
export function useTaskResultDetail(taskId: string | undefined, resultId: string | undefined) {
  return useQuery({
    queryKey: TASK_RESULT_DETAIL_KEY(taskId ?? '', resultId ?? ''),
    queryFn: async () => {
      if (!taskId || !resultId) throw new Error('参数不完整')
      const response = await tasksService.getResultDetail(taskId, resultId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!taskId && !!resultId,
  })
}

// 字段统计 query key
const FIELD_STATS_KEY = (taskId: string) => ['field-stats', taskId]

// 获取字段级统计
export function useFieldStats(taskId: string | undefined) {
  return useQuery({
    queryKey: FIELD_STATS_KEY(taskId ?? ''),
    queryFn: async () => {
      if (!taskId) throw new Error('任务 ID 不能为空')
      const response = await tasksService.getFieldStats(taskId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!taskId,
  })
}
