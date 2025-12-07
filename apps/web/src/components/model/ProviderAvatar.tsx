'use client'

import { Avatar, Tooltip } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { PRIMARY } from '@/theme/colors'

// 提供商配置
const PROVIDER_CONFIG: Record<string, { color: string; abbr: string }> = {
  openai: { color: '#10A37F', abbr: 'OA' },
  anthropic: { color: '#CC785C', abbr: 'An' },
  azure: { color: '#0078D4', abbr: 'Az' },
  google: { color: '#4285F4', abbr: 'Go' },
  baidu: { color: '#2932E1', abbr: 'BD' },
  alibaba: { color: '#FF6A00', abbr: 'AL' },
  aliyun: { color: '#FF6A00', abbr: 'AL' },
  qwen: { color: '#FF6A00', abbr: 'QW' },
  zhipu: { color: '#3366FF', abbr: 'ZP' },
  chatglm: { color: '#3366FF', abbr: 'GL' },
  minimax: { color: '#6366F1', abbr: 'MM' },
  deepseek: { color: '#4D6BFE', abbr: 'DS' },
  moonshot: { color: '#000000', abbr: 'MS' },
  kimi: { color: '#000000', abbr: 'KM' },
  doubao: { color: '#3370FF', abbr: 'DB' },
  bytedance: { color: '#3370FF', abbr: 'BD' },
  baichuan: { color: '#FF4D4F', abbr: 'BC' },
  mistral: { color: '#FF7000', abbr: 'MI' },
  cohere: { color: '#D18EE2', abbr: 'CO' },
  custom: { color: PRIMARY[500], abbr: 'CU' },
}

type ProviderAvatarProps = {
  provider: string
  size?: 'small' | 'default' | 'large' | number
  showTooltip?: boolean
}

export function ProviderAvatar({
  provider,
  size = 'default',
  showTooltip = true,
}: ProviderAvatarProps) {
  // 处理 undefined 或空字符串
  const safeProvider = provider || 'Unknown'
  const normalizedProvider = safeProvider.toLowerCase().replace(/[^a-z]/g, '')
  const config = PROVIDER_CONFIG[normalizedProvider] || {
    color: PRIMARY[500],
    abbr: safeProvider.slice(0, 2).toUpperCase(),
  }

  const sizeMap = {
    small: 20,
    default: 28,
    large: 36,
  }
  const avatarSize = typeof size === 'number' ? size : sizeMap[size]
  const fontSize = avatarSize * 0.4

  const avatar = (
    <Avatar
      size={avatarSize}
      style={{
        backgroundColor: config.color,
        fontSize,
        fontWeight: 500,
      }}
      icon={config.abbr === 'CU' ? <RobotOutlined /> : undefined}
    >
      {config.abbr !== 'CU' ? config.abbr : null}
    </Avatar>
  )

  if (showTooltip) {
    return <Tooltip title={safeProvider}>{avatar}</Tooltip>
  }

  return avatar
}
