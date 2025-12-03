import type { ApiResponse, Prompt, PromptVersion, PromptVariable } from '@platform/shared'

const API_BASE = '/api/v1'

// 提示词列表项
type PromptListItem = {
  id: string
  name: string
  description: string | null
  currentVersion: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

// 提示词列表响应
type PromptListResponse = {
  list: PromptListItem[]
  total: number
  page: number
  pageSize: number
}

// 提示词详情（含创建者信息）
type PromptDetail = Prompt & {
  createdBy: {
    id: string
    name: string
    email: string
  }
}

// 版本列表项
type VersionListItem = {
  id: string
  version: number
  changeLog: string | null
  createdAt: string
  createdBy: {
    id: string
    name: string
  }
}

// 版本详情
type VersionDetail = PromptVersion & {
  createdBy: {
    id: string
    name: string
    email: string
  }
}

// 版本对比响应
type VersionDiffResponse = {
  v1: {
    id: string
    version: number
    content: string
    variables: PromptVariable[]
    changeLog: string | null
    createdAt: string
  }
  v2: {
    id: string
    version: number
    content: string
    variables: PromptVariable[]
    changeLog: string | null
    createdAt: string
  }
}

// 快速测试请求参数
type TestPromptInput = {
  modelId: string
  versionId?: string
  variables?: Record<string, unknown>
}

// 快速测试响应
type TestPromptResult = {
  success: boolean
  output?: string
  error?: string
  latencyMs: number
  tokens?: {
    input: number
    output: number
    total: number
  }
  renderedPrompt?: string
}

// 创建提示词参数
type CreatePromptInput = {
  name: string
  description?: string
  content: string
  tags?: string[]
}

// 更新提示词参数
type UpdatePromptInput = {
  name?: string
  description?: string
  content?: string
  tags?: string[]
  variables?: PromptVariable[]
}

// 发布版本参数
type PublishVersionInput = {
  changeLog?: string
}

// 回滚响应
type RollbackResponse = {
  version: PromptVersion
  prompt: Prompt
}

export const promptsService = {
  // 获取提示词列表
  async list(params?: {
    page?: number
    pageSize?: number
    keyword?: string
  }): Promise<ApiResponse<PromptListResponse>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.keyword) searchParams.set('keyword', params.keyword)

    const url = `${API_BASE}/prompts${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url)
    return response.json()
  },

  // 获取提示词详情
  async get(id: string): Promise<ApiResponse<PromptDetail>> {
    const response = await fetch(`${API_BASE}/prompts/${id}`)
    return response.json()
  },

  // 创建提示词
  async create(data: CreatePromptInput): Promise<ApiResponse<Prompt>> {
    const response = await fetch(`${API_BASE}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新提示词（保存草稿）
  async update(id: string, data: UpdatePromptInput): Promise<ApiResponse<Prompt>> {
    const response = await fetch(`${API_BASE}/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除提示词
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await fetch(`${API_BASE}/prompts/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 版本相关
  versions: {
    // 获取版本列表
    async list(promptId: string): Promise<ApiResponse<VersionListItem[]>> {
      const response = await fetch(`${API_BASE}/prompts/${promptId}/versions`)
      return response.json()
    },

    // 获取版本详情
    async get(promptId: string, versionId: string): Promise<ApiResponse<VersionDetail>> {
      const response = await fetch(`${API_BASE}/prompts/${promptId}/versions/${versionId}`)
      return response.json()
    },

    // 发布新版本
    async publish(promptId: string, data: PublishVersionInput): Promise<ApiResponse<PromptVersion>> {
      const response = await fetch(`${API_BASE}/prompts/${promptId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 回滚到指定版本
    async rollback(promptId: string, versionId: string): Promise<ApiResponse<RollbackResponse>> {
      const response = await fetch(
        `${API_BASE}/prompts/${promptId}/versions/${versionId}/rollback`,
        { method: 'POST' }
      )
      return response.json()
    },

    // 版本对比
    async diff(
      promptId: string,
      v1Id: string,
      v2Id: string
    ): Promise<ApiResponse<VersionDiffResponse>> {
      const response = await fetch(
        `${API_BASE}/prompts/${promptId}/versions/diff?v1=${v1Id}&v2=${v2Id}`
      )
      return response.json()
    },
  },

  // 快速测试
  async test(id: string, data: TestPromptInput): Promise<ApiResponse<TestPromptResult>> {
    const response = await fetch(`${API_BASE}/prompts/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },
}

export type {
  PromptListItem,
  PromptListResponse,
  PromptDetail,
  VersionListItem,
  VersionDetail,
  VersionDiffResponse,
  TestPromptInput,
  TestPromptResult,
  CreatePromptInput,
  UpdatePromptInput,
  PublishVersionInput,
  RollbackResponse,
}
