'use client'

import { useState, useMemo } from 'react'
import { Card, Tabs, Spin, Button, Space, Typography } from 'antd'
import {
  ReloadOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  DollarOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { OverviewTab } from './OverviewTab'
import { FailureAnalysisTab } from './FailureAnalysisTab'
import { PerformanceTab } from './PerformanceTab'
import { CostAnalysisTab } from './CostAnalysisTab'
import type { TaskResultData } from './types'

const { Text } = Typography

export type ResultsAnalysisPanelProps = {
  /** 任务 ID */
  taskId: string
  /** 任务名称 */
  taskName?: string
  /** 测试结果列表 */
  results: TaskResultData[]
  /** 是否正在加载 */
  loading?: boolean
  /** 重新分析回调 */
  onReanalyze?: () => void
  /** 导出回调 */
  onExport?: (format: 'csv' | 'json') => void
}

/**
 * 测试结果深度分析面板
 * 整合概览、失败分析、性能分析、成本分析等功能
 */
export function ResultsAnalysisPanel({
  taskId,
  taskName,
  results,
  loading = false,
  onReanalyze,
  onExport,
}: ResultsAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // 计算基础统计
  const stats = useMemo(() => {
    const total = results.length
    const passed = results.filter(r => r.passed).length
    const failed = total - passed
    const passRate = total > 0 ? (passed / total) * 100 : 0

    // 性能指标
    const latencies = results
      .filter(r => r.latency != null)
      .map(r => r.latency!)
      .sort((a, b) => a - b)

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0

    const p50Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.5)]
      : 0

    const p90Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.9)]
      : 0

    const p99Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.99)]
      : 0

    // 成本指标
    const totalInputTokens = results.reduce((sum, r) => sum + (r.inputTokens || 0), 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + (r.outputTokens || 0), 0)
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0)
    const avgCost = total > 0 ? totalCost / total : 0

    return {
      total,
      passed,
      failed,
      passRate,
      avgLatency,
      p50Latency,
      p90Latency,
      p99Latency,
      latencies,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      avgCost,
    }
  }, [results])

  // 失败的结果
  const failedResults = useMemo(
    () => results.filter(r => !r.passed),
    [results]
  )

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在加载分析数据...</Text>
          </div>
        </div>
      </Card>
    )
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <Space>
          <DashboardOutlined />
          概览
        </Space>
      ),
      children: (
        <OverviewTab
          stats={stats}
          results={results}
          failedResults={failedResults}
        />
      ),
    },
    {
      key: 'failure',
      label: (
        <Space>
          <ExperimentOutlined />
          失败分析
          {stats.failed > 0 && (
            <span style={{ color: '#ff4d4f' }}>({stats.failed})</span>
          )}
        </Space>
      ),
      children: (
        <FailureAnalysisTab
          results={results}
          failedResults={failedResults}
        />
      ),
    },
    {
      key: 'performance',
      label: (
        <Space>
          <BarChartOutlined />
          性能分析
        </Space>
      ),
      children: (
        <PerformanceTab
          results={results}
          stats={stats}
        />
      ),
    },
    {
      key: 'cost',
      label: (
        <Space>
          <DollarOutlined />
          成本分析
        </Space>
      ),
      children: (
        <CostAnalysisTab
          results={results}
          stats={stats}
        />
      ),
    },
  ]

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>结果分析</span>
          {taskName && <Text type="secondary">- {taskName}</Text>}
        </Space>
      }
      extra={
        <Space>
          {onExport && (
            <Button
              icon={<ExportOutlined />}
              onClick={() => onExport('csv')}
            >
              导出
            </Button>
          )}
          {onReanalyze && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onReanalyze}
            >
              刷新
            </Button>
          )}
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </Card>
  )
}
