import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '../common/Breadcrumb'

// Mock next/navigation
const mockPathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Breadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('首页', () => {
    it('首页不应显示面包屑', () => {
      mockPathname.mockReturnValue('/')
      const { container } = render(<Breadcrumb />)
      expect(container.querySelector('.ant-breadcrumb')).toBeNull()
    })
  })

  describe('设置页', () => {
    it('设置页不应显示面包屑', () => {
      mockPathname.mockReturnValue('/settings')
      const { container } = render(<Breadcrumb />)
      expect(container.querySelector('.ant-breadcrumb')).toBeNull()
    })
  })

  describe('一级页面', () => {
    it('提示词管理页应显示正确的面包屑', () => {
      mockPathname.mockReturnValue('/prompts')
      render(<Breadcrumb />)
      expect(screen.getByText('提示词管理')).toBeInTheDocument()
    })

    it('数据集页应显示正确的面包屑', () => {
      mockPathname.mockReturnValue('/datasets')
      render(<Breadcrumb />)
      expect(screen.getByText('数据集')).toBeInTheDocument()
    })

    it('模型配置页应显示正确的面包屑', () => {
      mockPathname.mockReturnValue('/models')
      render(<Breadcrumb />)
      expect(screen.getByText('模型配置')).toBeInTheDocument()
    })

    it('评估器页应显示正确的面包屑', () => {
      mockPathname.mockReturnValue('/evaluators')
      render(<Breadcrumb />)
      expect(screen.getByText('评估器')).toBeInTheDocument()
    })

    it('测试任务页应显示正确的面包屑', () => {
      mockPathname.mockReturnValue('/tasks')
      render(<Breadcrumb />)
      expect(screen.getByText('测试任务')).toBeInTheDocument()
    })
  })

  describe('新建页面', () => {
    it('提示词新建页应显示完整路径', () => {
      mockPathname.mockReturnValue('/prompts/new')
      render(<Breadcrumb />)
      expect(screen.getByText('新建')).toBeInTheDocument()
    })
  })

  describe('详情页', () => {
    it('UUID 路径应显示为"详情"', () => {
      mockPathname.mockReturnValue('/prompts/123e4567-e89b-12d3-a456-426614174000')
      render(<Breadcrumb />)
      expect(screen.getByText('详情')).toBeInTheDocument()
    })
  })

  describe('未知路由', () => {
    it('未知路由应显示原始段名', () => {
      mockPathname.mockReturnValue('/unknown-route')
      render(<Breadcrumb />)
      expect(screen.getByText('unknown-route')).toBeInTheDocument()
    })
  })

  describe('链接功能', () => {
    it('中间项应有链接', () => {
      mockPathname.mockReturnValue('/prompts/new')
      render(<Breadcrumb />)
      const link = screen.getByText('提示词管理')
      expect(link.closest('a')).toHaveAttribute('href', '/prompts')
    })

    it('最后一项不应有链接', () => {
      mockPathname.mockReturnValue('/prompts/new')
      render(<Breadcrumb />)
      const lastItem = screen.getByText('新建')
      expect(lastItem.closest('a')).toBeNull()
    })

    it('首页图标应链接到根路径', () => {
      mockPathname.mockReturnValue('/prompts')
      const { container } = render(<Breadcrumb />)
      const homeLink = container.querySelector('.anticon-home')?.closest('a')
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })
})
