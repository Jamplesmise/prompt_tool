import { useQuery } from '@tanstack/react-query'
import { metricsService, type TrendQueryParams, type ModelPerformanceParams } from '@/services/metrics'

/**
 * 获取趋势数据
 */
export function useTrends(params: TrendQueryParams = {}) {
  return useQuery({
    queryKey: ['metrics', 'trends', params],
    queryFn: async () => {
      const response = await metricsService.getTrends(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    refetchInterval: 60000, // 每分钟刷新
  })
}

/**
 * 获取模型性能数据
 */
export function useModelPerformance(params: ModelPerformanceParams = {}) {
  return useQuery({
    queryKey: ['metrics', 'models', params],
    queryFn: async () => {
      const response = await metricsService.getModelPerformance(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    refetchInterval: 60000, // 每分钟刷新
  })
}
