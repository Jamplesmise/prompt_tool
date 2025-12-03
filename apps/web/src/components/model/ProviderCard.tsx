'use client'

import { Card, Button, Space, Popconfirm, Tag, Typography, Empty } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useDeleteProvider } from '@/hooks/useModels'
import { ModelCard } from './ModelCard'
import type { ProviderWithModels } from '@/services/models'

const { Text } = Typography

type ModelEditData = {
  id: string
  name: string
  modelId: string
  isActive: boolean
  config?: Record<string, unknown>
  pricing?: { inputPerMillion?: number; outputPerMillion?: number; currency?: 'USD' | 'CNY' }
}

type ProviderCardProps = {
  provider: ProviderWithModels
  onEdit: () => void
  onAddModel: () => void
  onEditModel?: (model: ModelEditData) => void
}

const providerTypeLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  azure: 'Azure',
  custom: '自定义',
}

export function ProviderCard({ provider, onEdit, onAddModel, onEditModel }: ProviderCardProps) {
  const deleteProvider = useDeleteProvider()

  const handleDelete = () => {
    deleteProvider.mutate(provider.id)
  }

  return (
    <Card
      title={
        <Space>
          <span>{provider.name}</span>
          <Tag color="blue">{providerTypeLabels[provider.type] || provider.type}</Tag>
          <Tag color={provider.isActive ? 'success' : 'default'}>
            {provider.isActive ? '已启用' : '已禁用'}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此提供商？"
            description="删除后，其下所有模型也将被删除"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">Base URL: </Text>
        <Text code>{provider.baseUrl}</Text>
        <Text type="secondary" style={{ marginLeft: 16 }}>
          API Key: {provider.apiKeyMasked}
        </Text>
      </div>

      <Space wrap size={[12, 12]}>
        {provider.models.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模型" style={{ margin: '12px 0' }} />
        ) : (
          provider.models.map((model) => (
            <ModelCard
              key={model.id}
              id={model.id}
              name={model.name}
              modelId={model.modelId}
              isActive={model.isActive}
              config={model.config as Record<string, unknown>}
              pricing={model.pricing as ModelEditData['pricing']}
              onEdit={onEditModel}
            />
          ))
        )}
        <Card
          size="small"
          style={{ width: 180, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'dashed' }}
          onClick={onAddModel}
          hoverable
        >
          <Space direction="vertical" align="center">
            <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
            <span style={{ color: '#999' }}>添加模型</span>
          </Space>
        </Card>
      </Space>
    </Card>
  )
}
