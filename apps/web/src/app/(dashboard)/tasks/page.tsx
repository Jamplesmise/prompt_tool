'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Table, Space, Popconfirm, Select, Typography, Tooltip, Dropdown, Tag } from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  DownOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useTasks, useDeleteTask, useRunTask, useStopTask, useRetryTask } from '@/hooks/useTasks'
import { TaskStatusTag } from '@/components/task/TaskStatusTag'
import { CompactProgress } from '@/components/task/TaskProgress'
import { LoadingState, ErrorState, EmptyState } from '@/components/common'
import type { TaskListItem } from '@/services/tasks'
import type { TaskStatus } from '@platform/shared'

const { Title } = Typography

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待执行' },
  { value: 'RUNNING', label: '执行中' },
  { value: 'PAUSED', label: '已暂停' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
  { value: 'STOPPED', label: '已终止' },
]

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'STANDARD', label: '标准测试' },
  { value: 'AB_TEST', label: 'A/B 测试' },
]

export default function TasksPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [taskType, setTaskType] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')

  const { data, isLoading, error, refetch } = useTasks({
    page,
    pageSize,
    status: status || undefined,
    type: taskType || undefined,
    keyword: keyword || undefined,
  })

  const deleteTask = useDeleteTask()
  const runTask = useRunTask()
  const stopTask = useStopTask()
  const retryTask = useRetryTask()

  // 加载状态
  if (isLoading && !data) {
    return <LoadingState />
  }

  // 错误状态
  if (error) {
    return <ErrorState message="获取任务列表失败" onRetry={() => refetch()} />
  }

  const handleSearch = () => {
    setKeyword(searchValue)
    setPage(1)
  }

  const columns: ColumnsType<TaskListItem> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <a onClick={() => router.push(`/tasks/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'AB_TEST' ? 'purple' : 'blue'}>
          {type === 'AB_TEST' ? 'A/B 测试' : '标准'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: TaskStatus, record) => (
        <Space size={4}>
          <TaskStatusTag status={status} />
          {record.queueState === 'waiting' && (
            <Tooltip title={`队列中等待，位置 #${record.queuePosition || '?'}`}>
              <Tag color="orange">排队中</Tag>
            </Tooltip>
          )}
          {record.queueState === 'active' && (
            <Tooltip title="正在执行">
              <Tag color="processing">执行中</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress) => <CompactProgress progress={progress} />,
    },
    {
      title: '通过率',
      dataIndex: 'stats',
      key: 'passRate',
      width: 100,
      align: 'center',
      render: (stats) => {
        if (stats?.passRate === undefined || stats?.passRate === null) {
          return '-'
        }
        const rate = (stats.passRate * 100).toFixed(1)
        return `${rate}%`
      },
    },
    {
      title: '费用',
      dataIndex: 'stats',
      key: 'totalCost',
      width: 100,
      align: 'right',
      render: (stats) => {
        if (stats?.totalCost === undefined || stats?.totalCost === null) {
          return '-'
        }
        return `$${stats.totalCost.toFixed(4)}`
      },
    },
    {
      title: '数据集',
      dataIndex: 'dataset',
      key: 'dataset',
      width: 150,
      render: (dataset) => dataset?.name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/tasks/${record.id}`)}
            />
          </Tooltip>

          {record.status === 'PENDING' && !record.queueState && (
            <Tooltip title="启动任务">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => runTask.mutate(record.id)}
                loading={runTask.isPending}
              />
            </Tooltip>
          )}

          {(record.status === 'RUNNING' || record.queueState === 'active') && (
            <Tooltip title="终止任务">
              <Button
                type="text"
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => stopTask.mutate(record.id)}
                loading={stopTask.isPending}
              />
            </Tooltip>
          )}

          {['COMPLETED', 'FAILED', 'STOPPED'].includes(record.status) &&
            record.progress.failed > 0 && (
              <Tooltip title="重试失败用例">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => retryTask.mutate(record.id)}
                  loading={retryTask.isPending}
                />
              </Tooltip>
            )}

          {record.status !== 'RUNNING' && (
            <Popconfirm
              title="确认删除"
              description="删除后无法恢复，确定要删除吗？"
              onConfirm={() => deleteTask.mutate(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除任务">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteTask.isPending}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          测试任务
        </Title>
        <Dropdown
          menu={{
            items: [
              {
                key: 'standard',
                icon: <PlusOutlined />,
                label: '标准测试任务',
                onClick: () => router.push('/tasks/new'),
              },
              {
                key: 'ab',
                icon: <ExperimentOutlined />,
                label: 'A/B 测试任务',
                onClick: () => router.push('/tasks/new-ab'),
              },
            ],
          }}
        >
          <Button type="primary" icon={<PlusOutlined />}>
            创建任务 <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="搜索任务名称"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={taskType}
            onChange={(v) => {
              setTaskType(v)
              setPage(1)
            }}
            options={TYPE_OPTIONS}
            style={{ width: 120 }}
          />
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={STATUS_OPTIONS}
            style={{ width: 120 }}
          />
          <Button onClick={handleSearch}>搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>
      </div>

      {data?.list?.length === 0 && !keyword && !status ? (
        <EmptyState
          description="暂无测试任务"
          actionText="创建任务"
          onAction={() => router.push('/tasks/new')}
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.list || []}
          loading={isLoading}
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
          locale={{
            emptyText: keyword || status ? '未找到匹配的任务' : '暂无数据',
          }}
        />
      )}
    </div>
  )
}
