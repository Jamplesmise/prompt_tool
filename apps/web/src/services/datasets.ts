import type {
  ApiResponse,
  Dataset,
  DatasetRow,
  DatasetVersion,
  DatasetDiff,
} from '@platform/shared'

const API_BASE = '/api/v1'

// 数据集列表项
type DatasetListItem = {
  id: string
  name: string
  description: string | null
  schema: Array<{ name: string; type: string }> | null
  rowCount: number
  isPersistent: boolean
  createdAt: string
  updatedAt: string
}

// 数据集列表响应
type DatasetListResponse = {
  list: DatasetListItem[]
  total: number
  page: number
  pageSize: number
}

// 数据集详情
type DatasetDetail = Dataset & {
  createdBy: {
    id: string
    name: string
    email: string
  }
}

// 数据行列表响应
type DatasetRowListResponse = {
  list: DatasetRow[]
  total: number
  page: number
  pageSize: number
}

// 上传响应
type UploadResponse = {
  id: string
  rowCount: number
  schema: Array<{ name: string; type: string }>
}

// 创建数据集参数
type CreateDatasetInput = {
  name: string
  description?: string
  schema?: Array<{ name: string; type: string }>
  isPersistent?: boolean
}

// 更新数据集参数
type UpdateDatasetInput = {
  name?: string
  description?: string
  schema?: Array<{ name: string; type: string }>
  isPersistent?: boolean
}

// 上传文件参数
type UploadFileInput = {
  file: File
  isPersistent?: boolean
  fieldMapping?: Record<string, string>
}

// Phase 10: 版本相关类型
type DatasetVersionListItem = DatasetVersion & {
  createdBy: {
    id: string
    name: string
  }
}

type DatasetVersionDetail = DatasetVersion & {
  createdBy: {
    id: string
    name: string
  }
}

type CreateDatasetVersionInput = {
  changeLog?: string
}

type DatasetVersionRowsResponse = {
  rows: Array<{
    id: string
    versionId: string
    rowIndex: number
    data: Record<string, unknown>
    hash: string
  }>
  total: number
  offset: number
  limit: number
}

type DatasetVersionDiffResponse = {
  versionA: DatasetVersionListItem
  versionB: DatasetVersionListItem
  diff: DatasetDiff
}

export const datasetsService = {
  // 获取数据集列表
  async list(params?: {
    page?: number
    pageSize?: number
    keyword?: string
  }): Promise<ApiResponse<DatasetListResponse>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.keyword) searchParams.set('keyword', params.keyword)

    const url = `${API_BASE}/datasets${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url)
    return response.json()
  },

  // 获取数据集详情
  async get(id: string): Promise<ApiResponse<DatasetDetail>> {
    const response = await fetch(`${API_BASE}/datasets/${id}`)
    return response.json()
  },

  // 创建数据集
  async create(data: CreateDatasetInput): Promise<ApiResponse<Dataset>> {
    const response = await fetch(`${API_BASE}/datasets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新数据集
  async update(id: string, data: UpdateDatasetInput): Promise<ApiResponse<Dataset>> {
    const response = await fetch(`${API_BASE}/datasets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除数据集
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await fetch(`${API_BASE}/datasets/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 上传文件
  async upload(id: string, data: UploadFileInput): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('isPersistent', String(data.isPersistent ?? false))
    if (data.fieldMapping) {
      formData.append('fieldMapping', JSON.stringify(data.fieldMapping))
    }

    const response = await fetch(`${API_BASE}/datasets/${id}/upload`, {
      method: 'POST',
      body: formData,
    })
    return response.json()
  },

  // 下载数据集
  download(id: string, format: 'xlsx' | 'csv' = 'xlsx'): void {
    window.open(`${API_BASE}/datasets/${id}/download?format=${format}`, '_blank')
  },

  // 下载模板
  downloadTemplate(type: 'basic' | 'with-expected'): void {
    window.open(`${API_BASE}/datasets/templates/${type}`, '_blank')
  },

  // 数据行相关
  rows: {
    // 获取数据行列表
    async list(
      datasetId: string,
      params?: { page?: number; pageSize?: number }
    ): Promise<ApiResponse<DatasetRowListResponse>> {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

      const url = `${API_BASE}/datasets/${datasetId}/rows${searchParams.toString() ? `?${searchParams}` : ''}`
      const response = await fetch(url)
      return response.json()
    },

    // 新增数据行
    async create(
      datasetId: string,
      data: Record<string, unknown>
    ): Promise<ApiResponse<DatasetRow>> {
      const response = await fetch(`${API_BASE}/datasets/${datasetId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      return response.json()
    },

    // 更新数据行
    async update(
      datasetId: string,
      rowId: string,
      data: Record<string, unknown>
    ): Promise<ApiResponse<DatasetRow>> {
      const response = await fetch(`${API_BASE}/datasets/${datasetId}/rows/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      return response.json()
    },

    // 删除数据行
    async delete(datasetId: string, rowId: string): Promise<ApiResponse<{ id: string }>> {
      const response = await fetch(`${API_BASE}/datasets/${datasetId}/rows/${rowId}`, {
        method: 'DELETE',
      })
      return response.json()
    },
  },

  // Phase 10: 版本管理
  versions: {
    // 获取版本列表
    async list(datasetId: string): Promise<ApiResponse<DatasetVersionListItem[]>> {
      const response = await fetch(`${API_BASE}/datasets/${datasetId}/versions`)
      return response.json()
    },

    // 获取版本详情
    async get(datasetId: string, versionId: string): Promise<ApiResponse<DatasetVersionDetail>> {
      const response = await fetch(`${API_BASE}/datasets/${datasetId}/versions/${versionId}`)
      return response.json()
    },

    // 创建版本快照
    async create(
      datasetId: string,
      data: CreateDatasetVersionInput
    ): Promise<ApiResponse<DatasetVersion>> {
      const response = await fetch(`${API_BASE}/datasets/${datasetId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 获取版本数据行
    async getRows(
      datasetId: string,
      versionId: string,
      params?: { offset?: number; limit?: number }
    ): Promise<ApiResponse<DatasetVersionRowsResponse>> {
      const searchParams = new URLSearchParams()
      if (params?.offset) searchParams.set('offset', String(params.offset))
      if (params?.limit) searchParams.set('limit', String(params.limit))

      const url = `${API_BASE}/datasets/${datasetId}/versions/${versionId}/rows${
        searchParams.toString() ? `?${searchParams}` : ''
      }`
      const response = await fetch(url)
      return response.json()
    },

    // 回滚到指定版本
    async rollback(
      datasetId: string,
      versionId: string
    ): Promise<ApiResponse<{ version: DatasetVersion }>> {
      const response = await fetch(
        `${API_BASE}/datasets/${datasetId}/versions/${versionId}/rollback`,
        { method: 'POST' }
      )
      return response.json()
    },

    // 版本对比
    async diff(
      datasetId: string,
      v1: number,
      v2: number
    ): Promise<ApiResponse<DatasetVersionDiffResponse>> {
      const response = await fetch(
        `${API_BASE}/datasets/${datasetId}/versions/diff?v1=${v1}&v2=${v2}`
      )
      return response.json()
    },
  },
}

export type {
  DatasetListItem,
  DatasetListResponse,
  DatasetDetail,
  DatasetRowListResponse,
  UploadResponse,
  CreateDatasetInput,
  UpdateDatasetInput,
  UploadFileInput,
  // Phase 10: 版本相关类型
  DatasetVersionListItem,
  DatasetVersionDetail,
  CreateDatasetVersionInput,
  DatasetVersionRowsResponse,
  DatasetVersionDiffResponse,
}
