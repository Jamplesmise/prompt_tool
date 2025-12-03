'use client'

import { Modal, Form, Input, Select, Switch, message, Space, Typography, Alert } from 'antd'
import { MailOutlined, ApiOutlined, MessageOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { NotifyChannelType } from '@platform/shared'

const { Text } = Typography
const { TextArea } = Input

type CreateChannelModalProps = {
  open: boolean
  onClose: () => void
}

type FormValues = {
  name: string
  type: NotifyChannelType
  isActive: boolean
  // EMAIL config
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  fromAddress?: string
  recipients?: string
  // WEBHOOK config
  webhookUrl?: string
  webhookHeaders?: string
}

const API_BASE = '/api/v1'

export default function CreateChannelModal({ open, onClose }: CreateChannelModalProps) {
  const [form] = Form.useForm<FormValues>()
  const queryClient = useQueryClient()
  const channelType = Form.useWatch('type', form)

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let config: Record<string, unknown> = {}

      if (values.type === 'EMAIL') {
        config = {
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort || 587,
          smtpUser: values.smtpUser,
          smtpPass: values.smtpPass,
          fromAddress: values.fromAddress,
          recipients: values.recipients?.split('\n').map((r) => r.trim()).filter(Boolean) || [],
        }
      } else if (values.type === 'WEBHOOK') {
        config = {
          url: values.webhookUrl,
          headers: values.webhookHeaders ? JSON.parse(values.webhookHeaders) : {},
        }
      }

      const response = await fetch(`${API_BASE}/notify-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          config,
          isActive: values.isActive,
        }),
      })

      const result = await response.json()
      if (result.code !== 200) {
        throw new Error(result.message)
      }
      return result.data
    },
    onSuccess: () => {
      message.success('渠道创建成功')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
      form.resetFields()
      onClose()
    },
    onError: (error: Error) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      createMutation.mutate(values)
    } catch {
      // validation error
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="添加通知渠道"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending}
      width={600}
      okText="创建"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: 'EMAIL', isActive: true }}
      >
        <Form.Item
          label="渠道名称"
          name="name"
          rules={[{ required: true, message: '请输入渠道名称' }]}
        >
          <Input placeholder="如：生产环境告警邮件" />
        </Form.Item>

        <Form.Item
          label="渠道类型"
          name="type"
          rules={[{ required: true, message: '请选择渠道类型' }]}
        >
          <Select
            options={[
              { label: <Space><MailOutlined /> 邮件</Space>, value: 'EMAIL' },
              { label: <Space><ApiOutlined /> Webhook</Space>, value: 'WEBHOOK' },
              { label: <Space><MessageOutlined /> 站内消息</Space>, value: 'INTERNAL' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="启用状态"
          name="isActive"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        {/* EMAIL 配置 */}
        {channelType === 'EMAIL' && (
          <>
            <Alert
              message="邮件配置"
              description="配置 SMTP 服务器信息用于发送告警邮件"
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              label="SMTP 服务器"
              name="smtpHost"
              rules={[{ required: true, message: '请输入 SMTP 服务器地址' }]}
            >
              <Input placeholder="如：smtp.example.com" />
            </Form.Item>
            <Form.Item
              label="SMTP 端口"
              name="smtpPort"
              rules={[{ required: true, message: '请输入端口号' }]}
            >
              <Input type="number" placeholder="587" />
            </Form.Item>
            <Form.Item
              label="SMTP 用户名"
              name="smtpUser"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="用于登录 SMTP 服务器" />
            </Form.Item>
            <Form.Item
              label="SMTP 密码"
              name="smtpPass"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="SMTP 密码或授权码" />
            </Form.Item>
            <Form.Item
              label="发件人地址"
              name="fromAddress"
              rules={[
                { required: true, message: '请输入发件人地址' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input placeholder="如：alert@example.com" />
            </Form.Item>
            <Form.Item
              label="收件人列表"
              name="recipients"
              rules={[{ required: true, message: '请输入收件人' }]}
              extra="每行一个邮箱地址"
            >
              <TextArea rows={3} placeholder="admin@example.com&#10;ops@example.com" />
            </Form.Item>
          </>
        )}

        {/* WEBHOOK 配置 */}
        {channelType === 'WEBHOOK' && (
          <>
            <Alert
              message="Webhook 配置"
              description="配置 Webhook URL 用于接收告警通知"
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              label="Webhook URL"
              name="webhookUrl"
              rules={[
                { required: true, message: '请输入 Webhook URL' },
                { type: 'url', message: '请输入有效的 URL' },
              ]}
            >
              <Input placeholder="https://example.com/webhook" />
            </Form.Item>
            <Form.Item
              label="请求头 (JSON)"
              name="webhookHeaders"
              extra="可选，如：{&quot;Authorization&quot;: &quot;Bearer token&quot;}"
            >
              <TextArea rows={3} placeholder='{"Content-Type": "application/json"}' />
            </Form.Item>
          </>
        )}

        {/* INTERNAL 配置 */}
        {channelType === 'INTERNAL' && (
          <Alert
            message="站内消息"
            description="站内消息将发送到系统内置的消息中心，无需额外配置"
            type="info"
          />
        )}
      </Form>
    </Modal>
  )
}
