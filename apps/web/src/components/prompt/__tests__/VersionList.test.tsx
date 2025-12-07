import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionList } from '../VersionList'

const mockVersions = [
  {
    id: 'v1',
    version: 1,
    changeLog: '初始版本',
    createdAt: '2024-01-01T10:00:00Z',
    createdBy: { id: 'u1', name: '张三' },
  },
  {
    id: 'v2',
    version: 2,
    changeLog: '修复了一些问题',
    createdAt: '2024-01-02T10:00:00Z',
    createdBy: { id: 'u1', name: '张三' },
  },
  {
    id: 'v3',
    version: 3,
    changeLog: null,
    createdAt: '2024-01-03T10:00:00Z',
    createdBy: { id: 'u2', name: '李四' },
  },
]

describe('VersionList', () => {
  const defaultProps = {
    versions: mockVersions,
    currentVersion: 3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应渲染所有版本', () => {
      render(<VersionList {...defaultProps} />)

      expect(screen.getByText('v1')).toBeInTheDocument()
      expect(screen.getByText('v2')).toBeInTheDocument()
      expect(screen.getByText('v3')).toBeInTheDocument()
    })

    it('应显示变更说明', () => {
      render(<VersionList {...defaultProps} />)

      expect(screen.getByText('初始版本')).toBeInTheDocument()
      expect(screen.getByText('修复了一些问题')).toBeInTheDocument()
    })

    it('无变更说明时应显示默认文本', () => {
      render(<VersionList {...defaultProps} />)

      expect(screen.getByText('无变更说明')).toBeInTheDocument()
    })

    it('应显示创建者名称', () => {
      render(<VersionList {...defaultProps} />)

      expect(screen.getAllByText(/张三/)).toHaveLength(2)
      expect(screen.getByText(/李四/)).toBeInTheDocument()
    })
  })

  describe('当前版本标识', () => {
    it('当前版本应显示"当前"标签', () => {
      render(<VersionList {...defaultProps} currentVersion={2} />)

      const currentTag = screen.getByText('当前')
      expect(currentTag).toBeInTheDocument()
    })

    it('当前版本项应有特殊背景色', () => {
      const { container } = render(<VersionList {...defaultProps} currentVersion={2} />)

      const listItems = container.querySelectorAll('.ant-list-item')
      // 第二个版本（v2）是当前版本
      expect(listItems[1]).toHaveStyle({ background: '#e6f4ff' })
    })
  })

  describe('加载状态', () => {
    it('loading 为 true 时应显示加载状态', () => {
      render(<VersionList {...defaultProps} loading={true} />)

      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('无版本时应显示空状态', () => {
      render(<VersionList versions={[]} currentVersion={0} />)

      expect(screen.getByText('暂无版本记录')).toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('所有版本都应显示查看按钮', () => {
      render(<VersionList {...defaultProps} />)

      // 查看按钮图标
      const viewButtons = document.querySelectorAll('.anticon-eye')
      expect(viewButtons).toHaveLength(3)
    })

    it('非当前版本应显示回滚按钮', () => {
      render(<VersionList {...defaultProps} currentVersion={3} />)

      // v1, v2 应有回滚按钮, v3 不应有
      const rollbackButtons = document.querySelectorAll('.anticon-rollback')
      expect(rollbackButtons).toHaveLength(2)
    })

    it('当前版本不应显示回滚按钮', () => {
      render(<VersionList {...defaultProps} currentVersion={3} />)

      // 找到 v3 的列表项，确认没有回滚按钮
      const v3Text = screen.getByText('v3')
      const v3Item = v3Text.closest('.ant-list-item')
      expect(v3Item?.querySelector('.anticon-rollback')).not.toBeInTheDocument()
    })

    it('点击查看按钮应触发 onView', () => {
      const handleView = vi.fn()
      render(<VersionList {...defaultProps} onView={handleView} />)

      const viewButtons = document.querySelectorAll('.anticon-eye')
      fireEvent.click(viewButtons[0].closest('button')!)

      expect(handleView).toHaveBeenCalledWith('v1')
    })
  })
})
