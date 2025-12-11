'use client'

import { useState } from 'react'
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Input,
  Empty,
  Space,
  Tag,
  Dropdown,
  Spin,
  Tooltip,
  Modal,
} from 'antd'
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ExportOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  EnterOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import {
  useEvaluationSchemas,
  useDeleteEvaluationSchema,
} from '@/hooks/useSchemas'
import { InferSchemaModal } from '@/components/schema'
import type { EvaluationSchemaListItem } from '@platform/shared'

const { Title, Text } = Typography

export default function SchemasPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [inferModalOpen, setInferModalOpen] = useState(false)

  // 获取数据
  const { data: schemas, isLoading } = useEvaluationSchemas(search)
  const deleteMutation = useDeleteEvaluationSchema()

  // 处理编辑
  const handleEdit = (id: string) => {
    router.push(`/schemas/${id}`)
  }

  // 处理新建
  const handleCreate = () => {
    router.push('/schemas/new')
  }

  // 使用 AI 助手生成
  const handleAIAssistant = () => {
    router.push('/schemas/ai-assistant')
  }

  // 处理删除
  const handleDelete = (schema: EvaluationSchemaListItem) => {
    if (schema._count.prompts > 0 || schema._count.datasets > 0) {
      Modal.warning({
        title: '无法删除',
        content: `该评估结构关联了 ${schema._count.prompts} 个提示词和 ${schema._count.datasets} 个数据集，请先解除关联后再删除。`,
      })
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除评估结构 "${schema.name}" 吗？此操作将同时删除关联的输入结构和输出结构，且无法恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(schema.id),
    })
  }

  // 渲染评估结构卡片
  const renderSchemaCard = (schema: EvaluationSchemaListItem) => {
    const menuItems = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => handleEdit(schema.id),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(schema),
      },
    ]

    return (
      <Col key={schema.id} xs={24} sm={12} lg={8} xl={6}>
        <Card
          hoverable
          style={{ height: '100%' }}
          onClick={() => handleEdit(schema.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong ellipsis style={{ fontSize: 16, maxWidth: 200 }}>
                  {schema.name}
                </Text>
              </div>
              {schema.description && (
                <Text type="secondary" ellipsis style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                  {schema.description}
                </Text>
              )}
            </div>
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
                size="small"
              />
            </Dropdown>
          </div>

          {/* 输入输出结构信息 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {schema.inputSchema ? (
              <Tag icon={<ExportOutlined rotate={180} />} color="blue">
                {schema.inputSchema.variableCount} 输入变量
              </Tag>
            ) : (
              <Tag color="default">无输入结构</Tag>
            )}
            {schema.outputSchema ? (
              <Tag icon={<ExportOutlined />} color="green">
                {schema.outputSchema.fieldCount} 输出字段
              </Tag>
            ) : (
              <Tag color="default">无输出结构</Tag>
            )}
          </div>

          {/* 关联信息 */}
          <div style={{ fontSize: 12 }}>
            <Space size={16}>
              <Tooltip title="关联提示词数">
                <Text type="secondary">
                  <EnterOutlined /> {schema._count.prompts} 提示词
                </Text>
              </Tooltip>
              <Tooltip title="关联数据集数">
                <Text type="secondary">
                  <DatabaseOutlined /> {schema._count.datasets} 数据集
                </Text>
              </Tooltip>
            </Space>
          </div>
        </Card>
      </Col>
    )
  }

  return (
    <div>
      {/* 页面标题 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          结构定义
        </Title>
        <Space>
          <Button icon={<AppstoreOutlined />} onClick={() => router.push('/schemas/templates')}>
            模板库
          </Button>
          <Button icon={<ThunderboltOutlined />} onClick={() => setInferModalOpen(true)}>
            从输出推断
          </Button>
          <Button icon={<RobotOutlined />} onClick={handleAIAssistant}>
            AI 生成
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建结构
          </Button>
        </Space>
      </div>

      {/* 搜索栏 */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索结构名称或描述..."
          allowClear
          style={{ maxWidth: 400 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* 内容区域 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : schemas && schemas.length > 0 ? (
        <Row gutter={[16, 16]}>
          {schemas.map(renderSchemaCard)}
        </Row>
      ) : (
        <Empty
          description={search ? '未找到匹配的结构定义' : '暂无结构定义'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: 80 }}
        >
          <Space>
            <Button type="primary" onClick={handleCreate}>
              新建结构
            </Button>
            <Button onClick={handleAIAssistant}>
              AI 助手生成
            </Button>
          </Space>
        </Empty>
      )}

      {/* 推断弹窗 */}
      <InferSchemaModal
        open={inferModalOpen}
        onClose={() => setInferModalOpen(false)}
        onSuccess={(outputSchemaId) => {
          // 创建一个新的评估结构并关联推断出的输出结构
          router.push(`/schemas/new?outputSchemaId=${outputSchemaId}`)
        }}
      />
    </div>
  )
}
