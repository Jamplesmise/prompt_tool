'use client'

import type { ReactNode, CSSProperties } from 'react'
import { Card, Spin } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

type StatCardProps = {
  icon: ReactNode
  title: string
  value: number | string
  trend?: {
    value: number
    type: 'up' | 'down'
    period: string // "本周" | "较上周"
  }
  iconBgColor?: string // 渐变起始色
  iconBgColorEnd?: string // 渐变结束色
  onClick?: () => void
  loading?: boolean
}

export function StatCard({
  icon,
  title,
  value,
  trend,
  iconBgColor = '#1677FF',
  iconBgColorEnd,
  onClick,
  loading = false,
}: StatCardProps) {
  const gradientEnd = iconBgColorEnd || iconBgColor

  const iconContainerStyle: CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: `linear-gradient(135deg, ${iconBgColor}, ${gradientEnd})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    color: '#fff',
    flexShrink: 0,
  }

  const cardStyle: CSSProperties = {
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    borderRadius: 8,
  }

  return (
    <Card
      style={cardStyle}
      styles={{
        body: { padding: '20px 24px' },
      }}
      hoverable={!!onClick}
      onClick={onClick}
      className="stat-card"
    >
      {loading ? (
        <div className="flex justify-center items-center h-[68px]">
          <Spin />
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div style={iconContainerStyle}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-500 text-sm mb-1">{title}</div>
            <div className="text-2xl font-semibold text-gray-900 leading-tight">
              {value}
            </div>
            {trend && (
              <div
                className={`text-xs mt-1 flex items-center gap-1 ${
                  trend.type === 'up' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.type === 'up' ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )}
                <span>
                  {trend.type === 'up' ? '+' : ''}
                  {trend.value}
                </span>
                <span className="text-gray-400">{trend.period}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <style jsx global>{`
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </Card>
  )
}
