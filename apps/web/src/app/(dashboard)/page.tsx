'use client'

import { Row, Col, Typography } from 'antd'
import { StatCards, RecentTasks, QuickActions } from '@/components/dashboard'

const { Title } = Typography

export default function DashboardPage() {
  return (
    <div>
      <Title level={4} className="!mb-6">
        工作台
      </Title>

      <StatCards />

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <RecentTasks />
        </Col>
        <Col xs={24} lg={8}>
          <QuickActions />
        </Col>
      </Row>
    </div>
  )
}
