'use client'

import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Divider,
  Popconfirm,
  Modal,
  Select,
  message,
  Alert,
} from 'antd'
import {
  TeamOutlined,
  SaveOutlined,
  DeleteOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useTeamStore } from '@/stores/teamStore'
import { useUpdateTeam, useDeleteTeam, useTransferTeam, useTeamMembers } from '@/hooks/useTeams'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography

export default function TeamSettingsPage() {
  const router = useRouter()
  const { currentTeam } = useTeamStore()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  const transferTeam = useTransferTeam()
  const [form] = Form.useForm()
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferUserId, setTransferUserId] = useState<string>('')

  // 获取团队成员列表（用于转让所有权）
  const { data: membersData } = useTeamMembers(currentTeam?.id || '', { pageSize: 100 })

  if (!currentTeam) {
    return (
      <Card>
        <Text type="secondary">请先选择一个团队</Text>
      </Card>
    )
  }

  const isOwner = currentTeam.role === 'OWNER'
  const isAdmin = currentTeam.role === 'OWNER' || currentTeam.role === 'ADMIN'

  const handleUpdateTeam = async (values: { name: string; description?: string }) => {
    try {
      await updateTeam.mutateAsync({ id: currentTeam.id, data: values })
    } catch {
      // error handled in hook
    }
  }

  const handleDeleteTeam = async () => {
    try {
      await deleteTeam.mutateAsync(currentTeam.id)
      router.push('/')
    } catch {
      // error handled in hook
    }
  }

  const handleTransferOwnership = async () => {
    if (!transferUserId) {
      message.error('请选择新的所有者')
      return
    }
    try {
      await transferTeam.mutateAsync({ id: currentTeam.id, newOwnerId: transferUserId })
      setTransferModalOpen(false)
      setTransferUserId('')
    } catch {
      // error handled in hook
    }
  }

  // 过滤掉当前用户，只显示其他成员
  const transferableMembers = membersData?.list.filter(
    (m) => m.userId !== currentTeam.ownerId
  ) || []

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        团队设置
      </Title>

      {/* 团队基本信息 */}
      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: currentTeam.name,
            description: currentTeam.description || '',
          }}
          onFinish={handleUpdateTeam}
          style={{ maxWidth: 500 }}
        >
          <Form.Item
            label="团队名称"
            name="name"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="请输入团队名称" disabled={!isAdmin} />
          </Form.Item>

          <Form.Item label="团队描述" name="description">
            <Input.TextArea
              placeholder="请输入团队描述（可选）"
              rows={3}
              disabled={!isAdmin}
            />
          </Form.Item>

          {isAdmin && (
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={updateTeam.isPending}
              >
                保存修改
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>

      {/* 所有权转让 - 仅所有者可见 */}
      {isOwner && (
        <Card title="所有权转让" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              将团队所有权转让给其他成员。转让后，您将成为普通管理员。
            </Text>
            <Button
              icon={<SwapOutlined />}
              onClick={() => setTransferModalOpen(true)}
              disabled={transferableMembers.length === 0}
            >
              转让所有权
            </Button>
            {transferableMembers.length === 0 && (
              <Text type="secondary">
                团队中没有其他成员，无法转让所有权
              </Text>
            )}
          </Space>
        </Card>
      )}

      {/* 危险操作区 - 仅所有者可见 */}
      {isOwner && (
        <Card title="危险操作">
          <Alert
            message="删除团队后，所有关联的数据（提示词、数据集、任务等）都将被永久删除，此操作不可恢复。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Popconfirm
            title="确定要删除此团队吗？"
            description="删除后所有数据将被永久删除，此操作不可恢复！"
            onConfirm={handleDeleteTeam}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deleteTeam.isPending}
            >
              删除团队
            </Button>
          </Popconfirm>
        </Card>
      )}

      {/* 转让所有权 Modal */}
      <Modal
        title="转让团队所有权"
        open={transferModalOpen}
        onCancel={() => {
          setTransferModalOpen(false)
          setTransferUserId('')
        }}
        onOk={handleTransferOwnership}
        confirmLoading={transferTeam.isPending}
        okText="确认转让"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="转让所有权后，您将成为管理员，新所有者将拥有团队的完全控制权。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Text>选择新的所有者：</Text>
          <Select
            placeholder="请选择成员"
            style={{ width: '100%' }}
            value={transferUserId || undefined}
            onChange={setTransferUserId}
            options={transferableMembers.map((m) => ({
              value: m.userId,
              label: `${m.user.name} (${m.user.email})`,
            }))}
          />
        </Space>
      </Modal>
    </div>
  )
}
