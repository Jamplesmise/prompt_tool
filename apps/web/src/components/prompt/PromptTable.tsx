'use client'

import { useState } from 'react'
import { Table, Tag, Space, Button, Popconfirm, Tooltip } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { TAG_COLORS } from './TagSelect'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

type PromptItem = {
  id: string
  name: string
  description?: string | null
  currentVersion: number
  tags: string[]
  updatedAt: string
  createdBy?: string
}

type PromptTableProps = {
  data: PromptItem[]
  loading?: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onEdit?: (id: string) => void
  onTest?: (id: string) => void
  onCopy?: (id: string) => void
  onDelete?: (id: string) => void
  onPreview?: (id: string) => void
  pagination: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
}

export function PromptTable({
  data,
  loading,
  selectedIds,
  onSelectionChange,
  onEdit,
  onTest,
  onCopy,
  onDelete,
  onPreview,
  pagination,
}: PromptTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const getTagColor = (tag: string) => TAG_COLORS[tag] || TAG_COLORS.default

  const columns: ColumnsType<PromptItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (name, record) => (
        <a
          onClick={() => onPreview?.(record.id)}
          style={{ fontWeight: 500, color: '#1677ff' }}
        >
          {name}
        </a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      ellipsis: { showTitle: true },
      render: (text) => (
        <span style={{ color: '#666' }}>{text || '-'}</span>
      ),
    },
    {
      title: '版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 80,
      align: 'center',
      render: (version) => (
        <Tag color="blue" style={{ margin: 0 }}>
          v{version}
        </Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: '15%',
      render: (tags: string[]) =>
        tags?.length > 0 ? (
          <Space size={4} wrap>
            {tags.slice(0, 2).map((tag) => (
              <Tag key={tag} color={getTagColor(tag)} style={{ margin: 0 }}>
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && (
              <Tooltip title={tags.slice(2).join(', ')}>
                <Tag style={{ margin: 0 }}>+{tags.length - 2}</Tag>
              </Tooltip>
            )}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '15%',
      sorter: true,
      render: (date) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <span style={{ color: '#666' }}>{dayjs(date).fromNow()}</span>
        </Tooltip>
      ),
    },
  ]

  // 展开行渲染快捷操作
  const expandedRowRender = (record: PromptItem) => (
    <div
      style={{
        padding: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ color: '#999', marginRight: 8 }}>快捷操作:</span>
      <Button
        type="text"
        size="small"
        icon={<EditOutlined />}
        onClick={() => onEdit?.(record.id)}
      >
        编辑
      </Button>
      <Button
        type="text"
        size="small"
        icon={<PlayCircleOutlined />}
        onClick={() => onTest?.(record.id)}
      >
        测试
      </Button>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => onCopy?.(record.id)}
      >
        复制
      </Button>
      <Popconfirm
        title="确认删除"
        description="删除后无法恢复，确定要删除吗？"
        onConfirm={() => onDelete?.(record.id)}
        okText="确定"
        cancelText="取消"
      >
        <Button type="text" size="small" danger icon={<DeleteOutlined />}>
          删除
        </Button>
      </Popconfirm>
    </div>
  )

  // 点击行切换展开/折叠
  const handleRowClick = (record: PromptItem) => {
    setExpandedRowId((prev) => (prev === record.id ? null : record.id))
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectionChange(keys as string[]),
      }}
      expandable={{
        expandedRowRender,
        expandRowByClick: false,
        expandedRowKeys: expandedRowId ? [expandedRowId] : [],
        showExpandColumn: false,
      }}
      onRow={(record) => ({
        onClick: () => handleRowClick(record),
        style: {
          cursor: 'pointer',
        },
      })}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: pagination.onChange,
      }}
      locale={{
        emptyText: '暂无提示词',
      }}
    />
  )
}

export type { PromptItem, PromptTableProps }
