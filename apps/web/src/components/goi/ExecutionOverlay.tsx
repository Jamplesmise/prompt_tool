'use client'

import { useEffect, useState } from 'react'
import { OperationHighlight } from './OperationHighlight'
import { ActionBubble } from './ActionBubble'
import {
  useExecutionStore,
  useVisualization,
  useExecutionStatus,
} from '@/lib/goi/execution/progressSync'
import { speedController } from '@/lib/goi/execution/speedControl'

/**
 * 执行可视化覆盖层
 *
 * 在页面上显示高亮效果和操作说明气泡，
 * 让用户能够看到 AI 正在执行的每一步操作
 */
export function ExecutionOverlay() {
  const { highlightTarget, actionMessage, actionIcon, showClickEffect } =
    useVisualization()
  const status = useExecutionStatus()
  const [bubbleDuration, setBubbleDuration] = useState<number | undefined>(
    undefined
  )

  // 根据执行速度更新气泡显示时间
  useEffect(() => {
    const config = speedController.getConfig()
    setBubbleDuration(
      config.bubbleDuration > 0 ? config.bubbleDuration : undefined
    )
  }, [status])

  // 只在执行状态下显示
  const isExecuting = status === 'executing' || status === 'checkpoint'

  // 清理点击效果
  const handleClickEffectEnd = () => {
    useExecutionStore.getState().hideClick()
  }

  return (
    <>
      {/* 目标元素高亮 */}
      <OperationHighlight
        targetSelector={highlightTarget || undefined}
        isActive={isExecuting && !!highlightTarget}
        showClickEffect={showClickEffect}
        onClickEffectEnd={handleClickEffectEnd}
      />

      {/* 操作说明气泡 */}
      <ActionBubble
        targetSelector={highlightTarget || undefined}
        message={actionMessage || ''}
        icon={actionIcon}
        isVisible={isExecuting && !!actionMessage}
        autoHide={bubbleDuration}
        position="auto"
        theme="dark"
      />
    </>
  )
}

/**
 * 执行进度面板组件
 *
 * 显示当前执行进度和步骤状态
 */
export function ExecutionProgressPanel() {
  const { plan, progress, status, currentStepId, error } = useExecutionStore()

  if (!plan || status === 'idle') return null

  // 获取状态样式
  const getStatusStyle = (
    stepStatus: string,
    isCurrent: boolean
  ): React.CSSProperties => {
    if (isCurrent) {
      return { color: '#3b82f6', fontWeight: 600 }
    }

    switch (stepStatus) {
      case 'completed':
        return { color: '#22c55e' }
      case 'failed':
        return { color: '#ef4444' }
      case 'skipped':
        return { color: '#9ca3af', textDecoration: 'line-through' }
      case 'blocked':
        return { color: '#f59e0b' }
      default:
        return { color: '#6b7280' }
    }
  }

  // 获取状态图标
  const getStatusIcon = (stepStatus: string, isCurrent: boolean): string => {
    if (isCurrent) return '◉'

    switch (stepStatus) {
      case 'completed':
        return '✓'
      case 'failed':
        return '✗'
      case 'skipped':
        return '⊘'
      case 'blocked':
        return '⊗'
      default:
        return '○'
    }
  }

  return (
    <div
      style={{
        padding: 16,
        background: '#fafafa',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
      }}
    >
      {/* 进度条 */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 12,
            color: '#666',
          }}
        >
          <span>执行进度</span>
          <span>
            {progress.completed}/{progress.total} ({progress.percentage}%)
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: '#e5e7eb',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress.percentage}%`,
              background:
                status === 'failed' ? '#ef4444' : '#3b82f6',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 步骤列表 */}
      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          fontSize: 13,
        }}
      >
        {plan.steps.map((step) => {
          const isCurrent = step.id === currentStepId
          const style = getStatusStyle(step.status, isCurrent)
          const icon = getStatusIcon(step.status, isCurrent)

          return (
            <div
              key={step.id}
              style={{
                padding: '6px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                ...style,
              }}
            >
              <span style={{ width: 16, textAlign: 'center' }}>{icon}</span>
              <span style={{ flex: 1 }}>{step.userLabel}</span>
              {step.error && (
                <span
                  style={{ fontSize: 11, color: '#ef4444' }}
                  title={step.error}
                >
                  错误
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 错误信息 */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: '#fef2f2',
            borderRadius: 4,
            color: '#dc2626',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* 状态标签 */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

/**
 * 状态徽章
 */
function StatusBadge({ status }: { status: string }) {
  const getConfig = () => {
    switch (status) {
      case 'executing':
        return { label: '执行中', bg: '#dbeafe', color: '#2563eb' }
      case 'paused':
        return { label: '已暂停', bg: '#fef3c7', color: '#d97706' }
      case 'checkpoint':
        return { label: '等待确认', bg: '#fef3c7', color: '#d97706' }
      case 'completed':
        return { label: '已完成', bg: '#dcfce7', color: '#16a34a' }
      case 'failed':
        return { label: '失败', bg: '#fee2e2', color: '#dc2626' }
      case 'aborted':
        return { label: '已中止', bg: '#f3f4f6', color: '#6b7280' }
      default:
        return { label: '准备就绪', bg: '#f3f4f6', color: '#6b7280' }
    }
  }

  const config = getConfig()

  return (
    <span
      style={{
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
