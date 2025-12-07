import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptPreviewCard } from '../PromptPreviewCard'

describe('PromptPreviewCard', () => {
  const defaultProps = {
    id: 'prompt-1',
    name: '测试提示词',
    version: 1,
    tags: ['生产', '测试'],
    systemPrompt: '你是一个有帮助的AI助手。',
    userPromptTemplate: '用户问题: {{question}}',
    variables: ['question', 'context'],
    defaultModel: 'gpt-4',
    createdBy: '张三',
    updatedAt: '2024-01-01T10:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('加载状态', () => {
    it('loading 为 true 时应显示骨架屏', () => {
      render(<PromptPreviewCard {...defaultProps} loading={true} />)

      expect(document.querySelector('.ant-skeleton')).toBeInTheDocument()
    })
  })

  describe('基本渲染', () => {
    it('应显示提示词名称', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('测试提示词')).toBeInTheDocument()
    })

    it('应显示版本号', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('v1')).toBeInTheDocument()
    })

    it('应显示标签', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('生产')).toBeInTheDocument()
      expect(screen.getByText('测试')).toBeInTheDocument()
    })

    it('应显示 System Prompt', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('System Prompt:')).toBeInTheDocument()
      expect(screen.getByText('你是一个有帮助的AI助手。')).toBeInTheDocument()
    })

    it('应显示变量', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('变量:')).toBeInTheDocument()
      expect(screen.getByText('{{question}}')).toBeInTheDocument()
      expect(screen.getByText('{{context}}')).toBeInTheDocument()
    })

    it('无变量时应显示"无"', () => {
      render(<PromptPreviewCard {...defaultProps} variables={[]} />)

      expect(screen.getByText('无')).toBeInTheDocument()
    })

    it('应显示默认模型', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('模型:')).toBeInTheDocument()
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    it('无默认模型时不应显示模型区域', () => {
      render(<PromptPreviewCard {...defaultProps} defaultModel={undefined} />)

      expect(screen.queryByText('模型:')).not.toBeInTheDocument()
    })

    it('应显示创建者', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('创建者: 张三')).toBeInTheDocument()
    })

    it('应显示更新时间', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText(/更新时间:/)).toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('应显示查看详情按钮', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('查看详情')).toBeInTheDocument()
    })

    it('应显示立即测试按钮', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(screen.getByText('立即测试')).toBeInTheDocument()
    })

    it('点击查看详情应触发 onViewDetail', () => {
      const handleViewDetail = vi.fn()
      render(<PromptPreviewCard {...defaultProps} onViewDetail={handleViewDetail} />)

      fireEvent.click(screen.getByText('查看详情'))

      expect(handleViewDetail).toHaveBeenCalledTimes(1)
    })

    it('点击立即测试应触发 onTest', () => {
      const handleTest = vi.fn()
      render(<PromptPreviewCard {...defaultProps} onTest={handleTest} />)

      fireEvent.click(screen.getByText('立即测试'))

      expect(handleTest).toHaveBeenCalledTimes(1)
    })
  })

  describe('关闭功能', () => {
    it('应显示关闭按钮', () => {
      render(<PromptPreviewCard {...defaultProps} />)

      expect(document.querySelector('.anticon-close')).toBeInTheDocument()
    })

    it('点击关闭按钮应触发 onClose', () => {
      const handleClose = vi.fn()
      render(<PromptPreviewCard {...defaultProps} onClose={handleClose} />)

      const closeButton = document.querySelector('.anticon-close')?.closest('button')
      fireEvent.click(closeButton!)

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('点击遮罩层应触发 onClose', () => {
      const handleClose = vi.fn()
      const { container } = render(
        <PromptPreviewCard {...defaultProps} onClose={handleClose} />
      )

      // 遮罩层是第一个 div（position: fixed, background: rgba...）
      const overlay = container.querySelector('div[style*="rgba(0, 0, 0"]')
      fireEvent.click(overlay!)

      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('空 System Prompt', () => {
    it('空 System Prompt 应显示占位符', () => {
      render(<PromptPreviewCard {...defaultProps} systemPrompt="" />)

      expect(screen.getByText('(空)')).toBeInTheDocument()
    })
  })
})
