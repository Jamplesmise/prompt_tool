'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Table, Space, Popconfirm, Tag, Typography, Dropdown } from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useDatasets, useDeleteDataset, useCreateDataset, useUploadDataset } from '@/hooks/useDatasets'
import { datasetsService } from '@/services/datasets'
import { UploadModal } from '@/components/dataset'
import { LoadingState, ErrorState, EmptyState } from '@/components/common'
import type { DatasetListItem } from '@/services/datasets'

const { Title } = Typography

export default function DatasetsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const { data, isLoading, error, refetch } = useDatasets({ page, pageSize, keyword })
  const deleteDataset = useDeleteDataset()
  const createDataset = useCreateDataset()
  const uploadDataset = useUploadDataset()

  // 加载状态
  if (isLoading && !data) {
    return <LoadingState />
  }

  // 错误状态
  if (error) {
    return <ErrorState message="获取数据集列表失败" onRetry={() => refetch()} />
  }

  const handleSearch = () => {
    setKeyword(searchValue)
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    await deleteDataset.mutateAsync(id)
  }

  const handleUpload = async (
    file: File,
    isPersistent: boolean,
    fieldMapping: Record<string, string>
  ) => {
    // 先创建数据集
    const dataset = await createDataset.mutateAsync({
      name: file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
      isPersistent,
    })

    // 然后上传文件
    await uploadDataset.mutateAsync({
      id: dataset.id,
      data: { file, isPersistent, fieldMapping },
    })

    setUploadModalOpen(false)
  }

  const templateMenuItems: MenuProps['items'] = [
    {
      key: 'basic',
      label: '基础模板',
      onClick: () => datasetsService.downloadTemplate('basic'),
    },
    {
      key: 'with-expected',
      label: '带期望输出模板',
      onClick: () => datasetsService.downloadTemplate('with-expected'),
    },
  ]

  const columns: ColumnsType<DatasetListItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <a onClick={() => router.push(`/datasets/${record.id}`)}>{name}</a>
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
      title: '行数',
      dataIndex: 'rowCount',
      key: 'rowCount',
      width: 100,
      align: 'center',
    },
    {
      title: '存储方式',
      dataIndex: 'isPersistent',
      key: 'isPersistent',
      width: 100,
      render: (isPersistent) => (
        <Tag color={isPersistent ? 'blue' : 'default'}>
          {isPersistent ? '持久化' : '临时'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/datasets/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => datasetsService.download(record.id)}
          >
            导出
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
          数据集管理
        </Title>
        <Space>
          <Dropdown menu={{ items: templateMenuItems }}>
            <Button icon={<DownloadOutlined />}>下载模板</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalOpen(true)}
          >
            上传数据集
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="搜索数据集名称或描述"
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
          description="暂无数据集"
          actionText="上传数据集"
          onAction={() => setUploadModalOpen(true)}
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
            emptyText: keyword ? '未找到匹配的数据集' : '暂无数据',
          }}
        />
      )}

      <UploadModal
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => setUploadModalOpen(false)}
        loading={createDataset.isPending || uploadDataset.isPending}
      />
    </div>
  )
}
