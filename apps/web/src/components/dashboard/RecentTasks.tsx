'use client'

import { Card, List, Tag, Button, Empty, Spin, Space, Progress } from 'antd'
import { EyeOutlined, PlayCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useRecentTasks } from '@/hooks/useStats'
import type { TaskStatus, TaskListItem } from '@/services/stats'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 任务状态标签颜色
const statusColorMap: Record<TaskStatus, string> = {
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
          >
            查看
          </Button>,
        ]}
      >
        <List.Item.Meta
          title={
            <Space>
              <span>{task.name}</span>
              <Tag color={statusColorMap[task.status]}>
                {statusTextMap[task.status]}
              </Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4} className="w-full">
              <Space size="middle">
                {task.stats.passRate != null && (
                  <span className="text-green-600">
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
      title="最近任务"
      extra={
        <Button type="link" onClick={() => router.push('/tasks')}>
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
          description="暂无任务"
        >
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => router.push('/tasks/new')}
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
