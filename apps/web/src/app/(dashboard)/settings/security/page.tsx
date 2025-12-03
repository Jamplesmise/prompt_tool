'use client'

import { Card, Form, Input, Button, message, Typography } from 'antd'
import { LockOutlined, SaveOutlined } from '@ant-design/icons'
import { useState } from 'react'

const { Title } = Typography

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function SecurityPage() {
  const [form] = Form.useForm<PasswordForm>()
  const [saving, setSaving] = useState(false)

  const handleSave = async (values: PasswordForm) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setSaving(true)
    try {
      // TODO: 调用 API 修改密码
      console.log('Password to change')
      message.success('密码已修改')
      form.resetFields()
    } catch {
      message.error('修改失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 24 }}>
        <LockOutlined style={{ marginRight: 8 }} />
        修改密码
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        style={{ maxWidth: 400 }}
      >
        <Form.Item
          label="当前密码"
          name="currentPassword"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password placeholder="请输入当前密码" />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少 6 个字符' },
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
          >
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
