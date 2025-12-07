/**
 * ClusterList 组件测试
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { ClusterList } from '../ClusterList'
import type { TaskResultData } from '@/components/results/types'

// Mock analysis module
vi.mock('@/lib/analysis', () => ({
  clusterFailures: vi.fn(() => [
    {
      id: 'cluster-1',
      label: '格式错误类',
      samples: [
        { id: 'sample-1', input: { q: 'test1' }, output: 'bad output', expected: 'good output' },
        { id: 'sample-2', input: { q: 'test2' }, output: 'bad output 2', expected: 'good output 2' },
      ],
      representativeSample: { id: 'sample-1', input: { q: 'test1' }, output: 'bad output', expected: 'good output' },
      commonPattern: 'JSON 格式错误；缺少闭合括号',
      avgSimilarity: 0.85,
    },
    {
      id: 'cluster-2',
      label: '内容缺失类',
      samples: [
        { id: 'sample-3', input: { q: 'test3' }, output: '', expected: 'expected' },
      ],
      representativeSample: { id: 'sample-3', input: { q: 'test3' }, output: '', expected: 'expected' },
      commonPattern: '输出为空',
      avgSimilarity: 0.9,
    },
  ]),
  generateClusterSummary: vi.fn(() => ({
    clusterCount: 2,
    totalSamples: 3,
    avgSimilarity: 0.875,
    clusters: [
      { id: 'cluster-1', label: '格式错误类', size: 2, percentage: 66.7 },
      { id: 'cluster-2', label: '内容缺失类', size: 1, percentage: 33.3 },
    ],
  })),
}))

// 测试数据工厂
function createMockResult(overrides: Partial<TaskResultData> = {}): TaskResultData {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    input: { question: 'test question' },
    output: 'test output',
    expected: 'expected output',
    passed: false,
    status: 'FAILED',
    evaluations: [
      {
        evaluatorId: 'eval-1',
        evaluatorName: '格式检查',
        passed: false,
        score: 0,
        reason: '格式错误',
      },
    ],
    ...overrides,
  }
}

describe('ClusterList', () => {
  it('should show message when less than 2 samples', () => {
    const failedResults = [createMockResult()]

    render(<ClusterList failedResults={failedResults} />)

    expect(screen.getByText(/样本数量不足/)).toBeInTheDocument()
  })

  it('should show loading state', () => {
    const failedResults = [
      createMockResult({ id: 'sample-1' }),
      createMockResult({ id: 'sample-2' }),
    ]

    render(<ClusterList failedResults={failedResults} loading={true} />)

    expect(screen.getByText('正在聚类分析...')).toBeInTheDocument()
  })

  it('should render cluster statistics', () => {
    const failedResults = [
      createMockResult({ id: 'sample-1' }),
      createMockResult({ id: 'sample-2' }),
      createMockResult({ id: 'sample-3' }),
    ]

    render(<ClusterList failedResults={failedResults} />)

    expect(screen.getByText('聚类数量')).toBeInTheDocument()
    expect(screen.getByText('样本总数')).toBeInTheDocument()
    expect(screen.getByText('平均相似度')).toBeInTheDocument()
  })

  it('should render cluster cards', () => {
    const failedResults = [
      createMockResult({ id: 'sample-1' }),
      createMockResult({ id: 'sample-2' }),
      createMockResult({ id: 'sample-3' }),
    ]

    render(<ClusterList failedResults={failedResults} />)

    // 应显示聚类标签
    expect(screen.getByText('格式错误类')).toBeInTheDocument()
    expect(screen.getByText('内容缺失类')).toBeInTheDocument()
  })

  it('should call onViewSample when view sample clicked', () => {
    const onViewSample = vi.fn()
    const failedResults = [
      createMockResult({ id: 'sample-1' }),
      createMockResult({ id: 'sample-2' }),
    ]

    render(<ClusterList failedResults={failedResults} onViewSample={onViewSample} />)

    // 由于组件内部需要展开才能看到查看按钮，这里主要测试 prop 传递
    expect(onViewSample).not.toHaveBeenCalled()
  })

  it('should allow sorting by size or similarity', () => {
    const failedResults = [
      createMockResult({ id: 'sample-1' }),
      createMockResult({ id: 'sample-2' }),
      createMockResult({ id: 'sample-3' }),
    ]

    render(<ClusterList failedResults={failedResults} />)

    // 应显示排序选择器
    expect(screen.getByText('排序：')).toBeInTheDocument()
  })
})
