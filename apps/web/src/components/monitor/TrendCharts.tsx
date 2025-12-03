'use client'

import { Card, Row, Col, Statistic, Empty, Spin } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrendData, TrendDataPoint } from '@platform/shared'
import dayjs from 'dayjs'

type TrendChartsProps = {
  data?: TrendData
  loading?: boolean
}

// 格式化时间戳
const formatTimestamp = (timestamp: string) => {
  const date = dayjs(timestamp)
  const now = dayjs()
  const diffDays = now.diff(date, 'day')

  if (diffDays === 0) {
    return date.format('HH:mm')
  } else if (diffDays < 7) {
    return date.format('MM-DD HH:mm')
  } else {
    return date.format('MM-DD')
  }
}

// 格式化百分比
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

// 格式化耗时
const formatLatency = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`
  }
  return `${Math.round(value)}ms`
}

// 格式化成本
const formatCost = (value: number) => `$${value.toFixed(4)}`

export default function TrendCharts({ data, loading }: TrendChartsProps) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data || data.points.length === 0) {
    return (
      <Empty
        description="暂无数据"
        style={{ padding: 100 }}
      />
    )
  }

  const { points, summary } = data

  // 转换数据格式
  const chartData = points.map((point: TrendDataPoint) => ({
    ...point,
    passRatePercent: point.passRate * 100,
    errorRatePercent: point.errorRate * 100,
    time: formatTimestamp(point.timestamp),
  }))

  return (
    <div>
      {/* 汇总指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均通过率"
              value={summary.avgPassRate * 100}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{
                color: summary.avgPassRate >= 0.8 ? '#52c41a' : summary.avgPassRate >= 0.6 ? '#faad14' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均耗时"
              value={summary.avgLatency}
              precision={0}
              suffix="ms"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总成本"
              value={summary.totalCost}
              precision={4}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="错误率"
              value={summary.errorRate * 100}
              precision={1}
              suffix="%"
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{
                color: summary.errorRate <= 0.05 ? '#52c41a' : summary.errorRate <= 0.1 ? '#faad14' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 通过率趋势图 */}
      <Card title="通过率趋势" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, '通过率']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="passRatePercent"
              name="通过率"
              stroke="#52c41a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 耗时和调用量趋势 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="平均耗时趋势">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(value: number) => formatLatency(value)} />
                <Tooltip
                  formatter={(value: number) => [formatLatency(value), '平均耗时']}
                />
                <Area
                  type="monotone"
                  dataKey="avgLatency"
                  name="平均耗时"
                  stroke="#1890ff"
                  fill="#1890ff"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="调用量趋势">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [value, '调用次数']}
                />
                <Bar
                  dataKey="taskCount"
                  name="调用次数"
                  fill="#722ed1"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 成本趋势 */}
      <Card title="成本趋势">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis tickFormatter={(value: number) => formatCost(value)} />
            <Tooltip
              formatter={(value: number) => [formatCost(value), '成本']}
            />
            <Area
              type="monotone"
              dataKey="totalCost"
              name="成本"
              stroke="#faad14"
              fill="#faad14"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
