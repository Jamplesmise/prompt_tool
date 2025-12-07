'use client'

import { Space, Typography, Tooltip } from 'antd'
import type { UnifiedModelType } from '@/types/fastgpt'
import { ModelTypeEnum } from '@/types/fastgpt'
import { GRAY, SEMANTIC } from '@/theme/colors'

const { Text } = Typography

type ModelPriceDisplayProps = {
  model: UnifiedModelType
  size?: 'small' | 'default'
}

function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return '-'
  if (price === 0) return '免费'
  if (price < 0.001) return `${(price * 1000000).toFixed(2)}/M`
  if (price < 1) return `${(price * 1000).toFixed(2)}/K`
  return `${price.toFixed(4)}`
}

export function ModelPriceDisplay({ model, size = 'default' }: ModelPriceDisplayProps) {
  const isSmall = size === 'small'
  const fontSize = isSmall ? 12 : 14

  // LLM 类型：分别显示输入/输出价格
  if (model.type === ModelTypeEnum.llm) {
    const hasInputOutput = model.inputPrice !== undefined || model.outputPrice !== undefined

    if (hasInputOutput) {
      const inputStr = formatPrice(model.inputPrice)
      const outputStr = formatPrice(model.outputPrice)
      const isFree = model.inputPrice === 0 && model.outputPrice === 0

      return (
        <Tooltip title="输入价格 / 输出价格 (每 1K tokens)">
          <Space size={4} style={{ fontSize }}>
            <Text style={{ color: isFree ? SEMANTIC.success : undefined }}>
              {inputStr}
            </Text>
            <Text type="secondary">/</Text>
            <Text style={{ color: isFree ? SEMANTIC.success : undefined }}>
              {outputStr}
            </Text>
          </Space>
        </Tooltip>
      )
    }

    // 使用字符计价
    if (model.charsPointsPrice !== undefined) {
      return (
        <Tooltip title="每 1K 字符">
          <Text style={{ fontSize, color: model.charsPointsPrice === 0 ? SEMANTIC.success : undefined }}>
            {formatPrice(model.charsPointsPrice)}
          </Text>
        </Tooltip>
      )
    }
  }

  // Embedding/Rerank：单一价格
  if (model.type === ModelTypeEnum.embedding || model.type === ModelTypeEnum.rerank) {
    const price = model.inputPrice ?? model.charsPointsPrice
    return (
      <Tooltip title="每 1K tokens">
        <Text style={{ fontSize, color: price === 0 ? SEMANTIC.success : undefined }}>
          {formatPrice(price)}
        </Text>
      </Tooltip>
    )
  }

  // TTS/STT：按字符或秒计价
  if (model.type === ModelTypeEnum.tts || model.type === ModelTypeEnum.stt) {
    const price = model.charsPointsPrice
    return (
      <Tooltip title={model.type === ModelTypeEnum.tts ? '每 1K 字符' : '每 60 秒'}>
        <Text style={{ fontSize, color: price === 0 ? SEMANTIC.success : undefined }}>
          {formatPrice(price)}
        </Text>
      </Tooltip>
    )
  }

  return <Text style={{ fontSize, color: GRAY[400] }}>-</Text>
}
