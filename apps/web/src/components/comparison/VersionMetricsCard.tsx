'use client'

import { Card, Statistic, Row, Col, Tag, Tooltip, Typography, Space } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import type { VersionMetrics, MetricChange, ChangeDirection } from '@/lib/comparison'

const { Text } = Typography

type VersionMetricsCardProps = {
  metrics: VersionMetrics
  title?: string
  showVersion?: boolean
  changes?: {
    passRate?: MetricChange
    avgLatency?: MetricChange
    avgTokens?: MetricChange
    estimatedCost?: MetricChange
  }
  isBaseline?: boolean
}

/**
 * 获取变化方向的图标
 */
function getDirectionIcon(direction: ChangeDirection, isImprovement: boolean) {
  if (direction === 'same') {
    return <MinusOutlined style={{ color: '#8c8c8c' }} />
  }
  if (direction === 'up') {
    return <ArrowUpOutlined style={{ color: isImprovement ? '#52c41a' : '#ff4d4f' }} />
  }
  return <ArrowDownOutlined style={{ color: isImprovement ? '#52c41a' : '#ff4d4f' }} />
}

/**
 * 格式化变化值
 */
function formatChangeValue(change: MetricChange, type: 'percent' | 'time' | 'number' | 'cost'): string {
  if (change.direction === 'same') return '无变化'

  const sign = change.value > 0 ? '+' : ''

  switch (type) {
    case 'percent':
      return `${sign}${(change.value * 100).toFixed(1)}%`
    case 'time':
      return `${sign}${change.value.toFixed(2)}s`
    case 'cost':
      return `${sign}$${change.value.toFixed(4)}`
    case 'number':
    default:
      return `${sign}${Math.round(change.value)}`
  }
}

/**
 * 版本指标卡片组件
 */
