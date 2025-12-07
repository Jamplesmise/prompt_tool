'use client'

import { Tag, Tooltip } from 'antd'
import { CloudOutlined, HomeOutlined } from '@ant-design/icons'

type ModelSourceTagProps = {
  source: 'fastgpt' | 'local'
  size?: 'small' | 'default'
}

export function ModelSourceTag({ source, size = 'default' }: ModelSourceTagProps) {
  const isSmall = size === 'small'

  if (source === 'fastgpt') {
    return (
      <Tooltip title="来自 FastGPT 配置（只读）">
        <Tag
          icon={<CloudOutlined />}
          color="processing"
          style={isSmall ? { fontSize: 11, padding: '0 4px' } : undefined}
        >
          FastGPT
        </Tag>
      </Tooltip>
    )
  }

  return (
    <Tooltip title="本地自定义配置">
      <Tag
        icon={<HomeOutlined />}
        style={isSmall ? { fontSize: 11, padding: '0 4px' } : undefined}
      >
        本地
      </Tag>
    </Tooltip>
  )
}
