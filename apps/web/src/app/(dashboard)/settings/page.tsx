'use client'

import { useState } from 'react'
import {
  Collapse,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Avatar,
  Upload,
  Popconfirm,
  Table,
  Modal,
  DatePicker,
  Tag,
  Alert,
  Slider,
  message,
} from 'antd'
import {
  UserOutlined,
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
  PlusOutlined,
  CopyOutlined,
  BellOutlined,
  TeamOutlined,
  SettingOutlined,
  SwapOutlined,
  SendOutlined,
  MailOutlined,
  ApiOutlined,
  MessageOutlined,
  SearchOutlined,
  KeyOutlined,
  ReloadOutlined,
  FontSizeOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { SettingsCard, SaveButton } from '@/components/settings'
import { useSettingsForm } from '@/hooks/useSettingsForm'
import { useUserStore } from '@/stores/userStore'
import { useTeamStore } from '@/stores/teamStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { uploadAvatar, deleteAvatar, updateProfile, listUsers, updateUser, deleteUser, resetUserPassword } from '@/services/users'
import { useTokens, useCreateToken, useDeleteToken } from '@/hooks/useTokens'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import type { UploadProps } from 'antd/es/upload'
import type { ApiTokenScope, TeamRole, TeamMemberWithUser, NotifyChannelType } from '@platform/shared'
import type { AuditLogListItem } from '@/services/auditLogs'
import type { AuditAction, AuditResource } from '@platform/shared'
import dayjs from 'dayjs'
import styles from './settings.module.css'

const { Typography } = require('antd')
const { Text, Paragraph } = Typography
const { RangePicker } = DatePicker
const { Panel } = Collapse

const API_BASE = '/api/v1'

// ============ 类型定义 ============

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type TokenListItem = {
  id: string
  name: string
  tokenPrefix: string
  scopes: ApiTokenScope[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

type NotifyChannelItem = {
  id: string
  name: string
  type: NotifyChannelType
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

import type { UserListItem } from '@/services/users'

type GeneralSettings = {
  siteName: string
  defaultPageSize: number
  defaultTimezone: string
  language: string
  enableNotifications: boolean
}

// ============ 配置项 ============

const scopeOptions = [
  { label: '只读 (read)', value: 'read' },
  { label: '读写 (write)', value: 'write' },
  { label: '执行 (execute)', value: 'execute' },
  { label: '管理 (admin)', value: 'admin' },
]

const scopeColors: Record<ApiTokenScope, string> = {
  read: 'green', write: 'blue', execute: 'orange', admin: 'red',
}

const channelTypeConfig: Record<NotifyChannelType, { icon: React.ReactNode; label: string; color: string }> = {
  EMAIL: { icon: <MailOutlined />, label: '邮件', color: '#1677ff' },
  WEBHOOK: { icon: <ApiOutlined />, label: 'Webhook', color: '#52c41a' },
  INTERNAL: { icon: <MessageOutlined />, label: '站内消息', color: '#fa8c16' },
}

const teamRoleOptions = [
  { label: '管理员', value: 'ADMIN' },
  { label: '成员', value: 'MEMBER' },
  { label: '查看者', value: 'VIEWER' },
]

const teamRoleColors: Record<TeamRole, string> = {
  OWNER: 'gold', ADMIN: 'blue', MEMBER: 'green', VIEWER: 'default',
}

const teamRoleLabels: Record<TeamRole, string> = {
  OWNER: '所有者', ADMIN: '管理员', MEMBER: '成员', VIEWER: '查看者',
}

const userRoleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' },
]

const userRoleColors: Record<string, string> = { admin: 'gold', user: 'blue' }
const userRoleLabels: Record<string, string> = { admin: '管理员', user: '普通用户' }

const actionLabels: Record<AuditAction, string> = {
  login: '登录', logout: '登出', create: '创建', update: '更新',
  delete: '删除', execute: '执行', invite: '邀请', remove: '移除', transfer: '转让',
}
const actionColors: Record<AuditAction, string> = {
  login: 'green', logout: 'default', create: 'blue', update: 'orange',
  delete: 'red', execute: 'purple', invite: 'cyan', remove: 'magenta', transfer: 'gold',
}
const resourceLabels: Record<AuditResource, string> = {
  user: '用户', team: '团队', member: '成员', prompt: '提示词', dataset: '数据集',
  model: '模型', provider: '供应商', evaluator: '评估器', task: '任务',
  api_token: 'API Token', scheduled_task: '定时任务', alert_rule: '告警规则', notify_channel: '通知渠道',
}

const TIMEZONE_OPTIONS = [
  { label: '亚洲/上海 (UTC+8)', value: 'Asia/Shanghai' },
  { label: '亚洲/东京 (UTC+9)', value: 'Asia/Tokyo' },
  { label: '美国/纽约 (UTC-5)', value: 'America/New_York' },
  { label: '欧洲/伦敦 (UTC+0)', value: 'Europe/London' },
]

const LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

const PAGE_SIZE_OPTIONS = [
  { label: '10 条/页', value: 10 },
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
]

// ============ 主组件 ============

export default function SettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useUserStore((state) => state.user)
  const updateUserAvatar = useUserStore((state) => state.updateAvatar)
  const updateUserName = useUserStore((state) => state.updateName)
  const { currentTeam } = useTeamStore()
  const { canManageMembers } = usePermission()
  const isAdmin = user?.role === 'admin'
  const isTeamOwner = currentTeam?.role === 'OWNER'
  const isTeamAdmin = currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN'

  // ============ 全局字体大小 ============
  const fontSize = useSettingsStore((state) => state.fontSize)
  const setFontSize = useSettingsStore((state) => state.setFontSize)

  // ============ 个人信息状态 ============
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { values: profileValues, setFieldValue: setProfileField, isDirty: profileDirty, saveState: profileSaveState, save: saveProfile, reset: resetProfile } = useSettingsForm({
    initialValues: { name: user?.name || '' },
    onSave: async (formValues) => {
      const res = await updateProfile({ name: formValues.name })
      if (res.code === 200) {
        updateUserName(formValues.name)
        message.success('个人信息已更新')
      } else {
        throw new Error(res.message || '保存失败')
      }
    },
  })

  const [passwordForm] = Form.useForm<PasswordForm>()
  const [savingPassword, setSavingPassword] = useState(false)

  // ============ Token 状态 ============
  const [tokenPage, setTokenPage] = useState(1)
  const { data: tokenData, isLoading: tokenLoading } = useTokens({ page: tokenPage, pageSize: 5 })
  const createToken = useCreateToken()
  const deleteToken = useDeleteToken()
  const [createTokenModalOpen, setCreateTokenModalOpen] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenForm] = Form.useForm()

  // ============ 通知渠道状态 ============
  const [togglingChannelId, setTogglingChannelId] = useState<string | null>(null)
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null)

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['notify-channels'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/notify-channels?page=1&pageSize=100`)
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data as { list: NotifyChannelItem[] }
    },
  })

  const toggleChannelMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      setTogglingChannelId(id)
      const response = await fetch(`${API_BASE}/notify-channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data
    },
    onSuccess: (data) => {
      message.success(data.isActive ? '已启用' : '已禁用')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
    },
    onError: (error: Error) => message.error(error.message || '操作失败'),
    onSettled: () => setTogglingChannelId(null),
  })

  const testChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingChannelId(id)
      const response = await fetch(`${API_BASE}/notify-channels/${id}/test`, { method: 'POST' })
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data
    },
    onSuccess: (data) => {
      if (data.success) message.success('测试通知发送成功')
      else message.error(`测试失败: ${data.error}`)
    },
    onError: (error: Error) => message.error(error.message || '测试失败'),
    onSettled: () => setTestingChannelId(null),
  })

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/notify-channels/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.code !== 200) throw new Error(result.message)
      return result.data
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['notify-channels'] })
    },
    onError: (error: Error) => message.error(error.message || '删除失败'),
  })

  // ============ 团队状态 ============
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

  // ============ 系统设置状态 ============
  const { values: generalValues, setFieldValue: setGeneralField, isDirty: generalDirty, saveState: generalSaveState, save: saveGeneral, reset: resetGeneral } = useSettingsForm({
    initialValues: {
      siteName: 'AI 测试平台',
      defaultPageSize: 20,
      defaultTimezone: 'Asia/Shanghai',
      language: 'zh-CN',
      enableNotifications: true,
    } as GeneralSettings,
    onSave: async (formValues) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      message.success('设置已保存')
    },
  })

  // ============ 用户管理状态 ============
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' })
  const [resetPasswordForm] = Form.useForm()

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', userPage, userSearch, userRoleFilter],
    queryFn: async () => {
      const res = await listUsers({ page: userPage, pageSize: 10, search: userSearch, role: userRoleFilter })
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

  // ============ 操作日志状态 ============
  const [logPage, setLogPage] = useState(1)
  const [logFilters, setLogFilters] = useState<{ action?: AuditAction; resource?: AuditResource; startDate?: string; endDate?: string }>({})
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useAuditLogs({ page: logPage, pageSize: 10, ...logFilters })

  // ============ 事件处理 ============

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    if (!isImage) { message.error('只支持 JPEG、PNG、GIF、WebP 格式'); return false }
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) { message.error('文件大小不能超过 2MB'); return false }

    setUploading(true)
    try {
      const res = await uploadAvatar(file)
      if (res.code === 200 && res.data) {
        updateUserAvatar(res.data.avatar)
        message.success('头像上传成功')
      } else { message.error(res.message || '上传失败') }
    } catch { message.error('上传失败') }
    finally { setUploading(false) }
    return false
  }

  const handleDeleteAvatar = async () => {
    setDeleting(true)
    try {
      const res = await deleteAvatar()
      if (res.code === 200) { updateUserAvatar(null); message.success('头像已删除') }
      else { message.error(res.message || '删除失败') }
    } catch { message.error('删除失败') }
    finally { setDeleting(false) }
  }

  const handleChangePassword = async (formValues: PasswordForm) => {
    setSavingPassword(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      message.success('密码已修改')
      passwordForm.resetFields()
    } catch { message.error('修改失败') }
    finally { setSavingPassword(false) }
  }

  const handleCreateToken = async (formValues: { name: string; scopes: ApiTokenScope[]; expiresAt?: dayjs.Dayjs }) => {
    try {
      const result = await createToken.mutateAsync({
        name: formValues.name,
        scopes: formValues.scopes,
        expiresAt: formValues.expiresAt?.toISOString() || null,
      })
      setNewToken(result.token)
      tokenForm.resetFields()
    } catch { }
  }

  const handleUpdateTeam = async (values: { name: string; description?: string }) => {
    if (!currentTeam) return
    try { await updateTeam.mutateAsync({ id: currentTeam.id, data: values }) }
    catch { }
  }

  const handleDeleteTeam = async () => {
    if (!currentTeam) return
    try { await deleteTeam.mutateAsync(currentTeam.id); router.push('/') }
    catch { }
  }

  const handleTransferOwnership = async () => {
    if (!currentTeam || !transferUserId) { message.error('请选择新的所有者'); return }
    try {
      await transferTeam.mutateAsync({ id: currentTeam.id, newOwnerId: transferUserId })
      setTransferModalOpen(false)
      setTransferUserId('')
    } catch { }
  }

  const handleInvite = async (values: { email: string; role: TeamRole }) => {
    if (!currentTeam) return
    try {
      await inviteMember.mutateAsync({ teamId: currentTeam.id, data: values })
      setInviteModalOpen(false)
      inviteForm.resetFields()
    } catch { }
  }

  // ============ 表格列定义 ============

  const tokenColumns: ColumnsType<TokenListItem> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'Token', dataIndex: 'tokenPrefix', key: 'tokenPrefix', render: (prefix: string) => <Text code>{prefix}</Text> },
    { title: '权限', dataIndex: 'scopes', key: 'scopes', render: (scopes: ApiTokenScope[]) => <Space size={4}>{scopes.map((s) => <Tag key={s} color={scopeColors[s]}>{s}</Tag>)}</Space> },
    { title: '过期', dataIndex: 'expiresAt', key: 'expiresAt', render: (d: string | null) => d ? dayjs(d).format('YYYY-MM-DD') : '永不' },
    { title: '操作', key: 'action', width: 80, render: (_, r) => <Popconfirm title="确定删除？" onConfirm={() => deleteToken.mutate(r.id)}><Button type="link" danger size="small">删除</Button></Popconfirm> },
  ]

  const memberColumns: ColumnsType<TeamMemberWithUser> = [
    { title: '成员', key: 'user', render: (_, r) => <Space><Avatar src={r.user.avatar} icon={<UserOutlined />} size="small" /><span>{r.user.name}</span></Space> },
    { title: '角色', dataIndex: 'role', key: 'role', width: 120, render: (role: TeamRole, r) => canManageMembers && role !== 'OWNER' ? <Select value={role} options={teamRoleOptions} style={{ width: 90 }} size="small" onChange={(v) => updateRole.mutate({ teamId: currentTeam!.id, userId: r.userId, role: v })} /> : <Tag color={teamRoleColors[role]}>{teamRoleLabels[role]}</Tag> },
    { title: '加入时间', dataIndex: 'createdAt', key: 'createdAt', width: 100, render: (d: Date | string) => dayjs(d).format('YYYY-MM-DD') },
    { title: '操作', key: 'action', width: 60, render: (_, r) => canManageMembers && r.role !== 'OWNER' ? <Popconfirm title="确定移除？" onConfirm={() => removeMember.mutate({ teamId: currentTeam!.id, userId: r.userId })}><Button type="link" danger size="small">移除</Button></Popconfirm> : null },
  ]

  const userColumns: ColumnsType<UserListItem> = [
    { title: '用户', key: 'user', render: (_, r) => <Space><Avatar src={r.avatar} icon={<UserOutlined />} size="small" /><span>{r.name}</span></Space> },
    { title: '角色', dataIndex: 'role', key: 'role', width: 120, render: (role: string, r) => r.id !== user?.id ? <Select value={role} options={userRoleOptions} style={{ width: 90 }} size="small" onChange={(v) => updateUserMutation.mutate({ id: r.id, role: v })} /> : <Tag color={userRoleColors[role]}>{userRoleLabels[role]}</Tag> },
    { title: '团队', dataIndex: 'teamCount', key: 'teamCount', width: 60 },
    { title: '操作', key: 'action', width: 140, render: (_, r) => r.id !== user?.id ? <Space size={4}><Button type="link" size="small" onClick={() => setResetPasswordModal({ open: true, userId: r.id, userName: r.name })}>重置密码</Button><Popconfirm title="确定删除？" onConfirm={() => deleteUserMutation.mutate(r.id)}><Button type="link" danger size="small">删除</Button></Popconfirm></Space> : <Tag>当前</Tag> },
  ]

  const logColumns: ColumnsType<AuditLogListItem> = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (d: Date | string) => dayjs(d).format('MM-DD HH:mm:ss') },
    { title: '用户', key: 'user', width: 100, render: (_, r) => r.user.name },
    { title: '操作', dataIndex: 'action', key: 'action', width: 70, render: (a: AuditAction) => <Tag color={actionColors[a]}>{actionLabels[a]}</Tag> },
    { title: '资源', dataIndex: 'resource', key: 'resource', width: 80, render: (r: AuditResource) => resourceLabels[r] },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 110, render: (ip: string | null) => ip || '-' },
  ]

  // ============ 面板内容 ============

  const panelItems = [
    {
      key: 'profile',
      label: <span><UserOutlined style={{ marginRight: 8 }} />个人信息</span>,
      children: (
        <div className={styles.panelContent}>
          <div className={styles.profileSection}>
            <div className={styles.avatarSection}>
              <Avatar size={72} src={user?.avatar} icon={<UserOutlined />} />
              <Space style={{ marginTop: 8 }}>
                <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*">
                  <Button icon={<UploadOutlined />} loading={uploading} size="small">更换</Button>
                </Upload>
                {user?.avatar && (
                  <Popconfirm title="确定删除头像？" onConfirm={handleDeleteAvatar}>
                    <Button icon={<DeleteOutlined />} loading={deleting} size="small" danger>删除</Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
            <div className={styles.infoSection}>
              <Form layout="vertical" className={styles.compactForm}>
                <Form.Item label="昵称">
                  <Input value={profileValues.name} onChange={(e) => setProfileField('name', e.target.value)} placeholder="请输入昵称" />
                </Form.Item>
                <Form.Item label="邮箱">
                  <Input value={user?.email || ''} disabled />
                </Form.Item>
              </Form>
              <Space>
                <Button onClick={resetProfile} disabled={!profileDirty} size="small">重置</Button>
                <SaveButton state={profileSaveState} onClick={saveProfile} disabled={!profileDirty} />
              </Space>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'appearance',
      label: <span><EyeOutlined style={{ marginRight: 8 }} />外观设置</span>,
      children: (
        <div className={styles.panelContent}>
          <div className={styles.appearanceItem}>
            <div className={styles.appearanceLabel}>
              <FontSizeOutlined style={{ marginRight: 8 }} />
              <span>字体大小</span>
            </div>
            <div className={styles.appearanceControl}>
              <span className={styles.fontSizeValue}>A</span>
              <Slider
                min={12}
                max={18}
                value={fontSize}
                onChange={setFontSize}
                style={{ width: '12em' }}
                tooltip={{ formatter: (v) => `${v}px` }}
              />
              <span className={styles.fontSizeValueLg}>A</span>
              <span className={styles.fontSizeNum}>{fontSize}px</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'security',
      label: <span><KeyOutlined style={{ marginRight: 8 }} />账号安全</span>,
      children: (
        <div className={styles.panelContent}>
          <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} className={styles.compactForm}>
            <Form.Item label="当前密码" name="currentPassword" rules={[{ required: true, message: '请输入当前密码' }]}>
              <Input.Password placeholder="请输入当前密码" />
            </Form.Item>
            <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少 6 个字符' }]}>
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
            <Form.Item label="确认新密码" name="confirmPassword" dependencies={['newPassword']} rules={[{ required: true, message: '请确认新密码' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) return Promise.resolve(); return Promise.reject(new Error('两次输入的密码不一致')) } })]}>
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingPassword}>修改密码</Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'tokens',
      label: <span><KeyOutlined style={{ marginRight: 8 }} />API Token</span>,
      extra: <Button type="primary" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); setCreateTokenModalOpen(true) }}>创建</Button>,
      children: (
        <div className={styles.panelContent}>
          <Table<TokenListItem> columns={tokenColumns} dataSource={tokenData?.list} rowKey="id" loading={tokenLoading} size="small" pagination={{ current: tokenPage, pageSize: 5, total: tokenData?.total, onChange: setTokenPage, showSizeChanger: false }} />
        </div>
      ),
    },
    {
      key: 'notifications',
      label: <span><BellOutlined style={{ marginRight: 8 }} />通知渠道</span>,
      children: (
        <div className={styles.panelContent}>
          {channelsLoading ? <div>加载中...</div> : (
            <div className={styles.channelGrid}>
              {(channelsData?.list || []).map((channel) => {
                const cfg = channelTypeConfig[channel.type]
                return (
                  <div key={channel.id} className={`${styles.channelCard} ${!channel.isActive ? styles.channelDisabled : ''}`}>
                    <div className={styles.channelHeader}>
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      <span className={styles.channelName}>{channel.name}</span>
                      <Tag color={cfg.color}>{cfg.label}</Tag>
                      <Switch checked={channel.isActive} size="small" loading={togglingChannelId === channel.id} onChange={(checked) => toggleChannelMutation.mutate({ id: channel.id, isActive: checked })} />
                    </div>
                    <div className={styles.channelActions}>
                      <Button type="text" size="small" icon={<SendOutlined />} loading={testingChannelId === channel.id} onClick={() => testChannelMutation.mutate(channel.id)}>测试</Button>
                      <Popconfirm title="确认删除？" onConfirm={() => deleteChannelMutation.mutate(channel.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'team',
      label: <span><TeamOutlined style={{ marginRight: 8 }} />团队管理</span>,
      children: currentTeam ? (
        <div className={styles.panelContent}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>基本信息</div>
            <Form form={teamForm} layout="vertical" initialValues={{ name: currentTeam.name, description: currentTeam.description || '' }} onFinish={handleUpdateTeam} className={styles.compactForm}>
              <Form.Item label="团队名称" name="name" rules={[{ required: true, message: '请输入团队名称' }]}>
                <Input placeholder="请输入团队名称" disabled={!isTeamAdmin} />
              </Form.Item>
              <Form.Item label="团队描述" name="description">
                <Input.TextArea placeholder="请输入团队描述" rows={2} disabled={!isTeamAdmin} />
              </Form.Item>
              {isTeamAdmin && <Form.Item><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateTeam.isPending}>保存</Button></Form.Item>}
            </Form>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>成员管理</span>
              {canManageMembers && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setInviteModalOpen(true)}>邀请</Button>}
            </div>
            <Table<TeamMemberWithUser> columns={memberColumns} dataSource={membersData?.list} rowKey="id" loading={membersLoading} size="small" pagination={{ current: memberPage, pageSize: 10, total: membersData?.total, onChange: setMemberPage, showSizeChanger: false }} />
          </div>
          {isTeamOwner && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>危险操作</div>
              <Space>
                <Button icon={<SwapOutlined />} onClick={() => setTransferModalOpen(true)} disabled={transferableMembers.length === 0}>转让所有权</Button>
                <Popconfirm title="确定删除此团队？" description="所有数据将被永久删除！" onConfirm={handleDeleteTeam} okText="确认删除" okButtonProps={{ danger: true }}>
                  <Button danger icon={<DeleteOutlined />} loading={deleteTeam.isPending}>删除团队</Button>
                </Popconfirm>
              </Space>
            </div>
          )}
        </div>
      ) : <Text type="secondary">请先选择一个团队</Text>,
    },
  ]

  // 管理员面板
  const adminPanels = isAdmin ? [
    {
      key: 'general',
      label: <span><SettingOutlined style={{ marginRight: 8 }} />通用设置</span>,
      children: (
        <div className={styles.panelContent}>
          <Form layout="vertical" className={styles.compactForm}>
            <Form.Item label="站点名称">
              <Input value={generalValues.siteName} onChange={(e) => setGeneralField('siteName', e.target.value)} />
            </Form.Item>
            <Space size={16}>
              <Form.Item label="默认分页">
                <Select value={generalValues.defaultPageSize} onChange={(v) => setGeneralField('defaultPageSize', v)} options={PAGE_SIZE_OPTIONS} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="时区">
                <Select value={generalValues.defaultTimezone} onChange={(v) => setGeneralField('defaultTimezone', v)} options={TIMEZONE_OPTIONS} style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="语言">
                <Select value={generalValues.language} onChange={(v) => setGeneralField('language', v)} options={LANGUAGE_OPTIONS} style={{ width: 120 }} />
              </Form.Item>
            </Space>
            <Form.Item label="系统通知">
              <Switch checked={generalValues.enableNotifications} onChange={(v) => setGeneralField('enableNotifications', v)} checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Form>
          <Space>
            <Button onClick={resetGeneral} disabled={!generalDirty} size="small">重置</Button>
            <SaveButton state={generalSaveState} onClick={saveGeneral} disabled={!generalDirty} />
          </Space>
        </div>
      ),
    },
    {
      key: 'users',
      label: <span><UserOutlined style={{ marginRight: 8 }} />用户管理</span>,
      children: (
        <div className={styles.panelContent}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Input placeholder="搜索用户" prefix={<SearchOutlined />} value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }} style={{ width: 160 }} allowClear />
            <Select placeholder="角色" value={userRoleFilter || undefined} onChange={(v) => { setUserRoleFilter(v || ''); setUserPage(1) }} options={[{ label: '全部', value: '' }, ...userRoleOptions]} style={{ width: 100 }} allowClear />
          </Space>
          <Table<UserWithCount> columns={userColumns} dataSource={usersData?.list} rowKey="id" loading={usersLoading} size="small" pagination={{ current: userPage, pageSize: 10, total: usersData?.total, onChange: setUserPage, showSizeChanger: false, showTotal: (t) => `共 ${t} 人` }} />
        </div>
      ),
    },
    {
      key: 'audit',
      label: <span><SettingOutlined style={{ marginRight: 8 }} />操作日志</span>,
      extra: <Button size="small" icon={<ReloadOutlined />} onClick={(e) => { e.stopPropagation(); refetchLogs() }}>刷新</Button>,
      children: (
        <div className={styles.panelContent}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Select placeholder="操作" allowClear style={{ width: 100 }} options={Object.entries(actionLabels).map(([v, l]) => ({ value: v, label: l }))} value={logFilters.action} onChange={(v) => { setLogFilters({ ...logFilters, action: v }); setLogPage(1) }} />
            <Select placeholder="资源" allowClear style={{ width: 100 }} options={Object.entries(resourceLabels).map(([v, l]) => ({ value: v, label: l }))} value={logFilters.resource} onChange={(v) => { setLogFilters({ ...logFilters, resource: v }); setLogPage(1) }} />
            <RangePicker size="small" onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setLogFilters({ ...logFilters, startDate: dates[0].startOf('day').toISOString(), endDate: dates[1].endOf('day').toISOString() })
              } else {
                const { startDate, endDate, ...rest } = logFilters
                setLogFilters(rest)
              }
              setLogPage(1)
            }} />
          </Space>
          <Table<AuditLogListItem> columns={logColumns} dataSource={logsData?.list} rowKey="id" loading={logsLoading} size="small" pagination={{ current: logPage, pageSize: 10, total: logsData?.total, onChange: setLogPage, showSizeChanger: false }} />
        </div>
      ),
    },
  ] : []

  const allPanels = [...panelItems, ...adminPanels]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>设置</h1>
        <p className={styles.description}>管理您的账号、团队和系统配置</p>
      </div>

      <Collapse defaultActiveKey={['profile']} className={styles.collapse} items={allPanels} />

      {/* 创建 Token Modal */}
      <Modal title="创建 API Token" open={createTokenModalOpen} onCancel={() => { setCreateTokenModalOpen(false); setNewToken(null); tokenForm.resetFields() }} footer={null} destroyOnClose>
        {newToken ? (
          <div>
            <Alert message="Token 创建成功" description="请立即复制保存，关闭后无法再次查看。" type="warning" showIcon style={{ marginBottom: 16 }} />
            <div className={styles.tokenDisplay}>
              <Paragraph copyable={{ text: newToken }} style={{ margin: 0 }}><Text code style={{ wordBreak: 'break-all' }}>{newToken}</Text></Paragraph>
            </div>
            <Space><Button type="primary" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(newToken); message.success('已复制') }}>复制</Button><Button onClick={() => { setCreateTokenModalOpen(false); setNewToken(null) }}>关闭</Button></Space>
          </div>
        ) : (
          <Form form={tokenForm} layout="vertical" onFinish={handleCreateToken}>
            <Form.Item label="Token 名称" name="name" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="例如：CI/CD Token" /></Form.Item>
            <Form.Item label="权限范围" name="scopes" initialValue={['read']} rules={[{ required: true, message: '请选择权限' }]}><Select mode="multiple" options={scopeOptions} /></Form.Item>
            <Form.Item label="过期时间" name="expiresAt"><DatePicker style={{ width: '100%' }} placeholder="留空表示永不过期" disabledDate={(c) => c && c < dayjs().startOf('day')} /></Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}><Space><Button onClick={() => setCreateTokenModalOpen(false)}>取消</Button><Button type="primary" htmlType="submit" loading={createToken.isPending}>创建</Button></Space></Form.Item>
          </Form>
        )}
      </Modal>

      {/* 转让所有权 Modal */}
      <Modal title="转让团队所有权" open={transferModalOpen} onCancel={() => { setTransferModalOpen(false); setTransferUserId('') }} onOk={handleTransferOwnership} confirmLoading={transferTeam.isPending} okText="确认转让">
        <Alert message="转让后您将成为管理员" type="warning" showIcon style={{ marginBottom: 16 }} />
        <Select placeholder="选择新所有者" style={{ width: '100%' }} value={transferUserId || undefined} onChange={setTransferUserId} options={transferableMembers.map((m) => ({ value: m.userId, label: `${m.user.name} (${m.user.email})` }))} />
      </Modal>

      {/* 邀请成员 Modal */}
      <Modal title="邀请成员" open={inviteModalOpen} onCancel={() => setInviteModalOpen(false)} footer={null} destroyOnClose>
        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}><Input placeholder="请输入成员邮箱" /></Form.Item>
          <Form.Item label="角色" name="role" initialValue="MEMBER" rules={[{ required: true }]}><Select options={teamRoleOptions} /></Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}><Space><Button onClick={() => setInviteModalOpen(false)}>取消</Button><Button type="primary" htmlType="submit" loading={inviteMember.isPending}>邀请</Button></Space></Form.Item>
        </Form>
      </Modal>

      {/* 重置密码 Modal */}
      <Modal title={`重置密码 - ${resetPasswordModal.userName}`} open={resetPasswordModal.open} onCancel={() => { setResetPasswordModal({ open: false, userId: '', userName: '' }); resetPasswordForm.resetFields() }} footer={null} destroyOnClose>
        <Form form={resetPasswordForm} layout="vertical" onFinish={(v) => resetPasswordMutation.mutate({ id: resetPasswordModal.userId, password: v.password })}>
          <Form.Item label="新密码" name="password" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}><Input.Password placeholder="请输入新密码" /></Form.Item>
          <Form.Item label="确认密码" name="confirmPassword" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, v) { if (!v || getFieldValue('password') === v) return Promise.resolve(); return Promise.reject(new Error('密码不一致')) } })]}><Input.Password placeholder="请再次输入" /></Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}><Space><Button onClick={() => { setResetPasswordModal({ open: false, userId: '', userName: '' }); resetPasswordForm.resetFields() }}>取消</Button><Button type="primary" htmlType="submit" loading={resetPasswordMutation.isPending}>确认</Button></Space></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
