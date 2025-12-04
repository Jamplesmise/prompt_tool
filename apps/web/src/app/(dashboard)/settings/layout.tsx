'use client'

import { Menu, Card } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  KeyOutlined,
  TeamOutlined,
  AuditOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'
import { useUserStore } from '@/stores/userStore'

const menuItems = [
  {
    key: '/settings/profile',
    icon: <UserOutlined />,
    label: '个人信息',
  },
  {
    key: '/settings/security',
    icon: <LockOutlined />,
    label: '账号安全',
  },
  {
    key: '/settings/notifications',
    icon: <BellOutlined />,
    label: '通知设置',
  },
  {
    key: '/settings/tokens',
    icon: <KeyOutlined />,
    label: 'API Token',
  },
  {
    type: 'divider' as const,
  },
  {
    key: '/settings/team',
    icon: <SettingOutlined />,
    label: '团队设置',
  },
  {
    key: '/settings/members',
    icon: <TeamOutlined />,
    label: '团队成员',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '通用设置',
  },
]

const adminMenuItems = [
  {
    type: 'divider' as const,
  },
  {
    key: '/settings/users',
    icon: <UsergroupAddOutlined />,
    label: '用户管理',
  },
  {
    key: '/settings/audit',
    icon: <AuditOutlined />,
    label: '操作日志',
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const isAdmin = user?.role === 'admin'

  const allMenuItems = isAdmin ? [...menuItems, ...adminMenuItems] : menuItems

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Card style={{ width: 200, flexShrink: 0 }}>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={allMenuItems}
          onClick={({ key }) => router.push(key)}
          style={{ border: 'none' }}
        />
      </Card>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
