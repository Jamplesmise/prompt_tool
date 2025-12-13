/**
 * ExecutionOverlay 组件测试
 *
 * 测试用例：
 * TC-EO-001: 执行状态显示
 * TC-EO-002: 高亮效果
 * TC-EO-003: 操作气泡
 * TC-EO-004: 非执行状态不显示
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExecutionOverlay, ExecutionProgressPanel } from '../ExecutionOverlay'

// Mock stores
const mockUseVisualization = vi.fn(() => ({
  highlightTarget: null,
  actionMessage: null,
  actionIcon: null,
  showClickEffect: false,
}))

const mockUseExecutionStatus = vi.fn(() => 'idle')

const mockUseExecutionStore = vi.fn(() => ({
  plan: null,
  progress: { completed: 0, total: 0, percentage: 0 },
  status: 'idle',
  currentStepId: null,
  error: null,
  hideClick: vi.fn(),
}))

vi.mock('@/lib/goi/execution/progressSync', () => ({
  useVisualization: () => mockUseVisualization(),
  useExecutionStatus: () => mockUseExecutionStatus(),
  useExecutionStore: Object.assign(() => mockUseExecutionStore(), {
    getState: () => ({ hideClick: vi.fn() }),
  }),
}))

vi.mock('@/lib/goi/execution/speedControl', () => ({
  speedController: {
    getConfig: () => ({ bubbleDuration: 3000 }),
  },
}))

// Mock child components
vi.mock('../OperationHighlight', () => ({
  OperationHighlight: ({ isActive, targetSelector }: { isActive: boolean; targetSelector?: string }) => (
    <div data-testid="operation-highlight" data-active={isActive} data-target={targetSelector}>
      OperationHighlight
    </div>
  ),
}))

vi.mock('../ActionBubble', () => ({
  ActionBubble: ({ isVisible, message }: { isVisible: boolean; message: string }) => (
    <div data-testid="action-bubble" data-visible={isVisible}>
      {message}
    </div>
  ),
}))

describe('ExecutionOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-EO-001: 执行状态显示', () => {
    it('执行状态时应该渲染组件', () => {
      mockUseExecutionStatus.mockReturnValue('executing')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.test-selector',
        actionMessage: '正在操作',
        actionIcon: '🤖',
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      expect(screen.getByTestId('operation-highlight')).toBeInTheDocument()
      expect(screen.getByTestId('action-bubble')).toBeInTheDocument()
    })

    it('checkpoint 状态时应该渲染组件', () => {
      mockUseExecutionStatus.mockReturnValue('checkpoint')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.test-selector',
        actionMessage: '等待确认',
        actionIcon: '⏸',
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      expect(screen.getByTestId('operation-highlight')).toBeInTheDocument()
    })
  })

  describe('TC-EO-002: 高亮效果', () => {
    it('有目标选择器时高亮应该激活', () => {
      mockUseExecutionStatus.mockReturnValue('executing')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.target-element',
        actionMessage: '点击按钮',
        actionIcon: '👆',
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      const highlight = screen.getByTestId('operation-highlight')
      expect(highlight).toHaveAttribute('data-active', 'true')
      expect(highlight).toHaveAttribute('data-target', '.target-element')
    })

    it('无目标选择器时高亮不激活', () => {
      mockUseExecutionStatus.mockReturnValue('executing')
      mockUseVisualization.mockReturnValue({
        highlightTarget: null,
        actionMessage: null,
        actionIcon: null,
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      const highlight = screen.getByTestId('operation-highlight')
      expect(highlight).toHaveAttribute('data-active', 'false')
    })
  })

  describe('TC-EO-003: 操作气泡', () => {
    it('有消息时气泡应该可见', () => {
      mockUseExecutionStatus.mockReturnValue('executing')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.test-selector',
        actionMessage: '正在输入内容',
        actionIcon: '⌨️',
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      const bubble = screen.getByTestId('action-bubble')
      expect(bubble).toHaveAttribute('data-visible', 'true')
      expect(bubble).toHaveTextContent('正在输入内容')
    })

    it('无消息时气泡不可见', () => {
      mockUseExecutionStatus.mockReturnValue('executing')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.test-selector',
        actionMessage: null,
        actionIcon: null,
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      const bubble = screen.getByTestId('action-bubble')
      expect(bubble).toHaveAttribute('data-visible', 'false')
    })
  })

  describe('TC-EO-004: 非执行状态不显示', () => {
    it('idle 状态时组件不激活', () => {
      mockUseExecutionStatus.mockReturnValue('idle')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.test-selector',
        actionMessage: '测试消息',
        actionIcon: '🤖',
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      const highlight = screen.getByTestId('operation-highlight')
      expect(highlight).toHaveAttribute('data-active', 'false')
    })

    it('completed 状态时组件不激活', () => {
      mockUseExecutionStatus.mockReturnValue('completed')
      mockUseVisualization.mockReturnValue({
        highlightTarget: '.test-selector',
        actionMessage: '测试消息',
        actionIcon: '🤖',
        showClickEffect: false,
      })

      render(<ExecutionOverlay />)

      const highlight = screen.getByTestId('operation-highlight')
      expect(highlight).toHaveAttribute('data-active', 'false')
    })
  })
})

describe('ExecutionProgressPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('进度显示', () => {
    it('无计划时不渲染', () => {
      mockUseExecutionStore.mockReturnValue({
        plan: null,
        progress: { completed: 0, total: 0, percentage: 0 },
        status: 'idle',
        currentStepId: null,
        error: null,
      })

      const { container } = render(<ExecutionProgressPanel />)
      expect(container.firstChild).toBeNull()
    })

    it('idle 状态时不渲染', () => {
      mockUseExecutionStore.mockReturnValue({
        plan: { steps: [] },
        progress: { completed: 0, total: 0, percentage: 0 },
        status: 'idle',
        currentStepId: null,
        error: null,
      })

      const { container } = render(<ExecutionProgressPanel />)
      expect(container.firstChild).toBeNull()
    })

    it('有计划且执行中时渲染进度', () => {
      mockUseExecutionStore.mockReturnValue({
        plan: {
          steps: [
            { id: '1', userLabel: '步骤1', status: 'completed' },
            { id: '2', userLabel: '步骤2', status: 'executing' },
            { id: '3', userLabel: '步骤3', status: 'pending' },
          ],
        },
        progress: { completed: 1, total: 3, percentage: 33 },
        status: 'executing',
        currentStepId: '2',
        error: null,
      })

      render(<ExecutionProgressPanel />)

      expect(screen.getByText('执行进度')).toBeInTheDocument()
      expect(screen.getByText('1/3 (33%)')).toBeInTheDocument()
      expect(screen.getByText('步骤1')).toBeInTheDocument()
      expect(screen.getByText('步骤2')).toBeInTheDocument()
      expect(screen.getByText('步骤3')).toBeInTheDocument()
    })

    it('显示错误信息', () => {
      mockUseExecutionStore.mockReturnValue({
        plan: {
          steps: [{ id: '1', userLabel: '步骤1', status: 'failed', error: '执行失败' }],
        },
        progress: { completed: 0, total: 1, percentage: 0 },
        status: 'failed',
        currentStepId: '1',
        error: '任务执行失败',
      })

      render(<ExecutionProgressPanel />)

      expect(screen.getByText('任务执行失败')).toBeInTheDocument()
    })
  })
})
