'use client'

import { Card, Form, Input, Button, Switch, Select, message, Typography, Space, Divider } from 'antd'
import { SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { useState } from 'react'

const { Title, Text } = Typography

type GeneralSettings = {
  siteName: string
  defaultPageSize: number
  enableNotifications: boolean
  defaultTimezone: string
  language: string
}

const defaultSettings: GeneralSettings = {
  siteName: 'AI 测试平台',
  defaultPageSize: 20,
  enableNotifications: true,
  defaultTimezone: 'Asia/Shanghai',
  language: 'zh-CN',
}

export default function SettingsPage() {
  const [form] = Form.useForm<GeneralSettings>()
  const [saving, setSaving] = useState(false)

  const handleSave = async (values: GeneralSettings) => {
    setSaving(true)
    try {
      // TODO: 保存到后端
      console.log('Settings to save:', values)
      message.success('设置已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        通用设置
      </Title>

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={defaultSettings}
          onFinish={handleSave}
          style={{ maxWidth: 600 }}
        >
          <Divider orientation="left">基本设置</Divider>

          <Form.Item
            label="站点名称"
            name="siteName"
            rules={[{ required: true, message: '请输入站点名称' }]}
          >
            <Input placeholder="请输入站点名称" />
          </Form.Item>

          <Form.Item
            label="默认分页大小"
            name="defaultPageSize"
            rules={[{ required: true, message: '请选择分页大小' }]}
          >
            <Select
              options={[
                { label: '10 条/页', value: 10 },
                { label: '20 条/页', value: 20 },
                { label: '50 条/页', value: 50 },
                { label: '100 条/页', value: 100 },
              ]}
            />
          </Form.Item>

          <Divider orientation="left">区域与语言</Divider>

          <Form.Item
            label="默认时区"
            name="defaultTimezone"
            rules={[{ required: true, message: '请选择时区' }]}
          >
            <Select
              options={[
                { label: '亚洲/上海 (UTC+8)', value: 'Asia/Shanghai' },
                { label: '亚洲/东京 (UTC+9)', value: 'Asia/Tokyo' },
                { label: '美国/纽约 (UTC-5)', value: 'America/New_York' },
                { label: '欧洲/伦敦 (UTC+0)', value: 'Europe/London' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="界面语言"
            name="language"
            rules={[{ required: true, message: '请选择语言' }]}
          >
            <Select
              options={[
                { label: '简体中文', value: 'zh-CN' },
                { label: 'English', value: 'en-US' },
              ]}
            />
          </Form.Item>

          <Divider orientation="left">通知设置</Divider>

          <Form.Item
            label="启用通知"
            name="enableNotifications"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                保存设置
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Divider />

        <Space direction="vertical">
          <Text type="secondary">
            提示：部分设置可能需要刷新页面后生效
          </Text>
        </Space>
      </Card>
    </div>
  )
}
