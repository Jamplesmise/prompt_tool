/**
 * 压缩确认弹窗
 *
 * 显示压缩预览和级别选择
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Modal, Radio, Space, Typography, Alert, Descriptions, Spin } from 'antd'
import {
  CompressOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type {
  CompressionLevel,
  ContextUsage,
  CompressionResult,
} from '@platform/shared'

const { Text, Title } = Typography

// ============================================
// 类型定义
// ============================================

export type CompressDialogProps = {
  /** 是否可见 */
  open: boolean
  /** 当前上下文使用量 */
  usage: ContextUsage
  /** 建议的压缩级别 */
  suggestedLevel?: CompressionLevel
  /** 预估的压缩结果 */
  estimatedResult?: {
    beforeTokens: number
    afterTokens: number
    compressionRatio: number
  }
  /** 压缩回调 */
  onCompress: (level: CompressionLevel) => Promise<CompressionResult | void>
  /** 取消回调 */
  onCancel: () => void
  /** 是否正在压缩 */
  loading?: boolean
}

// ============================================
// 常量
// ============================================

const LEVEL_OPTIONS: Array<{
  value: CompressionLevel
  label: string
  description: string
  retentionRate: string
}> = [
  {
    value: 'standard',
    label: '标准压缩',
    description: '保留目标、TODO状态、所有决策点、最近3个操作详情',
    retentionRate: '约60%',
  },
  {
    value: 'deep',
    label: '深度压缩',
    description: '保留目标、TODO状态、关键决策，所有操作改为一句话摘要',
    retentionRate: '约30%',
  },
  {
    value: 'phase',
    label: '阶段压缩',
    description: '保留阶段完成状态和产出物ID，整个阶段合并为一段摘要',
    retentionRate: '约20%',
  },
  {
    value: 'checkpoint',
    label: '检查点压缩',
    description: '在检查点通过后执行，保留最近2个操作',
    retentionRate: '约50%',
  },
]

// ============================================
// 组件
// ============================================

/**
 * 压缩确认弹窗
 */
export const CompressDialog: React.FC<CompressDialogProps> = ({
  open,
  usage,
  suggestedLevel = 'standard',
  estimatedResult,
  onCompress,
  onCancel,
  loading = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<CompressionLevel>(suggestedLevel)
  const [compressResult, setCompressResult] = useState<CompressionResult | null>(null)

  // 格式化 token 数
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return String(tokens)
  }

  // 获取选中的级别信息
  const selectedOption = useMemo(
    () => LEVEL_OPTIONS.find((opt) => opt.value === selectedLevel),
    [selectedLevel]
  )

  // 预估压缩效果
  const estimatedEffect = useMemo(() => {
    if (estimatedResult) {
      return estimatedResult
    }

    // 根据级别估算
    const retentionRates: Record<CompressionLevel, number> = {
      standard: 0.6,
      deep: 0.3,
      phase: 0.2,
      checkpoint: 0.5,
    }

    const rate = retentionRates[selectedLevel]
    const afterTokens = Math.round(usage.totalTokens * rate)

    return {
      beforeTokens: usage.totalTokens,
      afterTokens,
      compressionRatio: rate,
    }
  }, [selectedLevel, usage.totalTokens, estimatedResult])

  // 处理压缩
  const handleCompress = async () => {
    const result = await onCompress(selectedLevel)
    if (result) {
      setCompressResult(result)
    }
  }

  // 渲染压缩结果
  if (compressResult) {
    return (
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>压缩完成</span>
          </Space>
        }
        open={open}
        onOk={onCancel}
        onCancel={onCancel}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="确定"
      >
        <Alert
          type="success"
          message="上下文压缩成功"
          description={`Token 使用量从 ${formatTokens(compressResult.beforeTokens)} 压缩至 ${formatTokens(compressResult.afterTokens)}`}
          style={{ marginBottom: 16 }}
        />

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="压缩前">
            {formatTokens(compressResult.beforeTokens)} tokens
          </Descriptions.Item>
          <Descriptions.Item label="压缩后">
            {formatTokens(compressResult.afterTokens)} tokens
          </Descriptions.Item>
          <Descriptions.Item label="压缩比例">
            {((1 - compressResult.compressionRatio) * 100).toFixed(0)}%
          </Descriptions.Item>
          <Descriptions.Item label="耗时">
            {compressResult.duration}ms
          </Descriptions.Item>
        </Descriptions>

        {compressResult.droppedInfo && compressResult.droppedInfo.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">已丢弃的信息：</Text>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {compressResult.droppedInfo.map((info, index) => (
                <li key={index}>
                  <Text type="secondary">{info}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <CompressOutlined />
          <span>压缩上下文</span>
        </Space>
      }
      open={open}
      onOk={handleCompress}
      onCancel={onCancel}
      okText="开始压缩"
      cancelText="取消"
      confirmLoading={loading}
      width={520}
    >
      <Spin spinning={loading}>
        {/* 当前状态 */}
        <Alert
          type={usage.warningLevel === 'critical' ? 'error' : 'warning'}
          icon={<WarningOutlined />}
          message={`当前上下文使用率: ${usage.usagePercent.toFixed(1)}%`}
          description={`已使用 ${formatTokens(usage.totalTokens)} / ${formatTokens(usage.maxTokens)} tokens`}
          style={{ marginBottom: 16 }}
        />

        {/* 压缩级别选择 */}
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            选择压缩级别
          </Title>
          <Radio.Group
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {LEVEL_OPTIONS.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  style={{
                    display: 'block',
                    padding: '12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    marginRight: 0,
                    background:
                      selectedLevel === option.value ? '#e6f4ff' : undefined,
                  }}
                >
                  <div>
                    <Text strong>
                      {option.label}
                      {option.value === suggestedLevel && (
                        <Text type="success" style={{ marginLeft: 8 }}>
                          (推荐)
                        </Text>
                      )}
                    </Text>
                    <div style={{ marginLeft: 24 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {option.description}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        预计保留率: {option.retentionRate}
                      </Text>
                    </div>
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </div>

        {/* 预估效果 */}
        <div
          style={{
            background: '#fafafa',
            padding: 12,
            borderRadius: 6,
          }}
        >
          <Text strong>预估压缩效果</Text>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 8,
            }}
          >
            <div>
              <Text type="secondary">压缩前:</Text>
              <br />
              <Text>{formatTokens(estimatedEffect.beforeTokens)} tokens</Text>
            </div>
            <div style={{ fontSize: 20 }}>→</div>
            <div>
              <Text type="secondary">压缩后:</Text>
              <br />
              <Text strong style={{ color: '#52c41a' }}>
                {formatTokens(estimatedEffect.afterTokens)} tokens
              </Text>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Text type="secondary">节省:</Text>
              <br />
              <Text strong style={{ color: '#1890ff' }}>
                {((1 - estimatedEffect.compressionRatio) * 100).toFixed(0)}%
              </Text>
            </div>
          </div>
        </div>

        {/* 注意事项 */}
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            注意：压缩后部分历史操作详情将被简化，但关键信息（目标、决策、资源ID）会被保留。
          </Text>
        </div>
      </Spin>
    </Modal>
  )
}

export default CompressDialog
