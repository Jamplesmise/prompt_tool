'use client'

import { useState } from 'react'
import { Card, Button, Space, Popconfirm, Typography, Empty, Collapse, Tooltip } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CaretRightOutlined,
} from '@ant-design/icons'
import { useDeleteProvider } from '@/hooks/useModels'
import { ModelCard } from './ModelCard'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionState } from './ConnectionStatus'
import type { ModelPricing } from '@/services/models'

const { Text } = Typography

type ModelInfo = {
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
}

type ProviderGroupProps = {
  id: string
  name: string
  type: string
  status?: ConnectionState
  baseUrl: string
  apiKeyMasked: string
  isActive: boolean
  error?: string
  models: ModelInfo[]
  defaultExpanded?: boolean
  testingProviderId?: string
  testingModelId?: string
  onEdit?: () => void
  onDelete?: () => void
  onTest?: () => void
  onAddModel?: () => void
  onModelTest?: (modelId: string) => void
  onModelEdit?: (model: ModelInfo) => void
  onModelDelete?: (modelId: string) => void
}

const providerTypeLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  azure: 'Azure',
  custom: '自定义',
}

function maskApiKey(key: string): string {
  if (!key) return '***'
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}

export function ProviderGroup({
  id,
  name,
  type,
  status = 'unknown',
  baseUrl,
  apiKeyMasked,
  isActive,
  error,
  models,
  defaultExpanded = true,
  testingProviderId,
  testingModelId,
  onEdit,
  onDelete,
  onTest,
  onAddModel,
  onModelTest,
  onModelEdit,
  onModelDelete,
}: ProviderGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const deleteProvider = useDeleteProvider()

  const isTestingProvider = testingProviderId === id
  const displayStatus = isTestingProvider ? 'testing' : status

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    } else {
      deleteProvider.mutate(id)
    }
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Space size={12}>
        <ConnectionStatus status={displayStatus} error={error} size="small" />
        <Text strong style={{ fontSize: 15 }}>{name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {providerTypeLabels[type] || type}
        </Text>
        {!expanded && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({models.length} 个模型)
          </Text>
        )}
      </Space>
    </div>
  )

  const extra = (
    <Space size={4} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="测试提供商">
        <Button
          type="text"
          size="small"
          icon={<ThunderboltOutlined />}
          onClick={onTest}
          loading={isTestingProvider}
        />
      </Tooltip>
      <Tooltip title="编辑提供商">
        <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} />
      </Tooltip>
      <Popconfirm
        title="确定删除此提供商？"
        description="删除后，其下所有模型也将被删除"
        onConfirm={handleDelete}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  )

  const collapseItems = [
    {
      key: id,
      label: header,
      extra,
      children: (
        <div>
          {/* 提供商信息 */}
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Base URL: <Text code style={{ fontSize: 11 }}>{baseUrl}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                API Key: <Text code style={{ fontSize: 11 }}>{maskApiKey(apiKeyMasked)}</Text>
              </Text>
            </Space>
          </div>

          {/* 模型列表 */}
          <Space wrap size={[12, 12]} style={{ width: '100%' }}>
            {models.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无模型"
                style={{ margin: '12px 0', width: '100%' }}
              />
            ) : (
              models.map((model) => (
                <ModelCard
                  key={model.id}
                  {...model}
                  testing={testingModelId === model.id}
                  onTest={() => onModelTest?.(model.id)}
                  onEdit={() => onModelEdit?.(model)}
                  onDelete={() => onModelDelete?.(model.id)}
                />
              ))
            )}
            {/* 添加模型卡片 */}
            <Card
              size="small"
              style={{
                width: 200,
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderStyle: 'dashed',
              }}
              styles={{ body: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } }}
              onClick={onAddModel}
              hoverable
            >
              <Space direction="vertical" align="center">
                <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
                <span style={{ color: '#999' }}>添加模型</span>
              </Space>
            </Card>
          </Space>
        </div>
      ),
    },
  ]

  return (
    <Card
      style={{ marginBottom: 16 }}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
      }}
      bordered
    >
      <Collapse
        ghost
        activeKey={expanded ? [id] : []}
        onChange={(keys) => setExpanded(keys.includes(id))}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ fontSize: 12 }} />
        )}
        items={collapseItems}
      />
    </Card>
  )
}

export type { ProviderGroupProps, ModelInfo as ProviderModelInfo }
