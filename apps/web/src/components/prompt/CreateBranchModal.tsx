'use client'

import { useState } from 'react'
import { Modal, Form, Input, Select, Space, Typography } from 'antd'
import { GitBranch } from 'lucide-react'
import { useCreateBranch, usePromptVersions } from '@/hooks/usePrompts'

const { Text } = Typography
const { TextArea } = Input

type CreateBranchModalProps = {
  promptId: string
  open: boolean
  onClose: () => void
  defaultSourceVersionId?: string
}

export function CreateBranchModal({
  promptId,
  open,
  onClose,
  defaultSourceVersionId,
}: CreateBranchModalProps) {
  const [form] = Form.useForm()
  const createBranch = useCreateBranch()
  const { data: versions } = usePromptVersions(promptId)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await createBranch.mutateAsync({
        promptId,
        data: values,
      })
      form.resetFields()
      onClose()
    } catch (error) {
      // 表单验证失败或请求失败
    }
  }

  return (
    <Modal
      title={
        <Space>
          <GitBranch size={18} />
          创建分支
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={createBranch.isPending}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          sourceVersionId: defaultSourceVersionId,
        }}
      >
        <Form.Item
          name="name"
          label="分支名称"
          rules={[
            { required: true, message: '请输入分支名称' },
            {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message: '只能包含字母、数字、下划线和连字符',
            },
          ]}
        >
          <Input placeholder="例如: experiment-v2, feature-streaming" />
        </Form.Item>

        <Form.Item
          name="sourceVersionId"
          label="基于版本"
          rules={[{ required: true, message: '请选择源版本' }]}
        >
          <Select placeholder="选择要基于的版本">
            {versions?.map((version) => (
              <Select.Option key={version.id} value={version.id}>
                <Space>
                  <Text>v{version.version}</Text>
                  <Text type="secondary">{version.changeLog || '无描述'}</Text>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="分支用途说明（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
