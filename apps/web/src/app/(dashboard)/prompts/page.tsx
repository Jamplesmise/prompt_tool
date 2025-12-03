'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Table, Space, Popconfirm, Tag, Typography } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { usePrompts, useDeletePrompt } from '@/hooks/usePrompts'
import { LoadingState, ErrorState, EmptyState } from '@/components/common'
import type { PromptListItem } from '@/services/prompts'

const { Title } = Typography

export default function PromptsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')

  const { data, isLoading, error, refetch } = usePrompts({ page, pageSize, keyword })
  const deletePrompt = useDeletePrompt()

  // 加载状态
  if (isLoading && !data) {
    return <LoadingState />
  }

  // 错误状态
  if (error) {
    return <ErrorState message="获取提示词列表失败" onRetry={() => refetch()} />
  }

  const handleSearch = () => {
    setKeyword(searchValue)
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    await deletePrompt.mutateAsync(id)
  }

  const columns: ColumnsType<PromptListItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <a onClick={() => router.push(`/prompts/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '当前版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 100,
      align: 'center',
      render: (version) => <Tag color="blue">v{version}</Tag>,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) =>
        tags?.length > 0 ? (
          <Space size={4} wrap>
            {tags.slice(0, 3).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      sorter: true,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => router.push(`/prompts/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          提示词管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/prompts/new')}>
          新建提示词
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="搜索提示词名称或描述"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Button onClick={handleSearch}>搜索</Button>
        </Space>
      </div>

      {data?.list?.length === 0 && !keyword ? (
        <EmptyState
          description="暂无提示词"
          actionText="新建提示词"
          onAction={() => router.push('/prompts/new')}
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
            emptyText: keyword ? '未找到匹配的提示词' : '暂无数据',
          }}
        />
      )}
    </div>
  )
}
