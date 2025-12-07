/**
 * 异常检测 Hooks
 * 整合历史统计和异常检测逻辑
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useHistoryStats, useMultiDimensionStats } from './useHistoryStats'
import { detectAnomaly, detectAnomalies } from '@/lib/analysis/anomalyDetector'
import type { HistoryStats } from '@/services/historyStats'
import type { Anomaly } from '@/lib/analysis/anomalyDetector'

/**
 * 针对特定提示词和模型组合的异常检测
 */
export function useAnomalyDetectionForTask(
  promptId: string,
  modelId: string,
  period: '7d' | '30d' = '7d',
  options?: { enabled?: boolean }
) {
  const {
    data: historyStats,
    isLoading,
    error,
  } = useHistoryStats(promptId, modelId, period, options)

  const anomaly = useMemo(() => {
    if (!historyStats || historyStats.dataPoints.length === 0) {
      return null
    }

    const currentValue = historyStats.dataPoints[historyStats.dataPoints.length - 1].passRate
    return detectAnomaly(currentValue, historyStats)
  }, [historyStats])

  return {
    historyStats,
    anomaly,
    isLoading,
    error,
  }
}

/**
 * 批量异常检测（用于任务详情页）
 */
export function useTaskAnomalyDetection(
  taskId: string,
  promptModelPairs: Array<{ promptId: string; modelId: string }>,
  period: '7d' | '30d' = '7d',
  options?: { enabled?: boolean }
) {
  // 批量获取历史统计
  const { data: historyStatsList, isLoading, error } = useQuery<HistoryStats[]>({
    queryKey: ['taskAnomalyDetection', taskId, promptModelPairs, period],
    queryFn: async () => {
      if (promptModelPairs.length === 0) return []

      const results = await Promise.all(
        promptModelPairs.map(async ({ promptId, modelId }) => {
          const params = new URLSearchParams({ promptId, modelId, period })
          const response = await fetch(`/api/v1/stats/history?${params}`)
          const data = await response.json()
          if (data.code === 200) {
            return data.data as HistoryStats
          }
          return null
        })
      )

      return results.filter((r): r is HistoryStats => r !== null)
    },
    enabled: options?.enabled !== false && promptModelPairs.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // 检测异常
  const anomalies = useMemo(() => {
    if (!historyStatsList || historyStatsList.length === 0) return []
    return detectAnomalies(historyStatsList)
  }, [historyStatsList])

  return {
    historyStatsList,
    anomalies,
    isLoading,
    error,
  }
}

/**
 * 全局异常检测（用于监控中心）
 */
export function useGlobalAnomalyDetection(
  period: '7d' | '30d' = '7d',
  teamId?: string,
  options?: { enabled?: boolean }
) {
  const {
    data: multiStats,
    isLoading: isMultiStatsLoading,
    error: multiStatsError,
  } = useMultiDimensionStats(period, teamId, options)

  // 获取每个提示词-模型组合的详细历史
  const { data: detailedStats, isLoading: isDetailLoading } = useQuery<HistoryStats[]>({
    queryKey: ['globalAnomalyDetection', period, teamId],
    queryFn: async () => {
      if (!multiStats) return []

      // 获取前 10 个最活跃的提示词-模型组合
      const pairs: Array<{ promptId: string; modelId: string }> = []

      for (const prompt of multiStats.byPrompt.slice(0, 5)) {
        for (const model of multiStats.byModel.slice(0, 3)) {
          pairs.push({ promptId: prompt.promptId, modelId: model.modelId })
        }
      }

      const results = await Promise.all(
        pairs.map(async ({ promptId, modelId }) => {
          const params = new URLSearchParams({ promptId, modelId, period })
          const response = await fetch(`/api/v1/stats/history?${params}`)
          const data = await response.json()
          if (data.code === 200 && data.data.dataPoints.length > 0) {
            return data.data as HistoryStats
          }
          return null
        })
      )

      return results.filter((r): r is HistoryStats => r !== null)
    },
    enabled: options?.enabled !== false && !!multiStats,
    staleTime: 5 * 60 * 1000,
  })

  // 检测异常
  const anomalies = useMemo(() => {
    if (!detailedStats || detailedStats.length === 0) return []
    return detectAnomalies(detailedStats)
  }, [detailedStats])

  return {
    multiStats,
    detailedStats,
    anomalies,
    isLoading: isMultiStatsLoading || isDetailLoading,
    error: multiStatsError,
  }
}

/**
 * 单个指标的异常检测结果
 */
export type AnomalyDetectionResult = {
  historyStats: HistoryStats | null
  anomaly: Anomaly | null
  isLoading: boolean
  error: unknown
}

/**
 * 批量异常检测结果
 */
export type BatchAnomalyDetectionResult = {
  historyStatsList: HistoryStats[] | undefined
  anomalies: Array<Anomaly & { promptId: string; modelId: string }>
  isLoading: boolean
  error: unknown
}
