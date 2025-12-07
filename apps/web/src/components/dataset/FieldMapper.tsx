'use client'

import { useEffect, useMemo } from 'react'
import { Select, Typography, Tag, Alert, Space } from 'antd'
import { CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons'

const { Text } = Typography

export type FieldMapping = {
  sourceField: string
  targetField: string
  autoDetected: boolean
}

type FieldMapperProps = {
  sourceColumns: string[]
  value: FieldMapping[]
  onChange: (mappings: FieldMapping[]) => void
}

// 系统字段定义
const SYSTEM_FIELDS = [
  { key: 'input', label: '输入 (input)', required: true },
  { key: 'expected', label: '期望输出 (expected)', required: false },
  { key: 'metadata', label: '元数据 (metadata)', required: false },
  { key: 'ignore', label: '忽略此字段', required: false },
]

// 自动识别规则
const AUTO_DETECT_RULES: Record<string, string[]> = {
  input: ['input', 'prompt', 'question', 'text', 'query', '输入', '问题', '提问'],
  expected: ['expected', 'output', 'answer', 'response', 'result', '期望', '答案', '输出', '回答'],
}

function autoDetectField(sourceField: string): string | null {
  const lowerField = sourceField.toLowerCase()

  for (const [targetField, patterns] of Object.entries(AUTO_DETECT_RULES)) {
    for (const pattern of patterns) {
      if (lowerField === pattern || lowerField.includes(pattern)) {
        return targetField
      }
    }
  }

  return null
}

export function FieldMapper({ sourceColumns, value, onChange }: FieldMapperProps) {
  // 初始化时自动检测字段映射
  useEffect(() => {
    if (value.length === 0 || value.every((m) => !m.targetField)) {
      const autoMappings: FieldMapping[] = sourceColumns.map((col) => {
        const detected = autoDetectField(col)
        return {
          sourceField: col,
          targetField: detected || '',
          autoDetected: !!detected,
        }
      })

      // 确保每个目标字段只被映射一次（优先使用完全匹配）
      const usedTargets = new Set<string>()
      const finalMappings = autoMappings.map((m) => {
        if (m.targetField && !usedTargets.has(m.targetField)) {
          usedTargets.add(m.targetField)
          return m
        }
        return { ...m, targetField: '', autoDetected: false }
      })

      onChange(finalMappings)
    }
  }, [sourceColumns])

  const handleMappingChange = (sourceField: string, targetField: string) => {
    const newMappings = value.map((m) =>
      m.sourceField === sourceField
        ? { ...m, targetField, autoDetected: false }
        : m
    )
    onChange(newMappings)
  }

  // 检查 input 字段是否已映射
  const hasInputMapping = useMemo(() => {
    return value.some((m) => m.targetField === 'input')
  }, [value])

  // 获取已使用的目标字段
  const usedTargetFields = useMemo(() => {
    return new Set(value.filter((m) => m.targetField && m.targetField !== 'ignore').map((m) => m.targetField))
  }, [value])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          字段映射
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          将文件字段映射到系统字段
        </Text>
      </div>

      {!hasInputMapping && (
        <Alert
          type="warning"
          message="请至少选择一个字段映射为 input（输入）字段"
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* 表头 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 40px 1fr 100px',
            gap: 16,
            padding: '12px 16px',
            background: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
            alignItems: 'center',
          }}
        >
          <Text strong style={{ fontSize: 13 }}>
            原始字段
          </Text>
          <div />
          <Text strong style={{ fontSize: 13 }}>
            系统字段
          </Text>
          <Text strong style={{ fontSize: 13, textAlign: 'center' }}>
            状态
          </Text>
        </div>

        {/* 映射行 */}
        {value.map((mapping) => (
          <div
            key={mapping.sourceField}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 40px 1fr 100px',
              gap: 16,
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              alignItems: 'center',
            }}
          >
            <Text
              code
              style={{
                padding: '4px 8px',
                background: '#f5f5f5',
                borderRadius: 4,
              }}
            >
              {mapping.sourceField}
            </Text>

            <ArrowRightOutlined style={{ color: '#999', textAlign: 'center' }} />

            <Select
              value={mapping.targetField || undefined}
              onChange={(v) => handleMappingChange(mapping.sourceField, v)}
              placeholder="选择目标字段"
              allowClear
              style={{ width: '100%' }}
              options={SYSTEM_FIELDS.map((f) => ({
                value: f.key,
                label: (
                  <Space>
                    {f.label}
                    {f.required && (
                      <Tag color="red" style={{ fontSize: 10, margin: 0 }}>
                        必填
                      </Tag>
                    )}
                  </Space>
                ),
                disabled:
                  f.key !== 'ignore' &&
                  f.key !== mapping.targetField &&
                  usedTargetFields.has(f.key),
              }))}
            />

            <div style={{ textAlign: 'center' }}>
              {mapping.autoDetected && mapping.targetField && (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  自动识别
                </Tag>
              )}
              {!mapping.autoDetected && mapping.targetField && mapping.targetField !== 'ignore' && (
                <Tag color="blue">手动</Tag>
              )}
              {mapping.targetField === 'ignore' && (
                <Tag color="default">已忽略</Tag>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          提示：input 字段为必填项，用于存储发送给 AI 模型的输入文本
        </Text>
      </div>
    </div>
  )
}
