'use client'

import { useState } from 'react'
import { Table, Space, Avatar, Button, Popconfirm, Select, Tag, Input, Modal, Form, message } from 'antd'
import { UserOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import { useUserStore } from '@/stores/userStore'
import { listUsers, updateUser, deleteUser, resetUserPassword } from '@/services/users'
import type { UserListItem } from '@/services/users'
import styles from '../settings.module.css'

const userRoleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' },
]

const userRoleColors: Record<string, string> = { admin: 'gold', user: 'blue' }
const userRoleLabels: Record<string, string> = { admin: '管理员', user: '普通用户' }

export function UserManagementPanel() {
  const queryClient = useQueryClient()
  const user = useUserStore((state) => state.user)
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    open: boolean
    userId: string
    userName: string
  }>({ open: false, userId: '', userName: '' })
  const [resetPasswordForm] = Form.useForm()

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', userPage, userSearch, userRoleFilter],
    queryFn: async () => {
      const res = await listUsers({ page: userPage, pageSize: 10, search: userSearch, role: userRoleFilter })
      if (res.code !== 200) throw new Error(res.message)
      return res.data
    },
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
    onError: (err: Error) => message.error(err.message || '更新失败'),
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
    onError: (err: Error) => message.error(err.message || '删除失败'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await resetUserPassword(id, password)
      if (res.code !== 200) throw new Error(res.message)
    },
    onSuccess: () => {
      setResetPasswordModal({ open: false, userId: '', userName: '' })
      resetPasswordForm.resetFields()
      message.success('密码已重置')
    },
    onError: (err: Error) => message.error(err.message || '重置失败'),
  })

  const userColumns: ColumnsType<UserListItem> = [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar src={r.avatar} icon={<UserOutlined />} size="small" />
          <span>{r.name}</span>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string, r) =>
        r.id !== user?.id ? (
          <Select
            value={role}
            options={userRoleOptions}
            style={{ width: 90 }}
            size="small"
            onChange={(v) => updateUserMutation.mutate({ id: r.id, role: v })}
          />
        ) : (
          <Tag color={userRoleColors[role]}>{userRoleLabels[role]}</Tag>
        ),
    },
    { title: '团队', dataIndex: 'teamCount', key: 'teamCount', width: 60 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, r) =>
        r.id !== user?.id ? (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              onClick={() => setResetPasswordModal({ open: true, userId: r.id, userName: r.name })}
            >
              重置密码
            </Button>
            <Popconfirm title="确定删除？" onConfirm={() => deleteUserMutation.mutate(r.id)}>
              <Button type="link" danger size="small">
                删除
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Tag>当前</Tag>
        ),
    },
  ]

  return (
    <>
      <div className={styles.panelContent}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            placeholder="搜索用户"
            prefix={<SearchOutlined />}
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value)
              setUserPage(1)
            }}
            style={{ width: 160 }}
            allowClear
          />
          <Select
            placeholder="角色"
            value={userRoleFilter || undefined}
            onChange={(v) => {
              setUserRoleFilter(v || '')
              setUserPage(1)
            }}
            options={[{ label: '全部', value: '' }, ...userRoleOptions]}
            style={{ width: 100 }}
            allowClear
          />
        </Space>
        <Table<UserListItem>
          columns={userColumns}
          dataSource={usersData?.list}
          rowKey="id"
          loading={usersLoading}
          size="small"
          pagination={{
            current: userPage,
            pageSize: 10,
            total: usersData?.total,
            onChange: setUserPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 人`,
          }}
        />
      </div>

      {/* 重置密码 Modal */}
      <Modal
        title={`重置密码 - ${resetPasswordModal.userName}`}
        open={resetPasswordModal.open}
        onCancel={() => {
          setResetPasswordModal({ open: false, userId: '', userName: '' })
          resetPasswordForm.resetFields()
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={(v) => resetPasswordMutation.mutate({ id: resetPasswordModal.userId, password: v.password })}
        >
          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, v) {
                  if (!v || getFieldValue('password') === v) return Promise.resolve()
                  return Promise.reject(new Error('密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setResetPasswordModal({ open: false, userId: '', userName: '' })
                  resetPasswordForm.resetFields()
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={resetPasswordMutation.isPending}>
                确认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
