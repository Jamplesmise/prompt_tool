'use client'

/**
 * TODO List 可视化组件
 *
 * 优化展示：
 * - 按阶段分组
 * - 用户友好的标签
 * - 进度条和剩余时间
 * - 关键步骤高亮
 */

import React, { useState, useMemo } from 'react'
import { Card, Progress, Typography, Tooltip, Empty, Button, Space, Tag } from 'antd'
import {
  CheckCircleFilled,
  SyncOutlined,
  ClockCircleOutlined,
  CloseCircleFilled,
  MinusCircleOutlined,
  UnorderedListOutlined,
  DownOutlined,
  RightOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepForwardOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { useCopilot } from '../hooks/useCopilot'
import { generateDisplayData, autoCollapseGroups, toggleGroupCollapse } from '@/lib/goi/todo/groupGenerator'
import { formatTime } from '@/lib/goi/todo/progress'
import type { TodoGroup, DisplayTodoItem, TodoDisplayData } from '@/lib/goi/todo/displayTypes'
import type { TodoItemStatus } from '@platform/shared'
import styles from './styles.module.css'

const { Text } = Typography

// ============================================
// 状态配置
// ============================================

const STATUS_CONFIG: Record<
  TodoItemStatus,
  { icon: React.ReactNode; color: string; label: string }
> = {
  completed: {
    icon: <CheckCircleFilled />,
    color: '#52c41a',
    label: '已完成',
  },
  in_progress: {
    icon: <SyncOutlined spin />,
    color: '#1677ff',
    label: '进行中',
  },
  waiting: {
    icon: <ClockCircleOutlined />,
    color: '#faad14',
    label: '等待中',
  },
  pending: {
    icon: <ClockCircleOutlined />,
    color: '#8c8c8c',
    label: '待执行',
  },
  failed: {
    icon: <CloseCircleFilled />,
    color: '#ff4d4f',
    label: '失败',
  },
  skipped: {
    icon: <MinusCircleOutlined />,
    color: '#8c8c8c',
    label: '已跳过',
  },
  replanned: {
    icon: <SyncOutlined />,
    color: '#722ed1',
    label: '已重规划',
  },
}

// ============================================
// 子组件：单个 TODO 项
// ============================================

type TodoItemViewProps = {
  item: DisplayTodoItem
  onClick?: () => void
}

const TodoItemView: React.FC<TodoItemViewProps> = ({ item, onClick }) => {
  const config = STATUS_CONFIG[item.status]

  return (
    <div
      className={`${styles.todoItem} ${styles[`status_${item.status}`] || ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      data-testid="todo-item"
      data-status={item.status}
    >
      <Tooltip title={config.label}>
        <span style={{ color: config.color }} className={styles.todoItemIcon}>
          {config.icon}
        </span>
      </Tooltip>
      <div className={styles.todoItemContent}>
        <span
          className={`${styles.todoItemTitle} ${
            item.status === 'completed' ? styles.completed : ''
          }`}
        >
          {item.userLabel}
        </span>
        {item.valueLabel && (
          <span className={styles.todoValueLabel}>{item.valueLabel}</span>
        )}
        {item.hint && <div className={styles.todoHint}>{item.hint}</div>}
      </div>
      {item.isKeyStep && (
        <Tag color="gold" className={styles.keyBadge}>
          关键
        </Tag>
      )}
    </div>
  )
}

// ============================================
// 子组件：分组
// ============================================

type TodoGroupViewProps = {
  group: TodoGroup
  onToggle: () => void
  onItemClick?: (itemId: string) => void
}

const TodoGroupView: React.FC<TodoGroupViewProps> = ({
  group,
  onToggle,
  onItemClick,
}) => {
  const completedCount = group.items.filter(
    (i) => i.status === 'completed' || i.status === 'skipped'
  ).length
  const hasInProgress = group.items.some((i) => i.status === 'in_progress')
  const hasFailed = group.items.some((i) => i.status === 'failed')

  return (
    <div className={styles.todoGroup}>
      <div className={styles.groupHeader} onClick={onToggle}>
        <span className={styles.groupEmoji}>{group.emoji}</span>
        <span className={styles.groupName}>{group.name}</span>
        <span className={styles.groupCount}>
          [{completedCount}/{group.items.length}]
        </span>
        {hasInProgress && (
          <SyncOutlined spin style={{ color: '#1677ff', marginLeft: 4 }} />
        )}
        {hasFailed && (
          <ExclamationCircleFilled style={{ color: '#ff4d4f', marginLeft: 4 }} />
        )}
        <span className={styles.collapseIcon}>
          {group.collapsed ? <RightOutlined /> : <DownOutlined />}
        </span>
      </div>

      {!group.collapsed && (
        <div className={styles.groupItems}>
          {group.items.map((item) => (
            <TodoItemView
              key={item.id}
              item={item}
              onClick={onItemClick ? () => onItemClick(item.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// 主组件
// ============================================

export const TodoListView: React.FC = () => {
  const {
    todoList,
    isLoading,
    mode,
    executeStep,
    pauseExecution,
    resumeExecution,
    runExecution,
  } = useCopilot()

  // 将 todoList 转换为展示数据
  const displayData = useMemo<TodoDisplayData | null>(() => {
    if (!todoList || todoList.items.length === 0) return null
    const data = generateDisplayData(todoList)
    return {
      ...data,
      groups: autoCollapseGroups(data.groups),
    }
  }, [todoList])

  // 分组折叠状态
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string) => {
    setGroupStates((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // 获取分组的实际折叠状态
  const getGroupCollapsed = (group: TodoGroup): boolean => {
    if (group.id in groupStates) {
      return groupStates[group.id]
    }
    return group.collapsed
  }

  // 控制按钮状态
  const canStep = todoList && todoList.status !== 'completed' && todoList.status !== 'failed'
  const isRunning = todoList?.status === 'running'
  const isPaused = todoList?.status === 'paused'
  const isReady = todoList?.status === 'ready'
  const canStartExecution = isReady && !isRunning && todoList && todoList.completedItems === 0

  // 空状态
  if (!displayData) {
    return (
      <Card
        size="small"
        title={
          <span>
            <UnorderedListOutlined style={{ marginRight: 8 }} />
            任务计划
          </span>
        }
        className={styles.todoCard}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无任务"
          style={{ padding: '12px 0' }}
        />
      </Card>
    )
  }

  return (
    <Card
      size="small"
      title={
        <div className={styles.todoHeader}>
          <span>
            <UnorderedListOutlined style={{ marginRight: 8 }} />
            {displayData.title}
          </span>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
            预计 {formatTime(displayData.estimatedTotalSeconds)}
          </Text>
        </div>
      }
      className={styles.todoCard}
    >
      {/* 进度条 */}
      <div className={styles.todoProgress}>
        <Progress
          percent={displayData.progress}
          size="small"
          status={
            todoList?.status === 'failed'
              ? 'exception'
              : todoList?.status === 'completed'
              ? 'success'
              : 'active'
          }
          format={(percent) => (
            <span style={{ fontSize: 12 }}>
              {percent}% | 剩余 {formatTime(displayData.estimatedRemainingSeconds)}
            </span>
          )}
        />
      </div>

      {/* 执行控制按钮 */}
      {canStep && (
        <div style={{ marginBottom: 12 }}>
          <Space size="small">
            {canStartExecution && mode !== 'auto' && (
              <Tooltip title="审核计划后，点击开始执行所有任务">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={runExecution}
                  loading={isLoading}
                >
                  开始执行
                </Button>
              </Tooltip>
            )}
            {mode === 'manual' && !canStartExecution && (
              <Tooltip title="执行下一步">
                <Button
                  type="primary"
                  size="small"
                  icon={<StepForwardOutlined />}
                  onClick={executeStep}
                  loading={isLoading}
                  disabled={isRunning}
                >
                  下一步
                </Button>
              </Tooltip>
            )}
            {isRunning && (
              <Tooltip title="暂停执行">
                <Button size="small" icon={<PauseCircleOutlined />} onClick={pauseExecution}>
                  暂停
                </Button>
              </Tooltip>
            )}
            {isPaused && (
              <Tooltip title="继续执行">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={resumeExecution}
                  loading={isLoading}
                >
                  继续
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      )}

      {/* 分组列表 */}
      <div className={styles.todoGroupList} data-testid="todo-list">
        {displayData.groups.map((group) => (
          <TodoGroupView
            key={group.id}
            group={{
              ...group,
              collapsed: getGroupCollapsed(group),
            }}
            onToggle={() => toggleGroup(group.id)}
          />
        ))}
      </div>

      {/* 当前执行项提示 */}
      {todoList &&
        todoList.currentItemIndex >= 0 &&
        todoList.currentItemIndex < todoList.items.length && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前：{todoList.items[todoList.currentItemIndex]?.title}
            </Text>
          </div>
        )}
    </Card>
  )
}

export default TodoListView
