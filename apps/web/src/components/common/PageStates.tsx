'use client'

import { Spin, Empty, Button, Result } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

type LoadingStateProps = {
  tip?: string
}

export function LoadingState({ tip }: LoadingStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <Spin size="large">
        {tip && <div style={{ marginTop: 16 }}>{tip}</div>}
      </Spin>
    </div>
  )
}

type ErrorStateProps = {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = '加载失败，请稍后重试',
  onRetry,
}: ErrorStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <Result
        status="error"
        title="出错了"
        subTitle={message}
        extra={
          onRetry && (
            <Button icon={<ReloadOutlined />} onClick={onRetry}>
              重试
            </Button>
          )
        }
      />
    </div>
  )
}

type EmptyStateProps = {
  description?: string
  actionText?: string
  onAction?: () => void
  children?: ReactNode
}

export function EmptyState({
  description = '暂无数据',
  actionText,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <Empty description={description} style={{ padding: '100px 0' }}>
      {children ||
        (actionText && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionText}
          </Button>
        ))}
    </Empty>
  )
}
