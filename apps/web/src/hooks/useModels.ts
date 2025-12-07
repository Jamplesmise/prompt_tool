'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { modelsService } from '@/services/models'
import type { CreateProviderInput, UpdateProviderInput, CreateModelInput, UpdateModelInput } from '@/services/models'
import { appMessage } from '@/lib/message'

// 查询 key
const PROVIDERS_KEY = ['providers']
const MODELS_KEY = ['models']
const UNIFIED_MODELS_KEY = ['unified-models']

// 提供商相关 hooks
export function useProviders() {
  return useQuery({
    queryKey: PROVIDERS_KEY,
    queryFn: async () => {
      const response = await modelsService.providers.list()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list
    },
  })
}

export function useCreateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProviderInput) => {
      const response = await modelsService.providers.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      appMessage.success('提供商创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

export function useUpdateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProviderInput }) => {
      const response = await modelsService.providers.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      appMessage.success('提供商更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

export function useDeleteProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await modelsService.providers.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      appMessage.success('提供商删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 模型相关 hooks
export function useModels() {
  return useQuery({
    queryKey: MODELS_KEY,
    queryFn: async () => {
      const response = await modelsService.models.list()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list
    },
  })
}

export function useAddModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ providerId, data }: { providerId: string; data: CreateModelInput }) => {
      const response = await modelsService.providers.addModel(providerId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      queryClient.invalidateQueries({ queryKey: MODELS_KEY })
      appMessage.success('模型添加成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '添加失败')
    },
  })
}

export function useUpdateModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateModelInput }) => {
      const response = await modelsService.models.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      queryClient.invalidateQueries({ queryKey: MODELS_KEY })
      appMessage.success('模型更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

export function useDeleteModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await modelsService.models.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      queryClient.invalidateQueries({ queryKey: MODELS_KEY })
      appMessage.success('模型删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

export function useTestModel() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await modelsService.models.test(id)
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

// 统一模型列表（FastGPT + 本地）
export function useUnifiedModels(params?: {
  type?: string
  active?: boolean
  source?: 'fastgpt' | 'local'
}) {
  return useQuery({
    queryKey: [...UNIFIED_MODELS_KEY, params],
    queryFn: async () => {
      const response = await modelsService.models.listAll(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 刷新统一模型缓存
export function useRefreshUnifiedModels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await modelsService.models.listAll({ refresh: true })
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNIFIED_MODELS_KEY })
      appMessage.success('模型列表已刷新')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '刷新失败')
    },
  })
}

// =====================================
// 同步模型相关 hooks
// =====================================

const SYNCED_MODELS_KEY = ['synced-models']

// 获取同步的模型列表
export function useSyncedModels(params?: { type?: string; active?: boolean }) {
  return useQuery({
    queryKey: [...SYNCED_MODELS_KEY, params],
    queryFn: async () => {
      const response = await modelsService.sync.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 获取同步状态
export function useSyncStatus() {
  return useQuery({
    queryKey: [...SYNCED_MODELS_KEY, 'status'],
    queryFn: async () => {
      const response = await modelsService.sync.getStatus()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.stats
    },
    refetchInterval: 60000, // 每分钟刷新一次状态
  })
}

// 手动触发同步（同步到 Provider + Model 表）
export function useSyncFastGPTModels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await modelsService.sync.syncFromFastGPT()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (data) => {
      // 刷新所有相关查询
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
      queryClient.invalidateQueries({ queryKey: MODELS_KEY })
      queryClient.invalidateQueries({ queryKey: SYNCED_MODELS_KEY })
      queryClient.invalidateQueries({ queryKey: UNIFIED_MODELS_KEY })

      const result = data.result
      if (result.success || result.errors.length === 0) {
        appMessage.success(
          `同步成功: 供应商 ${result.providersCreated} 创建 / ${result.providersUpdated} 更新, 模型 ${result.modelsCreated} 创建 / ${result.modelsUpdated} 更新`
        )
      } else {
        appMessage.warning(`同步部分失败: ${result.errors.join(', ')}`)
      }
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '同步失败')
    },
  })
}
