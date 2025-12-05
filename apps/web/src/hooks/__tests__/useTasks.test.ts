import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useTasks,
  useTask,
  useCreateTask,
  useDeleteTask,
  useRunTask,
  useStopTask,
  usePauseTask,
  useResumeTask,
  useTaskResults,
} from '../useTasks'
import { tasksService } from '@/services/tasks'

// Mock services
vi.mock('@/services/tasks', () => ({
  tasksService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    run: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getResults: vi.fn(),
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

describe('useTasks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useTasks', () => {
    it('应成功获取任务列表', async () => {
      const mockData = {
        list: [
          { id: '1', name: '任务1', status: 'COMPLETED' },
          { id: '2', name: '任务2', status: 'RUNNING' },
        ],
        total: 2,
      }
      vi.mocked(tasksService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockData,
      })

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('应支持筛选参数', async () => {
      vi.mocked(tasksService.list).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { list: [], total: 0 },
      })

      const { result } = renderHook(
        () => useTasks({ status: 'RUNNING', page: 1, pageSize: 20 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(tasksService.list).toHaveBeenCalledWith({
        status: 'RUNNING',
        page: 1,
        pageSize: 20,
      })
    })
  })

  describe('useTask', () => {
    it('应成功获取单个任务', async () => {
      const mockTask = {
        id: 'task-1',
        name: '测试任务',
        status: 'COMPLETED',
        progress: 100,
      }
      vi.mocked(tasksService.get).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockTask,
      })

      const { result } = renderHook(() => useTask('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockTask)
    })

    it('id 为 undefined 时不应发起请求', async () => {
      const { result } = renderHook(() => useTask(undefined), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(tasksService.get).not.toHaveBeenCalled()
    })
  })

  describe('useCreateTask', () => {
    it('应成功创建任务', async () => {
      const newTask = {
        id: 'new-task',
        name: '新任务',
        status: 'PENDING',
      }
      vi.mocked(tasksService.create).mockResolvedValue({
        code: 200,
        message: 'success',
        data: newTask,
      })

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: '新任务',
        promptId: 'prompt-1',
        datasetId: 'dataset-1',
        modelId: 'model-1',
        evaluatorIds: ['eval-1'],
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newTask)
    })
  })

  describe('useDeleteTask', () => {
    it('应成功删除任务', async () => {
      vi.mocked(tasksService.delete).mockResolvedValue({
        code: 200,
        message: 'success',
        data: null,
      })

      const { result } = renderHook(() => useDeleteTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-to-delete')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(tasksService.delete).toHaveBeenCalledWith('task-to-delete')
    })
  })

  describe('useRunTask', () => {
    it('应成功启动任务', async () => {
      vi.mocked(tasksService.run).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { status: 'RUNNING' },
      })

      const { result } = renderHook(() => useRunTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(tasksService.run).toHaveBeenCalledWith('task-1')
    })
  })

  describe('useStopTask', () => {
    it('应成功停止任务', async () => {
      vi.mocked(tasksService.stop).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { status: 'STOPPED' },
      })

      const { result } = renderHook(() => useStopTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(tasksService.stop).toHaveBeenCalledWith('task-1')
    })
  })

  describe('usePauseTask', () => {
    it('应成功暂停任务', async () => {
      vi.mocked(tasksService.pause).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { status: 'PAUSED' },
      })

      const { result } = renderHook(() => usePauseTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(tasksService.pause).toHaveBeenCalledWith('task-1')
    })
  })

  describe('useResumeTask', () => {
    it('应成功恢复任务', async () => {
      vi.mocked(tasksService.resume).mockResolvedValue({
        code: 200,
        message: 'success',
        data: { status: 'RUNNING' },
      })

      const { result } = renderHook(() => useResumeTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(tasksService.resume).toHaveBeenCalledWith('task-1')
    })
  })

  describe('useTaskResults', () => {
    it('应成功获取任务结果', async () => {
      const mockResults = {
        list: [
          { id: 'r1', status: 'SUCCESS', output: '输出1' },
          { id: 'r2', status: 'FAILED', error: '错误信息' },
        ],
        total: 2,
      }
      vi.mocked(tasksService.getResults).mockResolvedValue({
        code: 200,
        message: 'success',
        data: mockResults,
      })

      const { result } = renderHook(() => useTaskResults('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockResults)
    })

    it('id 为 undefined 时不应发起请求', async () => {
      const { result } = renderHook(() => useTaskResults(undefined), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(tasksService.getResults).not.toHaveBeenCalled()
    })
  })
})
