'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsService } from '@/services/datasets'
import { appMessage } from '@/lib/message'
import type {
  CreateDatasetInput,
  UpdateDatasetInput,
  UploadFileInput,
} from '@/services/datasets'

// 查询 key
const DATASETS_KEY = ['datasets']
const datasetDetailKey = (id: string) => ['datasets', id]
const datasetRowsKey = (id: string) => ['datasets', id, 'rows']

// 数据集列表
export function useDatasets(params?: { page?: number; pageSize?: number; keyword?: string }) {
  return useQuery({
    queryKey: [...DATASETS_KEY, params],
    queryFn: async () => {
      const response = await datasetsService.list(params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
  })
}

// 数据集详情
export function useDataset(id: string) {
  return useQuery({
    queryKey: datasetDetailKey(id),
    queryFn: async () => {
      const response = await datasetsService.get(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!id,
  })
}

// 创建数据集
export function useCreateDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDatasetInput) => {
      const response = await datasetsService.create(data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASETS_KEY })
      appMessage.success('数据集创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '创建失败')
    },
  })
}

// 更新数据集
export function useUpdateDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDatasetInput }) => {
      const response = await datasetsService.update(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DATASETS_KEY })
      queryClient.invalidateQueries({ queryKey: datasetDetailKey(variables.id) })
      appMessage.success('更新成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除数据集
export function useDeleteDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await datasetsService.delete(id)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASETS_KEY })
      appMessage.success('删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}

// 上传文件
export function useUploadDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UploadFileInput }) => {
      const response = await datasetsService.upload(id, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DATASETS_KEY })
      queryClient.invalidateQueries({ queryKey: datasetDetailKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: datasetRowsKey(variables.id) })
      appMessage.success('上传成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '上传失败')
    },
  })
}

// 数据行列表
export function useDatasetRows(
  datasetId: string,
  params?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: [...datasetRowsKey(datasetId), params],
    queryFn: async () => {
      const response = await datasetsService.rows.list(datasetId, params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!datasetId,
  })
}

// 新增数据行
export function useCreateDatasetRow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      datasetId,
      data,
    }: {
      datasetId: string
      data: Record<string, unknown>
    }) => {
      const response = await datasetsService.rows.create(datasetId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: datasetRowsKey(variables.datasetId) })
      queryClient.invalidateQueries({ queryKey: datasetDetailKey(variables.datasetId) })
      appMessage.success('新增成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '新增失败')
    },
  })
}

// 更新数据行
export function useUpdateDatasetRow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      datasetId,
      rowId,
      data,
    }: {
      datasetId: string
      rowId: string
      data: Record<string, unknown>
    }) => {
      const response = await datasetsService.rows.update(datasetId, rowId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: datasetRowsKey(variables.datasetId) })
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '更新失败')
    },
  })
}

// 删除数据行
export function useDeleteDatasetRow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ datasetId, rowId }: { datasetId: string; rowId: string }) => {
      const response = await datasetsService.rows.delete(datasetId, rowId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: datasetRowsKey(variables.datasetId) })
      queryClient.invalidateQueries({ queryKey: datasetDetailKey(variables.datasetId) })
      appMessage.success('删除成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '删除失败')
    },
  })
}
