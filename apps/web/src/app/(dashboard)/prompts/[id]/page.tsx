'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, Form, Input, Space, Typography, Row, Col, Spin, Empty, Tabs } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, HistoryOutlined, DiffOutlined } from '@ant-design/icons'
import { PromptEditor, VariableList, VersionList, QuickTest, PublishModal, VersionDiff } from '@/components/prompt'
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

const { Title, Text } = Typography
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
  const [content, setContent] = useState('')
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<{ v1?: string; v2?: string }>({})

  // 版本对比数据
  const { data: diffData, isLoading: diffLoading } = useVersionDiff(
    id,
    selectedVersions.v1,
    selectedVersions.v2
  )

  // 计算变量
  const variables = useMemo(() => extractVariables(content), [content])

  // 初始化表单和内容
  useEffect(() => {
    if (prompt) {
      form.setFieldsValue({
        name: prompt.name,
        description: prompt.description,
        tags: prompt.tags?.join(', ') || '',
      })
      setContent(prompt.content)
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
          content,
          tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
        },
      })
    } catch {
      // 验证失败
    }
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
        content,
        tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
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
          <Text type="secondary">v{prompt.currentVersion}</Text>
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
          >
            发布版本
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical">
              <Form.Item
                name="name"
                label="名称"
                rules={[{ required: true, message: '请输入提示词名称' }]}
              >
                <Input placeholder="输入提示词名称" />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <TextArea placeholder="输入提示词描述（可选）" rows={2} />
              </Form.Item>
              <Form.Item name="tags" label="标签">
                <Input placeholder="输入标签，多个用逗号分隔" />
              </Form.Item>
            </Form>
          </Card>

          <Card title="提示词内容">
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              使用 {'{{变量名}}'} 格式定义变量，如 {'{{role}}'}, {'{{question}}'}
            </Text>
            <PromptEditor value={content} onChange={setContent} height={400} />
          </Card>
        </Col>

        <Col span={8}>
          <Tabs
            defaultActiveKey="variables"
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
                      <Button
                        type="link"
                        size="small"
                        icon={<DiffOutlined />}
                        onClick={() => setDiffModalOpen(true)}
                      >
                        版本对比
                      </Button>
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
            ]}
          />
        </Col>
      </Row>

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
