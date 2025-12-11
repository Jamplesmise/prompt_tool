'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, Typography, Spin } from 'antd'
import { appMessage } from '@/lib/message'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth, useRedirectIfAuth } from '@/hooks/useAuth'
import { t } from '@/lib/i18n'

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
        appMessage.error(result.message || t('common.failed'))
      }
    } catch {
      appMessage.error(t('error.network'))
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
        <Text type="secondary">{t('auth.login')}以继续</Text>
      </div>

      <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: t('validation.required', { field: t('auth.email') }) },
            { type: 'email', message: t('validation.email') },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder={t('auth.email')} />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: t('validation.required', { field: t('auth.password') }) },
            { min: 6, message: t('validation.password') },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t('auth.login')}
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
