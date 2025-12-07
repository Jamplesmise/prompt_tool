'use client'

import { useMemo } from 'react'
import { Card, Typography, Space, Empty, Tooltip } from 'antd'
import { LineChartOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'
import type { VersionSnapshot } from '@/components/results/types'
import { calculateTrend } from '@/lib/results'

const { Text } = Typography

type VersionTrendChartProps = {
  snapshots: VersionSnapshot[]
  metric?: 'passRate' | 'avgLatency' | 'avgCost'
  height?: number
  onPointClick?: (snapshot: VersionSnapshot) => void
}

/**
 * 版本趋势图组件
 * 使用纯 CSS 实现简单的折线图
 */
export function VersionTrendChart({
  snapshots,
  metric = 'passRate',
  height = 200,
  onPointClick,
}: VersionTrendChartProps) {
  // 按版本排序
  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => a.version - b.version),
    [snapshots]
  )

  // 获取指标值
  const values = useMemo(
    () => sortedSnapshots.map(s => s.metrics[metric]),
    [sortedSnapshots, metric]
  )

  // 计算最小最大值
  const { minValue, maxValue, range } = useMemo(() => {
    if (values.length === 0) return { minValue: 0, maxValue: 100, range: 100 }

    let min = Math.min(...values)
    let max = Math.max(...values)

    // 为通过率设置 0-100 的范围
    if (metric === 'passRate') {
      min = Math.max(0, min - 10)
      max = Math.min(100, max + 10)
    } else {
      // 其他指标留出 10% 的边距
      const padding = (max - min) * 0.1 || 1
      min = Math.max(0, min - padding)
      max = max + padding
    }

    return { minValue: min, maxValue: max, range: max - min || 1 }
  }, [values, metric])

  // 计算趋势
  const trend = useMemo(
    () => calculateTrend(sortedSnapshots, metric),
    [sortedSnapshots, metric]
  )

  // 格式化指标值
  const formatValue = (value: number): string => {
    if (metric === 'passRate') return `${value.toFixed(1)}%`
    if (metric === 'avgLatency') return `${(value / 1000).toFixed(2)}s`
    if (metric === 'avgCost') return `$${value.toFixed(4)}`
    return String(value)
  }

  // 指标标题
  const metricTitle = {
    passRate: '通过率趋势',
    avgLatency: '延迟趋势',
    avgCost: '成本趋势',
  }[metric]

  // 趋势图标
  const TrendIcon = trend === 'up'
    ? ArrowUpOutlined
    : trend === 'down'
    ? ArrowDownOutlined
    : MinusOutlined

  const trendColor = metric === 'passRate'
    ? (trend === 'up' ? '#52c41a' : trend === 'down' ? '#ff4d4f' : '#8c8c8c')
    : (trend === 'down' ? '#52c41a' : trend === 'up' ? '#ff4d4f' : '#8c8c8c')

  if (snapshots.length === 0) {
    return (
      <Card size="small" title={metricTitle}>
        <Empty description="暂无版本数据" />
      </Card>
    )
  }

  const chartWidth = Math.max(sortedSnapshots.length * 60, 300)
  const chartHeight = height - 60

  return (
    <Card
      size="small"
      title={
        <Space>
          <LineChartOutlined />
          {metricTitle}
        </Space>
      }
      extra={
        <Space>
          <TrendIcon style={{ color: trendColor }} />
          <Text style={{ color: trendColor }}>
            {trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定'}
          </Text>
        </Space>
      }
    >
      <div style={{ overflowX: 'auto' }}>
        <svg width={chartWidth} height={chartHeight + 40} style={{ display: 'block' }}>
          {/* Y 轴刻度线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight * (1 - ratio) + 10
            const value = minValue + range * ratio
            return (
              <g key={i}>
                <line
                  x1={40}
                  y1={y}
                  x2={chartWidth - 10}
                  y2={y}
                  stroke="#f0f0f0"
                  strokeDasharray="4 2"
                />
                <text x={35} y={y + 4} textAnchor="end" fill="#8c8c8c" fontSize={10}>
                  {formatValue(value)}
                </text>
              </g>
            )
          })}

          {/* 折线 */}
          {sortedSnapshots.length > 1 && (
            <polyline
              fill="none"
              stroke="#1890ff"
              strokeWidth={2}
              points={sortedSnapshots
                .map((s, i) => {
                  const x = 50 + (i / (sortedSnapshots.length - 1)) * (chartWidth - 80)
                  const y = chartHeight * (1 - (s.metrics[metric] - minValue) / range) + 10
                  return `${x},${y}`
                })
                .join(' ')}
            />
          )}

          {/* 数据点 */}
          {sortedSnapshots.map((snapshot, i) => {
            const x = sortedSnapshots.length > 1
              ? 50 + (i / (sortedSnapshots.length - 1)) * (chartWidth - 80)
              : chartWidth / 2
            const y = chartHeight * (1 - (snapshot.metrics[metric] - minValue) / range) + 10

            return (
              <g
                key={snapshot.version}
                style={{ cursor: onPointClick ? 'pointer' : 'default' }}
                onClick={() => onPointClick?.(snapshot)}
              >
                {/* 点 */}
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill="#fff"
                  stroke="#1890ff"
                  strokeWidth={2}
                />
                {/* 版本号 */}
                <text
                  x={x}
                  y={chartHeight + 30}
                  textAnchor="middle"
                  fill="#8c8c8c"
                  fontSize={10}
                >
                  v{snapshot.version}
                </text>
                {/* 值（悬停显示） */}
                <title>
                  {`版本 ${snapshot.version}\n${formatValue(snapshot.metrics[metric])}`}
                </title>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 图例 */}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 24 }}>
        <Space size={4}>
          <div style={{ width: 20, height: 2, background: '#1890ff' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>{metricTitle.replace('趋势', '')}</Text>
        </Space>
      </div>
    </Card>
  )
}
