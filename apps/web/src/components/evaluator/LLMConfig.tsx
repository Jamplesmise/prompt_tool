'use client'

import { useMemo } from 'react'
import { Form, Select, InputNumber, Alert, Typography, Space } from 'antd'
import { DEFAULT_EVALUATION_PROMPT, SIMPLE_SCORING_PROMPT, COMPARISON_PROMPT } from '@platform/evaluators'
import { SimpleModelSelector, CodeEditor } from '@/components/common'
import type { UnifiedModel } from '@/services/models'

const { Text } = Typography

type Model = {
  id: string
  name: string
  modelId: string
  provider?: { name: string }
}

type LLMConfigProps = {
  models: Model[]
  loading?: boolean
}

// 提示词模板选项
const PROMPT_TEMPLATES = [
  {
    key: 'default',
    label: '默认评估模板',
    description: '多维度评估（相关性、准确性、完整性、清晰度）',
    template: DEFAULT_EVALUATION_PROMPT,
  },
  {
    key: 'simple',
    label: '简单评分模板',
    description: '快速评分，适合简单场景',
    template: SIMPLE_SCORING_PROMPT,
  },
  {
    key: 'comparison',
    label: '对比评估模板',
    description: '比较模型输出与期望输出',
    template: COMPARISON_PROMPT,
  },
  {
    key: 'custom',
    label: '自定义模板',
    description: '完全自定义提示词',
    template: '',
  },
]

export function LLMConfig({ models, loading = false }: LLMConfigProps) {
  const form = Form.useFormInstance()
  const selectedTemplate = Form.useWatch('promptTemplate', form)

  // 转换为 UnifiedModel 格式
  const unifiedModels: UnifiedModel[] = useMemo(() => {
    return models.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider?.name || 'Unknown',
      type: 'llm',
      isActive: true,
      isCustom: true,
      source: 'local' as const,
    }))
  }, [models])

  const handleTemplateChange = (templateKey: string) => {
    const template = PROMPT_TEMPLATES.find((t) => t.key === templateKey)
    if (template && template.key !== 'custom') {
      form.setFieldValue('prompt', template.template)
    }
  }

  return (
    <>
      <Alert
        type="warning"
        message="LLM 评估器会消耗 Token"
        description="每次评估都会调用 LLM 模型，请注意成本控制"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="modelId"
        label="评估模型"
        rules={[{ required: true, message: '请选择评估模型' }]}
        extra="选择用于评估的 LLM 模型"
      >
        <SimpleModelSelector
          models={unifiedModels}
          placeholder="选择模型"
          loading={loading}
        />
      </Form.Item>

      <Form.Item
        name="promptTemplate"
        label="提示词模板"
        initialValue="default"
      >
        <Select
          placeholder="选择模板"
          onChange={handleTemplateChange}
          options={PROMPT_TEMPLATES.map((t) => ({
            value: t.key,
            label: (
              <Space direction="vertical" size={0}>
                <span>{t.label}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t.description}
                </Text>
              </Space>
            ),
          }))}
        />
      </Form.Item>

      <Form.Item
        name="prompt"
        label="评估提示词"
        rules={[{ required: true, message: '请输入评估提示词' }]}
        extra={
          <Text type="secondary">
            可用变量: {'{{input}}'} (输入), {'{{output}}'} (输出), {'{{expected}}'} (期望)
          </Text>
        }
        initialValue={DEFAULT_EVALUATION_PROMPT}
      >
        <CodeEditor
          value={form.getFieldValue('prompt') || DEFAULT_EVALUATION_PROMPT}
          onChange={(val) => form.setFieldValue('prompt', val)}
          height={300}
          language="prompt"
          title="评估提示词"
          showThemeSwitch
        />
      </Form.Item>

      <Space size="large">
        <Form.Item
          name={['scoreRange', 'min']}
          label="最小分"
          initialValue={0}
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={0} max={100} style={{ width: 80 }} />
        </Form.Item>

        <Form.Item
          name={['scoreRange', 'max']}
          label="最大分"
          initialValue={10}
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={1} max={100} style={{ width: 80 }} />
        </Form.Item>

        <Form.Item
          name="passThreshold"
          label="通过阈值"
          initialValue={0.6}
          extra="归一化分数 >= 此值则通过"
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={0} max={1} step={0.1} style={{ width: 80 }} />
        </Form.Item>
      </Space>
    </>
  )
}
