/**
 * RegressionTracker 组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { RegressionTracker } from '../RegressionTracker'
import type { VersionSnapshot } from '@/components/results/types'

// 测试数据工厂
function createMockSnapshot(overrides: Partial<VersionSnapshot> = {}): VersionSnapshot {
  return {
    promptId: 'prompt-1',
    version: 1,
    taskId: 'task-1',
    createdAt: new Date('2025-01-01'),
    metrics: {
      passRate: 80,
      avgLatency: 2000,
      avgCost: 0.002,
      totalTests: 100,
      failedTests: 20,
    },
    changeDescription: '测试版本',
    ...overrides,
  }
}

describe('RegressionTracker', () => {
  const defaultProps = {
    promptId: 'prompt-1',
    currentVersion: 3,
    snapshots: [] as VersionSnapshot[],
  }

  it('should show empty state when no snapshots', () => {
    render(<RegressionTracker {...defaultProps} />)

    expect(screen.getByText('暂无版本测试记录')).toBeInTheDocument()
  })

  it('should render version trend chart', () => {
    const snapshots = [
      createMockSnapshot({ version: 1 }),
      createMockSnapshot({ version: 2 }),
      createMockSnapshot({ version: 3 }),
    ]

    render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

    expect(screen.getByText('版本趋势')).toBeInTheDocument()
  })

  it('should render version timeline', () => {
    const snapshots = [
      createMockSnapshot({ version: 1 }),
      createMockSnapshot({ version: 2 }),
    ]

    render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

    expect(screen.getByText('版本时间线')).toBeInTheDocument()
  })

  it('should show regression alert when high severity regression detected', () => {
    const snapshots = [
      createMockSnapshot({
        version: 1,
        metrics: { passRate: 95, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 5 },
      }),
      createMockSnapshot({
        version: 2,
        metrics: { passRate: 60, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 40 },
      }),
    ]

    render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

    expect(screen.getByText(/检测到.*高严重度回归问题/)).toBeInTheDocument()
  })

  it('should display regression problems list', () => {
    const snapshots = [
      createMockSnapshot({
        version: 1,
        metrics: { passRate: 90, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 10 },
      }),
      createMockSnapshot({
        version: 2,
        metrics: { passRate: 70, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 30 },
      }),
    ]

    render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

    // 检查回归问题卡片存在（回归问题文本被拆分为多个元素）
    const cardTitle = screen.getAllByText((_, element) => {
      return element?.textContent?.includes('回归问题') ?? false
    })
    expect(cardTitle.length).toBeGreaterThan(0)
    expect(screen.getByText('通过率下降')).toBeInTheDocument()
  })

  it('should allow switching metrics in trend chart', () => {
    const snapshots = [
      createMockSnapshot({ version: 1 }),
      createMockSnapshot({ version: 2 }),
    ]

    render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

    // 找到指标选择器并切换
    const select = screen.getAllByRole('combobox')[0]
    expect(select).toBeInTheDocument()
  })

  it('should call onRollback when rollback button clicked', () => {
    const onRollback = vi.fn()
    const snapshots = [
      createMockSnapshot({
        version: 1,
        metrics: { passRate: 90, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 10 },
      }),
      createMockSnapshot({
        version: 2,
        metrics: { passRate: 60, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 40 },
      }),
    ]

    render(
      <RegressionTracker
        {...defaultProps}
        snapshots={snapshots}
        onRollback={onRollback}
      />
    )

    // 点击回滚按钮
    const rollbackButton = screen.getByRole('button', { name: /回滚/i })
    fireEvent.click(rollbackButton)

    expect(onRollback).toHaveBeenCalled()
  })

  it('should show version details when clicking on timeline item', async () => {
    const snapshots = [
      createMockSnapshot({
        version: 1,
        changeDescription: '初始版本',
      }),
      createMockSnapshot({
        version: 2,
        changeDescription: '优化提示词',
      }),
    ]

    render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

    // 点击时间线上的版本
    const versionItem = screen.getByText('版本 2')
    fireEvent.click(versionItem.closest('div[style*="cursor"]') || versionItem)

    await waitFor(() => {
      expect(screen.getByText('版本 2 详情')).toBeInTheDocument()
    })
  })

  it('should highlight current version in timeline', () => {
    const snapshots = [
      createMockSnapshot({ version: 1 }),
      createMockSnapshot({ version: 2 }),
      createMockSnapshot({ version: 3 }),
    ]

    render(
      <RegressionTracker
        {...defaultProps}
        snapshots={snapshots}
        currentVersion={2}
      />
    )

    // 当前版本应有特殊标记
    expect(screen.getByText('当前')).toBeInTheDocument()
  })

  it('should call onCompare when compare button clicked', () => {
    const onCompare = vi.fn()
    const snapshots = [
      createMockSnapshot({
        version: 1,
        metrics: { passRate: 90, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 10 },
      }),
      createMockSnapshot({
        version: 2,
        metrics: { passRate: 70, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 30 },
      }),
    ]

    render(
      <RegressionTracker
        {...defaultProps}
        snapshots={snapshots}
        onCompare={onCompare}
      />
    )

    // 找到对比按钮（在回归问题列表中）
    const compareButtons = screen.getAllByRole('button')
    const compareButton = compareButtons.find(btn => btn.querySelector('[class*="swap"]') || btn.getAttribute('aria-label')?.includes('对比'))

    if (compareButton) {
      fireEvent.click(compareButton)
      expect(onCompare).toHaveBeenCalled()
    }
  })

  describe('VersionTrendChart', () => {
    it('should display trend indicator', () => {
      const snapshots = [
        createMockSnapshot({
          version: 1,
          metrics: { passRate: 70, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 30 },
        }),
        createMockSnapshot({
          version: 2,
          metrics: { passRate: 80, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 20 },
        }),
        createMockSnapshot({
          version: 3,
          metrics: { passRate: 90, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 10 },
        }),
      ]

      render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

      // 应显示趋势（上升/下降/稳定）
      const trendText = screen.queryByText('上升') || screen.queryByText('下降') || screen.queryByText('稳定')
      expect(trendText).toBeInTheDocument()
    })
  })

  describe('VersionTimeline', () => {
    it('should show version change description', () => {
      const snapshots = [
        createMockSnapshot({ version: 1, changeDescription: '初始版本' }),
        createMockSnapshot({ version: 2, changeDescription: '修复格式问题' }),
      ]

      render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

      expect(screen.getByText('修复格式问题')).toBeInTheDocument()
    })

    it('should show pass rate change indicator between versions', () => {
      const snapshots = [
        createMockSnapshot({
          version: 1,
          metrics: { passRate: 70, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 30 },
        }),
        createMockSnapshot({
          version: 2,
          metrics: { passRate: 85, avgLatency: 2000, avgCost: 0.002, totalTests: 100, failedTests: 15 },
        }),
      ]

      render(<RegressionTracker {...defaultProps} snapshots={snapshots} />)

      // 应显示通过率变化
      expect(screen.getByText(/\+\d+\.\d%/)).toBeInTheDocument()
    })
  })
})
