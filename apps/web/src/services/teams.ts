import type { ApiResponse, Team, TeamRole, TeamMemberWithUser } from '@platform/shared'
import { getCurrentTeamId } from '@/stores/teamStore'

const API_BASE = '/api/v1'

// 团队列表项
type TeamListItem = Team & {
  role: TeamRole
  memberCount: number
  owner: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

// 团队列表响应
type TeamListResponse = {
  list: TeamListItem[]
  total: number
  page: number
  pageSize: number
}

// 团队详情
type TeamDetail = Team & {
  role: TeamRole
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
  list: TeamMemberWithUser[]
  total: number
  page: number
  pageSize: number
}

// 创建团队参数
type CreateTeamInput = {
  name: string
  description?: string
  avatar?: string
}

// 更新团队参数
type UpdateTeamInput = Partial<CreateTeamInput>

// 邀请成员参数
type InviteMemberInput = {
  email: string
  role: TeamRole
}

// 获取带团队 ID 的请求头
function getTeamHeaders(): Record<string, string> {
  const teamId = getCurrentTeamId()
  if (teamId) {
    return { 'X-Team-Id': teamId }
  }
  return {}
}

export const teamsService = {
  // 获取团队列表
  async list(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<TeamListResponse>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

    const url = `${API_BASE}/teams${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url)
    return response.json()
  },

  // 获取团队详情
  async get(id: string): Promise<ApiResponse<TeamDetail>> {
    const response = await fetch(`${API_BASE}/teams/${id}`)
    return response.json()
  },

  // 创建团队
  async create(data: CreateTeamInput): Promise<ApiResponse<Team>> {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新团队
  async update(id: string, data: UpdateTeamInput): Promise<ApiResponse<Team>> {
    const response = await fetch(`${API_BASE}/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除团队
  async delete(id: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/teams/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 转让团队所有权
  async transfer(id: string, newOwnerId: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${API_BASE}/teams/${id}/transfer`, {
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
      teamId: string,
      params?: { page?: number; pageSize?: number }
    ): Promise<ApiResponse<MemberListResponse>> {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

      const url = `${API_BASE}/teams/${teamId}/members${searchParams.toString() ? `?${searchParams}` : ''}`
      const response = await fetch(url)
      return response.json()
    },

    // 邀请成员
    async invite(
      teamId: string,
      data: InviteMemberInput
    ): Promise<ApiResponse<TeamMemberWithUser>> {
      const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 修改成员角色
    async updateRole(
      teamId: string,
      userId: string,
      role: TeamRole
    ): Promise<ApiResponse<TeamMemberWithUser>> {
      const response = await fetch(
        `${API_BASE}/teams/${teamId}/members/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      )
      return response.json()
    },

    // 移除成员
    async remove(teamId: string, userId: string): Promise<ApiResponse<null>> {
      const response = await fetch(
        `${API_BASE}/teams/${teamId}/members/${userId}`,
        { method: 'DELETE' }
      )
      return response.json()
    },
  },
}

export { getTeamHeaders }

export type {
  TeamListItem,
  TeamListResponse,
  TeamDetail,
  MemberListResponse,
  CreateTeamInput,
  UpdateTeamInput,
  InviteMemberInput,
}
