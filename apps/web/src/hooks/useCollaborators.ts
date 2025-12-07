'use client'

/**
 * 协作者管理 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ResourceType } from '@/lib/permission'
import type { CollaboratorDetailType } from '@/lib/mongodb/schemas'

const QUERY_KEY = 'collaborators'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type CollaboratorInput =
  | { tmbId: string; permission: number }
  | { groupId: string; permission: number }
  | { orgId: string; permission: number }

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

// 获取协作者列表
export function useCollaborators(resourceType: ResourceType, resourceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, resourceType, resourceId],
    queryFn: () =>
      fetchApi<{ collaborators: CollaboratorDetailType[] }>(
        `/api/permission/${resourceType}/${resourceId}/collaborators`
      ),
    enabled: !!resourceType && !!resourceId,
  })
}

// 更新协作者
export function useUpdateCollaborators() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      resourceType,
      resourceId,
      collaborators,
    }: {
      resourceType: ResourceType
      resourceId: string
      collaborators: CollaboratorInput[]
    }) =>
      fetchApi(`/api/permission/${resourceType}/${resourceId}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({ collaborators }),
      }),
    onSuccess: (_, { resourceType, resourceId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, resourceType, resourceId] })
    },
  })
}

// 删除协作者
export function useDeleteCollaborator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      resourceType,
      resourceId,
      ...collaboratorId
    }: {
      resourceType: ResourceType
      resourceId: string
    } & ({ tmbId: string } | { groupId: string } | { orgId: string })) =>
      fetchApi(`/api/permission/${resourceType}/${resourceId}/collaborators`, {
        method: 'DELETE',
        body: JSON.stringify(collaboratorId),
      }),
    onSuccess: (_, { resourceType, resourceId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, resourceType, resourceId] })
    },
  })
}
