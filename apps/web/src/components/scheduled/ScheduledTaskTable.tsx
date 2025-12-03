'use client'

import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Popconfirm,
  Typography,
  Tooltip,
  Input,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  SearchOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  useScheduledTasks,
  useDeleteScheduledTask,
  useToggleScheduledTask,
  useRunScheduledTaskNow,
} from '@/hooks/useScheduledTasks'
import type { ScheduledTaskListItem } from '@/services/scheduledTasks'
import dayjs from 'dayjs'

const { Text } = Typography

type ScheduledTaskTableProps = {
  onCreateClick: () => void
  onEditClick: (task: ScheduledTaskListItem) => void
  onHistoryClick: (task: ScheduledTaskListItem) => void
}

export default function ScheduledTaskTable({
  onCreateClick,
  onEditClick,
  onHistoryClick,
}: ScheduledTaskTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')

  const { data, isLoading, refetch } = useScheduledTasks({
    page,
    pageSize,
    keyword: keyword || undefined,
  })

  const deleteMutation = useDeleteScheduledTask()
  const toggleMutation = useToggleScheduledTask()
  const runNowMutation = useRunScheduledTaskNow()

  const handleSearch = () => {
    setKeyword(searchValue)
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
    refetch()
  }

  const handleToggle = async (id: string) => {
    await toggleMutation.mutateAsync(id)
    refetch()
  }

  const handleRunNow = async (id: string) => {
    await runNowMutation.mutateAsync(id)
  }

  const columns: ColumnsType<ScheduledTaskListItem> = [
    {
      title: '名称',
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
      title: '任务模板',
      dataIndex: ['taskTemplate', 'name'],
      key: 'taskTemplate',
      width: 180,
      render: (name) => <Tag>{name}</Tag>,
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      width: 150,
      render: (cron) => (
        <Text code style={{ fontSize: 12 }}>
          {cron}
        </Text>
      ),
    },
    {
      title: '上次执行',
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      width: 160,
      render: (time) =>
        time ? (
          <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
            <Text>{dayjs(time).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '下次执行',
      dataIndex: 'nextRunAt',
      key: 'nextRunAt',
      width: 160,
      render: (time, record) =>
        record.isActive && time ? (
          <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
            <Text type="success">{dayjs(time).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '执行次数',
      dataIndex: ['_count', 'executions'],
      key: 'executionCount',
      width: 100,
      align: 'center',
      render: (count) => <Tag>{count}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggle(record.id)}
          loading={toggleMutation.isPending}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="立即执行">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRunNow(record.id)}
              loading={runNowMutation.isPending}
              disabled={!record.isActive}
            />
          </Tooltip>
          <Tooltip title="执行历史">
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => onHistoryClick(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditClick(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="删除后将无法恢复，确认删除？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search
            placeholder="搜索定时任务名称"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 250 }}
            enterButton={<SearchOutlined />}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateClick}>
          创建定时任务
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data?.list}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1200 }}
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
    </Space>
  )
}
