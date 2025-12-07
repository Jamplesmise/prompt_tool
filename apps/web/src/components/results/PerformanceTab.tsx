'use client'

import { useMemo } from 'react'
import { Row, Col, Card, Statistic, Table, Typography, Progress, Space, Empty, Tag } from 'antd'
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TaskResultData, ResultStats } from './types'

const { Text } = Typography

type PerformanceTabProps = {
  results: TaskResultData[]
  stats: ResultStats
}

type LatencyBucket = {
  key: string
  range: string
  count: number
  percentage: number
  minLatency: number
  maxLatency: number
}

type SlowRequest = {
  key: string
  id: string
  input: string
  latency: number
  status: string
  passed: boolean
}

/**
 * 性能分析标签页
 * 展示延迟分布、趋势、慢请求列表
 */
export function PerformanceTab({ results, stats }: PerformanceTabProps) {
  // 构建延迟分布直方图数据
  const latencyDistribution = useMemo(() => {
    const buckets: LatencyBucket[] = [
      { key: '0-500', range: '0-500ms', count: 0, percentage: 0, minLatency: 0, maxLatency: 500 },
      { key: '500-1000', range: '500ms-1s', count: 0, percentage: 0, minLatency: 500, maxLatency: 1000 },
      { key: '1000-2000', range: '1-2s', count: 0, percentage: 0, minLatency: 1000, maxLatency: 2000 },
      { key: '2000-5000', range: '2-5s', count: 0, percentage: 0, minLatency: 2000, maxLatency: 5000 },
      { key: '5000-10000', range: '5-10s', count: 0, percentage: 0, minLatency: 5000, maxLatency: 10000 },
      { key: '10000+', range: '>10s', count: 0, percentage: 0, minLatency: 10000, maxLatency: Infinity },
    ]

    const validResults = results.filter(r => r.latency != null && r.latency > 0)
    const total = validResults.length

    for (const result of validResults) {
      const latency = result.latency!
      for (const bucket of buckets) {
        if (latency >= bucket.minLatency && latency < bucket.maxLatency) {
          bucket.count++
          break
        }
      }
    }

    // 计算百分比
    for (const bucket of buckets) {
      bucket.percentage = total > 0 ? Math.round((bucket.count / total) * 100) : 0
    }

    return buckets.filter(b => b.count > 0)
  }, [results])

  // 最大计数（用于柱状图宽度）
  const maxCount = useMemo(
    () => Math.max(...latencyDistribution.map(d => d.count), 1),
    [latencyDistribution]
  )

  // 慢请求列表（延迟 > P90）
  const slowRequests: SlowRequest[] = useMemo(() => {
    if (stats.p90Latency === 0) return []

    return results
      .filter(r => r.latency != null && r.latency > stats.p90Latency)
      .sort((a, b) => (b.latency || 0) - (a.latency || 0))
      .slice(0, 20)
      .map(r => ({
        key: r.id,
        id: r.id,
        input: JSON.stringify(r.input).substring(0, 50) + '...',
        latency: r.latency || 0,
        status: r.status,
        passed: r.passed,
      }))
  }, [results, stats.p90Latency])

  // 慢请求表格列
  const slowRequestColumns: ColumnsType<SlowRequest> = [
    {
      title: '输入预览',
      dataIndex: 'input',
      key: 'input',
      ellipsis: true,
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      width: 120,
      render: (latency: number) => (
        <Text type="danger" strong>
          {(latency / 1000).toFixed(2)}s
        </Text>
      ),
      sorter: (a, b) => a.latency - b.latency,
      defaultSortOrder: 'descend',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record) => (
        <Tag color={record.passed ? 'green' : status === 'TIMEOUT' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
  ]

  const hasLatencyData = stats.avgLatency > 0

  if (!hasLatencyData) {
    return (
      <Empty description="暂无延迟数据" />
    )
  }

  return (
    <div>
      {/* 延迟统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="平均延迟"
              value={stats.avgLatency / 1000}
              precision={2}
              suffix="s"
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="P50 延迟"
              value={stats.p50Latency / 1000}
              precision={2}
              suffix="s"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="P90 延迟"
              value={stats.p90Latency / 1000}
              precision={2}
              suffix="s"
              valueStyle={{ color: stats.p90Latency > 5000 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="P99 延迟"
              value={stats.p99Latency / 1000}
              precision={2}
              suffix="s"
              valueStyle={{ color: stats.p99Latency > 10000 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 延迟分布直方图 */}
        <Col xs={24} md={12} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <BarChartIcon />
                延迟分布
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {latencyDistribution.map(bucket => (
                <div key={bucket.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>{bucket.range}</Text>
                    <Text type="secondary">
                      {bucket.count} 个 ({bucket.percentage}%)
                    </Text>
                  </div>
                  <div
                    style={{
                      height: 20,
                      background: '#f5f5f5',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(bucket.count / maxCount) * 100}%`,
                        height: '100%',
                        background: bucket.minLatency >= 5000 ? '#ff4d4f' : bucket.minLatency >= 2000 ? '#faad14' : '#52c41a',
                        borderRadius: 3,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 图例 */}
            <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
              <Space size={4}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>正常 (&lt;2s)</Text>
              </Space>
              <Space size={4}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#faad14' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>较慢 (2-5s)</Text>
              </Space>
              <Space size={4}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ff4d4f' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>很慢 (&gt;5s)</Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* 慢请求列表 */}
        <Col xs={24} md={12} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                慢请求 (延迟 &gt; P90)
              </Space>
            }
            extra={
              <Text type="secondary">
                阈值: {(stats.p90Latency / 1000).toFixed(2)}s
              </Text>
            }
          >
            {slowRequests.length > 0 ? (
              <Table
                columns={slowRequestColumns}
                dataSource={slowRequests}
                size="small"
                pagination={{ pageSize: 5, showSizeChanger: false }}
                locale={{ emptyText: '暂无慢请求' }}
              />
            ) : (
              <Empty description="没有超过 P90 阈值的请求" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 性能建议 */}
      {(stats.p90Latency > 5000 || stats.avgLatency > 3000) && (
        <Card
          size="small"
          title="性能优化建议"
          style={{ marginTop: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {stats.avgLatency > 3000 && (
              <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8 }}>
                <Text>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  平均延迟较高，建议检查提示词复杂度或考虑使用更快的模型
                </Text>
              </div>
            )}
            {stats.p90Latency > 5000 && (
              <div style={{ padding: '8px 12px', background: '#fff2f0', borderRadius: 8 }}>
                <Text>
                  <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                  P90 延迟超过 5 秒，可能存在部分请求响应过慢
                </Text>
              </div>
            )}
            {slowRequests.some(r => r.status === 'TIMEOUT') && (
              <div style={{ padding: '8px 12px', background: '#fff2f0', borderRadius: 8 }}>
                <Text>
                  <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                  存在超时请求，建议增加超时时间或优化提示词
                </Text>
              </div>
            )}
          </Space>
        </Card>
      )}
    </div>
  )
}

// 简单的柱状图图标组件
function BarChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="6" width="4" height="15" />
      <rect x="17" y="3" width="4" height="18" />
    </svg>
  )
}
