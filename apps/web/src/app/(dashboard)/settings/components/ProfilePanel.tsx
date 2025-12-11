'use client'

import { useState } from 'react'
import { Form, Input, Space, Avatar, Upload, Popconfirm, Button, message } from 'antd'
import { UserOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd/es/upload'
import { SaveButton } from '@/components/settings'
import { useSettingsForm } from '@/hooks/useSettingsForm'
import { useUserStore } from '@/stores/userStore'
import { uploadAvatar, deleteAvatar, updateProfile } from '@/services/users'
import styles from '../settings.module.css'

export function ProfilePanel() {
  const user = useUserStore((state) => state.user)
  const updateUserAvatar = useUserStore((state) => state.updateAvatar)
  const updateUserName = useUserStore((state) => state.updateName)

  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    values: profileValues,
    setFieldValue: setProfileField,
    isDirty: profileDirty,
    saveState: profileSaveState,
    save: saveProfile,
    reset: resetProfile,
  } = useSettingsForm({
    initialValues: { name: user?.name || '' },
    onSave: async (formValues) => {
      const res = await updateProfile({ name: formValues.name })
      if (res.code === 200) {
        updateUserName(formValues.name)
        message.success('个人信息已更新')
      } else {
        throw new Error(res.message || '保存失败')
      }
    },
  })

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    if (!isImage) {
      message.error('只支持 JPEG、PNG、GIF、WebP 格式')
      return false
    }
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
    return false
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
    <div className={styles.panelContent}>
      <div className={styles.profileSection}>
        <div className={styles.avatarSection}>
          <Avatar size={72} src={user?.avatar} icon={<UserOutlined />} />
          <Space style={{ marginTop: 8 }}>
            <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*">
              <Button icon={<UploadOutlined />} loading={uploading} size="small">
                更换
              </Button>
            </Upload>
            {user?.avatar && (
              <Popconfirm title="确定删除头像？" onConfirm={handleDeleteAvatar}>
                <Button icon={<DeleteOutlined />} loading={deleting} size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
        <div className={styles.infoSection}>
          <Form layout="vertical" className={styles.compactForm}>
            <Form.Item label="昵称">
              <Input
                value={profileValues.name}
                onChange={(e) => setProfileField('name', e.target.value)}
                placeholder="请输入昵称"
              />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input value={user?.email || ''} disabled />
            </Form.Item>
          </Form>
          <Space>
            <Button onClick={resetProfile} disabled={!profileDirty} size="small">
              重置
            </Button>
            <SaveButton state={profileSaveState} onClick={saveProfile} disabled={!profileDirty} />
          </Space>
        </div>
      </div>
    </div>
  )
}
