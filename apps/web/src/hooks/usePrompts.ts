'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsService } from '@/services/prompts'
import { appMessage } from '@/lib/message'
import type {
  CreatePromptInput,
  UpdatePromptInput,
  PublishVersionInput,
  TestPromptInput,
  CreateBranchInput,
  UpdateBranchInput,
  MergeBranchInput,
  PublishBranchVersionInput,
} from '@/services/prompts'

// 查询 key
const PROMPTS_KEY = ['prompts']
const promptDetailKey = (id: string) => ['prompts', id]
const promptVersionsKey = (id: string) => ['prompts', id, 'versions']
const promptBranchesKey = (id: string) => ['prompts', id, 'branches']
const promptBranchDetailKey = (promptId: string, branchId: string) => ['prompts', promptId, 'branches', branchId]

// 提示词列表
export function usePrompts(params?: { page?: number; pageSize?: number; keyword?: string; tags?: string[] }) {
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

// 批量删除提示词
export function useBatchDeletePrompts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await promptsService.batchDelete(ids)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      appMessage.success(`成功删除 ${data.deleted} 个提示词`)
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '批量删除失败')
    },
  })
}

// 批量导出提示词
export function useBatchExportPrompts() {
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await promptsService.batchExport(ids)
    },
    onSuccess: () => {
      appMessage.success('导出成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '导出失败')
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

// 复制提示词
export function useCopyPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await promptsService.copy(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_KEY })
      appMessage.success('复制成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '复制失败')
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

// ============================================
// Phase 10: 分支管理 Hooks
// ============================================

// 分支列表
export function useBranches(promptId: string) {
  return useQuery({
    queryKey: promptBranchesKey(promptId),
    queryFn: async () => {
      const response = await promptsService.branches.list(promptId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!promptId,
  })
}

// 分支详情
export function useBranch(promptId: string, branchId: string) {
  return useQuery({
    queryKey: promptBranchDetailKey(promptId, branchId),
    queryFn: async () => {
      const response = await promptsService.branches.get(promptId, branchId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!promptId && !!branchId,
  })
}

// 创建分支
export function useCreateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promptId, data }: { promptId: string; data: CreateBranchInput }) => {
      const response = await promptsService.branches.create(promptId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptBranchesKey(variables.promptId) })
      appMessage.success('分支创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新分支
export function useUpdateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      promptId,
      branchId,
      data,
    }: {
      promptId: string
      branchId: string
      data: UpdateBranchInput
    }) => {
      const response = await promptsService.branches.update(promptId, branchId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptBranchesKey(variables.promptId) })
      queryClient.invalidateQueries({
        queryKey: promptBranchDetailKey(variables.promptId, variables.branchId),
      })
      appMessage.success('分支更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除分支
export function useDeleteBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promptId, branchId }: { promptId: string; branchId: string }) => {
      const response = await promptsService.branches.delete(promptId, branchId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptBranchesKey(variables.promptId) })
      appMessage.success('分支删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 合并分支
export function useMergeBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      promptId,
      branchId,
      data,
    }: {
      promptId: string
      branchId: string
      data: MergeBranchInput
    }) => {
      const response = await promptsService.branches.merge(promptId, branchId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptBranchesKey(variables.promptId) })
      queryClient.invalidateQueries({ queryKey: promptDetailKey(variables.promptId) })
      queryClient.invalidateQueries({ queryKey: promptVersionsKey(variables.promptId) })
      appMessage.success('分支合并成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '合并失败')
    },
  })
}

// 归档分支
export function useArchiveBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promptId, branchId }: { promptId: string; branchId: string }) => {
      const response = await promptsService.branches.archive(promptId, branchId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptBranchesKey(variables.promptId) })
      appMessage.success('分支已归档')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '归档失败')
    },
  })
}

// 分支对比
export function useBranchDiff(promptId: string, sourceBranchId?: string, targetBranchId?: string) {
  return useQuery({
    queryKey: [...promptBranchesKey(promptId), 'diff', sourceBranchId, targetBranchId],
    queryFn: async () => {
      if (!sourceBranchId || !targetBranchId) return null
      const response = await promptsService.branches.diff(promptId, sourceBranchId, targetBranchId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!promptId && !!sourceBranchId && !!targetBranchId,
  })
}

// 在分支上发布版本
export function usePublishBranchVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      promptId,
      branchId,
      data,
    }: {
      promptId: string
      branchId: string
      data: PublishBranchVersionInput
    }) => {
      const response = await promptsService.branches.publishVersion(promptId, branchId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptBranchesKey(variables.promptId) })
      queryClient.invalidateQueries({
        queryKey: promptBranchDetailKey(variables.promptId, variables.branchId),
      })
      queryClient.invalidateQueries({ queryKey: promptDetailKey(variables.promptId) })
      queryClient.invalidateQueries({ queryKey: promptVersionsKey(variables.promptId) })
      appMessage.success('版本发布成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '发布失败')
    },
  })
}
