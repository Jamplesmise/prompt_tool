'use client'

import { Select, Tag } from 'antd'
import type { SelectProps } from 'antd'

// 标签颜色映射
const TAG_COLORS: Record<string, string> = {
  '生产': '#52C41A',
  '测试': '#FAAD14',
  '开发': '#1677FF',
  '归档': '#8c8c8c',
  'default': '#1677FF',
}

type TagSelectProps = {
  value?: string[]
  onChange?: (value: string[]) => void
  options: string[]
  mode?: 'single' | 'multiple'
  placeholder?: string
  style?: React.CSSProperties
}

export function TagSelect({
  value,
  onChange,
  options,
  mode = 'multiple',
  placeholder = '选择标签',
  style,
}: TagSelectProps) {
  const getTagColor = (tag: string) => TAG_COLORS[tag] || TAG_COLORS.default

  const selectOptions = options.map((tag) => ({
    label: tag,
    value: tag,
  }))

  const tagRender: SelectProps['tagRender'] = ({ label, closable, onClose }) => {
    const color = getTagColor(label as string)
    return (
      <Tag
        color={color}
        closable={closable}
        onClose={onClose}
        style={{ marginRight: 4 }}
      >
        {label}
      </Tag>
    )
  }

  if (mode === 'single') {
    return (
      <Select
        value={value?.[0]}
        onChange={(v) => onChange?.(v ? [v] : [])}
        options={selectOptions}
        placeholder={placeholder}
        style={style}
        allowClear
        optionRender={(option) => {
          const color = getTagColor(option.value as string)
          return (
            <Tag color={color} style={{ margin: 0 }}>
              {option.label}
            </Tag>
          )
        }}
      />
    )
  }

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      options={selectOptions}
      placeholder={placeholder}
      style={style}
      allowClear
      maxTagCount={3}
      tagRender={tagRender}
      optionRender={(option) => {
        const color = getTagColor(option.value as string)
        return (
          <Tag color={color} style={{ margin: 0 }}>
            {option.label}
          </Tag>
        )
      }}
    />
  )
}

// 导出标签颜色常量供其他组件使用
export { TAG_COLORS }
export type { TagSelectProps }
