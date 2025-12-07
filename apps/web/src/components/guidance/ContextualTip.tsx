'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Space, Typography } from 'antd'
import { X, Lightbulb } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useGuidanceStore } from '@/stores/guidanceStore'

const { Text, Paragraph } = Typography

type ContextualTipProps = {
  /** 提示的唯一标识 */
  tipId: string
  /** 图标 */
  icon?: ReactNode
  /** 标题 */
  title: string
  /** 描述文字 */
  description?: string
  /** 主要操作按钮 */
  primaryAction?: {
    text: string
    onClick: () => void
  }
  /** 次要操作按钮 */
  secondaryAction?: {
    text: string
    onClick: () => void
  }
  /** 是否可关闭 */
  closable?: boolean
  /** 是否显示"不再提示"选项 */
  showDontShowAgain?: boolean
  /** 关闭回调 */
  onClose?: () => void
  /** 样式类型 */
  type?: 'info' | 'success' | 'warning'
  /** 自定义样式 */
  style?: CSSProperties
}

const typeStyles: Record<string, { bg: string; border: string; iconColor: string }> = {
  info: {
    bg: '#f0f7ff',
    border: '#91caff',
    iconColor: '#EF4444',
  },
  success: {
    bg: '#f6ffed',
    border: '#b7eb8f',
    iconColor: '#52c41a',
  },
  warning: {
    bg: '#fffbe6',
    border: '#ffe58f',
    iconColor: '#faad14',
  },
}

export function ContextualTip({
  tipId,
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  closable = true,
  showDontShowAgain = true,
  onClose,
  type = 'info',
  style,
}: ContextualTipProps) {
  const [visible, setVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(true)
  const { shouldShowTip, dismissTip, dismissTipPermanently } = useGuidanceStore()

  // 入场动画
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [])

  // 检查是否应该显示
  if (!shouldShowTip(tipId) || !visible) {
    return null
  }

  const handleClose = () => {
    setVisible(false)
    dismissTip(tipId)
    onClose?.()
  }

  const handleDontShowAgain = () => {
    setVisible(false)
    dismissTipPermanently(tipId)
    onClose?.()
  }

  const styles = typeStyles[type]

  const cardStyle: CSSProperties = {
    backgroundColor: styles.bg,
    borderColor: styles.border,
    borderRadius: 8,
    opacity: isAnimating ? 0 : 1,
    transform: isAnimating ? 'translateY(-10px)' : 'translateY(0)',
    transition: 'all 0.3s ease',
    ...style,
  }

  const iconStyle: CSSProperties = {
    color: styles.iconColor,
    flexShrink: 0,
  }

  return (
    <Card size="small" style={cardStyle} styles={{ body: { padding: '12px 16px' } }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={iconStyle}>
          {icon || <Lightbulb size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong style={{ fontSize: 14 }}>
              {title}
            </Text>
            {closable && (
              <Button
                type="text"
                size="small"
                icon={<X size={14} />}
                onClick={handleClose}
                style={{ marginTop: -4, marginRight: -8 }}
              />
            )}
          </div>
          {description && (
            <Paragraph
              type="secondary"
              style={{ fontSize: 13, marginBottom: 0, marginTop: 4 }}
            >
              {description}
            </Paragraph>
          )}
          {(primaryAction || secondaryAction || showDontShowAgain) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <Space size={8}>
                {primaryAction && (
                  <Button type="primary" size="small" onClick={primaryAction.onClick}>
                    {primaryAction.text}
                  </Button>
                )}
                {secondaryAction && (
                  <Button size="small" onClick={secondaryAction.onClick}>
                    {secondaryAction.text}
                  </Button>
                )}
              </Space>
              {showDontShowAgain && (
                <Button type="link" size="small" onClick={handleDontShowAgain}>
                  不再提示
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
