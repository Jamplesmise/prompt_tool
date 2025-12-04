import type { ApiResponse, User } from '@platform/shared'

const API_BASE = '/api/v1'

// 获取用户列表（管理员）
export async function listUsers(params?: {
  page?: number
  pageSize?: number
  search?: string
  role?: string
}): Promise<ApiResponse<{ list: User[]; total: number }>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.role) searchParams.set('role', params.role)

  const res = await fetch(`${API_BASE}/users?${searchParams.toString()}`)
  return res.json()
}

// 获取单个用户（管理员）
export async function getUser(id: string): Promise<ApiResponse<User>> {
  const res = await fetch(`${API_BASE}/users/${id}`)
  return res.json()
}

// 更新用户（管理员）
export async function updateUser(
  id: string,
  data: { name?: string; role?: string }
): Promise<ApiResponse<User>> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

// 删除用户（管理员）
export async function deleteUser(id: string): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  })
  return res.json()
}

// 重置用户密码（管理员）
export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/users/${id}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
  })
  return res.json()
}

// 更新个人信息
export async function updateProfile(data: {
  name?: string
}): Promise<ApiResponse<User>> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

// 上传头像
export async function uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/users/me/avatar`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

// 删除头像
export async function deleteAvatar(): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/users/me/avatar`, {
    method: 'DELETE',
  })
  return res.json()
}
