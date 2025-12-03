'use client'

import { Card, Tag, Button, Space, Popconfirm, Tooltip } from 'antd'
import { DeleteOutlined, ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, EditOutlined } from '@ant-design/icons'
import { useDeleteModel, useTestModel } from '@/hooks/useModels'
import { useState } from 'react'
import type { ModelPricing } from '@/services/models'

type ModelCardProps = {
  id: string
  name: string
  modelId: string
  isActive: boolean
  config?: {
    temperature?: number
    maxTokens?: number
  }
  pricing?: ModelPricing
  onEdit?: (model: ModelCardProps) => void
}

export function ModelCard({ id, name, modelId, isActive, config, pricing, onEdit }: ModelCardProps) {
  const deleteModel = useDeleteModel()
  const testModel = useTestModel()
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState<string>('')

  const handleTest = async () => {
    setTestStatus('loading')
    try {
      const result = await testModel.mutateAsync(id)
      if (result.success) {
        setTestStatus('success')
        setTestMessage(`成功 (${result.latencyMs}ms)`)
      } else {
        setTestStatus('error')
        setTestMessage(result.message)
      }
    } catch {
      setTestStatus('error')
      setTestMessage('测试失败')
    }
  }

  const handleDelete = () => {
    deleteModel.mutate(id)
  }

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'loading':
        return <LoadingOutlined spin />
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return null
    }
  }

  const handleEdit = () => {
    onEdit?.({ id, name, modelId, isActive, config, pricing })
  }

  return (
    <Card
      size="small"
      style={{ width: 180 }}
      actions={[
        <Tooltip key="test" title="测试连接">
          <Button type="text" size="small" icon={<ThunderboltOutlined />} onClick={handleTest} loading={testStatus === 'loading'} />
        </Tooltip>,
        <Tooltip key="edit" title="编辑模型">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={handleEdit} />
        </Tooltip>,
        <Popconfirm key="delete" title="确定删除此模型？" onConfirm={handleDelete} okText="删除" cancelText="取消">
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        title={
          <Space>
            <span>{name}</span>
            {getStatusIcon()}
          </Space>
        }
        description={
          <Space direction="vertical" size={4}>
            <span style={{ fontSize: 12, color: '#999' }}>{modelId}</span>
            <Space size={4}>
              <Tag color={isActive ? 'success' : 'default'} style={{ marginRight: 0 }}>
                {isActive ? '已启用' : '已禁用'}
              </Tag>
            </Space>
            {testMessage && (
              <span style={{ fontSize: 11, color: testStatus === 'success' ? '#52c41a' : '#ff4d4f' }}>
                {testMessage}
              </span>
            )}
          </Space>
        }
      />
    </Card>
  )
}
