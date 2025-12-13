/**
 * OperationHighlight 组件测试
 *
 * 测试用例：
 * TC-OH-001: 激活状态
 * TC-OH-002: 目标定位
 * TC-OH-003: 点击效果
 * TC-OH-004: SSR 安全
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { OperationHighlight, HIGHLIGHT_COLORS } from '../OperationHighlight'

// Mock createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  }
})

describe('OperationHighlight', () => {
  let mockElement: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    // 创建测试目标元素
    mockElement = document.createElement('div')
    mockElement.className = 'test-target'
    mockElement.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      width: 200,
      height: 50,
      right: 300,
      bottom: 150,
      x: 100,
      y: 100,
      toJSON: () => {},
    }))
    document.body.appendChild(mockElement)
  })

  afterEach(() => {
    vi.resetAllMocks()
    if (mockElement.parentNode) {
      document.body.removeChild(mockElement)
    }
  })

  describe('TC-OH-001: 激活状态', () => {
    it('激活且有目标时应该渲染高亮', async () => {
      render(
        <OperationHighlight
          targetSelector=".test-target"
          isActive={true}
        />
      )

      // 等待客户端挂载
      await waitFor(() => {
        const highlight = document.querySelector('[style*="position: fixed"]')
        expect(highlight).toBeTruthy()
      })
    })

    it('未激活时不渲染', () => {
      render(
        <OperationHighlight
          targetSelector=".test-target"
          isActive={false}
        />
      )

      const highlight = document.querySelector('[style*="animation: goi-breathe"]')
      expect(highlight).toBeFalsy()
    })
  })

  describe('TC-OH-002: 目标定位', () => {
    it('使用选择器定位目标', async () => {
      render(
        <OperationHighlight
          targetSelector=".test-target"
          isActive={true}
        />
      )

      await waitFor(() => {
        expect(mockElement.getBoundingClientRect).toHaveBeenCalled()
      })
    })

    it('直接传入元素定位目标', async () => {
      render(
        <OperationHighlight
          targetElement={mockElement}
          isActive={true}
        />
      )

      await waitFor(() => {
        expect(mockElement.getBoundingClientRect).toHaveBeenCalled()
      })
    })

    it('目标不存在时不渲染', () => {
      render(
        <OperationHighlight
          targetSelector=".non-existent"
          isActive={true}
        />
      )

      const highlight = document.querySelector('[style*="animation: goi-breathe"]')
      expect(highlight).toBeFalsy()
    })
  })

  describe('TC-OH-003: 点击效果', () => {
    it('显示点击效果时触发动画', async () => {
      const onClickEffectEnd = vi.fn()

      render(
        <OperationHighlight
          targetSelector=".test-target"
          isActive={true}
          showClickEffect={true}
          onClickEffectEnd={onClickEffectEnd}
        />
      )

      // 点击效果会在 500ms 后结束
      await waitFor(
        () => {
          expect(onClickEffectEnd).toHaveBeenCalled()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('TC-OH-004: SSR 安全', () => {
    it('初始渲染时不抛出错误', () => {
      expect(() => {
        render(
          <OperationHighlight
            targetSelector=".test-target"
            isActive={true}
          />
        )
      }).not.toThrow()
    })
  })

  describe('自定义样式', () => {
    it('应该支持自定义颜色', async () => {
      render(
        <OperationHighlight
          targetSelector=".test-target"
          isActive={true}
          pulseColor="#ff0000"
        />
      )

      await waitFor(() => {
        const style = document.querySelector('style')
        expect(style?.textContent).toContain('#ff0000')
      })
    })
  })
})

describe('HIGHLIGHT_COLORS', () => {
  it('应该包含所有预设颜色', () => {
    expect(HIGHLIGHT_COLORS.pulse).toBe('#3b82f6')
    expect(HIGHLIGHT_COLORS.static).toBe('#6b7280')
    expect(HIGHLIGHT_COLORS.success).toBe('#22c55e')
    expect(HIGHLIGHT_COLORS.error).toBe('#ef4444')
  })
})
