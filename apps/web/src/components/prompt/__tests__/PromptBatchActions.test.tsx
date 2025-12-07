import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptBatchActions } from '../PromptBatchActions'

describe('PromptBatchActions', () => {
  const defaultProps = {
    total: 10,
    selectedCount: 0,
    onSelectAll: vi.fn(),
    onDeselectAll: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchExport: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应渲染全选复选框', () => {
      render(<PromptBatchActions {...defaultProps} />)
      expect(screen.getByText('全选')).toBeInTheDocument()
    })

    it('应显示已选择数量', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={3} />)
      // 文本可能被分割成多个元素，使用正则匹配
      expect(screen.getByText(/已选择/)).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('应显示总数', () => {
      render(<PromptBatchActions {...defaultProps} />)
      expect(screen.getByText('共 10 项')).toBeInTheDocument()
    })

    it('应渲染批量删除按钮', () => {
      render(<PromptBatchActions {...defaultProps} />)
      expect(screen.getByText('批量删除')).toBeInTheDocument()
    })

    it('应渲染批量导出按钮', () => {
      render(<PromptBatchActions {...defaultProps} />)
      expect(screen.getByText('批量导出')).toBeInTheDocument()
    })
  })

  describe('全选复选框状态', () => {
    it('未选择时复选框应未勾选', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={0} />)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('全部选中时复选框应勾选', () => {
      render(
        <PromptBatchActions {...defaultProps} selectedCount={10} total={10} />
      )
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('部分选中时复选框应显示半选状态', () => {
      const { container } = render(
        <PromptBatchActions {...defaultProps} selectedCount={5} total={10} />
      )
      // Ant Design 的 indeterminate 状态在包装器上
      const checkboxWrapper = container.querySelector('.ant-checkbox-indeterminate')
      expect(checkboxWrapper).toBeInTheDocument()
    })
  })

  describe('全选操作', () => {
    it('未选中时点击全选应触发 onSelectAll', () => {
      const handleSelectAll = vi.fn()
      render(
        <PromptBatchActions
          {...defaultProps}
          selectedCount={0}
          onSelectAll={handleSelectAll}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(handleSelectAll).toHaveBeenCalledTimes(1)
    })

    it('已全选时点击应触发 onDeselectAll', () => {
      const handleDeselectAll = vi.fn()
      render(
        <PromptBatchActions
          {...defaultProps}
          selectedCount={10}
          total={10}
          onDeselectAll={handleDeselectAll}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(handleDeselectAll).toHaveBeenCalledTimes(1)
    })

    it('部分选中时点击应触发 onDeselectAll', () => {
      const handleDeselectAll = vi.fn()
      render(
        <PromptBatchActions
          {...defaultProps}
          selectedCount={5}
          total={10}
          onDeselectAll={handleDeselectAll}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(handleDeselectAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('按钮禁用状态', () => {
    it('未选择时批量删除按钮应禁用', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={0} />)
      const deleteButton = screen.getByText('批量删除').closest('button')
      expect(deleteButton).toBeDisabled()
    })

    it('未选择时批量导出按钮应禁用', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={0} />)
      const exportButton = screen.getByText('批量导出').closest('button')
      expect(exportButton).toBeDisabled()
    })

    it('选择后批量删除按钮应启用', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={3} />)
      const deleteButton = screen.getByText('批量删除').closest('button')
      expect(deleteButton).not.toBeDisabled()
    })

    it('选择后批量导出按钮应启用', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={3} />)
      const exportButton = screen.getByText('批量导出').closest('button')
      expect(exportButton).not.toBeDisabled()
    })
  })

  describe('批量操作', () => {
    it('点击批量导出应触发 onBatchExport', () => {
      const handleBatchExport = vi.fn()
      render(
        <PromptBatchActions
          {...defaultProps}
          selectedCount={3}
          onBatchExport={handleBatchExport}
        />
      )

      fireEvent.click(screen.getByText('批量导出'))

      expect(handleBatchExport).toHaveBeenCalledTimes(1)
    })
  })

  describe('加载状态', () => {
    it('loading 时按钮应显示加载状态', () => {
      render(<PromptBatchActions {...defaultProps} selectedCount={3} loading />)

      // Ant Design 的 loading 按钮会添加 ant-btn-loading 类
      const deleteButton = screen.getByText('批量删除').closest('button')
      const exportButton = screen.getByText('批量导出').closest('button')

      expect(deleteButton).toHaveClass('ant-btn-loading')
      expect(exportButton).toHaveClass('ant-btn-loading')
    })
  })
})
