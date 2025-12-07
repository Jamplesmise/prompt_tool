'use client'

import { useState } from 'react'
import { Modal, Select, Space, Typography, Spin, Empty, Tag } from 'antd'
import { GitCompare, GitBranch, Plus, Minus, Edit } from 'lucide-react'
import { useBranchDiff, useBranches } from '@/hooks/usePrompts'
import type { BranchListItem } from '@/services/prompts'

const { Text, Paragraph } = Typography

type BranchDiffModalProps = {
  promptId: string
  sourceBranch: BranchListItem
  open: boolean
  onClose: () => void
}

export function BranchDiffModal({
  promptId,
  sourceBranch,
  open,
  onClose,
}: BranchDiffModalProps) {
  const { data: branches } = useBranches(promptId)
  const [targetBranchId, setTargetBranchId] = useState<string | undefined>()

  const { data: diff, isLoading } = useBranchDiff(
    promptId,
    sourceBranch.id,
    targetBranchId
  )

  // 过滤掉源分支
  const targetBranches = branches?.filter((b) => b.id !== sourceBranch.id)

  const renderDiff = () => {
    if (!targetBranchId) {
      return <Empty description="请选择要对比的目标分支" />
    }

    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )
    }

    if (!diff) {
      return <Empty description="无法获取对比信息" />
    }

    return (
      <div>
        {/* 变量差异 */}
        {(diff.variablesDiff.added.length > 0 ||
          diff.variablesDiff.removed.length > 0 ||
          diff.variablesDiff.modified.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>变量变更：</Text>
            <div style={{ marginTop: 8 }}>
              {diff.variablesDiff.added.map((v) => (
                <Tag key={v.name} color="green" icon={<Plus size={12} />}>
                  {v.name} ({v.type})
                </Tag>
              ))}
              {diff.variablesDiff.removed.map((v) => (
                <Tag key={v.name} color="red" icon={<Minus size={12} />}>
                  {v.name} ({v.type})
                </Tag>
              ))}
              {diff.variablesDiff.modified.map((v) => (
                <Tag key={v.name} color="orange" icon={<Edit size={12} />}>
                  {v.name}: {v.oldValue.type} → {v.newValue.type}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 内容差异 */}
        <Text strong>内容差异：</Text>
        <div
          style={{
            marginTop: 8,
            background: '#1e1e1e',
            borderRadius: 6,
            padding: 16,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            {diff.contentDiff.split('\n').map((line, index) => {
              let color = '#d4d4d4'
              let backgroundColor = 'transparent'
              if (line.startsWith('+')) {
                color = '#4ec9b0'
                backgroundColor = 'rgba(78, 201, 176, 0.1)'
              } else if (line.startsWith('-')) {
                color = '#f14c4c'
                backgroundColor = 'rgba(241, 76, 76, 0.1)'
              }
              return (
                <div
                  key={index}
                  style={{
                    color,
                    backgroundColor,
                    padding: '0 4px',
                    marginLeft: -4,
                    marginRight: -4,
                  }}
                >
                  {line || ' '}
                </div>
              )
            })}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <GitCompare size={18} />
          分支对比
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
            <Text type="secondary">源分支：</Text>
            <Tag icon={<GitBranch size={12} />}>
              {sourceBranch.name} (v{sourceBranch.currentVersion})
            </Tag>
          </Space>
          <Space>
            <Text type="secondary">目标分支：</Text>
            <Select
              value={targetBranchId}
              onChange={setTargetBranchId}
              placeholder="选择对比分支"
              style={{ minWidth: 200 }}
            >
              {targetBranches?.map((branch) => (
                <Select.Option key={branch.id} value={branch.id}>
                  <Space>
                    <GitBranch size={14} />
                    <span>{branch.name}</span>
                    <Text type="secondary">v{branch.currentVersion}</Text>
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
