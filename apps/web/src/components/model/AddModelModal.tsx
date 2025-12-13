'use client'

import { Modal, Form, Input, InputNumber, Divider, Typography, Select, Space } from 'antd'
import { useAddModel } from '@/hooks/useModels'

const { Text } = Typography

type AddModelModalProps = {
  open: boolean
  providerId: string
  onClose: () => void
}

type FormValues = {
  name: string
  modelId: string
  temperature?: number
  maxInputTokens?: number
  maxOutputTokens?: number
  currency?: 'USD' | 'CNY'
  inputPerMillion?: number
  outputPerMillion?: number
}

export function AddModelModal({ open, providerId, onClose }: AddModelModalProps) {
  const [form] = Form.useForm<FormValues>()
  const addModel = useAddModel()

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      await addModel.mutateAsync({
        providerId,
        data: {
          name: values.name,
          modelId: values.modelId,
          config: {
            temperature: values.temperature,
            maxInputTokens: values.maxInputTokens,
            maxOutputTokens: values.maxOutputTokens,
          },
          pricing: {
            inputPerMillion: values.inputPerMillion,
            outputPerMillion: values.outputPerMillion,
            currency: values.currency || 'USD',
          },
        },
      })

      form.resetFields()
      onClose()
    } catch {
      // 表单验证失败
    }
  }

  const currencySymbol = Form.useWatch('currency', form) === 'CNY' ? '¥' : '$'

  return (
    <Modal
      title="添加模型"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={addModel.isPending}
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

        <Form.Item name="temperature" label="默认 Temperature">
          <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} placeholder="0.7" />
        </Form.Item>

        <Form.Item name="maxInputTokens" label="最大输入上下文" tooltip="模型支持的最大输入 token 数">
          <InputNumber min={1} max={2000000} style={{ width: '100%' }} placeholder="如：128000" />
        </Form.Item>

        <Form.Item name="maxOutputTokens" label="最大输出 Tokens" tooltip="模型单次回复的最大 token 数">
          <InputNumber min={1} max={128000} style={{ width: '100%' }} placeholder="如：4096" />
        </Form.Item>

        <Divider orientation="left" plain>
          <Text type="secondary" style={{ fontSize: 12 }}>费率配置（可选）</Text>
        </Divider>

        <Form.Item name="currency" label="计价货币" initialValue="USD">
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
