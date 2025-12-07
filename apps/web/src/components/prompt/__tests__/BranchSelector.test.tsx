import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BranchSelector } from '../BranchSelector'

// Mock useBranches hook
vi.mock('@/hooks/usePrompts', () => ({
  useBranches: vi.fn(),
}))

import { useBranches } from '@/hooks/usePrompts'

const mockUseBranches = useBranches as ReturnType<typeof vi.fn>

const mockBranches = [
  {
    id: 'branch-1',
    name: 'main',
    status: 'ACTIVE',
    isDefault: true,
    currentVersion: 3,
  },
  {
    id: 'branch-2',
    name: 'feature-a',
    status: 'ACTIVE',
    isDefault: false,
    currentVersion: 2,
  },
  {
    id: 'branch-3',
    name: 'merged-branch',
    status: 'MERGED',
    isDefault: false,
    currentVersion: 1,
  },
  {
    id: 'branch-4',
    name: 'archived-branch',
    status: 'ARCHIVED',
    isDefault: false,
    currentVersion: 1,
  },
]

describe('BranchSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBranches.mockReturnValue({
      data: mockBranches,
      isLoading: false,
    })
  })

  describe('基本渲染', () => {
    it('应正确渲染下拉选择器', () => {
      render(<BranchSelector promptId="prompt-1" />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('应显示占位符文本', () => {
      render(<BranchSelector promptId="prompt-1" />)
      expect(screen.getByText('选择分支')).toBeInTheDocument()
    })

    it('加载中时应显示加载状态', () => {
      mockUseBranches.mockReturnValue({
        data: undefined,
        isLoading: true,
      })
      render(<BranchSelector promptId="prompt-1" />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('分支选择', () => {
    it('点击后应显示分支列表', async () => {
      render(<BranchSelector promptId="prompt-1" />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument()
        expect(screen.getByText('feature-a')).toBeInTheDocument()
      })
    })

    it('选择分支时应触发 onChange', async () => {
      const handleChange = vi.fn()
      render(<BranchSelector promptId="prompt-1" onChange={handleChange} />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        const option = screen.getByText('feature-a')
        fireEvent.click(option)
      })

      expect(handleChange).toHaveBeenCalledWith('branch-2', mockBranches[1])
    })

    it('应显示已选中的分支', () => {
      render(<BranchSelector promptId="prompt-1" value="branch-1" />)
      expect(screen.getByText('main')).toBeInTheDocument()
    })
  })

  describe('分支状态显示', () => {
    it('默认分支应显示"默认"标签', async () => {
      render(<BranchSelector promptId="prompt-1" showStatus />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('默认')).toBeInTheDocument()
      })
    })

    it('活跃分支应显示"活跃"标签', async () => {
      render(<BranchSelector promptId="prompt-1" showStatus />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('活跃')).toBeInTheDocument()
      })
    })

    it('已合并分支应显示"已合并"标签', async () => {
      render(<BranchSelector promptId="prompt-1" showStatus />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('已合并')).toBeInTheDocument()
      })
    })

    it('已归档分支应显示"已归档"标签', async () => {
      render(<BranchSelector promptId="prompt-1" showStatus />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('已归档')).toBeInTheDocument()
      })
    })

    it('showStatus=false 时不应显示状态标签', async () => {
      render(<BranchSelector promptId="prompt-1" showStatus={false} />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument()
      })

      expect(screen.queryByText('默认')).not.toBeInTheDocument()
    })
  })

  describe('禁用状态', () => {
    it('disabled=true 时应禁用选择器', () => {
      const { container } = render(<BranchSelector promptId="prompt-1" disabled />)
      const select = container.querySelector('.ant-select')
      expect(select).toHaveClass('ant-select-disabled')
    })
  })

  describe('版本号显示', () => {
    it('应显示分支的当前版本号', async () => {
      render(<BranchSelector promptId="prompt-1" />)

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      await waitFor(() => {
        expect(screen.getByText('v3')).toBeInTheDocument()
        expect(screen.getByText('v2')).toBeInTheDocument()
      })
    })
  })
})
