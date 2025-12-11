'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Typography,
  Steps,
  Card,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Alert,
  Spin,
  Descriptions,
  Tooltip,
  Empty,
  List,
  Avatar,
  Divider,
  Modal,
} from 'antd'
import {
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  StarFilled,
  SendOutlined,
  UserOutlined,
  MessageOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons'
import { useUnifiedModels } from '@/hooks/useModels'
import { useGenerateSchema, useGenerateAndSaveSchema, useFollowUpSchema, type ConversationMessage } from '@/hooks/useAISchemaGenerator'
import { ModelSelector } from '@/components/common/ModelSelector'
import type { TemplateColumn, AISchemaOutput } from '@platform/shared'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 步骤定义
const STEPS = [
  { title: '选择模型', icon: <RobotOutlined /> },
  { title: '描述场景', icon: <ThunderboltOutlined /> },
  { title: '确认结构', icon: <CheckCircleOutlined /> },
  { title: '下载模板', icon: <DownloadOutlined /> },
]

// 场景描述示例
const DESCRIPTION_EXAMPLES = [
  {
    title: '智能客服意图识别',
    content: `我在做智能客服的意图识别测试。
输入：用户当前设备型号、用户拥有的所有设备列表、用户问题、对话历史
输出：思考过程、问题分类（bluetooth/wifi/battery/screen/other）、是否需要更改当前设备、提取的设备型号、检索关键词
其中"问题分类"和"设备型号提取"是关键字段，必须准确`,
  },
  {
    title: '内容审核',
    content: `我在做内容审核测试。
输入：待审核文本、发布者ID、发布时间
输出：审核结果（pass/reject/review）、违规类型（如有）、风险等级（1-5）、审核理由
"审核结果"是关键字段`,
  },
]

export default function AIAssistantPage() {
  const router = useRouter()

  // 步骤状态
  const [currentStep, setCurrentStep] = useState(0)

  // 表单状态
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [sceneName, setSceneName] = useState('')
  const [description, setDescription] = useState('')

  // 多轮对话状态
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [currentAIOutput, setCurrentAIOutput] = useState<AISchemaOutput | null>(null)

  // 输入框展开状态
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  // 生成结果
  const [generateResult, setGenerateResult] = useState<{
    inputSchema: { name: string; variables: unknown[] }
    outputSchema: { name: string; fields: unknown[]; aggregation: { mode: string } }
    templateColumns: TemplateColumn[]
    tokens?: { input: number; output: number; total: number }
    latencyMs?: number
  } | null>(null)

  // 保存后的 ID
  const [savedIds, setSavedIds] = useState<{
    evaluationSchemaId?: string
    inputSchemaId?: string
    outputSchemaId?: string
  }>({})

  // API hooks
  const { data: modelsData, isLoading: modelsLoading } = useUnifiedModels({ type: 'llm', active: true })
  const generateMutation = useGenerateSchema()
  const saveAndGenerateMutation = useGenerateAndSaveSchema()
  const followUpMutation = useFollowUpSchema()

  // 获取可用的 LLM 模型列表
  const llmModels = modelsData?.models || []

  // 处理生成
  const handleGenerate = useCallback(async () => {
    if (!selectedModelId || !sceneName || !description) return

    try {
      const result = await generateMutation.mutateAsync({
        modelId: selectedModelId,
        sceneName,
        description,
      })

      setGenerateResult({
        inputSchema: result.inputSchema,
        outputSchema: result.outputSchema,
        templateColumns: result.templateColumns,
        tokens: result.tokens,
        latencyMs: result.latencyMs,
      })
      // 保存 AI 原始输出用于追问
      setCurrentAIOutput(result.aiRawOutput)
      // 初始化对话历史
      setConversationHistory([
        { role: 'user', content: description },
        { role: 'assistant', content: JSON.stringify(result.aiRawOutput, null, 2) },
      ])
      setCurrentStep(2)
    } catch {
      // error handled by mutation
    }
  }, [selectedModelId, sceneName, description, generateMutation])

  // 处理追问
  const handleFollowUp = useCallback(async () => {
    if (!selectedModelId || !sceneName || !followUpInput || !currentAIOutput) return

    try {
      const result = await followUpMutation.mutateAsync({
        modelId: selectedModelId,
        sceneName,
        followUp: followUpInput,
        currentSchema: currentAIOutput,
        conversationHistory,
      })

      // 更新生成结果
      setGenerateResult({
        inputSchema: result.inputSchema,
        outputSchema: result.outputSchema,
        templateColumns: result.templateColumns,
        tokens: result.tokens,
        latencyMs: result.latencyMs,
      })

      // 更新 AI 原始输出
      setCurrentAIOutput(result.aiRawOutput)

      // 追加到对话历史
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: followUpInput },
        { role: 'assistant', content: JSON.stringify(result.aiRawOutput, null, 2) },
      ])

      // 清空追问输入
      setFollowUpInput('')
    } catch {
      // error handled by mutation
    }
  }, [selectedModelId, sceneName, followUpInput, currentAIOutput, conversationHistory, followUpMutation])

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!selectedModelId || !sceneName || !description) return

    try {
      const result = await saveAndGenerateMutation.mutateAsync({
        modelId: selectedModelId,
        sceneName,
        description,
      })

      setSavedIds({
        evaluationSchemaId: result.evaluationSchemaId,
        inputSchemaId: result.inputSchemaId,
        outputSchemaId: result.outputSchemaId,
      })
      setCurrentStep(3)
    } catch {
      // error handled by mutation
    }
  }, [selectedModelId, sceneName, description, saveAndGenerateMutation])

  // 处理下载模板
  const handleDownloadTemplate = useCallback(() => {
    if (!generateResult?.templateColumns) return

    // 生成 CSV 内容
    const headers = generateResult.templateColumns.map(col => col.key)
    const headerNames = generateResult.templateColumns.map(col => col.name)

    const csvContent = [
      headers.join(','),
      headerNames.join(','),
      // 添加一行示例数据
      generateResult.templateColumns.map(col => {
        if (col.fieldType === 'string') return '"示例文本"'
        if (col.fieldType === 'number') return '0'
        if (col.fieldType === 'boolean') return 'true'
        if (col.fieldType === 'array') return '"[\"item1\",\"item2\"]"'
        if (col.fieldType === 'enum') return '"选项1"'
        return '""'
      }).join(','),
    ].join('\n')

    // 创建下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sceneName || 'dataset'}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [generateResult, sceneName])

  // 重新生成
  const handleRegenerate = useCallback(() => {
    setGenerateResult(null)
    setSavedIds({})
    setCurrentStep(1)
  }, [])

  // 重新开始
  const handleReset = useCallback(() => {
    setCurrentStep(0)
    setSelectedModelId('')
    setSceneName('')
    setDescription('')
    setGenerateResult(null)
    setSavedIds({})
    setConversationHistory([])
    setFollowUpInput('')
    setCurrentAIOutput(null)
  }, [])

  // 渲染步骤 1: 选择模型
  const renderStep1 = () => (
    <Card title="选择生成模型" className="mb-4">
      <Paragraph type="secondary" className="mb-4">
        选择一个 LLM 模型来分析您的场景描述并生成 Schema 配置
      </Paragraph>

      {modelsLoading ? (
        <Spin />
      ) : llmModels.length === 0 ? (
        <Empty description="暂无可用模型，请先配置模型" />
      ) : (
        <ModelSelector
          models={llmModels}
          value={selectedModelId || undefined}
          onChange={(v) => setSelectedModelId(v as string)}
          placeholder="选择模型（支持按供应商筛选和搜索）"
          loading={modelsLoading}
          filterType="llm"
          filterActive={true}
          style={{ width: '100%', maxWidth: 500 }}
        />
      )}

      <div className="mt-4">
        <Button
          type="primary"
          disabled={!selectedModelId}
          onClick={() => setCurrentStep(1)}
        >
          下一步
        </Button>
      </div>
    </Card>
  )

  // 场景描述 placeholder
  const descriptionPlaceholder = `请详细描述您的测试场景，包括：

1. 输入变量（用户会提供什么数据）
   - 例如：用户问题、设备型号、对话历史等

2. 期望输出字段（模型应该返回什么）
   - 例如：问题分类、置信度、处理建议等

3. 关键字段（哪些字段必须准确）
   - 例如：问题分类是关键字段，必须准确识别`

  // 渲染步骤 2: 描述场景
  const renderStep2 = () => (
    <>
      <Card title="描述测试场景" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>场景名称</Text>
            <Input
              placeholder="例如：智能客服意图识别"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              className="mt-2"
              maxLength={50}
              size="large"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Space>
                <Text strong>场景描述</Text>
                <Tooltip title="描述您的测试场景，包括输入变量、期望输出字段、以及哪些是关键字段">
                  <InfoCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
              <Tooltip title="展开编辑">
                <Button
                  type="text"
                  icon={<ExpandOutlined />}
                  onClick={() => setDescriptionExpanded(true)}
                >
                  展开
                </Button>
              </Tooltip>
            </div>
            <TextArea
              placeholder={descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                minHeight: 200,
                fontSize: 14,
                lineHeight: 1.6,
              }}
              maxLength={2000}
              showCount
              autoSize={{ minRows: 8, maxRows: 20 }}
            />
          </div>

          <Alert
            type="info"
            showIcon
            message="描述示例（点击快速填充）"
            description={
              <Space size="middle" className="mt-2">
                {DESCRIPTION_EXAMPLES.map((example, index) => (
                  <Button
                    key={index}
                    type="dashed"
                    size="small"
                    onClick={() => {
                      setSceneName(example.title)
                      setDescription(example.content)
                    }}
                  >
                    {example.title}
                  </Button>
                ))}
              </Space>
            }
          />

          <Space>
            <Button onClick={() => setCurrentStep(0)}>
              上一步
            </Button>
            <Button
              type="primary"
              loading={generateMutation.isPending}
              disabled={!sceneName || !description || description.length < 10}
              onClick={handleGenerate}
              size="large"
            >
              生成配置
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 展开模式的弹窗 */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined />
            场景描述编辑器
          </Space>
        }
        open={descriptionExpanded}
        onCancel={() => setDescriptionExpanded(false)}
        width="90%"
        style={{ top: 40, maxWidth: 1200 }}
        footer={
          <Space>
            <Text type="secondary">{description.length} / 2000 字符</Text>
            <Button type="primary" onClick={() => setDescriptionExpanded(false)}>
              完成
            </Button>
          </Space>
        }
        destroyOnClose={false}
      >
        <div style={{ padding: '8px 0' }}>
          <TextArea
            placeholder={descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              height: 'calc(80vh - 200px)',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'none',
            }}
            maxLength={2000}
          />
        </div>
      </Modal>
    </>
  )

  // 渲染步骤 3: 确认结构
  const renderStep3 = () => {
    if (!generateResult) return null

    const inputColumns = [
      { title: '变量名', dataIndex: 'name', key: 'name' },
      { title: 'Key', dataIndex: 'key', key: 'key' },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag>{type}</Tag>,
      },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        render: (required: boolean) => (required ? <Tag color="red">是</Tag> : <Tag>否</Tag>),
      },
      { title: '数据集字段', dataIndex: 'datasetField', key: 'datasetField' },
    ]

    const outputColumns = [
      {
        title: '字段名',
        dataIndex: 'name',
        key: 'name',
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
      { title: 'Key', dataIndex: 'key', key: 'key' },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag>{type}</Tag>,
      },
      {
        title: '评估器',
        dataIndex: ['evaluation', 'evaluatorId'],
        key: 'evaluator',
        render: (id: string) => <Tag color="blue">{id?.replace('preset-', '')}</Tag>,
      },
      {
        title: '权重',
        dataIndex: ['evaluation', 'weight'],
        key: 'weight',
        render: (weight: number) => `${(weight * 100).toFixed(0)}%`,
      },
      { title: '期望字段', dataIndex: ['evaluation', 'expectedField'], key: 'expectedField' },
    ]

    return (
      <Card title="确认生成结构" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {generateResult.tokens && (
            <Alert
              type="success"
              message={`生成完成 - 耗时 ${generateResult.latencyMs}ms，消耗 ${generateResult.tokens.total} tokens`}
            />
          )}

          <Descriptions title="输入变量 Schema" bordered size="small" column={1}>
            <Descriptions.Item label="名称">{generateResult.inputSchema.name}</Descriptions.Item>
            <Descriptions.Item label="变量数量">{generateResult.inputSchema.variables.length}</Descriptions.Item>
          </Descriptions>

          <Table
            dataSource={generateResult.inputSchema.variables as object[]}
            columns={inputColumns}
            rowKey="key"
            pagination={false}
            size="small"
          />

          <Descriptions title="输出结构 Schema" bordered size="small" column={2}>
            <Descriptions.Item label="名称">{generateResult.outputSchema.name}</Descriptions.Item>
            <Descriptions.Item label="聚合模式">
              <Tag color="purple">{generateResult.outputSchema.aggregation.mode}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Table
            dataSource={generateResult.outputSchema.fields as object[]}
            columns={outputColumns}
            rowKey="key"
            pagination={false}
            size="small"
          />

          {/* 多轮对话区域 */}
          <Divider orientation="left">
            <Space>
              <MessageOutlined />
              对话历史与追问
            </Space>
          </Divider>

          {conversationHistory.length > 0 && (
            <Card
              size="small"
              style={{ maxHeight: 300, overflow: 'auto', background: '#fafafa' }}
            >
              <List
                itemLayout="horizontal"
                dataSource={conversationHistory}
                renderItem={(item, index) => (
                  <List.Item key={index} style={{ padding: '8px 0', border: 'none' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={item.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                          style={{
                            backgroundColor: item.role === 'user' ? '#1890ff' : '#52c41a',
                          }}
                        />
                      }
                      title={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.role === 'user' ? '您' : 'AI 助手'}
                        </Text>
                      }
                      description={
                        <Text
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontSize: 13,
                            display: 'block',
                            maxHeight: 100,
                            overflow: 'auto',
                          }}
                        >
                          {item.role === 'user'
                            ? item.content
                            : '已更新 Schema 配置'
                          }
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="继续描述修改需求，例如：添加一个置信度字段、把问题分类改成 10 个类别..."
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onPressEnter={handleFollowUp}
              disabled={followUpMutation.isPending}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={followUpMutation.isPending}
              onClick={handleFollowUp}
              disabled={!followUpInput.trim()}
            >
              发送
            </Button>
          </Space.Compact>

          <Alert
            type="info"
            message="追问提示"
            description="您可以继续描述修改需求，AI 会基于当前 Schema 进行增量更新。例如：添加字段、删除字段、修改类型、设置关键字段等。"
            showIcon
            style={{ marginTop: 8 }}
          />

          <Space style={{ marginTop: 16 }}>
            <Button icon={<ReloadOutlined />} onClick={handleRegenerate}>
              重新生成
            </Button>
            <Button
              type="primary"
              loading={saveAndGenerateMutation.isPending}
              onClick={handleSave}
            >
              确认并保存
            </Button>
          </Space>
        </Space>
      </Card>
    )
  }

  // 渲染步骤 4: 下载模板
  const renderStep4 = () => {
    if (!generateResult) return null

    const templateColumns = [
      { title: '列名', dataIndex: 'key', key: 'key' },
      { title: '显示名', dataIndex: 'name', key: 'name' },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => (
          <Tag color={type === 'input' ? 'green' : 'blue'}>
            {type === 'input' ? '输入' : '期望值'}
          </Tag>
        ),
      },
      {
        title: '数据类型',
        dataIndex: 'fieldType',
        key: 'fieldType',
        render: (type: string) => <Tag>{type}</Tag>,
      },
    ]

    return (
      <Card title="下载数据集模板" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="success"
            message="结构定义已保存成功！"
            description={
              <Space direction="vertical" size="small">
                <Text>结构定义 ID: {savedIds.evaluationSchemaId}</Text>
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => router.push(`/schemas/${savedIds.evaluationSchemaId}`)}
                >
                  查看结构定义详情
                </Button>
              </Space>
            }
          />

          <Descriptions title="数据集模板列" bordered size="small">
            <Descriptions.Item label="总列数">{generateResult.templateColumns.length}</Descriptions.Item>
            <Descriptions.Item label="输入列">
              {generateResult.templateColumns.filter(c => c.type === 'input').length}
            </Descriptions.Item>
            <Descriptions.Item label="期望值列">
              {generateResult.templateColumns.filter(c => c.type === 'expected').length}
            </Descriptions.Item>
          </Descriptions>

          <Table
            dataSource={generateResult.templateColumns}
            columns={templateColumns}
            rowKey="key"
            pagination={false}
            size="small"
          />

          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载 CSV 模板
            </Button>
            <Button onClick={handleReset}>
              创建新配置
            </Button>
            <Button
              type="link"
              onClick={() => router.push('/prompts/new')}
            >
              去创建提示词
            </Button>
          </Space>
        </Space>
      </Card>
    )
  }

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1()
      case 1:
        return renderStep2()
      case 2:
        return renderStep3()
      case 3:
        return renderStep4()
      default:
        return null
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3}>
          <RobotOutlined className="mr-2" />
          AI 配置助手
        </Title>
        <Paragraph type="secondary">
          通过对话描述您的测试场景，AI 将自动生成输入变量和输出结构的 Schema 配置
        </Paragraph>
      </div>

      <Steps
        current={currentStep}
        items={STEPS}
        className="mb-6"
      />

      {renderStepContent()}
    </div>
  )
}
