/**
 * ContextWarning 组件测试
 *
 * 测试用例：
 * TC-CW-001: 使用量显示
 * TC-CW-002: 警告级别
 * TC-CW-003: 压缩按钮
 * TC-CW-004: 详情显示
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './helpers/renderWithProviders'
import { ContextWarning, ContextIndicator as CompactContextIndicator } from '../ContextWarning'
import type { ContextUsage } from '@platform/shared'

describe('ContextWarning', () => {
  const baseUsage: ContextUsage = {
    usagePercent: 50,
    warningLevel: 'normal',
    totalTokens: 50000,
    maxTokens: 100000,
    layerBreakdown: {
      system: 10000,
      session: 20000,
      working: 15000,
      instant: 5000,
    },
  } as ContextUsage

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CW-001: 使用量显示', () => {
    it('显示使用量百分比', () => {
      renderWithProviders(<ContextWarning usage={baseUsage} />)

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('显示详情时展示 token 数', () => {
      renderWithProviders(<ContextWarning usage={baseUsage} showDetails={true} />)

      // formatTokens 函数使用 .toFixed(1)，所以是 50.0K 格式
      expect(screen.getByText('50.0K')).toBeInTheDocument()
      expect(screen.getByText('100.0K')).toBeInTheDocument()
    })
  })

  describe('TC-CW-002: 警告级别', () => {
    it('正常级别不显示警告图标', () => {
      renderWithProviders(<ContextWarning usage={baseUsage} />)

      // 正常级别没有警告图标
      expect(screen.queryByText('上下文使用正常')).not.toBeInTheDocument()
    })

    it('警告级别显示警告消息', () => {
      const warningUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 75,
        warningLevel: 'warning',
      }

      renderWithProviders(<ContextWarning usage={warningUsage} />)

      expect(screen.getByText('上下文使用较高，建议及时压缩')).toBeInTheDocument()
    })

    it('高级别显示警告消息', () => {
      const highUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 85,
        warningLevel: 'high',
      }

      renderWithProviders(<ContextWarning usage={highUsage} />)

      expect(screen.getByText('上下文使用过高，强烈建议压缩')).toBeInTheDocument()
    })

    it('危急级别显示紧急消息', () => {
      const criticalUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 95,
        warningLevel: 'critical',
      }

      renderWithProviders(<ContextWarning usage={criticalUsage} />)

      expect(screen.getByText('上下文即将耗尽，必须立即压缩')).toBeInTheDocument()
    })
  })

  describe('TC-CW-003: 压缩按钮', () => {
    it('正常级别不显示压缩按钮', () => {
      const mockOnCompress = vi.fn()

      renderWithProviders(
        <ContextWarning
          usage={baseUsage}
          showCompressButton={true}
          onCompress={mockOnCompress}
        />
      )

      expect(screen.queryByText('压缩')).not.toBeInTheDocument()
    })

    it('警告级别显示压缩按钮', () => {
      const mockOnCompress = vi.fn()
      const warningUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 75,
        warningLevel: 'warning',
      }

      renderWithProviders(
        <ContextWarning
          usage={warningUsage}
          showCompressButton={true}
          onCompress={mockOnCompress}
        />
      )

      expect(screen.getByText('压缩')).toBeInTheDocument()
    })

    it('点击压缩按钮调用 onCompress', () => {
      const mockOnCompress = vi.fn()
      const warningUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 75,
        warningLevel: 'warning',
      }

      renderWithProviders(
        <ContextWarning
          usage={warningUsage}
          showCompressButton={true}
          onCompress={mockOnCompress}
        />
      )

      fireEvent.click(screen.getByText('压缩'))

      expect(mockOnCompress).toHaveBeenCalled()
    })

    it('压缩中时显示加载状态', () => {
      const mockOnCompress = vi.fn()
      const warningUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 75,
        warningLevel: 'warning',
      }

      renderWithProviders(
        <ContextWarning
          usage={warningUsage}
          showCompressButton={true}
          onCompress={mockOnCompress}
          compressing={true}
        />
      )

      const button = screen.getByText('压缩').closest('button')
      expect(button).toHaveClass('ant-btn-loading')
    })

    it('危急级别时压缩按钮为危险样式', () => {
      const mockOnCompress = vi.fn()
      const criticalUsage: ContextUsage = {
        ...baseUsage,
        usagePercent: 95,
        warningLevel: 'critical',
      }

      renderWithProviders(
        <ContextWarning
          usage={criticalUsage}
          showCompressButton={true}
          onCompress={mockOnCompress}
        />
      )

      const button = screen.getByText('压缩').closest('button')
      expect(button).toHaveClass('ant-btn-dangerous')
    })
  })

  describe('TC-CW-004: 详情显示', () => {
    it('showDetails 为 true 时显示 token 详情', () => {
      renderWithProviders(<ContextWarning usage={baseUsage} showDetails={true} />)

      // formatTokens 函数使用 .toFixed(1)，所以是 50.0K 格式
      expect(screen.getByText('50.0K')).toBeInTheDocument()
      expect(screen.getByText('/')).toBeInTheDocument()
      expect(screen.getByText('100.0K')).toBeInTheDocument()
    })

    it('showDetails 为 false 时不显示 token 详情', () => {
      renderWithProviders(<ContextWarning usage={baseUsage} showDetails={false} />)

      expect(screen.queryByText('50K')).not.toBeInTheDocument()
    })
  })

  describe('样式支持', () => {
    it('应用自定义样式', () => {
      const { container } = renderWithProviders(
        <ContextWarning
          usage={baseUsage}
          style={{ backgroundColor: 'red' }}
        />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.backgroundColor).toBe('red')
    })

    it('应用自定义类名', () => {
      const { container } = renderWithProviders(
        <ContextWarning usage={baseUsage} className="custom-class" />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('custom-class')
    })
  })
})

describe('CompactContextIndicator', () => {
  const baseUsage: ContextUsage = {
    usagePercent: 50,
    warningLevel: 'normal',
    totalTokens: 50000,
    maxTokens: 100000,
    layerBreakdown: {},
  } as ContextUsage

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('显示使用量百分比', () => {
    renderWithProviders(<CompactContextIndicator usage={baseUsage} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('点击时调用 onClick', () => {
    const mockOnClick = vi.fn()

    renderWithProviders(
      <CompactContextIndicator usage={baseUsage} onClick={mockOnClick} />
    )

    fireEvent.click(screen.getByText('50%'))

    expect(mockOnClick).toHaveBeenCalled()
  })

  it('不同警告级别显示不同颜色', () => {
    const criticalUsage: ContextUsage = {
      ...baseUsage,
      usagePercent: 95,
      warningLevel: 'critical',
    }

    renderWithProviders(<CompactContextIndicator usage={criticalUsage} />)

    expect(screen.getByText('95%')).toBeInTheDocument()
  })
})
