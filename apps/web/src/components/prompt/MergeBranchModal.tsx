'use client'

import { Modal, Form, Select, Input, Space, Typography, Alert } from 'antd'
import { GitMerge, GitBranch } from 'lucide-react'
import { useMergeBranch, useBranches } from '@/hooks/usePrompts'
import type { BranchListItem } from '@/services/prompts'

const { Text } = Typography
const { TextArea } = Input

type MergeBranchModalProps = {
  promptId: string
  sourceBranch: BranchListItem
  open: boolean
  onClose: () => void
}

export function MergeBranchModal({
  promptId,
  sourceBranch,
  open,
  onClose,
}: MergeBranchModalProps) {
  const [form] = Form.useForm()
  const mergeBranch = useMergeBranch()
  const { data: branches } = useBranches(promptId)

  // 过滤掉源分支和非活跃分支
  const targetBranches = branches?.filter(
    (b) => b.id !== sourceBranch.id && b.status === 'ACTIVE'
  )

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await mergeBranch.mutateAsync({
        promptId,
        branchId: sourceBranch.id,
        data: {
          targetBranchId: values.targetBranchId,
          changeLog: values.changeLog,
        },
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
          <GitMerge size={18} />
          合并分支
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={mergeBranch.isPending}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message={
          <span>
            将分支 <Text strong>{sourceBranch.name}</Text> (v{sourceBranch.currentVersion})
            的内容合并到目标分支
          </span>
        }
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="targetBranchId"
          label="目标分支"
          rules={[{ required: true, message: '请选择目标分支' }]}
        >
          <Select placeholder="选择要合并到的分支">
            {targetBranches?.map((branch) => (
              <Select.Option key={branch.id} value={branch.id}>
                <Space>
                  <GitBranch size={14} />
                  <Text>{branch.name}</Text>
                  <Text type="secondary">v{branch.currentVersion}</Text>
                  {branch.isDefault && (
                    <Text type="secondary">(默认)</Text>
                  )}
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="changeLog" label="合并说明">
          <TextArea
            rows={3}
            placeholder={`默认: 合并自分支 "${sourceBranch.name}"`}
          />
        </Form.Item>
      </Form>

      <Alert
        type="warning"
        showIcon
        message="合并后，源分支将被标记为「已合并」状态"
      />
    </Modal>
  )
}
