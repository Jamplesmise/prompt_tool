'use client'

import { Card, Tag, Button, Space, Popconfirm, Tooltip, Divider, Typography } from 'antd'
import { DeleteOutlined, ThunderboltOutlined, EditOutlined } from '@ant-design/icons'
import { useDeleteModel } from '@/hooks/useModels'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionState } from './ConnectionStatus'
import type { ModelPricing } from '@/services/models'

const { Text } = Typography

type ModelCardProps = {
  id: string
  name: string
  modelId: string
  isActive: boolean
  status?: ConnectionState
  latency?: number
  lastTestTime?: string
  error?: string
  config?: {
    temperature?: number
    maxTokens?: number
  }
  pricing?: ModelPricing
  onTest?: () => void
  onEdit?: (model: ModelCardProps) => void
  onDelete?: () => void
  testing?: boolean
}

export function ModelCard({
  id,
  name,
  modelId,
  isActive,
  status = 'unknown',
  latency,
  lastTestTime,
  error,
  config,
  pricing,
  onTest,
  onEdit,
  onDelete,
  testing = false,
}: ModelCardProps) {
  const deleteModel = useDeleteModel()

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    } else {
      deleteModel.mutate(id)
    }
  }

  const handleEdit = () => {
    onEdit?.({ id, name, modelId, isActive, status, latency, lastTestTime, error, config, pricing })
  }

  const displayStatus = testing ? 'testing' : status

  return (
    <Card
      size="small"
      style={{ width: 200, height: 'auto' }}
      hoverable
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {/* 模型名称 */}
        <Text strong ellipsis style={{ fontSize: 14 }}>
          {name}
        </Text>

        {/* 模型 ID */}
        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
          {modelId}
        </Text>

        <Divider style={{ margin: '4px 0' }} />

        {/* 连接状态 */}
        <ConnectionStatus
          status={displayStatus}
          latency={latency}
          error={error}
          lastTestTime={lastTestTime}
          size="small"
        />

        {/* 默认参数 */}
        {config && (config.temperature !== undefined || config.maxTokens !== undefined) && (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {config.temperature !== undefined && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Temperature: {config.temperature}
              </Text>
            )}
            {config.maxTokens !== undefined && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Max Tokens: {config.maxTokens}
              </Text>
            )}
          </Space>
        )}

        {/* 启用状态 */}
        <Tag color={isActive ? 'success' : 'default'} style={{ marginRight: 0 }}>
          {isActive ? '已启用' : '已禁用'}
        </Tag>

        <Divider style={{ margin: '4px 0' }} />

        {/* 操作按钮 */}
        <Space size={4} style={{ width: '100%', justifyContent: 'center' }}>
          <Tooltip title="测试连接">
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={onTest}
              loading={testing}
            />
          </Tooltip>
          <Tooltip title="编辑模型">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={handleEdit} />
          </Tooltip>
          <Popconfirm
            title="确定删除此模型？"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </Space>
    </Card>
  )
}

export type { ModelCardProps }
