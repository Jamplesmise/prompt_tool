'use client'

import { Card, Button, Space } from 'antd'
import {
  PlusOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

export function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      key: 'task',
      title: '新建任务',
      icon: <PlayCircleOutlined />,
      path: '/tasks/new',
      type: 'primary' as const,
    },
    {
      key: 'dataset',
      title: '上传数据集',
      icon: <DatabaseOutlined />,
      path: '/datasets?action=upload',
      type: 'default' as const,
    },
    {
      key: 'prompt',
      title: '新建提示词',
      icon: <FileTextOutlined />,
      path: '/prompts/new',
      type: 'default' as const,
    },
  ]

  return (
    <Card title="快捷入口">
      <Space direction="vertical" size="middle" className="w-full">
        {actions.map((action) => (
          <Button
            key={action.key}
            type={action.type}
            icon={action.icon}
            block
            size="large"
            onClick={() => router.push(action.path)}
          >
            {action.title}
          </Button>
        ))}
      </Space>
    </Card>
  )
}
