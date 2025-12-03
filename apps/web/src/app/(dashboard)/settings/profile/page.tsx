'use client'

import { Card, Form, Input, Button, Avatar, Upload, message, Typography, Space } from 'antd'
import { UserOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useUserStore } from '@/stores/userStore'

const { Title } = Typography

export default function ProfilePage() {
  const user = useUserStore((state) => state.user)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleSave = async (values: { name: string }) => {
    setSaving(true)
    try {
      // TODO: 调用 API 更新个人信息
      console.log('Profile to save:', values)
      message.success('个人信息已更新')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        个人信息
      </Title>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: user?.name || '' }}
        onFinish={handleSave}
        style={{ maxWidth: 400 }}
      >
        <Form.Item label="头像">
          <Space direction="vertical" align="center">
            <Avatar
              size={80}
              src={user?.avatar}
              icon={<UserOutlined />}
            />
            <Upload
              showUploadList={false}
              beforeUpload={() => {
                message.info('头像上传功能开发中')
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>更换头像</Button>
            </Upload>
          </Space>
        </Form.Item>

        <Form.Item
          label="昵称"
          name="name"
          rules={[{ required: true, message: '请输入昵称' }]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item label="邮箱">
          <Input value={user?.email || ''} disabled />
        </Form.Item>

        <Form.Item label="角色">
          <Input value={user?.role === 'admin' ? '管理员' : '普通用户'} disabled />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
          >
            保存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
