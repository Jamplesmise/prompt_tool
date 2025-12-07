'use client'

import { Row, Col, Typography, Button } from 'antd'
import {
  FileTextOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StatCard } from '@/components/common'
import { QuickStart, RecentTasks, TrendChart } from '@/components/dashboard'
import { OnboardingWrapper } from '@/components/onboarding'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useOnboarding } from '@/hooks/useOnboarding'

const { Title } = Typography

export default function DashboardPage() {
  const router = useRouter()
  const { canRestartOnboarding, resetOnboarding } = useOnboarding()
  const {
    promptCount,
    datasetCount,
    weeklyTaskCount,
    passRate,
    trendData,
    overviewLoading,
    trendsLoading,
    timeRange,
    setTimeRange,
  } = useDashboardStats()

  const passRateDisplay = passRate != null ? `${(passRate * 100).toFixed(1)}%` : '-'

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <Title level={4} className="!mb-0">
          工作台
        </Title>
        {canRestartOnboarding && (
          <Button
            type="text"
            icon={<Rocket size={16} />}
            onClick={resetOnboarding}
          >
            重新开始引导
          </Button>
        )}
      </div>

      {/* 新用户引导弹窗 */}
      <OnboardingWrapper />

      {/* 统计卡片行 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<FileTextOutlined />}
            iconBg="primary"
            title="提示词总数"
            value={promptCount}
            onClick={() => router.push('/prompts')}
            loading={overviewLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<DatabaseOutlined />}
            iconBg="success"
            title="数据集总数"
            value={datasetCount}
            onClick={() => router.push('/datasets')}
            loading={overviewLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<ThunderboltOutlined />}
            iconBg="warning"
            title="本周任务数"
            value={weeklyTaskCount}
            onClick={() => router.push('/tasks')}
            loading={overviewLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<CheckCircleOutlined />}
            iconBg="info"
            title="平均通过率"
            value={passRateDisplay}
            loading={overviewLoading}
          />
        </Col>
      </Row>

      {/* 快速开始 + 最近任务 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} md={24} lg={10}>
          <QuickStart />
        </Col>
        <Col xs={24} md={24} lg={14}>
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
