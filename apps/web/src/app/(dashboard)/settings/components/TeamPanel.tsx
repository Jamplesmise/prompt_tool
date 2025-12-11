'use client'

import { useState } from 'react'
import {
  Form,
  Input,
  Space,
  Avatar,
  Button,
  Popconfirm,
  Table,
  Modal,
  Select,
  Tag,
  Alert,
  message,
  Typography,
} from 'antd'
import { UserOutlined, SaveOutlined, PlusOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import type { TeamRole, TeamMemberWithUser } from '@platform/shared'
import { useTeamStore } from '@/stores/teamStore'
import {
  useUpdateTeam,
  useDeleteTeam,
  useTransferTeam,
  useTeamMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  usePermission,
} from '@/hooks/useTeams'
import dayjs from 'dayjs'
import styles from '../settings.module.css'

const { Text } = Typography

const teamRoleOptions = [
  { label: '管理员', value: 'ADMIN' },
  { label: '成员', value: 'MEMBER' },
  { label: '查看者', value: 'VIEWER' },
]

const teamRoleColors: Record<TeamRole, string> = {
  OWNER: 'gold',
  ADMIN: 'blue',
  MEMBER: 'green',
  VIEWER: 'default',
}

const teamRoleLabels: Record<TeamRole, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  MEMBER: '成员',
  VIEWER: '查看者',
}

export function TeamPanel() {
  const router = useRouter()
  const { currentTeam } = useTeamStore()
  const { canManageMembers } = usePermission()
  const isTeamOwner = currentTeam?.role === 'OWNER'
  const isTeamAdmin = currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN'

  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  const transferTeam = useTransferTeam()
  const inviteMember = useInviteMember()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  const [teamForm] = Form.useForm()
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferUserId, setTransferUserId] = useState<string>('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteForm] = Form.useForm()
  const [memberPage, setMemberPage] = useState(1)

  const { data: membersData, isLoading: membersLoading } = useTeamMembers(currentTeam?.id || '', {
    page: memberPage,
    pageSize: 10,
  })

  const transferableMembers = membersData?.list.filter((m) => m.userId !== currentTeam?.ownerId) || []

  const handleUpdateTeam = async (values: { name: string; description?: string }) => {
    if (!currentTeam) return
    try {
      await updateTeam.mutateAsync({ id: currentTeam.id, data: values })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新团队失败')
    }
  }

  const handleDeleteTeam = async () => {
    if (!currentTeam) return
    try {
      await deleteTeam.mutateAsync(currentTeam.id)
      router.push('/')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除团队失败')
    }
  }

  const handleTransferOwnership = async () => {
    if (!currentTeam || !transferUserId) {
      message.error('请选择新的所有者')
      return
    }
    try {
      await transferTeam.mutateAsync({ id: currentTeam.id, newOwnerId: transferUserId })
      setTransferModalOpen(false)
      setTransferUserId('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '转让所有权失败')
    }
  }

  const handleInvite = async (values: { email: string; role: TeamRole }) => {
    if (!currentTeam) return
    try {
      await inviteMember.mutateAsync({ teamId: currentTeam.id, data: values })
      setInviteModalOpen(false)
      inviteForm.resetFields()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '邀请成员失败')
    }
  }

  const memberColumns: ColumnsType<TeamMemberWithUser> = [
    {
      title: '成员',
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar src={r.user.avatar} icon={<UserOutlined />} size="small" />
          <span>{r.user.name}</span>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: TeamRole, r) =>
        canManageMembers && role !== 'OWNER' ? (
          <Select
            value={role}
            options={teamRoleOptions}
            style={{ width: 90 }}
            size="small"
            onChange={(v) => updateRole.mutate({ teamId: currentTeam!.id, userId: r.userId, role: v })}
          />
        ) : (
          <Tag color={teamRoleColors[role]}>{teamRoleLabels[role]}</Tag>
        ),
    },
    {
      title: '加入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (d: Date | string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_, r) =>
        canManageMembers && r.role !== 'OWNER' ? (
          <Popconfirm
            title="确定移除？"
            onConfirm={() => removeMember.mutate({ teamId: currentTeam!.id, userId: r.userId })}
          >
            <Button type="link" danger size="small">
              移除
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  if (!currentTeam) {
    return (
      <div className={styles.panelContent}>
        <Text type="secondary">请先选择一个团队</Text>
      </div>
    )
  }

  return (
    <>
      <div className={styles.panelContent}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>基本信息</div>
          <Form
            form={teamForm}
            layout="vertical"
            initialValues={{ name: currentTeam.name, description: currentTeam.description || '' }}
            onFinish={handleUpdateTeam}
            className={styles.compactForm}
          >
            <Form.Item label="团队名称" name="name" rules={[{ required: true, message: '请输入团队名称' }]}>
              <Input placeholder="请输入团队名称" disabled={!isTeamAdmin} />
            </Form.Item>
            <Form.Item label="团队描述" name="description">
              <Input.TextArea placeholder="请输入团队描述" rows={2} disabled={!isTeamAdmin} />
            </Form.Item>
            {isTeamAdmin && (
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateTeam.isPending}>
                  保存
                </Button>
              </Form.Item>
            )}
          </Form>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>成员管理</span>
            {canManageMembers && (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setInviteModalOpen(true)}>
                邀请
              </Button>
            )}
          </div>
          <Table<TeamMemberWithUser>
            columns={memberColumns}
            dataSource={membersData?.list}
            rowKey="id"
            loading={membersLoading}
            size="small"
            pagination={{
              current: memberPage,
              pageSize: 10,
              total: membersData?.total,
              onChange: setMemberPage,
              showSizeChanger: false,
            }}
          />
        </div>

        {isTeamOwner && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>危险操作</div>
            <Space>
              <Button
                icon={<SwapOutlined />}
                onClick={() => setTransferModalOpen(true)}
                disabled={transferableMembers.length === 0}
              >
                转让所有权
              </Button>
              <Popconfirm
                title="确定删除此团队？"
                description="所有数据将被永久删除！"
                onConfirm={handleDeleteTeam}
                okText="确认删除"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />} loading={deleteTeam.isPending}>
                  删除团队
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}
      </div>

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
      >
        <Alert message="转让后您将成为管理员" type="warning" showIcon style={{ marginBottom: 16 }} />
        <Select
          placeholder="选择新所有者"
          style={{ width: '100%' }}
          value={transferUserId || undefined}
          onChange={setTransferUserId}
          options={transferableMembers.map((m) => ({
            value: m.userId,
            label: `${m.user.name} (${m.user.email})`,
          }))}
        />
      </Modal>

      {/* 邀请成员 Modal */}
      <Modal
        title="邀请成员"
        open={inviteModalOpen}
        onCancel={() => setInviteModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input placeholder="请输入成员邮箱" />
          </Form.Item>
          <Form.Item label="角色" name="role" initialValue="MEMBER" rules={[{ required: true }]}>
            <Select options={teamRoleOptions} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setInviteModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={inviteMember.isPending}>
                邀请
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
