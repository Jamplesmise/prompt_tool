'use client'

import { Row, Col, Typography } from 'antd'
import {
  FileTextOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { StatCard, QuickStart, RecentTasks, TrendChart } from '@/components/dashboard'
import { useDashboardStats } from '@/hooks/useDashboardStats'

const { Title } = Typography

export default function DashboardPage() {
  const router = useRouter()
  const {
    promptCount,
    datasetCount,
    weeklyTaskCount,
    passRate,
    trendData,
    recentTasks,
    overviewLoading,
    trendsLoading,
    recentTasksLoading,
    timeRange,
    setTimeRange,
  } = useDashboardStats()

  const passRateDisplay = passRate != null ? `${(passRate * 100).toFixed(1)}%` : '-'
  const passRateColor = passRate != null && passRate >= 0.8 ? '#52C41A' : '#FAAD14'

  return (
    <div>
      <Title level={4} className="!mb-6">
        工作台
      </Title>

      {/* 统计卡片行 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<FileTextOutlined />}
            title="提示词数量"
            value={promptCount}
            iconBgColor="#1677FF"
            iconBgColorEnd="#69B1FF"
            onClick={() => router.push('/prompts')}
            loading={overviewLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<DatabaseOutlined />}
            title="数据集数量"
            value={datasetCount}
            iconBgColor="#52C41A"
            iconBgColorEnd="#95DE64"
            onClick={() => router.push('/datasets')}
            loading={overviewLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<ThunderboltOutlined />}
            title="本周任务数"
            value={weeklyTaskCount}
            iconBgColor="#FAAD14"
            iconBgColorEnd="#FFD666"
            onClick={() => router.push('/tasks')}
            loading={overviewLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<CheckCircleOutlined />}
            title="平均通过率"
            value={passRateDisplay}
            iconBgColor={passRateColor}
            iconBgColorEnd={passRate != null && passRate >= 0.8 ? '#95DE64' : '#FFD666'}
            loading={overviewLoading}
          />
        </Col>
      </Row>

      {/* 快速开始 + 最近任务 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={10}>
          <QuickStart />
        </Col>
        <Col xs={24} lg={14}>
          <RecentTasks />
        </Col>
      </Row>

      {/* 趋势图表 */}
      <div className="mt-4">
        <TrendChart
          data={trendData}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          loading={trendsLoading}
        />
      </div>
    </div>
  )
}
