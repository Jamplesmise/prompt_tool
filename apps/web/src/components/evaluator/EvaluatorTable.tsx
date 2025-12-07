'use client'

import { Table, Button, Space, Popconfirm, Tag, Typography } from 'antd'
import { EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useEvaluators, useDeleteEvaluator } from '@/hooks/useEvaluators'
import type { ColumnsType } from 'antd/es/table'
import type { EvaluatorListItem } from '@/services/evaluators'
import dayjs from 'dayjs'

const { Text } = Typography

// 类型标签映射
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  code: { label: '代码', color: 'blue' },
  preset: { label: '预置', color: 'green' },
  llm: { label: 'LLM', color: 'purple' },
  composite: { label: '组合', color: 'orange' },
}

export function EvaluatorTable() {
  const router = useRouter()
  // 获取所有用户创建的评估器（不包括系统预置）
  const { data: evaluators, isLoading } = useEvaluators()
  const deleteMutation = useDeleteEvaluator()

  // 过滤掉系统预置的评估器
  const customEvaluators = evaluators?.filter((e) => !e.isPreset) || []

  const handleEdit = (id: string) => {
    router.push(`/evaluators/${id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const columns: ColumnsType<EvaluatorListItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <Button type="link" onClick={() => handleEdit(record.id)} style={{ padding: 0 }}>
          {name}
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeInfo = TYPE_LABELS[type] || { label: type, color: 'default' }
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string | null) => (
        <Text type="secondary">{desc || '-'}</Text>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleEdit(record.id)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          />
          <Popconfirm
            title="确定删除此评估器？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={customEvaluators}
      rowKey="id"
      loading={isLoading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  )
}
