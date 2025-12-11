'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Select,
  Typography,
  Tag,
  Alert,
  Space,
  Card,
  Divider,
  Button,
  Tooltip,
  Switch,
  Empty,
} from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined,
  SyncOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { useInputSchemas, useOutputSchemas, useInputSchema, useOutputSchema } from '@/hooks/useSchemas'
import type {
  InputVariableDefinition,
  OutputFieldDefinition,
} from '@platform/shared'

const { Text } = Typography

// 输入变量映射
export type InputVariableMapping = {
  variableKey: string
  variableName: string
  variableType: string
  required: boolean
  sourceColumn: string | null
  autoDetected: boolean
}

// 期望值映射
export type ExpectedValueMapping = {
  fieldKey: string
  fieldName: string
  fieldType: string
  sourceColumn: string | null
  autoDetected: boolean
}

export type SchemaMappingResult = {
  inputSchemaId: string | null
  outputSchemaId: string | null
  inputMappings: Record<string, string>  // variableKey -> sourceColumn
  expectedMappings: Record<string, string>  // fieldKey -> sourceColumn
}

type SchemaFieldMapperProps = {
  sourceColumns: string[]
  value: SchemaMappingResult
  onChange: (result: SchemaMappingResult) => void
}

// 自动匹配函数
function autoMatchColumn(key: string, name: string, columns: string[]): string | null {
  const lowerKey = key.toLowerCase()
  const lowerName = name.toLowerCase()

  for (const col of columns) {
    const lowerCol = col.toLowerCase()
    // 精确匹配
    if (lowerCol === lowerKey || lowerCol === lowerName) {
      return col
    }
  }

  for (const col of columns) {
    const lowerCol = col.toLowerCase()
    // 部分匹配
    if (lowerCol.includes(lowerKey) || lowerKey.includes(lowerCol)) {
      return col
    }
  }

  return null
}

// 自动匹配期望值列
function autoMatchExpectedColumn(key: string, columns: string[]): string | null {
  const patterns = [
    `expected_${key}`,
    `${key}_expected`,
    `expect_${key}`,
    key,
  ]

  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase()
    for (const col of columns) {
      if (col.toLowerCase() === lowerPattern) {
        return col
      }
    }
  }

  return null
}

