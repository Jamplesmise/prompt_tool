import type { ApiResponse } from '@platform/shared'

const API_BASE = '/api/v1'

type UserInfo = {
  id: string
  email: string
  name: string
  avatar: string | null
  role: 'admin' | 'user'
}

type LoginResponse = {
  user: UserInfo
}

export const authService = {
  // 登录
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    return response.json()
  },

  // 登出
  async logout(): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
    })
    return response.json()
  },

  // 获取当前用户
  async me(): Promise<ApiResponse<UserInfo>> {
    const response = await fetch(`${API_BASE}/auth/me`)
    return response.json()
  },
}
