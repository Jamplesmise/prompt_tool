'use client'

/**
 * AI 模型配置组件
 *
 * 支持配置：
 * - 复杂任务模型（用于规划、推理等）
 * - 简单任务模型（用于快速响应、简单查询）
 *
 * 使用系统已有的 ModelSelector 组件和 modelsService
 * 模型选择会保存到 Zustand store，供 sendCommand 使用
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Typography, Space, Tooltip, Button, Collapse, Spin, message } from 'antd'
import {
  SettingOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { ModelSelector } from '@/components/common/ModelSelector'
import { modelsService, type UnifiedModel } from '@/services/models'
import { useCopilot } from '../hooks/useCopilot'
import styles from './styles.module.css'

const { Text } = Typography

export const ModelConfig: React.FC = () => {
  const [models, setModels] = useState<UnifiedModel[]>([])
  const [loading, setLoading] = useState(false)

  // 从 store 获取模型选择和 setter
  const {
    complexModelId,
    simpleModelId,
    setComplexModelId,
    setSimpleModelId,
  } = useCopilot()

  // 加载可用模型列表
  const loadModels = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const response = await modelsService.models.listAll({
        type: 'llm',
        active: true,
        refresh,
      })
      if (response.code === 200 && response.data) {
        const modelList = response.data.models || []
        setModels(modelList)

        // 如果没有选中的模型，设置默认值
        if (!complexModelId && modelList.length > 0) {
          const defaultComplex = modelList.find(m =>
            m.name.toLowerCase().includes('gpt-4') ||
            m.name.toLowerCase().includes('claude') ||
            m.name.toLowerCase().includes('opus') ||
            m.name.toLowerCase().includes('sonnet')
          ) || modelList[0]
          setComplexModelId(defaultComplex.id)
        }
        if (!simpleModelId && modelList.length > 0) {
          const defaultSimple = modelList.find(m =>
            m.name.toLowerCase().includes('gpt-3.5') ||
            m.name.toLowerCase().includes('haiku') ||
            m.name.toLowerCase().includes('mini')
          ) || modelList[0]
          setSimpleModelId(defaultSimple.id)
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      message.error('加载模型列表失败')
    } finally {
      setLoading(false)
    }
  }, [complexModelId, simpleModelId, setComplexModelId, setSimpleModelId])

  useEffect(() => {
    loadModels()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplexChange = (value: string | string[]) => {
    const modelId = Array.isArray(value) ? value[0] : value
    if (modelId) {
      setComplexModelId(modelId)
      message.success('复杂任务模型已更新')
    }
  }

  const handleSimpleChange = (value: string | string[]) => {
    const modelId = Array.isArray(value) ? value[0] : value
    if (modelId) {
      setSimpleModelId(modelId)
      message.success('简单任务模型已更新')
    }
  }

  const collapseItems = [
    {
      key: 'model-config',
      label: (
        <Space>
          <SettingOutlined />
          <span>模型配置</span>
          {models.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({models.length} 个可用)
            </Text>
          )}
        </Space>
      ),
      children: (
        <Spin spinning={loading}>
          <div className={styles.modelConfigContent}>
            {/* 复杂任务模型 */}
            <div className={styles.modelConfigItem}>
              <div className={styles.modelConfigLabel}>
                <Space>
                  <RocketOutlined style={{ color: '#1890ff' }} />
                  <Text strong>复杂任务模型</Text>
                  <Tooltip title="用于任务规划、复杂推理、代码生成等需要强大能力的场景">
                    <InfoCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
              </div>
              <ModelSelector
                models={models}
                value={complexModelId || undefined}
                onChange={handleComplexChange}
                placeholder="选择复杂任务模型"
                loading={loading}
                filterType="llm"
                filterActive={true}
                style={{ width: '100%' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                推荐：GPT-4、Claude 3 Opus/Sonnet 等高性能模型
              </Text>
            </div>

            {/* 简单任务模型 */}
            <div className={styles.modelConfigItem}>
              <div className={styles.modelConfigLabel}>
                <Space>
                  <ThunderboltOutlined style={{ color: '#52c41a' }} />
                  <Text strong>简单任务模型</Text>
                  <Tooltip title="用于快速响应、简单查询、格式转换等轻量级任务">
                    <InfoCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
              </div>
              <ModelSelector
                models={models}
                value={simpleModelId || undefined}
                onChange={handleSimpleChange}
                placeholder="选择简单任务模型"
                loading={loading}
                filterType="llm"
                filterActive={true}
                style={{ width: '100%' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                推荐：GPT-3.5、Claude 3 Haiku 等快速响应模型
              </Text>
            </div>

            {/* 刷新按钮 */}
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => loadModels(true)}
              loading={loading}
            >
              刷新模型列表
            </Button>
          </div>
        </Spin>
      ),
    },
  ]

  return (
    <Collapse
      items={collapseItems}
      bordered={false}
      className={styles.modelConfigCollapse}
      size="small"
    />
  )
}

export default ModelConfig
