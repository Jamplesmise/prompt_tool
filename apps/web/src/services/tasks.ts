import type { ApiResponse, TaskProgress, TaskStats, TaskStatus, TaskType } from '@platform/shared'

const API_BASE = '/api/v1'

// 任务列表项
type TaskListItem = {
  id: string
  name: string
  description: string | null
  type: TaskType
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
  // 队列状态（仅 PENDING/RUNNING 任务可能有）
  queuePosition?: number
  queueState?: string
}

// 任务详情
type TaskDetail = TaskListItem & {
  prompts: Array<{
    promptId: string
    promptName: string
    promptVersionId: string
    version: number
  }>
  models: Array<{
    modelId: string
    modelName: string
    modelIdentifier: string
    providerName: string
    providerType: string
  }>
  evaluators: Array<{
    evaluatorId: string
    evaluatorName: string
    evaluatorType: string
  }>
}

// 任务结果项
type TaskResultItem = {
  id: string
  rowIndex: number
  promptId: string
  promptName: string
  promptVersion: number
  modelId: string
  modelName: string
  modelIdentifier: string
  input: Record<string, unknown>
  output: string | null
  expected: string | null
  status: string
  latencyMs: number | null
  tokens: { input: number; output: number; total: number }
  cost: number | null
  costCurrency: 'USD' | 'CNY'
  error: string | null
  evaluations: Array<{
    evaluatorId: string
    evaluatorName: string
    evaluatorType: string
    passed: boolean
    score: number | null
    reason: string | null
    details: Record<string, unknown>
    latencyMs: number | null
  }>
  createdAt: string
}

// 分页响应
type PaginatedResponse<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// FastGPT 模型配置（存储在任务 config 中）
type FastGPTModelConfig = {
  id: string
  modelId: string
  name: string
  provider: string
  inputPrice?: number
  outputPrice?: number
  maxContext?: number
  maxResponse?: number
}

// 创建任务参数
type CreateTaskInput = {
  name: string
  description?: string
  config: {
    promptIds: string[]
    promptVersionIds: string[]
    modelIds: string[] // 本地模型 ID
    datasetId: string
    evaluatorIds: string[]
    execution: {
      concurrency: number
      timeoutSeconds: number
      retryCount: number
    }
    // FastGPT 模型配置
    fastgptModels?: FastGPTModelConfig[]
  }
}

// 任务列表查询参数
type TaskListParams = {
  page?: number
  pageSize?: number
  status?: TaskStatus
  type?: string
  keyword?: string
}

// 结果列表查询参数
type ResultListParams = {
  page?: number
  pageSize?: number
  status?: string
  passed?: boolean
}

// A/B 测试配置
type ABTestConfig = {
  promptId: string
  promptVersionId: string
  modelId: string
}

// 创建 A/B 测试参数
type CreateABTestInput = {
  name: string
  description?: string
  compareType: 'prompt' | 'model'
  configA: ABTestConfig
  configB: ABTestConfig
  datasetId: string
  evaluatorIds: string[]
  execution: {
    concurrency: number
    timeoutSeconds: number
    retryCount: number
  }
}

// A/B 测试创建结果
type ABTestCreateResult = {
  id: string
  abTestId: string
  name: string
  type: string
  status: string
  compareType: string
}

// A/B 测试结果
type ABTestResults = {
  id: string
  taskId: string
  compareType: string
  configA: ABTestConfig
  configB: ABTestConfig
  summary: {
    winsA?: number
    winsB?: number
    ties?: number
    pValue?: number
    significant?: boolean
    winner?: 'A' | 'B' | null
    confidence?: number
  }
  results: Array<{
    rowIndex: number
    winner: 'A' | 'B' | 'tie'
    configA: {
      resultId: string
      output: string | null
      status: string
      latencyMs: number | null
      tokens: { input: number; output: number; total: number }
      cost: number | null
      evaluations: Array<{
        passed: boolean
        score: number | null
        reason: string | null
      }>
    }
    configB: {
      resultId: string
      output: string | null
      status: string
      latencyMs: number | null
      tokens: { input: number; output: number; total: number }
      cost: number | null
      evaluations: Array<{
        passed: boolean
        score: number | null
        reason: string | null
      }>
    }
  }>
}

export const tasksService = {
  // 获取任务列表
  async list(params: TaskListParams = {}): Promise<ApiResponse<PaginatedResponse<TaskListItem>>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.status) searchParams.set('status', params.status)
    if (params.type) searchParams.set('type', params.type)
    if (params.keyword) searchParams.set('keyword', params.keyword)

    const response = await fetch(`${API_BASE}/tasks?${searchParams.toString()}`)
    return response.json()
  },

  // 获取任务详情
  async get(id: string): Promise<ApiResponse<TaskDetail>> {
    const response = await fetch(`${API_BASE}/tasks/${id}`)
    return response.json()
  },

  // 创建任务
  async create(data: CreateTaskInput): Promise<ApiResponse<TaskListItem>> {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除任务
  async delete(id: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 启动任务
  async run(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/tasks/${id}/run`, {
      method: 'POST',
    })
    return response.json()
  },

  // 停止任务
  async stop(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/tasks/${id}/stop`, {
      method: 'POST',
    })
    return response.json()
  },

  // 重试失败用例
  async retry(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/tasks/${id}/retry`, {
      method: 'POST',
    })
    return response.json()
  },

  // 暂停任务
  async pause(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/tasks/${id}/pause`, {
      method: 'POST',
    })
    return response.json()
  },

  // 续跑任务
  async resume(id: string): Promise<ApiResponse<{ message: string; checkpoint?: { completedCount: number; failedCount: number; lastUpdated: string } }>> {
    const response = await fetch(`${API_BASE}/tasks/${id}/resume`, {
      method: 'POST',
    })
    return response.json()
  },

  // 获取任务结果
  async getResults(
    id: string,
    params: ResultListParams = {}
  ): Promise<ApiResponse<PaginatedResponse<TaskResultItem>>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.status) searchParams.set('status', params.status)
    if (params.passed !== undefined) searchParams.set('passed', String(params.passed))

    const response = await fetch(`${API_BASE}/tasks/${id}/results?${searchParams.toString()}`)
    return response.json()
  },

  // 导出结果
  async exportResults(
    id: string,
    format: 'xlsx' | 'csv' | 'json' = 'xlsx'
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE}/tasks/${id}/results/export?format=${format}`)
    if (!response.ok) {
      throw new Error('导出失败')
    }
    return response.blob()
  },

  // 创建 A/B 测试任务
  async createABTest(data: CreateABTestInput): Promise<ApiResponse<ABTestCreateResult>> {
    const response = await fetch(`${API_BASE}/tasks/ab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 获取 A/B 测试结果
  async getABTestResults(id: string): Promise<ApiResponse<ABTestResults>> {
    const response = await fetch(`${API_BASE}/tasks/${id}/ab-results`)
    return response.json()
  },
}

export type {
  TaskListItem,
  TaskDetail,
  TaskResultItem,
  PaginatedResponse,
  CreateTaskInput,
  TaskListParams,
  ResultListParams,
  ABTestConfig,
  CreateABTestInput,
  ABTestCreateResult,
  ABTestResults,
}
