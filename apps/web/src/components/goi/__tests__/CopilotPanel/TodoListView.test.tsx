/**
 * TodoListView 组件测试
 *
 * 测试用例：
 * TC-TL-001: 空列表
 * TC-TL-002: 列表渲染
 * TC-TL-003: 状态图标
 * TC-TL-004: 进度统计
 * TC-TL-005: 控制按钮
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { TodoListView } from '../../CopilotPanel/TodoListView'

// Mock useCopilot hook
const mockExecuteStep = vi.fn()
const mockPauseExecution = vi.fn()
const mockResumeExecution = vi.fn()
const mockRunExecution = vi.fn()

vi.mock('../../hooks/useCopilot', () => ({
  useCopilot: vi.fn(() => ({
    todoList: null,
    isLoading: false,
    mode: 'assisted',
    executeStep: mockExecuteStep,
    pauseExecution: mockPauseExecution,
    resumeExecution: mockResumeExecution,
    runExecution: mockRunExecution,
  })),
}))

// Mock goi utils
vi.mock('@/lib/goi/todo/groupGenerator', () => ({
  generateDisplayData: vi.fn((todoList) => ({
    title: todoList.goal || '任务计划',
    groups: [
      {
        id: 'group-1',
        name: '准备阶段',
        emoji: '📋',
        collapsed: false,
        items: todoList.items.map((item: { id: string; title?: string; content?: string; status: string }) => ({
          id: item.id,
          userLabel: item.title || item.content,
          status: item.status,
          isKeyStep: false,
        })),
      },
    ],
    progress: Math.round(
      (todoList.items.filter((i: { status: string }) => i.status === 'completed').length / todoList.items.length) * 100
    ),
    estimatedTotalSeconds: 300,
    estimatedRemainingSeconds: 200,
  })),
  autoCollapseGroups: vi.fn((groups) => groups),
  toggleGroupCollapse: vi.fn(),
}))

vi.mock('@/lib/goi/todo/progress', () => ({
  formatTime: vi.fn((seconds) => `${Math.floor(seconds / 60)}分钟`),
}))

import { useCopilot } from '../../hooks/useCopilot'

describe('TodoListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-TL-001: 空列表', () => {
    it('没有任务时应该显示空状态', () => {
      renderWithProviders(<TodoListView />)

      expect(screen.getByText('暂无任务')).toBeInTheDocument()
    })

    it('空状态应该显示任务计划标题', () => {
      renderWithProviders(<TodoListView />)

      expect(screen.getByText('任务计划')).toBeInTheDocument()
    })
  })

  describe('TC-TL-002: 列表渲染', () => {
    it('应该正确渲染所有 TODO 项', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'running',
          items: [
            { id: '1', title: '步骤 1', status: 'completed' },
            { id: '2', title: '步骤 2', status: 'in_progress' },
            { id: '3', title: '步骤 3', status: 'pending' },
          ],
          currentItemIndex: 1,
          completedItems: 1,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      expect(screen.getByText('步骤 1')).toBeInTheDocument()
      expect(screen.getByText('步骤 2')).toBeInTheDocument()
      expect(screen.getByText('步骤 3')).toBeInTheDocument()
    })

    it('应该显示任务标题', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '我的测试任务',
          status: 'running',
          items: [{ id: '1', title: '步骤 1', status: 'pending' }],
          currentItemIndex: 0,
          completedItems: 0,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      expect(screen.getByText('我的测试任务')).toBeInTheDocument()
    })
  })

  describe('TC-TL-004: 进度统计', () => {
    it('应该显示进度百分比', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'running',
          items: [
            { id: '1', title: '步骤 1', status: 'completed' },
            { id: '2', title: '步骤 2', status: 'completed' },
            { id: '3', title: '步骤 3', status: 'pending' },
          ],
          currentItemIndex: 2,
          completedItems: 2,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      // 进度条应该存在
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('TC-TL-005: 控制按钮', () => {
    it('运行中应该显示暂停按钮', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'running',
          items: [{ id: '1', title: '步骤 1', status: 'in_progress' }],
          currentItemIndex: 0,
          completedItems: 0,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      expect(screen.getByText('暂停')).toBeInTheDocument()
    })

    it('暂停时应该显示继续按钮', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'paused',
          items: [{ id: '1', title: '步骤 1', status: 'pending' }],
          currentItemIndex: 0,
          completedItems: 0,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      expect(screen.getByText('继续')).toBeInTheDocument()
    })

    it('手动模式应该显示下一步按钮', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'ready',
          items: [{ id: '1', title: '步骤 1', status: 'in_progress' }],
          currentItemIndex: 0,
          completedItems: 1,
        },
        isLoading: false,
        mode: 'manual',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      expect(screen.getByText('下一步')).toBeInTheDocument()
    })

    it('点击暂停按钮应该调用 pauseExecution', async () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'running',
          items: [{ id: '1', title: '步骤 1', status: 'in_progress' }],
          currentItemIndex: 0,
          completedItems: 0,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      const user = userEvent.setup()
      renderWithProviders(<TodoListView />)

      await user.click(screen.getByText('暂停'))

      expect(mockPauseExecution).toHaveBeenCalled()
    })

    it('点击继续按钮应该调用 resumeExecution', async () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'paused',
          items: [{ id: '1', title: '步骤 1', status: 'pending' }],
          currentItemIndex: 0,
          completedItems: 0,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      const user = userEvent.setup()
      renderWithProviders(<TodoListView />)

      await user.click(screen.getByText('继续'))

      expect(mockResumeExecution).toHaveBeenCalled()
    })
  })

  describe('完成状态', () => {
    it('完成时不应该显示控制按钮', () => {
      vi.mocked(useCopilot).mockReturnValue({
        todoList: {
          id: 'list-1',
          goal: '测试任务',
          status: 'completed',
          items: [{ id: '1', title: '步骤 1', status: 'completed' }],
          currentItemIndex: 0,
          completedItems: 1,
        },
        isLoading: false,
        mode: 'assisted',
        executeStep: mockExecuteStep,
        pauseExecution: mockPauseExecution,
        resumeExecution: mockResumeExecution,
        runExecution: mockRunExecution,
      } as unknown as ReturnType<typeof useCopilot>)

      renderWithProviders(<TodoListView />)

      expect(screen.queryByText('暂停')).not.toBeInTheDocument()
      expect(screen.queryByText('继续')).not.toBeInTheDocument()
      expect(screen.queryByText('下一步')).not.toBeInTheDocument()
    })
  })
})
