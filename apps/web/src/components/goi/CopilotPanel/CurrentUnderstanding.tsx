'use client'

/**
 * 当前理解展示组件
 *
 * 展示 AI 对当前状态的理解：
 * - 用户目标
 * - 已选择的资源
 * - 当前执行进度
 */

import React from 'react'
import { Card, Typography, Space, Tag, Skeleton } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import { useCopilot } from '../hooks/useCopilot'
import styles from './styles.module.css'

const { Paragraph, Text } = Typography

export const CurrentUnderstanding: React.FC = () => {
  const { understanding, isLoading } = useCopilot()

  if (isLoading) {
    return (
      <Card
        size="small"
        title={
          <span>
            <BulbOutlined style={{ marginRight: 8 }} />
            当前理解
          </span>
        }
        className={styles.understandingCard}
      >
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    )
  }

  return (
    <Card
      size="small"
      title={
        <span>
          <BulbOutlined style={{ marginRight: 8 }} />
          当前理解
        </span>
      }
      className={styles.understandingCard}
    >
      <Paragraph className={styles.understandingSummary}>
        {understanding?.summary || '等待用户操作...'}
      </Paragraph>

      {understanding?.currentGoal && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            目标：
          </Text>
          <Text style={{ fontSize: 13 }}>{understanding.currentGoal}</Text>
        </div>
      )}

      {understanding?.selectedResources &&
        understanding.selectedResources.length > 0 && (
          <div className={styles.selectedResources}>
            <Text type="secondary" className={styles.selectedLabel}>
              已选择：
            </Text>
            <Space wrap size={[4, 4]}>
              {understanding.selectedResources.map((resource) => (
                <Tag key={resource.id} color="blue">
                  {resource.type}: {resource.name}
                </Tag>
              ))}
            </Space>
          </div>
        )}

      {understanding?.currentPhase && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            阶段：
          </Text>
          <Tag color="processing">{understanding.currentPhase}</Tag>
        </div>
      )}

      {understanding?.confidence !== undefined && understanding.confidence > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            置信度：{understanding.confidence}%
          </Text>
        </div>
      )}
    </Card>
  )
}

export default CurrentUnderstanding
