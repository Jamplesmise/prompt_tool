'use client'

import { Space, Select } from 'antd'

type ResultFiltersProps = {
  onStatusChange: (status: string | undefined) => void
  onPassedChange: (passed: boolean | undefined) => void
}

const statusOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '超时', value: 'TIMEOUT' },
  { label: '错误', value: 'ERROR' },
]

const passedOptions = [
  { label: '通过', value: 'true' },
  { label: '未通过', value: 'false' },
]

export function ResultFilters({
  onStatusChange,
  onPassedChange,
}: ResultFiltersProps) {
  return (
    <Space wrap>
      <Select
        placeholder="执行状态"
        allowClear
        style={{ width: 120 }}
        options={statusOptions}
        onChange={(value) => onStatusChange(value)}
      />
      <Select
        placeholder="评估结果"
        allowClear
        style={{ width: 120 }}
        options={passedOptions}
        onChange={(value) =>
          onPassedChange(value === undefined ? undefined : value === 'true')
        }
      />
    </Space>
  )
}
