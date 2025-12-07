import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptTable } from '../PromptTable'

const mockData = [
  {
    id: '1',
    name: '测试提示词1',
    description: '这是一个测试描述',
    currentVersion: 1,
    tags: ['生产', '测试'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '测试提示词2',
    description: null,
    currentVersion: 3,
    tags: ['开发', '归档', '额外标签'],
    updatedAt: new Date().toISOString(),
  },
]

const defaultPagination = {
  current: 1,
  pageSize: 10,
  total: 2,
  onChange: vi.fn(),
}

describe('PromptTable', () => {
  const defaultProps = {
    data: mockData,
    loading: false,
    selectedIds: [],
    onSelectionChange: vi.fn(),
    pagination: defaultPagination,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应渲染表格', () => {
      render(<PromptTable {...defaultProps} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('应显示提示词名称', () => {
      render(<PromptTable {...defaultProps} />)
      expect(screen.getByText('测试提示词1')).toBeInTheDocument()
      expect(screen.getByText('测试提示词2')).toBeInTheDocument()
    })

    it('应显示版本号', () => {
      render(<PromptTable {...defaultProps} />)
      expect(screen.getByText('v1')).toBeInTheDocument()
      expect(screen.getByText('v3')).toBeInTheDocument()
    })

    it('应显示标签', () => {
      render(<PromptTable {...defaultProps} />)
      expect(screen.getByText('生产')).toBeInTheDocument()
      expect(screen.getByText('测试')).toBeInTheDocument()
    })

    it('超过2个标签时应显示+N', () => {
      render(<PromptTable {...defaultProps} />)
      // 第二条数据有3个标签，应显示 +1
      expect(screen.getByText('+1')).toBeInTheDocument()
    })

    it('无描述时应显示占位符', () => {
      render(<PromptTable {...defaultProps} />)
      // 第二条数据无描述
      expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    })
  })

  describe('加载状态', () => {
    it('loading 为 true 时应显示加载指示器', () => {
      render(<PromptTable {...defaultProps} loading={true} />)
      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
    })
  })

  describe('行选择', () => {
    it('应正确显示已选中的行', () => {
      render(<PromptTable {...defaultProps} selectedIds={['1']} />)
      const checkboxes = screen.getAllByRole('checkbox')
      // 第一个是全选，第二个是第一行
      expect(checkboxes[1]).toBeChecked()
    })

    it('选择行时应触发 onSelectionChange', () => {
      const handleSelectionChange = vi.fn()
      render(
        <PromptTable
          {...defaultProps}
          onSelectionChange={handleSelectionChange}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1]) // 点击第一行的 checkbox

      expect(handleSelectionChange).toHaveBeenCalled()
    })
  })

  describe('事件处理', () => {
    it('点击名称应触发 onPreview', () => {
      const handlePreview = vi.fn()
      render(<PromptTable {...defaultProps} onPreview={handlePreview} />)

      fireEvent.click(screen.getByText('测试提示词1'))

      expect(handlePreview).toHaveBeenCalledWith('1')
    })

    it('点击行应展开/折叠快捷操作', () => {
      render(<PromptTable {...defaultProps} />)

      // 点击第一行
      const rows = screen.getAllByRole('row')
      fireEvent.click(rows[1]) // rows[0] 是表头

      // 应显示快捷操作
      expect(screen.getByText('快捷操作:')).toBeInTheDocument()
      expect(screen.getByText('编辑')).toBeInTheDocument()
      expect(screen.getByText('测试')).toBeInTheDocument()
      expect(screen.getByText('复制')).toBeInTheDocument()
      expect(screen.getByText('删除')).toBeInTheDocument()
    })

    it('展开后再次点击应折叠', () => {
      render(<PromptTable {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      // 点击展开
      fireEvent.click(rows[1])
      expect(screen.getByText('快捷操作:')).toBeInTheDocument()

      // 再次点击折叠
      fireEvent.click(rows[1])
      expect(screen.queryByText('快捷操作:')).not.toBeInTheDocument()
    })

    it('展开后点击编辑应触发 onEdit', () => {
      const handleEdit = vi.fn()
      render(<PromptTable {...defaultProps} onEdit={handleEdit} />)

      // 展开行
      const rows = screen.getAllByRole('row')
      fireEvent.click(rows[1])

      // 点击编辑
      fireEvent.click(screen.getByText('编辑'))

      expect(handleEdit).toHaveBeenCalledWith('1')
    })

    it('展开后点击测试应触发 onTest', () => {
      const handleTest = vi.fn()
      render(<PromptTable {...defaultProps} onTest={handleTest} />)

      const rows = screen.getAllByRole('row')
      fireEvent.click(rows[1])
      fireEvent.click(screen.getByText('测试'))

      expect(handleTest).toHaveBeenCalledWith('1')
    })

    it('展开后点击复制应触发 onCopy', () => {
      const handleCopy = vi.fn()
      render(<PromptTable {...defaultProps} onCopy={handleCopy} />)

      const rows = screen.getAllByRole('row')
      fireEvent.click(rows[1])
      fireEvent.click(screen.getByText('复制'))

      expect(handleCopy).toHaveBeenCalledWith('1')
    })
  })

  describe('分页', () => {
    it('应显示总数', () => {
      render(<PromptTable {...defaultProps} />)
      expect(screen.getByText('共 2 条')).toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('无数据时应显示空状态', () => {
      render(<PromptTable {...defaultProps} data={[]} pagination={{ ...defaultPagination, total: 0 }} />)
      expect(screen.getByText('暂无提示词')).toBeInTheDocument()
    })
  })
})
