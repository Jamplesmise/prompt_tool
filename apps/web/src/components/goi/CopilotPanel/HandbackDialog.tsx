/**
 * 续跑对话框
 *
 * 用户交还控制权时显示：
 * - 用户操作摘要
 * - 偏离警告
 * - 剩余步骤
 * - 续跑建议
 */

import { useMemo } from 'react'
import {
  Modal,
  List,
  Button,
  Alert,
  Space,
  Typography,
  Tag,
  Divider,
  Progress,
} from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import type {
  ReconciledPlan,
  TrackedAction,
  Deviation,
  ReconciledStep,
} from '@/lib/goi/collaboration/types'
import { getDeviationDetector } from '@/lib/goi/collaboration/deviationDetector'

const { Text, Title } = Typography

type Props = {
  visible: boolean
  onClose: () => void
  plan: ReconciledPlan
  userActions: TrackedAction[]
  deviation: Deviation
  onContinue: () => void
  onAdjustPlan: () => void
  onRestart: () => void
}

export function HandbackDialog({
  visible,
  onClose,
  plan,
  userActions,
  deviation,
  onContinue,
  onAdjustPlan,
  onRestart,
}: Props) {
  // 计算用户完成的步骤
  const userCompletedSteps = useMemo(
    () => plan.steps.filter(s => s.completedBy === 'user'),
    [plan.steps]
  )

  // 计算待执行的步骤
  const pendingSteps = useMemo(
    () => plan.steps.filter(s => s.status === 'pending'),
    [plan.steps]
  )

  // 下一个待执行步骤
  const nextStep = pendingSteps[0]

  // 获取偏离显示信息
  const deviationInfo = useMemo(
    () => getDeviationDetector().getDisplayInfo(deviation),
    [deviation]
  )

  // 渲染步骤状态图标
  const renderStepIcon = (step: ReconciledStep) => {
    if (step.status === 'completed') {
      if (step.completedBy === 'user') {
        return <UserOutlined style={{ color: '#52c41a' }} />
      }
      return <RobotOutlined style={{ color: '#1890ff' }} />
    }
    if (step.status === 'pending') {
      return <ClockCircleOutlined style={{ color: '#999' }} />
    }
    return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
  }

  // 渲染用户操作描述
  const getActionDescription = (action: TrackedAction): string => {
    const typeNames: Record<string, string> = {
      navigate: '导航到',
      click: '点击',
      input: '输入',
      select: '选择',
      submit: '提交',
      toggle: '切换',
      upload: '上传',
      delete: '删除',
    }

    const actionName = typeNames[action.type] || action.type
    const target = action.target.label || action.target.resourceType || '元素'

    return `${actionName}${target}`
  }

  return (
    <Modal
      title={
        <Space>
          <span role="img" aria-label="refresh">
            🔄
          </span>
          <span>准备继续</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      {/* 进度概览 */}
      <div style={{ marginBottom: 20 }}>
        <Progress
          percent={plan.progressPercent}
          status={plan.progressPercent === 100 ? 'success' : 'active'}
          format={percent => `${percent}% 完成`}
        />
        <Space style={{ marginTop: 8 }}>
          <Tag icon={<UserOutlined />} color="green">
            用户完成 {plan.userCompletedCount} 步
          </Tag>
          <Tag icon={<RobotOutlined />} color="blue">
            AI 完成 {plan.aiCompletedCount} 步
          </Tag>
          <Tag icon={<ClockCircleOutlined />}>待执行 {plan.pendingCount} 步</Tag>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 用户操作摘要 */}
      {userCompletedSteps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            您在接管期间完成了以下操作：
          </Title>
          <List
            size="small"
            bordered
            dataSource={userCompletedSteps}
            renderItem={step => (
              <List.Item>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>{step.description}</Text>
                  {step.matchedAction && (
                    <Tag color="blue" style={{ fontSize: 11 }}>
                      {getActionDescription(step.matchedAction)}
                    </Tag>
                  )}
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 计划外操作提示 */}
      {userActions.length > userCompletedSteps.length && (
        <Alert
          type="info"
          showIcon
          message={`还检测到 ${userActions.length - userCompletedSteps.length} 个计划外操作`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 偏离警告 */}
      {deviation.type !== 'none' && (
        <Alert
          type={deviationInfo.type}
          showIcon
          message={deviationInfo.title}
          description={
            <div>
              <Text>{deviationInfo.description}</Text>
              {deviation.issues.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {deviation.issues.slice(0, 3).map((issue, i) => (
                    <li key={i}>
                      <Text
                        type={
                          issue.severity === 'error'
                            ? 'danger'
                            : issue.severity === 'warning'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {issue.message}
                      </Text>
                    </li>
                  ))}
                  {deviation.issues.length > 3 && (
                    <li>
                      <Text type="secondary">
                        还有 {deviation.issues.length - 3} 个问题...
                      </Text>
                    </li>
                  )}
                </ul>
              )}
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Divider style={{ margin: '16px 0' }} />

      {/* 剩余步骤 */}
      {pendingSteps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            计划中剩余步骤：
          </Title>
          <List
            size="small"
            bordered
            dataSource={pendingSteps.slice(0, 5)}
            renderItem={(step, index) => (
              <List.Item>
                <Space>
                  {index === 0 ? (
                    <Tag color="blue">下一步</Tag>
                  ) : (
                    <span style={{ color: '#999', marginLeft: 4 }}>○</span>
                  )}
                  <Text>{step.description}</Text>
                  {step.required && (
                    <Tag color="red" style={{ fontSize: 10 }}>
                      必需
                    </Tag>
                  )}
                </Space>
              </List.Item>
            )}
          />
          {pendingSteps.length > 5 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              还有 {pendingSteps.length - 5} 个步骤...
            </Text>
          )}
        </div>
      )}

      {/* 续跑建议 */}
      {nextStep && !deviation.isBlocking && (
        <Alert
          type="success"
          showIcon
          icon={<span role="img" aria-label="bulb">💡</span>}
          message={
            <span>
              建议：您的操作{deviation.type === 'none' ? '与原计划一致' : '基本符合计划'}
              ，可以从「{nextStep.description}」继续执行
            </span>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      {/* 所有步骤已完成 */}
      {pendingSteps.length === 0 && (
        <Alert
          type="success"
          showIcon
          message="所有步骤已完成！"
          description="您已完成计划中的所有步骤，任务执行成功。"
          style={{ marginBottom: 20 }}
        />
      )}

      <Divider style={{ margin: '16px 0' }} />

      {/* 操作按钮 */}
      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <Button
          type="primary"
          onClick={onContinue}
          disabled={deviation.isBlocking || pendingSteps.length === 0}
          icon={<CheckCircleOutlined />}
        >
          从这里继续
        </Button>
        <Button onClick={onAdjustPlan} icon={<span role="img" aria-label="edit">📝</span>}>
          调整计划
        </Button>
        <Button danger onClick={onRestart} icon={<span role="img" aria-label="close">✕</span>}>
          重新开始
        </Button>
      </Space>
    </Modal>
  )
}

export default HandbackDialog
