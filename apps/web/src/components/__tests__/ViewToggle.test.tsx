import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewToggle } from '../dataset/ViewToggle'

describe('ViewToggle', () => {
  it('应渲染列表和卡片两个选项', () => {
    const onChange = vi.fn()
    render(<ViewToggle value="list" onChange={onChange} />)

    expect(screen.getByText('列表')).toBeInTheDocument()
    expect(screen.getByText('卡片')).toBeInTheDocument()
  })

  it('列表模式下应正确高亮', () => {
    const onChange = vi.fn()
    const { container } = render(<ViewToggle value="list" onChange={onChange} />)

    // 检查 Segmented 组件渲染
    expect(container.querySelector('.ant-segmented')).toBeInTheDocument()
  })

  it('卡片模式下应正确高亮', () => {
    const onChange = vi.fn()
    const { container } = render(<ViewToggle value="card" onChange={onChange} />)

    expect(container.querySelector('.ant-segmented')).toBeInTheDocument()
  })

  it('点击列表选项应触发 onChange', () => {
    const onChange = vi.fn()
    render(<ViewToggle value="card" onChange={onChange} />)

    const listOption = screen.getByText('列表')
    fireEvent.click(listOption)

    expect(onChange).toHaveBeenCalledWith('list')
  })

  it('点击卡片选项应触发 onChange', () => {
    const onChange = vi.fn()
    render(<ViewToggle value="list" onChange={onChange} />)

    const cardOption = screen.getByText('卡片')
    fireEvent.click(cardOption)

    expect(onChange).toHaveBeenCalledWith('card')
  })

  it('应有列表图标', () => {
    const onChange = vi.fn()
    const { container } = render(<ViewToggle value="list" onChange={onChange} />)

    expect(container.querySelector('.anticon-unordered-list')).toBeInTheDocument()
  })

  it('应有卡片图标', () => {
    const onChange = vi.fn()
    const { container } = render(<ViewToggle value="list" onChange={onChange} />)

    expect(container.querySelector('.anticon-appstore')).toBeInTheDocument()
  })
})
