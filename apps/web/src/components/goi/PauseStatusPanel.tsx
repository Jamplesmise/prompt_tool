'use client'

/**
 * GOI 暂停状态面板
 *
 * 功能：
 * - 展示暂停时的任务状态
 * - 显示已完成、当前、待执行步骤
 * - 提供继续/接管/取消操作
 */

import { Card, Button, Space, Typography, List, Divider, Tag } from 'antd'
import {
  PlayCircleOutlined,
  UserSwitchOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons'
import { usePauseStore } from '@/lib/goi/execution/pauseController'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import type { PlanStep, StepStatus } from '@platform/shared'

const { Text } = Typography

// ============================================
// 类型定义
// ============================================

export type PauseStatusPanelProps = {
  /** 继续执行回调 */
  onResume: () => void
  /** 接管控制回调 */
  onTakeover: () => void
  /** 取消任务回调 */
  onCancel: () => void
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取步骤状态图标
 */
function getStatusIcon(status: StepStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    case 'executing':
      return <LoadingOutlined style={{ color: '#1890ff' }} />
    case 'pending':
    case 'ready':
      return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
    case 'skipped':
      return <CheckCircleOutlined style={{ color: '#d9d9d9' }} />
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    case 'blocked':
      return <PauseCircleOutlined style={{ color: '#faad14' }} />
    default:
      return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
  }
}

/**
 * 格式化暂停时间
 */
function formatPauseTime(date?: Date): string {
  if (!date) return ''
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ============================================
// 组件
// ============================================

export function PauseStatusPanel({
  onResume,
  onTakeover,
  onCancel,
}: PauseStatusPanelProps) {
  const { isPaused, pausedAt, pausedAtStepId, pauseReason } = usePauseStore()
  const { plan, progress } = useExecutionStore()

  // 未暂停或无计划时不显示
  if (!isPaused || !plan) {
    return null
  }

  // 分类步骤
  const completedSteps = plan.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  )
  const currentStep = plan.steps.find((s) => s.id === pausedAtStepId)
  const pendingSteps = plan.steps.filter(
    (s) =>
      (s.status === 'pending' || s.status === 'ready') &&
      s.id !== pausedAtStepId
  )

  // 暂停原因文案
  const reasonText = {
    user_request: '用户请求暂停',
    checkpoint: '检查点等待确认',
    error: '执行出错',
  }[pauseReason || 'user_request']

  return (
    <Card
      title={
        <Space>
          <PauseCircleOutlined style={{ color: '#faad14' }} />
          <span>已暂停</span>
          {pausedAt && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              {formatPauseTime(pausedAt)}
            </Text>
          )}
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Tag color="orange">{reasonText}</Tag>
      }
    >
      {/* 已完成步骤 */}
      {completedSteps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已完成 ({completedSteps.length}/{plan.steps.length}):
          </Text>
          <List
            size="small"
            dataSource={completedSteps}
            renderItem={(step: PlanStep) => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Space>
                  {getStatusIcon(step.status)}
                  <Text
                    delete={step.status === 'skipped'}
                    type={step.status === 'skipped' ? 'secondary' : undefined}
                  >
                    {step.userLabel}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 当前步骤 */}
      {currentStep && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            暂停在:
          </Text>
          <Card
            size="small"
            style={{ marginTop: 8, background: '#fff7e6', borderColor: '#ffd591' }}
            bodyStyle={{ padding: '8px 12px' }}
          >
            <Space>
              <Tag color="orange">当前</Tag>
              <Text strong>{currentStep.userLabel}</Text>
            </Space>
            {currentStep.hint && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {currentStep.hint}
                </Text>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 待执行步骤 */}
      {pendingSteps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            等待执行 ({pendingSteps.length}项):
          </Text>
          <List
            size="small"
            dataSource={pendingSteps.slice(0, 5)}
            renderItem={(step: PlanStep) => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Space>
                  <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
                  <Text type="secondary">{step.userLabel}</Text>
                </Space>
              </List.Item>
            )}
          />
          {pendingSteps.length > 5 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ... 还有 {pendingSteps.length - 5} 项
            </Text>
          )}
        </div>
      )}

      {/* 进度信息 */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          进度: {progress.percentage}% ({progress.completed}/{progress.total})
          {progress.estimatedRemaining !== undefined && progress.estimatedRemaining > 0 && (
            <> | 预估剩余 {Math.ceil(progress.estimatedRemaining / 60)} 分钟</>
          )}
        </Text>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 操作按钮 */}
      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onResume}
        >
          继续执行
        </Button>
        <Button
          icon={<UserSwitchOutlined />}
          onClick={onTakeover}
        >
          我来操作
        </Button>
        <Button
          danger
          icon={<CloseCircleOutlined />}
          onClick={onCancel}
        >
          取消任务
        </Button>
      </Space>
    </Card>
  )
}

export default PauseStatusPanel
