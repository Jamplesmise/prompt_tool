import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickTest } from '../QuickTest'
import type { PromptVariable } from '@platform/shared'
import type { TestPromptResult } from '@/services/prompts'

describe('QuickTest', () => {
  const mockVariables: PromptVariable[] = [
    { name: 'name', type: 'string', required: true, defaultValue: '' },
    { name: 'age', type: 'number', required: false, defaultValue: '18' },
  ]

  const mockModels = [
    { id: 'model-1', name: 'GPT-4', provider: { name: 'OpenAI' } },
    { id: 'model-2', name: 'Claude-3', provider: { name: 'Anthropic' } },
  ]

  const mockTestResult: TestPromptResult = {
    success: true,
    output: '测试输出结果',
    latencyMs: 1234,
    tokens: { input: 100, output: 50 },
  }

  const defaultProps = {
    variables: mockVariables,
    models: mockModels,
    onTest: vi.fn().mockResolvedValue(mockTestResult),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应正确渲染卡片标题', () => {
      render(<QuickTest {...defaultProps} />)
      expect(screen.getByText('快速测试')).toBeInTheDocument()
    })

    it('应显示模型选择下拉框', () => {
      render(<QuickTest {...defaultProps} />)
      expect(screen.getByText('选择模型')).toBeInTheDocument()
    })

    it('应显示运行测试按钮', () => {
      render(<QuickTest {...defaultProps} />)
      expect(screen.getByRole('button', { name: /运行测试/i })).toBeInTheDocument()
    })

    it('应显示变量输入框', () => {
      render(<QuickTest {...defaultProps} />)
      expect(screen.getByText('变量值')).toBeInTheDocument()
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('age')).toBeInTheDocument()
    })

    it('无变量时不显示变量区域', () => {
      render(<QuickTest {...defaultProps} variables={[]} />)
      expect(screen.queryByText('变量值')).not.toBeInTheDocument()
    })
  })

  describe('模型选择', () => {
    it('加载中应显示加载状态', () => {
      render(<QuickTest {...defaultProps} modelsLoading />)
      const combobox = screen.getByRole('combobox')
      expect(combobox.closest('.ant-select')).toHaveClass('ant-select-loading')
    })

    it('应显示模型列表', async () => {
      const user = userEvent.setup()
      render(<QuickTest {...defaultProps} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      await waitFor(() => {
        expect(screen.getByText('GPT-4 (OpenAI)')).toBeInTheDocument()
        expect(screen.getByText('Claude-3 (Anthropic)')).toBeInTheDocument()
      })
    })
  })

  describe('变量输入', () => {
    it('应显示变量默认值', () => {
      render(<QuickTest {...defaultProps} />)
      const ageInput = screen.getByPlaceholderText('输入 age 的值')
      expect(ageInput).toHaveValue('18')
    })

    it('必填变量应有必填标记', () => {
      render(<QuickTest {...defaultProps} />)
      // Ant Design 的必填标记
      const nameLabel = screen.getByText('name')
      expect(nameLabel.closest('.ant-form-item-required')).toBeInTheDocument()
    })
  })

  describe('测试执行', () => {
    it('未选择模型时不应执行测试', async () => {
      const user = userEvent.setup()
      const onTest = vi.fn()
      render(<QuickTest {...defaultProps} onTest={onTest} />)

      const submitButton = screen.getByRole('button', { name: /运行测试/i })
      await user.click(submitButton)

      expect(onTest).not.toHaveBeenCalled()
    })

    it('选择模型后应能执行测试', async () => {
      const user = userEvent.setup()
      const onTest = vi.fn().mockResolvedValue(mockTestResult)
      render(<QuickTest {...defaultProps} onTest={onTest} />)

      // 选择模型
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await waitFor(() => {
        const option = screen.getByText('GPT-4 (OpenAI)')
        user.click(option)
      })

      // 填写必填变量
      const nameInput = screen.getByPlaceholderText('输入 name 的值')
      await user.type(nameInput, '张三')

      // 点击测试
      const submitButton = screen.getByRole('button', { name: /运行测试/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onTest).toHaveBeenCalledWith('model-1', expect.objectContaining({ name: '张三' }))
      })
    })
  })

  describe('测试结果展示', () => {
    it('成功时应显示结果统计', async () => {
      const user = userEvent.setup()
      render(<QuickTest {...defaultProps} />)

      // 选择模型
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await waitFor(async () => {
        const option = screen.getByText('GPT-4 (OpenAI)')
        await user.click(option)
      })

      // 填写变量并测试
      const nameInput = screen.getByPlaceholderText('输入 name 的值')
      await user.type(nameInput, '测试')
      await user.click(screen.getByRole('button', { name: /运行测试/i }))

      await waitFor(() => {
        expect(screen.getByText('延迟')).toBeInTheDocument()
        expect(screen.getByText('1234')).toBeInTheDocument()
        expect(screen.getByText('输入 Token')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('输出 Token')).toBeInTheDocument()
        expect(screen.getByText('50')).toBeInTheDocument()
      })
    })

    it('成功时应显示输出内容', async () => {
      const user = userEvent.setup()
      render(<QuickTest {...defaultProps} />)

      // 选择模型并测试
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await waitFor(async () => {
        await user.click(screen.getByText('GPT-4 (OpenAI)'))
      })
      await user.type(screen.getByPlaceholderText('输入 name 的值'), '测试')
      await user.click(screen.getByRole('button', { name: /运行测试/i }))

      await waitFor(() => {
        expect(screen.getByText('输出结果')).toBeInTheDocument()
        expect(screen.getByDisplayValue('测试输出结果')).toBeInTheDocument()
      })
    })

    it('失败时应显示错误信息', async () => {
      const user = userEvent.setup()
      const failedResult: TestPromptResult = {
        success: false,
        output: '',
        latencyMs: 0,
        error: '模型调用失败',
      }
      render(<QuickTest {...defaultProps} onTest={vi.fn().mockResolvedValue(failedResult)} />)

      // 选择模型并测试
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await waitFor(async () => {
        await user.click(screen.getByText('GPT-4 (OpenAI)'))
      })
      await user.type(screen.getByPlaceholderText('输入 name 的值'), '测试')
      await user.click(screen.getByRole('button', { name: /运行测试/i }))

      await waitFor(() => {
        expect(screen.getByText(/测试失败: 模型调用失败/)).toBeInTheDocument()
      })
    })
  })
})
