'use client'

import { Card, Button, Space, Typography } from 'antd'
import { ArrowRight, FileSearch, Edit3, Download, GitBranch, RotateCcw } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

const { Text, Paragraph } = Typography

type NextAction = {
  key: string
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  primary?: boolean
}

type NextStepGuideProps = {
  /** 通过率 (0-1) */
  passRate: number
  /** 查看失败案例 */
  onViewFailures?: () => void
  /** 优化提示词 */
  onOptimizePrompt?: () => void
  /** 导出报告 */
  onExportReport?: () => void
  /** 发布版本 */
  onPublishVersion?: () => void
  /** 重新运行 */
  onRerun?: () => void
  /** 自定义样式 */
  style?: CSSProperties
}

export function NextStepGuide({
  passRate,
  onViewFailures,
  onOptimizePrompt,
  onExportReport,
  onPublishVersion,
  onRerun,
  style,
}: NextStepGuideProps) {
  const isGood = passRate >= 0.8
  const isMedium = passRate >= 0.5 && passRate < 0.8

  const getRecommendedActions = (): NextAction[] => {
    const actions: NextAction[] = []

    if (!isGood && onViewFailures) {
      actions.push({
        key: 'view-failures',
        icon: <FileSearch size={18} />,
        title: '查看失败案例',
        description: '分析失败原因，了解模型输出问题',
        onClick: onViewFailures,
        primary: true,
      })
    }

    if (!isGood && onOptimizePrompt) {
      actions.push({
        key: 'optimize',
        icon: <Edit3 size={18} />,
        title: '优化提示词',
        description: '根据失败模式调整提示词内容',
        onClick: onOptimizePrompt,
        primary: !onViewFailures,
      })
    }

    if (onRerun) {
      actions.push({
        key: 'rerun',
        icon: <RotateCcw size={18} />,
        title: '重新运行',
        description: isMedium ? '调整后重新测试' : '使用不同配置重试',
        onClick: onRerun,
      })
    }

    if (isGood && onExportReport) {
      actions.push({
        key: 'export',
        icon: <Download size={18} />,
        title: '导出报告',
        description: '下载测试结果用于分析和存档',
        onClick: onExportReport,
        primary: true,
      })
    }

    if (isGood && onPublishVersion) {
      actions.push({
        key: 'publish',
        icon: <GitBranch size={18} />,
        title: '发布版本',
        description: '将当前提示词发布为正式版本',
        onClick: onPublishVersion,
      })
    }

    return actions
  }

  const actions = getRecommendedActions()

  if (actions.length === 0) {
    return null
  }

  const cardStyle: CSSProperties = {
    borderRadius: 8,
    ...style,
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <ArrowRight size={16} />
          <span>下一步建议</span>
        </Space>
      }
      style={cardStyle}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </Space>
    </Card>
  )
}

function ActionCard({ action }: { action: NextAction }) {
  const cardStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 6,
    border: action.primary ? '1px solid #EF4444' : '1px solid #f0f0f0',
    backgroundColor: action.primary ? '#f0f7ff' : '#fafafa',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }

  return (
    <div
      style={cardStyle}
      onClick={action.onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          color: action.primary ? '#EF4444' : '#666',
          flexShrink: 0,
        }}
      >
        {action.icon}
      </div>
      <div style={{ flex: 1 }}>
        <Text strong style={{ display: 'block', color: action.primary ? '#EF4444' : undefined }}>
          {action.title}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {action.description}
        </Text>
      </div>
      <ArrowRight size={16} style={{ color: '#bbb' }} />
    </div>
  )
}
