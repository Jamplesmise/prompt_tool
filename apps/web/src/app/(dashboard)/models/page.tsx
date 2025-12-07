'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Spin,
  Empty,
  Typography,
  Table,
  Tag,
  Space,
  Select,
  Input,
  Popconfirm,
  Tooltip,
  Card,
  Tabs,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApiOutlined,
  CloudOutlined,
  SyncOutlined,
  CloudSyncOutlined,
} from '@ant-design/icons'
import { PRIMARY, GRAY } from '@/theme/colors'
import type { ColumnsType } from 'antd/es/table'
import { useProviders, useDeleteModel, useDeleteProvider, useUnifiedModels, useRefreshUnifiedModels, useSyncFastGPTModels, useSyncStatus } from '@/hooks/useModels'
import { useModelTest } from '@/hooks/useModelTest'
import {
  ConnectionStatus,
  AddProviderModal,
  AddModelModal,
  EditProviderModal,
  EditModelModal,
  TestResultModal,
  ModelTypeTag,
  ModelCapabilityTags,
  ModelPriceDisplay,
  ProviderAvatar,
  ModelSourceTag,
} from '@/components/model'
import type { ConnectionState } from '@/components/model'
import type { ProviderWithModels, ModelPricing, UnifiedModel } from '@/services/models'
import { ModelConfiguredTip } from '@/components/guidance'
import { ModelTypeEnum, MODEL_TYPE_CONFIG } from '@/types/fastgpt'

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

// Tab 类型
type TabKey = 'all' | 'providers'

