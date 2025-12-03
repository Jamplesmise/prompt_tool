'use client'

import { Card, Descriptions, Statistic, Row, Col, Space, Typography, Tag } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { TaskStatusTag } from './TaskStatusTag'
import { TaskProgressBar } from './TaskProgress'
import type { TaskDetail } from '@/services/tasks'
import type { TaskProgress } from '@platform/shared'

const { Text } = Typography

type TaskOverviewProps = {
  task: TaskDetail
  progress?: TaskProgress
}

export function TaskOverview({ task, progress }: TaskOverviewProps) {
  const currentProgress = progress || task.progress
  const stats = task.stats

  return (
    <div>
      {/* 基本信息 */}
      <Card title="任务信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="任务名称">{task.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <TaskStatusTag status={task.status} />
          </Descriptions.Item>
          <Descriptions.Item label="描述">{task.description || '-'}</Descriptions.Item>
          <Descriptions.Item label="数据集">{task.dataset.name}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {task.startedAt ? dayjs(task.startedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {task.completedAt ? dayjs(task.completedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="执行时长">
            {task.startedAt && task.completedAt
              ? `${Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000)} 秒`
              : '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* 进度条 */}
        {['RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'STOPPED'].includes(task.status) && (
          <div style={{ marginTop: 16 }}>
            <Text strong>执行进度</Text>
            <TaskProgressBar progress={currentProgress} />
          </div>
        )}
      </Card>

      {/* 统计数据 */}
      <Card title="统计数据" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="通过率"
              value={stats?.passRate !== undefined && stats?.passRate !== null ? (stats.passRate * 100).toFixed(1) : '-'}
              suffix={stats?.passRate !== undefined && stats?.passRate !== null ? '%' : ''}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均耗时"
              value={stats?.avgLatencyMs ?? '-'}
              suffix={stats?.avgLatencyMs !== undefined ? 'ms' : ''}
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总 Token"
              value={stats?.totalTokens ?? '-'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总费用"
              value={stats?.totalCost !== undefined ? stats.totalCost.toFixed(4) : '-'}
              prefix={stats?.totalCost !== undefined ? <DollarOutlined /> : undefined}
            />
          </Col>
        </Row>
      </Card>

      {/* 配置信息 */}
      <Card title="测试配置">
        <Row gutter={24}>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>提示词</Text>
              <div style={{ marginTop: 8 }}>
                {task.prompts.map((p) => (
                  <Tag key={p.promptId} color="blue">
                    {p.promptName} (v{p.version})
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>模型</Text>
              <div style={{ marginTop: 8 }}>
                {task.models.map((m) => (
                  <Tag key={m.modelId} color="green">
                    {m.modelName}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>评估器</Text>
              <div style={{ marginTop: 8 }}>
                {task.evaluators.map((e) => (
                  <Tag key={e.evaluatorId} color="orange">
                    {e.evaluatorName}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
