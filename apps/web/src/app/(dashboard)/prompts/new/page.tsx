'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Form, Input, Space, Typography, Row, Col } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { PromptEditor, VariableList } from '@/components/prompt'
import { useCreatePrompt } from '@/hooks/usePrompts'
import { extractVariables } from '@/lib/template'

const { Title, Text } = Typography
const { TextArea } = Input

export default function NewPromptPage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [content, setContent] = useState('')
  const createPrompt = useCreatePrompt()

  const variables = useMemo(() => extractVariables(content), [content])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const prompt = await createPrompt.mutateAsync({
        name: values.name,
        description: values.description,
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
          <Card title="变量列表">
            <VariableList variables={variables} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
