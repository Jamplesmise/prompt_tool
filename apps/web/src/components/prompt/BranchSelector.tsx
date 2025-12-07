'use client'

import { Select, Tag, Space, Typography } from 'antd'
import { GitBranch } from 'lucide-react'
import { useBranches } from '@/hooks/usePrompts'
import type { BranchListItem } from '@/services/prompts'

const { Text } = Typography

type BranchSelectorProps = {
  promptId: string
  value?: string
  onChange?: (branchId: string, branch: BranchListItem) => void
  disabled?: boolean
  showStatus?: boolean
}

export function BranchSelector({
  promptId,
  value,
  onChange,
  disabled = false,
  showStatus = true,
}: BranchSelectorProps) {
  const { data: branches, isLoading } = useBranches(promptId)

  const handleChange = (branchId: string) => {
    const branch = branches?.find((b) => b.id === branchId)
    if (branch && onChange) {
      onChange(branchId, branch)
    }
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

  return (
    <Select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      loading={isLoading}
      placeholder="选择分支"
      style={{ minWidth: 180 }}
      suffixIcon={<GitBranch size={14} />}
      optionLabelProp="label"
    >
      {branches?.map((branch) => (
        <Select.Option
          key={branch.id}
          value={branch.id}
          label={
            <Space size={4}>
              <GitBranch size={14} />
              {branch.name}
            </Space>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size={8}>
              <GitBranch size={14} />
              <span>{branch.name}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                v{branch.currentVersion}
              </Text>
            </Space>
            {showStatus && getStatusTag(branch.status, branch.isDefault)}
          </div>
        </Select.Option>
      ))}
    </Select>
  )
}
