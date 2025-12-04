'use client'

import { Tag, Tooltip, Spin } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
} from '@ant-design/icons'

type ConnectionState = 'connected' | 'slow' | 'failed' | 'unknown' | 'testing'

type ConnectionStatusProps = {
  status: ConnectionState
  latency?: number        // 毫秒
  error?: string          // 错误信息
  lastTestTime?: string   // 最后测试时间
  size?: 'small' | 'default'
}

const STATUS_CONFIG: Record<ConnectionState, { color: string; text: string }> = {
  connected: { color: '#52C41A', text: '已连接' },
  slow: { color: '#FAAD14', text: '连接慢' },
  failed: { color: '#FF4D4F', text: '连接失败' },
  unknown: { color: '#8c8c8c', text: '未测试' },
  testing: { color: '#1677FF', text: '测试中' },
}

const StatusIcon = ({ status }: { status: ConnectionState }) => {
  switch (status) {
    case 'connected':
      return <CheckCircleOutlined />
    case 'slow':
      return <WarningOutlined />
    case 'failed':
      return <CloseCircleOutlined />
    case 'unknown':
      return <QuestionCircleOutlined />
    case 'testing':
      return <Spin indicator={<LoadingOutlined spin />} size="small" />
    default:
      return null
  }
}

export function ConnectionStatus({
  status,
  latency,
  error,
  lastTestTime,
  size = 'default',
}: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status]

  const tooltipContent = () => {
    const lines: string[] = []
    if (latency !== undefined && status !== 'testing') {
      lines.push(`延迟: ${latency >= 1000 ? `${(latency / 1000).toFixed(2)}s` : `${latency}ms`}`)
    }
    if (error) {
      lines.push(`错误: ${error}`)
    }
    if (lastTestTime) {
      lines.push(`最后测试: ${lastTestTime}`)
    }
    return lines.length > 0 ? lines.join('\n') : undefined
  }

  const content = tooltipContent()

  const tag = (
    <Tag
      color={config.color}
      icon={<StatusIcon status={status} />}
      style={{
        fontSize: size === 'small' ? 11 : 12,
        padding: size === 'small' ? '0 4px' : '0 7px',
      }}
    >
      {config.text}
      {latency !== undefined && status !== 'testing' && status !== 'unknown' && (
        <span style={{ marginLeft: 4, opacity: 0.85 }}>
          {latency >= 1000 ? `${(latency / 1000).toFixed(1)}s` : `${latency}ms`}
        </span>
      )}
    </Tag>
  )

  return content ? (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{content}</span>}>
      {tag}
    </Tooltip>
  ) : (
    tag
  )
}

export type { ConnectionState, ConnectionStatusProps }
