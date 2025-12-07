'use client'

import { Tag, Tooltip } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

// 评估器类型
export type EvaluatorTypeKey =
  | 'exact_match'
  | 'contains'
  | 'regex'
  | 'json_schema'
  | 'similarity'
  | 'llm_judge'
  | 'code'
  | 'composite'

type TypeConfig = {
  icon: string
  color: string
  label: string
  description: string
}

// 评估器类型配置
export const EVALUATOR_TYPE_CONFIG: Record<EvaluatorTypeKey, TypeConfig> = {
  exact_match: {
    icon: '✅',
    color: '#52C41A',
    label: '精确匹配',
    description: '输出与期望值完全一致',
  },
  contains: {
    icon: '🔍',
    color: '#EF4444',
    label: '包含匹配',
    description: '输出包含期望内容',
  },
  regex: {
    icon: '📝',
    color: '#722ED1',
    label: '正则匹配',
    description: '输出匹配正则表达式',
  },
  json_schema: {
    icon: '📋',
    color: '#13C2C2',
    label: 'JSON Schema',
    description: '输出符合 JSON Schema 规范',
  },
  similarity: {
    icon: '📊',
    color: '#FA8C16',
    label: '相似度',
    description: '输出与期望值相似度达标',
  },
  llm_judge: {
    icon: '🤖',
    color: '#EB2F96',
    label: 'LLM 评估',
    description: '使用 LLM 进行智能评估',
  },
  code: {
    icon: '💻',
    color: '#2F54EB',
    label: '代码评估',
    description: '自定义代码逻辑评估',
  },
  composite: {
    icon: '🔗',
    color: '#52C41A',
    label: '组合评估',
    description: '组合多个评估器',
  },
}

export type EvaluatorTypeTagProps = {
  type: EvaluatorTypeKey | string
  size?: 'small' | 'default' | 'large'
  showLabel?: boolean
  showTooltip?: boolean
  style?: CSSProperties
}

const SIZE_MAP = {
  small: { fontSize: 12, padding: '0 4px' },
  default: { fontSize: 14, padding: '0 8px' },
  large: { fontSize: 16, padding: '2px 12px' },
}

export function EvaluatorTypeTag({
  type,
  size = 'default',
  showLabel = true,
  showTooltip = true,
  style,
}: EvaluatorTypeTagProps) {
  const config = EVALUATOR_TYPE_CONFIG[type as EvaluatorTypeKey]

  if (!config) {
    return (
      <Tag style={style}>
        {type}
      </Tag>
    )
  }

  const { icon, color, label, description } = config
  const sizeStyle = SIZE_MAP[size]

  const tagContent: ReactNode = (
    <Tag
      style={{
        ...sizeStyle,
        color: color,
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...style,
      }}
    >
      <span>{icon}</span>
      {showLabel && <span>{label}</span>}
    </Tag>
  )

  if (showTooltip) {
    return (
      <Tooltip title={description}>
        {tagContent}
      </Tooltip>
    )
  }

  return tagContent
}
