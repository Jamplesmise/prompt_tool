'use client'

import { Card, Table, Progress, Typography, Space, Tag, Empty, Spin, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

export type ModelPerformance = {
  modelId: string
  modelName: string
  providerName: string
  callCount: number
  successRate: number      // 0-100
  avgLatency: number       // 毫秒
  passRate: number         // 0-100
  tokenUsage: number       // 总 Token
  inputTokens: number      // 输入 Token
  outputTokens: number     // 输出 Token
  // 成本相关
  totalCost: number        // 总成本
  avgCostPerCall: number   // 平均单次成本
  // 性能分布
  latencyP50: number       // 延迟 P50
  latencyP95: number       // 延迟 P95
  latencyP99: number       // 延迟 P99
  // 错误分析
  errorRate: number        // 错误率 0-100
  timeoutRate: number      // 超时率 0-100
  errorCount: number       // 错误次数
  timeoutCount: number     // 超时次数
}

type ModelPerformanceTableProps = {
  data: ModelPerformance[]
  loading?: boolean
  onModelClick?: (modelId: string) => void
}

// 格式化数字（千分位）
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN')
}

// 格式化 Token 数量
const formatTokens = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

// 格式化延迟
const formatLatency = (ms: number): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${Math.round(ms)}ms`
}

// 格式化成本
const formatCost = (cost: number): string => {
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`
  }
  if (cost >= 0.01) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(6)}`
}

export default function ModelPerformanceTable({
  data,
  loading,
  onModelClick,
}: ModelPerformanceTableProps) {
  const columns: ColumnsType<ModelPerformance> = [
    {
      title: '模型',
      key: 'model',
      width: 160,
      fixed: 'left',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.modelName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.providerName}
          </Text>
        </Space>
      ),
    },
    {
      title: '调用',
      dataIndex: 'callCount',
      key: 'callCount',
      width: 80,
      sorter: (a, b) => a.callCount - b.callCount,
      render: (value: number) => (
        <Text strong>{formatNumber(value)}</Text>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 100,
      sorter: (a, b) => a.successRate - b.successRate,
      render: (value: number) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text>{value.toFixed(1)}%</Text>
          <Progress
            percent={value}
            size="small"
            status={value >= 99 ? 'success' : value >= 95 ? 'normal' : 'exception'}
            showInfo={false}
            strokeWidth={4}
          />
        </Space>
      ),
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      key: 'passRate',
      width: 100,
      sorter: (a, b) => a.passRate - b.passRate,
      render: (value: number) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text
            style={{
              color: value >= 90 ? '#52c41a' : value >= 70 ? '#faad14' : '#ff4d4f',
            }}
          >
            {value.toFixed(1)}%
          </Text>
          <Progress
            percent={value}
            size="small"
            strokeColor={value >= 90 ? '#52c41a' : value >= 70 ? '#faad14' : '#ff4d4f'}
            showInfo={false}
            strokeWidth={4}
          />
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="平均延迟 / P50 / P95 / P99">
          延迟分布
        </Tooltip>
      ),
      key: 'latency',
      width: 140,
      sorter: (a, b) => a.avgLatency - b.avgLatency,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>
            <Tag color={record.avgLatency < 1000 ? 'green' : record.avgLatency < 3000 ? 'orange' : 'red'}>
              {formatLatency(record.avgLatency)}
            </Tag>
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            P50: {formatLatency(record.latencyP50)} / P95: {formatLatency(record.latencyP95)}
          </Text>
        </Space>
      ),
    },
    {
      title: '输入 Token',
      dataIndex: 'inputTokens',
      key: 'inputTokens',
      width: 90,
      sorter: (a, b) => a.inputTokens - b.inputTokens,
      render: (value: number) => (
        <Text type="secondary">{formatTokens(value)}</Text>
      ),
    },
    {
      title: '输出 Token',
      dataIndex: 'outputTokens',
      key: 'outputTokens',
      width: 90,
      sorter: (a, b) => a.outputTokens - b.outputTokens,
      render: (value: number) => (
        <Text>{formatTokens(value)}</Text>
      ),
    },
    {
      title: (
        <Tooltip title="总成本 / 平均单次成本">
          成本
        </Tooltip>
      ),
      key: 'cost',
      width: 120,
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#722ed1' }}>
            {formatCost(record.totalCost)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            均: {formatCost(record.avgCostPerCall)}
          </Text>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="错误率 / 超时率">
          异常
        </Tooltip>
      ),
      key: 'error',
      width: 100,
      sorter: (a, b) => a.errorRate - b.errorRate,
      render: (_, record) => {
        const hasError = record.errorRate > 0 || record.timeoutRate > 0
        return (
          <Space direction="vertical" size={0}>
            {hasError ? (
              <>
                <Text type="danger" style={{ fontSize: 12 }}>
                  错误: {record.errorRate.toFixed(1)}% ({record.errorCount})
                </Text>
                <Text type="warning" style={{ fontSize: 12 }}>
                  超时: {record.timeoutRate.toFixed(1)}% ({record.timeoutCount})
                </Text>
              </>
            ) : (
              <Tag color="success">正常</Tag>
            )}
          </Space>
        )
      },
    },
  ]

  if (loading) {
    return (
      <Card title="模型性能对比">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card title="模型性能对比">
        <Empty description="暂无模型数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  return (
    <Card title="模型性能对比">
      <Table
        columns={columns}
        dataSource={data}
        rowKey="modelId"
        pagination={false}
        size="middle"
        scroll={{ x: 1100 }}
        onRow={(record) => ({
          onClick: () => onModelClick?.(record.modelId),
          style: { cursor: onModelClick ? 'pointer' : 'default' },
        })}
      />
    </Card>
  )
}