export function SchemaFieldMapper({
  sourceColumns,
  value,
  onChange,
}: SchemaFieldMapperProps) {
  const [useStructured, setUseStructured] = useState(false)

  // 获取 Schema 列表
  const { data: inputSchemas, isLoading: inputSchemasLoading } = useInputSchemas()
  const { data: outputSchemas, isLoading: outputSchemasLoading } = useOutputSchemas()

  // 获取选中的 Schema 详情
  const { data: selectedInput } = useInputSchema(value.inputSchemaId || undefined)
  const { data: selectedOutput } = useOutputSchema(value.outputSchemaId || undefined)

  // 输入变量映射状态
  const [inputMappings, setInputMappings] = useState<InputVariableMapping[]>([])
  // 期望值映射状态
  const [expectedMappings, setExpectedMappings] = useState<ExpectedValueMapping[]>([])

  // 初始化/更新输入变量映射
  useEffect(() => {
    if (selectedInput?.variables) {
      const newMappings: InputVariableMapping[] = selectedInput.variables.map((v: InputVariableDefinition) => {
        // 先从 value 中查找已有映射
        const existing = value.inputMappings[v.key]
        if (existing) {
          return {
            variableKey: v.key,
            variableName: v.name,
            variableType: v.type,
            required: v.required,
            sourceColumn: existing,
            autoDetected: false,
          }
        }

        // 自动匹配
        const matched = autoMatchColumn(v.key, v.name, sourceColumns)
        return {
          variableKey: v.key,
          variableName: v.name,
          variableType: v.type,
          required: v.required,
          sourceColumn: matched,
          autoDetected: !!matched,
        }
      })
      setInputMappings(newMappings)
    } else {
      setInputMappings([])
    }
  }, [selectedInput, sourceColumns, value.inputMappings])

  // 初始化/更新期望值映射
  useEffect(() => {
    if (selectedOutput?.fields) {
      const newMappings: ExpectedValueMapping[] = selectedOutput.fields.map((f: OutputFieldDefinition) => {
        // 先从 value 中查找已有映射
        const existing = value.expectedMappings[f.key]
        if (existing) {
          return {
            fieldKey: f.key,
            fieldName: f.name,
            fieldType: f.type,
            sourceColumn: existing,
            autoDetected: false,
          }
        }

        // 自动匹配
        const matched = autoMatchExpectedColumn(f.key, sourceColumns)
        return {
          fieldKey: f.key,
          fieldName: f.name,
          fieldType: f.type,
          sourceColumn: matched,
          autoDetected: !!matched,
        }
      })
      setExpectedMappings(newMappings)
    } else {
      setExpectedMappings([])
    }
  }, [selectedOutput, sourceColumns, value.expectedMappings])

  // 同步映射结果到父组件
  useEffect(() => {
    const inputMap: Record<string, string> = {}
    for (const m of inputMappings) {
      if (m.sourceColumn) {
        inputMap[m.variableKey] = m.sourceColumn
      }
    }

    const expectedMap: Record<string, string> = {}
    for (const m of expectedMappings) {
      if (m.sourceColumn) {
        expectedMap[m.fieldKey] = m.sourceColumn
      }
    }

    // 只在映射变化时触发更新
    const hasInputChanges = JSON.stringify(inputMap) !== JSON.stringify(value.inputMappings)
    const hasExpectedChanges = JSON.stringify(expectedMap) !== JSON.stringify(value.expectedMappings)

    if (hasInputChanges || hasExpectedChanges) {
      onChange({
        ...value,
        inputMappings: inputMap,
        expectedMappings: expectedMap,
      })
    }
  }, [inputMappings, expectedMappings])

  // 更新输入变量映射
  const updateInputMapping = useCallback((variableKey: string, sourceColumn: string | null) => {
    setInputMappings((prev) =>
      prev.map((m) =>
        m.variableKey === variableKey
          ? { ...m, sourceColumn, autoDetected: false }
          : m
      )
    )
  }, [])

  // 更新期望值映射
  const updateExpectedMapping = useCallback((fieldKey: string, sourceColumn: string | null) => {
    setExpectedMappings((prev) =>
      prev.map((m) =>
        m.fieldKey === fieldKey
          ? { ...m, sourceColumn, autoDetected: false }
          : m
      )
    )
  }, [])

  // 选择 Schema
  const handleInputSchemaChange = (id: string | null) => {
    onChange({
      ...value,
      inputSchemaId: id,
      inputMappings: {},
    })
  }

  const handleOutputSchemaChange = (id: string | null) => {
    onChange({
      ...value,
      outputSchemaId: id,
      expectedMappings: {},
    })
  }

  // 校验状态
  const validationStatus = useMemo(() => {
    const missingRequired = inputMappings.filter((m) => m.required && !m.sourceColumn)
    const mappedInputs = inputMappings.filter((m) => m.sourceColumn).length
    const mappedExpected = expectedMappings.filter((m) => m.sourceColumn).length

    return {
      missingRequired,
      mappedInputs,
      totalInputs: inputMappings.length,
      mappedExpected,
      totalExpected: expectedMappings.length,
      isValid: missingRequired.length === 0,
    }
  }, [inputMappings, expectedMappings])

  // 已使用的列
  const usedColumns = useMemo(() => {
    const used = new Set<string>()
    for (const m of inputMappings) {
      if (m.sourceColumn) used.add(m.sourceColumn)
    }
    for (const m of expectedMappings) {
      if (m.sourceColumn) used.add(m.sourceColumn)
    }
    return used
  }, [inputMappings, expectedMappings])

  // 渲染列选择器
  const renderColumnSelect = (
    currentValue: string | null,
    onSelect: (value: string | null) => void,
    autoDetected: boolean
  ) => (
    <Select
      value={currentValue}
      onChange={(v) => onSelect(v || null)}
      allowClear
      placeholder="选择数据列"
      style={{ width: '100%' }}
      suffixIcon={autoDetected ? <SyncOutlined style={{ color: '#52c41a' }} /> : undefined}
      options={sourceColumns.map((col) => ({
        value: col,
        label: (
          <Space>
            {col}
            {usedColumns.has(col) && col !== currentValue && (
              <Tag color="orange">已使用</Tag>
            )}
          </Space>
        ),
        disabled: usedColumns.has(col) && col !== currentValue,
      }))}
    />
  )

  return (
    <div>
      {/* 结构化模式开关 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Space>
          <Text strong>使用结构化评估</Text>
          <Tooltip title="关联输入/输出结构定义，支持多变量输入和多字段输出评估">
            <QuestionCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
        <Switch
          checked={useStructured}
          onChange={setUseStructured}
          checkedChildren="开启"
          unCheckedChildren="关闭"
        />
      </div>

      {!useStructured ? (
        <Alert
          type="info"
          message="简单模式"
          description="使用传统的 input/expected 字段映射。开启结构化评估可支持多变量输入和多字段输出。"
        />
      ) : (
        <>
          {/* Schema 选择 */}
          <Card size="small" title="关联结构定义" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ marginBottom: 4, display: 'block' }}>
                  输入结构（定义模板变量）
                </Text>
                <Select
                  value={value.inputSchemaId}
                  onChange={handleInputSchemaChange}
                  loading={inputSchemasLoading}
                  allowClear
                  placeholder="选择输入结构（可选）"
                  style={{ width: '100%' }}
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
              <div>
                <Text type="secondary" style={{ marginBottom: 4, display: 'block' }}>
                  输出结构（定义评估字段）
                </Text>
                <Select
                  value={value.outputSchemaId}
                  onChange={handleOutputSchemaChange}
                  loading={outputSchemasLoading}
                  allowClear
                  placeholder="选择输出结构（可选）"
                  style={{ width: '100%' }}
                  options={outputSchemas?.map((s) => ({
                    value: s.id,
                    label: (
                      <Space>
                        <LinkOutlined />
                        {s.name}
                        <Tag>{s.fields?.length ?? 0} 字段</Tag>
                      </Space>
                    ),
                  }))}
                />
              </div>
            </Space>
          </Card>

          {/* 校验状态 */}
          {validationStatus.missingRequired.length > 0 && (
            <Alert
              type="warning"
              message="必填变量未映射"
              description={`以下必填变量需要映射到数据列：${validationStatus.missingRequired.map((m) => m.variableName).join('、')}`}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          {/* 输入变量映射 */}
          {inputMappings.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <span>输入变量映射</span>
                  <Tag color={validationStatus.mappedInputs === validationStatus.totalInputs ? 'green' : 'orange'}>
                    {validationStatus.mappedInputs}/{validationStatus.totalInputs}
                  </Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 40px 1fr 80px',
                  gap: '8px 12px',
                  alignItems: 'center',
                }}
              >
                {/* 表头 */}
                <Text strong style={{ fontSize: 12, color: '#666' }}>变量</Text>
                <div />
                <Text strong style={{ fontSize: 12, color: '#666' }}>数据列</Text>
                <Text strong style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>状态</Text>

                {inputMappings.map((m) => (
                  <>
                    <Space key={`${m.variableKey}-name`}>
                      <Text code>{m.variableKey}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{m.variableName}</Text>
                      {m.required && <Tag color="orange">必填</Tag>}
                    </Space>
                    <ArrowRightOutlined key={`${m.variableKey}-arrow`} style={{ color: '#999' }} />
                    <div key={`${m.variableKey}-select`}>
                      {renderColumnSelect(m.sourceColumn, (v) => updateInputMapping(m.variableKey, v), m.autoDetected)}
                    </div>
                    <div key={`${m.variableKey}-status`} style={{ textAlign: 'center' }}>
                      {m.sourceColumn ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : m.required ? (
                        <WarningOutlined style={{ color: '#faad14' }} />
                      ) : (
                        <Text type="secondary">-</Text>
                      )}
                    </div>
                  </>
                ))}
              </div>
            </Card>
          )}

          {/* 期望值映射 */}
          {expectedMappings.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <span>期望值映射</span>
                  <Tag color={validationStatus.mappedExpected === validationStatus.totalExpected ? 'green' : 'blue'}>
                    {validationStatus.mappedExpected}/{validationStatus.totalExpected}
                  </Tag>
                </Space>
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 40px 1fr 80px',
                  gap: '8px 12px',
                  alignItems: 'center',
                }}
              >
                {/* 表头 */}
                <Text strong style={{ fontSize: 12, color: '#666' }}>输出字段</Text>
                <div />
                <Text strong style={{ fontSize: 12, color: '#666' }}>期望值列</Text>
                <Text strong style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>状态</Text>

                {expectedMappings.map((m) => (
                  <>
                    <Space key={`${m.fieldKey}-name`}>
                      <Text code>{m.fieldKey}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{m.fieldName}</Text>
                    </Space>
                    <ArrowRightOutlined key={`${m.fieldKey}-arrow`} style={{ color: '#999' }} />
                    <div key={`${m.fieldKey}-select`}>
                      {renderColumnSelect(m.sourceColumn, (v) => updateExpectedMapping(m.fieldKey, v), m.autoDetected)}
                    </div>
                    <div key={`${m.fieldKey}-status`} style={{ textAlign: 'center' }}>
                      {m.sourceColumn ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <Text type="secondary">可选</Text>
                      )}
                    </div>
                  </>
                ))}
              </div>
            </Card>
          )}

          {/* 无 Schema 选择时的提示 */}
          {!value.inputSchemaId && !value.outputSchemaId && (
            <Empty
              description="请选择输入结构或输出结构"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </>
      )}
    </div>
  )
}

export default SchemaFieldMapper
