'use client'

import { useState } from 'react'
import { Table, Space, Button, Input, Select, Tooltip, Typography } from 'antd'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTaskResults } from '@/hooks/useTasks'
import { ResultStatusTag, EvaluationTag } from './TaskStatusTag'
import type { TaskResultItem } from '@/services/tasks'

const { Text } = Typography

type ResultTableProps = {
  taskId: string
  onViewDetail: (result: TaskResultItem) => void
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAILED', label: '失败' },
  { value: 'TIMEOUT', label: '超时' },
  { value: 'ERROR', label: '错误' },
]

const PASSED_OPTIONS = [
  { value: '', label: '全部结果' },
  { value: 'true', label: '通过' },
  { value: 'false', label: '未通过' },
]

export function ResultTable({ taskId, onViewDetail }: ResultTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState('')
  const [passed, setPassed] = useState('')

  const { data, isLoading } = useTaskResults(taskId, {
    page,
    pageSize,
    status: status || undefined,
    passed: passed === '' ? undefined : passed === 'true',
  })

  const columns: ColumnsType<TaskResultItem> = [
    {
      title: '序号',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 80,
      align: 'center',
      render: (index) => index + 1,
    },
    {
      title: '提示词',
      dataIndex: 'promptName',
      key: 'promptName',
      width: 150,
      render: (name, record) => (
        <Tooltip title={`v${record.promptVersion}`}>
          {name}
        </Tooltip>
      ),
    },
    {
      title: '模型',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 150,
    },
    {
      title: '输入摘要',
      dataIndex: 'input',
      key: 'input',
      width: 200,
      ellipsis: true,
      render: (input) => {
        const str = JSON.stringify(input)
        return str.length > 50 ? str.slice(0, 50) + '...' : str
      },
    },
    {
      title: '输出摘要',
      dataIndex: 'output',
      key: 'output',
      width: 200,
      ellipsis: true,
      render: (output) => {
        if (!output) return '-'
        return output.length > 50 ? output.slice(0, 50) + '...' : output
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status) => <ResultStatusTag status={status} />,
    },
    {
      title: '评估结果',
      dataIndex: 'evaluations',
      key: 'evaluations',
      width: 120,
      align: 'center',
      render: (evaluations: TaskResultItem['evaluations']) => {
        if (!evaluations || evaluations.length === 0) return '-'
        const allPassed = evaluations.every((e) => e.passed)
        const avgScore =
          evaluations.reduce((sum, e) => sum + (e.score ?? (e.passed ? 1 : 0)), 0) /
          evaluations.length
        return <EvaluationTag passed={allPassed} score={avgScore} />
      },
    },
    {
      title: '耗时',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      width: 100,
      align: 'center',
      render: (latency) => (latency ? `${latency}ms` : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="查看详情">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={STATUS_OPTIONS}
            style={{ width: 120 }}
            placeholder="执行状态"
          />
          <Select
            value={passed}
            onChange={(v) => {
              setPassed(v)
              setPage(1)
            }}
            options={PASSED_OPTIONS}
            style={{ width: 120 }}
            placeholder="评估结果"
          />
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.list || []}
        loading={isLoading}
        size="small"
        scroll={{ x: 1200 }}
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
    </div>
  )
}
