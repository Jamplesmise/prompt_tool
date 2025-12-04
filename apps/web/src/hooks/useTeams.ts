'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { teamsService } from '@/services/teams'
import { useTeamStore } from '@/stores/teamStore'
import { appMessage } from '@/lib/message'
import type { TeamRole } from '@platform/shared'
import type { CreateTeamInput, UpdateTeamInput, InviteMemberInput } from '@/services/teams'

// 查询 key
const TEAMS_KEY = ['teams']
const teamDetailKey = (id: string) => ['teams', id]
const teamMembersKey = (id: string) => ['teams', id, 'members']

// 团队列表
export function useTeams(params?: { page?: number; pageSize?: number }) {
  const { setTeams, setLoading } = useTeamStore()

  const query = useQuery({
    queryKey: [...TEAMS_KEY, params],
    queryFn: async () => {
      const response = await teamsService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })

  // 同步到 store
  useEffect(() => {
    if (query.data) {
      setTeams(query.data.list)
    }
    setLoading(query.isLoading)
  }, [query.data, query.isLoading, setTeams, setLoading])

  return query
}

// 团队详情
export function useTeam(id: string) {
  return useQuery({
    queryKey: teamDetailKey(id),
    queryFn: async () => {
      const response = await teamsService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建团队
export function useCreateTeam() {
  const queryClient = useQueryClient()
  const { addTeam } = useTeamStore()

  return useMutation({
    mutationFn: async (data: CreateTeamInput) => {
      const response = await teamsService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY })
      // 添加到 store（作为 OWNER）
      addTeam({
        ...team,
        role: 'OWNER',
        memberCount: 1,
      })
      appMessage.success('团队创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新团队
export function useUpdateTeam() {
  const queryClient = useQueryClient()
  const { updateTeam } = useTeamStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTeamInput }) => {
      const response = await teamsService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (team, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY })
      queryClient.invalidateQueries({ queryKey: teamDetailKey(variables.id) })
      updateTeam(variables.id, team)
      appMessage.success('团队更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除团队
export function useDeleteTeam() {
  const queryClient = useQueryClient()
  const { removeTeam } = useTeamStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await teamsService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY })
      removeTeam(id)
      appMessage.success('团队删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 转让团队所有权
export function useTransferTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, newOwnerId }: { id: string; newOwnerId: string }) => {
      const response = await teamsService.transfer(id, newOwnerId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY })
      queryClient.invalidateQueries({ queryKey: teamDetailKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: teamMembersKey(variables.id) })
      appMessage.success('所有权转让成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '转让失败')
    },
  })
}

// 成员列表
export function useTeamMembers(
  teamId: string,
  params?: { page?: number; pageSize?: number }
) {
  const { isLoading: teamsLoading, teams } = useTeamStore()
  // 确保只在团队列表加载完成且 teamId 在列表中时才发起请求
  const isValidTeam = !teamsLoading && teams.some((t) => t.id === teamId)

  return useQuery({
    queryKey: [...teamMembersKey(teamId), params],
    queryFn: async () => {
      const response = await teamsService.members.list(teamId, params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!teamId && isValidTeam,
    retry: false, // 不重试 404 等错误
  })
}

// 邀请成员
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      teamId,
      data,
    }: {
      teamId: string
      data: InviteMemberInput
    }) => {
      const response = await teamsService.members.invite(teamId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teamMembersKey(variables.teamId),
      })
      appMessage.success('成员邀请成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '邀请失败')
    },
  })
}

// 修改成员角色
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role,
    }: {
      teamId: string
      userId: string
      role: TeamRole
    }) => {
      const response = await teamsService.members.updateRole(
        teamId,
        userId,
        role
      )
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teamMembersKey(variables.teamId),
      })
      appMessage.success('角色修改成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '修改失败')
    },
  })
}

// 移除成员
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
    }: {
      teamId: string
      userId: string
    }) => {
      const response = await teamsService.members.remove(teamId, userId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teamMembersKey(variables.teamId),
      })
      appMessage.success('成员已移除')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '移除失败')
    },
  })
}

// 权限检查 hook
export function usePermission() {
  const { currentTeam } = useTeamStore()

  const can = (action: string, _resource?: string): boolean => {
    if (!currentTeam) return false

    const role = currentTeam.role

    // 所有者拥有所有权限
    if (role === 'OWNER') return true

    // 管理员权限
    if (role === 'ADMIN') {
      // 不能删除团队、转让所有权
      if (action === 'delete' && _resource === 'team') return false
      if (action === 'transfer') return false
      return true
    }

    // 成员权限
    if (role === 'MEMBER') {
      // 可以查看、创建、编辑、执行
      return ['view', 'create', 'edit', 'execute'].includes(action)
    }

    // 查看者只能查看
    if (role === 'VIEWER') {
      return action === 'view'
    }

    return false
  }

  return {
    role: currentTeam?.role || null,
    can,
    isOwner: currentTeam?.role === 'OWNER',
    isAdmin: ['OWNER', 'ADMIN'].includes(currentTeam?.role || ''),
    canManageMembers: ['OWNER', 'ADMIN'].includes(currentTeam?.role || ''),
  }
}
