'use client'

import { useState, useCallback } from 'react'
import { Input, Button, Space, Select } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { useDebouncedCallback } from 'use-debounce'

// 标签颜色映射
const TAG_COLORS: Record<string, string> = {
  '生产': '#52C41A',
  '测试': '#FAAD14',
  '开发': '#1677FF',
  '归档': '#8c8c8c',
}

type PromptFiltersValue = {
  search?: string
  tags?: string[]
}

type PromptFiltersProps = {
  value: PromptFiltersValue
  onChange: (value: PromptFiltersValue) => void
  onCreatePrompt?: () => void
  availableTags: string[]
}

export function PromptFilters({
  value,
  onChange,
  onCreatePrompt,
  availableTags,
}: PromptFiltersProps) {
  const [searchInput, setSearchInput] = useState(value.search || '')

  // 防抖搜索
  const debouncedSearch = useDebouncedCallback((searchValue: string) => {
    onChange({ ...value, search: searchValue || undefined })
  }, 300)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setSearchInput(newValue)
      debouncedSearch(newValue)
    },
    [debouncedSearch]
  )

  const handleTagsChange = useCallback(
    (tags: string[]) => {
      onChange({ ...value, tags: tags.length > 0 ? tags : undefined })
    },
    [value, onChange]
  )

  // 标签选项
  const tagOptions = availableTags.map((tag) => ({
    label: tag,
    value: tag,
  }))

  return (
    <div style={{ marginBottom: 16 }}>
      <Space size={12} wrap>
        <Input
          placeholder="搜索提示词名称或内容..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchInput}
          onChange={handleSearchChange}
          style={{ width: 280 }}
          allowClear
          onClear={() => {
            setSearchInput('')
            onChange({ ...value, search: undefined })
          }}
        />

        <Select
          mode="multiple"
          placeholder="标签筛选"
          value={value.tags || []}
          onChange={handleTagsChange}
          options={tagOptions}
          style={{ minWidth: 160 }}
          allowClear
          maxTagCount={2}
          tagRender={({ label, closable, onClose }) => {
            const color = TAG_COLORS[label as string] || '#1677FF'
            return (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 7px',
                  marginRight: 4,
                  borderRadius: 4,
                  backgroundColor: `${color}20`,
                  color: color,
                  fontSize: 12,
                  lineHeight: '20px',
                }}
              >
                {label}
                {closable && (
                  <span
                    onClick={onClose}
                    style={{ marginLeft: 4, cursor: 'pointer' }}
                  >
                    ×
                  </span>
                )}
              </span>
            )
          }}
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreatePrompt}
          style={{
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            border: 'none',
            fontWeight: 500,
          }}
        >
          新建提示词
        </Button>
      </Space>
    </div>
  )
}

export type { PromptFiltersValue, PromptFiltersProps }
