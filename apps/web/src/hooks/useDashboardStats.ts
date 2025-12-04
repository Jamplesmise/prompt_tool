'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsService } from '@/services/stats'
import type { TrendDataPoint } from '@/services/stats'

type TimeRangeType = '7d' | '14d' | '30d' | '60d' | 'custom'

// 查询 key
const DASHBOARD_KEY = ['dashboard']
const OVERVIEW_KEY = [...DASHBOARD_KEY, 'overview']
const TRENDS_KEY = [...DASHBOARD_KEY, 'trends']
const RECENT_TASKS_KEY = [...DASHBOARD_KEY, 'recentTasks']

// 工作台统计数据 Hook
export function useDashboardStats() {
  const [timeRange, setTimeRangeState] = useState<TimeRangeType>('7d')
  const [customRange, setCustomRange] = useState<[string, string] | undefined>()

  // 概览统计
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: async () => {
      const response = await statsService.getOverview()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })

  // 趋势数据
  const {
    data: trendsData,
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: [...TRENDS_KEY, timeRange, customRange],
    queryFn: async () => {
      const response = await statsService.getTrends(timeRange, customRange)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })

  // 最近任务
  const {
    data: recentTasksData,
    isLoading: recentTasksLoading,
    error: recentTasksError,
    refetch: refetchRecentTasks,
  } = useQuery({
    queryKey: [...RECENT_TASKS_KEY, 5],
    queryFn: async () => {
      const response = await statsService.getRecentTasks(5)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })

  // 转换趋势数据为图表所需格式
  const trendData: TrendDataPoint[] = trendsData?.points?.map((point) => ({
    date: point.date,
    executed: point.total,
    passed: point.passed,
    failed: point.failed,
  })) ?? []

  // 刷新所有数据
  const refresh = () => {
    refetchOverview()
    refetchTrends()
    refetchRecentTasks()
  }

  // 设置时间范围
  const setTimeRange = useCallback((range: TimeRangeType, custom?: [string, string]) => {
    setTimeRangeState(range)
    if (range === 'custom' && custom) {
      setCustomRange(custom)
    } else {
      setCustomRange(undefined)
    }
  }, [])

  return {
    // 概览数据
    promptCount: overviewData?.promptCount ?? 0,
    datasetCount: overviewData?.datasetCount ?? 0,
    weeklyTaskCount: overviewData?.taskCountThisWeek ?? 0,
    passRate: overviewData?.avgPassRate,
    totalCost: overviewData?.totalCostThisWeek ?? 0,
    totalTokens: overviewData?.totalTokensThisWeek ?? 0,

    // 趋势数据
    trendData,
    trendSummary: trendsData?.summary,

    // 最近任务
    recentTasks: recentTasksData?.list ?? [],

    // 状态
    loading: overviewLoading || trendsLoading || recentTasksLoading,
    overviewLoading,
    trendsLoading,
    recentTasksLoading,
    error: overviewError || trendsError || recentTasksError,

    // 操作
    timeRange,
    setTimeRange,
    refresh,
  }
}