export default function ModelsPage() {
  const { data: providers, isLoading: providersLoading, refetch: refetchProviders } = useProviders()
  const { data: unifiedData, isLoading: unifiedLoading } = useUnifiedModels()
  const refreshUnified = useRefreshUnifiedModels()
  const syncFastGPT = useSyncFastGPTModels()
  const { data: syncStatus } = useSyncStatus()
  const { testing, testingId, result, testModel, clearResult } = useModelTest()
  const deleteModel = useDeleteModel()
  const deleteProvider = useDeleteProvider()

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [addProviderOpen, setAddProviderOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<ProviderWithModels | null>(null)
  const [addModelProviderId, setAddModelProviderId] = useState<string | null>(null)
  const [editModel, setEditModel] = useState<EditModelData | null>(null)

  // 筛选状态
  const [filterProvider, setFilterProvider] = useState<string | undefined>(undefined)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [filterSource, setFilterSource] = useState<'fastgpt' | 'local' | undefined>(undefined)
  const [filterActive, setFilterActive] = useState<boolean>(false)
  const [searchText, setSearchText] = useState('')

  // 测试结果弹窗
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [currentTest, setCurrentTest] = useState<TestInfo | null>(null)

  // 模型连接状态缓存
  const [modelStatus, setModelStatus] = useState<
    Record<string, { status: ConnectionState; latency?: number; error?: string }>
  >({})

  // 统一模型列表
  const models = useMemo(() => unifiedData?.models || [], [unifiedData])

  // 筛选后的数据
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      if (filterProvider && model.provider !== filterProvider) return false
      if (filterType && model.type !== filterType) return false
      if (filterSource && model.source !== filterSource) return false
      if (filterActive && !model.isActive) return false
      if (searchText) {
        const search = searchText.toLowerCase()
        if (
          !model.name.toLowerCase().includes(search) &&
          !model.id.toLowerCase().includes(search) &&
          !model.provider.toLowerCase().includes(search)
        ) {
          return false
        }
      }
      return true
    })
  }, [models, filterProvider, filterType, filterSource, filterActive, searchText])

  // 提供商选项（从统一模型中提取）
  const providerOptions = useMemo(() => {
    const providerSet = new Set(models.map((m) => m.provider))
    return Array.from(providerSet).map((p) => ({ label: p, value: p }))
  }, [models])

  // 模型类型选项
  const typeOptions = useMemo(() => {
    return Object.entries(MODEL_TYPE_CONFIG).map(([value, config]) => ({
      label: config.label,
      value,
    }))
  }, [])

  const handleModelTest = async (model: UnifiedModel) => {
    setCurrentTest({ modelName: model.name, providerName: model.provider })
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

  const handleEditModel = (model: UnifiedModel) => {
    setEditModel({
      id: model.id,
      name: model.name,
      modelId: model.id,
      isActive: model.isActive,
    })
  }

  const handleEditProvider = (providerName: string) => {
    const provider = providers?.find((p) => p.name === providerName)
    if (provider) {
      setEditProvider(provider)
    }
  }

  const handleRefresh = () => {
    refreshUnified.mutate()
    refetchProviders()
  }

  const columns: ColumnsType<UnifiedModel> = [
    {
      title: '模型',
      key: 'model',
      width: 280,
      render: (_, record) => (
        <Space>
          <ProviderAvatar provider={record.provider} size="small" />
          <Space direction="vertical" size={0}>
            <Space size={4}>
              <span style={{ fontWeight: 500 }}>{record.name}</span>
              <ModelSourceTag source={record.source} size="small" />
            </Space>
            <span style={{ fontSize: 12, color: GRAY[400] }}>{record.id}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <ModelTypeTag type={type as ModelTypeEnum} />,
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
    },
    {
      title: '能力',
      key: 'capabilities',
      width: 200,
      render: (_, record) => (
        <ModelCapabilityTags model={record as UnifiedModel & { type: ModelTypeEnum }} size="small" />
      ),
    },
    {
      title: '定价',
      key: 'pricing',
      width: 120,
      render: (_, record) => (
        <ModelPriceDisplay model={record as UnifiedModel & { type: ModelTypeEnum }} size="small" />
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const status = modelStatus[record.id]
        return (
          <Space size={4}>
            <ConnectionStatus
              status={testingId === record.id ? 'testing' : (status?.status || 'unknown')}
              latency={status?.latency}
              error={status?.error}
              size="small"
            />
            {!record.isActive && (
              <Tag color="default" style={{ fontSize: 10 }}>禁用</Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => {
        // 获取实际的 provider 名称（FastGPT 同步的需要加前缀）
        const actualProviderName = record.source === 'fastgpt'
          ? `FastGPT-${record.provider}`
          : record.provider

        return (
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
                onClick={() => handleEditProvider(actualProviderName)}
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
        )
      },
    },
  ]

  const isLoading = providersLoading || unifiedLoading

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  const stats = unifiedData?.stats

  return (
    <div className="fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            模型配置
          </Title>
          {stats && (
            <Space size={16} style={{ marginLeft: 16 }}>
              <span style={{ color: GRAY[500], fontSize: 13 }}>
                共 <strong>{stats.total}</strong> 个模型
              </span>
              {stats.fastgpt > 0 && (
                <Tag icon={<CloudOutlined />} color="processing">
                  FastGPT: {stats.fastgpt}
                </Tag>
              )}
              {stats.local > 0 && <Tag>本地: {stats.local}</Tag>}
            </Space>
          )}
        </Space>
        <Space>
          <Tooltip
            title={
              syncStatus?.lastSyncedAt
                ? `上次同步: ${new Date(syncStatus.lastSyncedAt).toLocaleString()}`
                : '从 FastGPT 同步模型配置'
            }
          >
            <Button
              icon={<CloudSyncOutlined />}
              onClick={() => syncFastGPT.mutate()}
              loading={syncFastGPT.isPending}
            >
              同步 FastGPT
            </Button>
          </Tooltip>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshUnified.isPending}
          >
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
            style={{
              background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
              border: 'none',
              boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
            }}
          >
            添加模型
          </Button>
        </Space>
      </div>

      <ModelConfiguredTip />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={[
          {
            key: 'all',
            label: '所有模型',
            children: (
              <>
                {/* 筛选栏 */}
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Space wrap size={16}>
                    <Space>
                      <span style={{ color: GRAY[500] }}>类型:</span>
                      <Select
                        allowClear
                        placeholder="全部"
                        style={{ width: 120 }}
                        value={filterType}
                        onChange={setFilterType}
                        options={typeOptions}
                      />
                    </Space>
                    <Space>
                      <span style={{ color: GRAY[500] }}>提供商:</span>
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
                      <span style={{ color: GRAY[500] }}>来源:</span>
                      <Select
                        allowClear
                        placeholder="全部"
                        style={{ width: 120 }}
                        value={filterSource}
                        onChange={setFilterSource}
                        options={[
                          { label: 'FastGPT', value: 'fastgpt' },
                          { label: '本地', value: 'local' },
                        ]}
                      />
                    </Space>
                    <Space>
                      <span style={{ color: GRAY[500] }}>仅激活:</span>
                      <Switch checked={filterActive} onChange={setFilterActive} size="small" />
                    </Space>
                    <Input
                      placeholder="搜索模型名称/ID/提供商"
                      prefix={<SearchOutlined style={{ color: GRAY[400] }} />}
                      style={{ width: 220 }}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                    />
                    <span style={{ color: GRAY[400], fontSize: 12 }}>
                      显示 {filteredModels.length} / {models.length}
                    </span>
                  </Space>
                </Card>

                {/* 模型表格 */}
                {models.length === 0 ? (
                  <Empty description="暂无模型" style={{ padding: '100px 0' }}>
                    <Button
                      type="primary"
                      onClick={() => setAddProviderOpen(true)}
                      style={{
                        background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
                        border: 'none',
                        boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
                      }}
                    >
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
              </>
            ),
          },
          {
            key: 'providers',
            label: '提供商管理',
            children: (
              <Card>
                <Table
                  columns={[
                    {
                      title: '提供商',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string, record: ProviderWithModels) => (
                        <Space>
                          <ProviderAvatar provider={record.type} />
                          <Space direction="vertical" size={0}>
                            <span style={{ fontWeight: 500 }}>{name}</span>
                            <span style={{ fontSize: 12, color: GRAY[400] }}>{record.type}</span>
                          </Space>
                        </Space>
                      ),
                    },
                    {
                      title: 'API 地址',
                      dataIndex: 'baseUrl',
                      key: 'baseUrl',
                      render: (url: string) => (
                        <span style={{ fontSize: 12, color: GRAY[500] }}>{url}</span>
                      ),
                    },
                    {
                      title: '模型数量',
                      key: 'modelCount',
                      render: (_, record: ProviderWithModels) => (
                        <Tag>{record.models.length} 个</Tag>
                      ),
                    },
                    {
                      title: '状态',
                      dataIndex: 'isActive',
                      key: 'isActive',
                      render: (isActive: boolean) => (
                        <Tag color={isActive ? 'success' : 'default'}>
                          {isActive ? '启用' : '禁用'}
                        </Tag>
                      ),
                    },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_, record: ProviderWithModels) => (
                        <Space>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setEditProvider(record)}
                          >
                            编辑
                          </Button>
                          <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setAddModelProviderId(record.id)}
                          >
                            添加模型
                          </Button>
                          <Popconfirm
                            title="确定删除此提供商？"
                            description={`将同时删除其下 ${record.models.length} 个模型`}
                            onConfirm={() => deleteProvider.mutate(record.id)}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              loading={deleteProvider.isPending}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                  dataSource={providers || []}
                  rowKey="id"
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

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
