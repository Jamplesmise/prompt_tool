'use client'

import { Modal, Typography, Space, Button, Descriptions, Alert, Card } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { EvaluatorTypeTag, EVALUATOR_TYPE_CONFIG } from './EvaluatorTypeTag'
import type { EvaluatorTypeKey } from './EvaluatorTypeTag'

const { Title, Text, Paragraph } = Typography

type EvaluatorExample = {
  input: string
  expected: string
  output: string
  result: boolean
}

type EvaluatorConfig = {
  key: string
  label: string
  defaultValue: string
}

export type EvaluatorDetail = {
  id: string
  type: EvaluatorTypeKey | string
  name: string
  description: string
  useCases?: string[]
  configOptions?: EvaluatorConfig[]
  example?: EvaluatorExample
}

export type EvaluatorDetailModalProps = {
  open: boolean
  evaluator: EvaluatorDetail | null
  onClose: () => void
  onUse?: () => void
}

export function EvaluatorDetailModal({
  open,
  evaluator,
  onClose,
  onUse,
}: EvaluatorDetailModalProps) {
  if (!evaluator) return null

  const typeConfig = EVALUATOR_TYPE_CONFIG[evaluator.type as EvaluatorTypeKey]

  return (
    <Modal
      title={
        <Space>
          <span>{evaluator.name}</span>
          <Text type="secondary" style={{ fontWeight: 'normal', fontSize: 14 }}>
            ({evaluator.type})
          </Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={640}
      footer={
        <Space>
          {onUse && (
            <Button type="primary" onClick={onUse}>
              在任务中使用
            </Button>
          )}
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {/* 类型图标 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <EvaluatorTypeTag
            type={evaluator.type}
            size="large"
            showTooltip={false}
          />
        </div>

        {/* 描述 */}
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>描述</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {evaluator.description}
          </Paragraph>
        </div>

        {/* 适用场景 */}
        {evaluator.useCases && evaluator.useCases.length > 0 && (
          <div>
            <Title level={5} style={{ marginBottom: 8 }}>适用场景</Title>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
              {evaluator.useCases.map((useCase, index) => (
                <li key={index}>{useCase}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 示例 */}
        {evaluator.example && (
          <div>
            <Title level={5} style={{ marginBottom: 8 }}>示例</Title>
            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="输入">
                  <Text code>{evaluator.example.input}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="期望">
                  <Text code>{evaluator.example.expected}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="输出">
                  <Text code>{evaluator.example.output}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="结果">
                  {evaluator.example.result ? (
                    <Text type="success">
                      <CheckCircleOutlined /> 通过
                    </Text>
                  ) : (
                    <Text type="danger">
                      <CloseCircleOutlined /> 不通过
                    </Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}

        {/* 配置选项 */}
        {evaluator.configOptions && evaluator.configOptions.length > 0 && (
          <div>
            <Title level={5} style={{ marginBottom: 8 }}>配置选项</Title>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
              {evaluator.configOptions.map((option) => (
                <li key={option.key}>
                  <Text code>{option.key}</Text>: {option.label} (默认: {option.defaultValue})
                </li>
              ))}
            </ul>
          </div>
        )}
      </Space>
    </Modal>
  )
}
