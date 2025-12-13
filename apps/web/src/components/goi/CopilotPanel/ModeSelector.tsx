'use client'

/**
 * 模式选择器组件
 *
 * 三种运行模式：
 * - 逐步：每个操作都需要确认
 * - 智能：根据规则智能判断
 * - 全自动：除删除外都自动执行
 */

import React from 'react'
import { Radio, Tooltip } from 'antd'
import type { RadioChangeEvent } from 'antd'
import { useCopilot } from '../hooks/useCopilot'
import type { CollaborationMode } from '@platform/shared'
import styles from './styles.module.css'

const MODE_OPTIONS: Array<{
  value: CollaborationMode
  label: string
  tooltip: string
}> = [
  {
    value: 'manual',
    label: '手动',
    tooltip: 'AI 不执行操作，只观察和建议',
  },
  {
    value: 'assisted',
    label: '智能',
    tooltip: '根据规则智能判断是否需要确认（推荐）',
  },
  {
    value: 'auto',
    label: '自动',
    tooltip: '除删除外都自动执行',
  },
]

export const ModeSelector: React.FC = () => {
  const { mode, switchMode, isLoading } = useCopilot()

  const handleChange = (e: RadioChangeEvent) => {
    const newMode = e.target.value as CollaborationMode
    switchMode(newMode)
  }

  return (
    <div className={styles.modeSelector} data-testid="mode-selector">
      <Radio.Group
        value={mode}
        onChange={handleChange}
        optionType="button"
        buttonStyle="solid"
        size="small"
        disabled={isLoading}
        className={styles.modeRadio}
      >
        {MODE_OPTIONS.map((option) => (
          <Tooltip key={option.value} title={option.tooltip}>
            <Radio.Button value={option.value} data-testid={`mode-${option.value}`}>{option.label}</Radio.Button>
          </Tooltip>
        ))}
      </Radio.Group>
    </div>
  )
}

export default ModeSelector
