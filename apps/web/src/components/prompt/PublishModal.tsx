'use client'

import { Modal, Form, Input } from 'antd'

const { TextArea } = Input

type PublishModalProps = {
  open: boolean
  loading?: boolean
  onOk: (changeLog: string) => void
  onCancel: () => void
}

export function PublishModal({
  open,
  loading = false,
  onOk,
  onCancel,
}: PublishModalProps) {
  const [form] = Form.useForm()

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onOk(values.changeLog || '')
      form.resetFields()
    } catch {
      // 验证失败
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="发布新版本"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="发布"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="changeLog"
          label="变更说明"
          rules={[{ max: 500, message: '变更说明不能超过 500 字' }]}
        >
          <TextArea
            placeholder="请输入本次版本的变更说明（可选）"
            rows={4}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
