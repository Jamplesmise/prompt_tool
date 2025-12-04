'use client'

import { Button, Typography, Space } from 'antd'
import { PlusOutlined, BookOutlined, ToolOutlined } from '@ant-design/icons'
import type { CSSProperties } from 'react'

const { Title, Text, Paragraph } = Typography

export type EvaluatorEmptyStateProps = {
  onCreateEvaluator?: () => void
  onViewDocs?: () => void
  style?: CSSProperties
}

const EVALUATOR_TYPES = [
  { icon: '💻', label: 'Node.js 代码评估器' },
  { icon: '🤖', label: 'LLM 评估器' },
  { icon: '🔗', label: '组合评估器' },
]

export function EvaluatorEmptyState({
  onCreateEvaluator,
  onViewDocs,
  style,
}: EvaluatorEmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 20px',
        ...style,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          textAlign: 'center',
          padding: '40px',
          border: '1px dashed #d9d9d9',
          borderRadius: 12,
          backgroundColor: '#fafafa',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          <ToolOutlined style={{ color: '#8c8c8c' }} />
        </div>

        <Title level={4} style={{ marginBottom: 8 }}>
          还没有自定义评估器
        </Title>

        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          自定义评估器可以编写代码实现复杂的评估逻辑
        </Paragraph>

        <div style={{ marginBottom: 24 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            支持的评估器类型:
          </Text>
          <Space direction="vertical" size={8}>
            {EVALUATOR_TYPES.map((type) => (
              <Text key={type.label} type="secondary">
                {type.icon} {type.label}
              </Text>
            ))}
          </Space>
        </div>

        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {onCreateEvaluator && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreateEvaluator}
              block
            >
              创建第一个评估器
            </Button>
          )}

          {onViewDocs && (
            <Button
              type="link"
              icon={<BookOutlined />}
              onClick={onViewDocs}
            >
              查看代码评估器文档
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
