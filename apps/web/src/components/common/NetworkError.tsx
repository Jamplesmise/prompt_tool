'use client'

import { useState } from 'react'
import { Button } from 'antd'
import { DisconnectOutlined, ReloadOutlined, WifiOutlined, ApiOutlined } from '@ant-design/icons'
import styles from './NetworkError.module.css'

export type NetworkErrorType = 'network' | 'server' | 'timeout' | 'unknown'

export type NetworkErrorProps = {
  type?: NetworkErrorType
  title?: string
  message?: string
  onRetry?: () => Promise<void> | void
  compact?: boolean
}

const errorConfig: Record<NetworkErrorType, { icon: React.ReactNode; title: string; message: string }> = {
  network: {
    icon: <WifiOutlined />,
    title: '网络连接失败',
    message: '请检查您的网络连接后重试',
  },
  server: {
    icon: <ApiOutlined />,
    title: '服务器异常',
    message: '服务器暂时无法响应，请稍后重试',
  },
  timeout: {
    icon: <DisconnectOutlined />,
    title: '请求超时',
    message: '网络响应时间过长，请检查网络后重试',
  },
  unknown: {
    icon: <DisconnectOutlined />,
    title: '加载失败',
    message: '发生了未知错误，请稍后重试',
  },
}

export function NetworkError({
  type = 'unknown',
  title,
  message,
  onRetry,
  compact = false,
}: NetworkErrorProps) {
  const [loading, setLoading] = useState(false)
  const config = errorConfig[type]

  const handleRetry = async () => {
    if (!onRetry) return

    setLoading(true)
    try {
      await onRetry()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <div className={styles.icon}>{config.icon}</div>
      <h3 className={styles.title}>{title || config.title}</h3>
      <p className={styles.message}>{message || config.message}</p>
      {onRetry && (
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRetry}
          loading={loading}
          className={styles.retryButton}
        >
          {loading ? '重试中...' : '重试'}
        </Button>
      )}
    </div>
  )
}
