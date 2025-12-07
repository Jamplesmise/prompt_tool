import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublishModal } from '../PublishModal'

describe('PublishModal', () => {
  const defaultProps = {
    open: true,
    onOk: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应正确渲染模态框', () => {
      render(<PublishModal {...defaultProps} />)
      expect(screen.getByText('发布新版本')).toBeInTheDocument()
    })

    it('应显示变更说明输入框', () => {
      render(<PublishModal {...defaultProps} />)
      expect(screen.getByText('变更说明')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入本次版本的变更说明（可选）')).toBeInTheDocument()
    })

    it('应显示发布和取消按钮', () => {
      render(<PublishModal {...defaultProps} />)
      expect(screen.getByText('发布')).toBeInTheDocument()
      expect(screen.getByText('取消')).toBeInTheDocument()
    })

    it('open=false 时不应渲染', () => {
      render(<PublishModal {...defaultProps} open={false} />)
      expect(screen.queryByText('发布新版本')).not.toBeInTheDocument()
    })
  })

  describe('表单交互', () => {
    it('应能输入变更说明', async () => {
      const user = userEvent.setup()
      render(<PublishModal {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('请输入本次版本的变更说明（可选）')
      await user.type(textarea, '修复了一些问题')

      expect(textarea).toHaveValue('修复了一些问题')
    })

    it('点击发布应触发 onOk 并传递变更说明', async () => {
      const user = userEvent.setup()
      const handleOk = vi.fn()
      render(<PublishModal {...defaultProps} onOk={handleOk} />)

      const textarea = screen.getByPlaceholderText('请输入本次版本的变更说明（可选）')
      await user.type(textarea, '新增功能')

      const submitButton = screen.getByText('发布')
      await user.click(submitButton)

      await waitFor(() => {
        expect(handleOk).toHaveBeenCalledWith('新增功能')
      })
    })

    it('空变更说明时应传递空字符串', async () => {
      const user = userEvent.setup()
      const handleOk = vi.fn()
      render(<PublishModal {...defaultProps} onOk={handleOk} />)

      const submitButton = screen.getByText('发布')
      await user.click(submitButton)

      await waitFor(() => {
        expect(handleOk).toHaveBeenCalledWith('')
      })
    })

    it('点击取消应触发 onCancel', async () => {
      const user = userEvent.setup()
      const handleCancel = vi.fn()
      render(<PublishModal {...defaultProps} onCancel={handleCancel} />)

      const cancelButton = screen.getByText('取消')
      await user.click(cancelButton)

      expect(handleCancel).toHaveBeenCalled()
    })
  })

  describe('加载状态', () => {
    it('loading=true 时发布按钮应显示加载状态', () => {
      render(<PublishModal {...defaultProps} loading />)
      const submitButton = screen.getByText('发布').closest('button')
      expect(submitButton).toHaveClass('ant-btn-loading')
    })
  })

  describe('字数限制', () => {
    it('应显示字数统计', () => {
      render(<PublishModal {...defaultProps} />)
      expect(screen.getByText('0 / 500')).toBeInTheDocument()
    })

    it('输入后应更新字数统计', async () => {
      const user = userEvent.setup()
      render(<PublishModal {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('请输入本次版本的变更说明（可选）')
      await user.type(textarea, '测试内容')

      expect(screen.getByText('4 / 500')).toBeInTheDocument()
    })
  })

  describe('表单重置', () => {
    it('取消后再次打开应清空表单', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<PublishModal {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('请输入本次版本的变更说明（可选）')
      await user.type(textarea, '测试内容')

      const cancelButton = screen.getByText('取消')
      await user.click(cancelButton)

      // 关闭后重新打开
      rerender(<PublishModal {...defaultProps} open={false} />)
      rerender(<PublishModal {...defaultProps} open />)

      const newTextarea = screen.getByPlaceholderText('请输入本次版本的变更说明（可选）')
      expect(newTextarea).toHaveValue('')
    })
  })
})
