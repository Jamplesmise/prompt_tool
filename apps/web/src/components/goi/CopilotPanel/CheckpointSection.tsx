'use client'

/**
 * 检查点确认组件
 *
 * 展示待确认的检查点：
 * - AI 选择及原因
 * - 候选项选择
 * - 预览数据
 * - 操作按钮
 */

import React, { useState, useMemo } from 'react'
import { Card, Button, Space, Typography, Tag, Modal, Spin, Radio, Alert, Divider } from 'antd'
import {
  PauseCircleOutlined,
  CheckOutlined,
  SwapOutlined,
  UserOutlined,
  CloseOutlined,
  EyeOutlined,
  BulbOutlined,
  FastForwardOutlined,
} from '@ant-design/icons'
import { useCopilot } from '../hooks/useCopilot'
import type { PendingCheckpointState } from '@platform/shared'
import styles from './styles.module.css'

const { Paragraph, Text } = Typography

export const CheckpointSection: React.FC = () => {
  const { pendingCheckpoint: rawCheckpoint, respondCheckpoint, isResponding } = useCopilot()
  const [previewVisible, setPreviewVisible] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  if (!rawCheckpoint) {
    return null
  }

  // 类型断言确保正确的类型推断
  const pendingCheckpoint = rawCheckpoint as PendingCheckpointState

  // 提取渲染所需的值，确保类型正确
  const todoItemTitle: string = (pendingCheckpoint.todoItem as { title: string })?.title ?? '未知操作'
  const checkpointReason: string = (pendingCheckpoint.reason as string) ?? ''
  const remainingTime = pendingCheckpoint.remainingTime as number | undefined
  const hasPreview = !!pendingCheckpoint.preview
  const options = pendingCheckpoint.options || []

  // AI 推荐选项（第一个选项）
  const aiRecommendedOption = options[0] || null
  // 其他候选选项
  const alternativeOptions = options.slice(1)

  // 当前选中的选项 ID（默认为 AI 推荐）
  const currentSelectedId = selectedOptionId || aiRecommendedOption?.id

  // 判断用户是否更改了选择
  const hasChangedSelection = currentSelectedId !== aiRecommendedOption?.id

  const handleApprove = async () => {
    if (hasChangedSelection && currentSelectedId) {
      // 用户选择了不同的选项，使用 modify
      await respondCheckpoint('modify', {
        modifications: { selectedOptionId: currentSelectedId },
        reason: `用户选择了: ${options.find(o => o.id === currentSelectedId)?.label}`,
      })
    } else {
      // 确认 AI 推荐
      await respondCheckpoint('approve')
    }
  }

  const handleSkip = async () => {
    await respondCheckpoint('approve', { reason: '跳过此步骤' })
  }

  const handleTakeover = async () => {
    await respondCheckpoint('takeover')
  }

  const handleReject = async () => {
    await respondCheckpoint('reject', { reason: '用户取消' })
  }

  const formatRemainingTime = (ms: number | undefined) => {
    if (!ms) return null
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${seconds}s`
  }

  return (
    <>
      <Card
        size="small"
        data-testid="checkpoint-dialog"
        title={
          <span>
            <PauseCircleOutlined
              style={{ marginRight: 8, color: '#faad14' }}
            />
            请确认
            {remainingTime && (
              <Tag color="warning" style={{ marginLeft: 8 }}>
                {formatRemainingTime(remainingTime)}
              </Tag>
            )}
          </span>
        }
        className={styles.checkpointCard}
      >
        <Spin spinning={isResponding}>
          {/* 操作标题 */}
          <div className={styles.checkpointTitle}>
            {todoItemTitle}
          </div>

          {/* AI 选择卡片 */}
          {options.length > 0 && (
            <div className={styles.checkpointOptionsCard}>
              <Radio.Group
                value={currentSelectedId}
                onChange={(e) => setSelectedOptionId(e.target.value)}
                style={{ width: '100%' }}
              >
                {/* AI 推荐选项 */}
                {aiRecommendedOption && (
                  <div className={styles.checkpointAiChoice}>
                    <Radio value={aiRecommendedOption.id}>
                      <Space direction="vertical" size={0}>
                        <Space size="small">
                          <Text strong>{aiRecommendedOption.label}</Text>
                          <Tag color="blue" style={{ fontSize: 10 }}>AI 推荐</Tag>
                        </Space>
                        {aiRecommendedOption.description && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {aiRecommendedOption.description}
                          </Text>
                        )}
                      </Space>
                    </Radio>
                    {/* AI 选择原因 */}
                    {checkpointReason && (
                      <div className={styles.checkpointAiReason}>
                        <BulbOutlined style={{ marginRight: 4, color: '#faad14' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {checkpointReason}
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                {/* 其他候选选项 */}
                {alternativeOptions.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0 8px' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>其他候选</Text>
                    </Divider>
                    {alternativeOptions.map((option) => (
                      <div key={option.id} className={styles.checkpointAlternative}>
                        <Radio value={option.id}>
                          <Space direction="vertical" size={0}>
                            <Text>{option.label}</Text>
                            {option.description && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {option.description}
                              </Text>
                            )}
                          </Space>
                        </Radio>
                      </div>
                    ))}
                  </>
                )}
              </Radio.Group>
            </div>
          )}

          {/* 预览按钮 */}
          {hasPreview && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setPreviewVisible(true)}
              style={{ marginBottom: 12 }}
            >
              预览详情
            </Button>
          )}

          {/* 操作按钮 */}
          <Space wrap className={styles.checkpointActions}>
            <Button
              type="primary"
              icon={hasChangedSelection ? <SwapOutlined /> : <CheckOutlined />}
              onClick={handleApprove}
              disabled={isResponding}
              data-testid="checkpoint-approve"
            >
              {hasChangedSelection ? '使用选中项' : '确认'}
            </Button>
            <Button
              icon={<FastForwardOutlined />}
              onClick={handleSkip}
              disabled={isResponding}
              data-testid="checkpoint-skip"
            >
              跳过此步
            </Button>
            <Button
              icon={<UserOutlined />}
              onClick={handleTakeover}
              disabled={isResponding}
              data-testid="checkpoint-takeover"
            >
              我来操作
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={handleReject}
              disabled={isResponding}
              data-testid="checkpoint-reject"
            >
              取消任务
            </Button>
          </Space>

          {/* 提示文字 */}
          <Alert
            type="info"
            message="确认后，AI 将继续执行下一步操作"
            style={{ marginTop: 12 }}
            showIcon
          />
        </Spin>
      </Card>

      {/* 预览弹窗 */}
      <Modal
        title="操作预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={600}
      >
        <pre style={{ maxHeight: 400, overflow: 'auto' }}>
          {JSON.stringify(pendingCheckpoint.preview, null, 2)}
        </pre>
      </Modal>
    </>
  )
}

export default CheckpointSection
