import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VersionDiff } from '../VersionDiff'
import type { VersionListItem, VersionDiffResponse } from '@/services/prompts'

// Mock Monaco DiffEditor
vi.mock('@monaco-editor/react', () => ({
  DiffEditor: ({ original, modified }: { original: string; modified: string }) => (
    <div data-testid="diff-editor">
      <div data-testid="original-content">{original}</div>
      <div data-testid="modified-content">{modified}</div>
    </div>
  ),
}))

describe('VersionDiff', () => {
  const mockVersions: VersionListItem[] = [
    { id: 'v1', version: 1, changeLog: '初始版本', createdAt: '2024-01-01', isPublished: true },
    { id: 'v2', version: 2, changeLog: '优化提示词', createdAt: '2024-01-02', isPublished: true },
    { id: 'v3', version: 3, changeLog: '', createdAt: '2024-01-03', isPublished: false },
  ]

  const mockDiffData: VersionDiffResponse = {
    v1: { id: 'v1', version: 1, content: '原始内容' },
    v2: { id: 'v2', version: 2, content: '修改后内容' },
    changes: [],
  }

  const defaultProps = {
    open: true,
    versions: mockVersions,
    diffData: null,
    selectedVersions: { v1: undefined, v2: undefined },
    onVersionChange: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应正确渲染模态框标题', () => {
      render(<VersionDiff {...defaultProps} />)
      expect(screen.getByText('版本对比')).toBeInTheDocument()
    })

    it('应显示版本选择器', () => {
      render(<VersionDiff {...defaultProps} />)
      expect(screen.getByText('旧版本:')).toBeInTheDocument()
      expect(screen.getByText('新版本:')).toBeInTheDocument()
    })

    it('open=false 时不应渲染', () => {
      render(<VersionDiff {...defaultProps} open={false} />)
      expect(screen.queryByText('版本对比')).not.toBeInTheDocument()
    })
  })

  describe('版本选择', () => {
    it('应显示版本选项', async () => {
      const user = userEvent.setup()
      render(<VersionDiff {...defaultProps} />)

      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])

      await waitFor(() => {
        expect(screen.getByText('v1 - 初始版本')).toBeInTheDocument()
        expect(screen.getByText('v2 - 优化提示词')).toBeInTheDocument()
        expect(screen.getByText('v3 - 无说明')).toBeInTheDocument()
      })
    })

    it('选择版本时应触发 onVersionChange', async () => {
      const user = userEvent.setup()
      const handleVersionChange = vi.fn()
      render(<VersionDiff {...defaultProps} onVersionChange={handleVersionChange} />)

      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])

      await waitFor(async () => {
        const option = screen.getByText('v1 - 初始版本')
        await user.click(option)
      })

      expect(handleVersionChange).toHaveBeenCalledWith('v1', 'v1')
    })

    it('应显示已选中的版本', () => {
      render(
        <VersionDiff
          {...defaultProps}
          selectedVersions={{ v1: 'v1', v2: 'v2' }}
        />
      )
      expect(screen.getByText('v1 - 初始版本')).toBeInTheDocument()
      expect(screen.getByText('v2 - 优化提示词')).toBeInTheDocument()
    })
  })

  describe('对比内容展示', () => {
    it('未选择版本时应显示提示', () => {
      render(<VersionDiff {...defaultProps} />)
      expect(screen.getByText('请选择两个版本进行对比')).toBeInTheDocument()
    })

    it('加载中应显示加载状态', () => {
      render(<VersionDiff {...defaultProps} loading />)
      expect(screen.getByText('加载中...')).toBeInTheDocument()
    })

    it('有对比数据时应显示 DiffEditor', () => {
      render(<VersionDiff {...defaultProps} diffData={mockDiffData} />)
      expect(screen.getByTestId('diff-editor')).toBeInTheDocument()
      expect(screen.getByTestId('original-content')).toHaveTextContent('原始内容')
      expect(screen.getByTestId('modified-content')).toHaveTextContent('修改后内容')
    })
  })

  describe('关闭操作', () => {
    it('点击取消应触发 onClose', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      render(<VersionDiff {...defaultProps} onClose={handleClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(handleClose).toHaveBeenCalled()
    })
  })
})
