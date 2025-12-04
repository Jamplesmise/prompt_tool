'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Modal, Input, Spin, Empty, Typography, Tag } from 'antd'
import type { InputRef } from 'antd'
import {
  SearchOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useHotkeys, getModifierKey } from '@/hooks/useHotkeys'
import styles from './GlobalSearch.module.css'

const { Text } = Typography

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
const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  prompt: <FileTextOutlined />,
  dataset: <DatabaseOutlined />,
  task: <ThunderboltOutlined />,
  command: <RightOutlined />,
}

// 类型标签映射
const TYPE_LABELS: Record<SearchResultType, string> = {
  prompt: '提示词',
  dataset: '数据集',
  task: '任务',
  command: '命令',
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<InputRef>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const modKey = getModifierKey()

  // 是否为命令模式
  const isCommandMode = query.startsWith('>')

  // 搜索逻辑
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.startsWith('>')) {
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
        setSelectedIndex(0)
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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim() || isCommandMode) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, isCommandMode, performSearch])

  // 按类型分组结果
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      prompt: [],
      dataset: [],
      task: [],
      command: [],
    }

    results.forEach(result => {
      groups[result.type].push(result)
    })

    return groups
  }, [results])

  // 扁平化结果用于键盘导航
  const flatResults = useMemo(() => {
    return results
  }, [results])

  // 处理选择
  const handleSelect = useCallback((result: SearchResult) => {
    onClose()
    setQuery('')

    switch (result.type) {
      case 'prompt':
        router.push(`/prompts/${result.id}`)
        break
      case 'dataset':
        router.push(`/datasets/${result.id}`)
        break
      case 'task':
        router.push(`/tasks/${result.id}`)
        break
    }
  }, [onClose, router])

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < flatResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [flatResults, selectedIndex, handleSelect, onClose])

  // 滚动选中项到可视区域
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // ESC 关闭
  useHotkeys(
    [{ key: 'escape', callback: onClose }],
    { enabled: open }
  )

  // 渲染搜索结果
  const renderResults = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <Spin size="small" />
          <span>搜索中...</span>
        </div>
      )
    }

    if (isCommandMode) {
      return (
        <div className={styles.hint}>
          <Text type="secondary">输入命令名称，或按 Backspace 返回搜索</Text>
        </div>
      )
    }

    if (!query.trim()) {
      return (
        <div className={styles.hint}>
          <Text type="secondary">
            输入关键词搜索提示词、数据集、任务
          </Text>
          <Text type="secondary" className={styles.commandHint}>
            输入 <Tag>&gt;</Tag> 进入命令模式
          </Text>
        </div>
      )
    }

    if (results.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="未找到相关结果"
          className={styles.empty}
        />
      )
    }

    let globalIndex = 0

    return (
      <div className={styles.results} ref={listRef}>
        {(['prompt', 'dataset', 'task'] as SearchResultType[]).map(type => {
          const items = groupedResults[type]
          if (items.length === 0) return null

          return (
            <div key={type} className={styles.group}>
              <div className={styles.groupHeader}>
                {TYPE_ICONS[type]}
                <span>{TYPE_LABELS[type]}</span>
              </div>
              {items.map(item => {
                const currentIndex = globalIndex++
                const isSelected = currentIndex === selectedIndex

                return (
                  <div
                    key={item.id}
                    data-index={currentIndex}
                    className={`${styles.resultItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                  >
                    <div className={styles.resultContent}>
                      <div className={styles.resultTitle}>{item.title}</div>
                      {item.subtitle && (
                        <div className={styles.resultSubtitle}>{item.subtitle}</div>
                      )}
                    </div>
                    {item.extra && (
                      <Tag className={styles.resultExtra}>{item.extra}</Tag>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={600}
      className={styles.modal}
      styles={{ body: { padding: 0 } }}
      centered
    >
      <div className={styles.container}>
        <div className={styles.inputWrapper}>
          <SearchOutlined className={styles.searchIcon} />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索提示词、数据集、任务..."
            variant="borderless"
            className={styles.input}
          />
          <Tag className={styles.shortcut}>
            {modKey}+K 关闭
          </Tag>
        </div>
        <div className={styles.content}>
          {renderResults()}
        </div>
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
      </div>
    </Modal>
  )
}
