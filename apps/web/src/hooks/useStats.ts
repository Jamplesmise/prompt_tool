'use client'

import { useQuery } from '@tanstack/react-query'
import { statsService } from '@/services/stats'

// 查询 key
const STATS_KEY = ['stats']
const OVERVIEW_KEY = [...STATS_KEY, 'overview']
const RECENT_TASKS_KEY = [...STATS_KEY, 'recentTasks']

// 工作台统计概览
export function useOverviewStats() {
  return useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: async () => {
      const response = await statsService.getOverview()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 最近任务列表
export function useRecentTasks(limit = 10) {
  return useQuery({
    queryKey: [...RECENT_TASKS_KEY, limit],
    queryFn: async () => {
      const response = await statsService.getRecentTasks(limit)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}
