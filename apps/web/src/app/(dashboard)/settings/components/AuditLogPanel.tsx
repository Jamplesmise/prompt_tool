'use client'

import { useState } from 'react'
import { Table, Space, Select, Tag, Button, DatePicker } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { AuditAction, AuditResource } from '@platform/shared'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import type { AuditLogListItem } from '@/services/auditLogs'
import dayjs from 'dayjs'
import styles from '../settings.module.css'

const { RangePicker } = DatePicker

const actionLabels: Record<AuditAction, string> = {
  login: '登录',
  logout: '登出',
  create: '创建',
  update: '更新',
  delete: '删除',
  execute: '执行',
  invite: '邀请',
  remove: '移除',
  transfer: '转让',
}

const actionColors: Record<AuditAction, string> = {
  login: 'green',
  logout: 'default',
  create: 'blue',
  update: 'orange',
  delete: 'red',
  execute: 'purple',
  invite: 'cyan',
  remove: 'magenta',
  transfer: 'gold',
}

const resourceLabels: Record<AuditResource, string> = {
  user: '用户',
  team: '团队',
  member: '成员',
  prompt: '提示词',
  dataset: '数据集',
  model: '模型',
  provider: '供应商',
  evaluator: '评估器',
  task: '任务',
  api_token: 'API Token',
  scheduled_task: '定时任务',
  alert_rule: '告警规则',
  notify_channel: '通知渠道',
}

export function AuditLogPanel() {
  const [logPage, setLogPage] = useState(1)
  const [logFilters, setLogFilters] = useState<{
    action?: AuditAction
    resource?: AuditResource
    startDate?: string
    endDate?: string
  }>({})

  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useAuditLogs({ page: logPage, pageSize: 10, ...logFilters })

  const logColumns: ColumnsType<AuditLogListItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: Date | string) => dayjs(d).format('MM-DD HH:mm:ss'),
    },
    { title: '用户', key: 'user', width: 100, render: (_, r) => r.user.name },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 70,
      render: (a: AuditAction) => <Tag color={actionColors[a]}>{actionLabels[a]}</Tag>,
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 80,
      render: (r: AuditResource) => resourceLabels[r],
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 110,
      render: (ip: string | null) => ip || '-',
    },
  ]

  return (
    <div className={styles.panelContent}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          placeholder="操作"
          allowClear
          style={{ width: 100 }}
          options={Object.entries(actionLabels).map(([v, l]) => ({ value: v, label: l }))}
          value={logFilters.action}
          onChange={(v) => {
            setLogFilters({ ...logFilters, action: v })
            setLogPage(1)
          }}
        />
        <Select
          placeholder="资源"
          allowClear
          style={{ width: 100 }}
          options={Object.entries(resourceLabels).map(([v, l]) => ({ value: v, label: l }))}
          value={logFilters.resource}
          onChange={(v) => {
            setLogFilters({ ...logFilters, resource: v })
            setLogPage(1)
          }}
        />
        <RangePicker
          size="small"
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setLogFilters({
                ...logFilters,
                startDate: dates[0].startOf('day').toISOString(),
                endDate: dates[1].endOf('day').toISOString(),
              })
            } else {
              const { startDate, endDate, ...rest } = logFilters
              setLogFilters(rest)
            }
            setLogPage(1)
          }}
        />
      </Space>
      <Table<AuditLogListItem>
        columns={logColumns}
        dataSource={logsData?.list}
        rowKey="id"
        loading={logsLoading}
        size="small"
        pagination={{
          current: logPage,
          pageSize: 10,
          total: logsData?.total,
          onChange: setLogPage,
          showSizeChanger: false,
        }}
      />
    </div>
  )
}

// 导出面板头部额外按钮
export function AuditLogPanelExtra({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="small"
      icon={<ReloadOutlined />}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      刷新
    </Button>
  )
}
