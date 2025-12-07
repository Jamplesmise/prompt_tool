'use client'

import { Tag } from 'antd'
import { ModelTypeEnum, MODEL_TYPE_CONFIG } from '@/types/fastgpt'

type ModelTypeTagProps = {
  type: ModelTypeEnum | string
  size?: 'small' | 'default'
}

export function ModelTypeTag({ type, size = 'default' }: ModelTypeTagProps) {
  // 处理 undefined 或空字符串
  const safeType = type || 'unknown'
  const config = MODEL_TYPE_CONFIG[safeType as ModelTypeEnum] || {
    label: safeType.toUpperCase(),
    color: 'default',
  }

  return (
    <Tag
      color={config.color}
      style={size === 'small' ? { fontSize: 11, padding: '0 4px' } : undefined}
    >
      {config.label}
    </Tag>
  )
}
