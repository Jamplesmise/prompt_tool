'use client'

import { Card, Form, Input, Button, Avatar, Upload, message, Typography, Space, Popconfirm } from 'antd'
import { UserOutlined, UploadOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useUserStore } from '@/stores/userStore'
import { uploadAvatar, deleteAvatar, updateProfile } from '@/services/users'
import type { UploadProps } from 'antd'

const { Title } = Typography

export default function ProfilePage() {
  const user = useUserStore((state) => state.user)
  const updateUserAvatar = useUserStore((state) => state.updateAvatar)
  const updateUserName = useUserStore((state) => state.updateName)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async (values: { name: string }) => {
    setSaving(true)
    try {
      const res = await updateProfile({ name: values.name })
      if (res.code === 200) {
        updateUserName(values.name)
        message.success('个人信息已更新')
      } else {
        message.error(res.message || '保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    // 验证文件类型
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    if (!isImage) {
      message.error('只支持 JPEG、PNG、GIF、WebP 格式')
      return false
    }

    // 验证文件大小
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error('文件大小不能超过 2MB')
      return false
    }

    setUploading(true)
    try {
      const res = await uploadAvatar(file)
      if (res.code === 200 && res.data) {
        updateUserAvatar(res.data.avatar)
        message.success('头像上传成功')
      } else {
        message.error(res.message || '上传失败')
      }
    } catch {
      message.error('上传失败')
    } finally {
      setUploading(false)
    }

    return false // 阻止默认上传行为
  }

  const handleDeleteAvatar = async () => {
    setDeleting(true)
    try {
      const res = await deleteAvatar()
      if (res.code === 200) {
        updateUserAvatar(null)
        message.success('头像已删除')
      } else {
        message.error(res.message || '删除失败')
      }
    } catch {
      message.error('删除失败')
    } finally {
      setDeleting(false)
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
            <Space>
              <Upload
                showUploadList={false}
                beforeUpload={handleUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  更换头像
                </Button>
              </Upload>
              {user?.avatar && (
                <Popconfirm
                  title="确定要删除头像吗？"
                  onConfirm={handleDeleteAvatar}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    icon={<DeleteOutlined />}
                    loading={deleting}
                    danger
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Space>
        </Form.Item>

        <Form.Item
          label="昵称"
          name="name"
          rules={[
            { required: true, message: '请输入昵称' },
            { max: 50, message: '昵称不能超过50个字符' },
          ]}
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
