'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsService } from '@/services/prompts'
import { appMessage } from '@/lib/message'
import type {
  CreatePromptInput,
  UpdatePromptInput,
  PublishVersionInput,
  TestPromptInput,
} from '@/services/prompts'

// 查询 key
const PROMPTS_KEY = ['prompts']
const promptDetailKey = (id: string) => ['prompts', id]
const promptVersionsKey = (id: string) => ['prompts', id, 'versions']

// 提示词列表
export function usePrompts(params?: { page?: number; pageSize?: number; keyword?: string }) {
  return useQuery({
    queryKey: [...PROMPTS_KEY, params],
    queryFn: async () => {
      const response = await promptsService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 提示词详情
export function usePrompt(id: string) {
  return useQuery({
    queryKey: promptDetailKey(id),
    queryFn: async () => {
      const response = await promptsService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建提示词
export function useCreatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePromptInput) => {
      const response = await promptsService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      appMessage.success('提示词创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新提示词（保存草稿）
export function useUpdatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePromptInput }) => {
      const response = await promptsService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      queryClient.invalidateQueries({ queryKey: promptDetailKey(variables.id) })
      appMessage.success('保存成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '保存失败')
    },
  })
}

// 删除提示词
export function useDeletePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await promptsService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      appMessage.success('删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 版本列表
export function usePromptVersions(promptId: string) {
  return useQuery({
    queryKey: promptVersionsKey(promptId),
    queryFn: async () => {
      const response = await promptsService.versions.list(promptId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!promptId,
  })
}

// 版本详情
export function usePromptVersion(promptId: string, versionId: string) {
  return useQuery({
    queryKey: [...promptVersionsKey(promptId), versionId],
    queryFn: async () => {
      const response = await promptsService.versions.get(promptId, versionId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!promptId && !!versionId,
  })
}

// 发布版本
export function usePublishVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promptId, data }: { promptId: string; data: PublishVersionInput }) => {
      const response = await promptsService.versions.publish(promptId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      queryClient.invalidateQueries({ queryKey: promptDetailKey(variables.promptId) })
      queryClient.invalidateQueries({ queryKey: promptVersionsKey(variables.promptId) })
      appMessage.success('版本发布成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '发布失败')
    },
  })
}

// 回滚版本
export function useRollbackVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promptId, versionId }: { promptId: string; versionId: string }) => {
      const response = await promptsService.versions.rollback(promptId, versionId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      queryClient.invalidateQueries({ queryKey: promptDetailKey(variables.promptId) })
      queryClient.invalidateQueries({ queryKey: promptVersionsKey(variables.promptId) })
      appMessage.success('回滚成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '回滚失败')
    },
  })
}

// 版本对比
export function useVersionDiff(promptId: string, v1Id?: string, v2Id?: string) {
  return useQuery({
    queryKey: [...promptVersionsKey(promptId), 'diff', v1Id, v2Id],
    queryFn: async () => {
      if (!v1Id || !v2Id) return null
      const response = await promptsService.versions.diff(promptId, v1Id, v2Id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!promptId && !!v1Id && !!v2Id,
  })
}

// 快速测试
export function useTestPrompt() {
  return useMutation({
    mutationFn: async ({ promptId, data }: { promptId: string; data: TestPromptInput }) => {
      const response = await promptsService.test(promptId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '测试失败')
    },
  })
}
