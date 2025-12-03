'use client'

import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Avatar,
  Tag,
  Space,
  Typography,
  Popconfirm,
} from 'antd'
import { TeamOutlined, PlusOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons'
import { useProjectStore } from '@/stores/projectStore'
import {
  useProjectMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  usePermission,
} from '@/hooks/useProjects'
import type { ColumnsType } from 'antd/es/table'
import type { ProjectRole, ProjectMemberWithUser } from '@platform/shared'
import dayjs from 'dayjs'

const { Title } = Typography

const roleOptions = [
  { label: '管理员', value: 'ADMIN' },
  { label: '成员', value: 'MEMBER' },
  { label: '查看者', value: 'VIEWER' },
]

const roleColors: Record<ProjectRole, string> = {
  OWNER: 'gold',
  ADMIN: 'blue',
  MEMBER: 'green',
  VIEWER: 'default',
}

const roleLabels: Record<ProjectRole, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  MEMBER: '成员',
  VIEWER: '查看者',
}

export default function MembersPage() {
  const { currentProject } = useProjectStore()
  const { canManageMembers, isOwner } = usePermission()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useProjectMembers(currentProject?.id || '', {
    page,
    pageSize: 10,
  })
  const inviteMember = useInviteMember()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [form] = Form.useForm()

  if (!currentProject) {
    return (
      <Card>
        <Typography.Text type="secondary">请先选择一个项目</Typography.Text>
      </Card>
    )
  }

  const columns: ColumnsType<ProjectMemberWithUser> = [
    {
      title: '成员',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.user.avatar} icon={<UserOutlined />} />
          <div>
            <div>{record.user.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.user.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: ProjectRole, record) =>
        canManageMembers && role !== 'OWNER' ? (
          <Select
            value={role}
            options={roleOptions}
            style={{ width: 100 }}
            onChange={(newRole) =>
              updateRole.mutate({
                projectId: currentProject.id,
                userId: record.userId,
                role: newRole,
              })
            }
            loading={updateRole.isPending}
          />
        ) : (
          <Tag color={roleColors[role]}>{roleLabels[role]}</Tag>
        ),
    },
    {
      title: '邀请人',
      key: 'invitedBy',
      render: (_, record) =>
        record.invitedBy ? record.invitedBy.name : record.role === 'OWNER' ? '创建者' : '-',
    },
    {
      title: '加入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date | string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) =>
        canManageMembers && record.role !== 'OWNER' ? (
          <Popconfirm
            title="确定要移除此成员吗？"
            onConfirm={() =>
              removeMember.mutate({
                projectId: currentProject.id,
                userId: record.userId,
              })
            }
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  const handleInvite = async (values: { email: string; role: ProjectRole }) => {
    try {
      await inviteMember.mutateAsync({
        projectId: currentProject.id,
        data: values,
      })
      setInviteModalOpen(false)
      form.resetFields()
    } catch {
      // error handled in hook
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          项目成员 - {currentProject.name}
        </Title>
        {canManageMembers && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setInviteModalOpen(true)}
          >
            邀请成员
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={data?.list}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 10,
          total: data?.total,
          onChange: setPage,
        }}
      />

      <Modal
        title="邀请成员"
        open={inviteModalOpen}
        onCancel={() => setInviteModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleInvite}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入成员邮箱" />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            initialValue="MEMBER"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setInviteModalOpen(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={inviteMember.isPending}
              >
                邀请
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
