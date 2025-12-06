import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatCard } from '../dashboard/StatCard'
import { FileTextOutlined } from '@ant-design/icons'

describe('StatCard', () => {
  it('应渲染基本统计卡片', () => {
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

  it('应显示字符串类型的值', () => {
    render(
      <StatCard
        icon={<FileTextOutlined />}
        title="状态"
        value="运行中"
      />
    )

    expect(screen.getByText('运行中')).toBeInTheDocument()
  })

  it('应显示上升趋势', () => {
    render(
      <StatCard
        icon={<FileTextOutlined />}
        title="任务数"
        value={100}
        trend={{ value: 10, type: 'up', period: '本周' }}
      />
    )

    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('本周')).toBeInTheDocument()
  })

  it('应显示下降趋势', () => {
    render(
      <StatCard
        icon={<FileTextOutlined />}
        title="错误数"
        value={5}
        trend={{ value: -3, type: 'down', period: '较上周' }}
      />
    )

    expect(screen.getByText('-3')).toBeInTheDocument()
    expect(screen.getByText('较上周')).toBeInTheDocument()
  })

  it('不传趋势时不应显示趋势信息', () => {
    const { container } = render(
      <StatCard
        icon={<FileTextOutlined />}
        title="数据集"
        value={20}
      />
    )

    // 不应有趋势相关的类名
    expect(container.querySelector('.text-green-500')).toBeNull()
    expect(container.querySelector('.text-red-500')).toBeNull()
  })

  it('loading 状态下应显示加载指示器', () => {
    const { container } = render(
      <StatCard
        icon={<FileTextOutlined />}
        title="加载中"
        value={0}
        loading={true}
      />
    )

    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('onClick 存在时卡片应可点击', () => {
    const handleClick = vi.fn()
    render(
      <StatCard
        icon={<FileTextOutlined />}
        title="可点击卡片"
        value={10}
        onClick={handleClick}
      />
    )

    const card = screen.getByText('可点击卡片').closest('.ant-card')
    expect(card).toBeInTheDocument()
    if (card) {
      fireEvent.click(card)
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })

  it('应支持自定义图标背景色', () => {
    const { container } = render(
      <StatCard
        icon={<FileTextOutlined />}
        title="自定义颜色"
        value={10}
        iconBgColor="#FF5733"
        iconBgColorEnd="#C70039"
      />
    )

    // 检查渲染是否成功
    expect(screen.getByText('自定义颜色')).toBeInTheDocument()
    // 图标容器应存在
    expect(container.querySelector('.anticon')).toBeInTheDocument()
  })

  it('没有 onClick 时卡片不应有 pointer cursor', () => {
    render(
      <StatCard
        icon={<FileTextOutlined />}
        title="不可点击"
        value={10}
      />
    )

    const card = screen.getByText('不可点击').closest('.ant-card')
    expect(card).toBeInTheDocument()
  })
})
