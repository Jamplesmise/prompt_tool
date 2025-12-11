'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Select,
  Space,
  Typography,
  Tag,
  Button,
  Alert,
  Divider,
  Switch,
  Empty,
  Tooltip,
  Collapse,
  Spin,
} from 'antd'
import {
  LinkOutlined,
  DisconnectOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  useInputSchemas,
  useOutputSchemas,
  useInputSchema,
  useOutputSchema,
} from '@/hooks/useSchemas'
import { useRouter } from 'next/navigation'
import type {
  InputVariableDefinition,
  OutputFieldDefinition,
  AggregationMode,
  PromptVariable,
} from '@platform/shared'

const { Text, Title } = Typography

type SchemaAssociationProps = {
  inputSchemaId?: string | null
  outputSchemaId?: string | null
  promptVariables: PromptVariable[]  // 从提示词中提取的变量
  onChange: (inputSchemaId: string | null, outputSchemaId: string | null) => void
  readonly?: boolean
}

const AGGREGATION_LABELS: Record<AggregationMode, string> = {
  all_pass: '全部通过',
  weighted_average: '加权平均',
  critical_first: '关键优先',
  custom: '自定义',
}

export function SchemaAssociation({
  inputSchemaId,
  outputSchemaId,
  promptVariables,
  onChange,
  readonly = false,
}: SchemaAssociationProps) {
  const router = useRouter()

  // 获取 Schema 列表
  const { data: inputSchemas, isLoading: inputSchemasLoading } = useInputSchemas()
  const { data: outputSchemas, isLoading: outputSchemasLoading } = useOutputSchemas()

  // 获取选中的 Schema 详情
  const { data: selectedInput } = useInputSchema(inputSchemaId || undefined)
  const { data: selectedOutput } = useOutputSchema(outputSchemaId || undefined)

  // 是否使用结构化模式
  const isStructured = !!(inputSchemaId || outputSchemaId)

  // 将 PromptVariable[] 转换为变量名数组
  const promptVarNames = useMemo(() => {
    return promptVariables.map((v) => v.name)
  }, [promptVariables])

  // 检查变量是否匹配
  const variableMatchStatus = useMemo(() => {
    if (!selectedInput?.variables) {
      return { matched: [], missing: [], extra: promptVarNames }
    }

    const schemaKeys = new Set(selectedInput.variables.map((v: InputVariableDefinition) => v.key))
    const promptVarSet = new Set(promptVarNames)

    const matched = promptVarNames.filter((v) => schemaKeys.has(v))
    const missing = selectedInput.variables
      .filter((v: InputVariableDefinition) => !promptVarSet.has(v.key))
      .map((v: InputVariableDefinition) => v.key)
    const extra = promptVarNames.filter((v) => !schemaKeys.has(v))

    return { matched, missing, extra }
  }, [selectedInput, promptVarNames])

  // 渲染变量预览
  const renderVariablePreview = () => {
    if (!selectedInput?.variables?.length) return null

    return (
      <div>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>
          输入变量
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selectedInput.variables.map((v: InputVariableDefinition) => {
            const isMatched = promptVariables.some(pv => pv.name === v.key)
            return (
              <Tooltip key={v.key} title={v.description || v.name}>
                <Tag
                  color={isMatched ? 'green' : 'orange'}
                  icon={isMatched ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                >
                  {v.key}
                  {v.required && <Text type="danger"> *</Text>}
                </Tag>
              </Tooltip>
            )
          })}
        </div>
        {variableMatchStatus.missing.length > 0 && (
          <Alert
            type="warning"
            message="变量不匹配"
            description={`提示词中缺少以下变量：${variableMatchStatus.missing.join('、')}`}
            style={{ marginTop: 8 }}
            showIcon
          />
        )}
      </div>
    )
  }

  // 渲染字段预览
  const renderFieldPreview = () => {
    if (!selectedOutput?.fields?.length) return null

    const criticalFields = selectedOutput.fields.filter((f: OutputFieldDefinition) => f.evaluation?.isCritical)

    return (
      <div>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>
          输出字段
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {selectedOutput.fields.map((f: OutputFieldDefinition) => (
            <Tooltip key={f.key} title={f.description || f.name}>
              <Tag color={f.evaluation?.isCritical ? 'red' : 'blue'}>
                {f.key}
                {f.required && <Text type="danger"> *</Text>}
              </Tag>
            </Tooltip>
          ))}
        </div>
        <Space split={<Divider type="vertical" />}>
          <Text type="secondary">
            解析模式: <Tag>{selectedOutput.parseMode}</Tag>
          </Text>
          <Text type="secondary">
            聚合策略: <Tag>{AGGREGATION_LABELS[selectedOutput.aggregation?.mode as AggregationMode] || selectedOutput.aggregation?.mode}</Tag>
          </Text>
          {criticalFields.length > 0 && (
            <Text type="secondary">
              关键字段: <Tag color="red">{criticalFields.length}</Tag>
            </Text>
          )}
        </Space>
      </div>
    )
  }

  const isLoading = inputSchemasLoading || outputSchemasLoading

  return (
    <div>
      {/* 模式提示 */}
      {!isStructured && (
        <Alert
          type="info"
          message="简单模式"
          description="当前使用简单模式评估。关联结构定义后可使用多变量输入和多字段输出评估。"
          style={{ marginBottom: 16 }}
        />
      )}

      {isStructured && (
        <Alert
          type="success"
          message="结构化模式"
          description="已关联结构定义，支持多变量输入、多字段输出评估和自定义聚合策略。"
          style={{ marginBottom: 16 }}
          icon={<LinkOutlined />}
        />
      )}

      {/* 输入结构选择 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            <Text strong>输入结构</Text>
            <Tooltip title="定义提示词模板中的变量类型和数据集映射">
              <QuestionCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => router.push('/schemas/input/new')}
          >
            新建
          </Button>
        </div>
        <Select
          value={inputSchemaId || undefined}
          onChange={(v) => onChange(v || null, outputSchemaId || null)}
          loading={isLoading}
          allowClear
          placeholder="选择输入结构（可选）"
          style={{ width: '100%' }}
          disabled={readonly}
          options={inputSchemas?.map((s) => ({
            value: s.id,
            label: (
              <Space>
                <LinkOutlined />
                {s.name}
                <Tag>{s.variables?.length ?? 0} 变量</Tag>
              </Space>
            ),
          }))}
        />
      </div>

      {/* 输入变量预览 */}
      {selectedInput && (
        <Card size="small" style={{ marginBottom: 16 }}>
          {renderVariablePreview()}
        </Card>
      )}

      {/* 输出结构选择 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            <Text strong>输出结构</Text>
            <Tooltip title="定义模型输出的解析规则和评估配置">
              <QuestionCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => router.push('/schemas/output/new')}
          >
            新建
          </Button>
        </div>
        <Select
          value={outputSchemaId || undefined}
          onChange={(v) => onChange(inputSchemaId || null, v || null)}
          loading={isLoading}
          allowClear
          placeholder="选择输出结构（可选）"
          style={{ width: '100%' }}
          disabled={readonly}
          options={outputSchemas?.map((s) => ({
            value: s.id,
            label: (
              <Space>
                <LinkOutlined />
                {s.name}
                <Tag>{s.fields?.length ?? 0} 字段</Tag>
                <Tag>{AGGREGATION_LABELS[s.aggregation?.mode as AggregationMode] || s.aggregation?.mode}</Tag>
              </Space>
            ),
          }))}
        />
      </div>

      {/* 输出字段预览 */}
      {selectedOutput && (
        <Card size="small">
          {renderFieldPreview()}
        </Card>
      )}

      {/* 无关联时的空状态 */}
      {!selectedInput && !selectedOutput && (
        <Empty
          description="暂未关联结构定义"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Space>
            <Button onClick={() => router.push('/schemas')}>
              浏览结构定义
            </Button>
            <Button type="primary" onClick={() => router.push('/schemas/ai-assistant')}>
              AI 智能生成
            </Button>
          </Space>
        </Empty>
      )}
    </div>
  )
}

export default SchemaAssociation
