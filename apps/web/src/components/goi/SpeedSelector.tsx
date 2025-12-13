'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tooltip, Segmented } from 'antd'
import {
  ThunderboltOutlined,
  CaretRightOutlined,
  ClockCircleOutlined,
  StepForwardOutlined,
} from '@ant-design/icons'
import type { ExecutionSpeed } from '@/lib/goi/execution/speedControl'
import {
  SPEED_CONFIG,
  speedController,
  getSpeedOptions,
} from '@/lib/goi/execution/speedControl'

type SpeedSelectorProps = {
  /** 初始速度 */
  defaultSpeed?: ExecutionSpeed
  /** 速度变化回调 */
  onChange?: (speed: ExecutionSpeed) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示描述 */
  showDescription?: boolean
  /** 紧凑模式 */
  compact?: boolean
}

/**
 * 速度图标组件
 */
const SpeedIcon = ({ speed }: { speed: ExecutionSpeed }) => {
  const iconStyle = { fontSize: 14 }

  switch (speed) {
    case 'fast':
      return <ThunderboltOutlined style={iconStyle} />
    case 'normal':
      return <CaretRightOutlined style={iconStyle} />
    case 'slow':
      return <ClockCircleOutlined style={iconStyle} />
    case 'step':
      return <StepForwardOutlined style={iconStyle} />
  }
}

/**
 * 执行速度选择器组件
 *
 * 让用户可以选择 AI 操作的执行速度
 */
export function SpeedSelector({
  defaultSpeed = 'normal',
  onChange,
  disabled = false,
  showDescription = false,
  compact = false,
}: SpeedSelectorProps) {
  const [speed, setSpeed] = useState<ExecutionSpeed>(defaultSpeed)

  // 同步初始值
  useEffect(() => {
    speedController.setSpeed(defaultSpeed)
  }, [defaultSpeed])

  const handleChange = useCallback(
    (value: ExecutionSpeed) => {
      setSpeed(value)
      speedController.setSpeed(value)
      onChange?.(value)
    },
    [onChange]
  )

  const options = getSpeedOptions()

  // 紧凑模式：只显示图标
  if (compact) {
    return (
      <div className="speed-selector-compact">
        <Segmented
          value={speed}
          onChange={(v) => handleChange(v as ExecutionSpeed)}
          disabled={disabled}
          size="small"
          options={options.map((opt) => ({
            value: opt.value,
            label: (
              <Tooltip title={`${opt.label}: ${opt.description}`}>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <SpeedIcon speed={opt.value} />
                </span>
              </Tooltip>
            ),
          }))}
        />
      </div>
    )
  }

  return (
    <div className="speed-selector">
      <div className="speed-selector-label" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#666' }}>执行速度</span>
      </div>

      <Segmented
        value={speed}
        onChange={(v) => handleChange(v as ExecutionSpeed)}
        disabled={disabled}
        options={options.map((opt) => ({
          value: opt.value,
          label: (
            <Tooltip title={opt.description}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0 4px',
                }}
              >
                <SpeedIcon speed={opt.value} />
                <span>{opt.label}</span>
              </span>
            </Tooltip>
          ),
        }))}
      />

      {showDescription && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#999',
          }}
        >
          {SPEED_CONFIG[speed].description}
        </div>
      )}
    </div>
  )
}

/**
 * 单步确认按钮组件
 *
 * 用于单步执行模式下确认继续
 */
export function StepConfirmButton({
  onConfirm,
  disabled = false,
}: {
  onConfirm?: () => void
  disabled?: boolean
}) {
  const handleConfirm = useCallback(() => {
    speedController.confirmStep()
    onConfirm?.()
  }, [onConfirm])

  return (
    <button
      onClick={handleConfirm}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        border: 'none',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
      }}
    >
      <StepForwardOutlined />
      继续下一步
    </button>
  )
}
