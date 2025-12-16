'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Space, Typography, Row, Col } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, InfoCircleOutlined, EditOutlined, TagsOutlined, RobotOutlined } from '@ant-design/icons'
import { VariableList } from '@/components/prompt'
import { FormSection, CodeEditor } from '@/components/common'
import { useCreatePrompt } from '@/hooks/usePrompts'
import { extractVariables } from '@/lib/template'
import { useGoiFormPrefill } from '@/hooks/useGoiFormPrefill'

const { Title } = Typography
const { TextArea } = Input

export default function NewPromptPage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [systemPrompt, setSystemPrompt] = useState('')
  const [content, setContent] = useState('')
  const createPrompt = useCreatePrompt()

  // GOI 表单预填支持
  useGoiFormPrefill(form, 'prompt-form', {
    onPrefill: (data) => {
      // 处理非表单字段的预填（CodeEditor 使用的 state）
      if (data.systemPrompt && typeof data.systemPrompt === 'string') {
        setSystemPrompt(data.systemPrompt)
      }
      if (data.content && typeof data.content === 'string') {
        setContent(data.content)
      }
    },
  })

  // 从系统提示词和用户提示词中合并提取变量
  const variables = useMemo(() => {
    const allContent = `${systemPrompt}\n${content}`
    return extractVariables(allContent)
  }, [systemPrompt, content])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const prompt = await createPrompt.mutateAsync({
        name: values.name,
        description: values.description,
        systemPrompt,
        content,
        tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
      })
      router.push(`/prompts/${prompt.id}`)
    } catch {
      // 验证失败
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            新建提示词
          </Title>
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={createPrompt.isPending}
        >
          保存并创建
        </Button>
      </div>

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
              defaultExpanded={false}
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
            <FormSection title="变量列表" icon={<TagsOutlined />}>
              <VariableList variables={variables} />
            </FormSection>
          </Col>
        </Row>
      </Form>
    </div>
  )
}
