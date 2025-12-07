'use client'

import { useState, useMemo, useCallback } from 'react'
import { Popover, Input, Typography, Space, Tag, Empty, Spin, theme } from 'antd'
import { SearchOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons'
import type { UnifiedModel } from '@/services/models'
import styles from './ModelSelector.module.css'

const { Text } = Typography

type ModelSelectorProps = {
  models: UnifiedModel[]
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  multiple?: boolean
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  style?: React.CSSProperties
  // 筛选条件
  filterType?: string // 'llm' | 'embedding' | 'tts' | 'stt' | 'rerank'
  filterActive?: boolean
}

type GroupedModels = {
  provider: string
  models: UnifiedModel[]
}

// 供应商图标/颜色映射
const providerConfig: Record<string, { color: string; icon?: string }> = {
  'OpenAI': { color: '#10a37f' },
  'Claude': { color: '#cc785c' },
  'Anthropic': { color: '#cc785c' },
  '通义千问': { color: '#615ced' },
  '深度求索': { color: '#4d6bfe' },
  'DeepSeek': { color: '#4d6bfe' },
  'ChatGLM': { color: '#3370ff' },
  '智谱': { color: '#3370ff' },
  '文心一言': { color: '#2932e1' },
  '百度': { color: '#2932e1' },
  '月之暗面': { color: '#000000' },
  'Moonshot': { color: '#000000' },
  'default': { color: '#1677ff' },
}

function getProviderColor(provider: string): string {
  return providerConfig[provider]?.color || providerConfig['default'].color
}

export function ModelSelector({
  models,
  value,
  onChange,
  multiple = false,
  placeholder = '选择模型',
  loading = false,
  disabled = false,
  style,
  filterType,
  filterActive = true,
}: ModelSelectorProps) {
  const { token } = theme.useToken()
  const [open, setOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  // 将 value 转换为数组形式便于处理
  const selectedIds = useMemo(() => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  // 筛选并分组模型
  const { groupedModels, filteredModels } = useMemo(() => {
    let filtered = models

    // 按类型筛选
    if (filterType) {
      filtered = filtered.filter(m => m.type === filterType)
    }

    // 按激活状态筛选
    if (filterActive) {
      filtered = filtered.filter(m => m.isActive)
    }

    // 按搜索文本筛选
    if (searchText) {
      const lowerSearch = searchText.toLowerCase()
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(lowerSearch) ||
        m.provider.toLowerCase().includes(lowerSearch)
      )
    }

    // 按供应商分组
    const groups = new Map<string, UnifiedModel[]>()
    for (const model of filtered) {
      const provider = model.provider || 'Unknown'
      if (!groups.has(provider)) {
        groups.set(provider, [])
      }
      groups.get(provider)!.push(model)
    }

    // 转换为数组并排序
    const grouped: GroupedModels[] = Array.from(groups.entries())
      .map(([provider, models]) => ({ provider, models }))
      .sort((a, b) => a.provider.localeCompare(b.provider))

    return { groupedModels: grouped, filteredModels: filtered }
  }, [models, filterType, filterActive, searchText])

  // 当前显示的供应商
  const activeProvider = selectedProvider || (groupedModels.length > 0 ? groupedModels[0].provider : null)

  // 当前供应商的模型列表
  const currentModels = useMemo(() => {
    if (!activeProvider) return []
    return groupedModels.find(g => g.provider === activeProvider)?.models || []
  }, [groupedModels, activeProvider])

  // 选中的模型信息
  const selectedModels = useMemo(() => {
    return models.filter(m => selectedIds.includes(m.id))
  }, [models, selectedIds])

  // 处理模型选择
  const handleSelect = useCallback((modelId: string) => {
    if (multiple) {
      const newIds = selectedIds.includes(modelId)
        ? selectedIds.filter(id => id !== modelId)
        : [...selectedIds, modelId]
      onChange?.(newIds)
    } else {
      onChange?.(modelId)
      setOpen(false)
    }
  }, [multiple, selectedIds, onChange])

  // 渲染选中的值
  const renderValue = () => {
    if (selectedModels.length === 0) {
      return <Text type="secondary">{placeholder}</Text>
    }

    if (multiple) {
      if (selectedModels.length <= 2) {
        return (
          <Space size={4} wrap>
            {selectedModels.map(m => (
              <Tag key={m.id} closable={!disabled} onClose={(e) => {
                e.preventDefault()
                handleSelect(m.id)
              }}>
                {m.name}
              </Tag>
            ))}
          </Space>
        )
      }
      return <Text>已选择 {selectedModels.length} 个模型</Text>
    }

    const model = selectedModels[0]
    return (
      <Space>
        <RobotOutlined style={{ color: getProviderColor(model.provider) }} />
        <Text>{model.name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>({model.provider})</Text>
      </Space>
    )
  }

  // 弹出内容
  const content = (
    <div className={styles.selectorPanel}>
      {/* 搜索框 */}
      <div className={styles.searchBox}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索模型名称或供应商..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          size="small"
        />
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Spin size="small" />
          <Text type="secondary">加载中...</Text>
        </div>
      ) : groupedModels.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={searchText ? '没有找到匹配的模型' : '暂无可用模型'}
          className={styles.empty}
        />
      ) : (
        <div className={styles.content}>
          {/* 左侧供应商列表 */}
          <div className={styles.providerList}>
            {groupedModels.map(({ provider, models }) => {
              const isActive = provider === activeProvider
              const selectedCount = models.filter(m => selectedIds.includes(m.id)).length
              return (
                <div
                  key={provider}
                  className={`${styles.providerItem} ${isActive ? styles.active : ''}`}
                  onClick={() => setSelectedProvider(provider)}
                >
                  <div
                    className={styles.providerIcon}
                    style={{ backgroundColor: getProviderColor(provider) }}
                  >
                    <RobotOutlined />
                  </div>
                  <div className={styles.providerInfo}>
                    <Text className={styles.providerName}>{provider}</Text>
                    <Text type="secondary" className={styles.modelCount}>
                      {models.length} 个模型
                      {selectedCount > 0 && ` · ${selectedCount} 已选`}
                    </Text>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 右侧模型列表 */}
          <div className={styles.modelList}>
            {currentModels.map(model => {
              const isSelected = selectedIds.includes(model.id)
              return (
                <div
                  key={model.id}
                  className={`${styles.modelItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelect(model.id)}
                >
                  <div className={styles.modelInfo}>
                    <Text className={styles.modelName}>{model.name}</Text>
                    {model.maxContext && (
                      <Text type="secondary" className={styles.modelMeta}>
                        {Math.round(model.maxContext / 1000)}k
                      </Text>
                    )}
                    {model.inputPrice !== undefined && (
                      <Text type="secondary" className={styles.modelMeta}>
                        ¥{model.inputPrice}
                      </Text>
                    )}
                  </div>
                  {isSelected && (
                    <CheckOutlined className={styles.checkIcon} style={{ color: token.colorPrimary }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 底部统计 */}
      {multiple && selectedIds.length > 0 && (
        <div className={styles.footer}>
          <Text type="secondary">
            已选择 {selectedIds.length} 个模型
          </Text>
          <a onClick={() => onChange?.([])}>清空</a>
        </div>
      )}
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open && !disabled}
      onOpenChange={setOpen}
      placement="bottomLeft"
      overlayClassName={styles.popover}
      arrow={false}
    >
      <div
        className={`${styles.selector} ${disabled ? styles.disabled : ''} ${open ? styles.open : ''}`}
        style={style}
      >
        <div className={styles.value}>
          {renderValue()}
        </div>
        <div className={styles.arrow}>
          <svg viewBox="0 0 1024 1024" width="12" height="12">
            <path d="M512 714.7L146.5 349.2c-19.8-19.8-52-19.8-71.8 0s-19.8 52 0 71.8l401.4 401.4c19.8 19.8 52 19.8 71.8 0L949.3 421c19.8-19.8 19.8-52 0-71.8s-52-19.8-71.8 0L512 714.7z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </Popover>
  )
}

// 简化版选择器 - 用于单选场景
export function SimpleModelSelector({
  models,
  value,
  onChange,
  placeholder = '选择模型',
  loading = false,
  disabled = false,
  style,
}: Omit<ModelSelectorProps, 'multiple'>) {
  return (
    <ModelSelector
      models={models}
      value={value}
      onChange={v => onChange?.(v as string)}
      multiple={false}
      placeholder={placeholder}
      loading={loading}
      disabled={disabled}
      style={style}
    />
  )
}
