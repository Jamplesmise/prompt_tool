'use client'

import { useState } from 'react'
import { Modal, List, Input, Tag, Space, Typography, Empty, Spin, Tooltip, Button, Popconfirm } from 'antd'
import {
  FileTextOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  DeleteOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { useTemplates, useDeleteTemplate, useApplyTemplate } from '@/hooks/useTemplates'
import type { TaskTemplate, TemplateConfig } from '@/hooks/useTemplates'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text, Paragraph } = Typography
const { Search } = Input

type TemplateSelectorProps = {
  open: boolean
  onClose: () => void
  onSelect: (config: TemplateConfig) => void
  teamId?: string
}

export function TemplateSelector({
  open,
  onClose,
  onSelect,
  teamId,
}: TemplateSelectorProps) {
  const [searchText, setSearchText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: templates, isLoading } = useTemplates({ teamId })
  const deleteTemplate = useDeleteTemplate()
  const applyTemplate = useApplyTemplate()

  // 过滤模板
  const filteredTemplates = templates?.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchText.toLowerCase())
  ) || []

  // 分组：我的模板 vs 团队模板
  const myTemplates = filteredTemplates.filter(t => !t.isPublic)
  const teamTemplates = filteredTemplates.filter(t => t.isPublic)

  const handleSelect = async (template: TaskTemplate) => {
    try {
      const config = await applyTemplate.mutateAsync(template.id)
      onSelect(config)
      onClose()
      setSearchText('')
      setSelectedId(null)
    } catch (error) {
      // hook 已处理错误
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteTemplate.mutateAsync(id)
  }

  const handleCancel = () => {
    onClose()
    setSearchText('')
    setSelectedId(null)
  }

  const renderTemplateItem = (template: TaskTemplate) => {
    const isSelected = selectedId === template.id

    // 配置摘要
    const config = template.config as TemplateConfig
    const tags = []
    if (config.promptId) tags.push('提示词')
    if (config.modelId) tags.push('模型')
    if (config.datasetId) tags.push('数据集')
    if (config.evaluatorIds?.length) tags.push(`${config.evaluatorIds.length}评估器`)

    return (
      <List.Item
        key={template.id}
        onClick={() => setSelectedId(template.id)}
        onDoubleClick={() => handleSelect(template)}
        style={{
          cursor: 'pointer',
          padding: '12px 16px',
          borderRadius: 8,
          border: isSelected ? '2px solid #EF4444' : '1px solid #f0f0f0',
          background: isSelected ? '#fff1f0' : '#fff',
          marginBottom: 8,
          transition: 'all 0.2s',
        }}
        actions={[
          <Popconfirm
            key="delete"
            title="确定删除此模板？"
            onConfirm={(e) => handleDelete(template.id, e as React.MouseEvent)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>,
        ]}
      >
        <List.Item.Meta
          avatar={
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: isSelected ? '#EF4444' : '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileTextOutlined style={{ fontSize: 18, color: isSelected ? '#fff' : '#666' }} />
            </div>
          }
          title={
            <Space>
              <Text strong>{template.name}</Text>
              {template.isPublic && (
                <Tooltip title="团队共享">
                  <TeamOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              )}
            </Space>
          }
          description={
            <div>
              {template.description && (
                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 1 }}
                  style={{ marginBottom: 4, fontSize: 12 }}
                >
                  {template.description}
                </Paragraph>
              )}
              <Space size={4} wrap>
                {tags.map((tag, i) => (
                  <Tag key={i} style={{ fontSize: 11, margin: 0 }}>{tag}</Tag>
                ))}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {dayjs(template.updatedAt).fromNow()}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  已用 {template.usageCount} 次
                </Text>
              </Space>
            </div>
          }
        />
      </List.Item>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>从模板创建</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={!selectedId}
          icon={<CheckOutlined />}
          loading={applyTemplate.isPending}
          onClick={() => {
            const template = templates?.find(t => t.id === selectedId)
            if (template) handleSelect(template)
          }}
        >
          使用模板
        </Button>,
      ]}
      width={600}
      styles={{ body: { maxHeight: '60vh', overflow: 'auto' } }}
    >
      <Search
        placeholder="搜索模板..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Empty
          description={searchText ? '未找到匹配的模板' : '暂无模板，创建任务后可保存为模板'}
          style={{ padding: 40 }}
        />
      ) : (
        <>
          {myTemplates.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                <UserOutlined style={{ marginRight: 4 }} />
                我的模板
              </Text>
              <List
                dataSource={myTemplates}
                renderItem={renderTemplateItem}
                split={false}
              />
            </div>
          )}

          {teamTemplates.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                <TeamOutlined style={{ marginRight: 4 }} />
                团队模板
              </Text>
              <List
                dataSource={teamTemplates}
                renderItem={renderTemplateItem}
                split={false}
              />
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 16, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          提示：双击模板可快速应用
        </Text>
      </div>
    </Modal>
  )
}
