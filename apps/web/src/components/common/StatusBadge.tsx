'use client'

import type { CSSProperties } from 'react'
import styles from './StatusBadge.module.css'

export type StatusType = 'success' | 'processing' | 'warning' | 'error' | 'default'

export type StatusBadgeProps = {
  status: StatusType
  text: string
  dot?: boolean
}

const statusConfig: Record<StatusType, { bg: string; color: string; dotColor: string }> = {
  success: {
    bg: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
    color: '#065F46',
    dotColor: '#10B981',
  },
  processing: {
    bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)',
    color: '#991B1B',
    dotColor: '#EF4444',
  },
  warning: {
    bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
    color: '#92400E',
    dotColor: '#F59E0B',
  },
  error: {
    bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)',
    color: '#991B1B',
    dotColor: '#EF4444',
  },
  default: {
    bg: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
    color: '#4B5563',
    dotColor: '#9CA3AF',
  },
}

export function StatusBadge({ status, text, dot = false }: StatusBadgeProps) {
  const config = statusConfig[status]

  const badgeStyle: CSSProperties = {
    background: config.bg,
    color: config.color,
  }

  const dotStyle: CSSProperties = {
    backgroundColor: config.dotColor,
  }

  return (
    <span className={styles.badge} style={badgeStyle}>
      {dot && (
        <span
          className={`${styles.dot} ${status === 'processing' ? styles.pulse : ''}`}
          style={dotStyle}
        />
      )}
      {text}
    </span>
  )
}
