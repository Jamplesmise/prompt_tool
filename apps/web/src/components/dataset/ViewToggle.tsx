'use client'

import { Segmented } from 'antd'
import { UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons'

export type ViewMode = 'list' | 'card'

type ViewToggleProps = {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <Segmented
      value={value}
      onChange={(v) => onChange(v as ViewMode)}
      options={[
        {
          value: 'list',
          icon: <UnorderedListOutlined />,
          label: '列表',
        },
        {
          value: 'card',
          icon: <AppstoreOutlined />,
          label: '卡片',
        },
      ]}
    />
  )
}
