'use client'

/**
 * 成员分组 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MemberGroupListItemType, GroupMemberItemType } from '@/lib/mongodb/schemas'

const QUERY_KEY = 'memberGroups'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type GroupDetail = MemberGroupListItemType & {
  members: GroupMemberItemType[]
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  const json: ApiResponse<T> = await response.json()
  if (json.code !== 200) {
    throw new Error(json.message)
  }
  return json.data
}

// 分组列表
export function useMemberGroups() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => fetchApi<MemberGroupListItemType[]>('/api/team/groups'),
  })
}

// 分组详情
export function useMemberGroup(groupId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, groupId],
    queryFn: () => fetchApi<GroupDetail>(`/api/team/groups/${groupId}`),
    enabled: !!groupId,
  })
}

// 创建分组
export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; avatar?: string }) =>
      fetchApi('/api/team/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// 更新分组
export function useUpdateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; avatar?: string }) =>
      fetchApi(`/api/team/groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] })
    },
  })
}

// 删除分组
export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/team/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// 添加成员
export function useAddGroupMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, tmbId, role }: { groupId: string; tmbId: string; role?: string }) =>
      fetchApi(`/api/team/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ tmbId, role }),
      }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] })
    },
  })
}

// 移除成员
export function useRemoveGroupMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, tmbId }: { groupId: string; tmbId: string }) =>
      fetchApi(`/api/team/groups/${groupId}/members/${tmbId}`, { method: 'DELETE' }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] })
    },
  })
}

// 更新成员角色
export function useUpdateGroupMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, tmbId, role }: { groupId: string; tmbId: string; role: string }) =>
      fetchApi(`/api/team/groups/${groupId}/members/${tmbId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] })
    },
  })
}
