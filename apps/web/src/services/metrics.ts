import type { ApiResponse, TrendData, TimeRange, GroupBy } from '@platform/shared'

const API_BASE = '/api/v1'

// 趋势查询参数
type TrendQueryParams = {
  range?: TimeRange
  start?: string
  end?: string
  groupBy?: GroupBy
  taskIds?: string[]
  promptIds?: string[]
  modelIds?: string[]
}

export const metricsService = {
  // 获取趋势数据
  async getTrends(params: TrendQueryParams = {}): Promise<ApiResponse<TrendData>> {
    const searchParams = new URLSearchParams()

    if (params.range) searchParams.set('range', params.range)
    if (params.start) searchParams.set('start', params.start)
    if (params.end) searchParams.set('end', params.end)
    if (params.groupBy) searchParams.set('groupBy', params.groupBy)
    if (params.taskIds?.length) searchParams.set('taskIds', params.taskIds.join(','))
    if (params.promptIds?.length) searchParams.set('promptIds', params.promptIds.join(','))
    if (params.modelIds?.length) searchParams.set('modelIds', params.modelIds.join(','))

    const response = await fetch(`${API_BASE}/stats/trends?${searchParams.toString()}`)
    return response.json()
  },
}

export type { TrendQueryParams }
