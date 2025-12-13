/**
 * ExecutionControls 组件测试
 *
 * 测试用例：
 * TC-EC-001: 暂停功能
 * TC-EC-002: 继续功能
 * TC-EC-003: 接管功能
 * TC-EC-004: 取消功能
 * TC-EC-005: 状态显示
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './helpers/renderWithProviders'
import { ExecutionControls } from '../ExecutionControls'

// Mock stores
const mockRequestPause = vi.fn()
const mockResume = vi.fn()

vi.mock('@/lib/goi/execution/pauseController', () => ({
  usePauseStore: vi.fn(() => ({
    isPaused: false,
    isPausing: false,
    requestPause: mockRequestPause,
    resume: mockResume,
  })),
}))

vi.mock('@/lib/goi/execution/progressSync', () => ({
  useExecutionStore: vi.fn(() => ({
    status: 'executing',
  })),
}))

const mockTakeoverControl = vi.fn()
const mockHandbackControl = vi.fn(() => [])

vi.mock('@/lib/goi/execution/controlTransfer', () => ({
  useControlStore: vi.fn(() => ({
    holder: 'ai',
  })),
  takeoverControl: () => mockTakeoverControl(),
  handbackControl: () => mockHandbackControl(),
}))

const mockCancelTask = vi.fn(() => Promise.resolve({ success: true }))
const mockAbortTask = vi.fn()

vi.mock('@/lib/goi/execution/taskCancel', () => ({
  cancelTask: () => mockCancelTask(),
  abortTask: () => mockAbortTask(),
}))

// 导入 mock 后的模块
import { usePauseStore } from '@/lib/goi/execution/pauseController'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import { useControlStore } from '@/lib/goi/execution/controlTransfer'

describe('ExecutionControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-EC-001: 暂停功能', () => {
    it('执行中时显示暂停按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      expect(screen.getByText('暂停')).toBeInTheDocument()
    })

    it('点击暂停按钮调用 requestPause', async () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      fireEvent.click(screen.getByText('暂停'))

      await waitFor(() => {
        expect(mockRequestPause).toHaveBeenCalledWith('user_request')
      })
    })

    it('暂停中时不显示暂停按钮（canPause 为 false）', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: true,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      // canPause = isRunning && !isPausing，当 isPausing 为 true 时暂停按钮不显示
      expect(screen.queryByText('暂停')).not.toBeInTheDocument()
      // 但仍显示状态提示
      expect(screen.getByText(/正在暂停/)).toBeInTheDocument()
    })
  })

  describe('TC-EC-002: 继续功能', () => {
    it('已暂停且 AI 持有控制权时显示继续按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: true,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      expect(screen.getByText('继续')).toBeInTheDocument()
    })

    it('点击继续按钮调用 resume', () => {
      const onResume = vi.fn()
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: true,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls onResume={onResume} />)

      fireEvent.click(screen.getByText('继续'))

      expect(mockResume).toHaveBeenCalled()
      expect(onResume).toHaveBeenCalled()
    })
  })

  describe('TC-EC-003: 接管功能', () => {
    it('已暂停且 AI 持有控制权时显示接管按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: true,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      expect(screen.getByText('我来操作')).toBeInTheDocument()
    })

    it('用户持有控制权时显示交还按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: true,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'user' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      expect(screen.getByText('交给 AI')).toBeInTheDocument()
    })
  })

  describe('TC-EC-004: 取消功能', () => {
    it('执行中时显示取消按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      expect(screen.getByText('取消')).toBeInTheDocument()
    })
  })

  describe('TC-EC-005: 状态显示', () => {
    it('idle 状态时不显示控制按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'idle' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      const { container } = renderWithProviders(<ExecutionControls />)

      expect(container.firstChild).toBeNull()
    })

    it('completed 状态时不显示控制按钮', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'completed' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      const { container } = renderWithProviders(<ExecutionControls />)

      expect(container.firstChild).toBeNull()
    })

    it('用户控制时显示提示', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: true,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'user' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls />)

      expect(screen.getByText(/你正在控制/)).toBeInTheDocument()
    })
  })

  describe('布局和尺寸', () => {
    it('支持垂直布局', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls direction="vertical" />)

      expect(screen.getByText('暂停')).toBeInTheDocument()
    })

    it('支持不同按钮大小', () => {
      vi.mocked(useExecutionStore).mockReturnValue({ status: 'executing' } as ReturnType<typeof useExecutionStore>)
      vi.mocked(usePauseStore).mockReturnValue({
        isPaused: false,
        isPausing: false,
        requestPause: mockRequestPause,
        resume: mockResume,
      } as ReturnType<typeof usePauseStore>)
      vi.mocked(useControlStore).mockReturnValue({ holder: 'ai' } as ReturnType<typeof useControlStore>)

      renderWithProviders(<ExecutionControls size="small" />)

      expect(screen.getByText('暂停')).toBeInTheDocument()
    })
  })
})
