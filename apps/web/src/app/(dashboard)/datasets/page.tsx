'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Table, Space, Tag, Typography, Dropdown, Row, Col } from 'antd'
import {
  SearchOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useDatasets, useDeleteDataset, useCreateDataset } from '@/hooks/useDatasets'
import { datasetsService } from '@/services/datasets'
import {
  DatasetUploadModal,
  DatasetCard,
  ViewToggle,
} from '@/components/dataset'
import type { ViewMode } from '@/components/dataset'
import { LoadingState, ErrorState, EmptyState } from '@/components/common'
import { DatasetUploadedTip } from '@/components/guidance'
import { eventBus } from '@/lib/eventBus'
import type { DatasetListItem } from '@/services/datasets'
import { PRIMARY, GRAY, SEMANTIC } from '@/theme/colors'

const { Title } = Typography

export default function DatasetsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const { data, isLoading, error, refetch } = useDatasets({ page, pageSize, keyword })
  const deleteDataset = useDeleteDataset()
  const createDataset = useCreateDataset()

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
    fieldMapping: Record<string, string>,
    onProgress?: (percent: number) => void
  ) => {
    // 先创建数据集
    const dataset = await createDataset.mutateAsync({
      name: file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
      isPersistent,
    })

    // 然后上传文件（带进度回调）
    const response = await datasetsService.uploadWithProgress(
      dataset.id,
      { file, isPersistent, fieldMapping },
      onProgress
    )

    if (response.code !== 200) {
      throw new Error(response.message)
    }

    // 触发数据集上传事件
    eventBus.emit('dataset:uploaded', {
      datasetId: dataset.id,
      datasetName: dataset.name,
      rowCount: response.data?.rowCount || 0,
    })

    setUploadModalOpen(false)
    refetch()
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
        <a
          onClick={() => router.push(`/datasets/${record.id}`)}
          style={{ fontWeight: 500, color: PRIMARY[500] }}
        >
          {name}
        </a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => <span style={{ color: GRAY[500] }}>{text || '-'}</span>,
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
        <Tag
          style={{
            margin: 0,
            background: isPersistent ? '#D1FAE5' : '#FEF3C7',
            color: isPersistent ? '#065F46' : '#92400E',
            border: 'none',
          }}
        >
          {isPersistent ? '持久化' : '临时'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date) => (
        <span style={{ color: GRAY[500] }}>
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const actionItems: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: '查看',
            onClick: () => router.push(`/datasets/${record.id}`),
          },
          {
            key: 'export',
            icon: <DownloadOutlined />,
            label: '导出',
            onClick: () => datasetsService.download(record.id),
          },
          { type: 'divider' },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => {
              // 使用 Modal.confirm 替代 Popconfirm
              import('antd').then(({ Modal }) => {
                Modal.confirm({
                  title: '确认删除',
                  content: '删除后无法恢复，确定要删除吗？',
                  okText: '确定',
                  cancelText: '取消',
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(record.id),
                })
              })
            },
          },
        ]

        return (
          <Dropdown menu={{ items: actionItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        )
      },
    },
  ]

  const renderListView = () => (
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
  )

  const renderCardView = () => (
    <div>
      <Row gutter={[16, 16]}>
        {(data?.list || []).map((dataset) => (
          <Col key={dataset.id} xs={24} sm={12} md={8} lg={6}>
            <DatasetCard
              id={dataset.id}
              name={dataset.name}
              rowCount={dataset.rowCount}
              storageType={dataset.isPersistent ? 'persistent' : 'temporary'}
              updatedAt={dataset.updatedAt}
              onView={() => router.push(`/datasets/${dataset.id}`)}
              onExport={() => datasetsService.download(dataset.id)}
              onDelete={() => handleDelete(dataset.id)}
            />
          </Col>
        ))}
      </Row>
      {data && data.total > pageSize && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= data.total}
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          数据集管理
        </Title>
        <Space>
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Dropdown menu={{ items: templateMenuItems }}>
            <Button icon={<DownloadOutlined />}>下载模板</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalOpen(true)}
            style={{
              background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
              border: 'none',
              boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
            }}
          >
            上传数据集
          </Button>
        </Space>
      </div>

      {/* 数据集上传后的提示 */}
      <DatasetUploadedTip />

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
      ) : viewMode === 'list' ? (
        renderListView()
      ) : (
        renderCardView()
      )}

      <DatasetUploadModal
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => setUploadModalOpen(false)}
        loading={createDataset.isPending}
      />
    </div>
  )
}
