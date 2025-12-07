'use client'

import { useState } from 'react'
import { Form, Input, Select, Button, Space, Alert, Card, Typography } from 'antd'
import { CheckCircle, Loader2, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useCreateProvider, useProviders } from '@/hooks/useModels'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { modelsService } from '@/services/models'

const { Text, Paragraph } = Typography

type ProviderPreset = {
  key: string
  name: string
  type: 'openai' | 'anthropic' | 'azure' | 'custom'
  baseUrl: string
  placeholder: string
  description: string
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    placeholder: 'sk-...',
    description: 'GPT-4o、GPT-4、GPT-3.5-turbo 等',
  },
  {
    key: 'anthropic',
    name: 'Claude',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    placeholder: 'sk-ant-...',
    description: 'Claude 3.5 Sonnet、Claude 3 Opus 等',
  },
  {
    key: 'deepseek',
    name: 'DeepSeek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    placeholder: 'sk-...',
    description: 'DeepSeek Chat、DeepSeek Coder 等',
  },
]

type FormValues = {
  providerKey: string
  apiKey: string
  customBaseUrl?: string
}

export function StepModelConfig() {
  const [form] = Form.useForm<FormValues>()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const { data: existingProviders } = useProviders()
  const createProvider = useCreateProvider()
  const { completeStep, setResource } = useOnboardingStore()

  const selectedPreset = Form.useWatch('providerKey', form)
  const preset = PROVIDER_PRESETS.find((p) => p.key === selectedPreset)

  const hasExistingProvider = existingProviders && existingProviders.length > 0

  const handleTest = async () => {
    try {
      const values = await form.validateFields()
      const targetPreset = PROVIDER_PRESETS.find((p) => p.key === values.providerKey)
      if (!targetPreset) return

      setTestStatus('testing')
      setTestMessage('')

      // 创建提供商
      const baseUrl = values.customBaseUrl || targetPreset.baseUrl
      const provider = await createProvider.mutateAsync({
        name: targetPreset.name,
        type: targetPreset.type,
        baseUrl,
        apiKey: values.apiKey,
      })

      // 测试连接
      const testResponse = await modelsService.providers.test(provider.id)

      if (testResponse.code === 200 && testResponse.data?.success) {
        setTestStatus('success')
        setTestMessage(`连接成功！延迟: ${testResponse.data.latencyMs}ms`)
        setResource('modelConfigId', provider.id)
        completeStep(0)
      } else {
        setTestStatus('error')
        setTestMessage(testResponse.data?.message || testResponse.message || '连接失败，请检查 API Key')
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : '配置失败')
    }
  }

  const handleSkipWithExisting = () => {
    if (existingProviders && existingProviders.length > 0) {
      setResource('modelConfigId', existingProviders[0].id)
      completeStep(0)
    }
  }

  const presetCardStyle = (isSelected: boolean): CSSProperties => ({
    cursor: 'pointer',
    border: isSelected ? '2px solid #EF4444' : '1px solid #f0f0f0',
    borderRadius: 8,
    padding: 12,
    transition: 'all 0.2s',
    backgroundColor: isSelected ? '#f0f7ff' : '#fff',
  })

  return (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        配置一个 AI 模型提供商，用于后续的提示词测试。
      </Paragraph>

      {hasExistingProvider && (
        <Alert
          type="info"
          message="已有模型配置"
          description={
            <Space direction="vertical" size={8}>
              <Text>
                检测到您已配置了 {existingProviders.length} 个模型提供商，可以直接使用现有配置。
              </Text>
              <Button type="primary" size="small" onClick={handleSkipWithExisting}>
                使用现有配置
              </Button>
            </Space>
          }
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="providerKey"
          label="选择模型提供商"
          rules={[{ required: true, message: '请选择模型提供商' }]}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            {PROVIDER_PRESETS.map((p) => (
              <Card
                key={p.key}
                size="small"
                style={presetCardStyle(selectedPreset === p.key)}
                onClick={() => form.setFieldValue('providerKey', p.key)}
              >
                <Text strong>{p.name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {p.description}
                </Text>
              </Card>
            ))}
          </div>
        </Form.Item>

        {preset && (
          <>
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[
                { required: true, message: '请输入 API Key' },
                { min: 10, message: 'API Key 长度不正确' },
              ]}
            >
              <Input.Password placeholder={preset.placeholder} autoComplete="off" />
            </Form.Item>

            <Form.Item name="customBaseUrl" label="API 地址（可选）">
              <Input placeholder={preset.baseUrl} />
            </Form.Item>
          </>
        )}
      </Form>

      {testStatus === 'success' && (
        <Alert
          type="success"
          message={testMessage}
          icon={<CheckCircle size={16} />}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {testStatus === 'error' && (
        <Alert
          type="error"
          message="连接测试失败"
          description={testMessage}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Button
        type="primary"
        icon={testStatus === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
        onClick={handleTest}
        loading={testStatus === 'testing'}
        disabled={!selectedPreset || testStatus === 'success'}
        block
      >
        {testStatus === 'testing' ? '测试连接中...' : testStatus === 'success' ? '配置完成' : '测试连接并保存'}
      </Button>
    </div>
  )
}
