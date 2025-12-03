'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tokensService } from '@/services/tokens'
import { appMessage } from '@/lib/message'
import type { CreateTokenInput } from '@/services/tokens'

// 查询 key
const TOKENS_KEY = ['tokens']

// Token 列表
export function useTokens(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [...TOKENS_KEY, params],
    queryFn: async () => {
      const response = await tokensService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 创建 Token
export function useCreateToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTokenInput) => {
      const response = await tokensService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOKENS_KEY })
      appMessage.success('Token 创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 删除 Token
export function useDeleteToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tokensService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOKENS_KEY })
      appMessage.success('Token 删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}
