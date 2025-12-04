'use client'

import { Card, Typography, Space } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { EvaluatorTypeTag } from './EvaluatorTypeTag'
import type { EvaluatorTypeKey } from './EvaluatorTypeTag'
import type { CSSProperties } from 'react'

const { Text, Paragraph } = Typography

export type PresetEvaluatorCardProps = {
  id: string
  type: EvaluatorTypeKey | string
  name: string
  description: string
  useCases?: string[]
  onClick?: () => void
  style?: CSSProperties
}

export function PresetEvaluatorCard({
  type,
  name,
  description,
  useCases = [],
  onClick,
  style,
}: PresetEvaluatorCardProps) {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        ...style,
      }}
      styles={{
        body: {
          padding: 16,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      className="preset-evaluator-card"
    >
      <Space direction="vertical" size={12} style={{ width: '100%', flex: 1 }}>
        {/* 图标 + 名称 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EvaluatorTypeTag
            type={type}
            size="large"
            showLabel={false}
            showTooltip={false}
          />
          <Text strong style={{ fontSize: 16 }}>{name}</Text>
        </div>

        {/* 类型标识 */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {type}
        </Text>

        {/* 描述 */}
        <Paragraph
          type="secondary"
          style={{ marginBottom: 0, flex: 1 }}
          ellipsis={{ rows: 2 }}
        >
          {description}
        </Paragraph>

        {/* 适用场景 */}
        {useCases.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            适用: {useCases.join('、')}
          </Text>
        )}

        {/* 查看详情入口 */}
        {onClick && (
          <div
            style={{
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              marginTop: 'auto',
            }}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              查看详情 <RightOutlined style={{ fontSize: 10 }} />
            </Text>
          </div>
        )}
      </Space>

      <style jsx global>{`
        .preset-evaluator-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </Card>
  )
}
