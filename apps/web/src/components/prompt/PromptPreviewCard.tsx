'use client'

import { Card, Tag, Button, Space, Typography, Divider, Skeleton } from 'antd'
import { CloseOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { TAG_COLORS } from './TagSelect'

const { Text, Paragraph } = Typography

type PromptPreviewCardProps = {
  id: string
  name: string
  version: number
  tags: string[]
  systemPrompt: string
  userPromptTemplate?: string
  variables: string[]
  defaultModel?: string
  createdBy: string
  updatedAt: string
  loading?: boolean
  onViewDetail?: () => void
  onTest?: () => void
  onClose?: () => void
}

export function PromptPreviewCard({
  name,
  version,
  tags,
  systemPrompt,
  variables,
  defaultModel,
  createdBy,
  updatedAt,
  loading,
  onViewDetail,
  onTest,
  onClose,
}: PromptPreviewCardProps) {
  const getTagColor = (tag: string) => TAG_COLORS[tag] || TAG_COLORS.default

  if (loading) {
    return (
      <Card
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          maxHeight: '80vh',
          zIndex: 1000,
          boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    )
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* 预览卡片 */}
      <Card
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 1000,
          boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{name}</span>
              <Tag color="blue">v{version}</Tag>
            </Space>
            <Space>
              {tags.map((tag) => (
                <Tag key={tag} color={getTagColor(tag)}>
                  {tag}
                </Tag>
              ))}
            </Space>
          </div>
        }
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ marginRight: -8 }}
          />
        }
      >
        {/* System Prompt */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ color: '#666', fontSize: 13 }}>
            System Prompt:
          </Text>
          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 6,
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            <Paragraph
              style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}
              ellipsis={{ rows: 8, expandable: true, symbol: '展开' }}
            >
              {systemPrompt || '(空)'}
            </Paragraph>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* 变量 */}
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ color: '#666', fontSize: 13 }}>
            变量:{' '}
          </Text>
          {variables.length > 0 ? (
            <Space size={4} wrap style={{ marginTop: 4 }}>
              {variables.map((v) => (
                <Tag key={v} color="purple">
                  {`{{${v}}}`}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">无</Text>
          )}
        </div>

        {/* 模型 */}
        {defaultModel && (
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ color: '#666', fontSize: 13 }}>
              模型:{' '}
            </Text>
            <Tag>{defaultModel}</Tag>
          </div>
        )}

        {/* 创建者和更新时间 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#999',
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          <span>创建者: {createdBy}</span>
          <span>更新时间: {dayjs(updatedAt).format('YYYY-MM-DD HH:mm')}</span>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Button icon={<EyeOutlined />} onClick={onViewDetail}>
            查看详情
          </Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={onTest}>
            立即测试
          </Button>
        </div>
      </Card>
    </>
  )
}

export type { PromptPreviewCardProps }
