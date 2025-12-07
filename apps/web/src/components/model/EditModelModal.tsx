'use client'

import { useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Divider, Typography, Select, Switch } from 'antd'
import { useUpdateModel } from '@/hooks/useModels'
import type { ModelPricing } from '@/services/models'

const { Text } = Typography

type EditModelModalProps = {
  open: boolean
  model: {
    id: string
    name: string
    modelId: string
    isActive: boolean
    config?: {
      temperature?: number
      maxTokens?: number
    }
    pricing?: ModelPricing
  } | null
  onClose: () => void
}

type FormValues = {
  name: string
  modelId: string
  isActive: boolean
  temperature?: number
  maxTokens?: number
  currency?: 'USD' | 'CNY'
  inputPerMillion?: number
  outputPerMillion?: number
}

export function EditModelModal({ open, model, onClose }: EditModelModalProps) {
  const [form] = Form.useForm<FormValues>()
  const updateModel = useUpdateModel()

  useEffect(() => {
    if (model && open) {
      form.setFieldsValue({
        name: model.name,
        modelId: model.modelId,
        isActive: model.isActive,
        temperature: model.config?.temperature,
        maxTokens: model.config?.maxTokens,
        currency: model.pricing?.currency || 'USD',
        inputPerMillion: model.pricing?.inputPerMillion,
        outputPerMillion: model.pricing?.outputPerMillion,
      })
    }
  }, [model, open, form])

  const handleSubmit = async () => {
    if (!model) return
    try {
      const values = await form.validateFields()

      await updateModel.mutateAsync({
        id: model.id,
        data: {
          name: values.name,
          modelId: values.modelId,
          isActive: values.isActive,
          config: {
            temperature: values.temperature,
            maxTokens: values.maxTokens,
          },
          pricing: {
            inputPerMillion: values.inputPerMillion,
            outputPerMillion: values.outputPerMillion,
            currency: values.currency || 'USD',
          },
        },
      })

      onClose()
    } catch {
      // 表单验证失败
    }
  }

  const currencySymbol = Form.useWatch('currency', form) === 'CNY' ? '¥' : '$'

  return (
    <Modal
      title="编辑模型"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={updateModel.isPending}
      destroyOnHidden
      width={480}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
          <Input placeholder="如：GPT-4o" />
        </Form.Item>

        <Form.Item name="modelId" label="模型 ID" rules={[{ required: true, message: '请输入模型 ID' }]}>
          <Input placeholder="如：gpt-4o" />
        </Form.Item>

        <Form.Item name="isActive" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        <Form.Item name="temperature" label="默认 Temperature">
          <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} placeholder="0.7" />
        </Form.Item>

        <Form.Item name="maxTokens" label="默认 Max Tokens">
          <InputNumber min={1} max={128000} style={{ width: '100%' }} placeholder="4096" />
        </Form.Item>

        <Divider orientation="left" plain>
          <Text type="secondary" style={{ fontSize: 12 }}>费率配置（可选）</Text>
        </Divider>

        <Form.Item name="currency" label="计价货币">
          <Select
            options={[
              { value: 'USD', label: '美元 (USD)' },
              { value: 'CNY', label: '人民币 (CNY)' },
            ]}
            style={{ width: 150 }}
          />
        </Form.Item>

        <Form.Item
          name="inputPerMillion"
          label="输入价格"
          tooltip="每 100 万 tokens 的价格"
        >
          <InputNumber
            min={0}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            placeholder="如：5.00"
            addonAfter={`${currencySymbol} / 1M tokens`}
          />
        </Form.Item>

        <Form.Item
          name="outputPerMillion"
          label="输出价格"
          tooltip="每 100 万 tokens 的价格"
        >
          <InputNumber
            min={0}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            placeholder="如：15.00"
            addonAfter={`${currencySymbol} / 1M tokens`}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
