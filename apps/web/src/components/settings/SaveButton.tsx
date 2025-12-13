'use client'

import { Button, Tooltip } from 'antd'
import { LoadingOutlined, CheckOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons'
import { useEffect, useRef } from 'react'

export type SaveButtonState = 'idle' | 'saving' | 'saved' | 'error'

type SaveButtonProps = {
  state: SaveButtonState
  onClick: () => void
  disabled?: boolean
  errorMessage?: string
}

const STATE_CONFIG: Record<SaveButtonState, {
  text: string
  type: 'primary' | 'default' | 'text' | 'link' | 'dashed'
  danger?: boolean
  icon: React.ReactNode
  loading?: boolean
}> = {
  idle: {
    text: '保存设置',
    type: 'primary',
    icon: <SaveOutlined />,
  },
  saving: {
    text: '保存中...',
    type: 'primary',
    icon: <LoadingOutlined />,
    loading: true,
  },
  saved: {
    text: '已保存',
    type: 'default',
    icon: <CheckOutlined style={{ color: '#52c41a' }} />,
  },
  error: {
    text: '保存失败',
    type: 'primary',
    danger: true,
    icon: <CloseOutlined />,
  },
}

export function SaveButton({ state, onClick, disabled, errorMessage }: SaveButtonProps) {
  const config = STATE_CONFIG[state]
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const button = (
    <Button
      type={config.type}
      danger={config.danger}
      icon={config.icon}
      loading={config.loading}
      disabled={disabled || state === 'saving'}
      onClick={onClick}
    >
      {config.text}
    </Button>
  )

  if (state === 'error' && errorMessage) {
    return (
      <Tooltip title={errorMessage} color="red">
        {button}
      </Tooltip>
    )
  }

  return button
}
