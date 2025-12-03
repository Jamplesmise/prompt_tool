import type { ApiResponse, Project, ProjectRole, ProjectMemberWithUser } from '@platform/shared'
import { getCurrentProjectId } from '@/stores/projectStore'

const API_BASE = '/api/v1'

// 项目列表项
type ProjectListItem = Project & {
  role: ProjectRole
  memberCount: number
  owner: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

// 项目列表响应
type ProjectListResponse = {
  list: ProjectListItem[]
  total: number
  page: number
  pageSize: number
}

// 项目详情
type ProjectDetail = Project & {
  role: ProjectRole
  owner: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  _count: {
    members: number
    prompts: number
    datasets: number
    tasks: number
  }
}

// 成员列表响应
type MemberListResponse = {
  list: ProjectMemberWithUser[]
  total: number
  page: number
  pageSize: number
}

// 创建项目参数
type CreateProjectInput = {
  name: string
  description?: string
  avatar?: string
}

// 更新项目参数
type UpdateProjectInput = Partial<CreateProjectInput>

// 邀请成员参数
type InviteMemberInput = {
  email: string
  role: ProjectRole
}

// 获取带项目 ID 的请求头
function getProjectHeaders(): Record<string, string> {
  const projectId = getCurrentProjectId()
  if (projectId) {
    return { 'X-Project-Id': projectId }
  }
  return {}
}

export const projectsService = {
  // 获取项目列表
  async list(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<ProjectListResponse>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

    const url = `${API_BASE}/projects${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url)
    return response.json()
  },

  // 获取项目详情
  async get(id: string): Promise<ApiResponse<ProjectDetail>> {
    const response = await fetch(`${API_BASE}/projects/${id}`)
    return response.json()
  },

  // 创建项目
  async create(data: CreateProjectInput): Promise<ApiResponse<Project>> {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新项目
  async update(id: string, data: UpdateProjectInput): Promise<ApiResponse<Project>> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除项目
  async delete(id: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 转让项目所有权
  async transfer(id: string, newOwnerId: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/projects/${id}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newOwnerId }),
    })
    return response.json()
  },

  // 成员相关
  members: {
    // 获取成员列表
    async list(
      projectId: string,
      params?: { page?: number; pageSize?: number }
    ): Promise<ApiResponse<MemberListResponse>> {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

      const url = `${API_BASE}/projects/${projectId}/members${searchParams.toString() ? `?${searchParams}` : ''}`
      const response = await fetch(url)
      return response.json()
    },

    // 邀请成员
    async invite(
      projectId: string,
      data: InviteMemberInput
    ): Promise<ApiResponse<ProjectMemberWithUser>> {
      const response = await fetch(`${API_BASE}/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 修改成员角色
    async updateRole(
      projectId: string,
      userId: string,
      role: ProjectRole
    ): Promise<ApiResponse<ProjectMemberWithUser>> {
      const response = await fetch(
        `${API_BASE}/projects/${projectId}/members/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      )
      return response.json()
    },

    // 移除成员
    async remove(projectId: string, userId: string): Promise<ApiResponse<null>> {
      const response = await fetch(
        `${API_BASE}/projects/${projectId}/members/${userId}`,
        { method: 'DELETE' }
      )
      return response.json()
    },
  },
}

export { getProjectHeaders }

export type {
  ProjectListItem,
  ProjectListResponse,
  ProjectDetail,
  MemberListResponse,
  CreateProjectInput,
  UpdateProjectInput,
  InviteMemberInput,
}
