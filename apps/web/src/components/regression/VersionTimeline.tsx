'use client'

import { Card, Timeline, Typography, Tag, Space, Tooltip } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import type { VersionSnapshot } from '@/components/results/types'

const { Text } = Typography

type VersionTimelineProps = {
  snapshots: VersionSnapshot[]
  currentVersion?: number
  onVersionClick?: (snapshot: VersionSnapshot) => void
}

/**
 * 版本时间线组件
 * 展示版本变更的时间线
 */
export function VersionTimeline({
  snapshots,
  currentVersion,
  onVersionClick,
}: VersionTimelineProps) {
  // 按版本降序排序（最新的在上面）
  const sortedSnapshots = [...snapshots].sort((a, b) => b.version - a.version)

  // 计算相邻版本的变化
  const getChangeIndicator = (current: VersionSnapshot, index: number) => {
    if (index >= sortedSnapshots.length - 1) return null

    const previous = sortedSnapshots[index + 1]
    const passRateChange = current.metrics.passRate - previous.metrics.passRate

    if (passRateChange > 2) {
      return { icon: <ArrowUpOutlined />, color: '#52c41a', text: `+${passRateChange.toFixed(1)}%` }
    }
    if (passRateChange < -2) {
      return { icon: <ArrowDownOutlined />, color: '#ff4d4f', text: `${passRateChange.toFixed(1)}%` }
    }
    return { icon: <MinusOutlined />, color: '#8c8c8c', text: '稳定' }
  }

  // 获取时间线项的颜色
  const getTimelineColor = (snapshot: VersionSnapshot) => {
    const passRate = snapshot.metrics.passRate
    if (passRate >= 90) return 'green'
    if (passRate >= 70) return 'blue'
    if (passRate >= 50) return 'orange'
    return 'red'
  }

  // 格式化日期
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (snapshots.length === 0) {
    return (
      <Card size="small" title="版本时间线">
        <Text type="secondary">暂无版本数据</Text>
      </Card>
    )
  }

  return (
    <Card size="small" title="版本时间线">
      <Timeline
        mode="left"
        items={sortedSnapshots.map((snapshot, index) => {
          const isCurrent = snapshot.version === currentVersion
          const change = getChangeIndicator(snapshot, index)

          return {
            color: getTimelineColor(snapshot),
            dot: isCurrent ? (
              <ClockCircleOutlined style={{ fontSize: 16 }} />
            ) : snapshot.metrics.passRate >= 80 ? (
              <CheckCircleOutlined style={{ fontSize: 14 }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 14 }} />
            ),
            label: (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(snapshot.createdAt)}
              </Text>
            ),
            children: (
              <div
                style={{
                  cursor: onVersionClick ? 'pointer' : 'default',
                  padding: '8px 12px',
                  background: isCurrent ? '#e6f7ff' : '#fafafa',
                  borderRadius: 8,
                  border: isCurrent ? '1px solid #91d5ff' : '1px solid #f0f0f0',
                  marginBottom: 8,
                }}
                onClick={() => onVersionClick?.(snapshot)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Space>
                    <Text strong>版本 {snapshot.version}</Text>
                    {isCurrent && <Tag color="blue">当前</Tag>}
                  </Space>
                  {change && (
                    <Tooltip title={`通过率变化: ${change.text}`}>
                      <span style={{ color: change.color }}>
                        {change.icon} {change.text}
                      </span>
                    </Tooltip>
                  )}
                </div>

                {/* 关键指标 */}
                <Space size={16} style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    通过率: <Text style={{ color: snapshot.metrics.passRate >= 80 ? '#52c41a' : '#ff4d4f' }}>
                      {snapshot.metrics.passRate.toFixed(1)}%
                    </Text>
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    测试数: {snapshot.metrics.totalTests}
                  </Text>
                  {snapshot.metrics.avgLatency > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      延迟: {(snapshot.metrics.avgLatency / 1000).toFixed(2)}s
                    </Text>
                  )}
                </Space>

                {/* 变更描述 */}
                {snapshot.changeDescription && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {snapshot.changeDescription}
                    </Text>
                  </div>
                )}
              </div>
            ),
          }
        })}
      />
    </Card>
  )
}
