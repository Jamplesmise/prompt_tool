'use client'

import { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Popconfirm, Switch, message } from 'antd'
import {
  BellOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  MailOutlined,
  ApiOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { NotifyChannelType } from '@platform/shared'
import dayjs from 'dayjs'
import { CreateChannelModal } from '@/components/notifications'

const { Title, Text } = Typography

const API_BASE = '/api/v1'

type NotifyChannelItem = {
  id: string
  name: string
  type: NotifyChannelType
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

type PaginatedResponse = {
  list: NotifyChannelItem[]
  total: number
  page: number
  pageSize: number
}

const typeConfig: Record<NotifyChannelType, { icon: React.ReactNode; text: string; color: string }> = {
  EMAIL: { icon: <MailOutlined />, text: '邮件', color: 'blue' },
  WEBHOOK: { icon: <ApiOutlined />, text: 'Webhook', color: 'green' },
  INTERNAL: { icon: <MessageOutlined />, text: '站内消息', color: 'orange' },
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notify-channels', page, pageSize],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE}/notify-channels?page=${page}&pageSize=${pageSize}`
      )
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error(result.message)
      }
      return result.data as PaginatedResponse
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/notify-channels/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error(result.message)
      }
      return result.data
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '删除失败')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`${API_BASE}/notify-channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error(result.message)
      }
      return result.data
    },
    onSuccess: (data) => {
      message.success(data.isActive ? '已启用' : '已禁用')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '操作失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/notify-channels/${id}/test`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error(result.message)
      }
      return result.data
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success('测试通知发送成功')
      } else {
        message.error(`测试失败: ${data.error}`)
      }
    },
    onError: (error: Error) => {
      message.error(error.message || '测试失败')
    },
  })

  const columns: ColumnsType<NotifyChannelItem> = [
    {
      title: '渠道名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: NotifyChannelType) => {
        const config = typeConfig[type]
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: '配置信息',
      key: 'config',
      width: 300,
      render: (_, record) => {
        if (record.type === 'EMAIL') {
          const config = record.config as { recipients?: string[] }
          return (
            <Text type="secondary" ellipsis>
              收件人: {config.recipients?.join(', ') || '-'}
            </Text>
          )
        }
        if (record.type === 'WEBHOOK') {
          const config = record.config as { url?: string }
          return (
            <Text type="secondary" ellipsis style={{ maxWidth: 280 }}>
              URL: {config.url || '-'}
            </Text>
          )
        }
        return <Text type="secondary">-</Text>
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) =>
            toggleMutation.mutate({ id: record.id, isActive: checked })
          }
          loading={toggleMutation.isPending}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<SendOutlined />}
            onClick={() => testMutation.mutate(record.id)}
            loading={testMutation.isPending}
          >
            测试
          </Button>
          <Popconfirm
            title="确认删除此渠道？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <BellOutlined style={{ marginRight: 8 }} />
        通知渠道
      </Title>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              添加渠道
            </Button>
          </div>

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
              showTotal: (total) => `共 ${total} 条`,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            }}
          />
        </Space>
      </Card>

      <CreateChannelModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
