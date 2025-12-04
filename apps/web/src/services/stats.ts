import type { ApiResponse } from '@platform/shared'

const API_BASE = '/api/v1'

// 工作台统计数据类型
type OverviewStats = {
  promptCount: number
  datasetCount: number
  taskCountThisWeek: number
  avgPassRate: number | null
  totalCostThisWeek?: number
  totalTokensThisWeek?: number
}

// 趋势数据点类型
type TrendDataPoint = {
  date: string
  executed: number
  passed: number
  failed: number
}

// 趋势数据响应类型
type TrendDataResponse = {
  points: Array<{
    date: string
    total: number
    passed: number
    failed: number
    avgLatency: number | null
    totalCost: number
  }>
  summary: {
    totalExecutions: number
    avgPassRate: number | null
    totalCost: number
  }
}

// 任务状态类型
type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED'

// 任务进度类型
type TaskProgress = {
  total: number
  completed: number
  failed: number
}

// 任务统计类型
type TaskStats = {
  passRate: number | null
  avgLatencyMs: number | null
  totalTokens: number
  passCount: number
  failCount: number
  totalCost: number
}

// 任务列表项类型
type TaskListItem = {
  id: string
  name: string
  description: string | null
  type: string
  status: TaskStatus
  progress: TaskProgress
  stats: TaskStats
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  dataset: {
    id: string
    name: string
  }
}

type TaskListResponse = {
  list: TaskListItem[]
  total: number
  page: number
  pageSize: number
}

export const statsService = {
  // 获取工作台统计概览
  async getOverview(): Promise<ApiResponse<OverviewStats>> {
    const response = await fetch(`${API_BASE}/stats/overview`)
    return response.json()
  },

  // 获取最近任务列表
  async getRecentTasks(limit = 10): Promise<ApiResponse<TaskListResponse>> {
    const response = await fetch(`${API_BASE}/tasks?pageSize=${limit}&page=1`)
    return response.json()
  },

  // 获取趋势数据
  async getTrends(
    range: '7d' | '14d' | '30d' | '60d' | 'custom' = '7d',
    customRange?: [string, string]
  ): Promise<ApiResponse<TrendDataResponse>> {
    let url = `${API_BASE}/stats/trends?range=${range}`
    if (range === 'custom' && customRange) {
      url = `${API_BASE}/stats/trends?range=custom&start=${customRange[0]}&end=${customRange[1]}`
    }
    const response = await fetch(url)
    return response.json()
  },
}

export type {
  OverviewStats,
  TrendDataPoint,
  TrendDataResponse,
  TaskStatus,
  TaskProgress,
  TaskStats,
  TaskListItem,
  TaskListResponse,
}
