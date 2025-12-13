'use client'

import React from 'react'
import {
  DashboardOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MonitorOutlined,
  AlertOutlined,
  SwapOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import type { ProLayoutProps } from '@ant-design/pro-components'
import { ProLayout } from '@ant-design/pro-components'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dropdown, Spin, Divider } from 'antd'
import type { MenuProps } from 'antd'
import { useRequireAuth, useAuth } from '@/hooks/useAuth'
import { useUserStore } from '@/stores/userStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { Breadcrumb } from '@/components/common'
import { TeamSelector } from '@/components/team/TeamSelector'
import { GlobalHotkeys } from '@/components/global'
import { TaskCompleteNotification } from '@/components/guidance'
import { CopilotPanel } from '@/components/goi'

const menuData = [
  {
    path: '/',
    name: '工作台',
    icon: <DashboardOutlined />,
  },
  {
    path: '/prompts',
    name: '提示词管理',
    icon: <FileTextOutlined />,
  },
  {
    path: '/datasets',
    name: '数据集',
    icon: <DatabaseOutlined />,
  },
  {
    path: '/models',
    name: '模型配置',
    icon: <ApiOutlined />,
  },
  {
    path: '/evaluators',
    name: '评估器',
    icon: <ExperimentOutlined />,
  },
  {
    path: '/tasks',
    name: '测试任务',
    icon: <PlayCircleOutlined />,
  },
  {
    path: '/comparison',
    name: '对比分析',
    icon: <SwapOutlined />,
    routes: [
      {
        path: '/comparison/versions',
        name: '版本对比',
        icon: <FileTextOutlined />,
      },
      {
        path: '/comparison/models',
        name: '模型对比',
        icon: <BarChartOutlined />,
      },
    ],
  },
  {
    path: '/scheduled',
    name: '定时任务',
    icon: <ClockCircleOutlined />,
  },
  {
    path: '/monitor',
    name: '监控中心',
    icon: <MonitorOutlined />,
    routes: [
      {
        path: '/monitor/overview',
        name: '概览',
        icon: <DashboardOutlined />,
      },
      {
        path: '/monitor/alerts',
        name: '告警管理',
        icon: <AlertOutlined />,
      },
    ],
  },
  {
    path: '/settings',
    name: '设置',
    icon: <SettingOutlined />,
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoading, isAuthenticated } = useRequireAuth()
  const { logout } = useAuth()
  const user = useUserStore((state) => state.user)
  const fontSize = useSettingsStore((state) => state.fontSize)

  // 未登录或加载中显示加载状态
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.name || '用户',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ]

  const layoutSettings: ProLayoutProps = {
    title: 'AI 测试平台',
    logo: false,
    layout: 'mix',
    fixSiderbar: true,
    fixedHeader: true,
    contentWidth: 'Fluid',
    route: {
      path: '/',
      routes: menuData,
    },
    location: {
      pathname,
    },
    menuItemRender: (item, dom) => (
      <Link href={item.path || '/'}>{dom}</Link>
    ),
    onMenuHeaderClick: () => router.push('/'),
    actionsRender: () => [
      <TeamSelector key="team-selector" />,
      <Divider key="divider" type="vertical" />,
    ],
    avatarProps: {
      src: user?.avatar || undefined,
      title: user?.name || '用户',
      size: 'small',
      render: (_props, dom) => (
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          {dom}
        </Dropdown>
      ),
    },
  }

  return (
    <ProLayout {...layoutSettings}>
      <GlobalHotkeys />
      <TaskCompleteNotification />
      <div className="px-6 py-4" style={{ fontSize: `${fontSize}px` }}>
        <Breadcrumb />
        {children}
      </div>
      {/* AI Copilot 面板 */}
      <CopilotPanel />
    </ProLayout>
  )
}
