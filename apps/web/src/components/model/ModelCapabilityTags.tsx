'use client'

import { Tag, Tooltip, Space } from 'antd'
import {
  EyeOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import type { UnifiedModelType } from '@/types/fastgpt'
import { ModelTypeEnum } from '@/types/fastgpt'
import { GRAY } from '@/theme/colors'

type ModelCapabilityTagsProps = {
  model: UnifiedModelType
  showContext?: boolean
  size?: 'small' | 'default'
}

export function ModelCapabilityTags({
  model,
  showContext = true,
  size = 'default',
}: ModelCapabilityTagsProps) {
  const tags: React.ReactNode[] = []
  const isSmall = size === 'small'
  const tagStyle = isSmall ? { fontSize: 11, padding: '0 4px' } : undefined

  // LLM 特有标签
  if (model.type === ModelTypeEnum.llm) {
    // 上下文长度
    if (showContext && model.maxContext) {
      const contextK = Math.round(model.maxContext / 1000)
      tags.push(
        <Tooltip key="context" title={`最大上下文: ${model.maxContext.toLocaleString()} tokens`}>
          <Tag style={tagStyle}>{contextK}K</Tag>
        </Tooltip>
      )
    }

    // 视觉能力
    if (model.vision) {
      tags.push(
        <Tooltip key="vision" title="支持图片输入">
          <Tag icon={<EyeOutlined />} color="purple" style={tagStyle}>
            视觉
          </Tag>
        </Tooltip>
      )
    }

    // 工具调用
    if (model.toolChoice || model.functionCall) {
      tags.push(
        <Tooltip key="tool" title="支持工具调用 / Function Call">
          <Tag icon={<ToolOutlined />} color="green" style={tagStyle}>
            工具
          </Tag>
        </Tooltip>
      )
    }

    // 推理能力
    if (model.reasoning) {
      tags.push(
        <Tooltip key="reasoning" title="支持深度推理">
          <Tag icon={<ThunderboltOutlined />} color="orange" style={tagStyle}>
            推理
          </Tag>
        </Tooltip>
      )
    }
  }

  // Embedding 特有标签
  if (model.type === ModelTypeEnum.embedding && model.maxToken) {
    tags.push(
      <Tooltip key="maxToken" title={`最大 Token: ${model.maxToken}`}>
        <Tag style={tagStyle}>{model.maxToken} tokens</Tag>
      </Tooltip>
    )
  }

  // TTS 特有标签
  if (model.type === ModelTypeEnum.tts && model.voices?.length) {
    tags.push(
      <Tooltip key="voices" title={`${model.voices.length} 种声音`}>
        <Tag icon={<MessageOutlined />} style={tagStyle}>
          {model.voices.length} 声音
        </Tag>
      </Tooltip>
    )
  }

  if (tags.length === 0) {
    return <span style={{ color: GRAY[400] }}>-</span>
  }

  return <Space size={4} wrap>{tags}</Space>
}
