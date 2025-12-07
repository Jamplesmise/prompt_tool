'use client'

import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd'
import { CheckCircle, Copy, FileText } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useCreatePrompt, usePrompts } from '@/hooks/usePrompts'
import { useOnboardingStore } from '@/stores/onboardingStore'

const { Text, Paragraph } = Typography
const { TextArea } = Input

type PromptTemplate = {
  key: string
  name: string
  description: string
  icon: string
  content: string
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    key: 'customer-service',
    name: '智能客服',
    description: '处理客户咨询和问题',
    icon: '💬',
    content: `你是一个专业的客服助手。请根据以下客户问题，提供准确、友好的回答。

客户问题：{{question}}

请用简洁明了的语言回答，如果需要更多信息请礼貌询问。`,
  },
  {
    key: 'text-classification',
    name: '文本分类',
    description: '对文本进行分类标注',
    icon: '🏷️',
    content: `请对以下文本进行分类。

文本内容：{{text}}

分类选项：{{categories}}

请只输出分类结果，不要包含其他内容。`,
  },
  {
    key: 'summarization',
    name: '内容摘要',
    description: '生成文章摘要',
    icon: '📝',
    content: `请为以下内容生成一个简洁的摘要。

原文内容：{{content}}

要求：
1. 摘要长度控制在 {{max_length}} 字以内
2. 保留核心信息和关键观点
3. 使用清晰简洁的语言`,
  },
]

type FormValues = {
  name: string
  content: string
}

export function StepPromptCreate() {
  const [form] = Form.useForm<FormValues>()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isCreated, setIsCreated] = useState(false)

  const { data: existingPrompts } = usePrompts({ pageSize: 1 })
  const createPrompt = useCreatePrompt()
  const { completeStep, setResource } = useOnboardingStore()

  const hasExistingPrompt = existingPrompts && existingPrompts.total > 0

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template.key)
    form.setFieldsValue({
      name: `我的${template.name}提示词`,
      content: template.content,
    })
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const prompt = await createPrompt.mutateAsync({
        name: values.name,
        content: values.content,
        description: '通过新手引导创建',
      })
      setResource('promptId', prompt.id)
      setIsCreated(true)
      completeStep(1)
    } catch (error) {
      // 表单验证失败
    }
  }

  const handleSkipWithExisting = () => {
    if (existingPrompts && existingPrompts.list.length > 0) {
      setResource('promptId', existingPrompts.list[0].id)
      completeStep(1)
    }
  }

  const templateCardStyle = (isSelected: boolean): CSSProperties => ({
    cursor: 'pointer',
    border: isSelected ? '2px solid #EF4444' : '1px solid #f0f0f0',
    borderRadius: 8,
    transition: 'all 0.2s',
    backgroundColor: isSelected ? '#f0f7ff' : '#fff',
    flex: 1,
  })

  return (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        创建您的第一个提示词。选择一个模板快速开始，或粘贴已有的提示词。
      </Paragraph>

      {hasExistingPrompt && (
        <Alert
          type="info"
          message="已有提示词"
          description={
            <Space direction="vertical" size={8}>
              <Text>检测到您已有 {existingPrompts.total} 个提示词，可以直接使用现有提示词。</Text>
              <Button type="primary" size="small" onClick={handleSkipWithExisting}>
                使用现有提示词
              </Button>
            </Space>
          }
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      {isCreated ? (
        <Alert
          type="success"
          message="提示词创建成功！"
          description="您可以继续下一步进行快速测试。"
          icon={<CheckCircle size={16} />}
          showIcon
        />
      ) : (
        <>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            选择模板
          </Text>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {PROMPT_TEMPLATES.map((template) => (
              <Card
                key={template.key}
                size="small"
                style={templateCardStyle(selectedTemplate === template.key)}
                onClick={() => handleSelectTemplate(template)}
              >
                <Space direction="vertical" size={4}>
                  <Text style={{ fontSize: 20 }}>{template.icon}</Text>
                  <Text strong>{template.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {template.description}
                  </Text>
                </Space>
              </Card>
            ))}
          </div>

          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="提示词名称"
              rules={[
                { required: true, message: '请输入提示词名称' },
                { max: 50, message: '名称不能超过 50 个字符' },
              ]}
            >
              <Input placeholder="例如：客服回复助手" />
            </Form.Item>

            <Form.Item
              name="content"
              label={
                <Space>
                  <span>提示词内容</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    使用 {'{{变量名}}'} 定义变量
                  </Text>
                </Space>
              }
              rules={[
                { required: true, message: '请输入提示词内容' },
                { min: 10, message: '内容至少需要 10 个字符' },
              ]}
            >
              <TextArea
                rows={8}
                placeholder="输入您的提示词内容..."
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Form>

          <Button
            type="primary"
            icon={<FileText size={16} />}
            onClick={handleCreate}
            loading={createPrompt.isPending}
            block
          >
            创建提示词
          </Button>
        </>
      )}
    </div>
  )
}
