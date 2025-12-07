'use client'

import { useMemo } from 'react'
import { Card, Typography, Space, Tag, Tooltip, Statistic, Row, Col } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { HistoryStats, HistoryDataPoint } from '@/services/historyStats'
import type { Anomaly } from '@/lib/analysis/anomalyDetector'
import { getSeverityStyle } from '@/lib/analysis'

const { Text, Title } = Typography

/**
 * 迷你折线图（纯 CSS 实现）
 */
type MiniChartProps = {
  dataPoints: HistoryDataPoint[]
  expectedRange: { min: number; max: number }
  currentValue: number
  width?: number
  height?: number
}

function MiniChart({
  dataPoints,
  expectedRange,
  currentValue,
  width = 200,
  height = 60,
}: MiniChartProps) {
  const chartData = useMemo(() => {
    if (dataPoints.length === 0) return null

    const values = dataPoints.map(p => p.passRate)
    const minValue = Math.min(...values, expectedRange.min)
    const maxValue = Math.max(...values, expectedRange.max)
    const range = maxValue - minValue || 1

    const points = values.map((value, index) => ({
      x: (index / (values.length - 1 || 1)) * width,
      y: height - ((value - minValue) / range) * height,
      value,
    }))

    // 预期范围的 Y 坐标
    const expectedMinY = height - ((expectedRange.min - minValue) / range) * height
    const expectedMaxY = height - ((expectedRange.max - minValue) / range) * height

    // SVG 路径
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    return {
      points,
      expectedMinY,
      expectedMaxY,
      linePath,
      minValue,
      maxValue,
    }
  }, [dataPoints, expectedRange, width, height])

  if (!chartData) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 4,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          暂无数据
        </Text>
      </div>
    )
  }

  const lastPoint = chartData.points[chartData.points.length - 1]
  const isInRange = currentValue >= expectedRange.min && currentValue <= expectedRange.max
  const pointColor = isInRange ? '#52c41a' : '#cf1322'

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* 预期范围阴影区域 */}
      <rect
        x={0}
        y={chartData.expectedMaxY}
        width={width}
        height={chartData.expectedMinY - chartData.expectedMaxY}
        fill="#52c41a"
        opacity={0.1}
      />

      {/* 预期范围边界线 */}
      <line
        x1={0}
        y1={chartData.expectedMinY}
        x2={width}
        y2={chartData.expectedMinY}
        stroke="#52c41a"
        strokeWidth={1}
        strokeDasharray="4 2"
        opacity={0.5}
      />
      <line
        x1={0}
        y1={chartData.expectedMaxY}
        x2={width}
        y2={chartData.expectedMaxY}
        stroke="#52c41a"
        strokeWidth={1}
        strokeDasharray="4 2"
        opacity={0.5}
      />

      {/* 历史趋势线 */}
      <path
        d={chartData.linePath}
        fill="none"
        stroke="#EF4444"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 数据点 */}
      {chartData.points.map((point, index) => (
        <Tooltip
          key={index}
          title={`${dataPoints[index].date}: ${point.value.toFixed(1)}%`}
        >
          <circle
            cx={point.x}
            cy={point.y}
            r={3}
            fill={index === chartData.points.length - 1 ? pointColor : '#EF4444'}
            stroke="white"
            strokeWidth={1}
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>
      ))}

      {/* 当前值标记 */}
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={6}
          fill={pointColor}
          stroke="white"
          strokeWidth={2}
        />
      )}
    </svg>
  )
}

/**
 * 趋势指示器
 */
type TrendIndicatorProps = {
  trend: 'up' | 'down' | 'stable'
  value?: number
}

function TrendIndicator({ trend, value }: TrendIndicatorProps) {
  const configs = {
    up: {
      icon: <ArrowUpOutlined />,
      color: '#52c41a',
      label: '上升',
    },
    down: {
      icon: <ArrowDownOutlined />,
      color: '#cf1322',
      label: '下降',
    },
    stable: {
      icon: <MinusOutlined />,
      color: '#8c8c8c',
      label: '稳定',
    },
  }

  const config = configs[trend]

  return (
    <Space size={4}>
      <span style={{ color: config.color }}>{config.icon}</span>
      <Text style={{ color: config.color, fontSize: 12 }}>
        {config.label}
        {value !== undefined && ` ${Math.abs(value).toFixed(1)}%`}
      </Text>
    </Space>
  )
}

/**
 * 趋势偏离卡片属性
 */
type TrendDeviationCardProps = {
  historyStats: HistoryStats
  anomaly?: Anomaly | null
  title?: string
  showChart?: boolean
  showStats?: boolean
  compact?: boolean
  style?: React.CSSProperties
}

/**
 * 趋势偏离卡片组件
 */
