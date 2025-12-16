'use client'

/**
 * 检查点确认组件
 *
 * 展示待确认的检查点：
 * - AI 选择及原因
 * - 候选项选择
 * - Observation 查询结果展示
 * - 预览数据
 * - 操作按钮
 */

import React, { useState, useMemo } from 'react'
import { Card, Button, Space, Typography, Tag, Modal, Spin, Radio, Alert, Divider, Table, List } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PauseCircleOutlined,
  CheckOutlined,
  SwapOutlined,
  UserOutlined,
  CloseOutlined,
  EyeOutlined,
  BulbOutlined,
  FastForwardOutlined,
  SearchOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useCopilot } from '../hooks/useCopilot'
import type { PendingCheckpointState } from '@platform/shared'
import styles from './styles.module.css'

const { Paragraph, Text } = Typography

// ============================================
// Observation 结果展示组件
// ============================================

type ObservationResultViewProps = {
  preview: unknown
  onSelect?: (item: Record<string, unknown>) => void
  selectedId?: string
}

/**
 * 友好展示 Observation 查询结果
 */
const ObservationResultView: React.FC<ObservationResultViewProps> = ({
  preview,
  onSelect,
  selectedId,
}) => {
  const previewData = preview as Record<string, unknown> | undefined
  if (!previewData) return null

  // 检查是否为 Observation 结果格式
  const results = previewData.results as Array<{
    queryIndex: number
    resourceType: string
    data: unknown
  }> | undefined

  if (!results || !Array.isArray(results)) {
    // 非 Observation 结果，返回原始 JSON
    return (
      <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
        {JSON.stringify(preview, null, 2)}
      </pre>
    )
  }

  return (
    <div style={{ maxHeight: 300, overflow: 'auto' }}>
      {results.map((queryResult, idx) => {
        const items = Array.isArray(queryResult.data)
          ? queryResult.data
          : queryResult.data
          ? [queryResult.data]
          : []

        if (items.length === 0) {
          return (
            <Alert
              key={idx}
              type="warning"
              message={`${queryResult.resourceType}: 无结果`}
              style={{ marginBottom: 8 }}
            />
          )
        }

        // 动态生成表格列
        const firstItem = items[0] as Record<string, unknown>
        const columns: ColumnsType<Record<string, unknown>> = []

        // 选择列（如果支持选择）
        if (onSelect) {
          columns.push({
            title: '',
            dataIndex: '_select',
            width: 40,
            render: (_, record) => (
              <Radio
                checked={selectedId === record.id}
                onClick={() => onSelect(record)}
              />
            ),
          })
        }

        // 常用字段优先显示
        const priorityFields = ['name', 'id', 'status', 'description']
        const otherFields = Object.keys(firstItem).filter(
          (k) => !priorityFields.includes(k) && !k.startsWith('_')
        )
        const displayFields = [
          ...priorityFields.filter((f) => f in firstItem),
          ...otherFields.slice(0, 3), // 最多再显示3个其他字段
        ]

        for (const field of displayFields) {
          columns.push({
            title: field,
            dataIndex: field,
            key: field,
            ellipsis: true,
            width: field === 'id' ? 80 : field === 'description' ? 200 : 120,
            render: (value) => {
              if (value === null || value === undefined) return '-'
              if (typeof value === 'boolean') return value ? '是' : '否'
              if (typeof value === 'object') return JSON.stringify(value)
              const str = String(value)
              return str.length > 30 ? str.substring(0, 30) + '...' : str
            },
          })
        }

        return (
          <div key={idx} style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <Tag icon={<DatabaseOutlined />} color="blue">
                {queryResult.resourceType}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {items.length} 条结果
              </Text>
            </div>
            <Table
              dataSource={items.map((item, i) => ({
                ...item as Record<string, unknown>,
                key: (item as Record<string, unknown>).id || i,
              }))}
              columns={columns}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              style={{ fontSize: 12 }}
            />
          </div>
        )
      })}
    </div>
  )
}

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

          {/* 操作按钮 - 简化为两个主要按钮 */}
          <Space className={styles.checkpointActions}>
            <Button
              type="primary"
              icon={hasChangedSelection ? <SwapOutlined /> : <CheckOutlined />}
              onClick={handleApprove}
              disabled={isResponding}
              data-testid="checkpoint-approve"
            >
              {hasChangedSelection ? '使用选中项' : '确认执行'}
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={handleReject}
              disabled={isResponding}
              data-testid="checkpoint-reject"
            >
              取消
            </Button>
          </Space>
        </Spin>
      </Card>

      {/* 预览弹窗 */}
      <Modal
        title={
          <Space>
            <SearchOutlined />
            查询结果预览
          </Space>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={700}
      >
        <ObservationResultView preview={pendingCheckpoint.preview} />
      </Modal>
    </>
  )
}

export default CheckpointSection
