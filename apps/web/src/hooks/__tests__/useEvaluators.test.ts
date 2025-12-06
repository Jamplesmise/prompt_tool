import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useEvaluators,
  usePresetEvaluators,
  useEvaluator,
  useCreateEvaluator,
  useDeleteEvaluator,
  useTestEvaluator,
} from '../useEvaluators'
import { evaluatorsService } from '@/services/evaluators'

// Mock services
vi.mock('@/services/evaluators', () => ({
  evaluatorsService: {
    list: vi.fn(),
    getPresets: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    test: vi.fn(),
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

describe('useEvaluators hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useEvaluators', () => {
    it('应成功获取评估器列表', async () => {
      const mockEvaluators = [
        { id: 'e1', name: '完全匹配', type: 'PRESET' },
        { id: 'e2', name: '自定义评估器', type: 'CODE' },
      ]
      vi.mocked(evaluatorsService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockEvaluators,
      })

      const { result } = renderHook(() => useEvaluators(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockEvaluators)
    })

    it('应支持按类型筛选', async () => {
      vi.mocked(evaluatorsService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: [],
      })

      const { result } = renderHook(() => useEvaluators('CODE'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(evaluatorsService.list).toHaveBeenCalledWith('CODE')
    })
  })

  describe('usePresetEvaluators', () => {
    it('应成功获取预置评估器列表', async () => {
      const mockPresets = [
        { id: 'exact_match', name: '完全匹配', description: '检查输出是否完全匹配' },
        { id: 'contains', name: '包含检查', description: '检查输出是否包含指定内容' },
        { id: 'json_schema', name: 'JSON Schema', description: '验证 JSON 结构' },
      ]
      vi.mocked(evaluatorsService.getPresets).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockPresets,
      })

      const { result } = renderHook(() => usePresetEvaluators(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPresets)
    })
  })

  describe('useEvaluator', () => {
    it('应成功获取单个评估器', async () => {
      const mockEvaluator = {
        id: 'eval-1',
        name: '自定义评估器',
        type: 'CODE',
        code: 'return output === expected',
      }
      vi.mocked(evaluatorsService.get).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockEvaluator,
      })

      const { result } = renderHook(() => useEvaluator('eval-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockEvaluator)
    })

    it('id 为 undefined 时不应发起请求', async () => {
      const { result } = renderHook(() => useEvaluator(undefined), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(evaluatorsService.get).not.toHaveBeenCalled()
    })
  })

  describe('useCreateEvaluator', () => {
    it('应成功创建评估器', async () => {
      const newEvaluator = {
        id: 'new-eval',
        name: '新评估器',
        type: 'CODE',
      }
      vi.mocked(evaluatorsService.create).mockResolvedValue({
        code: 200,
        message: 'success',
        data: newEvaluator,
      })

      const { result } = renderHook(() => useCreateEvaluator(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: '新评估器',
        type: 'CODE',
        code: 'return true',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newEvaluator)
    })
  })

  describe('useDeleteEvaluator', () => {
    it('应成功删除评估器', async () => {
      vi.mocked(evaluatorsService.delete).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { deleted: true },
      })

      const { result } = renderHook(() => useDeleteEvaluator(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('eval-to-delete')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(evaluatorsService.delete).toHaveBeenCalledWith('eval-to-delete')
    })
  })

  describe('useTestEvaluator', () => {
    it('应成功测试评估器', async () => {
      const testResult = {
        passed: true,
        score: 1.0,
        reason: '完全匹配',
      }
      vi.mocked(evaluatorsService.test).mockResolvedValue({
        code: 200,
        message: 'success',
        data: testResult,
      })

      const { result } = renderHook(() => useTestEvaluator(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'eval-1',
        data: {
          input: '测试输入',
          output: '测试输出',
          expected: '测试输出',
        },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(testResult)
    })

    it('测试失败时应处理错误', async () => {
      vi.mocked(evaluatorsService.test).mockResolvedValue({
        code: 400,
        message: '评估器代码执行错误',
        data: null,
      })

      const { result } = renderHook(() => useTestEvaluator(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'eval-1',
        data: {
          input: '测试输入',
          output: '测试输出',
          expected: '期望输出',
        },
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('评估器代码执行错误')
    })
  })
})
