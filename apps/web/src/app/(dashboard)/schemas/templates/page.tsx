'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Typography,
  Card,
  Row,
  Col,
  Input,
  Button,
  Space,
  Tag,
  Spin,
  Empty,
  Modal,
  Descriptions,
  Table,
  Tooltip,
  Alert,
} from 'antd'
import {
  AppstoreOutlined,
  SearchOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  SmileOutlined,
  CodeOutlined,
  TagsOutlined,
  StarFilled,
  CheckCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useSchemaTemplates, useSchemaTemplate, useUseSchemaTemplate } from '@/hooks/useSchemas'

const { Title, Text, Paragraph } = Typography

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  CustomerServiceOutlined: <CustomerServiceOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  SmileOutlined: <SmileOutlined />,
  CodeOutlined: <CodeOutlined />,
  TagsOutlined: <TagsOutlined />,
}

// 分类颜色
const categoryColors: Record<string, string> = {
  customer_service: 'blue',
  document_analysis: 'green',
  text_analysis: 'purple',
  code_quality: 'orange',
  nlp: 'cyan',
  general: 'default',
}

export default function SchemaTemplatesPage() {
  const router = useRouter()

  // 状态
  const [searchText, setSearchText] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // API hooks
  const { data: templatesData, isLoading } = useSchemaTemplates()
  const { data: templateDetail, isLoading: detailLoading } = useSchemaTemplate(selectedTemplateId || undefined)
  const useTemplateMutation = useUseSchemaTemplate()

  // 过滤模板
  const filteredCategories = templatesData?.categories?.filter((category) => {
    if (!searchText) return true
    return category.templates.some(
      (t) =>
        t.name.toLowerCase().includes(searchText.toLowerCase()) ||
        t.description.toLowerCase().includes(searchText.toLowerCase())
    )
  }).map((category) => ({
    ...category,
    templates: searchText
      ? category.templates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchText.toLowerCase()) ||
            t.description.toLowerCase().includes(searchText.toLowerCase())
        )
      : category.templates,
  }))

  // 使用模板
  const handleUseTemplate = useCallback(async () => {
    if (!selectedTemplateId) return

    try {
      const result = await useTemplateMutation.mutateAsync({
        templateId: selectedTemplateId,
      })
      setSelectedTemplateId(null)
      // 跳转到提示词创建页面，带上 schema ID
      router.push(`/prompts/new?inputSchemaId=${result.inputSchemaId}&outputSchemaId=${result.outputSchemaId}`)
    } catch {
      // error handled by mutation
    }
  }, [selectedTemplateId, useTemplateMutation, router])

  // 渲染模板卡片
  const renderTemplateCard = (template: {
    id: string
    name: string
    description: string
    icon?: string
    inputVariableCount: number
    outputFieldCount: number
  }) => (
    <Card
      key={template.id}
      hoverable
      className="h-full"
      onClick={() => setSelectedTemplateId(template.id)}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl text-blue-500">
            {template.icon ? iconMap[template.icon] || <AppstoreOutlined /> : <AppstoreOutlined />}
          </span>
          <Text strong className="text-base">{template.name}</Text>
        </div>
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          className="mb-3 flex-1"
        >
          {template.description}
        </Paragraph>
        <div className="flex items-center justify-between">
          <Space size="small">
            <Tag color="blue">{template.inputVariableCount} 输入</Tag>
            <Tag color="green">{template.outputFieldCount} 输出</Tag>
          </Space>
          <Button type="link" size="small">
            查看详情
          </Button>
        </div>
      </div>
    </Card>
  )

  // 渲染详情弹窗
  const renderDetailModal = () => {
    if (!templateDetail) return null

    const inputColumns = [
      { title: '变量名', dataIndex: 'name', key: 'name', width: 120 },
      { title: 'Key', dataIndex: 'key', key: 'key', width: 120 },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: string) => <Tag>{type}</Tag>,
      },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        width: 60,
        render: (required: boolean) => (required ? <Tag color="red">是</Tag> : <Tag>否</Tag>),
      },
      { title: '描述', dataIndex: 'description', key: 'description' },
    ]

    const outputColumns = [
      {
        title: '字段名',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        render: (name: string, record: { evaluation?: { isCritical?: boolean } }) => (
          <Space>
            {record.evaluation?.isCritical && (
              <Tooltip title="关键字段">
                <StarFilled style={{ color: '#faad14' }} />
              </Tooltip>
            )}
            {name}
          </Space>
        ),
      },
      { title: 'Key', dataIndex: 'key', key: 'key', width: 120 },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: string) => <Tag>{type}</Tag>,
      },
      {
        title: '权重',
        dataIndex: ['evaluation', 'weight'],
        key: 'weight',
        width: 80,
        render: (weight: number) => `${((weight || 0) * 100).toFixed(0)}%`,
      },
      { title: '描述', dataIndex: 'description', key: 'description' },
    ]

    return (
      <Modal
        title={
          <Space>
            {templateDetail.icon ? iconMap[templateDetail.icon] || <AppstoreOutlined /> : <AppstoreOutlined />}
            <span>{templateDetail.name}</span>
            <Tag color={categoryColors[templateDetail.category] || 'default'}>
              {templateDetail.categoryLabel}
            </Tag>
          </Space>
        }
        open={!!selectedTemplateId}
        onCancel={() => setSelectedTemplateId(null)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setSelectedTemplateId(null)}>
            取消
          </Button>,
          <Button
            key="use"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={useTemplateMutation.isPending}
            onClick={handleUseTemplate}
          >
            使用此模板
          </Button>,
        ]}
      >
        {detailLoading ? (
          <div className="text-center py-8">
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Paragraph type="secondary">{templateDetail.description}</Paragraph>

            <Alert
              type="info"
              showIcon
              message="使用此模板将自动创建对应的输入变量和输出结构 Schema，您可以在此基础上进行修改。"
            />

            <Descriptions title="输入变量" size="small" bordered column={2}>
              <Descriptions.Item label="Schema 名称">{templateDetail.inputSchema.name}</Descriptions.Item>
              <Descriptions.Item label="变量数量">
                {(templateDetail.inputSchema.variables as unknown[]).length}
              </Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={templateDetail.inputSchema.variables as object[]}
              columns={inputColumns}
              rowKey="key"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />

            <Descriptions title="输出结构" size="small" bordered column={2}>
              <Descriptions.Item label="Schema 名称">{templateDetail.outputSchema.name}</Descriptions.Item>
              <Descriptions.Item label="聚合模式">
                <Tag color="purple">{templateDetail.outputSchema.aggregation.mode}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={templateDetail.outputSchema.fields as object[]}
              columns={outputColumns}
              rowKey="key"
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
            />
          </Space>
        )}
      </Modal>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={3} className="mb-0">
              <AppstoreOutlined className="mr-2" />
              Schema 模板库
            </Title>
            <Paragraph type="secondary" className="mb-0 mt-1">
              选择预置模板快速创建输入变量和输出结构，适用于常见的测试场景
            </Paragraph>
          </div>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={() => router.push('/schemas/ai-assistant')}
          >
            AI 配置助手
          </Button>
        </div>

        <Input
          placeholder="搜索模板名称或描述..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400 }}
          allowClear
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Spin size="large" />
        </div>
      ) : !filteredCategories || filteredCategories.length === 0 ? (
        <Empty description="暂无匹配的模板" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {filteredCategories.map((category) => (
            <Card
              key={category.key}
              title={
                <Space>
                  <Tag color={categoryColors[category.key] || 'default'}>{category.label}</Tag>
                  <Text type="secondary">共 {category.templates.length} 个模板</Text>
                </Space>
              }
              size="small"
            >
              <Row gutter={[16, 16]}>
                {category.templates.map((template) => (
                  <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
                    {renderTemplateCard(template)}
                  </Col>
                ))}
              </Row>
            </Card>
          ))}
        </Space>
      )}

      {renderDetailModal()}
    </div>
  )
}
