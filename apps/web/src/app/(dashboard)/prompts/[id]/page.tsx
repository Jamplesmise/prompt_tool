'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, Form, Input, Space, Typography, Row, Col, Spin, Empty, Tabs, Tag } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, HistoryOutlined, DiffOutlined, SwapOutlined, LineChartOutlined, InfoCircleOutlined, RobotOutlined, EditOutlined, LinkOutlined } from '@ant-design/icons'
import { VariableList, VersionList, QuickTest, PublishModal, VersionDiff, SchemaAssociation } from '@/components/prompt'
import { FormSection, CodeEditor } from '@/components/common'
import { RegressionTracker } from '@/components/regression'
import type { VersionSnapshot } from '@/components/results'
import {
  usePrompt,
  useUpdatePrompt,
  usePromptVersions,
  usePublishVersion,
  useRollbackVersion,
  useTestPrompt,
  useVersionDiff,
} from '@/hooks/usePrompts'
import { useModels } from '@/hooks/useModels'
import { extractVariables } from '@/lib/template'
import { eventBus } from '@/lib/eventBus'
import { PromptSavedTip } from '@/components/guidance'
import { PRIMARY } from '@/theme/colors'

const { Title } = Typography
const { TextArea } = Input

export default function PromptDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const [form] = Form.useForm()

  // 数据获取
  const { data: prompt, isLoading, error } = usePrompt(id)
  const { data: versions, isLoading: versionsLoading } = usePromptVersions(id)
  const { data: models, isLoading: modelsLoading } = useModels()
  const updatePrompt = useUpdatePrompt()
  const publishVersion = usePublishVersion()
  const rollbackVersion = useRollbackVersion()
  const testPrompt = useTestPrompt()

  // 本地状态
  const [systemPrompt, setSystemPrompt] = useState('')
  const [content, setContent] = useState('')
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<{ v1?: string; v2?: string }>({})
  const [activeTab, setActiveTab] = useState('variables')
  const [inputSchemaId, setInputSchemaId] = useState<string | null>(null)
  const [outputSchemaId, setOutputSchemaId] = useState<string | null>(null)

  // 版本对比数据
  const { data: diffData, isLoading: diffLoading } = useVersionDiff(
    id,
    selectedVersions.v1,
    selectedVersions.v2
  )

  // 计算变量（从系统提示词和用户提示词中合并提取）
  const variables = useMemo(() => {
    const allContent = `${systemPrompt}\n${content}`
    return extractVariables(allContent)
  }, [systemPrompt, content])

  // 构建版本快照数据（模拟数据，实际应从 API 获取）
  const versionSnapshots: VersionSnapshot[] = useMemo(() => {
    if (!versions) return []
    return versions.map((v, index) => ({
      promptId: id,
      version: v.version,
      taskId: '',
      createdAt: new Date(v.createdAt),
      metrics: {
        // 模拟数据 - 实际应从测试任务结果聚合
        passRate: 70 + Math.random() * 25,
        avgLatency: 1000 + Math.random() * 2000,
        avgCost: 0.001 + Math.random() * 0.005,
        totalTests: 50 + Math.floor(Math.random() * 100),
        failedTests: Math.floor(Math.random() * 20),
      },
      changeDescription: v.changeLog || '',
    }))
  }, [versions, id])

  // 初始化表单和内容
  useEffect(() => {
    if (prompt) {
      form.setFieldsValue({
        name: prompt.name,
        description: prompt.description,
        tags: prompt.tags?.join(', ') || '',
      })
      setSystemPrompt(prompt.systemPrompt || '')
      setContent(prompt.content)
      setInputSchemaId(prompt.inputSchemaId || null)
      setOutputSchemaId(prompt.outputSchemaId || null)
    }
  }, [prompt, form])

  // 保存草稿
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await updatePrompt.mutateAsync({
        id,
        data: {
          name: values.name,
          description: values.description,
          systemPrompt,
          content,
          tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
          inputSchemaId: inputSchemaId || undefined,
          outputSchemaId: outputSchemaId || undefined,
        },
      })
      // 触发保存事件
      eventBus.emit('prompt:saved', { promptId: id, promptName: values.name })
    } catch {
      // 验证失败
    }
  }

  // 处理 Schema 关联变更
  const handleSchemaChange = (newInputId: string | null, newOutputId: string | null) => {
    setInputSchemaId(newInputId)
    setOutputSchemaId(newOutputId)
  }

  // 发布版本
  const handlePublish = async (changeLog: string) => {
    // 先保存草稿
    const values = await form.validateFields()
    await updatePrompt.mutateAsync({
      id,
      data: {
        name: values.name,
        description: values.description,
        systemPrompt,
        content,
        tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
        inputSchemaId: inputSchemaId || undefined,
        outputSchemaId: outputSchemaId || undefined,
      },
    })

    // 发布新版本
    await publishVersion.mutateAsync({
      promptId: id,
      data: { changeLog },
    })
    setPublishModalOpen(false)
  }

  // 回滚版本
  const handleRollback = async (versionId: string) => {
    await rollbackVersion.mutateAsync({ promptId: id, versionId })
  }

  // 快速测试
  const handleTest = async (modelId: string, variableValues: Record<string, string>) => {
    const result = await testPrompt.mutateAsync({
      promptId: id,
      data: { modelId, variables: variableValues },
    })
    return result
  }

  // 版本选择变化
  const handleVersionChange = (key: 'v1' | 'v2', versionId: string) => {
    setSelectedVersions((prev) => ({ ...prev, [key]: versionId }))
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !prompt) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="提示词不存在或加载失败" />
        <Button onClick={() => router.push('/prompts')} style={{ marginTop: 16 }}>
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/prompts')}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {prompt.name}
          </Title>
          <Tag
            style={{
              background: PRIMARY[50],
              color: PRIMARY[600],
              border: `1px solid ${PRIMARY[200]}`,
            }}
          >
            v{prompt.currentVersion}
          </Tag>
        </Space>
        <Space>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={updatePrompt.isPending}
          >
            保存草稿
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setPublishModalOpen(true)}
            style={{
              background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
              border: 'none',
              boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
            }}
          >
            发布版本
          </Button>
        </Space>
      </div>

      {/* 保存后的提示 */}
      <PromptSavedTip promptId={id} />

      <Form form={form} layout="vertical">
        <Row gutter={24}>
          <Col span={16}>
            <FormSection
              title="基本信息"
              icon={<InfoCircleOutlined />}
              description="设置提示词的名称、描述和标签"
            >
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入提示词名称' }]}
                  >
                    <Input placeholder="输入提示词名称" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="tags" label="标签">
                    <Input placeholder="多个用逗号分隔" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="描述">
                <TextArea placeholder="输入提示词描述（可选）" rows={2} showCount maxLength={200} />
              </Form.Item>
            </FormSection>

            <FormSection
              title="系统提示词"
              icon={<RobotOutlined />}
              description="定义 AI 的角色和行为规范（可选）"
              collapsible
              defaultExpanded={!!systemPrompt}
            >
              <CodeEditor
                value={systemPrompt}
                onChange={setSystemPrompt}
                height={200}
                title="System Prompt"
                language="prompt"
                showThemeSwitch
              />
            </FormSection>

            <FormSection
              title="用户提示词"
              icon={<EditOutlined />}
              description="使用 {{变量名}} 格式定义变量，如 {{role}}, {{question}}"
            >
              <CodeEditor
                value={content}
                onChange={setContent}
                height={350}
                title="User Prompt"
                language="prompt"
                showThemeSwitch
              />
            </FormSection>
          </Col>

        <Col span={8}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'variables',
                label: '变量',
                children: (
                  <Card size="small">
                    <VariableList variables={variables} />
                  </Card>
                ),
              },
              {
                key: 'versions',
                label: (
                  <Space>
                    <HistoryOutlined />
                    版本历史
                  </Space>
                ),
                children: (
                  <Card
                    size="small"
                    extra={
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          icon={<DiffOutlined />}
                          onClick={() => setDiffModalOpen(true)}
                          style={{ color: PRIMARY[500] }}
                        >
                          快速对比
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => router.push(`/comparison/versions?promptId=${id}`)}
                          style={{ color: PRIMARY[500] }}
                        >
                          详细对比
                        </Button>
                      </Space>
                    }
                  >
                    <VersionList
                      versions={versions || []}
                      currentVersion={prompt.currentVersion}
                      loading={versionsLoading}
                      onRollback={handleRollback}
                    />
                  </Card>
                ),
              },
              {
                key: 'test',
                label: '快速测试',
                children: (
                  <QuickTest
                    variables={variables}
                    models={models || []}
                    modelsLoading={modelsLoading}
                    onTest={handleTest}
                  />
                ),
              },
              {
                key: 'schema',
                label: (
                  <Space>
                    <LinkOutlined />
                    结构定义
                    {(inputSchemaId || outputSchemaId) && (
                      <Tag color="green" style={{ marginLeft: 4 }}>已关联</Tag>
                    )}
                  </Space>
                ),
                children: (
                  <Card size="small">
                    <SchemaAssociation
                      inputSchemaId={inputSchemaId}
                      outputSchemaId={outputSchemaId}
                      promptVariables={variables}
                      onChange={handleSchemaChange}
                    />
                  </Card>
                ),
              },
              {
                key: 'quality',
                label: (
                  <Space>
                    <LineChartOutlined />
                    质量追踪
                  </Space>
                ),
                children: (
                  <RegressionTracker
                    promptId={id}
                    currentVersion={prompt.currentVersion}
                    snapshots={versionSnapshots}
                    onRollback={(version) => {
                      const targetVersion = versions?.find(v => v.version === version)
                      if (targetVersion) {
                        handleRollback(targetVersion.id)
                      }
                    }}
                    onCompare={(fromVersion, toVersion) => {
                      const v1 = versions?.find(v => v.version === fromVersion)
                      const v2 = versions?.find(v => v.version === toVersion)
                      if (v1 && v2) {
                        setSelectedVersions({ v1: v1.id, v2: v2.id })
                        setDiffModalOpen(true)
                      }
                    }}
                  />
                ),
              },
            ]}
          />
        </Col>
        </Row>
      </Form>

      <PublishModal
        open={publishModalOpen}
        loading={publishVersion.isPending}
        onOk={handlePublish}
        onCancel={() => setPublishModalOpen(false)}
      />

      <VersionDiff
        open={diffModalOpen}
        versions={versions || []}
        diffData={diffData || null}
        loading={diffLoading}
        selectedVersions={selectedVersions}
        onVersionChange={handleVersionChange}
        onClose={() => {
          setDiffModalOpen(false)
          setSelectedVersions({})
        }}
      />
    </div>
  )
}
