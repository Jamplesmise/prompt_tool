'use client'

import { useMemo } from 'react'
import { Tag } from 'antd'
import {
  ThunderboltOutlined,
  SplitCellsOutlined,
  FileTextOutlined,
  UploadOutlined,
  SettingOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import styles from './CommandPalette.module.css'

// 命令类型
export type Command = {
  id: string
  name: string
  description?: string
  shortcut?: string
  icon?: React.ReactNode
  action: () => void
  category?: string
}

type CommandPaletteProps = {
  query: string
  selectedIndex: number
  onSelect: (command: Command) => void
  onIndexChange: (index: number) => void
}

export function CommandPalette({
  query,
  selectedIndex,
  onSelect,
  onIndexChange,
}: CommandPaletteProps) {
  const router = useRouter()

  // 默认命令列表
  const defaultCommands: Command[] = useMemo(() => [
    {
      id: 'new-task',
      name: '新建测试任务',
      description: '创建一个新的测试任务',
      shortcut: 'Ctrl+N',
      icon: <ThunderboltOutlined />,
      action: () => router.push('/tasks/new'),
      category: '创建',
    },
    {
      id: 'new-ab-test',
      name: '新建 A/B 测试',
      description: '创建一个 A/B 对比测试',
      icon: <SplitCellsOutlined />,
      action: () => router.push('/tasks/new?type=ab'),
      category: '创建',
    },
    {
      id: 'new-prompt',
      name: '新建提示词',
      description: '创建一个新的提示词',
      icon: <FileTextOutlined />,
      action: () => router.push('/prompts/new'),
      category: '创建',
    },
    {
      id: 'upload-dataset',
      name: '上传数据集',
      description: '上传新的测试数据集',
      icon: <UploadOutlined />,
      action: () => router.push('/datasets?action=upload'),
      category: '创建',
    },
    {
      id: 'add-model',
      name: '添加模型提供商',
      description: '配置新的 AI 模型提供商',
      icon: <ApiOutlined />,
      action: () => router.push('/models?action=add'),
      category: '配置',
    },
    {
      id: 'new-evaluator',
      name: '新建评估器',
      description: '创建自定义评估器',
      icon: <PlusOutlined />,
      action: () => router.push('/evaluators/new'),
      category: '创建',
    },
    {
      id: 'go-tasks',
      name: '查看任务列表',
      description: '前往任务列表页面',
      icon: <PlayCircleOutlined />,
      action: () => router.push('/tasks'),
      category: '导航',
    },
    {
      id: 'go-prompts',
      name: '查看提示词',
      description: '前往提示词管理页面',
      icon: <FileTextOutlined />,
      action: () => router.push('/prompts'),
      category: '导航',
    },
    {
      id: 'settings',
      name: '打开设置',
      description: '打开系统设置页面',
      shortcut: 'Ctrl+,',
      icon: <SettingOutlined />,
      action: () => router.push('/settings'),
      category: '系统',
    },
  ], [router])

  // 过滤命令
  const filteredCommands = useMemo(() => {
    // 去掉开头的 > 符号
    const searchQuery = query.replace(/^>\s*/, '').toLowerCase().trim()

    if (!searchQuery) {
      return defaultCommands
    }

    return defaultCommands.filter(cmd =>
      cmd.name.toLowerCase().includes(searchQuery) ||
      cmd.description?.toLowerCase().includes(searchQuery) ||
      cmd.category?.toLowerCase().includes(searchQuery)
    )
  }, [query, defaultCommands])

  // 按分类分组
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {}

    filteredCommands.forEach(cmd => {
      const category = cmd.category || '其他'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(cmd)
    })

    return groups
  }, [filteredCommands])

  // 获取全局索引
  const getGlobalIndex = (category: string, localIndex: number): number => {
    let globalIndex = 0
    for (const [cat, commands] of Object.entries(groupedCommands)) {
      if (cat === category) {
        return globalIndex + localIndex
      }
      globalIndex += commands.length
    }
    return globalIndex
  }

  if (filteredCommands.length === 0) {
    return (
      <div className={styles.empty}>
        未找到匹配的命令
      </div>
    )
  }

  let globalIndex = 0

  return (
    <div className={styles.container}>
      {Object.entries(groupedCommands).map(([category, commands]) => (
        <div key={category} className={styles.group}>
          <div className={styles.groupHeader}>
            {category}
          </div>
          {commands.map((command, localIndex) => {
            const currentIndex = globalIndex++
            const isSelected = currentIndex === selectedIndex

            return (
              <div
                key={command.id}
                data-index={currentIndex}
                className={`${styles.commandItem} ${isSelected ? styles.selected : ''}`}
                onClick={() => onSelect(command)}
                onMouseEnter={() => onIndexChange(currentIndex)}
              >
                <div className={styles.commandIcon}>
                  {command.icon}
                </div>
                <div className={styles.commandContent}>
                  <div className={styles.commandName}>{command.name}</div>
                  {command.description && (
                    <div className={styles.commandDesc}>{command.description}</div>
                  )}
                </div>
                {command.shortcut && (
                  <Tag className={styles.shortcut}>{command.shortcut}</Tag>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export { type Command as CommandType }
