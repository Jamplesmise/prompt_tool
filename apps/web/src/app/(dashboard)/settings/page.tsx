'use client'

import { useState, useCallback } from 'react'
import { Collapse, Button } from 'antd'
import {
  UserOutlined,
  KeyOutlined,
  BellOutlined,
  TeamOutlined,
  SettingOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useUserStore } from '@/stores/userStore'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import {
  ProfilePanel,
  AppearancePanel,
  SecurityPanel,
  TokenPanel,
  NotificationPanel,
  TeamPanel,
  GeneralSettingsPanel,
  UserManagementPanel,
  AuditLogPanel,
} from './components'
import styles from './settings.module.css'

export default function SettingsPage() {
  const user = useUserStore((state) => state.user)
  const isAdmin = user?.role === 'admin'

  // Token 面板状态 - 由于 TokenPanel 内部管理 Modal，这里只控制显示
  const [tokenModalOpen, setTokenModalOpen] = useState(false)

  // 审计日志刷新
  const { refetch: refetchLogs } = useAuditLogs({ page: 1, pageSize: 10 })

  const handleRefreshLogs = useCallback(() => {
    refetchLogs()
  }, [refetchLogs])

  // 基础面板配置
  const basePanels = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          个人信息
        </span>
      ),
      children: <ProfilePanel />,
    },
    {
      key: 'appearance',
      label: (
        <span>
          <EyeOutlined style={{ marginRight: 8 }} />
          外观设置
        </span>
      ),
      children: <AppearancePanel />,
    },
    {
      key: 'security',
      label: (
        <span>
          <KeyOutlined style={{ marginRight: 8 }} />
          账号安全
        </span>
      ),
      children: <SecurityPanel />,
    },
    {
      key: 'tokens',
      label: (
        <span>
          <KeyOutlined style={{ marginRight: 8 }} />
          API Token
        </span>
      ),
      extra: (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            setTokenModalOpen(true)
          }}
        >
          创建
        </Button>
      ),
      children: <TokenPanel />,
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined style={{ marginRight: 8 }} />
          通知渠道
        </span>
      ),
      children: <NotificationPanel />,
    },
    {
      key: 'team',
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          团队管理
        </span>
      ),
      children: <TeamPanel />,
    },
  ]

  // 管理员面板配置
  const adminPanels = isAdmin
    ? [
        {
          key: 'general',
          label: (
            <span>
              <SettingOutlined style={{ marginRight: 8 }} />
              通用设置
            </span>
          ),
          children: <GeneralSettingsPanel />,
        },
        {
          key: 'users',
          label: (
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              用户管理
            </span>
          ),
          children: <UserManagementPanel />,
        },
        {
          key: 'audit',
          label: (
            <span>
              <SettingOutlined style={{ marginRight: 8 }} />
              操作日志
            </span>
          ),
          extra: (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleRefreshLogs()
              }}
            >
              刷新
            </Button>
          ),
          children: <AuditLogPanel />,
        },
      ]
    : []

  const allPanels = [...basePanels, ...adminPanels]

  return (
    <div className={`${styles.page} fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>设置</h1>
        <p className={styles.description}>管理您的账号、团队和系统配置</p>
      </div>

      <Collapse defaultActiveKey={['profile']} className={styles.collapse} items={allPanels} />
    </div>
  )
}
