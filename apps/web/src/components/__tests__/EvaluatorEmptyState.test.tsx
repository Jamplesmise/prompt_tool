import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EvaluatorEmptyState } from '../evaluator/EvaluatorEmptyState'

describe('EvaluatorEmptyState', () => {
  it('应显示空状态标题', () => {
    render(<EvaluatorEmptyState />)
    expect(screen.getByText('还没有自定义评估器')).toBeInTheDocument()
  })

  it('应显示引导描述', () => {
    render(<EvaluatorEmptyState />)
    expect(screen.getByText('自定义评估器可以编写代码实现复杂的评估逻辑')).toBeInTheDocument()
  })

  it('应显示支持的评估器类型', () => {
    render(<EvaluatorEmptyState />)
    expect(screen.getByText('支持的评估器类型:')).toBeInTheDocument()
    expect(screen.getByText(/Node.js 代码评估器/)).toBeInTheDocument()
    expect(screen.getByText(/LLM 评估器/)).toBeInTheDocument()
    expect(screen.getByText(/组合评估器/)).toBeInTheDocument()
  })

  it('应显示评估器类型图标', () => {
    render(<EvaluatorEmptyState />)
    // emoji 和文字在同一个元素中，使用正则匹配
    expect(screen.getByText(/💻.*Node\.js/)).toBeInTheDocument()
    expect(screen.getByText(/🤖.*LLM/)).toBeInTheDocument()
    expect(screen.getByText(/🔗.*组合/)).toBeInTheDocument()
  })

  it('应显示工具图标', () => {
    const { container } = render(<EvaluatorEmptyState />)
    expect(container.querySelector('.anticon-tool')).toBeInTheDocument()
  })

  describe('创建按钮', () => {
    it('有 onCreateEvaluator 时应显示创建按钮', () => {
      const onCreateEvaluator = vi.fn()
      render(<EvaluatorEmptyState onCreateEvaluator={onCreateEvaluator} />)
      expect(screen.getByText('创建第一个评估器')).toBeInTheDocument()
    })

    it('点击创建按钮应调用 onCreateEvaluator', () => {
      const onCreateEvaluator = vi.fn()
      render(<EvaluatorEmptyState onCreateEvaluator={onCreateEvaluator} />)

      fireEvent.click(screen.getByText('创建第一个评估器'))
      expect(onCreateEvaluator).toHaveBeenCalledTimes(1)
    })

    it('无 onCreateEvaluator 时不显示创建按钮', () => {
      render(<EvaluatorEmptyState />)
      expect(screen.queryByText('创建第一个评估器')).toBeNull()
    })
  })

  describe('文档链接', () => {
    it('有 onViewDocs 时应显示文档链接', () => {
      const onViewDocs = vi.fn()
      render(<EvaluatorEmptyState onViewDocs={onViewDocs} />)
      expect(screen.getByText('查看代码评估器文档')).toBeInTheDocument()
    })

    it('点击文档链接应调用 onViewDocs', () => {
      const onViewDocs = vi.fn()
      render(<EvaluatorEmptyState onViewDocs={onViewDocs} />)

      fireEvent.click(screen.getByText('查看代码评估器文档'))
      expect(onViewDocs).toHaveBeenCalledTimes(1)
    })

    it('无 onViewDocs 时不显示文档链接', () => {
      render(<EvaluatorEmptyState />)
      expect(screen.queryByText('查看代码评估器文档')).toBeNull()
    })
  })

  it('应支持自定义样式', () => {
    const { container } = render(
      <EvaluatorEmptyState style={{ padding: '100px' }} />
    )
    // 验证组件成功渲染
    expect(container.querySelector('.anticon-tool')).toBeInTheDocument()
  })
})
