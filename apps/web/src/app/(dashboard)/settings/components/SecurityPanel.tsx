'use client'

import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import styles from '../settings.module.css'

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function SecurityPanel() {
  const [passwordForm] = Form.useForm<PasswordForm>()
  const [savingPassword, setSavingPassword] = useState(false)

  const handleChangePassword = async (values: PasswordForm) => {
    setSavingPassword(true)
    try {
      const response = await fetch('/api/v1/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error(result.message || '修改失败')
      }
      message.success('密码已修改')
      passwordForm.resetFields()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改失败')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className={styles.panelContent}>
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
        className={styles.compactForm}
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
          dependencies={['newPassword']}
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
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingPassword}>
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
