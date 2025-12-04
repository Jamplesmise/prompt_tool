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
  message,
} from 'antd'
import {
  UserOutlined,
  SearchOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserStore } from '@/stores/userStore'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { listUsers, updateUser, deleteUser, resetUserPassword } from '@/services/users'

const { Title } = Typography

type UserWithCount = {
  id: string
  email: string
  name: string
  avatar: string | null
  role: string
  createdAt: string | Date
  updatedAt: string | Date
  teamCount: number
}

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' },
]

const roleColors: Record<string, string> = {
  admin: 'gold',
  user: 'blue',
}

const roleLabels: Record<string, string> = {
  admin: '管理员',
  user: '普通用户',
}

export default function UsersPage() {
  const user = useUserStore((state) => state.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    open: boolean
    userId: string
    userName: string
  }>({ open: false, userId: '', userName: '' })
  const [form] = Form.useForm()

  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: async () => {
      const res = await listUsers({ page, pageSize: 10, search, role: roleFilter })
      if (res.code !== 200) throw new Error(res.message)
      return res.data
    },
    enabled: isAdmin,
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await updateUser(id, { role })
      if (res.code !== 200) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('角色已更新')
    },
    onError: (err: Error) => {
      message.error(err.message || '更新失败')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteUser(id)
      if (res.code !== 200) throw new Error(res.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('用户已删除')
    },
    onError: (err: Error) => {
      message.error(err.message || '删除失败')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await resetUserPassword(id, password)
      if (res.code !== 200) throw new Error(res.message)
    },
    onSuccess: () => {
      setResetPasswordModal({ open: false, userId: '', userName: '' })
      form.resetFields()
      message.success('密码已重置')
    },
    onError: (err: Error) => {
      message.error(err.message || '重置失败')
    },
  })

  // 非管理员显示无权限提示
  if (!isAdmin) {
    return (
      <Card>
        <Typography.Text type="secondary">无权访问此页面</Typography.Text>
      </Card>
    )
  }

  const columns: ColumnsType<UserWithCount> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div>{record.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: string, record) =>
        record.id !== user?.id ? (
          <Select
            value={role}
            options={roleOptions}
            style={{ width: 120 }}
            onChange={(newRole) =>
              updateUserMutation.mutate({ id: record.id, role: newRole })
            }
            loading={updateUserMutation.isPending}
          />
        ) : (
          <Tag color={roleColors[role]}>{roleLabels[role]}</Tag>
        ),
    },
    {
      title: '团队数',
      dataIndex: 'teamCount',
      key: 'teamCount',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: Date | string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) =>
        record.id !== user?.id ? (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() =>
                setResetPasswordModal({
                  open: true,
                  userId: record.id,
                  userName: record.name,
                })
              }
            >
              重置密码
            </Button>
            <Popconfirm
              title="确定要删除此用户吗？"
              description="删除后不可恢复，用户的所有数据将被清除"
              onConfirm={() => deleteUserMutation.mutate(record.id)}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteUserMutation.isPending}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Tag>当前用户</Tag>
        ),
    },
  ]

  const handleResetPassword = (values: { password: string }) => {
    resetPasswordMutation.mutate({
      id: resetPasswordModal.userId,
      password: values.password,
    })
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          用户管理
        </Title>
        <Space>
          <Input
            placeholder="搜索用户名或邮箱"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="角色筛选"
            value={roleFilter || undefined}
            onChange={(v) => {
              setRoleFilter(v || '')
              setPage(1)
            }}
            options={[
              { label: '全部角色', value: '' },
              ...roleOptions,
            ]}
            style={{ width: 120 }}
            allowClear
          />
        </Space>
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
          showTotal: (total) => `共 ${total} 个用户`,
        }}
      />

      <Modal
        title={`重置密码 - ${resetPasswordModal.userName}`}
        open={resetPasswordModal.open}
        onCancel={() => {
          setResetPasswordModal({ open: false, userId: '', userName: '' })
          form.resetFields()
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setResetPasswordModal({ open: false, userId: '', userName: '' })
                  form.resetFields()
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resetPasswordMutation.isPending}
              >
                确认重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
