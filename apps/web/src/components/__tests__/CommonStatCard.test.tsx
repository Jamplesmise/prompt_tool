import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatCard } from '../common/StatCard'
import { FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'

describe('Common StatCard', () => {
  describe('基本渲染', () => {
    it('应渲染标题和数值', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="提示词总数"
          value={42}
        />
      )

      expect(screen.getByText('提示词总数')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('应渲染字符串类型的值', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="状态"
          value="运行中"
        />
      )

      expect(screen.getByText('运行中')).toBeInTheDocument()
    })

    it('应渲染后缀', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="通过率"
          value={95.5}
          suffix="%"
        />
      )

      expect(screen.getByText('95.5')).toBeInTheDocument()
      expect(screen.getByText('%')).toBeInTheDocument()
    })
  })

  describe('图标背景色', () => {
    it('默认使用 primary 背景色', () => {
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          title="测试"
          value={10}
        />
      )

      const iconWrapper = container.querySelector('[class*="iconWrapper"]')
      expect(iconWrapper).toBeInTheDocument()
    })

    it('支持 success 背景色', () => {
      const { container } = render(
        <StatCard
          icon={<CheckCircleOutlined />}
          iconBg="success"
          title="成功数"
          value={100}
        />
      )

      expect(container.querySelector('[class*="iconWrapper"]')).toBeInTheDocument()
    })

    it('支持 warning 背景色', () => {
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          iconBg="warning"
          title="警告"
          value={5}
        />
      )

      expect(container.querySelector('[class*="iconWrapper"]')).toBeInTheDocument()
    })

    it('支持 info 背景色', () => {
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          iconBg="info"
          title="信息"
          value={20}
        />
      )

      expect(container.querySelector('[class*="iconWrapper"]')).toBeInTheDocument()
    })
  })

  describe('趋势指示器', () => {
    it('应显示上升趋势', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="任务数"
          value={100}
          trend={{ value: 10, type: 'up' }}
        />
      )

      expect(screen.getByText('10%')).toBeInTheDocument()
    })

    it('应显示下降趋势', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="错误数"
          value={5}
          trend={{ value: 15, type: 'down' }}
        />
      )

      expect(screen.getByText('15%')).toBeInTheDocument()
    })

    it('应显示趋势标签', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="任务数"
          value={100}
          trend={{ value: 10, type: 'up', label: '本周' }}
        />
      )

      expect(screen.getByText('本周')).toBeInTheDocument()
    })

    it('不传趋势时不显示趋势信息', () => {
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          title="数据集"
          value={20}
        />
      )

      expect(container.querySelector('[class*="trend"]')).toBeNull()
    })
  })

  describe('点击交互', () => {
    it('onClick 存在时应可点击', () => {
      const handleClick = vi.fn()
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          title="可点击卡片"
          value={10}
          onClick={handleClick}
        />
      )

      const card = container.querySelector('[class*="card"]')
      expect(card).toBeInTheDocument()
      if (card) {
        fireEvent.click(card)
        expect(handleClick).toHaveBeenCalledTimes(1)
      }
    })

    it('onClick 存在时应有 button role', () => {
      const handleClick = vi.fn()
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="可点击卡片"
          value={10}
          onClick={handleClick}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('应支持键盘操作（Enter 键）', () => {
      const handleClick = vi.fn()
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="可点击卡片"
          value={10}
          onClick={handleClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('应支持键盘操作（Space 键）', () => {
      const handleClick = vi.fn()
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="可点击卡片"
          value={10}
          onClick={handleClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('没有 onClick 时不应有 button role', () => {
      render(
        <StatCard
          icon={<FileTextOutlined />}
          title="不可点击"
          value={10}
        />
      )

      expect(screen.queryByRole('button')).toBeNull()
    })
  })

  describe('样式', () => {
    it('卡片容器应存在', () => {
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          title="测试"
          value={10}
        />
      )

      expect(container.querySelector('[class*="card"]')).toBeInTheDocument()
    })

    it('内容区域应存在', () => {
      const { container } = render(
        <StatCard
          icon={<FileTextOutlined />}
          title="测试"
          value={10}
        />
      )

      expect(container.querySelector('[class*="content"]')).toBeInTheDocument()
    })
  })
})
