'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { projectsService } from '@/services/projects'
import { useProjectStore } from '@/stores/projectStore'
import { appMessage } from '@/lib/message'
import type { ProjectRole } from '@platform/shared'
import type { CreateProjectInput, UpdateProjectInput, InviteMemberInput } from '@/services/projects'

// 查询 key
const PROJECTS_KEY = ['projects']
const projectDetailKey = (id: string) => ['projects', id]
const projectMembersKey = (id: string) => ['projects', id, 'members']

// 项目列表
export function useProjects(params?: { page?: number; pageSize?: number }) {
  const { setProjects, setLoading } = useProjectStore()

  const query = useQuery({
    queryKey: [...PROJECTS_KEY, params],
    queryFn: async () => {
      const response = await projectsService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })

  // 同步到 store
  useEffect(() => {
    if (query.data) {
      setProjects(query.data.list)
    }
    setLoading(query.isLoading)
  }, [query.data, query.isLoading, setProjects, setLoading])

  return query
}

// 项目详情
export function useProject(id: string) {
  return useQuery({
    queryKey: projectDetailKey(id),
    queryFn: async () => {
      const response = await projectsService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建项目
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { addProject } = useProjectStore()

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const response = await projectsService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      // 添加到 store（作为 OWNER）
      addProject({
        ...project,
        role: 'OWNER',
        memberCount: 1,
      })
      appMessage.success('项目创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新项目
export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { updateProject } = useProjectStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectInput }) => {
      const response = await projectsService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (project, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: projectDetailKey(variables.id) })
      updateProject(variables.id, project)
      appMessage.success('项目更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除项目
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { removeProject } = useProjectStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await projectsService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      removeProject(id)
      appMessage.success('项目删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 转让项目所有权
export function useTransferProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, newOwnerId }: { id: string; newOwnerId: string }) => {
      const response = await projectsService.transfer(id, newOwnerId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: projectDetailKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: projectMembersKey(variables.id) })
      appMessage.success('所有权转让成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '转让失败')
    },
  })
}

// 成员列表
export function useProjectMembers(
  projectId: string,
  params?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: [...projectMembersKey(projectId), params],
    queryFn: async () => {
      const response = await projectsService.members.list(projectId, params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!projectId,
  })
}

// 邀请成员
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string
      data: InviteMemberInput
    }) => {
      const response = await projectsService.members.invite(projectId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectMembersKey(variables.projectId),
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
      projectId,
      userId,
      role,
    }: {
      projectId: string
      userId: string
      role: ProjectRole
    }) => {
      const response = await projectsService.members.updateRole(
        projectId,
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
        queryKey: projectMembersKey(variables.projectId),
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
      projectId,
      userId,
    }: {
      projectId: string
      userId: string
    }) => {
      const response = await projectsService.members.remove(projectId, userId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectMembersKey(variables.projectId),
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
  const { currentProject } = useProjectStore()

  const can = (action: string, _resource?: string): boolean => {
    if (!currentProject) return false

    const role = currentProject.role

    // 所有者拥有所有权限
    if (role === 'OWNER') return true

    // 管理员权限
    if (role === 'ADMIN') {
      // 不能删除项目、转让所有权
      if (action === 'delete' && _resource === 'project') return false
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
    role: currentProject?.role || null,
    can,
    isOwner: currentProject?.role === 'OWNER',
    isAdmin: ['OWNER', 'ADMIN'].includes(currentProject?.role || ''),
    canManageMembers: ['OWNER', 'ADMIN'].includes(currentProject?.role || ''),
  }
}
