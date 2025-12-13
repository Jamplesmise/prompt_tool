/**
 * 上下文警告组件
 *
 * 显示上下文使用量和预警状态
 */

'use client'

import React, { useMemo } from 'react'
import { Progress, Button, Tooltip, Space, Typography } from 'antd'
import {
  WarningOutlined,
  CompressOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { ContextUsage, ContextWarningLevel, ContextLayer } from '@platform/shared'

const { Text } = Typography

// ============================================
// 类型定义
// ============================================

export type ContextWarningProps = {
  /** 上下文使用量 */
  usage: ContextUsage
  /** 是否显示详情 */
  showDetails?: boolean
  /** 是否显示压缩按钮 */
  showCompressButton?: boolean
  /** 压缩按钮点击回调 */
  onCompress?: () => void
  /** 是否正在压缩 */
  compressing?: boolean
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 自定义类名 */
  className?: string
}

// ============================================
// 常量
// ============================================

const LAYER_LABELS: Record<ContextLayer, string> = {
  system: '系统层',
  session: '会话层',
  working: '工作层',
  instant: '即时层',
}

const WARNING_COLORS: Record<ContextWarningLevel, string> = {
  normal: '#52c41a',  // 绿色
  warning: '#faad14', // 黄色
  high: '#fa8c16',    // 橙色
  critical: '#f5222d', // 红色
}

const WARNING_MESSAGES: Record<ContextWarningLevel, string> = {
  normal: '上下文使用正常',
  warning: '上下文使用较高，建议及时压缩',
  high: '上下文使用过高，强烈建议压缩',
  critical: '上下文即将耗尽，必须立即压缩',
}

// ============================================
// 组件
// ============================================

/**
 * 上下文警告组件
 */
export const ContextWarning: React.FC<ContextWarningProps> = ({
  usage,
  showDetails = false,
  showCompressButton = true,
  onCompress,
  compressing = false,
  style,
  className,
}) => {
  const { usagePercent, warningLevel, totalTokens, maxTokens, layerBreakdown } = usage

  // 计算进度条状态
  const progressStatus = useMemo(() => {
    if (warningLevel === 'critical') return 'exception'
    if (warningLevel === 'high' || warningLevel === 'warning') return 'active'
    return 'normal'
  }, [warningLevel])

  // 格式化 token 数
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return String(tokens)
  }

  // 层级详情
  const layerDetails = useMemo(() => {
    return Object.entries(layerBreakdown)
      .map(([layer, tokens]) => ({
        layer: layer as ContextLayer,
        label: LAYER_LABELS[layer as ContextLayer],
        tokens,
        percent: (tokens / maxTokens) * 100,
      }))
      .filter((item) => item.tokens > 0)
  }, [layerBreakdown, maxTokens])

  // 提示内容
  const tooltipContent = (
    <div style={{ minWidth: 200 }}>
      <div style={{ marginBottom: 8 }}>
        <Text strong>上下文使用详情</Text>
      </div>
      <div style={{ marginBottom: 4 }}>
        总计: {formatTokens(totalTokens)} / {formatTokens(maxTokens)} tokens
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
        {layerDetails.map((item) => (
          <div key={item.layer} style={{ marginBottom: 4 }}>
            <Text type="secondary">{item.label}:</Text>{' '}
            <Text>{formatTokens(item.tokens)}</Text>
            <Text type="secondary"> ({item.percent.toFixed(1)}%)</Text>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        background: warningLevel !== 'normal' ? `${WARNING_COLORS[warningLevel]}10` : undefined,
        borderRadius: 6,
        ...style,
      }}
    >
      {/* 警告图标 */}
      {warningLevel !== 'normal' && (
        <WarningOutlined
          style={{ color: WARNING_COLORS[warningLevel], fontSize: 16 }}
        />
      )}

      {/* 进度条 */}
      <div style={{ flex: 1, minWidth: 120 }}>
        <Tooltip title={tooltipContent} placement="bottom">
          <div>
            <Progress
              percent={Math.min(usagePercent, 100)}
              size="small"
              status={progressStatus}
              strokeColor={WARNING_COLORS[warningLevel]}
              format={(percent) => `${percent?.toFixed(0)}%`}
            />
          </div>
        </Tooltip>

        {/* 警告消息 */}
        {warningLevel !== 'normal' && (
          <Text
            type={warningLevel === 'critical' ? 'danger' : 'warning'}
            style={{ fontSize: 12 }}
          >
            {WARNING_MESSAGES[warningLevel]}
          </Text>
        )}
      </div>

      {/* 详情展示 */}
      {showDetails && (
        <div style={{ fontSize: 12, color: '#666' }}>
          <Space>
            <span>{formatTokens(totalTokens)}</span>
            <span>/</span>
            <span>{formatTokens(maxTokens)}</span>
          </Space>
        </div>
      )}

      {/* 压缩按钮 */}
      {showCompressButton && onCompress && warningLevel !== 'normal' && (
        <Button
          type={warningLevel === 'critical' ? 'primary' : 'default'}
          danger={warningLevel === 'critical'}
          size="small"
          icon={<CompressOutlined />}
          loading={compressing}
          onClick={onCompress}
        >
          压缩
        </Button>
      )}

      {/* 信息图标 */}
      <Tooltip title="点击查看上下文使用详情">
        <InfoCircleOutlined style={{ color: '#999', cursor: 'pointer' }} />
      </Tooltip>
    </div>
  )
}

// ============================================
// 简化版组件
// ============================================

/**
 * 紧凑型上下文指示器
 */
export const ContextIndicator: React.FC<{
  usage: ContextUsage
  onClick?: () => void
}> = ({ usage, onClick }) => {
  const { usagePercent, warningLevel } = usage
  const color = WARNING_COLORS[warningLevel]

  return (
    <Tooltip title={`上下文使用: ${usagePercent.toFixed(1)}%`}>
      <div
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          background: `${color}15`,
          border: `1px solid ${color}40`,
          borderRadius: 12,
          cursor: onClick ? 'pointer' : 'default',
          fontSize: 12,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
          }}
        />
        <span style={{ color }}>{usagePercent.toFixed(0)}%</span>
      </div>
    </Tooltip>
  )
}

export default ContextWarning