export function VersionMetricsCard({
  metrics,
  title,
  showVersion = true,
  changes,
  isBaseline = false,
}: VersionMetricsCardProps) {
  const cardTitle = title || (showVersion ? `版本 ${metrics.version}` : '指标概览')

  return (
    <Card
      title={
        <Space>
          <span>{cardTitle}</span>
          {isBaseline && <Tag color="blue">基准版本</Tag>}
        </Space>
      }
      size="small"
      styles={{
        body: { padding: '16px' },
      }}
    >
      <Row gutter={[16, 16]}>
        {/* 通过率 */}
        <Col span={12}>
          <Statistic
            title={
              <Space size={4}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>通过率</span>
              </Space>
            }
            value={(metrics.passRate * 100).toFixed(1)}
            suffix="%"
            valueStyle={{
              fontSize: 24,
              color: metrics.passRate >= 0.8 ? '#52c41a' : metrics.passRate >= 0.5 ? '#faad14' : '#ff4d4f',
            }}
          />
          {changes?.passRate && (
            <div style={{ marginTop: 4 }}>
              {getDirectionIcon(changes.passRate.direction, changes.passRate.isImprovement)}
              <Text
                type={changes.passRate.isImprovement ? 'success' : 'danger'}
                style={{ marginLeft: 4, fontSize: 12 }}
              >
                {formatChangeValue(changes.passRate, 'percent')}
              </Text>
            </div>
          )}
        </Col>

        {/* 平均延迟 */}
        <Col span={12}>
          <Statistic
            title={
              <Space size={4}>
                <ClockCircleOutlined style={{ color: '#EF4444' }} />
                <span>平均延迟</span>
              </Space>
            }
            value={metrics.avgLatency.toFixed(2)}
            suffix="s"
            valueStyle={{ fontSize: 24 }}
          />
          {changes?.avgLatency && (
            <div style={{ marginTop: 4 }}>
              {getDirectionIcon(changes.avgLatency.direction, changes.avgLatency.isImprovement)}
              <Text
                type={changes.avgLatency.isImprovement ? 'success' : 'danger'}
                style={{ marginLeft: 4, fontSize: 12 }}
              >
                {formatChangeValue(changes.avgLatency, 'time')}
              </Text>
            </div>
          )}
        </Col>

        {/* Token 消耗 */}
        <Col span={12}>
          <Statistic
            title={
              <Space size={4}>
                <CodeOutlined style={{ color: '#722ed1' }} />
                <span>平均 Token</span>
              </Space>
            }
            value={metrics.avgTokens}
            valueStyle={{ fontSize: 24 }}
          />
          {changes?.avgTokens && (
            <div style={{ marginTop: 4 }}>
              {getDirectionIcon(changes.avgTokens.direction, changes.avgTokens.isImprovement)}
              <Text
                type={changes.avgTokens.isImprovement ? 'success' : 'danger'}
                style={{ marginLeft: 4, fontSize: 12 }}
              >
                {formatChangeValue(changes.avgTokens, 'number')}
              </Text>
            </div>
          )}
        </Col>

        {/* 成本 */}
        <Col span={12}>
          <Statistic
            title={
              <Space size={4}>
                <DollarOutlined style={{ color: '#faad14' }} />
                <span>预估成本</span>
              </Space>
            }
            value={metrics.estimatedCost.toFixed(4)}
            prefix="$"
            valueStyle={{ fontSize: 24 }}
          />
          {changes?.estimatedCost && (
            <div style={{ marginTop: 4 }}>
              {getDirectionIcon(changes.estimatedCost.direction, changes.estimatedCost.isImprovement)}
              <Text
                type={changes.estimatedCost.isImprovement ? 'success' : 'danger'}
                style={{ marginLeft: 4, fontSize: 12 }}
              >
                {formatChangeValue(changes.estimatedCost, 'cost')}
              </Text>
            </div>
          )}
        </Col>
      </Row>

      {/* 底部统计 */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Tooltip title={`共 ${metrics.totalTests} 个测试用例`}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            测试数：{metrics.totalTests}
          </Text>
        </Tooltip>
        <Space size={16}>
          <Text type="success" style={{ fontSize: 12 }}>
            <CheckCircleOutlined /> 通过 {metrics.passedTests}
          </Text>
          <Text type="danger" style={{ fontSize: 12 }}>
            <CloseCircleOutlined /> 失败 {metrics.failedTests}
          </Text>
        </Space>
      </div>
    </Card>
  )
}

/**
 * 指标对比卡片 - 并排展示两个版本
 */
type MetricsComparisonCardsProps = {
  oldMetrics: VersionMetrics
  newMetrics: VersionMetrics
  changes: {
    passRate: MetricChange
    avgLatency: MetricChange
    avgTokens: MetricChange
    estimatedCost: MetricChange
  }
}

export function MetricsComparisonCards({
  oldMetrics,
  newMetrics,
  changes,
}: MetricsComparisonCardsProps) {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <VersionMetricsCard
          metrics={oldMetrics}
          title={`版本 ${oldMetrics.version}`}
          isBaseline
        />
      </Col>
      <Col span={12}>
        <VersionMetricsCard
          metrics={newMetrics}
          title={`版本 ${newMetrics.version}`}
          changes={changes}
        />
      </Col>
    </Row>
  )
}

/**
 * 紧凑型指标展示（用于表格或列表）
 */
type CompactMetricsProps = {
  metrics: VersionMetrics
}

export function CompactMetrics({ metrics }: CompactMetricsProps) {
  return (
    <Space size={16}>
      <Tooltip title="通过率">
        <Tag color={metrics.passRate >= 0.8 ? 'green' : metrics.passRate >= 0.5 ? 'orange' : 'red'}>
          {(metrics.passRate * 100).toFixed(1)}%
        </Tag>
      </Tooltip>
      <Tooltip title="平均延迟">
        <Text type="secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined /> {metrics.avgLatency.toFixed(2)}s
        </Text>
      </Tooltip>
      <Tooltip title="平均 Token">
        <Text type="secondary" style={{ fontSize: 12 }}>
          <CodeOutlined /> {metrics.avgTokens}
        </Text>
      </Tooltip>
      <Tooltip title="预估成本">
        <Text type="secondary" style={{ fontSize: 12 }}>
          <DollarOutlined /> ${metrics.estimatedCost.toFixed(4)}
        </Text>
      </Tooltip>
    </Space>
  )
}
