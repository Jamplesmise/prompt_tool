'use client'

import { useState, useEffect } from 'react'
import { Input, Select, Space, Typography, Tag, Alert } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

// Cron 预设
const CRON_PRESETS = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每6小时', value: '0 */6 * * *', description: '每6小时执行一次' },
  { label: '每天 00:00', value: '0 0 * * *', description: '每天凌晨执行' },
  { label: '每天 09:00', value: '0 9 * * *', description: '每天早上9点执行' },
  { label: '工作日 09:00', value: '0 9 * * 1-5', description: '周一至周五早上9点执行' },
  { label: '每周一 00:00', value: '0 0 * * 1', description: '每周一凌晨执行' },
  { label: '每月1号 00:00', value: '0 0 1 * *', description: '每月1号凌晨执行' },
]

type CronEditorProps = {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

/**
 * 简单描述 Cron 表达式（中文）
 */
function describeCronExpression(cronExpression: string): string {
  const parts = cronExpression.trim().split(/\s+/)

  if (parts.length !== 5) {
    return '自定义调度'
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // 常见模式匹配
  if (cronExpression === '* * * * *') {
    return '每分钟'
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '每小时整点'
  }

  if (minute === '0' && hour.includes('/')) {
    const interval = hour.split('/')[1]
    return `每 ${interval} 小时`
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '每天 00:00'
  }

  if (minute === '0' && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `每天 ${hour.padStart(2, '0')}:00`
  }

  if (minute === '0' && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return `工作日 ${hour.padStart(2, '0')}:00`
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && /^\d$/.test(dayOfWeek)) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `每${days[parseInt(dayOfWeek)]} 00:00`
  }

  if (minute === '0' && hour === '0' && /^\d+$/.test(dayOfMonth) && month === '*' && dayOfWeek === '*') {
    return `每月 ${dayOfMonth} 号 00:00`
  }

  return '自定义调度'
}

/**
 * 验证 Cron 表达式
 */
function validateCronExpression(expression: string): { isValid: boolean; error?: string } {
  const parts = expression.trim().split(/\s+/)

  if (parts.length !== 5) {
    return { isValid: false, error: 'Cron 表达式必须包含 5 个部分（分 时 日 月 周）' }
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // 简单范围验证
  const ranges = [
    { name: '分钟', value: minute, min: 0, max: 59 },
    { name: '小时', value: hour, min: 0, max: 23 },
    { name: '日', value: dayOfMonth, min: 1, max: 31 },
    { name: '月', value: month, min: 1, max: 12 },
    { name: '周', value: dayOfWeek, min: 0, max: 7 },
  ]

  for (const { name, value, min, max } of ranges) {
    // 允许 * 和包含 / 或 - 的表达式
    if (value === '*' || value.includes('/') || value.includes('-') || value.includes(',')) {
      continue
    }

    const num = parseInt(value)
    if (isNaN(num) || num < min || num > max) {
      return { isValid: false, error: `${name} 值无效（${min}-${max}）` }
    }
  }

  return { isValid: true }
}

export default function CronEditor({ value = '0 0 * * *', onChange, disabled }: CronEditorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [customValue, setCustomValue] = useState(value)
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true })

  // 判断当前值是否为预设
  const currentPreset = CRON_PRESETS.find((p) => p.value === value)

  useEffect(() => {
    if (currentPreset) {
      setMode('preset')
    } else {
      setMode('custom')
      setCustomValue(value)
    }
  }, [value, currentPreset])

  const handlePresetChange = (presetValue: string) => {
    setValidation({ isValid: true })
    onChange?.(presetValue)
  }

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue)
    const result = validateCronExpression(newValue)
    setValidation(result)

    if (result.isValid) {
      onChange?.(newValue)
    }
  }

  const handleModeChange = (newMode: 'preset' | 'custom') => {
    setMode(newMode)
    if (newMode === 'preset' && !currentPreset) {
      // 切换到预设模式时，选择第一个预设
      onChange?.(CRON_PRESETS[0].value)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
        style={{ width: 120 }}
        options={[
          { label: '使用预设', value: 'preset' },
          { label: '自定义', value: 'custom' },
        ]}
      />

      {mode === 'preset' ? (
        <Select
          value={value}
          onChange={handlePresetChange}
          disabled={disabled}
          style={{ width: '100%' }}
          placeholder="选择执行频率"
          options={CRON_PRESETS.map((preset) => ({
            label: (
              <Space>
                <span>{preset.label}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {preset.description}
                </Text>
              </Space>
            ),
            value: preset.value,
          }))}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            disabled={disabled}
            placeholder="分 时 日 月 周（如：0 9 * * 1-5）"
            status={validation.isValid ? undefined : 'error'}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            格式：分钟(0-59) 小时(0-23) 日(1-31) 月(1-12) 周(0-7)
          </Text>
          {!validation.isValid && validation.error && (
            <Alert message={validation.error} type="error" showIcon style={{ padding: '4px 12px' }} />
          )}
        </Space>
      )}

      {validation.isValid && value && (
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <Tag color="blue">{describeCronExpression(value)}</Tag>
          <Text type="secondary" code style={{ fontSize: 12 }}>
            {value}
          </Text>
        </Space>
      )}
    </Space>
  )
}
