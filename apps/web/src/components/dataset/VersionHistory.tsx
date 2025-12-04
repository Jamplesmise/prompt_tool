'use client'

import { useState } from 'react'
import { Table, Button, Space, Typography, Tooltip, Popconfirm, Tag } from 'antd'
import { History, RotateCcw, GitCompare, Eye, Plus } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import { useDatasetVersions, useRollbackDatasetVersion } from '@/hooks/useDatasets'
import type { DatasetVersionListItem } from '@/services/datasets'
import { CreateVersionModal } from './CreateVersionModal'
import { VersionDiffModal } from './VersionDiffModal'
import { VersionRowsModal } from './VersionRowsModal'
import dayjs from 'dayjs'

const { Text } = Typography

type VersionHistoryProps = {
  datasetId: string
  currentVersion?: number
}

export function VersionHistory({ datasetId, currentVersion }: VersionHistoryProps) {
  const { data: versions, isLoading } = useDatasetVersions(datasetId)
  const rollbackMutation = useRollbackDatasetVersion()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [rowsModalOpen, setRowsModalOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DatasetVersionListItem | null>(null)

  const handleRollback = (version: DatasetVersionListItem) => {
    rollbackMutation.mutate({
      datasetId,
      versionId: version.id,
    })
  }

  const handleViewRows = (version: DatasetVersionListItem) => {
    setSelectedVersion(version)
    setRowsModalOpen(true)
  }

  const handleDiff = (version: DatasetVersionListItem) => {
    setSelectedVersion(version)
    setDiffModalOpen(true)
  }

  const columns: ColumnsType<DatasetVersionListItem> = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: number) => (
        <Tag color={version === currentVersion ? 'blue' : 'default'}>v{version}</Tag>
      ),
    },
    {
      title: '行数',
      dataIndex: 'rowCount',
      key: 'rowCount',
      width: 80,
    },
    {
      title: '变更说明',
      dataIndex: 'changeLog',
      key: 'changeLog',
      ellipsis: true,
      render: (changeLog: string | null) => changeLog || '-',
    },
    {
      title: '创建者',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
      render: (createdBy: { name: string }) => createdBy?.name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看数据">
            <Button
              type="text"
              size="small"
              icon={<Eye size={14} />}
              onClick={() => handleViewRows(record)}
            />
          </Tooltip>
          <Tooltip title="版本对比">
            <Button
              type="text"
              size="small"
              icon={<GitCompare size={14} />}
              onClick={() => handleDiff(record)}
            />
          </Tooltip>
          {record.version !== currentVersion && (
            <Popconfirm
              title="确认回滚"
              description={`确定要回滚到 v${record.version} 吗？当前数据将被覆盖。`}
              onConfirm={() => handleRollback(record)}
              okText="确认"
              cancelText="取消"
            >
              <Tooltip title="回滚到此版本">
                <Button
                  type="text"
                  size="small"
                  icon={<RotateCcw size={14} />}
                  loading={rollbackMutation.isPending}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <History size={18} />
          <Text strong>版本历史</Text>
          {currentVersion !== undefined && (
            <Text type="secondary">(当前版本: v{currentVersion})</Text>
          )}
        </Space>
        <Button
          type="primary"
          icon={<Plus size={14} />}
          onClick={() => setCreateModalOpen(true)}
        >
          创建快照
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={versions || []}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={false}
      />

      <CreateVersionModal
        datasetId={datasetId}
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {selectedVersion && (
        <>
          <VersionDiffModal
            datasetId={datasetId}
            sourceVersion={selectedVersion}
            versions={versions || []}
            open={diffModalOpen}
            onClose={() => {
              setDiffModalOpen(false)
              setSelectedVersion(null)
            }}
          />
          <VersionRowsModal
            datasetId={datasetId}
            version={selectedVersion}
            open={rowsModalOpen}
            onClose={() => {
              setRowsModalOpen(false)
              setSelectedVersion(null)
            }}
          />
        </>
      )}
    </div>
  )
}
