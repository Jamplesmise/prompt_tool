'use client'

import { useState } from 'react'
import { Card, Typography, Row, Col } from 'antd'
import { DashboardOutlined } from '@ant-design/icons'
import {
  TimeRangePicker,
  TrendCharts,
  AlertList,
  MonitorOverview,
  ModelPerformanceTable,
} from '@/components/monitor'
import { useTrends, useModelPerformance } from '@/hooks/useMetrics'
import { useActiveAlerts } from '@/hooks/useAlerts'
import type { TimeRange } from '@platform/shared'

const { Title } = Typography

export default function MonitorOverviewPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [customRange, setCustomRange] = useState<[string, string] | undefined>()

  const queryParams = {
    range: timeRange,
    start: customRange?.[0],
    end: customRange?.[1],
  }

  const { data: trendData, isLoading: trendsLoading } = useTrends(queryParams)
  const { data: modelData = [], isLoading: modelsLoading } = useModelPerformance(queryParams)
  const { data: activeAlerts = [], isLoading: alertsLoading } = useActiveAlerts()

  const handleTimeRangeChange = (
    value: TimeRange,
    custom?: [string, string]
  ) => {
    setTimeRange(value)
    setCustomRange(custom)
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和时间范围选择器 */}
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

      <Row gutter={[16, 16]}>
        {/* 执行概览 + 活跃告警 */}
        <Col span={16}>
          <MonitorOverview data={trendData} loading={trendsLoading} />
        </Col>
        <Col span={8}>
          <Card
            title="活跃告警"
            extra={
              <span style={{ color: activeAlerts.length > 0 ? '#ff4d4f' : '#52c41a' }}>
                {activeAlerts.length} 条
              </span>
            }
            styles={{ body: { padding: '12px 16px' } }}
          >
            <AlertList alerts={activeAlerts} loading={alertsLoading} />
          </Card>
        </Col>

        {/* 模型性能对比表格 */}
        <Col span={24}>
          <ModelPerformanceTable data={modelData} loading={modelsLoading} />
        </Col>

        {/* 详细趋势图表 */}
        <Col span={24}>
          <TrendCharts data={trendData} loading={trendsLoading} />
        </Col>
      </Row>
    </div>
  )
}
