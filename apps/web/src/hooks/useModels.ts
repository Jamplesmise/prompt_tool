'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { modelsService } from '@/services/models'
import type { CreateProviderInput, UpdateProviderInput, CreateModelInput, UpdateModelInput } from '@/services/models'
import { appMessage } from '@/lib/message'

// 查询 key
const PROVIDERS_KEY = ['providers']
const MODELS_KEY = ['models']

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
