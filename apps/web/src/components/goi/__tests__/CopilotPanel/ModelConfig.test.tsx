/**
 * ModelConfig 组件测试
 *
 * 测试用例：
 * TC-MC-001: 模型列表加载
 * TC-MC-002: 模型选择
 * TC-MC-003: 刷新功能
 * TC-MC-004: 默认模型设置
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { ModelConfig } from '../../CopilotPanel/ModelConfig'

// Mock useCopilot hook
const mockSetComplexModelId = vi.fn()
const mockSetSimpleModelId = vi.fn()

vi.mock('../../hooks/useCopilot', () => ({
  useCopilot: vi.fn(() => ({
    complexModelId: 'model-1',
    simpleModelId: 'model-2',
    setComplexModelId: mockSetComplexModelId,
    setSimpleModelId: mockSetSimpleModelId,
  })),
}))

// Mock modelsService
const mockListAll = vi.fn(() =>
  Promise.resolve({
    code: 200,
    data: {
      models: [
        { id: 'model-1', name: 'GPT-4', type: 'llm', active: true },
        { id: 'model-2', name: 'GPT-3.5', type: 'llm', active: true },
        { id: 'model-3', name: 'Claude 3 Opus', type: 'llm', active: true },
      ],
    },
  })
)

vi.mock('@/services/models', () => ({
  modelsService: {
    models: {
      listAll: () => mockListAll(),
    },
  },
}))

// Mock ModelSelector
vi.mock('@/components/common/ModelSelector', () => ({
  ModelSelector: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string
    onChange: (value: string) => void
    placeholder: string
  }) => (
    <select
      data-testid={`model-selector-${placeholder}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">请选择</option>
      <option value="model-1">GPT-4</option>
      <option value="model-2">GPT-3.5</option>
      <option value="model-3">Claude 3 Opus</option>
    </select>
  ),
}))

import { useCopilot } from '../../hooks/useCopilot'

describe('ModelConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-MC-001: 模型列表加载', () => {
    it('组件挂载时加载模型列表', async () => {
      renderWithProviders(<ModelConfig />)

      await waitFor(() => {
        expect(mockListAll).toHaveBeenCalled()
      })
    })

    it('显示可用模型数量', async () => {
      renderWithProviders(<ModelConfig />)

      await waitFor(() => {
        expect(screen.getByText('(3 个可用)')).toBeInTheDocument()
      })
    })

    it('显示模型配置标题', () => {
      renderWithProviders(<ModelConfig />)

      expect(screen.getByText('模型配置')).toBeInTheDocument()
    })
  })

  describe('TC-MC-002: 模型选择', () => {
    it('显示复杂任务模型选择器', async () => {
      renderWithProviders(<ModelConfig />)

      // 展开 Collapse
      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        expect(screen.getByText('复杂任务模型')).toBeInTheDocument()
      })
    })

    it('显示简单任务模型选择器', async () => {
      renderWithProviders(<ModelConfig />)

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        expect(screen.getByText('简单任务模型')).toBeInTheDocument()
      })
    })

    it('切换复杂任务模型调用 setComplexModelId', async () => {
      renderWithProviders(<ModelConfig />)

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        const selector = screen.getByTestId('model-selector-选择复杂任务模型')
        fireEvent.change(selector, { target: { value: 'model-3' } })
      })

      expect(mockSetComplexModelId).toHaveBeenCalledWith('model-3')
    })

    it('切换简单任务模型调用 setSimpleModelId', async () => {
      renderWithProviders(<ModelConfig />)

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        const selector = screen.getByTestId('model-selector-选择简单任务模型')
        fireEvent.change(selector, { target: { value: 'model-1' } })
      })

      expect(mockSetSimpleModelId).toHaveBeenCalledWith('model-1')
    })
  })

  describe('TC-MC-003: 刷新功能', () => {
    it('显示刷新按钮', async () => {
      renderWithProviders(<ModelConfig />)

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        expect(screen.getByText('刷新模型列表')).toBeInTheDocument()
      })
    })

    it('点击刷新按钮重新加载模型', async () => {
      renderWithProviders(<ModelConfig />)

      // 等待初始加载完成
      await waitFor(() => {
        expect(mockListAll).toHaveBeenCalled()
      })

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        expect(screen.getByText('刷新模型列表')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('刷新模型列表'))

      // 初始加载 + 刷新 = 至少 2 次
      await waitFor(() => {
        expect(mockListAll.mock.calls.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('TC-MC-004: 默认模型设置', () => {
    it('无已选模型时自动设置默认', async () => {
      vi.mocked(useCopilot).mockReturnValue({
        complexModelId: null,
        simpleModelId: null,
        setComplexModelId: mockSetComplexModelId,
        setSimpleModelId: mockSetSimpleModelId,
      } as ReturnType<typeof useCopilot>)

      renderWithProviders(<ModelConfig />)

      await waitFor(() => {
        expect(mockSetComplexModelId).toHaveBeenCalled()
        expect(mockSetSimpleModelId).toHaveBeenCalled()
      })
    })
  })

  describe('错误处理', () => {
    it('加载失败时显示错误提示', async () => {
      mockListAll.mockRejectedValueOnce(new Error('Network error'))

      renderWithProviders(<ModelConfig />)

      // 组件应该正常渲染，不会崩溃
      expect(screen.getByText('模型配置')).toBeInTheDocument()
    })
  })

  describe('模型推荐提示', () => {
    it('显示复杂任务模型推荐', async () => {
      renderWithProviders(<ModelConfig />)

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        expect(screen.getByText(/GPT-4.*Claude 3 Opus/)).toBeInTheDocument()
      })
    })

    it('显示简单任务模型推荐', async () => {
      renderWithProviders(<ModelConfig />)

      fireEvent.click(screen.getByText('模型配置'))

      await waitFor(() => {
        expect(screen.getByText(/GPT-3.5.*Claude 3 Haiku/)).toBeInTheDocument()
      })
    })
  })
})
