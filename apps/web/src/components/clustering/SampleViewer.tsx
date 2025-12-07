'use client'

import { useMemo } from 'react'
import {
  Modal,
  Typography,
  Space,
  Tag,
  Button,
  Descriptions,
  Divider,
  message,
} from 'antd'
import {
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { TaskResultData } from '@/components/results/types'

const { Text, Paragraph } = Typography

type SampleViewerProps = {
  sample: TaskResultData | null
  open: boolean
  onClose: () => void
}

/**
 * 样本查看器
 * 查看单个样本的详细对比
 */
export function SampleViewer({ sample, open, onClose }: SampleViewerProps) {
  // 计算差异
  const diff = useMemo(() => {
    if (!sample) return null

    const expected = sample.expected || ''
    const actual = sample.output || ''

    // 简单的差异检测
    const expectedLines = expected.split('\n')
    const actualLines = actual.split('\n')

    return {
      expected,
      actual,
      expectedLines,
      actualLines,
      lengthDiff: actual.length - expected.length,
      lineDiff: actualLines.length - expectedLines.length,
    }
  }, [sample])

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(`${label}已复制`)
    } catch {
      message.error('复制失败')
    }
  }

  if (!sample) return null

  return (
    <Modal
      title={
        <Space>
          {sample.passed ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          样本详情
          <Tag color={sample.passed ? 'green' : 'red'}>
            {sample.passed ? '通过' : '失败'}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      {/* 基本信息 */}
      <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="状态">
          <Tag color={
            sample.status === 'SUCCESS' ? 'green' :
            sample.status === 'TIMEOUT' ? 'orange' : 'red'
          }>
            {sample.status}
          </Tag>
        </Descriptions.Item>
        {sample.latency && (
          <Descriptions.Item label="延迟">
            {(sample.latency / 1000).toFixed(2)}s
          </Descriptions.Item>
        )}
        {sample.cost && (
          <Descriptions.Item label="成本">
            ${sample.cost.toFixed(6)}
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 输入 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text strong>输入</Text>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(JSON.stringify(sample.input, null, 2), '输入')}
          >
            复制
          </Button>
        </div>
        <div
          style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 8,
            maxHeight: 150,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {JSON.stringify(sample.input, null, 2)}
          </pre>
        </div>
      </div>

      {/* 期望输出 vs 实际输出 - 左右对比 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 期望输出 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Space>
              <Text strong style={{ color: '#52c41a' }}>期望输出</Text>
              {diff && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {diff.expected.length} 字符 / {diff.expectedLines.length} 行
                </Text>
              )}
            </Space>
            {sample.expected && (
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(sample.expected || '', '期望输出')}
              />
            )}
          </div>
          <div
            style={{
              background: '#f6ffed',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #b7eb8f',
              height: 250,
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
              {sample.expected || '（无期望输出）'}
            </pre>
          </div>
        </div>

        {/* 实际输出 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Space>
              <Text strong style={{ color: sample.passed ? '#52c41a' : '#ff4d4f' }}>
                实际输出
              </Text>
              {diff && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {diff.actual.length} 字符 / {diff.actualLines.length} 行
                  {diff.lengthDiff !== 0 && (
                    <span style={{ color: diff.lengthDiff > 0 ? '#faad14' : '#ff4d4f', marginLeft: 4 }}>
                      ({diff.lengthDiff > 0 ? '+' : ''}{diff.lengthDiff})
                    </span>
                  )}
                </Text>
              )}
            </Space>
            {sample.output && (
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(sample.output || '', '实际输出')}
              />
            )}
          </div>
          <div
            style={{
              background: sample.passed ? '#f6ffed' : '#fff2f0',
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${sample.passed ? '#b7eb8f' : '#ffa39e'}`,
              height: 250,
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
              {sample.output || '（无输出）'}
            </pre>
          </div>
        </div>
      </div>

      {/* 评估器结果 */}
      {sample.evaluations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            评估器结果
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            {sample.evaluations.map(evaluation => (
              <div
                key={evaluation.evaluatorId}
                style={{
                  padding: 12,
                  background: evaluation.passed ? '#f6ffed' : '#fffbe6',
                  borderRadius: 8,
                  border: `1px solid ${evaluation.passed ? '#b7eb8f' : '#ffe58f'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Space>
                    {evaluation.passed ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#faad14' }} />
                    )}
                    <Text strong>{evaluation.evaluatorName}</Text>
                  </Space>
                  {evaluation.score !== null && (
                    <Tag color={evaluation.passed ? 'green' : 'orange'}>
                      得分: {evaluation.score}
                    </Tag>
                  )}
                </div>
                {evaluation.reason && (
                  <Text type="secondary">{evaluation.reason}</Text>
                )}
              </div>
            ))}
          </Space>
        </div>
      )}

      {/* 错误信息 */}
      {sample.error && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8, color: '#ff4d4f' }}>
            错误信息
          </Text>
          <div
            style={{
              padding: 12,
              background: '#fff2f0',
              borderRadius: 8,
              border: '1px solid #ffa39e',
            }}
          >
            <Text type="danger" style={{ fontFamily: 'monospace', fontSize: 13 }}>
              {sample.error}
            </Text>
          </div>
        </div>
      )}

      {/* Token 和成本信息 */}
      {(sample.inputTokens || sample.outputTokens) && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Descriptions size="small" column={4}>
            {sample.inputTokens && (
              <Descriptions.Item label="输入 Token">
                {sample.inputTokens}
              </Descriptions.Item>
            )}
            {sample.outputTokens && (
              <Descriptions.Item label="输出 Token">
                {sample.outputTokens}
              </Descriptions.Item>
            )}
            {sample.inputTokens && sample.outputTokens && (
              <Descriptions.Item label="总 Token">
                {sample.inputTokens + sample.outputTokens}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}
    </Modal>
  )
}
