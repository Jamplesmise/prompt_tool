/**
 * 失败恢复界面组件
 *
 * 显示失败报告并提供恢复选项
 */

'use client'

import React, { useState } from 'react'
import {
  Modal,
  Button,
  Space,
  Typography,
  Alert,
  Steps,
  Input,
  Divider,
  Tag,
  Collapse,
} from 'antd'
import {
  WarningOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  StepForwardOutlined,
  SyncOutlined,
  StopOutlined,
  UserOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
} from '@ant-design/icons'
import type {
  FailureReport,
  RecoveryOption,
  RecoveryAction,
  RecoverySelection,
} from '@platform/shared'

const { Text, Title, Paragraph } = Typography

// ============================================
// 类型定义
// ============================================

export type FailureRecoveryProps = {
  /** 是否可见 */
  open: boolean
  /** 失败报告 */
  report: FailureReport
  /** 恢复选择回调 */
  onRecover: (selection: RecoverySelection) => Promise<void>
  /** 关闭回调 */
  onClose: () => void
  /** 是否正在处理 */
  loading?: boolean
}

// ============================================
// 常量
// ============================================

const ACTION_ICONS: Record<RecoveryAction, React.ReactNode> = {
  retry: <ReloadOutlined />,
  modify: <EditOutlined />,
  skip: <StepForwardOutlined />,
  replan: <SyncOutlined />,
  abort: <StopOutlined />,
  takeover: <UserOutlined />,
}

const ACTION_COLORS: Record<RecoveryAction, string> = {
  retry: '#1890ff',
  modify: '#722ed1',
  skip: '#fa8c16',
  replan: '#13c2c2',
  abort: '#f5222d',
  takeover: '#52c41a',
}

// ============================================
// 组件
// ============================================

/**
 * 失败恢复界面
 */
export const FailureRecovery: React.FC<FailureRecoveryProps> = ({
  open,
  report,
  onRecover,
  onClose,
  loading = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<RecoveryOption | null>(null)
  const [userInput, setUserInput] = useState('')
  const [processing, setProcessing] = useState(false)

  // 处理选择恢复选项
  const handleSelectOption = (option: RecoveryOption) => {
    setSelectedOption(option)
    setUserInput('')
  }

  // 处理确认恢复
  const handleConfirmRecover = async () => {
    if (!selectedOption) return

    setProcessing(true)
    try {
      await onRecover({
        optionId: selectedOption.id,
        action: selectedOption.action,
        userInput: selectedOption.requiresInput ? userInput : undefined,
        selectedAt: new Date(),
      })
      onClose()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>任务执行失败</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      maskClosable={false}
    >
      {/* 失败位置 */}
      <div style={{ marginBottom: 16 }}>
        <Space align="start">
          <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 18 }} />
          <div>
            <Text strong>失败位置</Text>
            <div style={{ marginTop: 4 }}>
              <Text>TODO项: </Text>
              <Text code>{report.location.todoItem}</Text>
            </div>
            <div>
              <Text type="secondary">
                {report.location.phase} ({report.location.progress})
              </Text>
            </div>
          </div>
        </Space>
      </div>

      {/* 失败原因 */}
      <Alert
        type="error"
        message="失败原因"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>{report.reason.summary}</Paragraph>
            <Text type="secondary">可能的原因：</Text>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {report.reason.possibleCauses.map((cause, index) => (
                <li key={index}>
                  <Text type="secondary">{cause}</Text>
                </li>
              ))}
            </ul>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {/* 回滚信息 */}
      {report.rollback.executed && (
        <div
          style={{
            background: '#f0f5ff',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <Space align="start">
            <RollbackOutlined style={{ color: '#1890ff' }} />
            <div>
              <Text strong>已执行的回滚</Text>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                {report.rollback.actions.map((action, index) => (
                  <li key={index}>
                    <Text>{action}</Text>
                  </li>
                ))}
              </ul>
              <Text type="secondary">状态已恢复到: {report.rollback.restoredTo}</Text>
            </div>
          </Space>
        </div>
      )}

      <Divider>选择恢复方式</Divider>

      {/* 恢复选项 */}
      <div style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {report.suggestions.map((option) => (
            <Button
              key={option.id}
              block
              size="large"
              type={selectedOption?.id === option.id ? 'primary' : 'default'}
              onClick={() => handleSelectOption(option)}
              disabled={option.disabled || loading}
              style={{
                height: 'auto',
                padding: '12px 16px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span
                  style={{
                    color:
                      selectedOption?.id === option.id
                        ? '#fff'
                        : ACTION_COLORS[option.action],
                    fontSize: 18,
                  }}
                >
                  {ACTION_ICONS[option.action]}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text
                      strong
                      style={{
                        color: selectedOption?.id === option.id ? '#fff' : undefined,
                      }}
                    >
                      {option.label}
                    </Text>
                    {option.recommended && (
                      <Tag color="green" style={{ margin: 0 }}>
                        推荐
                      </Tag>
                    )}
                  </div>
                  <Text
                    type="secondary"
                    style={{
                      color: selectedOption?.id === option.id ? '#ffffffb3' : undefined,
                    }}
                  >
                    {option.description}
                  </Text>
                </div>
              </div>
            </Button>
          ))}
        </Space>
      </div>

      {/* 用户输入（如果需要） */}
      {selectedOption?.requiresInput && (
        <div style={{ marginBottom: 16 }}>
          <Text>{selectedOption.inputPrompt || '请输入参数'}</Text>
          <Input.TextArea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="请输入..."
            rows={3}
            style={{ marginTop: 8 }}
          />
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose} disabled={processing || loading}>
          稍后处理
        </Button>
        <Button
          type="primary"
          onClick={handleConfirmRecover}
          loading={processing || loading}
          disabled={
            !selectedOption ||
            (selectedOption.requiresInput && !userInput.trim())
          }
        >
          确认执行
        </Button>
      </div>

      {/* 技术详情（可折叠） */}
      {report.reason.technicalDetails && (
        <Collapse
          ghost
          style={{ marginTop: 16 }}
          items={[
            {
              key: 'technical',
              label: <Text type="secondary">技术详情</Text>,
              children: (
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 12,
                    overflow: 'auto',
                    maxHeight: 150,
                  }}
                >
                  {report.reason.technicalDetails}
                </pre>
              ),
            },
          ]}
        />
      )}
    </Modal>
  )
}

// ============================================
// 简化版组件
// ============================================

/**
 * 失败提示条（用于嵌入页面）
 */
export const FailureBanner: React.FC<{
  report: FailureReport
  onViewDetails: () => void
  onQuickRetry?: () => void
}> = ({ report, onViewDetails, onQuickRetry }) => {
  return (
    <Alert
      type="error"
      message={
        <Space>
          <span>任务执行失败</span>
          <Text type="secondary">- {report.location.todoItem}</Text>
        </Space>
      }
      description={report.reason.summary}
      action={
        <Space>
          {onQuickRetry && (
            <Button size="small" onClick={onQuickRetry}>
              重试
            </Button>
          )}
          <Button size="small" type="primary" onClick={onViewDetails}>
            查看详情
          </Button>
        </Space>
      }
      showIcon
    />
  )
}

export default FailureRecovery
