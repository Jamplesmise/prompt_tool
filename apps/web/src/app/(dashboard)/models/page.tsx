'use client'

import { useState, useMemo } from 'react'
import { Button, Spin, Empty, Typography, Table, Tag, Space, Select, Input, Popconfirm, Tooltip, Card } from 'antd'
import { PlusOutlined, SearchOutlined, ThunderboltOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useProviders, useDeleteModel } from '@/hooks/useModels'
import { useModelTest } from '@/hooks/useModelTest'
import {
  ConnectionStatus,
  AddProviderModal,
  AddModelModal,
  EditProviderModal,
  EditModelModal,
  TestResultModal,
} from '@/components/model'
import type { ConnectionState } from '@/components/model'
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

type TestInfo = {
  modelName: string
  providerName: string
}

// 扁平化的模型数据，用于表格展示
type FlatModelData = {
  key: string
  id: string
  name: string
  modelId: string
  providerId: string
  providerName: string
  providerType: string
  isActive: boolean
  config?: { temperature?: number; maxTokens?: number }
  pricing?: ModelPricing
  status?: ConnectionState
  latency?: number
  error?: string
}

export default function ModelsPage() {
  const { data: providers, isLoading, error, refetch } = useProviders()
  const { testing, testingId, result, testModel, clearResult } = useModelTest()
  const deleteModel = useDeleteModel()

  const [addProviderOpen, setAddProviderOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<ProviderWithModels | null>(null)
  const [addModelProviderId, setAddModelProviderId] = useState<string | null>(null)
  const [editModel, setEditModel] = useState<EditModelData | null>(null)

  // 筛选状态
  const [filterProvider, setFilterProvider] = useState<string | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [searchText, setSearchText] = useState('')

  // 测试结果弹窗
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [currentTest, setCurrentTest] = useState<TestInfo | null>(null)

  // 模型连接状态缓存 (id -> { status, latency })
  const [modelStatus, setModelStatus] = useState<Record<string, { status: ConnectionState; latency?: number; error?: string }>>({})

  // 扁平化模型数据
  const flatModels = useMemo<FlatModelData[]>(() => {
    if (!providers) return []
    return providers.flatMap((provider) =>
      provider.models.map((model) => ({
        key: model.id,
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.type,
        isActive: model.isActive,
        config: model.config as FlatModelData['config'],
        pricing: model.pricing as ModelPricing,
        status: modelStatus[model.id]?.status,
        latency: modelStatus[model.id]?.latency,
        error: modelStatus[model.id]?.error,
      }))
    )
  }, [providers, modelStatus])

  // 筛选后的数据
  const filteredModels = useMemo(() => {
    return flatModels.filter((model) => {
      if (filterProvider && model.providerId !== filterProvider) return false
      if (filterStatus === 'active' && !model.isActive) return false
      if (filterStatus === 'inactive' && model.isActive) return false
      if (filterStatus === 'connected' && model.status !== 'connected') return false
      if (filterStatus === 'failed' && model.status !== 'failed') return false
      if (searchText) {
        const search = searchText.toLowerCase()
        if (
          !model.name.toLowerCase().includes(search) &&
          !model.modelId.toLowerCase().includes(search) &&
          !model.providerName.toLowerCase().includes(search)
        ) {
          return false
        }
      }
      return true
    })
  }, [flatModels, filterProvider, filterStatus, searchText])

  // 提供商选项
  const providerOptions = useMemo(() => {
    return providers?.map((p) => ({ label: p.name, value: p.id })) || []
  }, [providers])

  const handleModelTest = async (model: FlatModelData) => {
    setCurrentTest({ modelName: model.name, providerName: model.providerName })
    setTestModalOpen(true)

    const testResult = await testModel(model.id)

    setModelStatus((prev) => ({
      ...prev,
      [model.id]: {
        status: testResult.success
          ? testResult.latency > 2000
            ? 'slow'
            : 'connected'
          : 'failed',
        latency: testResult.latency,
        error: testResult.error,
      },
    }))
  }

  const handleTestModalClose = () => {
    setTestModalOpen(false)
    setCurrentTest(null)
    clearResult()
  }

  const handleDeleteModel = (id: string) => {
    deleteModel.mutate(id)
  }

  const handleEditModel = (model: FlatModelData) => {
    setEditModel({
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      isActive: model.isActive,
      config: model.config,
      pricing: model.pricing,
    })
  }

  const handleEditProvider = (providerId: string) => {
    const provider = providers?.find((p) => p.id === providerId)
    if (provider) {
      setEditProvider(provider)
    }
  }

  const columns: ColumnsType<FlatModelData> = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 12, color: '#999' }}>{record.modelId}</span>
        </Space>
      ),
    },
    {
      title: '提供商',
      dataIndex: 'providerName',
      key: 'providerName',
      width: 140,
      render: (name: string, record) => (
        <Space>
          <span>{name}</span>
          <Tag color="blue" style={{ marginLeft: 0 }}>{record.providerType}</Tag>
        </Space>
      ),
    },
    {
      title: '连接状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: ConnectionState | undefined, record) => (
        <ConnectionStatus
          status={testingId === record.id ? 'testing' : (status || 'unknown')}
          latency={record.latency}
          error={record.error}
          size="small"
        />
      ),
    },
    {
      title: '默认参数',
      key: 'config',
      width: 180,
      render: (_, record) => {
        if (!record.config) return <span style={{ color: '#999' }}>-</span>
        return (
          <Space size={8}>
            {record.config.temperature !== undefined && (
              <Tag>T: {record.config.temperature}</Tag>
            )}
            {record.config.maxTokens !== undefined && (
              <Tag>Max: {record.config.maxTokens}</Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="测试连接">
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleModelTest(record)}
              loading={testingId === record.id}
            />
          </Tooltip>
          <Tooltip title="编辑模型">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditModel(record)}
            />
          </Tooltip>
          <Tooltip title="编辑提供商">
            <Button
              type="text"
              size="small"
              icon={<ApiOutlined />}
              onClick={() => handleEditProvider(record.providerId)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此模型？"
            onConfirm={() => handleDeleteModel(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          模型配置
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setAddProviderOpen(true)}>
            添加提供商
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              if (providers?.length) {
                setAddModelProviderId(providers[0].id)
              } else {
                setAddProviderOpen(true)
              }
            }}
          >
            添加模型
          </Button>
        </Space>
      </div>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={16}>
          <Space>
            <span style={{ color: '#666' }}>提供商:</span>
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 150 }}
              value={filterProvider}
              onChange={setFilterProvider}
              options={providerOptions}
            />
          </Space>
          <Space>
            <span style={{ color: '#666' }}>状态:</span>
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: '已启用', value: 'active' },
                { label: '已禁用', value: 'inactive' },
                { label: '连接正常', value: 'connected' },
                { label: '连接失败', value: 'failed' },
              ]}
            />
          </Space>
          <Input
            placeholder="搜索模型名称/ID/提供商"
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            style={{ width: 220 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <span style={{ color: '#999', fontSize: 12 }}>
            共 {filteredModels.length} / {flatModels.length} 个模型
          </span>
        </Space>
      </Card>

      {/* 模型表格 */}
      {flatModels.length === 0 ? (
        <Empty
          description="暂无模型"
          style={{ padding: '100px 0' }}
        >
          <Button type="primary" onClick={() => setAddProviderOpen(true)}>
            添加第一个提供商
          </Button>
        </Empty>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredModels}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个模型`,
          }}
          size="middle"
          rowKey="id"
        />
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

      <TestResultModal
        open={testModalOpen}
        modelName={currentTest?.modelName}
        providerName={currentTest?.providerName}
        result={result}
        loading={testing}
        onClose={handleTestModalClose}
      />
    </div>
  )
}
