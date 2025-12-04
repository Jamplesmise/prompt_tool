'use client'

import { Modal, Space, Typography, Spin, Result, Descriptions, Card } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button } from 'antd'

const { Text, Paragraph } = Typography

type TestResult = {
  success: boolean
  latency: number         // 毫秒
  tokenUsage?: {
    input: number
    output: number
  }
  response?: string       // 模型响应内容
  error?: string
}

type TestResultModalProps = {
  open: boolean
  modelName?: string
  providerName?: string
  result: TestResult | null
  loading?: boolean
  onClose: () => void
  onRetry?: () => void
}

export function TestResultModal({
  open,
  modelName,
  providerName,
  result,
  loading = false,
  onClose,
  onRetry,
}: TestResultModalProps) {
  const formatLatency = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)} 秒`
    }
    return `${ms} ms`
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            正在测试连接...
          </Paragraph>
        </div>
      )
    }

    if (!result) {
      return null
    }

    if (result.success) {
      return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="连接成功"
            style={{ padding: '16px 0' }}
          />

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="响应延迟">
              <Text strong>{formatLatency(result.latency)}</Text>
            </Descriptions.Item>
            {result.tokenUsage && (
              <Descriptions.Item label="Token 消耗">
                <Text>
                  {result.tokenUsage.input} (input) + {result.tokenUsage.output} (output) ={' '}
                  <Text strong>{result.tokenUsage.input + result.tokenUsage.output}</Text>
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          {result.response && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                测试响应:
              </Text>
              <Card
                size="small"
                style={{ backgroundColor: '#fafafa' }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <Paragraph
                  style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}
                >
                  {result.response}
                </Paragraph>
              </Card>
            </div>
          )}
        </Space>
      )
    }

    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Result
          status="error"
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          title="连接失败"
          style={{ padding: '16px 0' }}
        />

        {result.error && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              错误信息:
            </Text>
            <Card
              size="small"
              style={{ backgroundColor: '#fff2f0', borderColor: '#ffccc7' }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Paragraph
                type="danger"
                style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {result.error}
              </Paragraph>
            </Card>
          </div>
        )}
      </Space>
    )
  }

  const footer = () => {
    const buttons = []

    if (!loading && result && !result.success && onRetry) {
      buttons.push(
        <Button key="retry" icon={<ReloadOutlined />} onClick={onRetry}>
          重试
        </Button>
      )
    }

    buttons.push(
      <Button key="close" type="primary" onClick={onClose}>
        关闭
      </Button>
    )

    return buttons
  }

  return (
    <Modal
      title="连接测试结果"
      open={open}
      onCancel={onClose}
      footer={footer()}
      width={520}
      destroyOnClose
    >
      {(modelName || providerName) && (
        <div style={{ marginBottom: 16 }}>
          {modelName && (
            <div>
              <Text type="secondary">模型: </Text>
              <Text strong>{modelName}</Text>
            </div>
          )}
          {providerName && (
            <div>
              <Text type="secondary">提供商: </Text>
              <Text>{providerName}</Text>
            </div>
          )}
        </div>
      )}

      {renderContent()}
    </Modal>
  )
}

export type { TestResult, TestResultModalProps }
