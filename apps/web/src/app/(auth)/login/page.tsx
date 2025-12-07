'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, Typography, Spin } from 'antd'
import { appMessage } from '@/lib/message'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth, useRedirectIfAuth } from '@/hooks/useAuth'

const { Title, Text } = Typography

type LoginFormValues = {
  email: string
  password: string
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login, isLoading: authLoading } = useAuth()
  const { isLoading: redirectLoading } = useRedirectIfAuth()

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      const result = await login(values.email, values.password)
      if (!result.success) {
        appMessage.error(result.message || '登录失败')
      }
    } catch {
      appMessage.error('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 认证检查中显示加载状态
  if (authLoading || redirectLoading) {
    return (
      <div className="flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Card className="shadow-lg">
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2">
          AI 模型测试平台
        </Title>
        <Text type="secondary">登录以继续</Text>
      </div>

      <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="邮箱" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6位' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center">
        <Text type="secondary" className="text-xs">
          默认账号: admin@example.com / admin123
        </Text>
      </div>
    </Card>
  )
}
