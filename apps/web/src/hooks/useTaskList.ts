'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksService } from '@/services/tasks'
import type { TaskListParams, TaskListItem } from '@/services/tasks'
import type { TaskStatus } from '@platform/shared'
import type { TaskFiltersValue } from '@/components/task/TaskFilters'

type UseTaskListOptions = {
  filters?: TaskFiltersValue
  pageSize?: number
  pollInterval?: number
  enablePolling?: boolean
}

type UseTaskListReturn = {
  tasks: TaskListItem[]
  loading: boolean
  error: Error | null
  pagination: {
    current: number
    pageSize: number
    total: number
  }
  hasRunningTasks: boolean
  hasFilters: boolean
  refresh: () => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
}

const TASKS_KEY = ['tasks']

/**
 * 任务列表 Hook，支持轮询更新
 */
export function useTaskList(options: UseTaskListOptions = {}): UseTaskListReturn {
  const {
    filters = {},
    pageSize: initialPageSize = 20,
    pollInterval = 3000,
    enablePolling = true,
  } = options

  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  // 构建查询参数
  const queryParams: TaskListParams = useMemo(() => {
    const params: TaskListParams = {
      page,
      pageSize,
    }

    if (filters.search) {
      params.keyword = filters.search
    }
    if (filters.type) {
      params.type = filters.type
    }
    if (filters.status) {
      params.status = filters.status as TaskStatus
    }
    // timeRange 需要在 API 层处理，这里暂不传递

    return params
  }, [page, pageSize, filters])

  // 查询任务列表
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...TASKS_KEY, queryParams],
    queryFn: async () => {
      const response = await tasksService.list(queryParams)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })

  // 检查是否有运行中的任务
  const hasRunningTasks = useMemo(() => {
    if (!data?.list) return false
    return data.list.some(
      (task) => task.status === 'RUNNING' || task.queueState === 'active' || task.queueState === 'waiting'
    )
  }, [data?.list])

  // 检查是否有筛选条件
  const hasFilters = useMemo(() => {
    return !!(filters.search || filters.type || filters.status || filters.timeRange)
  }, [filters])

  // 页面可见性状态
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 轮询逻辑
  useEffect(() => {
    if (!enablePolling || !hasRunningTasks || !isVisible) {
      return
    }

    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, queryParams] })
    }, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enablePolling, hasRunningTasks, isVisible, pollInterval, queryClient, queryParams])

  // 筛选条件变化时重置页码
  useEffect(() => {
    setPage(1)
  }, [filters.search, filters.type, filters.status, filters.timeRange])

  // 刷新方法
  const refresh = useCallback(() => {
    refetch()
  }, [refetch])

  // 设置每页数量
  const handleSetPageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1)
  }, [])

  return {
    tasks: data?.list || [],
    loading: isLoading,
    error: error as Error | null,
    pagination: {
      current: page,
      pageSize,
      total: data?.total || 0,
    },
    hasRunningTasks,
    hasFilters,
    refresh,
    setPage,
    setPageSize: handleSetPageSize,
  }
}
