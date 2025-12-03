'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluatorsService } from '@/services/evaluators'
import { appMessage } from '@/lib/message'
import type {
  EvaluatorType,
  CreateEvaluatorInput,
  UpdateEvaluatorInput,
  TestEvaluatorInput,
} from '@/services/evaluators'

// 查询 key
const EVALUATORS_KEY = ['evaluators']
const PRESETS_KEY = ['evaluators', 'presets']

// 获取评估器列表
export function useEvaluators(type?: EvaluatorType) {
  return useQuery({
    queryKey: [...EVALUATORS_KEY, { type }],
    queryFn: async () => {
      const response = await evaluatorsService.list(type)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 获取预置评估器列表
export function usePresetEvaluators() {
  return useQuery({
    queryKey: PRESETS_KEY,
    queryFn: async () => {
      const response = await evaluatorsService.getPresets()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    staleTime: Infinity, // 预置评估器不会变化
  })
}

// 获取评估器详情
export function useEvaluator(id: string | undefined) {
  return useQuery({
    queryKey: [...EVALUATORS_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')
      const response = await evaluatorsService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建评估器
export function useCreateEvaluator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEvaluatorInput) => {
      const response = await evaluatorsService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATORS_KEY })
      appMessage.success('评估器创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新评估器
export function useUpdateEvaluator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEvaluatorInput }) => {
      const response = await evaluatorsService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: EVALUATORS_KEY })
      queryClient.invalidateQueries({ queryKey: [...EVALUATORS_KEY, id] })
      appMessage.success('评估器更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除评估器
export function useDeleteEvaluator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await evaluatorsService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATORS_KEY })
      appMessage.success('评估器删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 测试评估器
export function useTestEvaluator() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TestEvaluatorInput }) => {
      const response = await evaluatorsService.test(id, data)
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
