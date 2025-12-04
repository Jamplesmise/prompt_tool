'use client'

import { Button, Typography } from 'antd'
import {
  ThunderboltOutlined,
  SearchOutlined,
  PlusOutlined,
  BookOutlined,
} from '@ant-design/icons'
import type { CSSProperties } from 'react'

const { Text, Paragraph } = Typography

type TaskEmptyStateProps = {
  filtered?: boolean
  onCreateTask?: () => void
  onClearFilter?: () => void
}

export function TaskEmptyState({
  filtered = false,
  onCreateTask,
  onClearFilter,
}: TaskEmptyStateProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
  }

  const cardStyle: CSSProperties = {
    textAlign: 'center',
    padding: '40px 60px',
    background: '#fafafa',
    borderRadius: 12,
    border: '1px dashed #d9d9d9',
    maxWidth: 400,
  }

  const iconStyle: CSSProperties = {
    fontSize: 48,
    marginBottom: 16,
  }

  const createButtonStyle: CSSProperties = {
    background: 'linear-gradient(135deg, #1677FF, #4096ff)',
    borderColor: 'transparent',
    boxShadow: '0 2px 8px rgba(22, 119, 255, 0.3)',
    height: 40,
    paddingLeft: 24,
    paddingRight: 24,
  }

  // 筛选无结果
  if (filtered) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <SearchOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />
          <Paragraph style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
            没有找到匹配的任务
          </Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            尝试调整筛选条件
          </Paragraph>
          {onClearFilter && (
            <Button onClick={onClearFilter}>
              清除筛选条件
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 无任务
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <ThunderboltOutlined style={{ ...iconStyle, color: '#1677FF' }} />
        <Paragraph style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
          还没有创建测试任务
        </Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          创建你的第一个测试任务，<br />
          验证 AI 模型的输出质量
        </Paragraph>
        {onCreateTask && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            style={createButtonStyle}
            onClick={onCreateTask}
          >
            创建测试任务
          </Button>
        )}
        <div style={{ marginTop: 16 }}>
          <Button
            type="link"
            icon={<BookOutlined />}
            href="/docs"
            target="_blank"
          >
            查看使用文档
          </Button>
        </div>
      </div>
    </div>
  )
}
