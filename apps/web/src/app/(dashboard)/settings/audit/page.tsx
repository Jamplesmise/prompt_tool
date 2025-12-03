'use client'

import { useState } from 'react'
import { Card, Table, Tag, Space, Typography, DatePicker, Select, Button, Avatar } from 'antd'
import { AuditOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import type { AuditLogListItem } from '@/services/auditLogs'
import type { ColumnsType } from 'antd/es/table'
import type { AuditAction, AuditResource } from '@platform/shared'
import dayjs from 'dayjs'

const { Title } = Typography
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
  project: '项目',
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

const actionOptions = Object.entries(actionLabels).map(([value, label]) => ({
  value,
  label,
}))

const resourceOptions = Object.entries(resourceLabels).map(([value, label]) => ({
  value,
  label,
}))

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{
    action?: AuditAction
    resource?: AuditResource
    startDate?: string
    endDate?: string
  }>({})

  const { data, isLoading, refetch } = useAuditLogs({
    page,
    pageSize: 20,
    ...filters,
  })

  const columns: ColumnsType<AuditLogListItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: Date | string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '用户',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div>{record.user.name}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{record.user.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 80,
      render: (action: AuditAction) => (
        <Tag color={actionColors[action]}>{actionLabels[action]}</Tag>
      ),
    },
    {
      title: '资源类型',
      dataIndex: 'resource',
      key: 'resource',
      width: 100,
      render: (resource: AuditResource) => resourceLabels[resource],
    },
    {
      title: '资源 ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 120,
      ellipsis: true,
      render: (id: string | null) => id || '-',
    },
    {
      title: '项目',
      key: 'project',
      width: 120,
      render: (_, record) => record.project?.name || '-',
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 120,
      render: (ip: string | null) => ip || '-',
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details: Record<string, unknown> | null) =>
        details ? JSON.stringify(details) : '-',
    },
  ]

  const handleDateChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters({
        ...filters,
        startDate: dates[0].startOf('day').toISOString(),
        endDate: dates[1].endOf('day').toISOString(),
      })
    } else {
      const { startDate, endDate, ...rest } = filters
      setFilters(rest)
    }
    setPage(1)
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <AuditOutlined style={{ marginRight: 8 }} />
          操作日志
        </Title>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="操作类型"
          allowClear
          style={{ width: 120 }}
          options={actionOptions}
          value={filters.action}
          onChange={(action) => {
            setFilters({ ...filters, action })
            setPage(1)
          }}
        />
        <Select
          placeholder="资源类型"
          allowClear
          style={{ width: 120 }}
          options={resourceOptions}
          value={filters.resource}
          onChange={(resource) => {
            setFilters({ ...filters, resource })
            setPage(1)
          }}
        />
        <RangePicker onChange={handleDateChange} />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          刷新
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.list}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total,
          onChange: setPage,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />
    </Card>
  )
}
