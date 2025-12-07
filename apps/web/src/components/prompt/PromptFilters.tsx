'use client'

import type { CSSProperties } from 'react'
import { useState, useCallback } from 'react'
import { Input, Button, Space, Select } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { useDebouncedCallback } from 'use-debounce'
import { PRIMARY } from '@/theme/colors'

// 标签颜色映射
const TAG_COLORS: Record<string, string> = {
  '生产': '#52C41A',
  '测试': '#FAAD14',
  '开发': PRIMARY[500],
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
          style={{ width: 280, height: 40 }}
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
          style={{ minWidth: 120, height: 40 }}
          allowClear
          maxTagCount={1}
          maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
          tagRender={({ label, closable, onClose }) => {
            const color = TAG_COLORS[label as string] || '#EF4444'
            return (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 6px',
                  marginRight: 3,
                  borderRadius: 4,
                  backgroundColor: `${color}15`,
                  color: color,
                  fontSize: 12,
                  lineHeight: '22px',
                  height: 22,
                }}
              >
                {label}
                {closable && (
                  <span
                    onClick={onClose}
                    style={{ marginLeft: 4, cursor: 'pointer', opacity: 0.7 }}
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
            height: 40,
            fontWeight: 500,
            background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
            border: 'none',
            boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
          }}
        >
          新建提示词
        </Button>
      </Space>
    </div>
  )
}

export type { PromptFiltersValue, PromptFiltersProps }
