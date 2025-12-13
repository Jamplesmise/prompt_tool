/**
 * FailureRecovery 组件测试
 *
 * 测试用例：
 * TC-FR-001: 失败信息显示
 * TC-FR-002: 恢复选项
 * TC-FR-003: 用户输入
 * TC-FR-004: 回滚信息
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './helpers/renderWithProviders'
import { FailureRecovery, FailureBanner } from '../FailureRecovery'
import type { FailureReport, RecoverySelection } from '@platform/shared'

describe('FailureRecovery', () => {
  const mockOnRecover = vi.fn(() => Promise.resolve())
  const mockOnClose = vi.fn()

  const baseReport: FailureReport = {
    id: 'failure-1',
    sessionId: 'session-1',
    location: {
      todoItem: '创建用户',
      phase: '执行阶段',
      progress: '2/5',
    },
    reason: {
      summary: '网络连接超时',
      possibleCauses: ['服务器响应慢', '网络不稳定', '请求被拦截'],
      technicalDetails: 'Error: ETIMEDOUT',
    },
    rollback: {
      executed: true,
      actions: ['撤销表单提交', '恢复原始数据'],
      restoredTo: '步骤 1 完成后',
    },
    suggestions: [
      {
        id: 'retry',
        action: 'retry',
        label: '重试',
        description: '重新执行当前步骤',
        recommended: true,
      },
      {
        id: 'skip',
        action: 'skip',
        label: '跳过',
        description: '跳过当前步骤继续执行',
      },
      {
        id: 'modify',
        action: 'modify',
        label: '修改参数',
        description: '修改参数后重试',
        requiresInput: true,
        inputPrompt: '请输入新的参数',
      },
      {
        id: 'abort',
        action: 'abort',
        label: '中止',
        description: '停止执行',
        disabled: false,
      },
    ],
    timestamp: new Date(),
  } as unknown as FailureReport

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-FR-001: 失败信息显示', () => {
    it('显示对话框标题', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('任务执行失败')).toBeInTheDocument()
    })

    it('显示失败位置', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('失败位置')).toBeInTheDocument()
      expect(screen.getByText('创建用户')).toBeInTheDocument()
    })

    it('显示失败原因', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('失败原因')).toBeInTheDocument()
      expect(screen.getByText('网络连接超时')).toBeInTheDocument()
    })

    it('显示可能的原因列表', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('服务器响应慢')).toBeInTheDocument()
      expect(screen.getByText('网络不稳定')).toBeInTheDocument()
    })
  })

  describe('TC-FR-002: 恢复选项', () => {
    it('显示所有恢复选项', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('重试')).toBeInTheDocument()
      expect(screen.getByText('跳过')).toBeInTheDocument()
      expect(screen.getByText('修改参数')).toBeInTheDocument()
      expect(screen.getByText('中止')).toBeInTheDocument()
    })

    it('显示推荐标签', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('推荐')).toBeInTheDocument()
    })

    it('选择选项后高亮显示', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('重试'))

      // 按钮应该变成 primary 类型
      const retryButton = screen.getByText('重试').closest('button')
      expect(retryButton).toHaveClass('ant-btn-primary')
    })

    it('点击确认执行调用 onRecover', async () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('重试'))
      fireEvent.click(screen.getByText('确认执行'))

      await waitFor(() => {
        expect(mockOnRecover).toHaveBeenCalledWith(
          expect.objectContaining({
            optionId: 'retry',
            action: 'retry',
          })
        )
      })
    })
  })

  describe('TC-FR-003: 用户输入', () => {
    it('选择需要输入的选项时显示输入框', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('修改参数'))

      expect(screen.getByText('请输入新的参数')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入...')).toBeInTheDocument()
    })

    it('未输入内容时禁用确认按钮', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('修改参数'))

      const confirmButton = screen.getByText('确认执行').closest('button')
      expect(confirmButton).toBeDisabled()
    })

    it('输入内容后启用确认按钮', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('修改参数'))
      fireEvent.change(screen.getByPlaceholderText('请输入...'), {
        target: { value: '新参数值' },
      })

      const confirmButton = screen.getByText('确认执行').closest('button')
      expect(confirmButton).not.toBeDisabled()
    })
  })

  describe('TC-FR-004: 回滚信息', () => {
    it('显示已执行的回滚操作', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('已执行的回滚')).toBeInTheDocument()
      expect(screen.getByText('撤销表单提交')).toBeInTheDocument()
      expect(screen.getByText('恢复原始数据')).toBeInTheDocument()
    })

    it('显示恢复到的状态', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/状态已恢复到.*步骤 1 完成后/)).toBeInTheDocument()
    })

    it('无回滚时不显示回滚信息', () => {
      const reportNoRollback = {
        ...baseReport,
        rollback: { executed: false, actions: [], restoredTo: '' },
      }

      renderWithProviders(
        <FailureRecovery
          open={true}
          report={reportNoRollback as unknown as FailureReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByText('已执行的回滚')).not.toBeInTheDocument()
    })
  })

  describe('技术详情', () => {
    it('显示技术详情折叠面板', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('技术详情')).toBeInTheDocument()
    })

    it('展开后显示详细错误信息', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('技术详情'))

      expect(screen.getByText('Error: ETIMEDOUT')).toBeInTheDocument()
    })
  })

  describe('关闭操作', () => {
    it('点击稍后处理关闭对话框', () => {
      renderWithProviders(
        <FailureRecovery
          open={true}
          report={baseReport}
          onRecover={mockOnRecover}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('稍后处理'))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})

describe('FailureBanner', () => {
  const mockOnViewDetails = vi.fn()
  const mockOnQuickRetry = vi.fn()

  const baseReport: FailureReport = {
    id: 'failure-1',
    location: { todoItem: '创建用户' },
    reason: { summary: '网络连接超时' },
  } as unknown as FailureReport

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('显示失败提示条', () => {
    renderWithProviders(
      <FailureBanner
        report={baseReport}
        onViewDetails={mockOnViewDetails}
      />
    )

    expect(screen.getByText('任务执行失败')).toBeInTheDocument()
    // "创建用户" is wrapped with "- " prefix in the Typography component
    expect(screen.getByText(/创建用户/)).toBeInTheDocument()
    expect(screen.getByText('网络连接超时')).toBeInTheDocument()
  })

  it('点击查看详情', () => {
    renderWithProviders(
      <FailureBanner
        report={baseReport}
        onViewDetails={mockOnViewDetails}
      />
    )

    fireEvent.click(screen.getByText('查看详情'))

    expect(mockOnViewDetails).toHaveBeenCalled()
  })

  it('显示快速重试按钮', () => {
    renderWithProviders(
      <FailureBanner
        report={baseReport}
        onViewDetails={mockOnViewDetails}
        onQuickRetry={mockOnQuickRetry}
      />
    )

    // Ant Design Button adds space between Chinese characters
    expect(screen.getByRole('button', { name: /重.*试/ })).toBeInTheDocument()
  })

  it('点击快速重试', () => {
    renderWithProviders(
      <FailureBanner
        report={baseReport}
        onViewDetails={mockOnViewDetails}
        onQuickRetry={mockOnQuickRetry}
      />
    )

    // Ant Design Button adds space between Chinese characters
    fireEvent.click(screen.getByRole('button', { name: /重.*试/ }))

    expect(mockOnQuickRetry).toHaveBeenCalled()
  })
})
