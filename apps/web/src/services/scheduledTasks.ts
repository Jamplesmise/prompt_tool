import type { ApiResponse, ScheduledExecutionStatus } from '@platform/shared'

const API_BASE = '/api/v1'

// 定时任务列表项
type ScheduledTaskListItem = {
  id: string
  name: string
  description: string | null
  cronExpression: string
  timezone: string
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
  taskTemplate: {
    id: string
    name: string
  }
  _count: {
    executions: number
  }
}

// 定时任务详情
type ScheduledTaskDetail = Omit<ScheduledTaskListItem, '_count'> & {
  taskTemplate: {
    id: string
    name: string
    description: string | null
    type: string
    config: Record<string, unknown>
    dataset: {
      id: string
      name: string
    }
  }
  executions: ScheduledExecutionItem[]
  createdBy: {
    id: string
    name: string
  }
}

// 执行记录项
type ScheduledExecutionItem = {
  id: string
  scheduledTaskId: string
  taskId: string
  status: ScheduledExecutionStatus
  error: string | null
  createdAt: string
  task: {
    id: string
    name: string
    status: string
    progress?: Record<string, unknown>
    stats?: Record<string, unknown>
    startedAt?: string
    completedAt?: string
  }
}

// 分页响应
type PaginatedResponse<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 定时任务列表查询参数
type ScheduledTaskListParams = {
  page?: number
  pageSize?: number
  isActive?: boolean
  keyword?: string
}

// 创建定时任务参数
type CreateScheduledTaskInput = {
  name: string
  description?: string
  taskTemplateId: string
  cronExpression: string
  timezone?: string
  isActive?: boolean
}

// 更新定时任务参数
type UpdateScheduledTaskInput = {
  name?: string
  description?: string
  cronExpression?: string
  timezone?: string
}

// 执行历史查询参数
type ExecutionListParams = {
  page?: number
  pageSize?: number
  status?: ScheduledExecutionStatus
}

export const scheduledTasksService = {
  // 获取定时任务列表
  async list(
    params: ScheduledTaskListParams = {}
  ): Promise<ApiResponse<PaginatedResponse<ScheduledTaskListItem>>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive))
    if (params.keyword) searchParams.set('keyword', params.keyword)

    const response = await fetch(`${API_BASE}/scheduled-tasks?${searchParams.toString()}`)
    return response.json()
  },

  // 获取定时任务详情
  async get(id: string): Promise<ApiResponse<ScheduledTaskDetail>> {
    const response = await fetch(`${API_BASE}/scheduled-tasks/${id}`)
    return response.json()
  },

  // 创建定时任务
  async create(data: CreateScheduledTaskInput): Promise<ApiResponse<ScheduledTaskListItem>> {
    const response = await fetch(`${API_BASE}/scheduled-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新定时任务
  async update(
    id: string,
    data: UpdateScheduledTaskInput
  ): Promise<ApiResponse<ScheduledTaskListItem>> {
    const response = await fetch(`${API_BASE}/scheduled-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除定时任务
  async delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const response = await fetch(`${API_BASE}/scheduled-tasks/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 切换启用/禁用
  async toggle(id: string): Promise<ApiResponse<ScheduledTaskListItem>> {
    const response = await fetch(`${API_BASE}/scheduled-tasks/${id}/toggle`, {
      method: 'POST',
    })
    return response.json()
  },

  // 立即执行
  async runNow(id: string): Promise<ApiResponse<{ message: string; jobId: string }>> {
    const response = await fetch(`${API_BASE}/scheduled-tasks/${id}/run-now`, {
      method: 'POST',
    })
    return response.json()
  },

  // 获取执行历史
  async getExecutions(
    id: string,
    params: ExecutionListParams = {}
  ): Promise<ApiResponse<PaginatedResponse<ScheduledExecutionItem>>> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.status) searchParams.set('status', params.status)

    const response = await fetch(
      `${API_BASE}/scheduled-tasks/${id}/executions?${searchParams.toString()}`
    )
    return response.json()
  },
}

export type {
  ScheduledTaskListItem,
  ScheduledTaskDetail,
  ScheduledExecutionItem,
  PaginatedResponse,
  ScheduledTaskListParams,
  CreateScheduledTaskInput,
  UpdateScheduledTaskInput,
  ExecutionListParams,
}
