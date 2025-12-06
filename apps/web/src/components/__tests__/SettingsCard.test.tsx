import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsCard } from '../settings/SettingsCard'

// Mock CSS module
vi.mock('../settings/SettingsCard.module.css', () => ({
  default: {
    card: 'mock-card',
    header: 'mock-header',
    titleWrapper: 'mock-title-wrapper',
    title: 'mock-title',
    description: 'mock-description',
    extra: 'mock-extra',
    divider: 'mock-divider',
    content: 'mock-content',
  },
}))

describe('SettingsCard', () => {
  it('应渲染标题', () => {
    render(
      <SettingsCard title="通用设置">
        <div>内容</div>
      </SettingsCard>
    )
    expect(screen.getByText('通用设置')).toBeInTheDocument()
  })

  it('应渲染子内容', () => {
    render(
      <SettingsCard title="设置">
        <div>这是设置内容</div>
      </SettingsCard>
    )
    expect(screen.getByText('这是设置内容')).toBeInTheDocument()
  })

  it('有描述时应渲染描述', () => {
    render(
      <SettingsCard title="API 配置" description="配置 API 相关参数">
        <div>内容</div>
      </SettingsCard>
    )
    expect(screen.getByText('配置 API 相关参数')).toBeInTheDocument()
  })

  it('无描述时不应渲染描述元素', () => {
    const { container } = render(
      <SettingsCard title="简单设置">
        <div>内容</div>
      </SettingsCard>
    )
    expect(container.querySelector('.mock-description')).toBeNull()
  })

  it('有 extra 时应渲染额外内容', () => {
    render(
      <SettingsCard title="设置" extra={<button>操作按钮</button>}>
        <div>内容</div>
      </SettingsCard>
    )
    expect(screen.getByText('操作按钮')).toBeInTheDocument()
  })

  it('无 extra 时不应渲染额外内容容器', () => {
    const { container } = render(
      <SettingsCard title="设置">
        <div>内容</div>
      </SettingsCard>
    )
    expect(container.querySelector('.mock-extra')).toBeNull()
  })

  it('应渲染分隔线', () => {
    const { container } = render(
      <SettingsCard title="设置">
        <div>内容</div>
      </SettingsCard>
    )
    expect(container.querySelector('.mock-divider')).toBeInTheDocument()
  })

  it('应使用正确的 CSS 类名', () => {
    const { container } = render(
      <SettingsCard title="设置" description="描述" extra={<span>extra</span>}>
        <div>内容</div>
      </SettingsCard>
    )
    expect(container.querySelector('.mock-card')).toBeInTheDocument()
    expect(container.querySelector('.mock-header')).toBeInTheDocument()
    expect(container.querySelector('.mock-title-wrapper')).toBeInTheDocument()
    expect(container.querySelector('.mock-content')).toBeInTheDocument()
  })

  it('应支持复杂的子内容', () => {
    render(
      <SettingsCard title="高级设置">
        <form>
          <label htmlFor="input">输入框</label>
          <input id="input" type="text" />
          <button type="submit">提交</button>
        </form>
      </SettingsCard>
    )
    expect(screen.getByLabelText('输入框')).toBeInTheDocument()
    expect(screen.getByText('提交')).toBeInTheDocument()
  })
})
