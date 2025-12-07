'use client'

import { Card, Typography, Space, Button, Popconfirm, Tooltip } from 'antd'
import {
  DatabaseOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  SaveOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text, Title } = Typography

type StorageType = 'persistent' | 'temporary'

type DatasetCardProps = {
  id: string
  name: string
  rowCount: number
  storageType: StorageType
  updatedAt: string
  onView?: () => void
  onExport?: () => void
  onDelete?: () => void
}

const STORAGE_CONFIG: Record<
  StorageType,
  { icon: React.ReactNode; label: string; color: string }
> = {
  persistent: {
    icon: <SaveOutlined />,
    label: '持久化',
    color: '#52C41A',
  },
  temporary: {
    icon: <ClockCircleOutlined />,
    label: '临时',
    color: '#FAAD14',
  },
}

export function DatasetCard({
  id,
  name,
  rowCount,
  storageType,
  updatedAt,
  onView,
  onExport,
  onDelete,
}: DatasetCardProps) {
  const storage = STORAGE_CONFIG[storageType]
  const relativeTimeStr = dayjs(updatedAt).fromNow()

  return (
    <Card
      hoverable
      style={{
        borderRadius: 8,
        overflow: 'hidden',
      }}
      styles={{
        body: { padding: 16 },
      }}
      actions={[
        <Tooltip title="查看详情" key="view">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={onView}
          >
            查看
          </Button>
        </Tooltip>,
        <Tooltip title="导出数据" key="export">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            size="small"
            onClick={onExport}
          >
            导出
          </Button>
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description="删除后无法恢复，确定要删除吗？"
          onConfirm={onDelete}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <Space align="start">
          <DatabaseOutlined style={{ fontSize: 20, color: '#EF4444' }} />
          <Title
            level={5}
            ellipsis={{ tooltip: name }}
            style={{ margin: 0, maxWidth: 180 }}
          >
            {name}
          </Title>
        </Space>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary">行数</Text>
          <Text strong>{rowCount.toLocaleString()}</Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">存储</Text>
          <Space size={4}>
            <span style={{ color: storage.color }}>{storage.icon}</span>
            <Text style={{ color: storage.color }}>{storage.label}</Text>
          </Space>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary">更新</Text>
          <Tooltip title={dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss')}>
            <Text>{relativeTimeStr}</Text>
          </Tooltip>
        </div>
      </div>
    </Card>
  )
}
