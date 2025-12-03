'use client'

import { Card, Row, Col, Statistic, Spin } from 'antd'
import {
  FileTextOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useOverviewStats } from '@/hooks/useStats'

export function StatCards() {
  const { data: stats, isLoading } = useOverviewStats()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    )
  }

  const statItems = [
    {
      title: '提示词数量',
      value: stats?.promptCount ?? 0,
      icon: <FileTextOutlined />,
      color: '#1677ff',
    },
    {
      title: '数据集数量',
      value: stats?.datasetCount ?? 0,
      icon: <DatabaseOutlined />,
      color: '#52c41a',
    },
    {
      title: '本周任务数',
      value: stats?.taskCountThisWeek ?? 0,
      icon: <ThunderboltOutlined />,
      color: '#faad14',
    },
    {
      title: '平均通过率',
      value:
        stats?.avgPassRate != null
          ? `${(stats.avgPassRate * 100).toFixed(1)}%`
          : '-',
      icon: <CheckCircleOutlined />,
      color: stats?.avgPassRate != null && stats.avgPassRate >= 0.8 ? '#52c41a' : '#faad14',
      isPercent: true,
    },
  ]

  return (
    <Row gutter={[16, 16]}>
      {statItems.map((item) => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card>
            <Statistic
              title={item.title}
              value={item.isPercent ? undefined : item.value}
              formatter={item.isPercent ? () => item.value : undefined}
              prefix={item.icon}
              valueStyle={{ color: item.color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
