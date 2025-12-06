import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoadingState, ErrorState, EmptyState } from '../common/PageStates'

describe('LoadingState', () => {
  it('应渲染加载状态', () => {
    render(<LoadingState />)
    // Spin 组件会添加 ant-spin 类
    expect(document.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('应显示提示文字', () => {
    render(<LoadingState tip="正在加载数据..." />)
    expect(screen.getByText('正在加载数据...')).toBeInTheDocument()
  })

  it('没有提示文字时不应渲染额外元素', () => {
    const { container } = render(<LoadingState />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('应渲染错误状态', () => {
    render(<ErrorState />)
    expect(screen.getByText('出错了')).toBeInTheDocument()
  })

  it('应显示默认错误消息', () => {
    render(<ErrorState />)
    expect(screen.getByText('加载失败，请稍后重试')).toBeInTheDocument()
  })

  it('应显示自定义错误消息', () => {
    render(<ErrorState message="网络连接失败" />)
    expect(screen.getByText('网络连接失败')).toBeInTheDocument()
  })

  it('有重试回调时应显示重试按钮', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /重试/ })
    expect(retryButton).toBeInTheDocument()
  })

  it('点击重试按钮应调用回调', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /重试/ })
    fireEvent.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('没有重试回调时不显示重试按钮', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button', { name: /重试/ })).toBeNull()
  })
})

describe('EmptyState', () => {
  it('应渲染空状态', () => {
    render(<EmptyState />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('应显示自定义描述', () => {
    render(<EmptyState description="没有找到匹配的结果" />)
    expect(screen.getByText('没有找到匹配的结果')).toBeInTheDocument()
  })

  it('有操作按钮时应显示按钮', () => {
    const onAction = vi.fn()
    render(<EmptyState actionText="新建" onAction={onAction} />)

    // Ant Design 的 Button 可能会在文本中插入空格，使用正则匹配
    const actionButton = screen.getByRole('button', { name: /新.*建/ })
    expect(actionButton).toBeInTheDocument()
  })

  it('点击操作按钮应调用回调', () => {
    const onAction = vi.fn()
    render(<EmptyState actionText="添加数据" onAction={onAction} />)

    const actionButton = screen.getByRole('button', { name: /添加数据/ })
    fireEvent.click(actionButton)

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('只有 actionText 没有 onAction 时不显示按钮', () => {
    render(<EmptyState actionText="新建" />)
    expect(screen.queryByRole('button', { name: /新.*建/ })).toBeNull()
  })

  it('只有 onAction 没有 actionText 时不显示按钮', () => {
    const onAction = vi.fn()
    render(<EmptyState onAction={onAction} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('children 优先于 actionText 显示', () => {
    const onAction = vi.fn()
    render(
      <EmptyState actionText="新建" onAction={onAction}>
        <div>自定义内容</div>
      </EmptyState>
    )

    expect(screen.getByText('自定义内容')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /新.*建/ })).toBeNull()
  })
})
