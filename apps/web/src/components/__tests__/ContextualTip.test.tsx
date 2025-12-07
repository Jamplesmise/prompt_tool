import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContextualTip } from '../guidance/ContextualTip'
import { useGuidanceStore } from '@/stores/guidanceStore'

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('ContextualTip', () => {
  const defaultProps = {
    tipId: 'test-tip',
    title: '测试提示',
    description: '这是一个测试提示',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置 store 状态
    useGuidanceStore.setState({
      dismissedTips: [],
      permanentlyDismissedTips: [],
      activeTips: [],
    })
  })

  describe('渲染', () => {
    it('应该正确渲染标题', () => {
      render(<ContextualTip {...defaultProps} />)
      expect(screen.getByText('测试提示')).toBeInTheDocument()
    })

    it('应该正确渲染描述', () => {
      render(<ContextualTip {...defaultProps} />)
      expect(screen.getByText('这是一个测试提示')).toBeInTheDocument()
    })

    it('不应该渲染当提示已被关闭时', () => {
      useGuidanceStore.setState({ dismissedTips: ['test-tip'] })

      render(<ContextualTip {...defaultProps} />)

      expect(screen.queryByText('测试提示')).not.toBeInTheDocument()
    })

    it('不应该渲染当提示已被永久关闭时', () => {
      useGuidanceStore.setState({ permanentlyDismissedTips: ['test-tip'] })

      render(<ContextualTip {...defaultProps} />)

      expect(screen.queryByText('测试提示')).not.toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('应该渲染主要操作按钮', () => {
      const onAction = vi.fn()
      render(
        <ContextualTip
          {...defaultProps}
          primaryAction={{ text: '立即测试', onClick: onAction }}
        />
      )

      const button = screen.getByText('立即测试')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(onAction).toHaveBeenCalled()
    })

    it('应该渲染次要操作按钮', () => {
      const onAction = vi.fn()
      render(
        <ContextualTip
          {...defaultProps}
          secondaryAction={{ text: '查看详情', onClick: onAction }}
        />
      )

      const button = screen.getByText('查看详情')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(onAction).toHaveBeenCalled()
    })

    it('应该同时渲染主要和次要操作按钮', () => {
      render(
        <ContextualTip
          {...defaultProps}
          primaryAction={{ text: '主要操作', onClick: vi.fn() }}
          secondaryAction={{ text: '次要操作', onClick: vi.fn() }}
        />
      )

      expect(screen.getByText('主要操作')).toBeInTheDocument()
      expect(screen.getByText('次要操作')).toBeInTheDocument()
    })
  })

  describe('关闭行为', () => {
    it('点击关闭按钮应该隐藏提示', () => {
      const onClose = vi.fn()
      render(<ContextualTip {...defaultProps} onClose={onClose} closable />)

      // 查找关闭按钮（X 图标按钮）
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg'))
      if (closeButton) {
        fireEvent.click(closeButton)
      }

      // 提示应该消失
      expect(onClose).toHaveBeenCalled()
    })

    it('应该渲染"不再提示"选项当 showDontShowAgain 为 true', () => {
      render(
        <ContextualTip
          {...defaultProps}
          showDontShowAgain
        />
      )

      expect(screen.getByText('不再提示')).toBeInTheDocument()
    })

    it('点击"不再提示"应该永久关闭提示', () => {
      render(
        <ContextualTip
          {...defaultProps}
          showDontShowAgain
        />
      )

      const neverShowButton = screen.getByText('不再提示')
      fireEvent.click(neverShowButton)

      // 检查 store 状态
      const { permanentlyDismissedTips } = useGuidanceStore.getState()
      expect(permanentlyDismissedTips).toContain('test-tip')
    })
  })

  describe('不显示关闭按钮', () => {
    it('当 closable 为 false 时不应该渲染关闭按钮', () => {
      render(<ContextualTip {...defaultProps} closable={false} showDontShowAgain={false} />)

      // 只有标题和描述，没有关闭按钮
      expect(screen.getByText('测试提示')).toBeInTheDocument()
      // 没有任何按钮
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })
  })
})
