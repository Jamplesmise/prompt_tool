'use client'

import { Modal, Form, Input, Switch, Button, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useUpdateProvider } from '@/hooks/useModels'
import type { ProviderWithModels } from '@/services/models'
import { useEffect } from 'react'

type EditProviderModalProps = {
  open: boolean
  provider: ProviderWithModels | null
  onClose: () => void
}

type FormValues = {
  name: string
  baseUrl: string
  apiKey?: string
  isActive: boolean
  headers?: { key: string; value: string }[]
}

export function EditProviderModal({ open, provider, onClose }: EditProviderModalProps) {
  const [form] = Form.useForm<FormValues>()
  const updateProvider = useUpdateProvider()

  useEffect(() => {
    if (provider && open) {
      form.setFieldsValue({
        name: provider.name,
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
        apiKey: '',
      })
    }
  }, [provider, open, form])

  const handleSubmit = async () => {
    if (!provider) return

    try {
      const values = await form.validateFields()
      const headers = values.headers?.reduce(
        (acc, { key, value }) => {
          if (key && value) acc[key] = value
          return acc
        },
        {} as Record<string, string>
      )

      await updateProvider.mutateAsync({
        id: provider.id,
        data: {
          name: values.name,
          baseUrl: values.baseUrl,
          apiKey: values.apiKey || undefined,
          isActive: values.isActive,
          headers,
        },
      })

      onClose()
    } catch {
      // 表单验证失败
    }
  }

  return (
    <Modal
      title="编辑提供商"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={updateProvider.isPending}
      destroyOnHidden
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如：OpenAI 官方" />
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

        <Form.Item name="apiKey" label="API Key" help={`当前: ${provider?.apiKeyMasked || '未设置'}，留空则不修改`}>
          <Input.Password placeholder="留空则不修改" />
        </Form.Item>

        <Form.Item name="isActive" label="启用状态" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item label="自定义请求头">
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
