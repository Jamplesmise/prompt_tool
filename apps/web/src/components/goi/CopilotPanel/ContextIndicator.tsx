'use client'

/**
 * 上下文指示器组件
 *
 * 显示上下文使用量：
 * - 进度条
 * - 不同颜色表示不同状态
 */

import React from 'react'
import { Progress, Tooltip } from 'antd'
import styles from './styles.module.css'

type ContextIndicatorProps = {
  usage: number // 0-100
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
  usage,
}) => {
  // 根据使用量确定颜色和状态
  const getStatus = (): 'success' | 'normal' | 'exception' | 'active' => {
    if (usage >= 90) return 'exception'
    if (usage >= 70) return 'normal'
    return 'success'
  }

  const getColor = (): string => {
    if (usage >= 90) return '#ff4d4f'
    if (usage >= 70) return '#faad14'
    return '#52c41a'
  }

  const getMessage = (): string => {
    if (usage >= 90) return '上下文即将用尽，建议清理或重新开始'
    if (usage >= 70) return '上下文使用较多，注意控制'
    return '上下文使用正常'
  }

  return (
    <div className={styles.contextIndicator}>
      <span className={styles.contextLabel}>上下文:</span>
      <Tooltip title={getMessage()}>
        <Progress
          percent={usage}
          size="small"
          status={getStatus()}
          strokeColor={getColor()}
          className={styles.contextProgress}
          format={(percent) => `${percent}%`}
        />
      </Tooltip>
    </div>
  )
}

export default ContextIndicator
