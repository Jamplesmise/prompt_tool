'use client'

import { Card, List, Button, Empty, Spin, Space, Progress } from 'antd'
import { EyeOutlined, PlayCircleOutlined, ClockCircleOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useRecentTasks } from '@/hooks/useStats'
import { StatusBadge } from '@/components/common'
import type { StatusType } from '@/components/common'
import type { TaskStatus, TaskListItem } from '@/services/stats'
import { PRIMARY } from '@/theme/colors'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 任务状态映射到 StatusBadge 类型
const statusTypeMap: Record<TaskStatus, StatusType> = {
  PENDING: 'default',
  RUNNING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
  STOPPED: 'warning',
}

// 任务状态文字
const statusTextMap: Record<TaskStatus, string> = {
  PENDING: '待执行',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  FAILED: '失败',
  STOPPED: '已停止',
}

export function RecentTasks() {
  const router = useRouter()
  const { data, isLoading } = useRecentTasks(10)

  const tasks = data?.list ?? []

  const renderTaskItem = (task: TaskListItem) => {
    const progress = task.progress
    const progressPercent =
      progress.total > 0
        ? Math.round(((progress.completed + progress.failed) / progress.total) * 100)
        : 0

    return (
      <List.Item
        actions={[
          <Button
            key="view"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/tasks/${task.id}`)}
            style={{ color: PRIMARY[500] }}
          >
            查看
          </Button>,
        ]}
      >
        <List.Item.Meta
          title={
            <Space>
              <span className="font-medium">{task.name}</span>
              <StatusBadge
                status={statusTypeMap[task.status]}
                text={statusTextMap[task.status]}
                dot={task.status === 'RUNNING'}
              />
            </Space>
          }
          description={
            <Space direction="vertical" size={4} className="w-full">
              <Space size="middle">
                {task.stats.passRate != null && (
                  <span style={{ color: '#10B981' }}>
                    通过率: {(task.stats.passRate * 100).toFixed(0)}%
                  </span>
                )}
                <span className="text-gray-400">
                  <ClockCircleOutlined className="mr-1" />
                  {dayjs(task.createdAt).fromNow()}
                </span>
              </Space>
              {task.status === 'RUNNING' && (
                <Progress
                  percent={progressPercent}
                  size="small"
                  status="active"
                  strokeColor={PRIMARY[500]}
                  format={() => `${progress.completed}/${progress.total}`}
                />
              )}
            </Space>
          }
        />
      </List.Item>
    )
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <UnorderedListOutlined style={{ color: PRIMARY[500] }} />
          最近任务
        </span>
      }
      extra={
        <Button type="link" onClick={() => router.push('/tasks')} style={{ color: PRIMARY[500] }}>
          查看全部
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : tasks.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-gray-500">
              暂无测试任务
              <br />
              <span className="text-sm">创建你的第一个测试任务吧</span>
            </span>
          }
        >
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => router.push('/tasks/new')}
            style={{
              background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
              border: 'none',
              boxShadow: `0 4px 12px ${PRIMARY[500]}40`,
            }}
          >
            创建任务
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={tasks}
          renderItem={renderTaskItem}
          size="small"
        />
      )}
    </Card>
  )
}
