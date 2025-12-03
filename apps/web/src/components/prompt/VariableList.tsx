'use client'

import { Tag, Empty, Typography } from 'antd'
import type { PromptVariable } from '@platform/shared'

const { Text } = Typography

type VariableListProps = {
  variables: PromptVariable[]
}

const typeColorMap: Record<string, string> = {
  string: 'blue',
  number: 'green',
  boolean: 'orange',
  json: 'purple',
}

export function VariableList({ variables }: VariableListProps) {
  if (variables.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无变量"
        style={{ margin: '16px 0' }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {variables.map((variable) => (
        <div
          key={variable.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#fafafa',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text code style={{ fontWeight: 500 }}>
              {`{{${variable.name}}}`}
            </Text>
            <Tag color={typeColorMap[variable.type] || 'default'}>
              {variable.type}
            </Tag>
            {variable.required && (
              <Tag color="red">必填</Tag>
            )}
          </div>
          {variable.defaultValue !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              默认: {String(variable.defaultValue)}
            </Text>
          )}
        </div>
      ))}
    </div>
  )
}
