'use client'

import { useState } from 'react'
import { Card, Tag, Typography, Progress, Collapse, List, Space, Tooltip } from 'antd'
import {
  FileTextOutlined,
  FileExclamationOutlined,
  SearchOutlined,
  ColumnWidthOutlined,
  DisconnectOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  DownOutlined,
  RightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { FailurePattern, FailureType } from '@/lib/analysis'
import { getFailureTypeName, getFailureTypeColor } from '@/lib/analysis'

const { Text, Paragraph } = Typography

type FailurePatternCardProps = {
  pattern: FailurePattern
  showExamples?: boolean
}

/**
 * 获取失败类型的图标组件
 */
function getFailureIcon(type: FailureType) {
  const iconMap: Record<FailureType, React.ReactNode> = {
    format_error: <FileTextOutlined />,
    content_missing: <FileExclamationOutlined />,
    keyword_missing: <SearchOutlined />,
    length_violation: <ColumnWidthOutlined />,
    semantic_mismatch: <DisconnectOutlined />,
    timeout: <ClockCircleOutlined />,
    error: <CloseCircleOutlined />,
    other: <QuestionCircleOutlined />,
  }
  return iconMap[type]
}

/**
 * 失败模式卡片组件
 */
export function FailurePatternCard({ pattern, showExamples = true }: FailurePatternCardProps) {
  const [expanded, setExpanded] = useState(false)
  const color = getFailureTypeColor(pattern.type)
  const name = getFailureTypeName(pattern.type)

  return (
    <Card
      size="small"
      style={{
        borderLeft: `4px solid ${color}`,
        marginBottom: 12,
      }}
      styles={{
        body: { padding: '12px 16px' },
      }}
    >
      {/* 头部：类型和统计 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ color, fontSize: 18 }}>{getFailureIcon(pattern.type)}</span>
          <Text strong>{name}</Text>
          <Tag color={color}>{pattern.count} 个</Tag>
        </Space>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Tooltip title={`占失败总数的 ${pattern.percentage}%`}>
            <Progress
              percent={pattern.percentage}
              size="small"
              style={{ width: 100 }}
              strokeColor={color}
              format={(percent) => `${percent}%`}
            />
          </Tooltip>
          {showExamples && pattern.examples.length > 0 && (
            <div
              onClick={() => setExpanded(!expanded)}
              style={{ cursor: 'pointer', color: '#EF4444' }}
            >
              {expanded ? <DownOutlined /> : <RightOutlined />}
              <Text type="secondary" style={{ marginLeft: 4 }}>
                {expanded ? '收起' : '查看示例'}
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* 共同特征 */}
      {pattern.commonFeatures.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>共同特征：</Text>
          <div style={{ marginTop: 4 }}>
            {pattern.commonFeatures.map((feature, index) => (
              <Tag key={index} style={{ marginBottom: 4 }}>
                {feature}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* 建议 */}
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>建议：</Text>
        <Paragraph
          style={{ marginBottom: 0, marginTop: 4, fontSize: 13 }}
          ellipsis={{ rows: 2, expandable: true }}
        >
          {pattern.suggestion}
        </Paragraph>
      </div>

      {/* 展开的示例列表 */}
      {expanded && pattern.examples.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <List
            size="small"
            dataSource={pattern.examples}
            renderItem={(example, index) => (
              <List.Item style={{ padding: '8px 0' }}>
                <div style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    示例 {index + 1}
                  </Text>
                  <div
                    style={{
                      background: '#f5f5f5',
                      borderRadius: 4,
                      padding: 8,
                      marginTop: 4,
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>输入：</Text>
                      <Paragraph
                        style={{ marginBottom: 0, fontSize: 12 }}
                        ellipsis={{ rows: 2 }}
                        copyable={{ text: example.input }}
                      >
                        {example.input}
                      </Paragraph>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>期望：</Text>
                      <Paragraph
                        style={{ marginBottom: 0, fontSize: 12 }}
                        ellipsis={{ rows: 2 }}
                        copyable={{ text: example.expected }}
                      >
                        {example.expected}
                      </Paragraph>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>实际：</Text>
                      <Paragraph
                        style={{ marginBottom: 0, fontSize: 12, color: '#ff4d4f' }}
                        ellipsis={{ rows: 2 }}
                        copyable={{ text: example.actual }}
                      >
                        {example.actual}
                      </Paragraph>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  )
}

/**
 * 失败模式列表组件
 */
type FailurePatternListProps = {
  patterns: FailurePattern[]
  showExamples?: boolean
}

export function FailurePatternList({ patterns, showExamples = true }: FailurePatternListProps) {
  if (patterns.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>
        <CheckCircleOutlined style={{ fontSize: 32, marginBottom: 8 }} />
        <div>没有检测到失败模式</div>
      </div>
    )
  }

  return (
    <div>
      {patterns.map((pattern) => (
        <FailurePatternCard
          key={pattern.type}
          pattern={pattern}
          showExamples={showExamples}
        />
      ))}
    </div>
  )
}
