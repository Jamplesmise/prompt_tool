'use client'

import { Tag } from 'antd'
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons'
import type { TaskStatus } from '@platform/shared'

type TaskStatusTagProps = {
  status: TaskStatus
  showIcon?: boolean
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { color: string; text: string; icon: React.ReactNode }
> = {
  PENDING: {
    color: 'default',
    text: '待执行',
    icon: <ClockCircleOutlined />,
  },
  RUNNING: {
    color: 'processing',
    text: '执行中',
    icon: <SyncOutlined spin />,
  },
  PAUSED: {
    color: 'orange',
    text: '已暂停',
    icon: <PauseCircleOutlined />,
  },
  COMPLETED: {
    color: 'success',
    text: '已完成',
    icon: <CheckCircleOutlined />,
  },
  FAILED: {
    color: 'error',
    text: '失败',
    icon: <CloseCircleOutlined />,
  },
  STOPPED: {
    color: 'warning',
    text: '已终止',
    icon: <StopOutlined />,
  },
}

export function TaskStatusTag({ status, showIcon = true }: TaskStatusTagProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING

  return (
    <Tag color={config.color} icon={showIcon ? config.icon : undefined}>
      {config.text}
    </Tag>
  )
}

// 结果状态标签
type ResultStatusTagProps = {
  status: string
}

const RESULT_STATUS_CONFIG: Record<
  string,
  { color: string; text: string }
> = {
  PENDING: { color: 'default', text: '待执行' },
  SUCCESS: { color: 'success', text: '成功' },
  FAILED: { color: 'error', text: '失败' },
  TIMEOUT: { color: 'warning', text: '超时' },
  ERROR: { color: 'error', text: '错误' },
}

export function ResultStatusTag({ status }: ResultStatusTagProps) {
  const config = RESULT_STATUS_CONFIG[status] || RESULT_STATUS_CONFIG.PENDING
  return <Tag color={config.color}>{config.text}</Tag>
}

// 评估结果标签
type EvaluationTagProps = {
  passed: boolean
  score?: number | null
}

export function EvaluationTag({ passed, score }: EvaluationTagProps) {
  if (passed) {
    return (
      <Tag color="success">
        通过{score !== null && score !== undefined ? ` (${(score * 100).toFixed(0)}%)` : ''}
      </Tag>
    )
  }
  return (
    <Tag color="error">
      未通过{score !== null && score !== undefined ? ` (${(score * 100).toFixed(0)}%)` : ''}
    </Tag>
  )
}
