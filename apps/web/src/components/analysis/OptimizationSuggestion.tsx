'use client'

import { useState } from 'react'
import {
  Card,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Tooltip,
  message,
  List,
  Badge,
} from 'antd'
import {
  BulbOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  CopyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { Suggestion } from '@/lib/analysis'
import { getFailureTypeName, getFailureTypeColor } from '@/lib/analysis'

const { Text, Paragraph } = Typography

type OptimizationSuggestionProps = {
  suggestion: Suggestion
  onApply?: (suggestion: Suggestion) => void
  onIgnore?: (suggestion: Suggestion) => void
  onPreview?: (suggestion: Suggestion) => void
}

/**
 * 获取优先级颜色
 */
function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a',
  }
  return colors[priority]
}

/**
 * 获取优先级文本
 */
function getPriorityText(priority: 'high' | 'medium' | 'low'): string {
  const texts = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  }
  return texts[priority]
}

/**
 * 获取动作类型文本
 */
function getActionTypeText(type: string): string {
  const texts: Record<string, string> = {
    add_constraint: '添加约束',
    add_example: '添加示例',
    modify_instruction: '修改指令',
    add_format: '添加格式说明',
    adjust_length: '调整长度',
    add_keyword: '添加关键词',
    simplify: '简化提示词',
    add_context: '添加上下文',
  }
  return texts[type] || type
}

/**
 * 单个优化建议组件
 */
export function OptimizationSuggestionCard({
  suggestion,
  onApply,
  onIgnore,
  onPreview,
}: OptimizationSuggestionProps) {
  const [previewVisible, setPreviewVisible] = useState(false)
  const priorityColor = getPriorityColor(suggestion.priority)
  const patternColor = getFailureTypeColor(suggestion.relatedPatternType)

  const handleCopyContent = () => {
    navigator.clipboard.writeText(suggestion.action.content)
    message.success('已复制到剪贴板')
  }

  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        borderLeft: `4px solid ${priorityColor}`,
      }}
      styles={{
        body: { padding: '12px 16px' },
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Space size={8} wrap>
            <BulbOutlined style={{ color: priorityColor, fontSize: 16 }} />
            <Text strong>{suggestion.title}</Text>
            <Tag color={priorityColor}>{getPriorityText(suggestion.priority)}</Tag>
            <Tag color={patternColor}>{getFailureTypeName(suggestion.relatedPatternType)}</Tag>
          </Space>
        </div>
      </div>

      {/* 描述 */}
      <Paragraph
        type="secondary"
        style={{ marginTop: 8, marginBottom: 8, fontSize: 13 }}
      >
        {suggestion.description}
      </Paragraph>

      {/* 建议内容预览 */}
      <div
        style={{
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 4,
          padding: '8px 12px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size={4}>
            <Tag>{getActionTypeText(suggestion.action.type)}</Tag>
            {suggestion.action.position && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                位置: {suggestion.action.position === 'start' ? '开头' : suggestion.action.position === 'end' ? '结尾' : '替换'}
              </Text>
            )}
          </Space>
          <Tooltip title="复制内容">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopyContent}
            />
          </Tooltip>
        </div>
        <Paragraph
          style={{
            marginTop: 8,
            marginBottom: 0,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
          }}
          ellipsis={{ rows: 3, expandable: true }}
        >
          {suggestion.action.content}
        </Paragraph>
      </div>

      {/* 预估影响 */}
      <div style={{ marginBottom: 12 }}>
        <ThunderboltOutlined style={{ color: '#faad14', marginRight: 4 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {suggestion.estimatedImpact}
        </Text>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {onPreview && (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPreview(suggestion)}
          >
            预览
          </Button>
        )}
        {onIgnore && (
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={() => onIgnore(suggestion)}
          >
            忽略
          </Button>
        )}
        {onApply && (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => onApply(suggestion)}
          >
            应用建议
          </Button>
        )}
      </div>
    </Card>
  )
}

/**
 * 优化建议列表组件
 */
type OptimizationSuggestionListProps = {
  suggestions: Suggestion[]
  onApply?: (suggestion: Suggestion) => void
  onIgnore?: (suggestion: Suggestion) => void
  onPreview?: (suggestion: Suggestion) => void
  onApplyAll?: () => void
}

export function OptimizationSuggestionList({
  suggestions,
  onApply,
  onIgnore,
  onPreview,
  onApplyAll,
}: OptimizationSuggestionListProps) {
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set())

  const visibleSuggestions = suggestions.filter(s => !ignoredIds.has(s.id))
  const highPriorityCount = visibleSuggestions.filter(s => s.priority === 'high').length
  const mediumPriorityCount = visibleSuggestions.filter(s => s.priority === 'medium').length

  const handleIgnore = (suggestion: Suggestion) => {
    setIgnoredIds(prev => new Set([...prev, suggestion.id]))
    onIgnore?.(suggestion)
  }

  if (suggestions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>
        <BulbOutlined style={{ fontSize: 32, marginBottom: 8 }} />
        <div>暂无优化建议</div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          可能所有测试都通过了，或者没有明确的优化方向
        </Text>
      </div>
    )
  }

  return (
    <div>
      {/* 摘要 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 4,
        }}
      >
        <Space>
          <Text>共 {visibleSuggestions.length} 条建议</Text>
          {highPriorityCount > 0 && (
            <Badge count={highPriorityCount} style={{ backgroundColor: '#ff4d4f' }}>
              <Tag color="red">高优先级</Tag>
            </Badge>
          )}
          {mediumPriorityCount > 0 && (
            <Badge count={mediumPriorityCount} style={{ backgroundColor: '#faad14' }}>
              <Tag color="orange">中优先级</Tag>
            </Badge>
          )}
        </Space>
        {onApplyAll && visibleSuggestions.length > 1 && (
          <Button size="small" type="primary" onClick={onApplyAll}>
            应用全部高优先级建议
          </Button>
        )}
      </div>

      {/* 建议列表 */}
      {visibleSuggestions.map(suggestion => (
        <OptimizationSuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApply={onApply}
          onIgnore={handleIgnore}
          onPreview={onPreview}
        />
      ))}

      {/* 已忽略的建议数量 */}
      {ignoredIds.size > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已忽略 {ignoredIds.size} 条建议
            <Button
              type="link"
              size="small"
              onClick={() => setIgnoredIds(new Set())}
            >
              恢复显示
            </Button>
          </Text>
        </div>
      )}
    </div>
  )
}
