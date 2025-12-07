'use client'

import { List, Tag, Typography, Button, Empty, Space } from 'antd'
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  AlertOutlined,
  RightOutlined,
} from '@ant-design/icons'
import type { AlertSeverity, AlertMetric, AlertCondition } from '@platform/shared'

// 告警列表项类型
type AlertItem = {
  id: string
  ruleId: string
  value: number
  createdAt: string | Date
  rule?: {
    id: string
    name: string
    metric: AlertMetric
    condition: AlertCondition
    threshold: number
    severity: AlertSeverity
  } | null
}
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import Link from 'next/link'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

type AlertListProps = {
  alerts: AlertItem[]
  loading?: boolean
  showViewAll?: boolean
}

const severityConfig: Record<AlertSeverity, {
  color: string
  icon: React.ReactNode
  text: string
}> = {
  WARNING: {
    color: 'warning',
    icon: <WarningOutlined />,
    text: '警告',
  },
  CRITICAL: {
    color: 'error',
    icon: <ExclamationCircleOutlined />,
    text: '严重',
  },
  URGENT: {
    color: 'red',
    icon: <AlertOutlined />,
    text: '紧急',
  },
}

export default function AlertList({
  alerts,
  loading,
  showViewAll = true,
}: AlertListProps) {
  if (!loading && alerts.length === 0) {
    return (
      <Empty
        description="暂无活跃告警"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <div>
      <List
        loading={loading}
        dataSource={alerts}
        renderItem={(alert) => {
          const config = severityConfig[alert.rule?.severity || 'WARNING']

          return (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Tag color={config.color} icon={config.icon}>
                    {config.text}
                  </Tag>
                }
                title={
                  <Space>
                    <Text>{alert.rule?.name || '未知规则'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(alert.createdAt).fromNow()}
                    </Text>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      当前值: {alert.value.toFixed(4)} | 阈值: {alert.rule?.threshold}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )
        }}
      />
      {showViewAll && alerts.length > 0 && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Link href="/monitor/alerts">
            <Button type="link" size="small">
              查看全部 <RightOutlined />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
