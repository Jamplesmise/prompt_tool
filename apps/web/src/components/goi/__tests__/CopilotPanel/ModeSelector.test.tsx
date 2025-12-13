/**
 * ModeSelector 组件测试
 *
 * 测试用例：
 * TC-MS-001: 渲染三种模式
 * TC-MS-002: 当前模式高亮
 * TC-MS-003: 切换模式
 * TC-MS-004: 禁用状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { ModeSelector } from '../../CopilotPanel/ModeSelector'

// Mock useCopilot hook
const mockSwitchMode = vi.fn()
vi.mock('../../hooks/useCopilot', () => ({
  useCopilot: vi.fn(() => ({
    mode: 'assisted',
    switchMode: mockSwitchMode,
    isLoading: false,
  })),
}))

import { useCopilot } from '../../hooks/useCopilot'

describe('ModeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-MS-001: 渲染三种模式', () => {
    it('应该渲染所有三种模式按钮', () => {
      renderWithProviders(<ModeSelector />)

      expect(screen.getByTestId('mode-manual')).toBeInTheDocument()
      expect(screen.getByTestId('mode-assisted')).toBeInTheDocument()
      expect(screen.getByTestId('mode-auto')).toBeInTheDocument()
    })

    it('应该显示正确的模式标签', () => {
      renderWithProviders(<ModeSelector />)

      expect(screen.getByText('手动')).toBeInTheDocument()
      expect(screen.getByText('智能')).toBeInTheDocument()
      expect(screen.getByText('自动')).toBeInTheDocument()
    })
  })

  describe('TC-MS-002: 当前模式高亮', () => {
    it('assisted 模式应该被选中', () => {
      renderWithProviders(<ModeSelector />)

      // Radio.Button 的 wrapper 元素有 checked class
      const assistedButton = screen.getByTestId('mode-assisted').closest('.ant-radio-button-wrapper')
      expect(assistedButton).toHaveClass('ant-radio-button-wrapper-checked')
    })

    it('manual 模式应该被选中', () => {
      vi.mocked(useCopilot).mockReturnValue({
        mode: 'manual',
        switchMode: mockSwitchMode,
        isLoading: false,
      } as ReturnType<typeof useCopilot>)

      renderWithProviders(<ModeSelector />)

      const manualButton = screen.getByTestId('mode-manual').closest('.ant-radio-button-wrapper')
      expect(manualButton).toHaveClass('ant-radio-button-wrapper-checked')
    })

    it('auto 模式应该被选中', () => {
      vi.mocked(useCopilot).mockReturnValue({
        mode: 'auto',
        switchMode: mockSwitchMode,
        isLoading: false,
      } as ReturnType<typeof useCopilot>)

      renderWithProviders(<ModeSelector />)

      const autoButton = screen.getByTestId('mode-auto').closest('.ant-radio-button-wrapper')
      expect(autoButton).toHaveClass('ant-radio-button-wrapper-checked')
    })
  })

  describe('TC-MS-003: 切换模式', () => {
    it('点击不同模式应该调用 switchMode', () => {
      renderWithProviders(<ModeSelector />)

      // 使用 fireEvent 直接触发 change 事件
      const autoInput = screen.getByTestId('mode-auto')
      fireEvent.click(autoInput)

      expect(mockSwitchMode).toHaveBeenCalledWith('auto')
    })

    it('点击手动模式', () => {
      renderWithProviders(<ModeSelector />)

      const manualInput = screen.getByTestId('mode-manual')
      fireEvent.click(manualInput)

      expect(mockSwitchMode).toHaveBeenCalledWith('manual')
    })
  })

  describe('TC-MS-004: 禁用状态', () => {
    it('加载中时按钮 wrapper 应该有 disabled class', () => {
      vi.mocked(useCopilot).mockReturnValue({
        mode: 'assisted',
        switchMode: mockSwitchMode,
        isLoading: true,
      } as ReturnType<typeof useCopilot>)

      renderWithProviders(<ModeSelector />)

      // 检查 wrapper 元素的 disabled class
      const manualWrapper = screen.getByTestId('mode-manual').closest('.ant-radio-button-wrapper')
      const assistedWrapper = screen.getByTestId('mode-assisted').closest('.ant-radio-button-wrapper')
      const autoWrapper = screen.getByTestId('mode-auto').closest('.ant-radio-button-wrapper')

      expect(manualWrapper).toHaveClass('ant-radio-button-wrapper-disabled')
      expect(assistedWrapper).toHaveClass('ant-radio-button-wrapper-disabled')
      expect(autoWrapper).toHaveClass('ant-radio-button-wrapper-disabled')
    })

    it('禁用时 input 应该有 disabled 属性', () => {
      vi.mocked(useCopilot).mockReturnValue({
        mode: 'assisted',
        switchMode: mockSwitchMode,
        isLoading: true,
      } as ReturnType<typeof useCopilot>)

      renderWithProviders(<ModeSelector />)

      expect(screen.getByTestId('mode-manual')).toBeDisabled()
      expect(screen.getByTestId('mode-assisted')).toBeDisabled()
      expect(screen.getByTestId('mode-auto')).toBeDisabled()
    })
  })
})
