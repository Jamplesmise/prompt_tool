'use client'

/**
 * AI Copilot 面板 - 主面板组件
 *
 * 功能：
 * - 可拖拽、可调整大小的悬浮窗口
 * - 展示 AI 理解状态
 * - TODO List 进度
 * - 检查点确认
 * - 模式切换
 * - 模型配置（存储在 Zustand store 中）
 */

import React, { useState, useCallback, useEffect } from 'react'
import { FloatButton, Divider, Space, Tag } from 'antd'
import {
  RobotOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { FloatingWindow } from './FloatingWindow'
import { CurrentUnderstanding } from './CurrentUnderstanding'
import { TodoListView } from './TodoListView'
import { CheckpointSection } from './CheckpointSection'
import { ContextIndicator } from './ContextIndicator'
import { ModeSelector } from './ModeSelector'
import { CommandInput } from './CommandInput'
import { ModelConfig } from './ModelConfig'
import { useCopilot } from '../hooks/useCopilot'
import { useResourceCreationDetector } from '../hooks/useResourceCreationDetector'
import { ExecutionControls } from '../ExecutionControls'
import { PauseStatusPanel } from '../PauseStatusPanel'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import { usePauseStore } from '@/lib/goi/execution/pauseController'
import styles from './styles.module.css'

export type CopilotPanelProps = {
  /** 默认是否打开 */
  defaultOpen?: boolean
  /** 是否显示悬浮按钮 */
  showFloatButton?: boolean
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  defaultOpen = false,
  showFloatButton = true,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const [isPinned, setIsPinned] = useState(false)

  const {
    sessionId,
    isConnected,
    pendingCheckpoint,
    todoList,
    contextUsage,
    isLoading,
    runExecution,
  } = useCopilot()

  // 自动检测资源创建完成
  useResourceCreationDetector()

  // 监听继续执行事件
  useEffect(() => {
    const handleContinueExecution = () => {
      console.log('[CopilotPanel] Received goi:continueExecution event')
      runExecution()
    }

    window.addEventListener('goi:continueExecution', handleContinueExecution)
    return () => {
      window.removeEventListener('goi:continueExecution', handleContinueExecution)
    }
  }, [runExecution])

  // 执行状态
  const { status: executionStatus } = useExecutionStore()
  const { isPaused } = usePauseStore()

  // 是否正在执行任务
  const isExecuting = executionStatus === 'executing' || executionStatus === 'checkpoint'

  const handleOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (!isPinned) {
      setOpen(false)
    }
  }, [isPinned])

  const handlePinnedChange = useCallback((pinned: boolean) => {
    setIsPinned(pinned)
  }, [])

  // 计算待处理检查点数量
  const pendingCount = pendingCheckpoint ? 1 : 0

  // 判断连接状态显示
  // 只有当有 sessionId 且未连接时才显示"未连接"
  // 没有 sessionId 时显示"待命中"
  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <SyncOutlined spin className={styles.statusConnected} />,
        text: '处理中...',
        color: 'processing' as const,
      }
    }
    if (!sessionId) {
      return {
        icon: <RobotOutlined style={{ color: '#1890ff' }} />,
        text: '待命中',
        color: 'default' as const,
      }
    }
    if (isConnected) {
      return {
        icon: <CheckCircleOutlined className={styles.statusConnected} />,
        text: '已连接',
        color: 'success' as const,
      }
    }
    return {
      icon: <ExclamationCircleOutlined className={styles.statusDisconnected} />,
      text: '连接中...',
      color: 'warning' as const,
    }
  }

  const statusInfo = getStatusInfo()

  // 状态栏内容
  const statusBar = (
    <Space size="small">
      <Tag icon={statusInfo.icon} color={statusInfo.color}>
        {statusInfo.text}
      </Tag>
      {todoList && (
        <Tag color="blue">
          {todoList.completedItems}/{todoList.totalItems} 任务
        </Tag>
      )}
    </Space>
  )

  // 底部内容
  const footer = (
    <div>
      <CommandInput />
      <ModeSelector />
    </div>
  )

  return (
    <>
      {/* 悬浮开关按钮 */}
      {showFloatButton && !open && (
        <FloatButton
          icon={<RobotOutlined />}
          type={pendingCount > 0 ? 'primary' : 'default'}
          badge={{ count: pendingCount, color: 'red' }}
          tooltip="AI Copilot"
          onClick={handleOpen}
          className={styles.floatButton}
          data-testid="copilot-toggle"
        />
      )}

      {/* 悬浮窗口 */}
      <FloatingWindow
        title="AI Copilot"
        icon={<RobotOutlined />}
        visible={open}
        onClose={handleClose}
        defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 420 : 100, y: 80 }}
        defaultSize={{ width: 400, height: 650 }}
        minWidth={320}
        minHeight={450}
        maxWidth={700}
        maxHeight={900}
        pinned={isPinned}
        onPinnedChange={handlePinnedChange}
        footer={footer}
        statusBar={statusBar}
      >
        <div className={styles.panelContent}>
          {/* 执行控制按钮 - 正在执行或暂停时显示 */}
          {(isExecuting || isPaused) && (
            <>
              <ExecutionControls
                sessionId={sessionId || 'default'}
                size="small"
              />
              <Divider className={styles.divider} />
            </>
          )}

          {/* 暂停状态面板 - 暂停时显示 */}
          {isPaused && (
            <PauseStatusPanel
              onResume={() => usePauseStore.getState().resume()}
              onTakeover={() => {
                /* 接管逻辑由 ExecutionControls 处理 */
              }}
              onCancel={() => {
                /* 取消逻辑由 ExecutionControls 处理 */
              }}
            />
          )}

          {/* 模型配置 - 使用 Zustand store 管理状态 */}
          <ModelConfig />

          <Divider className={styles.divider} />

          {/* 当前理解 */}
          <CurrentUnderstanding />

          <Divider className={styles.divider} />

          {/* TODO 列表 */}
          <TodoListView />

          {/* 检查点区域 */}
          {pendingCheckpoint && (
            <>
              <Divider className={styles.divider} />
              <CheckpointSection />
            </>
          )}

          <Divider className={styles.divider} />

          {/* 上下文指示器 */}
          <ContextIndicator usage={contextUsage} />
        </div>
      </FloatingWindow>
    </>
  )
}

export default CopilotPanel
