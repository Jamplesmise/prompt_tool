'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, Space, Typography, Spin, Empty, Descriptions, Tag, Dropdown } from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import {
  useDataset,
  useDatasetRows,
  useUploadDataset,
  useCreateDatasetRow,
  useUpdateDatasetRow,
  useDeleteDatasetRow,
  useDeleteDataset,
} from '@/hooks/useDatasets'
import { datasetsService } from '@/services/datasets'
import { DataTable, UploadModal } from '@/components/dataset'

const { Title } = Typography

export default function DatasetDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const { data: dataset, isLoading, error } = useDataset(id)
  const { data: rowsData, isLoading: rowsLoading } = useDatasetRows(id, { page, pageSize })
  const uploadDataset = useUploadDataset()
  const createRow = useCreateDatasetRow()
  const updateRow = useUpdateDatasetRow()
  const deleteRow = useDeleteDatasetRow()
  const deleteDataset = useDeleteDataset()

  const handleUpload = async (
    file: File,
    isPersistent: boolean,
    fieldMapping: Record<string, string>
  ) => {
    await uploadDataset.mutateAsync({
      id,
      data: { file, isPersistent, fieldMapping },
    })
    setUploadModalOpen(false)
  }

  const handleAddRow = async (data: Record<string, unknown>) => {
    await createRow.mutateAsync({ datasetId: id, data })
  }

  const handleUpdateRow = async (rowId: string, data: Record<string, unknown>) => {
    await updateRow.mutateAsync({ datasetId: id, rowId, data })
  }

  const handleDeleteRow = async (rowId: string) => {
    await deleteRow.mutateAsync({ datasetId: id, rowId })
  }

  const handleDelete = async () => {
    await deleteDataset.mutateAsync(id)
    router.push('/datasets')
  }

  const downloadMenuItems: MenuProps['items'] = [
    {
      key: 'xlsx',
      label: '导出为 Excel',
      onClick: () => datasetsService.download(id, 'xlsx'),
    },
    {
      key: 'csv',
      label: '导出为 CSV',
      onClick: () => datasetsService.download(id, 'csv'),
    },
  ]

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="数据集不存在或加载失败" />
        <Button onClick={() => router.push('/datasets')} style={{ marginTop: 16 }}>
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/datasets')}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {dataset.name}
          </Title>
          <Tag color={dataset.isPersistent ? 'blue' : 'default'}>
            {dataset.isPersistent ? '持久化' : '临时'}
          </Tag>
        </Space>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
            重新上传
          </Button>
          <Dropdown menu={{ items: downloadMenuItems }}>
            <Button icon={<DownloadOutlined />}>导出</Button>
          </Dropdown>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={4}>
          <Descriptions.Item label="描述">
            {dataset.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="行数">{dataset.rowCount}</Descriptions.Item>
          <Descriptions.Item label="创建者">{dataset.createdBy?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(dataset.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="数据预览">
        <DataTable
          schema={dataset.schema as Array<{ name: string; type: string }> | null}
          rows={rowsData?.list || []}
          loading={rowsLoading}
          pagination={{
            current: page,
            pageSize,
            total: rowsData?.total || 0,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          onAddRow={handleAddRow}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
        />
      </Card>

      <UploadModal
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => setUploadModalOpen(false)}
        loading={uploadDataset.isPending}
      />
    </div>
  )
}
