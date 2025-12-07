'use client'

import { Card, Progress, Space, Typography, Tag, Collapse, Button } from 'antd'
import { CheckCircle, XCircle, AlertTriangle, ChevronDown } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  analyzeFailures,
  getFailureTypeName,
  getFailureTypeColor,
  type FailurePattern,
} from '@/lib/failureAnalysis'

const { Text, Paragraph } = Typography

type TaskStats = {
  total: number
  passed: number
  failed: number
}

type TaskResultItem = {
  passed: boolean
  output?: string
  expectedOutput?: string
  evaluatorResults?: Array<{
    evaluatorName: string
    passed: boolean
    reason?: string
  }>
}

type TaskCompleteSummaryProps = {
  stats: TaskStats
  results: TaskResultItem[]
  onViewFailures?: () => void
  onOptimizePrompt?: () => void
  onExportReport?: () => void
  style?: CSSProperties
}

export function TaskCompleteSummary({
  stats,
  results,
  onViewFailures,
  onOptimizePrompt,
  onExportReport,
  style,
}: TaskCompleteSummaryProps) {
  const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
  const isGood = passRate >= 80
  const failurePatterns = analyzeFailures(results)

  const getStatusIcon = () => {
    if (passRate >= 80) {
      return <CheckCircle size={24} style={{ color: '#52c41a' }} />
    }
    if (passRate >= 50) {
      return <AlertTriangle size={24} style={{ color: '#faad14' }} />
    }
    return <XCircle size={24} style={{ color: '#ff4d4f' }} />
  }

  const getStatusColor = () => {
    if (passRate >= 80) return '#52c41a'
    if (passRate >= 50) return '#faad14'
    return '#ff4d4f'
  }

  const cardStyle: CSSProperties = {
    borderRadius: 8,
    border: `1px solid ${isGood ? '#b7eb8f' : '#ffd591'}`,
    backgroundColor: isGood ? '#f6ffed' : '#fffbe6',
    ...style,
  }

  return (
    <Card size="small" style={cardStyle} styles={{ body: { padding: 16 } }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* 左侧：进度环 */}
        <div style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={Math.round(passRate)}
            size={80}
            strokeColor={getStatusColor()}
            format={(percent) => (
              <span style={{ fontSize: 18, fontWeight: 600 }}>{percent}%</span>
            )}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              通过率
            </Text>
          </div>
        </div>

        {/* 右侧：详情 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {getStatusIcon()}
            <Text strong style={{ fontSize: 16 }}>
              {isGood ? '测试表现良好' : '测试需要优化'}
            </Text>
          </div>

          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>} size={16}>
            <Text>
              总数: <Text strong>{stats.total}</Text>
            </Text>
            <Text style={{ color: '#52c41a' }}>
              通过: <Text strong style={{ color: '#52c41a' }}>{stats.passed}</Text>
            </Text>
            <Text style={{ color: '#ff4d4f' }}>
              失败: <Text strong style={{ color: '#ff4d4f' }}>{stats.failed}</Text>
            </Text>
          </Space>

          {/* 失败模式分析 */}
          {failurePatterns.length > 0 && (
            <Collapse
              ghost
              expandIcon={({ isActive }) => (
                <ChevronDown
                  size={14}
                  style={{
                    transform: isActive ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              )}
              style={{ marginTop: 12 }}
              items={[
                {
                  key: 'failures',
                  label: (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      失败模式分析（{failurePatterns.length} 种）
                    </Text>
                  ),
                  children: (
                    <div style={{ paddingLeft: 0 }}>
                      {failurePatterns.slice(0, 3).map((pattern) => (
                        <FailurePatternItem key={pattern.type} pattern={pattern} />
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* 操作按钮 */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {!isGood && onViewFailures && (
              <Button size="small" type="primary" danger onClick={onViewFailures}>
                查看失败案例
              </Button>
            )}
            {!isGood && onOptimizePrompt && (
              <Button size="small" onClick={onOptimizePrompt}>
                优化提示词
              </Button>
            )}
            {isGood && onExportReport && (
              <Button size="small" type="primary" onClick={onExportReport}>
                导出报告
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function FailurePatternItem({ pattern }: { pattern: FailurePattern }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Tag color={getFailureTypeColor(pattern.type)} style={{ margin: 0 }}>
          {getFailureTypeName(pattern.type)}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {pattern.count} 次
        </Text>
      </div>
      <Paragraph
        type="secondary"
        style={{ fontSize: 12, marginBottom: 0, paddingLeft: 4 }}
        ellipsis={{ rows: 2 }}
      >
        {pattern.suggestion}
      </Paragraph>
    </div>
  )
}
