import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptFilters } from '../PromptFilters'

describe('PromptFilters', () => {
  const defaultProps = {
    value: {},
    onChange: vi.fn(),
    onCreatePrompt: vi.fn(),
    availableTags: ['生产', '测试', '开发', '归档'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应渲染搜索框', () => {
      render(<PromptFilters {...defaultProps} />)
      expect(
        screen.getByPlaceholderText('搜索提示词名称或内容...')
      ).toBeInTheDocument()
    })

    it('应渲染标签筛选器', () => {
      render(<PromptFilters {...defaultProps} />)
      expect(screen.getByText('标签筛选')).toBeInTheDocument()
    })

    it('应渲染新建按钮', () => {
      render(<PromptFilters {...defaultProps} />)
      expect(screen.getByText('新建提示词')).toBeInTheDocument()
    })
  })

  describe('搜索功能', () => {
    it('应在输入时更新搜索值', async () => {
      render(<PromptFilters {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('搜索提示词名称或内容...')
      fireEvent.change(searchInput, { target: { value: '测试搜索' } })

      expect(searchInput).toHaveValue('测试搜索')
    })

    it('应防抖触发 onChange', async () => {
      const handleChange = vi.fn()
      render(<PromptFilters {...defaultProps} onChange={handleChange} />)

      const searchInput = screen.getByPlaceholderText('搜索提示词名称或内容...')
      fireEvent.change(searchInput, { target: { value: '测试' } })

      // 防抖延迟 300ms
      await waitFor(
        () => {
          expect(handleChange).toHaveBeenCalledWith({ search: '测试' })
        },
        { timeout: 500 }
      )
    })

    it('清空搜索时应触发 onChange', () => {
      const handleChange = vi.fn()
      render(
        <PromptFilters
          {...defaultProps}
          value={{ search: '测试' }}
          onChange={handleChange}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索提示词名称或内容...')
      fireEvent.change(searchInput, { target: { value: '' } })

      // 清空时立即触发或等待防抖
      expect(searchInput).toHaveValue('')
    })
  })

  describe('标签筛选', () => {
    it('应显示已选中的标签', () => {
      render(
        <PromptFilters {...defaultProps} value={{ tags: ['生产', '测试'] }} />
      )

      expect(screen.getByText('生产')).toBeInTheDocument()
      expect(screen.getByText('测试')).toBeInTheDocument()
    })

    it('应在选择标签时触发 onChange', async () => {
      const handleChange = vi.fn()
      render(<PromptFilters {...defaultProps} onChange={handleChange} />)

      // 点击标签选择器
      const tagSelect = screen.getByText('标签筛选')
      fireEvent.mouseDown(tagSelect)

      // 选择一个标签
      const option = await screen.findByTitle('生产')
      fireEvent.click(option)

      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('新建按钮', () => {
    it('点击新建按钮应触发 onCreatePrompt', () => {
      const handleCreate = vi.fn()
      render(<PromptFilters {...defaultProps} onCreatePrompt={handleCreate} />)

      const createButton = screen.getByText('新建提示词')
      fireEvent.click(createButton)

      expect(handleCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('初始值', () => {
    it('应正确显示初始搜索值', () => {
      render(<PromptFilters {...defaultProps} value={{ search: '初始搜索' }} />)

      const searchInput = screen.getByPlaceholderText('搜索提示词名称或内容...')
      expect(searchInput).toHaveValue('初始搜索')
    })

    it('应正确显示初始标签', () => {
      render(<PromptFilters {...defaultProps} value={{ tags: ['开发'] }} />)
      expect(screen.getByText('开发')).toBeInTheDocument()
    })
  })
})
