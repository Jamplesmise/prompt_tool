/**
 * 历史统计数据 Hooks
 */

import { useQuery } from '@tanstack/react-query'
import {
  historyStatsService,
  type HistoryStats,
  type MultiDimensionStats,
} from '@/services/historyStats'

/**
 * 获取特定提示词和模型组合的历史统计
 */
export function useHistoryStats(
  promptId: string,
  modelId: string,
  period: '7d' | '30d' = '7d',
  options?: { enabled?: boolean }
) {
  return useQuery<HistoryStats>({
    queryKey: ['historyStats', promptId, modelId, period],
    queryFn: async () => {
      const response = await historyStatsService.getStats(promptId, modelId, period)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: options?.enabled !== false && !!promptId && !!modelId,
    staleTime: 5 * 60 * 1000, // 5 分钟
  })
}

/**
 * 获取提示词的历史统计（聚合所有模型）
 */
export function usePromptHistoryStats(
  promptId: string,
  period: '7d' | '30d' = '7d',
  options?: { enabled?: boolean }
) {
  return useQuery<HistoryStats>({
    queryKey: ['promptHistoryStats', promptId, period],
    queryFn: async () => {
      const response = await historyStatsService.getPromptStats(promptId, period)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: options?.enabled !== false && !!promptId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 获取模型的历史统计（聚合所有提示词）
 */
export function useModelHistoryStats(
  modelId: string,
  period: '7d' | '30d' = '7d',
  options?: { enabled?: boolean }
) {
  return useQuery<HistoryStats>({
    queryKey: ['modelHistoryStats', modelId, period],
    queryFn: async () => {
      const response = await historyStatsService.getModelStats(modelId, period)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: options?.enabled !== false && !!modelId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 获取多维度统计数据
 */
export function useMultiDimensionStats(
  period: '7d' | '30d' = '7d',
  teamId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery<MultiDimensionStats>({
    queryKey: ['multiDimensionStats', period, teamId],
    queryFn: async () => {
      const response = await historyStatsService.getMultiDimensionStats(period, teamId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 批量获取历史统计
 */
export function useBatchHistoryStats(
  queries: Array<{ promptId: string; modelId: string }>,
  period: '7d' | '30d' = '7d',
  options?: { enabled?: boolean }
) {
  return useQuery<HistoryStats[]>({
    queryKey: ['batchHistoryStats', queries, period],
    queryFn: async () => {
      const response = await historyStatsService.getBatchStats(queries, period)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: options?.enabled !== false && queries.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}
