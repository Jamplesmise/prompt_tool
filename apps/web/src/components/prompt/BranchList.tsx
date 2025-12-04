'use client'

import { useState } from 'react'
import { Table, Tag, Button, Space, Popconfirm, Tooltip, Typography } from 'antd'
import {
  GitBranch,
  GitMerge,
  Archive,
  Trash2,
  Edit2,
  GitCompare,
} from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import { useBranches, useDeleteBranch, useArchiveBranch } from '@/hooks/usePrompts'
import type { BranchListItem } from '@/services/prompts'
import { CreateBranchModal } from './CreateBranchModal'
import { MergeBranchModal } from './MergeBranchModal'
import { BranchDiffModal } from './BranchDiffModal'

const { Text } = Typography

type BranchListProps = {
  promptId: string
  onBranchSelect?: (branch: BranchListItem) => void
}

export function BranchList({ promptId, onBranchSelect }: BranchListProps) {
  const { data: branches, isLoading } = useBranches(promptId)
  const deleteBranch = useDeleteBranch()
  const archiveBranch = useArchiveBranch()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<BranchListItem | null>(null)

  const handleDelete = (branch: BranchListItem) => {
    deleteBranch.mutate({ promptId, branchId: branch.id })
  }

  const handleArchive = (branch: BranchListItem) => {
    archiveBranch.mutate({ promptId, branchId: branch.id })
  }

  const handleMerge = (branch: BranchListItem) => {
    setSelectedBranch(branch)
    setMergeModalOpen(true)
  }

  const handleDiff = (branch: BranchListItem) => {
    setSelectedBranch(branch)
    setDiffModalOpen(true)
  }

  const getStatusTag = (status: string, isDefault: boolean) => {
    if (isDefault) {
      return <Tag color="blue">默认</Tag>
    }
    switch (status) {
      case 'ACTIVE':
        return <Tag color="green">活跃</Tag>
      case 'MERGED':
        return <Tag color="purple">已合并</Tag>
      case 'ARCHIVED':
        return <Tag color="default">已归档</Tag>
      default:
        return null
    }
  }

  const columns: ColumnsType<BranchListItem> = [
    {
      title: '分支名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <GitBranch size={16} />
          <a onClick={() => onBranchSelect?.(record)}>{name}</a>
          {getStatusTag(record.status, record.isDefault)}
        </Space>
      ),
    },
    {
      title: '当前版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 100,
      render: (v) => `v${v}`,
    },
    {
      title: '版本数',
      dataIndex: '_count',
      key: 'versionCount',
      width: 80,
      render: (count) => count?.versions || 0,
    },
    {
      title: '创建者',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
      render: (user) => user?.name || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'ACTIVE' && !record.isDefault && (
            <>
              <Tooltip title="合并到其他分支">
                <Button
                  type="text"
                  size="small"
                  icon={<GitMerge size={14} />}
                  onClick={() => handleMerge(record)}
                />
              </Tooltip>
              <Tooltip title="与其他分支对比">
                <Button
                  type="text"
                  size="small"
                  icon={<GitCompare size={14} />}
                  onClick={() => handleDiff(record)}
                />
              </Tooltip>
              <Tooltip title="归档">
                <Popconfirm
                  title="确定要归档此分支吗？"
                  onConfirm={() => handleArchive(record)}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<Archive size={14} />}
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          {!record.isDefault && (
            <Tooltip title="删除">
              <Popconfirm
                title="确定要删除此分支吗？"
                description="删除后无法恢复"
                onConfirm={() => handleDelete(record)}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={14} />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<GitBranch size={14} />}
          onClick={() => setCreateModalOpen(true)}
        >
          创建分支
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={branches}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={false}
      />

      <CreateBranchModal
        promptId={promptId}
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {selectedBranch && (
        <>
          <MergeBranchModal
            promptId={promptId}
            sourceBranch={selectedBranch}
            open={mergeModalOpen}
            onClose={() => {
              setMergeModalOpen(false)
              setSelectedBranch(null)
            }}
          />
          <BranchDiffModal
            promptId={promptId}
            sourceBranch={selectedBranch}
            open={diffModalOpen}
            onClose={() => {
              setDiffModalOpen(false)
              setSelectedBranch(null)
            }}
          />
        </>
      )}
    </div>
  )
}
