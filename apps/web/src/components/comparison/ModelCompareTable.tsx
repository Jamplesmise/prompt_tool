'use client'

import { useMemo, useState } from 'react'
import { Table, Tag, Tooltip, Typography, Space, Badge, Progress } from 'antd'
import {
  TrophyOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { ModelComparisonData, ModelComparisonResult } from '@/services/comparisonService'

const { Text } = Typography

type ModelCompareTableProps = {
  data: ModelComparisonData[]
  winner: ModelComparisonResult['winner']
  sortable?: boolean
}

type MetricKey = 'passRate' | 'avgLatency' | 'avgCost' | 'formatAccuracy' | 'complexQuestionScore'

/**
 * 格式化指标值
 */
function formatMetricValue(key: MetricKey, value: number): string {
  switch (key) {
    case 'passRate':
    case 'formatAccuracy':
    case 'complexQuestionScore':
      return `${(value * 100).toFixed(1)}%`
    case 'avgLatency':
      return `${value.toFixed(2)}s`
    case 'avgCost':
      return `$${value.toFixed(6)}`
    default:
      return String(value)
  }
}

/**
 * 判断该值是否是最优值
 */
function isWinningValue(
  models: ModelComparisonData[],
  currentModel: ModelComparisonData,
  key: MetricKey
): boolean {
  const values = models.map(m => m.metrics[key])

  // 对于延迟和成本，越低越好
  if (key === 'avgLatency' || key === 'avgCost') {
    const minValue = Math.min(...values)
    return currentModel.metrics[key] === minValue
  }

  // 其他指标越高越好
  const maxValue = Math.max(...values)
  return currentModel.metrics[key] === maxValue
}

/**
 * 模型对比表格组件
 */
export function ModelCompareTable({ data, winner, sortable = true }: ModelCompareTableProps) {
  const [sortedInfo, setSortedInfo] = useState<{
    columnKey?: string
    order?: 'ascend' | 'descend'
  }>({})

  // 计算每个模型的胜出次数
  const winCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const metrics: MetricKey[] = ['passRate', 'avgLatency', 'avgCost', 'formatAccuracy', 'complexQuestionScore']

    data.forEach(model => {
      counts[model.modelId] = metrics.filter(key => isWinningValue(data, model, key)).length
    })

    return counts
  }, [data])

  const columns: ColumnsType<ModelComparisonData> = [
    {
      title: '模型',
      dataIndex: 'modelName',
      key: 'modelName',
      fixed: 'left',
      width: 180,
      render: (name: string, record: ModelComparisonData) => (
        <Space direction="vertical" size={0}>
          <Space>
            <ApiOutlined />
            <Text strong>{name}</Text>
            {winner.overall === record.modelId && (
              <Tooltip title="综合胜出">
                <TrophyOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.providerName}
          </Text>
        </Space>
      ),
    },
    {
      title: (
        <Space size={4}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>通过率</span>
        </Space>
      ),
      dataIndex: ['metrics', 'passRate'],
      key: 'passRate',
      width: 120,
      sorter: sortable ? (a, b) => a.metrics.passRate - b.metrics.passRate : undefined,
      sortOrder: sortedInfo.columnKey === 'passRate' ? sortedInfo.order : undefined,
      render: (value: number, record: ModelComparisonData) => {
        const isWinner = isWinningValue(data, record, 'passRate')
        return (
          <div>
            <Progress
              percent={value * 100}
              size="small"
              status={value >= 0.8 ? 'success' : value >= 0.5 ? 'normal' : 'exception'}
              format={() => formatMetricValue('passRate', value)}
              strokeColor={isWinner ? '#52c41a' : undefined}
            />
            {isWinner && (
              <Tag color="green" style={{ marginTop: 4 }}>
                最高
              </Tag>
            )}
          </div>
        )
      },
    },
    {
      title: (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#EF4444' }} />
          <span>平均延迟</span>
        </Space>
      ),
      dataIndex: ['metrics', 'avgLatency'],
      key: 'avgLatency',
      width: 120,
      sorter: sortable ? (a, b) => a.metrics.avgLatency - b.metrics.avgLatency : undefined,
      sortOrder: sortedInfo.columnKey === 'avgLatency' ? sortedInfo.order : undefined,
      render: (value: number, record: ModelComparisonData) => {
        const isWinner = isWinningValue(data, record, 'avgLatency')
        return (
          <Space direction="vertical" size={0}>
            <Text
              style={{
                fontWeight: isWinner ? 600 : 400,
                color: isWinner ? '#52c41a' : undefined,
              }}
            >
              {formatMetricValue('avgLatency', value)}
            </Text>
            {isWinner && <Tag color="green">最快</Tag>}
          </Space>
        )
      },
    },
    {
      title: (
        <Space size={4}>
          <DollarOutlined style={{ color: '#faad14' }} />
          <span>平均成本</span>
        </Space>
      ),
      dataIndex: ['metrics', 'avgCost'],
      key: 'avgCost',
      width: 120,
      sorter: sortable ? (a, b) => a.metrics.avgCost - b.metrics.avgCost : undefined,
      sortOrder: sortedInfo.columnKey === 'avgCost' ? sortedInfo.order : undefined,
      render: (value: number, record: ModelComparisonData) => {
        const isWinner = isWinningValue(data, record, 'avgCost')
        return (
          <Space direction="vertical" size={0}>
            <Text
              style={{
                fontWeight: isWinner ? 600 : 400,
                color: isWinner ? '#52c41a' : undefined,
              }}
            >
              {formatMetricValue('avgCost', value)}
            </Text>
            {isWinner && <Tag color="green">最低</Tag>}
          </Space>
        )
      },
    },
    {
      title: '格式准确率',
      dataIndex: ['metrics', 'formatAccuracy'],
      key: 'formatAccuracy',
      width: 120,
      sorter: sortable ? (a, b) => a.metrics.formatAccuracy - b.metrics.formatAccuracy : undefined,
      sortOrder: sortedInfo.columnKey === 'formatAccuracy' ? sortedInfo.order : undefined,
      render: (value: number, record: ModelComparisonData) => {
        const isWinner = isWinningValue(data, record, 'formatAccuracy')
        return (
          <Text
            style={{
              fontWeight: isWinner ? 600 : 400,
              color: isWinner ? '#52c41a' : undefined,
            }}
          >
            {formatMetricValue('formatAccuracy', value)}
          </Text>
        )
      },
    },
    {
      title: '复杂问题表现',
      dataIndex: ['metrics', 'complexQuestionScore'],
      key: 'complexQuestionScore',
      width: 120,
      sorter: sortable
        ? (a, b) => a.metrics.complexQuestionScore - b.metrics.complexQuestionScore
        : undefined,
      sortOrder: sortedInfo.columnKey === 'complexQuestionScore' ? sortedInfo.order : undefined,
      render: (value: number, record: ModelComparisonData) => {
        const isWinner = isWinningValue(data, record, 'complexQuestionScore')
        return (
          <Text
            style={{
              fontWeight: isWinner ? 600 : 400,
              color: isWinner ? '#52c41a' : undefined,
            }}
          >
            {formatMetricValue('complexQuestionScore', value)}
          </Text>
        )
      },
    },
    {
      title: '测试数',
      dataIndex: ['metrics', 'totalTests'],
      key: 'totalTests',
      width: 80,
      render: (value: number) => <Text type="secondary">{value}</Text>,
    },
    {
      title: '胜出项',
      key: 'winCount',
      width: 80,
      render: (_: unknown, record: ModelComparisonData) => {
        const count = winCounts[record.modelId] || 0
        return (
          <Badge
            count={count}
            style={{
              backgroundColor: count >= 3 ? '#52c41a' : count >= 2 ? '#faad14' : '#d9d9d9',
            }}
          />
        )
      },
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="modelId"
      pagination={false}
      scroll={{ x: 900 }}
      size="middle"
      onChange={(pagination, filters, sorter) => {
        if (!Array.isArray(sorter)) {
          setSortedInfo({
            columnKey: sorter.columnKey as string,
            order: sorter.order as 'ascend' | 'descend',
          })
        }
      }}
      rowClassName={(record) =>
        winner.overall === record.modelId ? 'ant-table-row-selected' : ''
      }
    />
  )
}

/**
 * 紧凑型模型对比（用于小空间）
 */
type CompactModelCompareProps = {
  data: ModelComparisonData[]
  winner: ModelComparisonResult['winner']
}

export function CompactModelCompare({ data, winner }: CompactModelCompareProps) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {data.map(model => (
        <div
          key={model.modelId}
          style={{
            padding: 12,
            border: `2px solid ${winner.overall === model.modelId ? '#52c41a' : '#f0f0f0'}`,
            borderRadius: 8,
            minWidth: 160,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text strong>{model.modelName}</Text>
            {winner.overall === model.modelId && (
              <TrophyOutlined style={{ color: '#faad14' }} />
            )}
          </div>
          <div style={{ fontSize: 12 }}>
            <div>
              通过率: <Text type={model.metrics.passRate >= 0.8 ? 'success' : undefined}>
                {(model.metrics.passRate * 100).toFixed(1)}%
              </Text>
            </div>
            <div>延迟: {model.metrics.avgLatency.toFixed(2)}s</div>
            <div>成本: ${model.metrics.avgCost.toFixed(6)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
