import type { ApiResponse, ApiToken, ApiTokenScope } from '@platform/shared'

const API_BASE = '/api/v1'

// Token 列表项
type TokenListItem = {
  id: string
  name: string
  tokenPrefix: string
  scopes: ApiTokenScope[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

// Token 列表响应
type TokenListResponse = {
  list: TokenListItem[]
  total: number
  page: number
  pageSize: number
}

// 创建 Token 响应（包含完整 Token）
type CreateTokenResponse = TokenListItem & {
  token: string
}

// 创建 Token 参数
type CreateTokenInput = {
  name: string
  scopes?: ApiTokenScope[]
  expiresAt?: string | null
}

export const tokensService = {
  // 获取 Token 列表
  async list(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<TokenListResponse>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

    const url = `${API_BASE}/tokens${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url)
    return response.json()
  },

  // 创建 Token
  async create(data: CreateTokenInput): Promise<ApiResponse<CreateTokenResponse>> {
    const response = await fetch(`${API_BASE}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除 Token
  async delete(id: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/tokens/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
}

export type {
  TokenListItem,
  TokenListResponse,
  CreateTokenResponse,
  CreateTokenInput,
}
