import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'

// 模板配置类型
export type TemplateConfig = {
  promptId?: string
  promptVersionId?: string
  modelId?: string
  datasetId?: string
  evaluatorIds?: string[]
  samplingConfig?: {
    type: 'all' | 'random' | 'first'
    count?: number
  }
  abTest?: {
    enabled: boolean
    compareType?: 'prompt' | 'model'
  }
}

// 模板类型
export type TaskTemplate = {
  id: string
  name: string
  description: string | null
  config: TemplateConfig
  isPublic: boolean
  usageCount: number
  createdById: string
  teamId: string | null
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    avatar: string | null
  }
  team?: {
    id: string
    name: string
  } | null
}

// API 响应类型
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

/**
 * 获取模板列表
 */
export function useTemplates(options?: {
  scope?: 'mine' | 'team' | 'all'
  teamId?: string
}) {
  const { scope = 'all', teamId } = options || {}

  return useQuery<TaskTemplate[]>({
    queryKey: ['templates', scope, teamId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('scope', scope)
      if (teamId) params.set('teamId', teamId)

      const res = await fetch(`/api/v1/templates?${params}`)
      const data: ApiResponse<TaskTemplate[]> = await res.json()

      if (data.code !== 200) {
        throw new Error(data.message)
      }

      return data.data
    },
  })
}

/**
 * 获取单个模板
 */
export function useTemplate(id: string) {
  return useQuery<TaskTemplate>({
    queryKey: ['template', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/templates/${id}`)
      const data: ApiResponse<TaskTemplate> = await res.json()

      if (data.code !== 200) {
        throw new Error(data.message)
      }

      return data.data
    },
    enabled: !!id,
  })
}

/**
 * 创建模板
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      description?: string
      config: TemplateConfig
      isPublic?: boolean
      teamId?: string
    }) => {
      const res = await fetch('/api/v1/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data: ApiResponse<TaskTemplate> = await res.json()

      if (data.code !== 200) {
        throw new Error(data.message)
      }

      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      message.success('模板保存成功')
    },
    onError: (error: Error) => {
      message.error(error.message || '保存失败')
    },
  })
}

/**
 * 更新模板
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      name?: string
      description?: string
      config?: TemplateConfig
      isPublic?: boolean
    }) => {
      const { id, ...rest } = params
      const res = await fetch(`/api/v1/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      })
      const data: ApiResponse<TaskTemplate> = await res.json()

      if (data.code !== 200) {
        throw new Error(data.message)
      }

      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] })
      message.success('模板更新成功')
    },
    onError: (error: Error) => {
      message.error(error.message || '更新失败')
    },
  })
}

/**
 * 删除模板
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/templates/${id}`, {
        method: 'DELETE',
      })
      const data: ApiResponse<{ id: string }> = await res.json()

      if (data.code !== 200) {
        throw new Error(data.message)
      }

      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      message.success('模板已删除')
    },
    onError: (error: Error) => {
      message.error(error.message || '删除失败')
    },
  })
}

/**
 * 使用模板（获取配置并增加使用次数）
 */
export function useApplyTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/templates/${id}`, {
        method: 'POST',
      })
      const data: ApiResponse<{ config: TemplateConfig }> = await res.json()

      if (data.code !== 200) {
        throw new Error(data.message)
      }

      return data.data.config
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '应用模板失败')
    },
  })
}
