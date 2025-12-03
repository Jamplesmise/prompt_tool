// API 请求/响应类型

export type ApiResponse<T = unknown> = {
  code: number
  message: string
  data: T
}

export type ApiError = {
  code: number
  message: string
  data: null
}

export type PaginationParams = {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type PaginatedData<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>

// 请求类型辅助
export type ApiRequestBody<T> = T

// 响应类型辅助
export type ApiResponseData<T> = ApiResponse<T>

// 批量操作
export type BatchDeleteInput = {
  ids: string[]
}

export type BatchDeleteResult = {
  deleted: number
  failed: string[]
}
