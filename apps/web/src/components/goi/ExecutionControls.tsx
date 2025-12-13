'use client'

/**
 * GOI 执行控制按钮组件
 *
 * 功能：
 * - 暂停/继续执行
 * - 接管/交还控制权
 * - 取消任务
 */

import { useState, useCallback } from 'react'
import { Button, Space, Tooltip, Modal, message } from 'antd'
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  UserSwitchOutlined,
  StopOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { usePauseStore } from '@/lib/goi/execution/pauseController'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import {
  useControlStore,
  takeoverControl,
  handbackControl,
} from '@/lib/goi/execution/controlTransfer'
import { cancelTask, abortTask } from '@/lib/goi/execution/taskCancel'
import styles from './ExecutionControls.module.css'

// ============================================
// 类型定义
// ============================================

export type ExecutionControlsProps = {
  /** 会话 ID */
  sessionId?: string
  /** 继续执行回调 */
  onResume?: () => void
  /** 接管回调 */
  onTakeover?: () => void
  /** 交还回调 */
  onHandback?: (actions: unknown[]) => void
  /** 取消回调 */
  onCancel?: () => void
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical'
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large'
}

// ============================================
// 组件
// ============================================

export function ExecutionControls({
  sessionId = 'default',
  onResume,
  onTakeover,
  onHandback,
  onCancel,
  direction = 'horizontal',
  size = 'middle',
}: ExecutionControlsProps) {
  const [cancelling, setCancelling] = useState(false)

  // 状态
  const { status } = useExecutionStore()
  const { isPaused, isPausing, requestPause, resume } = usePauseStore()
  const { holder } = useControlStore()

  // 计算按钮状态
  const isRunning = status === 'executing'
  const canPause = isRunning && !isPausing
  const canResume = isPaused && holder === 'ai'
  const canTakeover = isPaused && holder === 'ai'
  const canHandback = holder === 'user'
  const canCancel = isRunning || isPaused || status === 'checkpoint' || status === 'ready'

  // 暂停处理
  const handlePause = useCallback(async () => {
    await requestPause('user_request')
  }, [requestPause])

  // 继续处理
  const handleResume = useCallback(() => {
    resume()
    onResume?.()
  }, [resume, onResume])

  // 接管处理
  const handleTakeover = useCallback(() => {
    takeoverControl()
    onTakeover?.()
    message.info('已接管控制权，您现在可以手动操作')
  }, [onTakeover])

  // 交还处理
  const handleHandback = useCallback(() => {
    const actions = handbackControl()
    onHandback?.(actions)
    message.success('已交还控制权给 AI')
  }, [onHandback])

  // 取消处理
  const handleCancel = useCallback(() => {
    Modal.confirm({
      title: '确定要取消任务吗？',
      content: '取消后将尝试回滚到任务开始前的状态。此操作不可撤销。',
      okText: '确定取消',
      cancelText: '继续执行',
      okButtonProps: { danger: true },
      onOk: async () => {
        setCancelling(true)
        try {
          const result = await cancelTask(sessionId)
          if (result.success) {
            if (result.rollbackResult?.restored) {
              message.success('任务已取消并回滚')
            } else {
              message.warning('任务已取消，但无法回滚（可能没有可用的快照）')
            }
            onCancel?.()
          } else {
            message.error(`取消失败: ${result.error}`)
          }
        } finally {
          setCancelling(false)
        }
      },
    })
  }, [sessionId, onCancel])

  // 中止处理（不回滚）
  const handleAbort = useCallback(() => {
    Modal.confirm({
      title: '确定要中止任务吗？',
      content: '中止将立即停止执行，但不会回滚已完成的操作。',
      okText: '中止',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        abortTask('用户中止')
        message.warning('任务已中止')
        onCancel?.()
      },
    })
  }, [onCancel])

  // 如果处于空闲或完成状态，不显示控制按钮
  if (status === 'idle' || status === 'completed' || status === 'failed' || status === 'aborted') {
    return null
  }

  return (
    <div className={`${styles.container} ${direction === 'vertical' ? styles.vertical : ''}`}>
      <Space direction={direction} size="small">
        {/* 暂停按钮 */}
        {canPause && (
          <Tooltip title="暂停执行（当前操作完成后暂停）">
            <Button
              icon={isPausing ? <LoadingOutlined /> : <PauseCircleOutlined />}
              onClick={handlePause}
              loading={isPausing}
              size={size}
            >
              {isPausing ? '暂停中...' : '暂停'}
            </Button>
          </Tooltip>
        )}

        {/* 继续按钮 */}
        {canResume && (
          <Tooltip title="继续执行">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleResume}
              size={size}
            >
              继续
            </Button>
          </Tooltip>
        )}

        {/* 接管按钮 */}
        {canTakeover && (
          <Tooltip title="接管控制权，手动操作">
            <Button
              icon={<UserSwitchOutlined />}
              onClick={handleTakeover}
              size={size}
            >
              我来操作
            </Button>
          </Tooltip>
        )}

        {/* 交还按钮 */}
        {canHandback && (
          <Tooltip title="交还控制权给 AI 继续执行">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleHandback}
              size={size}
            >
              交给 AI
            </Button>
          </Tooltip>
        )}

        {/* 取消按钮 */}
        {canCancel && (
          <Tooltip title="取消任务并回滚">
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleCancel}
              loading={cancelling}
              size={size}
            >
              取消
            </Button>
          </Tooltip>
        )}
      </Space>

      {/* 状态提示 */}
      {isPausing && (
        <div className={styles.statusHint}>
          正在暂停，等待当前操作完成...
        </div>
      )}

      {holder === 'user' && (
        <div className={styles.statusHint}>
          <UserSwitchOutlined style={{ marginRight: 4 }} />
          你正在控制，完成后点击"交给 AI"继续
        </div>
      )}
    </div>
  )
}

export default ExecutionControls
