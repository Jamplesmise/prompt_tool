import { useQuery } from '@tanstack/react-query'
import { metricsService, type TrendQueryParams } from '@/services/metrics'

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
