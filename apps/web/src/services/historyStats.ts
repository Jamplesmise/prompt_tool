/**
 * 历史数据统计服务
 * 用于获取提示词/模型的历史表现数据，支持异常检测
 */

import type { ApiResponse } from '@platform/shared'

const API_BASE = '/api/v1'

/**
 * 数据点
 */
export type HistoryDataPoint = {
  date: string
  passRate: number
  taskCount: number
  avgLatency: number | null
  totalCost: number
}

/**
 * 历史统计数据
 */
export type HistoryStats = {
  promptId: string
  promptName: string
  modelId: string
  modelName: string
  period: '7d' | '30d'
  avgPassRate: number
  stdDeviation: number
  minPassRate: number
  maxPassRate: number
  totalTasks: number
  totalExecutions: number
  dataPoints: HistoryDataPoint[]
}

/**
 * 多维度历史统计
 */
export type MultiDimensionStats = {
  byPrompt: Array<{
    promptId: string
    promptName: string
    avgPassRate: number
    stdDeviation: number
    taskCount: number
    trend: 'up' | 'down' | 'stable'
  }>
  byModel: Array<{
    modelId: string
    modelName: string
    avgPassRate: number
    stdDeviation: number
    taskCount: number
    trend: 'up' | 'down' | 'stable'
  }>
  overall: {
    avgPassRate: number
    stdDeviation: number
    totalTasks: number
  }
}

/**
 * 查询参数
 */
export type HistoryStatsQuery = {
  promptId?: string
  modelId?: string
  period?: '7d' | '30d'
  teamId?: string
}

/**
 * 历史统计服务
 */
export const historyStatsService = {
  /**
   * 获取特定提示词和模型组合的历史统计
   */
  async getStats(
    promptId: string,
    modelId: string,
    period: '7d' | '30d' = '7d'
  ): Promise<ApiResponse<HistoryStats>> {
    const params = new URLSearchParams({
      promptId,
      modelId,
      period,
    })
    const response = await fetch(`${API_BASE}/stats/history?${params}`)
    return response.json()
  },

  /**
   * 获取提示词的历史统计（聚合所有模型）
   */
  async getPromptStats(
    promptId: string,
    period: '7d' | '30d' = '7d'
  ): Promise<ApiResponse<HistoryStats>> {
    const params = new URLSearchParams({
      promptId,
      period,
    })
    const response = await fetch(`${API_BASE}/stats/history?${params}`)
    return response.json()
  },

  /**
   * 获取模型的历史统计（聚合所有提示词）
   */
  async getModelStats(
    modelId: string,
    period: '7d' | '30d' = '7d'
  ): Promise<ApiResponse<HistoryStats>> {
    const params = new URLSearchParams({
      modelId,
      period,
    })
    const response = await fetch(`${API_BASE}/stats/history?${params}`)
    return response.json()
  },

  /**
   * 获取多维度统计数据
   */
  async getMultiDimensionStats(
    period: '7d' | '30d' = '7d',
    teamId?: string
  ): Promise<ApiResponse<MultiDimensionStats>> {
    const params = new URLSearchParams({ period })
    if (teamId) {
      params.set('teamId', teamId)
    }
    const response = await fetch(`${API_BASE}/stats/history/multi?${params}`)
    return response.json()
  },

  /**
   * 批量获取历史统计（用于监控中心）
   */
  async getBatchStats(
    queries: Array<{ promptId: string; modelId: string }>,
    period: '7d' | '30d' = '7d'
  ): Promise<ApiResponse<HistoryStats[]>> {
    const response = await fetch(`${API_BASE}/stats/history/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ queries, period }),
    })
    return response.json()
  },
}
