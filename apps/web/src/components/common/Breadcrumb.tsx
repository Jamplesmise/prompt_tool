'use client'

import { Breadcrumb as AntBreadcrumb } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 路由名称映射
const routeNameMap: Record<string, string> = {
  '': '工作台',
  prompts: '提示词管理',
  datasets: '数据集',
  models: '模型配置',
  evaluators: '评估器',
  tasks: '测试任务',
  settings: '设置',
  new: '新建',
}

// 获取路由名称
function getRouteName(segment: string): string {
  // 检查是否是 UUID（详情页）
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return '详情'
  }
  return routeNameMap[segment] || segment
}

export function Breadcrumb() {
  const pathname = usePathname()

  // 解析路径
  const pathSegments = pathname.split('/').filter(Boolean)

  // 如果是首页或设置页，不显示面包屑
  if (pathSegments.length === 0 || pathSegments[0] === 'settings') {
    return null
  }

  // 构建面包屑项
  const items = [
    {
      key: 'home',
      title: (
        <Link href="/">
          <HomeOutlined />
        </Link>
      ),
    },
    ...pathSegments.map((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/')
      const isLast = index === pathSegments.length - 1
      const name = getRouteName(segment)

      return {
        key: path,
        title: isLast ? name : <Link href={path}>{name}</Link>,
      }
    }),
  ]

  return (
    <AntBreadcrumb
      items={items}
      style={{ marginBottom: 16 }}
    />
  )
}
