'use client'

import { Modal, Form, Input, Space } from 'antd'
import { Save } from 'lucide-react'
import { useCreateDatasetVersion } from '@/hooks/useDatasets'

type CreateVersionModalProps = {
  datasetId: string
  open: boolean
  onClose: () => void
}

export function CreateVersionModal({ datasetId, open, onClose }: CreateVersionModalProps) {
  const [form] = Form.useForm()
  const createMutation = useCreateDatasetVersion()

  const handleSubmit = async () => {
    const values = await form.validateFields()
    createMutation.mutate(
      {
        datasetId,
        data: { changeLog: values.changeLog },
      },
      {
        onSuccess: () => {
          form.resetFields()
          onClose()
        },
      }
    )
  }

  return (
    <Modal
      title={
        <Space>
          <Save size={18} />
          创建版本快照
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="创建"
      cancelText="取消"
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="changeLog"
          label="变更说明"
          rules={[{ max: 500, message: '变更说明最多 500 个字符' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="请输入本次快照的变更说明（可选）"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