export function TrendDeviationCard({
  historyStats,
  anomaly,
  title,
  showChart = true,
  showStats = true,
  compact = false,
  style,
}: TrendDeviationCardProps) {
  const {
    promptName,
    modelName,
    avgPassRate,
    stdDeviation,
    minPassRate,
    maxPassRate,
    dataPoints,
  } = historyStats

  // 当前值
  const currentValue = dataPoints.length > 0
    ? dataPoints[dataPoints.length - 1].passRate
    : avgPassRate

  // 计算趋势
  const trend = useMemo(() => {
    if (dataPoints.length < 2) return 'stable'

    const recentPoints = dataPoints.slice(-3)
    const firstHalf = recentPoints.slice(0, Math.ceil(recentPoints.length / 2))
    const secondHalf = recentPoints.slice(Math.floor(recentPoints.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b.passRate, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b.passRate, 0) / secondHalf.length

    const diff = secondAvg - firstAvg
    if (diff > 5) return 'up'
    if (diff < -5) return 'down'
    return 'stable'
  }, [dataPoints])

  // 计算趋势变化值
  const trendValue = useMemo(() => {
    if (dataPoints.length < 2) return 0
    const first = dataPoints[0].passRate
    const last = dataPoints[dataPoints.length - 1].passRate
    return last - first
  }, [dataPoints])

  // 预期范围
  const expectedRange = {
    min: Math.max(0, avgPassRate - 2 * stdDeviation),
    max: Math.min(100, avgPassRate + 2 * stdDeviation),
  }

  // 是否在正常范围内
  const isNormal = currentValue >= expectedRange.min && currentValue <= expectedRange.max

  // 卡片标题
  const cardTitle = title || (
    <Space>
      {promptName && <Tag color="blue">{promptName}</Tag>}
      {modelName && <Tag color="purple">{modelName}</Tag>}
    </Space>
  )

  // 紧凑模式
  if (compact) {
    return (
      <Card
        size="small"
        style={{
          borderLeft: anomaly
            ? `4px solid ${getSeverityStyle(anomaly.severity).color}`
            : isNormal
              ? '4px solid #52c41a'
              : '4px solid #faad14',
          ...style,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {cardTitle}
            {anomaly && (
              <Tag color="red" icon={<WarningOutlined />}>
                异常
              </Tag>
            )}
          </Space>
          <Space size="large">
            <Statistic
              value={currentValue}
              precision={1}
              suffix="%"
              valueStyle={{
                fontSize: 16,
                color: isNormal ? '#52c41a' : '#cf1322',
              }}
            />
            <TrendIndicator trend={trend} value={trendValue} />
          </Space>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={cardTitle}
      size="small"
      extra={
        anomaly ? (
          <Tag color="red" icon={<WarningOutlined />}>
            检测到异常
          </Tag>
        ) : isNormal ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            正常
          </Tag>
        ) : (
          <Tag color="orange" icon={<WarningOutlined />}>
            需关注
          </Tag>
        )
      }
      style={style}
    >
      <Row gutter={16}>
        {/* 左侧：图表 */}
        {showChart && (
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                历史趋势（预期范围：{expectedRange.min.toFixed(1)}% - {expectedRange.max.toFixed(1)}%）
              </Text>
            </div>
            <MiniChart
              dataPoints={dataPoints}
              expectedRange={expectedRange}
              currentValue={currentValue}
              width={180}
              height={60}
            />
          </Col>
        )}

        {/* 右侧：统计信息 */}
        {showStats && (
          <Col span={showChart ? 12 : 24}>
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="当前通过率"
                  value={currentValue}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    fontSize: 20,
                    color: isNormal ? '#52c41a' : '#cf1322',
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="历史平均"
                  value={avgPassRate}
                  precision={1}
                  suffix="%"
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
              <Col span={12}>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>标准差</Text>
                  <div>
                    <Text>{stdDeviation.toFixed(2)}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>趋势</Text>
                  <div>
                    <TrendIndicator trend={trend} value={trendValue} />
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        )}
      </Row>

      {/* 异常描述 */}
      {anomaly && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: getSeverityStyle(anomaly.severity).bgColor,
            borderRadius: 4,
          }}
        >
          <Text style={{ color: getSeverityStyle(anomaly.severity).color }}>
            {anomaly.description}
          </Text>
        </div>
      )}
    </Card>
  )
}

/**
 * 趋势偏离卡片列表
 */
type TrendDeviationListProps = {
  items: Array<{
    historyStats: HistoryStats
    anomaly?: Anomaly | null
  }>
  compact?: boolean
}

export function TrendDeviationList({ items, compact = false }: TrendDeviationListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, index) => (
        <TrendDeviationCard
          key={`${item.historyStats.promptId}-${item.historyStats.modelId}-${index}`}
          historyStats={item.historyStats}
          anomaly={item.anomaly}
          compact={compact}
        />
      ))}
    </div>
  )
}
