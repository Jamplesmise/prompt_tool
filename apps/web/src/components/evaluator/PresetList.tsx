'use client'

import { Card, Tag, Typography, Space, Empty, Spin } from 'antd'
import {
  CheckCircleOutlined,
  SearchOutlined,
  CodeOutlined,
  PercentageOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { usePresetEvaluators } from '@/hooks/useEvaluators'
import type { PresetType } from '@/services/evaluators'

const { Text, Paragraph } = Typography

// 预置评估器图标映射
const PRESET_ICONS: Record<PresetType, React.ReactNode> = {
  exact_match: <CheckCircleOutlined />,
  contains: <SearchOutlined />,
  regex: <CodeOutlined />,
  json_schema: <FileTextOutlined />,
  similarity: <PercentageOutlined />,
}

// 预置评估器颜色映射
const PRESET_COLORS: Record<PresetType, string> = {
  exact_match: 'green',
  contains: 'blue',
  regex: 'purple',
  json_schema: 'orange',
  similarity: 'cyan',
}

export function PresetList() {
  const { data: presets, isLoading } = usePresetEvaluators()

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin />
      </div>
    )
  }

  if (!presets || presets.length === 0) {
    return <Empty description="暂无预置评估器" />
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {presets.map((preset) => {
        const presetType = preset.config.presetType as PresetType
        return (
          <Card
            key={preset.id}
            size="small"
            hoverable
            style={{ cursor: 'default' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <span style={{ fontSize: 20, color: PRESET_COLORS[presetType] }}>
                  {PRESET_ICONS[presetType]}
                </span>
                <Text strong>{preset.name}</Text>
                <Tag color="default">预置</Tag>
              </Space>
              <Paragraph
                type="secondary"
                style={{ marginBottom: 0 }}
                ellipsis={{ rows: 2 }}
              >
                {preset.description}
              </Paragraph>
              <div>
                <Tag color={PRESET_COLORS[presetType]}>{presetType}</Tag>
              </div>
            </Space>
          </Card>
        )
      })}
    </div>
  )
}
