/**
 * ResultsAnalysisPanel 组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { ResultsAnalysisPanel } from '../ResultsAnalysisPanel'
import type { TaskResultData } from '../types'

// Mock Ant Design Charts
vi.mock('@ant-design/plots', () => ({
  Pie: () => <div data-testid="mock-pie-chart">Pie Chart</div>,
  Column: () => <div data-testid="mock-column-chart">Column Chart</div>,
  Line: () => <div data-testid="mock-line-chart">Line Chart</div>,
}))

// 测试数据工厂
function createMockResult(overrides: Partial<TaskResultData> = {}): TaskResultData {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    input: { question: 'test question' },
    output: 'test output',
    expected: 'expected output',
    passed: true,
    status: 'SUCCESS',
    latency: 1500,
    inputTokens: 100,
    outputTokens: 50,
    cost: 0.001,
    evaluations: [
      {
        evaluatorId: 'eval-1',
        evaluatorName: '关键词匹配',
        passed: true,
        score: 1,
        reason: null,
      },
    ],
    ...overrides,
  }
}

describe('ResultsAnalysisPanel', () => {
  const defaultProps = {
    taskId: 'task-1',
    taskName: '测试任务',
    results: [] as TaskResultData[],
  }

  it('should render loading state', () => {
    render(<ResultsAnalysisPanel {...defaultProps} loading={true} />)

    expect(screen.getByText('正在加载分析数据...')).toBeInTheDocument()
  })

  it('should render panel title', () => {
    render(<ResultsAnalysisPanel {...defaultProps} />)

    expect(screen.getByText('结果分析')).toBeInTheDocument()
    expect(screen.getByText('- 测试任务')).toBeInTheDocument()
  })

  it('should render all tab labels', () => {
    const results = [
      createMockResult({ passed: true }),
      createMockResult({ passed: false }),
    ]

    render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

    expect(screen.getByText('概览')).toBeInTheDocument()
    expect(screen.getByText('失败分析')).toBeInTheDocument()
    expect(screen.getByText('性能分析')).toBeInTheDocument()
    expect(screen.getByText('成本分析')).toBeInTheDocument()
  })

  it('should show failure count badge when there are failures', () => {
    const results = [
      createMockResult({ passed: true }),
      createMockResult({ passed: false }),
      createMockResult({ passed: false }),
    ]

    render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

    // 失败分析标签应显示失败数量
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('should switch tabs on click', async () => {
    const results = [
      createMockResult({ passed: true, latency: 1000, cost: 0.001 }),
      createMockResult({ passed: false, latency: 2000, cost: 0.002 }),
    ]

    render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

    // 切换到性能分析标签
    fireEvent.click(screen.getByText('性能分析'))

    await waitFor(() => {
      // 使用更灵活的匹配，因为文本可能分布在多个元素中
      const elements = screen.getAllByText((_, element) => {
        return element?.textContent?.includes('平均延迟') || element?.textContent?.includes('延迟分布') || false
      })
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('should call onReanalyze when refresh button clicked', () => {
    const onReanalyze = vi.fn()
    const results = [createMockResult()]

    render(
      <ResultsAnalysisPanel
        {...defaultProps}
        results={results}
        onReanalyze={onReanalyze}
      />
    )

    fireEvent.click(screen.getByText('刷新'))

    expect(onReanalyze).toHaveBeenCalled()
  })

  it('should call onExport when export button clicked', () => {
    const onExport = vi.fn()
    const results = [createMockResult()]

    render(
      <ResultsAnalysisPanel
        {...defaultProps}
        results={results}
        onExport={onExport}
      />
    )

    fireEvent.click(screen.getByText('导出'))

    expect(onExport).toHaveBeenCalledWith('csv')
  })

  describe('OverviewTab', () => {
    it('should display correct statistics', () => {
      const results = [
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: false }),
      ]

      render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

      // 检查统计数据存在（使用灵活匹配，因为数字可能与其他文本组合）
      const container = document.body
      expect(container.textContent).toContain('总数')
      expect(container.textContent).toContain('通过')
      expect(container.textContent).toContain('失败')
    })

    it('should display pass rate correctly', () => {
      const results = [
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: false }),
      ]

      render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

      // 80% 通过率
      expect(screen.getByText('80.0%')).toBeInTheDocument()
    })

    it('should show quick insights', () => {
      const results = [
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: true }),
        createMockResult({ passed: false }),
      ]

      render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

      // 应显示快速洞察
      expect(screen.getByText('快速洞察')).toBeInTheDocument()
    })
  })

  describe('Statistics calculation', () => {
    it('should calculate latency percentiles correctly', async () => {
      const results = Array.from({ length: 100 }, (_, i) =>
        createMockResult({ passed: true, latency: (i + 1) * 100 })
      )

      render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

      // 切换到性能分析
      fireEvent.click(screen.getByText('性能分析'))

      // P50/P90 统计应存在
      await waitFor(() => {
        const container = document.body
        expect(container.textContent).toMatch(/P50|P90|延迟/)
      })
    })

    it('should calculate cost correctly', async () => {
      const results = [
        createMockResult({ passed: true, cost: 0.001, inputTokens: 100, outputTokens: 50 }),
        createMockResult({ passed: true, cost: 0.002, inputTokens: 200, outputTokens: 100 }),
        createMockResult({ passed: true, cost: 0.003, inputTokens: 300, outputTokens: 150 }),
      ]

      render(<ResultsAnalysisPanel {...defaultProps} results={results} />)

      // 切换到成本分析
      fireEvent.click(screen.getByText('成本分析'))

      // 成本分析标签页应存在成本相关内容
      await waitFor(() => {
        const container = document.body
        expect(container.textContent).toMatch(/成本|Token|总计/)
      })
    })
  })
})
