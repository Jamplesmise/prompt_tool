'use client'

import { useState } from 'react'
import { Modal, Table, Tag, Space, Typography, Button } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useScheduledTaskExecutions } from '@/hooks/useScheduledTasks'
import type { ScheduledTaskListItem, ScheduledExecutionItem } from '@/services/scheduledTasks'
import dayjs from 'dayjs'
import Link from 'next/link'

const { Text } = Typography

type ExecutionHistoryProps = {
  open: boolean
  onClose: () => void
  scheduledTask: ScheduledTaskListItem | null
}

const statusConfig: Record<
  string,
  { color: string; icon: React.ReactNode; text: string }
> = {
  PENDING: {
    color: 'processing',
    icon: <SyncOutlined spin />,
    text: '执行中',
  },
  SUCCESS: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    text: '成功',
  },
  FAILED: {
    color: 'error',
    icon: <CloseCircleOutlined />,
    text: '失败',
  },
}

export default function ExecutionHistory({
  open,
  onClose,
  scheduledTask,
}: ExecutionHistoryProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useScheduledTaskExecutions(
    scheduledTask?.id || '',
    { page, pageSize }
  )

  const columns: ColumnsType<ScheduledExecutionItem> = [
    {
      title: '执行时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = statusConfig[status] || statusConfig.PENDING
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: '执行的任务',
      dataIndex: ['task', 'name'],
      key: 'taskName',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Text>{name || '-'}</Text>
          {record.task?.status && (
            <Tag style={{ fontSize: 12 }}>
              {record.task.status === 'COMPLETED'
                ? '已完成'
                : record.task.status === 'RUNNING'
                ? '执行中'
                : record.task.status === 'FAILED'
                ? '失败'
                : record.task.status}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      width: 200,
      render: (error) =>
        error ? (
          <Text type="danger" ellipsis={{ tooltip: error }} style={{ maxWidth: 180 }}>
            {error}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) =>
        record.task?.id && record.status === 'SUCCESS' ? (
          <Link href={`/tasks/${record.task.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              查看结果
            </Button>
          </Link>
        ) : null,
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <span>执行历史</span>
          {scheduledTask && <Tag>{scheduledTask.name}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <Table
        columns={columns}
        dataSource={data?.list}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />
    </Modal>
  )
}
