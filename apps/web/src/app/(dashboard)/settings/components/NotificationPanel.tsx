'use client'

import { useState } from 'react'
import { Switch, Button, Popconfirm, Tag, message } from 'antd'
import { SendOutlined, DeleteOutlined, MailOutlined, ApiOutlined, MessageOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { NotifyChannelType } from '@platform/shared'
import { PRIMARY, SEMANTIC } from '@/theme/colors'
import styles from '../settings.module.css'

const API_BASE = '/api/v1'

type NotifyChannelItem = {
  id: string
  name: string
  type: NotifyChannelType
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

const channelTypeConfig: Record<NotifyChannelType, { icon: React.ReactNode; label: string; color: string }> = {
  EMAIL: { icon: <MailOutlined />, label: '邮件', color: PRIMARY[500] },
  WEBHOOK: { icon: <ApiOutlined />, label: 'Webhook', color: SEMANTIC.success },
  INTERNAL: { icon: <MessageOutlined />, label: '站内消息', color: SEMANTIC.warning },
}

export function NotificationPanel() {
  const queryClient = useQueryClient()
  const [togglingChannelId, setTogglingChannelId] = useState<string | null>(null)
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null)

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['notify-channels'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/notify-channels?page=1&pageSize=100`)
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data as { list: NotifyChannelItem[] }
    },
  })

  const toggleChannelMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      setTogglingChannelId(id)
      const response = await fetch(`${API_BASE}/notify-channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data
    },
    onSuccess: (data) => {
      message.success(data.isActive ? '已启用' : '已禁用')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
    },
    onError: (error: Error) => message.error(error.message || '操作失败'),
    onSettled: () => setTogglingChannelId(null),
  })

  const testChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingChannelId(id)
      const response = await fetch(`${API_BASE}/notify-channels/${id}/test`, { method: 'POST' })
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data
    },
    onSuccess: (data) => {
      if (data.success) message.success('测试通知发送成功')
      else message.error(`测试失败: ${data.error}`)
    },
    onError: (error: Error) => message.error(error.message || '测试失败'),
    onSettled: () => setTestingChannelId(null),
  })

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/notify-channels/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
    },
    onError: (error: Error) => message.error(error.message || '删除失败'),
  })

  if (channelsLoading) {
    return <div className={styles.panelContent}>加载中...</div>
  }

  return (
    <div className={styles.panelContent}>
      <div className={styles.channelGrid}>
        {(channelsData?.list || []).map((channel) => {
          const cfg = channelTypeConfig[channel.type]
          return (
            <div
              key={channel.id}
              className={`${styles.channelCard} ${!channel.isActive ? styles.channelDisabled : ''}`}
            >
              <div className={styles.channelHeader}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className={styles.channelName}>{channel.name}</span>
                <Tag color={cfg.color}>{cfg.label}</Tag>
                <Switch
                  checked={channel.isActive}
                  size="small"
                  loading={togglingChannelId === channel.id}
                  onChange={(checked) =>
                    toggleChannelMutation.mutate({ id: channel.id, isActive: checked })
                  }
                />
              </div>
              <div className={styles.channelActions}>
                <Button
                  type="text"
                  size="small"
                  icon={<SendOutlined />}
                  loading={testingChannelId === channel.id}
                  onClick={() => testChannelMutation.mutate(channel.id)}
                >
                  测试
                </Button>
                <Popconfirm
                  title="确认删除？"
                  onConfirm={() => deleteChannelMutation.mutate(channel.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
