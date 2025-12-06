import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useProviders,
  useCreateProvider,
  useDeleteProvider,
  useModels,
  useAddModel,
  useDeleteModel,
  useTestModel,
} from '../useModels'
import { modelsService } from '@/services/models'

// Mock services
vi.mock('@/services/models', () => ({
  modelsService: {
    providers: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      addModel: vi.fn(),
    },
    models: {
      list: vi.fn(),
      delete: vi.fn(),
      test: vi.fn(),
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

describe('useModels hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useProviders', () => {
    it('应成功获取提供商列表', async () => {
      const mockProviders = [
        { id: 'p1', name: 'OpenAI', baseUrl: 'https://api.openai.com' },
        { id: 'p2', name: 'Azure', baseUrl: 'https://azure.openai.com' },
      ]
      vi.mocked(modelsService.providers.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockProviders,
      })

      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockProviders)
    })

    it('API 错误时应抛出异常', async () => {
      vi.mocked(modelsService.providers.list).mockResolvedValue({
        code: 500,
        message: '获取失败',
        data: null,
      })

      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('获取失败')
    })
  })

  describe('useCreateProvider', () => {
    it('应成功创建提供商', async () => {
      const newProvider = {
        id: 'new-p',
        name: '新提供商',
        baseUrl: 'https://api.example.com',
      }
      vi.mocked(modelsService.providers.create).mockResolvedValue({
        code: 200,
        message: 'success',
        data: newProvider,
      })

      const { result } = renderHook(() => useCreateProvider(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: '新提供商',
        baseUrl: 'https://api.example.com',
        apiKey: 'sk-xxx',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newProvider)
    })
  })

  describe('useDeleteProvider', () => {
    it('应成功删除提供商', async () => {
      vi.mocked(modelsService.providers.delete).mockResolvedValue({
        code: 200,
        message: 'success',
        data: null,
      })

      const { result } = renderHook(() => useDeleteProvider(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('provider-to-delete')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(modelsService.providers.delete).toHaveBeenCalledWith('provider-to-delete')
    })
  })

  describe('useModels', () => {
    it('应成功获取模型列表', async () => {
      const mockModels = [
        { id: 'm1', name: 'gpt-4', providerId: 'p1' },
        { id: 'm2', name: 'gpt-3.5-turbo', providerId: 'p1' },
      ]
      vi.mocked(modelsService.models.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockModels,
      })

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockModels)
    })
  })

  describe('useAddModel', () => {
    it('应成功添加模型', async () => {
      const newModel = {
        id: 'new-m',
        name: 'claude-3',
        providerId: 'p1',
      }
      vi.mocked(modelsService.providers.addModel).mockResolvedValue({
        code: 200,
        message: 'success',
        data: newModel,
      })

      const { result } = renderHook(() => useAddModel(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        providerId: 'p1',
        data: { name: 'claude-3', modelId: 'claude-3-opus' },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newModel)
    })
  })

  describe('useDeleteModel', () => {
    it('应成功删除模型', async () => {
      vi.mocked(modelsService.models.delete).mockResolvedValue({
        code: 200,
        message: 'success',
        data: null,
      })

      const { result } = renderHook(() => useDeleteModel(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('model-to-delete')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(modelsService.models.delete).toHaveBeenCalledWith('model-to-delete')
    })
  })

  describe('useTestModel', () => {
    it('应成功测试模型', async () => {
      const testResult = {
        success: true,
        latency: 150,
        response: 'Hello!',
      }
      vi.mocked(modelsService.models.test).mockResolvedValue({
        code: 200,
        message: 'success',
        data: testResult,
      })

      const { result } = renderHook(() => useTestModel(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('model-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(testResult)
    })

    it('测试失败时应处理错误', async () => {
      vi.mocked(modelsService.models.test).mockResolvedValue({
        code: 500,
        message: '连接超时',
        data: null,
      })

      const { result } = renderHook(() => useTestModel(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('model-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('连接超时')
    })
  })
})
