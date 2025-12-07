'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { Tag, Spin } from 'antd'
import {
  SearchOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  PlusOutlined,
  SettingOutlined,
  ApiOutlined,
  ExperimentOutlined,
  SplitCellsOutlined,
  UploadOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useHotkeys, getModifierKey } from '@/hooks/useHotkeys'
import { useCommandStore } from '@/stores/commandStore'
import type { RecentItem } from '@/stores/commandStore'
import styles from './GlobalSearch.module.css'

// 搜索结果类型
export type SearchResultType = 'prompt' | 'dataset' | 'task' | 'command'

export type SearchResult = {
  type: SearchResultType
  id: string
  title: string
  subtitle?: string
  extra?: string
  icon?: React.ReactNode
}

type GlobalSearchProps = {
  open: boolean
  onClose: () => void
}

// 类型图标映射
const TYPE_ICONS: Record<RecentItem['type'], React.ReactNode> = {
  prompt: <FileTextOutlined />,
  dataset: <DatabaseOutlined />,
  task: <ThunderboltOutlined />,
  model: <ApiOutlined />,
  evaluator: <ExperimentOutlined />,
  page: <DashboardOutlined />,
}

// 快捷命令
type QuickCommand = {
  id: string
  name: string
  description?: string
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  category: 'create' | 'navigate' | 'settings'
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const { recentItems, addRecentItem, clearRecentItems } = useCommandStore()
  const modKey = getModifierKey()

  // 导航并记录
  const navigateTo = useCallback(
    (href: string, item?: Omit<RecentItem, 'timestamp'>) => {
      if (item) {
        addRecentItem(item)
      }
      router.push(href)
      onClose()
      setQuery('')
    },
    [router, onClose, addRecentItem]
  )

  // 快捷命令列表
  const quickCommands: QuickCommand[] = useMemo(() => [
    // 创建类
    {
      id: 'new-task',
      name: '新建测试任务',
      description: '创建一个新的测试任务',
      shortcut: `${modKey}+N`,
      icon: <ThunderboltOutlined />,
      action: () => navigateTo('/tasks/new', { id: 'new-task', type: 'page', title: '新建任务', href: '/tasks/new' }),
      category: 'create',
    },
    {
      id: 'new-ab-test',
      name: '新建 A/B 测试',
      description: '创建一个 A/B 对比测试',
      icon: <SplitCellsOutlined />,
      action: () => navigateTo('/tasks/new?type=ab', { id: 'new-ab', type: 'page', title: '新建A/B测试', href: '/tasks/new?type=ab' }),
      category: 'create',
    },
    {
      id: 'new-prompt',
      name: '新建提示词',
      description: '创建一个新的提示词',
      icon: <FileTextOutlined />,
      action: () => navigateTo('/prompts/new', { id: 'new-prompt', type: 'page', title: '新建提示词', href: '/prompts/new' }),
      category: 'create',
    },
    {
      id: 'upload-dataset',
      name: '上传数据集',
      description: '上传新的测试数据集',
      icon: <UploadOutlined />,
      action: () => navigateTo('/datasets?action=upload', { id: 'upload-dataset', type: 'page', title: '上传数据集', href: '/datasets?action=upload' }),
      category: 'create',
    },
    {
      id: 'add-model',
      name: '添加模型提供商',
      description: '配置新的 AI 模型提供商',
      icon: <ApiOutlined />,
      action: () => navigateTo('/models?action=add', { id: 'add-model', type: 'page', title: '添加模型', href: '/models?action=add' }),
      category: 'create',
    },
    {
      id: 'new-evaluator',
      name: '新建评估器',
      description: '创建自定义评估器',
      icon: <PlusOutlined />,
      action: () => navigateTo('/evaluators/new', { id: 'new-evaluator', type: 'page', title: '新建评估器', href: '/evaluators/new' }),
      category: 'create',
    },
    // 导航类
    {
      id: 'go-home',
      name: '前往工作台',
      shortcut: 'G H',
      icon: <DashboardOutlined />,
      action: () => navigateTo('/', { id: 'home', type: 'page', title: '工作台', href: '/' }),
      category: 'navigate',
    },
    {
      id: 'go-prompts',
      name: '前往提示词管理',
      shortcut: 'G P',
      icon: <FileTextOutlined />,
      action: () => navigateTo('/prompts', { id: 'prompts', type: 'page', title: '提示词管理', href: '/prompts' }),
      category: 'navigate',
    },
    {
      id: 'go-datasets',
      name: '前往数据集',
      shortcut: 'G D',
      icon: <DatabaseOutlined />,
      action: () => navigateTo('/datasets', { id: 'datasets', type: 'page', title: '数据集', href: '/datasets' }),
      category: 'navigate',
    },
    {
      id: 'go-models',
      name: '前往模型配置',
      shortcut: 'G M',
      icon: <ApiOutlined />,
      action: () => navigateTo('/models', { id: 'models', type: 'page', title: '模型配置', href: '/models' }),
      category: 'navigate',
    },
    {
      id: 'go-evaluators',
      name: '前往评估器',
      shortcut: 'G E',
      icon: <ExperimentOutlined />,
      action: () => navigateTo('/evaluators', { id: 'evaluators', type: 'page', title: '评估器', href: '/evaluators' }),
      category: 'navigate',
    },
    {
      id: 'go-tasks',
      name: '前往测试任务',
      shortcut: 'G T',
      icon: <ThunderboltOutlined />,
      action: () => navigateTo('/tasks', { id: 'tasks', type: 'page', title: '测试任务', href: '/tasks' }),
      category: 'navigate',
    },
    {
      id: 'go-comparison',
      name: '前往对比分析',
      icon: <SwapOutlined />,
      action: () => navigateTo('/comparison/versions', { id: 'comparison', type: 'page', title: '对比分析', href: '/comparison/versions' }),
      category: 'navigate',
    },
    {
      id: 'go-scheduled',
      name: '前往定时任务',
      icon: <ClockCircleOutlined />,
      action: () => navigateTo('/scheduled', { id: 'scheduled', type: 'page', title: '定时任务', href: '/scheduled' }),
      category: 'navigate',
    },
    // 设置类
    {
      id: 'go-settings',
      name: '打开设置',
      shortcut: `${modKey}+,`,
      icon: <SettingOutlined />,
      action: () => navigateTo('/settings', { id: 'settings', type: 'page', title: '设置', href: '/settings' }),
      category: 'settings',
    },
  ], [modKey, navigateTo])

  // 搜索逻辑
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=10`
      )
      const data = await response.json()

      if (data.code === 200 && data.data) {
        const searchResults: SearchResult[] = []

        // 处理提示词结果
        if (data.data.prompts?.length) {
          data.data.prompts.forEach((p: { id: string; name: string; description?: string; currentVersion?: number }) => {
            searchResults.push({
              type: 'prompt',
              id: p.id,
              title: p.name,
              subtitle: p.description,
              extra: p.currentVersion ? `v${p.currentVersion}` : undefined,
            })
          })
        }

        // 处理数据集结果
        if (data.data.datasets?.length) {
          data.data.datasets.forEach((d: { id: string; name: string; description?: string; rowCount?: number }) => {
            searchResults.push({
              type: 'dataset',
              id: d.id,
              title: d.name,
              subtitle: d.description,
              extra: d.rowCount ? `${d.rowCount} 行` : undefined,
            })
          })
        }

        // 处理任务结果
        if (data.data.tasks?.length) {
          data.data.tasks.forEach((t: { id: string; name: string; status?: string }) => {
            searchResults.push({
              type: 'task',
              id: t.id,
              title: t.name,
              extra: t.status,
            })
          })
        }

        setResults(searchResults)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // 处理搜索结果选择
  const handleSelectResult = useCallback((result: SearchResult) => {
    const href = `/${result.type}s/${result.id}`
    navigateTo(href, {
      id: result.id,
      type: result.type === 'command' ? 'page' : result.type,
      title: result.title,
      href,
    })
  }, [navigateTo])

  // 重置状态
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  // ESC 关闭
  useHotkeys(
    [{ key: 'escape', callback: onClose }],
    { enabled: open }
  )

  if (!open) return null

  const hasQuery = query.trim().length > 0
  const showRecent = !hasQuery && recentItems.length > 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <Command
        className={styles.command}
        onClick={(e) => e.stopPropagation()}
        shouldFilter={!hasQuery}
        loop
      >
        <div className={styles.inputWrapper}>
          <SearchOutlined className={styles.searchIcon} />
          <Command.Input
            placeholder="搜索提示词、数据集、任务，或输入命令..."
            value={query}
            onValueChange={setQuery}
            className={styles.input}
            autoFocus
          />
          <Tag className={styles.shortcut}>{modKey}+K</Tag>
        </div>

        <Command.List className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <Spin size="small" />
              <span>搜索中...</span>
            </div>
          )}

          <Command.Empty className={styles.empty}>
            {hasQuery ? '未找到相关结果' : '输入关键词搜索'}
          </Command.Empty>

          {/* 搜索结果 */}
          {hasQuery && results.length > 0 && (
            <>
              {results.some(r => r.type === 'prompt') && (
                <Command.Group heading="提示词" className={styles.group}>
                  {results.filter(r => r.type === 'prompt').map(result => (
                    <Command.Item
                      key={result.id}
                      value={`search-${result.title}`}
                      onSelect={() => handleSelectResult(result)}
                      className={styles.item}
                    >
                      <span className={styles.itemIcon}><FileTextOutlined /></span>
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>{result.title}</span>
                        {result.subtitle && (
                          <span className={styles.itemSubtitle}>{result.subtitle}</span>
                        )}
                      </div>
                      {result.extra && <Tag className={styles.itemExtra}>{result.extra}</Tag>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {results.some(r => r.type === 'dataset') && (
                <Command.Group heading="数据集" className={styles.group}>
                  {results.filter(r => r.type === 'dataset').map(result => (
                    <Command.Item
                      key={result.id}
                      value={`search-${result.title}`}
                      onSelect={() => handleSelectResult(result)}
                      className={styles.item}
                    >
                      <span className={styles.itemIcon}><DatabaseOutlined /></span>
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>{result.title}</span>
                        {result.subtitle && (
                          <span className={styles.itemSubtitle}>{result.subtitle}</span>
                        )}
                      </div>
                      {result.extra && <Tag className={styles.itemExtra}>{result.extra}</Tag>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {results.some(r => r.type === 'task') && (
                <Command.Group heading="任务" className={styles.group}>
                  {results.filter(r => r.type === 'task').map(result => (
                    <Command.Item
                      key={result.id}
                      value={`search-${result.title}`}
                      onSelect={() => handleSelectResult(result)}
                      className={styles.item}
                    >
                      <span className={styles.itemIcon}><ThunderboltOutlined /></span>
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>{result.title}</span>
                      </div>
                      {result.extra && <Tag className={styles.itemExtra}>{result.extra}</Tag>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {/* 最近使用 */}
          {showRecent && (
            <Command.Group heading="最近使用" className={styles.group}>
              {recentItems.slice(0, 5).map((item) => (
                <Command.Item
                  key={item.id}
                  value={`recent-${item.title}`}
                  onSelect={() => navigateTo(item.href, item)}
                  className={styles.item}
                >
                  <span className={styles.itemIcon}>
                    <HistoryOutlined />
                  </span>
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>{item.title}</span>
                  </div>
                  <span className={styles.itemType}>{TYPE_ICONS[item.type]}</span>
                </Command.Item>
              ))}
              <Command.Item
                value="clear-recent"
                onSelect={() => clearRecentItems()}
                className={styles.item}
              >
                <span className={styles.itemIcon}><DeleteOutlined /></span>
                <span className={styles.itemTitle}>清除最近记录</span>
              </Command.Item>
            </Command.Group>
          )}

          {/* 快捷操作 */}
          {!hasQuery && (
            <>
              <Command.Group heading="创建" className={styles.group}>
                {quickCommands.filter(c => c.category === 'create').map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.name}
                    onSelect={cmd.action}
                    className={styles.item}
                  >
                    <span className={styles.itemIcon}>{cmd.icon}</span>
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>{cmd.name}</span>
                      {cmd.description && (
                        <span className={styles.itemSubtitle}>{cmd.description}</span>
                      )}
                    </div>
                    {cmd.shortcut && <Tag className={styles.shortcut}>{cmd.shortcut}</Tag>}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="导航" className={styles.group}>
                {quickCommands.filter(c => c.category === 'navigate').map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.name}
                    onSelect={cmd.action}
                    className={styles.item}
                  >
                    <span className={styles.itemIcon}>{cmd.icon}</span>
                    <span className={styles.itemTitle}>{cmd.name}</span>
                    {cmd.shortcut && <Tag className={styles.shortcut}>{cmd.shortcut}</Tag>}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="设置" className={styles.group}>
                {quickCommands.filter(c => c.category === 'settings').map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.name}
                    onSelect={cmd.action}
                    className={styles.item}
                  >
                    <span className={styles.itemIcon}>{cmd.icon}</span>
                    <span className={styles.itemTitle}>{cmd.name}</span>
                    {cmd.shortcut && <Tag className={styles.shortcut}>{cmd.shortcut}</Tag>}
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}
        </Command.List>

        <div className={styles.footer}>
          <div className={styles.footerItem}>
            <Tag>↑↓</Tag>
            <span>导航</span>
          </div>
          <div className={styles.footerItem}>
            <Tag>Enter</Tag>
            <span>选择</span>
          </div>
          <div className={styles.footerItem}>
            <Tag>Esc</Tag>
            <span>关闭</span>
          </div>
        </div>
      </Command>
    </div>
  )
}
