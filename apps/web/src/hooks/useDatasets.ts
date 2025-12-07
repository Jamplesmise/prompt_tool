'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsService } from '@/services/datasets'
import { appMessage } from '@/lib/message'
import type {
  CreateDatasetInput,
  UpdateDatasetInput,
  UploadFileInput,
  CreateDatasetVersionInput,
} from '@/services/datasets'

// 查询 key
const DATASETS_KEY = ['datasets']
const datasetDetailKey = (id: string) => ['datasets', id]
const datasetRowsKey = (id: string) => ['datasets', id, 'rows']
const datasetVersionsKey = (id: string) => ['datasets', id, 'versions']
const datasetVersionDetailKey = (datasetId: string, versionId: string) => [
  'datasets',
  datasetId,
  'versions',
  versionId,
]

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

// ==================== Phase 10: 版本管理 ====================

// 版本列表
export function useDatasetVersions(datasetId: string) {
  return useQuery({
    queryKey: datasetVersionsKey(datasetId),
    queryFn: async () => {
      const response = await datasetsService.versions.list(datasetId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!datasetId,
  })
}

// 版本详情
export function useDatasetVersion(datasetId: string, versionId: string) {
  return useQuery({
    queryKey: datasetVersionDetailKey(datasetId, versionId),
    queryFn: async () => {
      const response = await datasetsService.versions.get(datasetId, versionId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!datasetId && !!versionId,
  })
}

// 创建版本快照
export function useCreateDatasetVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      datasetId,
      data,
    }: {
      datasetId: string
      data: CreateDatasetVersionInput
    }) => {
      const response = await datasetsService.versions.create(datasetId, data)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: datasetVersionsKey(variables.datasetId) })
      queryClient.invalidateQueries({ queryKey: datasetDetailKey(variables.datasetId) })
      appMessage.success('版本创建成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '版本创建失败')
    },
  })
}

// 版本数据行
export function useDatasetVersionRows(
  datasetId: string,
  versionId: string,
  params?: { offset?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...datasetVersionDetailKey(datasetId, versionId), 'rows', params],
    queryFn: async () => {
      const response = await datasetsService.versions.getRows(datasetId, versionId, params)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!datasetId && !!versionId,
  })
}

// 回滚到指定版本
export function useRollbackDatasetVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ datasetId, versionId }: { datasetId: string; versionId: string }) => {
      const response = await datasetsService.versions.rollback(datasetId, versionId)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: datasetVersionsKey(variables.datasetId) })
      queryClient.invalidateQueries({ queryKey: datasetDetailKey(variables.datasetId) })
      queryClient.invalidateQueries({ queryKey: datasetRowsKey(variables.datasetId) })
      appMessage.success('版本回滚成功')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '版本回滚失败')
    },
  })
}

// 版本对比
export function useDatasetVersionDiff(
  datasetId: string,
  v1: number | undefined,
  v2: number | undefined
) {
  return useQuery({
    queryKey: ['datasets', datasetId, 'versions', 'diff', v1, v2],
    queryFn: async () => {
      const response = await datasetsService.versions.diff(datasetId, v1!, v2!)
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data
    },
    enabled: !!datasetId && v1 !== undefined && v2 !== undefined,
  })
}
