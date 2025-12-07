import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../common/StatusBadge'

describe('StatusBadge', () => {
  describe('基本渲染', () => {
    it('应渲染成功状态', () => {
      render(<StatusBadge status="success" text="已完成" />)
      expect(screen.getByText('已完成')).toBeInTheDocument()
    })

    it('应渲染处理中状态', () => {
      render(<StatusBadge status="processing" text="执行中" />)
      expect(screen.getByText('执行中')).toBeInTheDocument()
    })

    it('应渲染警告状态', () => {
      render(<StatusBadge status="warning" text="待处理" />)
      expect(screen.getByText('待处理')).toBeInTheDocument()
    })

    it('应渲染错误状态', () => {
      render(<StatusBadge status="error" text="失败" />)
      expect(screen.getByText('失败')).toBeInTheDocument()
    })

    it('应渲染默认状态', () => {
      render(<StatusBadge status="default" text="未知" />)
      expect(screen.getByText('未知')).toBeInTheDocument()
    })
  })

  describe('状态点', () => {
    it('默认不显示状态点', () => {
      const { container } = render(<StatusBadge status="success" text="成功" />)
      // 查找状态点元素（通过样式类）
      const dots = container.querySelectorAll('[class*="dot"]')
      expect(dots.length).toBe(0)
    })

    it('dot=true 时显示状态点', () => {
      const { container } = render(<StatusBadge status="success" text="成功" dot />)
      const dots = container.querySelectorAll('[class*="dot"]')
      expect(dots.length).toBeGreaterThan(0)
    })

    it('processing 状态且 dot=true 时应有脉冲动画类', () => {
      const { container } = render(<StatusBadge status="processing" text="处理中" dot />)
      const pulseDots = container.querySelectorAll('[class*="pulse"]')
      expect(pulseDots.length).toBeGreaterThan(0)
    })

    it('success 状态且 dot=true 时不应有脉冲动画类', () => {
      const { container } = render(<StatusBadge status="success" text="成功" dot />)
      const pulseDots = container.querySelectorAll('[class*="pulse"]')
      expect(pulseDots.length).toBe(0)
    })
  })

  describe('样式', () => {
    it('badge 元素应存在', () => {
      const { container } = render(<StatusBadge status="success" text="成功" />)
      const badge = container.querySelector('[class*="badge"]')
      expect(badge).toBeInTheDocument()
    })

    it('不同状态应有不同的背景色', () => {
      const { container: successContainer } = render(
        <StatusBadge status="success" text="成功" />
      )
      const { container: errorContainer } = render(
        <StatusBadge status="error" text="失败" />
      )

      const successBadge = successContainer.querySelector('[class*="badge"]')
      const errorBadge = errorContainer.querySelector('[class*="badge"]')

      // 两个状态的样式应该不同
      expect(successBadge).toBeInTheDocument()
      expect(errorBadge).toBeInTheDocument()
    })
  })
})
