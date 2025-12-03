'use client'

import { List, Tag, Button, Typography, Tooltip, Popconfirm } from 'antd'
import { HistoryOutlined, RollbackOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { VersionListItem } from '@/services/prompts'

const { Text } = Typography

type VersionListProps = {
  versions: VersionListItem[]
  currentVersion: number
  loading?: boolean
  onView?: (versionId: string) => void
  onRollback?: (versionId: string) => void
}

export function VersionList({
  versions,
  currentVersion,
  loading = false,
  onView,
  onRollback,
}: VersionListProps) {
  return (
    <List
      loading={loading}
      dataSource={versions}
      locale={{ emptyText: '暂无版本记录' }}
      renderItem={(item) => {
        const isCurrent = item.version === currentVersion

        return (
          <List.Item
            style={{
              padding: '12px',
              background: isCurrent ? '#e6f4ff' : 'transparent',
              borderRadius: 6,
              marginBottom: 4,
            }}
            actions={[
              <Tooltip key="view" title="查看">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onView?.(item.id)}
                />
              </Tooltip>,
              !isCurrent && (
                <Popconfirm
                  key="rollback"
                  title="确认回滚"
                  description={`确定要回滚到 v${item.version} 吗？这将创建一个新版本。`}
                  onConfirm={() => onRollback?.(item.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Tooltip title="回滚到此版本">
                    <Button
                      type="text"
                      size="small"
                      icon={<RollbackOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isCurrent ? '#1890ff' : '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HistoryOutlined
                    style={{ color: isCurrent ? '#fff' : '#999' }}
                  />
                </div>
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>v{item.version}</Text>
                  {isCurrent && <Tag color="blue">当前</Tag>}
                </div>
              }
              description={
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: '#666' }}>
                    {item.changeLog || '无变更说明'}
                  </div>
                  <div style={{ color: '#999', marginTop: 4 }}>
                    {item.createdBy?.name} · {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                  </div>
                </div>
              }
            />
          </List.Item>
        )
      }}
    />
  )
}
