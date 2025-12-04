'use client'

import { useState } from 'react'
import { Modal, Select, Space, Typography, Spin, Empty, Tag, Table } from 'antd'
import { GitCompare, Plus, Minus, Edit, History } from 'lucide-react'
import { useDatasetVersionDiff } from '@/hooks/useDatasets'
import type { DatasetVersionListItem } from '@/services/datasets'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

type VersionDiffModalProps = {
  datasetId: string
  sourceVersion: DatasetVersionListItem
  versions: DatasetVersionListItem[]
  open: boolean
  onClose: () => void
}

type DiffRowDisplay = {
  key: string
  rowIndex: number
  type: 'added' | 'removed' | 'modified'
  field?: string
  oldValue?: unknown
  newValue?: unknown
}

export function VersionDiffModal({
  datasetId,
  sourceVersion,
  versions,
  open,
  onClose,
}: VersionDiffModalProps) {
  const [targetVersion, setTargetVersion] = useState<number | undefined>()

  const { data: diffData, isLoading } = useDatasetVersionDiff(
    datasetId,
    sourceVersion.version,
    targetVersion
  )

  // 过滤掉源版本
  const targetVersions = versions.filter((v) => v.version !== sourceVersion.version)

  const renderDiff = () => {
    if (!targetVersion) {
      return <Empty description="请选择要对比的目标版本" />
    }

    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )
    }

    if (!diffData) {
      return <Empty description="无法获取对比信息" />
    }

    const { diff } = diffData

    // 统计信息使用 summary
    const stats = diff.summary

    // 构建显示数据
    const displayRows: DiffRowDisplay[] = [
      ...diff.added.map((rowIndex, index) => ({
        key: `added-${index}`,
        rowIndex,
        type: 'added' as const,
      })),
      ...diff.removed.map((rowIndex, index) => ({
        key: `removed-${index}`,
        rowIndex,
        type: 'removed' as const,
      })),
      ...diff.modified.map((mod, index) => ({
        key: `modified-${index}`,
        rowIndex: mod.index,
        type: 'modified' as const,
        field: mod.field,
        oldValue: mod.oldValue,
        newValue: mod.newValue,
      })),
    ].sort((a, b) => a.rowIndex - b.rowIndex)

    const columns: ColumnsType<DiffRowDisplay> = [
      {
        title: '行号',
        dataIndex: 'rowIndex',
        key: 'rowIndex',
        width: 60,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: 'added' | 'removed' | 'modified') => {
          const config = {
            added: { color: 'green', icon: <Plus size={12} />, text: '新增' },
            removed: { color: 'red', icon: <Minus size={12} />, text: '删除' },
            modified: { color: 'orange', icon: <Edit size={12} />, text: '修改' },
          }
          const { color, icon, text } = config[type]
          return (
            <Tag color={color} icon={icon}>
              {text}
            </Tag>
          )
        },
      },
      {
        title: '变更详情',
        key: 'detail',
        render: (_, record: DiffRowDisplay) => {
          if (record.type === 'modified' && record.field) {
            return (
              <div>
                <Text type="secondary">字段: </Text>
                <Text strong>{record.field}</Text>
                <br />
                <Text delete type="danger">
                  {JSON.stringify(record.oldValue)}
                </Text>
                <Text> → </Text>
                <Text type="success">{JSON.stringify(record.newValue)}</Text>
              </div>
            )
          }
          if (record.type === 'added') {
            return <Text type="success">新增行</Text>
          }
          return <Text type="danger">删除行</Text>
        },
      },
    ]

    return (
      <div>
        {/* 统计信息 */}
        <div style={{ marginBottom: 16 }}>
          <Space size="large">
            <Text>
              <Plus size={14} style={{ color: '#52c41a', marginRight: 4 }} />
              新增 {stats.addedCount} 行
            </Text>
            <Text>
              <Minus size={14} style={{ color: '#ff4d4f', marginRight: 4 }} />
              删除 {stats.removedCount} 行
            </Text>
            <Text>
              <Edit size={14} style={{ color: '#faad14', marginRight: 4 }} />
              修改 {stats.modifiedCount} 处
            </Text>
          </Space>
        </div>

        {displayRows.length === 0 ? (
          <Empty description="两个版本数据完全一致" />
        ) : (
          <Table
            columns={columns}
            dataSource={displayRows}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 300 }}
          />
        )}
      </div>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <GitCompare size={18} />
          版本对比
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Space>
            <Text type="secondary">源版本：</Text>
            <Tag icon={<History size={12} />}>v{sourceVersion.version}</Tag>
          </Space>
          <Space>
            <Text type="secondary">目标版本：</Text>
            <Select
              value={targetVersion}
              onChange={setTargetVersion}
              placeholder="选择对比版本"
              style={{ minWidth: 200 }}
            >
              {targetVersions.map((v) => (
                <Select.Option key={v.id} value={v.version}>
                  <Space>
                    <History size={14} />
                    <span>v{v.version}</span>
                    <Text type="secondary">({v.rowCount} 行)</Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Space>
      </div>

      {renderDiff()}
    </Modal>
  )
}
