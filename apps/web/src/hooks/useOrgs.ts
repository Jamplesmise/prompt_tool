'use client'

/**
 * 组织架构 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrgListItemType, OrgMemberItemType } from '@/lib/mongodb/schemas'

const QUERY_KEY = 'orgs'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type OrgDetail = OrgListItemType & {
  members: OrgMemberItemType[]
  children: OrgListItemType[]
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

// 组织列表
export function useOrgs() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => fetchApi<OrgListItemType[]>('/api/team/orgs'),
  })
}

// 组织详情
export function useOrg(orgId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, orgId],
    queryFn: () => fetchApi<OrgDetail>(`/api/team/orgs/${orgId}`),
    enabled: !!orgId,
  })
}

// 创建组织
export function useCreateOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; parentId?: string; avatar?: string; description?: string }) =>
      fetchApi('/api/team/orgs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// 更新组织
export function useUpdateOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; avatar?: string; description?: string }) =>
      fetchApi(`/api/team/orgs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] })
    },
  })
}

// 删除组织
export function useDeleteOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/team/orgs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// 移动组织
export function useMoveOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      fetchApi(`/api/team/orgs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ parentId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// 添加成员
export function useAddOrgMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, tmbId }: { orgId: string; tmbId: string }) =>
      fetchApi(`/api/team/orgs/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({ tmbId }),
      }),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] })
    },
  })
}

// 批量添加成员
export function useAddOrgMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, tmbIds }: { orgId: string; tmbIds: string[] }) =>
      fetchApi(`/api/team/orgs/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({ tmbIds }),
      }),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] })
    },
  })
}

// 移除成员
export function useRemoveOrgMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, tmbId }: { orgId: string; tmbId: string }) =>
      fetchApi(`/api/team/orgs/${orgId}/members/${tmbId}`, { method: 'DELETE' }),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] })
    },
  })
}
