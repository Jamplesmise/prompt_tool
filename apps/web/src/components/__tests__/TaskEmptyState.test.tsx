import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskEmptyState } from '../task/TaskEmptyState'

describe('TaskEmptyState', () => {
  describe('无任务状态', () => {
    it('应显示无任务提示', () => {
      render(<TaskEmptyState />)
      expect(screen.getByText('还没有创建测试任务')).toBeInTheDocument()
    })

    it('应显示引导文案', () => {
      render(<TaskEmptyState />)
      expect(screen.getByText(/验证 AI 模型的输出质量/)).toBeInTheDocument()
    })

    it('有 onCreateTask 时应显示创建按钮', () => {
      const onCreateTask = vi.fn()
      render(<TaskEmptyState onCreateTask={onCreateTask} />)
      expect(screen.getByText('创建测试任务')).toBeInTheDocument()
    })

    it('点击创建按钮应调用 onCreateTask', () => {
      const onCreateTask = vi.fn()
      render(<TaskEmptyState onCreateTask={onCreateTask} />)

      fireEvent.click(screen.getByText('创建测试任务'))
      expect(onCreateTask).toHaveBeenCalledTimes(1)
    })

    it('无 onCreateTask 时不显示创建按钮', () => {
      render(<TaskEmptyState />)
      expect(screen.queryByText('创建测试任务')).toBeNull()
    })

    it('应显示查看文档链接', () => {
      render(<TaskEmptyState />)
      expect(screen.getByText('查看使用文档')).toBeInTheDocument()
    })

    it('文档链接应指向 /docs', () => {
      render(<TaskEmptyState />)
      const docLink = screen.getByText('查看使用文档')
      expect(docLink.closest('a')).toHaveAttribute('href', '/docs')
    })

    it('应显示闪电图标', () => {
      const { container } = render(<TaskEmptyState />)
      expect(container.querySelector('.anticon-thunderbolt')).toBeInTheDocument()
    })
  })

  describe('筛选无结果状态', () => {
    it('应显示筛选无结果提示', () => {
      render(<TaskEmptyState filtered={true} />)
      expect(screen.getByText('没有找到匹配的任务')).toBeInTheDocument()
    })

    it('应显示调整筛选条件提示', () => {
      render(<TaskEmptyState filtered={true} />)
      expect(screen.getByText('尝试调整筛选条件')).toBeInTheDocument()
    })

    it('有 onClearFilter 时应显示清除按钮', () => {
      const onClearFilter = vi.fn()
      render(<TaskEmptyState filtered={true} onClearFilter={onClearFilter} />)
      expect(screen.getByText('清除筛选条件')).toBeInTheDocument()
    })

    it('点击清除按钮应调用 onClearFilter', () => {
      const onClearFilter = vi.fn()
      render(<TaskEmptyState filtered={true} onClearFilter={onClearFilter} />)

      fireEvent.click(screen.getByText('清除筛选条件'))
      expect(onClearFilter).toHaveBeenCalledTimes(1)
    })

    it('无 onClearFilter 时不显示清除按钮', () => {
      render(<TaskEmptyState filtered={true} />)
      expect(screen.queryByText('清除筛选条件')).toBeNull()
    })

    it('应显示搜索图标', () => {
      const { container } = render(<TaskEmptyState filtered={true} />)
      expect(container.querySelector('.anticon-search')).toBeInTheDocument()
    })

    it('筛选状态不应显示创建任务按钮', () => {
      const onCreateTask = vi.fn()
      render(<TaskEmptyState filtered={true} onCreateTask={onCreateTask} />)
      expect(screen.queryByText('创建测试任务')).toBeNull()
    })
  })
})
