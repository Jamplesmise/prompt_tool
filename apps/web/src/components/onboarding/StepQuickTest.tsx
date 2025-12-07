'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button, Card, Typography, Space, Alert, Spin, Form, Input, Select, Divider } from 'antd'
import { Play, CheckCircle, Clock, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { usePrompt, useTestPrompt } from '@/hooks/usePrompts'
import { useModels } from '@/hooks/useModels'
import { extractVariables } from '@/lib/template'

const { Text, Paragraph } = Typography
const { TextArea } = Input

type TestResult = {
  success: boolean
  output?: string
  error?: string
  latencyMs: number
  tokens?: {
    input: number
    output: number
    total: number
  }
}

export function StepQuickTest() {
  const [form] = Form.useForm()
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const { resources, completeStep } = useOnboardingStore()
  const { data: prompt, isLoading: promptLoading } = usePrompt(resources.promptId || '')
  const { data: models, isLoading: modelsLoading } = useModels()
  const testPrompt = useTestPrompt()

  const variables = useMemo(() => {
    if (!prompt?.content) return []
    return extractVariables(prompt.content)
  }, [prompt?.content])

  // 设置默认模型
  useEffect(() => {
    if (models && models.length > 0 && !form.getFieldValue('modelId')) {
      form.setFieldValue('modelId', models[0].id)
    }
  }, [models, form])

  const handleTest = async () => {
    try {
      const values = await form.validateFields()

      // 构建变量值对象
      const variableValues: Record<string, string> = {}
      variables.forEach((v) => {
        variableValues[v.name] = values[`var_${v.name}`] || ''
      })

      const result = await testPrompt.mutateAsync({
        promptId: resources.promptId!,
        data: {
          modelId: values.modelId,
          variables: variableValues,
        },
      })

      setTestResult(result)

      if (result.success) {
        completeStep(2)
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : '测试失败',
        latencyMs: 0,
      })
    }
  }

  const isLoading = promptLoading || modelsLoading

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
        <Paragraph style={{ marginTop: 16 }}>加载中...</Paragraph>
      </div>
    )
  }

  if (!resources.promptId || !prompt) {
    return (
      <Alert
        type="warning"
        message="请先完成提示词创建"
        description="返回上一步创建提示词后再进行测试。"
        showIcon
      />
    )
  }

  if (!models || models.length === 0) {
    return (
      <Alert
        type="warning"
        message="请先完成模型配置"
        description="返回第一步配置模型后再进行测试。"
        showIcon
      />
    )
  }

  const cardStyle: CSSProperties = {
    marginBottom: 16,
  }

  const resultCardStyle: CSSProperties = {
    backgroundColor: testResult?.success ? '#f6ffed' : '#fff2f0',
    borderColor: testResult?.success ? '#b7eb8f' : '#ffccc7',
  }

  return (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        运行您的第一个测试，验证提示词配置是否正确。
      </Paragraph>

      <Card size="small" style={cardStyle}>
        <Text strong>提示词：</Text>
        <Text>{prompt.name}</Text>
      </Card>

      <Form form={form} layout="vertical">
        <Form.Item
          name="modelId"
          label="选择模型"
          rules={[{ required: true, message: '请选择模型' }]}
        >
          <Select placeholder="选择要测试的模型">
            {models.map((model) => (
              <Select.Option key={model.id} value={model.id}>
                {model.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {variables.length > 0 && (
          <>
            <Divider orientation="left" plain>
              <Text type="secondary">填写变量值</Text>
            </Divider>
            {variables.map((variable) => (
              <Form.Item
                key={variable.name}
                name={`var_${variable.name}`}
                label={
                  <Space>
                    <Text code>{`{{${variable.name}}}`}</Text>
                    {variable.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {variable.description}
                      </Text>
                    )}
                  </Space>
                }
                rules={[
                  {
                    required: variable.required !== false,
                    message: `请填写 ${variable.name}`,
                  },
                ]}
              >
                <TextArea
                  rows={2}
                  placeholder={`输入 ${variable.name} 的值...`}
                />
              </Form.Item>
            ))}
          </>
        )}
      </Form>

      <Button
        type="primary"
        icon={<Play size={16} />}
        onClick={handleTest}
        loading={testPrompt.isPending}
        block
        size="large"
      >
        运行测试
      </Button>

      {testResult && (
        <Card size="small" style={{ ...cardStyle, ...resultCardStyle, marginTop: 16 }}>
          {testResult.success ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <CheckCircle size={16} style={{ color: '#52c41a' }} />
                <Text strong style={{ color: '#52c41a' }}>
                  测试成功！
                </Text>
              </Space>
              <Space split={<Divider type="vertical" />}>
                <Space size={4}>
                  <Clock size={14} />
                  <Text type="secondary">{testResult.latencyMs}ms</Text>
                </Space>
                {testResult.tokens && (
                  <Space size={4}>
                    <Zap size={14} />
                    <Text type="secondary">{testResult.tokens.total} tokens</Text>
                  </Space>
                )}
              </Space>
              <Divider style={{ margin: '12px 0' }} />
              <Text strong>模型输出：</Text>
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#fff',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  maxHeight: 150,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 13,
                }}
              >
                {testResult.output}
              </div>
            </Space>
          ) : (
            <Space direction="vertical">
              <Text strong style={{ color: '#ff4d4f' }}>
                测试失败
              </Text>
              <Text type="secondary">{testResult.error}</Text>
            </Space>
          )}
        </Card>
      )}
    </div>
  )
}
