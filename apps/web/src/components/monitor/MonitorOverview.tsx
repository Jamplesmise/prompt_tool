'use client'

import { Card, Row, Col, Statistic, Spin, Empty } from 'antd'
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { TrendData } from '@platform/shared'

type MonitorOverviewProps = {
  data?: TrendData
  loading?: boolean
}

export default function MonitorOverview({ data, loading }: MonitorOverviewProps) {
  if (loading) {
    return (
      <Card title="执行概览">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    )
  }

  if (!data || data.points.length === 0) {
    return (
      <Card title="执行概览">
        <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  const { points, summary } = data

  // 计算执行统计
  const totalExecutions = points.reduce((acc, p) => acc + p.taskCount, 0)
  const successCount = Math.round(totalExecutions * (1 - summary.errorRate))
  const failedCount = totalExecutions - successCount
  const passRate = summary.avgPassRate * 100

  // 迷你图表数据
  const chartData = points.map((point) => ({
    time: point.timestamp,
    value: point.taskCount,
  }))

  return (
    <Card title="执行概览" bodyStyle={{ padding: '16px 24px' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总执行"
            value={totalExecutions}
            prefix={<PlayCircleOutlined style={{ color: '#1677ff' }} />}
            valueStyle={{ fontSize: 28 }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="成功"
            value={successCount}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ fontSize: 28, color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="失败"
            value={failedCount}
            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ fontSize: 28, color: '#ff4d4f' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="通过率"
            value={passRate}
            precision={1}
            suffix="%"
            prefix={<PercentageOutlined style={{ color: passRate >= 80 ? '#52c41a' : passRate >= 60 ? '#faad14' : '#ff4d4f' }} />}
            valueStyle={{
              fontSize: 28,
              color: passRate >= 80 ? '#52c41a' : passRate >= 60 ? '#faad14' : '#ff4d4f',
            }}
          />
        </Col>
      </Row>

      {/* 迷你执行趋势图 */}
      <div style={{ marginTop: 16, height: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Tooltip
              formatter={(value: number) => [value, '执行次数']}
              labelFormatter={() => ''}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#1677ff"
              fill="#1677ff"
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
