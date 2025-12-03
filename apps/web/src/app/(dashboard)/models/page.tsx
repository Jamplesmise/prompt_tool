'use client'

import { useState } from 'react'
import { Button, Spin, Empty, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useProviders } from '@/hooks/useModels'
import { ProviderCard, AddProviderModal, AddModelModal, EditProviderModal, EditModelModal } from '@/components/model'
import type { ProviderWithModels, ModelPricing } from '@/services/models'

const { Title } = Typography

type EditModelData = {
  id: string
  name: string
  modelId: string
  isActive: boolean
  config?: { temperature?: number; maxTokens?: number }
  pricing?: ModelPricing
}

export default function ModelsPage() {
  const { data: providers, isLoading, error } = useProviders()
  const [addProviderOpen, setAddProviderOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<ProviderWithModels | null>(null)
  const [addModelProviderId, setAddModelProviderId] = useState<string | null>(null)
  const [editModel, setEditModel] = useState<EditModelData | null>(null)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="加载失败，请刷新重试" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          模型配置
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddProviderOpen(true)}>
          添加提供商
        </Button>
      </div>

      {providers?.length === 0 ? (
        <Empty
          description="暂无提供商"
          style={{ padding: '100px 0' }}
        >
          <Button type="primary" onClick={() => setAddProviderOpen(true)}>
            添加第一个提供商
          </Button>
        </Empty>
      ) : (
        providers?.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onEdit={() => setEditProvider(provider)}
            onAddModel={() => setAddModelProviderId(provider.id)}
            onEditModel={(model) => setEditModel(model as EditModelData)}
          />
        ))
      )}

      <AddProviderModal open={addProviderOpen} onClose={() => setAddProviderOpen(false)} />

      <EditProviderModal
        open={!!editProvider}
        provider={editProvider}
        onClose={() => setEditProvider(null)}
      />

      <AddModelModal
        open={!!addModelProviderId}
        providerId={addModelProviderId || ''}
        onClose={() => setAddModelProviderId(null)}
      />

      <EditModelModal
        open={!!editModel}
        model={editModel}
        onClose={() => setEditModel(null)}
      />
    </div>
  )
}
