'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  inputSchemasService,
  outputSchemasService,
  schemaTemplatesService,
  schemaInferService,
  evaluationSchemasService,
} from '@/services/schemas'
import { appMessage } from '@/lib/message'
import type {
  CreateInputSchemaRequest,
  UpdateInputSchemaRequest,
  CreateOutputSchemaRequest,
  UpdateOutputSchemaRequest,
  CreateEvaluationSchemaRequest,
  UpdateEvaluationSchemaRequest,
} from '@/services/schemas'

// 查询 key
const EVALUATION_SCHEMAS_KEY = ['evaluation-schemas']
const INPUT_SCHEMAS_KEY = ['input-schemas']
const OUTPUT_SCHEMAS_KEY = ['output-schemas']
const SCHEMA_TEMPLATES_KEY = ['schema-templates']

// ==================== EvaluationSchema Hooks ====================

// 获取评估结构列表
export function useEvaluationSchemas(search?: string) {
  return useQuery({
    queryKey: [...EVALUATION_SCHEMAS_KEY, { search }],
    queryFn: async () => {
      const response = await evaluationSchemasService.list(search)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list
    },
    refetchOnMount: 'always',  // 确保页面挂载时总是重新获取
    staleTime: 0,  // 数据立即变为过期状态
  })
}

// 获取评估结构详情
export function useEvaluationSchema(id: string | undefined) {
  return useQuery({
    queryKey: [...EVALUATION_SCHEMAS_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')
      const response = await evaluationSchemasService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建评估结构
export function useCreateEvaluationSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEvaluationSchemaRequest) => {
      const response = await evaluationSchemasService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATION_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      appMessage.success('评估结构创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新评估结构
export function useUpdateEvaluationSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEvaluationSchemaRequest }) => {
      const response = await evaluationSchemasService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: EVALUATION_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: [...EVALUATION_SCHEMAS_KEY, id] })
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      appMessage.success('评估结构更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除评估结构
export function useDeleteEvaluationSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await evaluationSchemasService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATION_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      appMessage.success('评估结构删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// ==================== InputSchema Hooks ====================

// 获取输入结构列表
export function useInputSchemas(search?: string) {
  return useQuery({
    queryKey: [...INPUT_SCHEMAS_KEY, { search }],
    queryFn: async () => {
      const response = await inputSchemasService.list(search)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list
    },
  })
}

// 获取输入结构详情
export function useInputSchema(id: string | undefined) {
  return useQuery({
    queryKey: [...INPUT_SCHEMAS_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')
      const response = await inputSchemasService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建输入结构
export function useCreateInputSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInputSchemaRequest) => {
      const response = await inputSchemasService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      appMessage.success('输入结构创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新输入结构
export function useUpdateInputSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInputSchemaRequest }) => {
      const response = await inputSchemasService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: [...INPUT_SCHEMAS_KEY, id] })
      appMessage.success('输入结构更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除输入结构
export function useDeleteInputSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await inputSchemasService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      appMessage.success('输入结构删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// ==================== OutputSchema Hooks ====================

// 获取输出结构列表
export function useOutputSchemas(search?: string) {
  return useQuery({
    queryKey: [...OUTPUT_SCHEMAS_KEY, { search }],
    queryFn: async () => {
      const response = await outputSchemasService.list(search)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list
    },
  })
}

// 获取输出结构详情
export function useOutputSchema(id: string | undefined) {
  return useQuery({
    queryKey: [...OUTPUT_SCHEMAS_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')
      const response = await outputSchemasService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建输出结构
export function useCreateOutputSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOutputSchemaRequest) => {
      const response = await outputSchemasService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      appMessage.success('输出结构创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新输出结构
export function useUpdateOutputSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOutputSchemaRequest }) => {
      const response = await outputSchemasService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: [...OUTPUT_SCHEMAS_KEY, id] })
      appMessage.success('输出结构更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除输出结构
export function useDeleteOutputSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await outputSchemasService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      appMessage.success('输出结构删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// ==================== Schema Template Hooks ====================

// 获取模板列表
export function useSchemaTemplates() {
  return useQuery({
    queryKey: SCHEMA_TEMPLATES_KEY,
    queryFn: async () => {
      const response = await schemaTemplatesService.list()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 获取模板详情
export function useSchemaTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [...SCHEMA_TEMPLATES_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')
      const response = await schemaTemplatesService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 使用模板创建 Schema
export function useUseSchemaTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      templateId: string
      teamId?: string
      inputSchemaName?: string
      outputSchemaName?: string
    }) => {
      const { templateId, ...options } = params
      const response = await schemaTemplatesService.use(templateId, options)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INPUT_SCHEMAS_KEY })
      queryClient.invalidateQueries({ queryKey: OUTPUT_SCHEMAS_KEY })
      appMessage.success('模板应用成功，Schema 已创建')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '应用模板失败')
    },
  })
}

// ==================== Schema Inference Hooks ====================

// 从样本输出推断 Schema
export function useInferSchemaFromOutput() {
  return useMutation({
    mutationFn: async (sampleOutput: string) => {
      const response = await schemaInferService.inferFromOutput(sampleOutput)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '推断失败')
    },
  })
}
