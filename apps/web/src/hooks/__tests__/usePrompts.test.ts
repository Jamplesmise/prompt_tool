import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  usePrompts,
  usePrompt,
  useCreatePrompt,
  useDeletePrompt,
  usePromptVersions,
  useBranches,
} from '../usePrompts'
import { promptsService } from '@/services/prompts'

// Mock services
vi.mock('@/services/prompts', () => ({
  promptsService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    versions: {
      list: vi.fn(),
    },
    branches: {
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

// 创建测试 wrapper
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

describe('usePrompts hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePrompts', () => {
    it('应成功获取提示词列表', async () => {
      const mockData = {
        list: [
          { id: '1', name: '提示词1', description: '描述1' },
          { id: '2', name: '提示词2', description: '描述2' },
        ],
        total: 2,
      }
      vi.mocked(promptsService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockData,
      })

      const { result } = renderHook(() => usePrompts(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
      expect(promptsService.list).toHaveBeenCalledWith(undefined)
    })

    it('应支持分页参数', async () => {
      vi.mocked(promptsService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { list: [], total: 0 },
      })

      const { result } = renderHook(
        () => usePrompts({ page: 2, pageSize: 20, keyword: '测试' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(promptsService.list).toHaveBeenCalledWith({
        page: 2,
        pageSize: 20,
        keyword: '测试',
      })
    })

    it('API 错误时应抛出异常', async () => {
      vi.mocked(promptsService.list).mockResolvedValue({
        code: 500,
        message: '服务器错误',
        data: null,
      })

      const { result } = renderHook(() => usePrompts(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('服务器错误')
    })
  })

  describe('usePrompt', () => {
    it('应成功获取单个提示词', async () => {
      const mockPrompt = {
        id: 'prompt-1',
        name: '测试提示词',
        content: '这是内容',
      }
      vi.mocked(promptsService.get).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockPrompt,
      })

      const { result } = renderHook(() => usePrompt('prompt-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPrompt)
      expect(promptsService.get).toHaveBeenCalledWith('prompt-1')
    })

    it('id 为空时不应发起请求', async () => {
      const { result } = renderHook(() => usePrompt(''), {
        wrapper: createWrapper(),
      })

      // 等待一小段时间确保没有请求
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.isLoading).toBe(false)
      expect(result.current.fetchStatus).toBe('idle')
      expect(promptsService.get).not.toHaveBeenCalled()
    })
  })

  describe('useCreatePrompt', () => {
    it('应成功创建提示词', async () => {
      const newPrompt = {
        id: 'new-prompt',
        name: '新提示词',
        content: '新内容',
      }
      vi.mocked(promptsService.create).mockResolvedValue({
        code: 200,
        message: 'success',
        data: newPrompt,
      })

      const { result } = renderHook(() => useCreatePrompt(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: '新提示词',
        content: '新内容',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newPrompt)
    })

    it('创建失败时应处理错误', async () => {
      vi.mocked(promptsService.create).mockResolvedValue({
        code: 400,
        message: '名称已存在',
        data: null,
      })

      const { result } = renderHook(() => useCreatePrompt(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: '重复名称',
        content: '内容',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('名称已存在')
    })
  })

  describe('useDeletePrompt', () => {
    it('应成功删除提示词', async () => {
      vi.mocked(promptsService.delete).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { deleted: true },
      })

      const { result } = renderHook(() => useDeletePrompt(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('prompt-to-delete')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(promptsService.delete).toHaveBeenCalledWith('prompt-to-delete')
    })
  })

  describe('usePromptVersions', () => {
    it('应成功获取版本列表', async () => {
      const mockVersions = [
        { id: 'v1', version: 1, changelog: '初始版本' },
        { id: 'v2', version: 2, changelog: '更新内容' },
      ]
      vi.mocked(promptsService.versions.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockVersions,
      })

      const { result } = renderHook(() => usePromptVersions('prompt-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockVersions)
      expect(promptsService.versions.list).toHaveBeenCalledWith('prompt-1')
    })

    it('promptId 为空时不应发起请求', async () => {
      const { result } = renderHook(() => usePromptVersions(''), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(promptsService.versions.list).not.toHaveBeenCalled()
    })
  })

  describe('useBranches', () => {
    it('应成功获取分支列表', async () => {
      const mockBranches = [
        { id: 'main', name: 'main', isDefault: true },
        { id: 'dev', name: 'dev', isDefault: false },
      ]
      vi.mocked(promptsService.branches.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockBranches,
      })

      const { result } = renderHook(() => useBranches('prompt-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockBranches)
    })
  })
})
