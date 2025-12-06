import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useDatasets,
  useDataset,
  useCreateDataset,
  useDeleteDataset,
  useDatasetRows,
  useDatasetVersions,
} from '../useDatasets'
import { datasetsService } from '@/services/datasets'

// Mock services
vi.mock('@/services/datasets', () => ({
  datasetsService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    rows: {
      list: vi.fn(),
    },
    versions: {
      list: vi.fn(),
    },
  },
}))

// Mock message
vi.mock('@/lib/message', () => ({
  appMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'TestQueryClientProvider'
  return Wrapper
}

describe('useDatasets hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useDatasets', () => {
    it('应成功获取数据集列表', async () => {
      const mockData = {
        list: [
          { id: '1', name: '数据集1', rowCount: 100 },
          { id: '2', name: '数据集2', rowCount: 200 },
        ],
        total: 2,
      }
      vi.mocked(datasetsService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockData,
      })

      const { result } = renderHook(() => useDatasets(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('应支持搜索参数', async () => {
      vi.mocked(datasetsService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { list: [], total: 0 },
      })

      const { result } = renderHook(
        () => useDatasets({ page: 1, pageSize: 10, keyword: '测试' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(datasetsService.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        keyword: '测试',
      })
    })
  })

  describe('useDataset', () => {
    it('应成功获取单个数据集', async () => {
      const mockDataset = {
        id: 'ds-1',
        name: '测试数据集',
        rowCount: 50,
        columns: ['input', 'expected'],
      }
      vi.mocked(datasetsService.get).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockDataset,
      })

      const { result } = renderHook(() => useDataset('ds-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockDataset)
    })

    it('id 为空时不应发起请求', async () => {
      const { result } = renderHook(() => useDataset(''), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(datasetsService.get).not.toHaveBeenCalled()
    })
  })

  describe('useCreateDataset', () => {
    it('应成功创建数据集', async () => {
      const newDataset = {
        id: 'new-ds',
        name: '新数据集',
        rowCount: 0,
      }
      vi.mocked(datasetsService.create).mockResolvedValue({
        code: 200,
        message: 'success',
        data: newDataset,
      })

      const { result } = renderHook(() => useCreateDataset(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: '新数据集',
        description: '描述',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newDataset)
    })
  })

  describe('useDeleteDataset', () => {
    it('应成功删除数据集', async () => {
      vi.mocked(datasetsService.delete).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { deleted: true },
      })

      const { result } = renderHook(() => useDeleteDataset(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('ds-to-delete')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(datasetsService.delete).toHaveBeenCalledWith('ds-to-delete')
    })
  })

  describe('useDatasetRows', () => {
    it('应成功获取数据行', async () => {
      const mockRows = {
        list: [
          { id: 'row-1', data: { input: '输入1', expected: '输出1' } },
          { id: 'row-2', data: { input: '输入2', expected: '输出2' } },
        ],
        total: 2,
      }
      vi.mocked(datasetsService.rows.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockRows,
      })

      const { result } = renderHook(() => useDatasetRows('ds-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockRows)
    })

    it('datasetId 为空时不应发起请求', async () => {
      const { result } = renderHook(() => useDatasetRows(''), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(datasetsService.rows.list).not.toHaveBeenCalled()
    })
  })

  describe('useDatasetVersions', () => {
    it('应成功获取版本列表', async () => {
      const mockVersions = [
        { id: 'v1', version: 1, rowCount: 100, createdAt: '2024-01-01' },
        { id: 'v2', version: 2, rowCount: 150, createdAt: '2024-01-02' },
      ]
      vi.mocked(datasetsService.versions.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockVersions,
      })

      const { result } = renderHook(() => useDatasetVersions('ds-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockVersions)
    })
  })
})
