'use client'

import { Modal, Form, Input, Select, Button, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useCreateProvider } from '@/hooks/useModels'
import type { ProviderType } from '@/services/models'

type AddProviderModalProps = {
  open: boolean
  onClose: () => void
}

type FormValues = {
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  headers?: { key: string; value: string }[]
}

const providerTypeOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Azure OpenAI', value: 'azure' },
  { label: '自定义', value: 'custom' },
]

const defaultBaseUrls: Record<ProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  azure: '',
  custom: '',
}

export function AddProviderModal({ open, onClose }: AddProviderModalProps) {
  const [form] = Form.useForm<FormValues>()
  const createProvider = useCreateProvider()

  const handleTypeChange = (type: ProviderType) => {
    form.setFieldValue('baseUrl', defaultBaseUrls[type])
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const headers = values.headers?.reduce(
        (acc, { key, value }) => {
          if (key && value) acc[key] = value
          return acc
        },
        {} as Record<string, string>
      )

      await createProvider.mutateAsync({
        name: values.name,
        type: values.type,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
        headers,
      })

      form.resetFields()
      onClose()
    } catch {
      // 表单验证失败
    }
  }

  return (
    <Modal
      title="添加提供商"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={createProvider.isPending}
      destroyOnHidden
      width={500}
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'openai', baseUrl: defaultBaseUrls.openai }}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如：OpenAI 官方" />
        </Form.Item>

        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
          <Select options={providerTypeOptions} onChange={handleTypeChange} />
        </Form.Item>

        <Form.Item
          name="baseUrl"
          label="Base URL"
          rules={[
            { required: true, message: '请输入 Base URL' },
            { type: 'url', message: '请输入有效的 URL' },
          ]}
        >
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>

        <Form.Item name="apiKey" label="API Key" rules={[{ required: true, message: '请输入 API Key' }]}>
          <Input.Password placeholder="sk-..." />
        </Form.Item>

        <Form.Item label="自定义请求头（可选）">
          <Form.List name="headers">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'key']} noStyle>
                      <Input placeholder="Header 名称" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} noStyle>
                      <Input placeholder="Header 值" style={{ width: 200 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加请求头
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Modal>
  )
}
