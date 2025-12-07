'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ArrowUpOutlined, ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons'
import { PRIMARY, GRAY, SEMANTIC } from '@/theme/colors'
import styles from './StatCard.module.css'

export type IconBgType = 'primary' | 'success' | 'warning' | 'info'

export type StatCardProps = {
  icon: ReactNode
  iconBg?: IconBgType
  title: string
  value: number | string
  suffix?: string
  trend?: {
    value: number
    type: 'up' | 'down'
    label?: string
  }
  onClick?: () => void
  loading?: boolean
}

const iconBgConfig: Record<IconBgType, { gradient: string; color: string }> = {
  primary: {
    gradient: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
    color: '#fff',
  },
  success: {
    gradient: `linear-gradient(135deg, #34D399 0%, ${SEMANTIC.success} 50%, #059669 100%)`,
    color: '#fff',
  },
  warning: {
    gradient: `linear-gradient(135deg, #FBBF24 0%, ${SEMANTIC.warning} 50%, #D97706 100%)`,
    color: '#fff',
  },
  info: {
    gradient: `linear-gradient(135deg, #60A5FA 0%, ${SEMANTIC.info} 50%, #2563EB 100%)`,
    color: '#fff',
  },
}

export function StatCard({
  icon,
  iconBg = 'primary',
  title,
  value,
  suffix,
  trend,
  onClick,
  loading = false,
}: StatCardProps) {
  const bgConfig = iconBgConfig[iconBg]

  const cardStyle: CSSProperties = {
    cursor: onClick ? 'pointer' : 'default',
  }

  const iconStyle: CSSProperties = {
    background: bgConfig.gradient,
    color: bgConfig.color,
  }

  return (
    <div
      className={styles.card}
      style={cardStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className={styles.iconWrapper} style={iconStyle}>
        {loading ? <LoadingOutlined spin /> : icon}
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.valueRow}>
          <span className={styles.value}>{loading ? '-' : value}</span>
          {suffix && !loading && <span className={styles.suffix}>{suffix}</span>}
        </div>
        {trend && !loading && (
          <div
            className={styles.trend}
            style={{ color: trend.type === 'up' ? SEMANTIC.success : SEMANTIC.error }}
          >
            {trend.type === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            <span className={styles.trendValue}>{trend.value}%</span>
            {trend.label && <span className={styles.trendLabel}>{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
