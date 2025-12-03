'use client'

import { Drawer, Descriptions, Typography, Divider, Tag, Space, Card, List } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { ResultStatusTag, EvaluationTag } from './TaskStatusTag'
import type { TaskResultItem } from '@/services/tasks'

const { Text, Paragraph } = Typography

// 格式化成本显示
const formatCost = (cost: number | null, currency: 'USD' | 'CNY' = 'USD'): string => {
  if (cost === null) return '-'
  const symbol = currency === 'CNY' ? '¥' : '$'
  return `${symbol}${cost.toFixed(6)}`
}

type ResultDetailProps = {
  result: TaskResultItem | null
  visible: boolean
  onClose: () => void
}

export function ResultDetail({ result, visible, onClose }: ResultDetailProps) {
  if (!result) return null

  return (
    <Drawer
      title="结果详情"
      placement="right"
      width={640}
      open={visible}
      onClose={onClose}
    >
      {/* 基本信息 */}
      <Descriptions column={2} size="small">
        <Descriptions.Item label="序号">{result.rowIndex + 1}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <ResultStatusTag status={result.status} />
        </Descriptions.Item>
        <Descriptions.Item label="提示词">
          {result.promptName} (v{result.promptVersion})
        </Descriptions.Item>
        <Descriptions.Item label="模型">{result.modelName}</Descriptions.Item>
        <Descriptions.Item label="耗时">
          {result.latencyMs ? `${result.latencyMs}ms` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="费用">
          {formatCost(result.cost, result.costCurrency)}
        </Descriptions.Item>
      </Descriptions>

      {/* Token 消耗 */}
      <Card size="small" title="Token 消耗" style={{ marginTop: 16 }}>
        <Space size="large">
          <Text>输入: {result.tokens.input}</Text>
          <Text>输出: {result.tokens.output}</Text>
          <Text strong>总计: {result.tokens.total}</Text>
        </Space>
      </Card>

      {/* 错误信息 */}
      {result.error && (
        <Card size="small" title="错误信息" style={{ marginTop: 16 }}>
          <Text type="danger">{result.error}</Text>
        </Card>
      )}

      <Divider />

      {/* 输入 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>输入数据</Text>
        <Card size="small" style={{ marginTop: 8, backgroundColor: '#fafafa' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(result.input, null, 2)}
          </pre>
        </Card>
      </div>

      {/* 输出 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>模型输出</Text>
        <Card size="small" style={{ marginTop: 8, backgroundColor: '#fafafa' }}>
          <Paragraph
            style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}
            copyable={!!result.output}
          >
            {result.output || '(无输出)'}
          </Paragraph>
        </Card>
      </div>

      {/* 期望输出 */}
      {result.expected && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>期望输出</Text>
          <Card size="small" style={{ marginTop: 8, backgroundColor: '#f0f5ff' }}>
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {result.expected}
            </Paragraph>
          </Card>
        </div>
      )}

      <Divider />

      {/* 评估结果 */}
      <div>
        <Text strong>评估结果</Text>
        {result.evaluations.length === 0 ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            暂无评估结果
          </Text>
        ) : (
          <List
            size="small"
            style={{ marginTop: 8 }}
            dataSource={result.evaluations}
            renderItem={(evaluation) => (
              <List.Item>
                <Card size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Text strong>{evaluation.evaluatorName}</Text>
                      <Tag>{evaluation.evaluatorType}</Tag>
                    </Space>
                    <EvaluationTag passed={evaluation.passed} score={evaluation.score} />
                  </div>
                  {evaluation.reason && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">原因: {evaluation.reason}</Text>
                    </div>
                  )}
                  {evaluation.details && Object.keys(evaluation.details).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">详情:</Text>
                      <pre style={{ margin: 0, fontSize: 11, color: '#666' }}>
                        {JSON.stringify(evaluation.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  {evaluation.latencyMs && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        评估耗时: {evaluation.latencyMs}ms
                      </Text>
                    </div>
                  )}
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </Drawer>
  )
}
