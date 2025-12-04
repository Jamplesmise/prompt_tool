'use client'

import { Modal, Table, Space, Typography, Tag } from 'antd'
import { Eye, History } from 'lucide-react'
import { useDatasetVersionRows } from '@/hooks/useDatasets'
import type { DatasetVersionListItem } from '@/services/datasets'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Text } = Typography

type VersionRowsModalProps = {
  datasetId: string
  version: DatasetVersionListItem
  open: boolean
  onClose: () => void
}

type VersionRowDisplay = {
  id: string
  rowIndex: number
  data: Record<string, unknown>
  hash: string
}

export function VersionRowsModal({
  datasetId,
  version,
  open,
  onClose,
}: VersionRowsModalProps) {
  const { data, isLoading } = useDatasetVersionRows(datasetId, version.id, {
    offset: 0,
    limit: 100,
  })

  const rows = data?.rows || []

  // 动态生成列
  const dataColumns: ColumnsType<VersionRowDisplay> = []

  if (rows.length > 0) {
    const firstRow = rows[0]
    const dataKeys = Object.keys(firstRow.data as Record<string, unknown>)

    dataKeys.forEach((key) => {
      dataColumns.push({
        title: key,
        dataIndex: ['data', key],
        key,
        ellipsis: true,
        render: (value: unknown) => {
          if (value === null || value === undefined) return '-'
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        },
      })
    })
  }

  const columns: ColumnsType<VersionRowDisplay> = [
    {
      title: '#',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 60,
      fixed: 'left',
    },
    ...dataColumns,
  ]

  return (
    <Modal
      title={
        <Space>
          <Eye size={18} />
          查看版本数据
          <Tag icon={<History size={12} />}>v{version.version}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Space split={<Text type="secondary">|</Text>}>
          <Text type="secondary">
            共 {version.rowCount} 行数据
          </Text>
          <Text type="secondary">
            创建于 {dayjs(version.createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>
          {version.changeLog && (
            <Text type="secondary">
              变更说明: {version.changeLog}
            </Text>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content', y: 400 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </Modal>
  )
}
