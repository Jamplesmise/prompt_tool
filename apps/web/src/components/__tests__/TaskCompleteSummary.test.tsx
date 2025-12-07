import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCompleteSummary } from '../guidance/TaskCompleteSummary'

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

type TaskResultItem = {
  passed: boolean
  output?: string
  expectedOutput?: string
  evaluatorResults?: Array<{
    evaluatorName: string
    passed: boolean
    reason?: string
  }>
}

describe('TaskCompleteSummary', () => {
  const defaultProps = {
    stats: {
      total: 100,
      passed: 85,
      failed: 15,
    },
    results: [] as TaskResultItem[],
  }

  describe('基础渲染', () => {
    it('应该显示总数、通过数和失败数', () => {
      render(<TaskCompleteSummary {...defaultProps} />)

      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('85')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('应该显示通过率', () => {
      render(<TaskCompleteSummary {...defaultProps} />)

      // 85% 通过率
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('高通过率应该显示"测试表现良好"', () => {
      render(<TaskCompleteSummary {...defaultProps} />)

      expect(screen.getByText('测试表现良好')).toBeInTheDocument()
    })

    it('低通过率应该显示"测试需要优化"', () => {
      render(
        <TaskCompleteSummary
          stats={{ total: 100, passed: 50, failed: 50 }}
          results={[]}
        />
      )

      expect(screen.getByText('测试需要优化')).toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('低通过率时应该显示"查看失败案例"按钮', () => {
      const onViewFailures = vi.fn()
      render(
        <TaskCompleteSummary
          stats={{ total: 100, passed: 50, failed: 50 }}
          results={[]}
          onViewFailures={onViewFailures}
        />
      )

      const button = screen.getByText('查看失败案例')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(onViewFailures).toHaveBeenCalled()
    })

    it('低通过率时应该显示"优化提示词"按钮', () => {
      const onOptimizePrompt = vi.fn()
      render(
        <TaskCompleteSummary
          stats={{ total: 100, passed: 50, failed: 50 }}
          results={[]}
          onOptimizePrompt={onOptimizePrompt}
        />
      )

      const button = screen.getByText('优化提示词')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(onOptimizePrompt).toHaveBeenCalled()
    })

    it('高通过率时应该显示"导出报告"按钮', () => {
      const onExportReport = vi.fn()
      render(
        <TaskCompleteSummary
          {...defaultProps}
          onExportReport={onExportReport}
        />
      )

      const button = screen.getByText('导出报告')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(onExportReport).toHaveBeenCalled()
    })
  })

  describe('失败模式分析', () => {
    it('应该显示失败模式分析当有失败结果时', () => {
      const resultsWithFailures: TaskResultItem[] = [
        {
          passed: false,
          output: 'bad',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 格式错误' }],
        },
        {
          passed: false,
          output: 'wrong',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 解析失败' }],
        },
      ]

      render(
        <TaskCompleteSummary
          stats={{ total: 100, passed: 50, failed: 50 }}
          results={resultsWithFailures}
        />
      )

      // 应该显示失败模式分析部分（在 Collapse 中）
      expect(screen.getByText(/失败模式分析/)).toBeInTheDocument()
    })

    it('不应该显示失败模式分析当没有失败结果时', () => {
      render(
        <TaskCompleteSummary
          stats={{ total: 100, passed: 100, failed: 0 }}
          results={[]}
        />
      )

      // 不应该显示失败模式分析
      expect(screen.queryByText(/失败模式分析/)).not.toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理 0 总数的情况', () => {
      render(
        <TaskCompleteSummary
          stats={{ total: 0, passed: 0, failed: 0 }}
          results={[]}
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('应该处理 100% 通过率', () => {
      render(
        <TaskCompleteSummary
          stats={{ total: 50, passed: 50, failed: 0 }}
          results={[]}
        />
      )

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('测试表现良好')).toBeInTheDocument()
    })

    it('应该处理 0% 通过率', () => {
      render(
        <TaskCompleteSummary
          stats={{ total: 50, passed: 0, failed: 50 }}
          results={[]}
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('测试需要优化')).toBeInTheDocument()
    })
  })
})
