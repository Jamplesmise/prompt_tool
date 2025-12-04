'use client'

import { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Tabs,
  Popconfirm,
  Switch,
  Tooltip,
  Input,
} from 'antd'
import {
  AlertOutlined,
  PlusOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  useAlertRules,
  useAlerts,
  useDeleteAlertRule,
  useToggleAlertRule,
  useAcknowledgeAlert,
  useResolveAlert,
  useCreateAlertRule,
} from '@/hooks/useAlerts'
import { AlertRuleModal } from '@/components/monitor'
import type { AlertRuleListItem, AlertListItem } from '@/services/alerts'
import type { AlertSeverity, AlertStatus } from '@platform/shared'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const severityConfig: Record<AlertSeverity, { color: string; text: string }> = {
  WARNING: { color: 'warning', text: '警告' },
  CRITICAL: { color: 'error', text: '严重' },
  URGENT: { color: 'red', text: '紧急' },
}

const statusConfig: Record<AlertStatus, { color: string; text: string }> = {
  TRIGGERED: { color: 'error', text: '触发' },
  ACKNOWLEDGED: { color: 'processing', text: '已确认' },
  RESOLVED: { color: 'success', text: '已解决' },
}

const metricNames: Record<string, string> = {
  PASS_RATE: '通过率',
  AVG_LATENCY: '平均耗时',
  ERROR_RATE: '错误率',
  COST: '成本',
}

const conditionNames: Record<string, string> = {
  LT: '<',
  GT: '>',
  EQ: '=',
  LTE: '<=',
  GTE: '>=',
}

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('alerts')

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <AlertOutlined style={{ marginRight: 8 }} />
        告警管理
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'alerts', label: '告警列表' },
            { key: 'rules', label: '告警规则' },
          ]}
        />

        {activeTab === 'alerts' ? <AlertsTable /> : <AlertRulesTable />}
      </Card>
    </div>
  )
}

function AlertsTable() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [status, setStatus] = useState<AlertStatus | undefined>()

  const { data, isLoading, refetch } = useAlerts({ page, pageSize, status })
  const acknowledgeMutation = useAcknowledgeAlert()
  const resolveMutation = useResolveAlert()

  const columns: ColumnsType<AlertListItem> = [
    {
      title: '告警规则',
      dataIndex: ['rule', 'name'],
      key: 'ruleName',
      width: 200,
    },
    {
      title: '级别',
      dataIndex: ['rule', 'severity'],
      key: 'severity',
      width: 100,
      render: (severity: AlertSeverity) => {
        const config = severityConfig[severity]
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '指标',
      key: 'metric',
      width: 200,
      render: (_, record) => (
        <Text>
          {metricNames[record.rule.metric]} {conditionNames[record.rule.condition]}{' '}
          {record.rule.threshold}
        </Text>
      ),
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (value, record) => {
        if (record.rule.metric === 'PASS_RATE' || record.rule.metric === 'ERROR_RATE') {
          return `${(value * 100).toFixed(1)}%`
        }
        return value.toFixed(4)
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AlertStatus) => {
        const config = statusConfig[status]
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '触发时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 'TRIGGERED' && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              onClick={async () => {
                await acknowledgeMutation.mutateAsync(record.id)
                refetch()
              }}
              loading={acknowledgeMutation.isPending}
            >
              确认
            </Button>
          )}
          {record.status !== 'RESOLVED' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={async () => {
                await resolveMutation.mutateAsync(record.id)
                refetch()
              }}
              loading={resolveMutation.isPending}
            >
              解决
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
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
  )
}

function AlertRulesTable() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading, refetch } = useAlertRules({ page, pageSize })
  const deleteMutation = useDeleteAlertRule()
  const toggleMutation = useToggleAlertRule()
  const createMutation = useCreateAlertRule()

  const columns: ColumnsType<AlertRuleListItem> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: AlertSeverity) => {
        const config = severityConfig[severity]
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '监控条件',
      key: 'condition',
      width: 250,
      render: (_, record) => (
        <Text code>
          {metricNames[record.metric]} {conditionNames[record.condition]} {record.threshold}{' '}
          (持续 {record.duration} 分钟)
        </Text>
      ),
    },
    {
      title: '活跃告警',
      dataIndex: ['_count', 'alerts'],
      key: 'alertCount',
      width: 100,
      render: (count) =>
        count > 0 ? <Tag color="error">{count}</Tag> : <Tag>{count}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={async () => {
            await toggleMutation.mutateAsync(record.id)
            refetch()
          }}
          loading={toggleMutation.isPending}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确认删除此规则？"
          onConfirm={async () => {
            await deleteMutation.mutateAsync(record.id)
            refetch()
          }}
          okText="确认"
          cancelText="取消"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const handleCreateRule = async (values: {
    name: string
    description?: string
    metric: string
    condition: string
    threshold: number
    duration: number
    severity: string
    silencePeriod: number
    isActive: boolean
  }) => {
    await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutateAsync>[0])
    setModalOpen(false)
    refetch()
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          创建规则
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
      <AlertRuleModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleCreateRule}
        loading={createMutation.isPending}
      />
    </Space>
  )
}
