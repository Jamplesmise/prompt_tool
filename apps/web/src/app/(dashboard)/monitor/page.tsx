'use client'

import { useState } from 'react'
import { Card, Typography, Space, Row, Col } from 'antd'
import { DashboardOutlined } from '@ant-design/icons'
import TimeRangePicker from '@/components/monitor/TimeRangePicker'
import TrendCharts from '@/components/monitor/TrendCharts'
import AlertList from '@/components/monitor/AlertList'
import { useTrends } from '@/hooks/useMetrics'
import type { TimeRange } from '@platform/shared'

const { Title } = Typography

export default function MonitorPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [customRange, setCustomRange] = useState<[string, string] | undefined>()

  const { data: trendData, isLoading } = useTrends({
    range: timeRange,
    start: customRange?.[0],
    end: customRange?.[1],
  })

  const handleTimeRangeChange = (
    value: TimeRange,
    custom?: [string, string]
  ) => {
    setTimeRange(value)
    setCustomRange(custom)
  }

  // TODO: 从告警 API 获取活跃告警
  const activeAlerts: never[] = []

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DashboardOutlined style={{ marginRight: 8 }} />
          监控中心
        </Title>
        <TimeRangePicker
          value={timeRange}
          onChange={handleTimeRangeChange}
          customRange={customRange}
        />
      </div>

      <Row gutter={24}>
        <Col span={18}>
          <TrendCharts data={trendData} loading={isLoading} />
        </Col>
        <Col span={6}>
          <Card
            title="活跃告警"
            extra={<span style={{ color: activeAlerts.length > 0 ? '#ff4d4f' : '#52c41a' }}>
              {activeAlerts.length} 条
            </span>}
          >
            <AlertList alerts={activeAlerts} loading={false} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
