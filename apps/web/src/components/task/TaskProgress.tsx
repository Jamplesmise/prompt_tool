'use client'

import { Progress, Space, Typography } from 'antd'
import type { TaskProgress as TaskProgressType } from '@platform/shared'

const { Text } = Typography

type TaskProgressProps = {
  progress: TaskProgressType
  showDetail?: boolean
  size?: 'small' | 'default'
}

export function TaskProgressBar({
  progress,
  showDetail = true,
  size = 'default',
}: TaskProgressProps) {
  const { total, completed, failed } = progress
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const successPercent = total > 0 ? Math.round(((completed - failed) / total) * 100) : 0

  return (
    <div>
      <Progress
        percent={percent}
        success={{ percent: successPercent }}
        size={size}
        status={failed > 0 ? 'exception' : 'active'}
      />
      {showDetail && (
        <Space size="middle" style={{ marginTop: 4 }}>
          <Text type="secondary">
            完成: {completed}/{total}
          </Text>
          {failed > 0 && (
            <Text type="danger">
              失败: {failed}
            </Text>
          )}
        </Space>
      )}
    </div>
  )
}

// 紧凑型进度显示
type CompactProgressProps = {
  progress: TaskProgressType
}

export function CompactProgress({ progress }: CompactProgressProps) {
  const { total, completed, failed } = progress
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <Space direction="vertical" size={0} style={{ width: '100%' }}>
      <Progress
        percent={percent}
        size="small"
        status={failed > 0 ? 'exception' : 'normal'}
        showInfo={false}
      />
      <Text type="secondary" style={{ fontSize: 12 }}>
        {completed}/{total}
        {failed > 0 && <Text type="danger"> (失败 {failed})</Text>}
      </Text>
    </Space>
  )
}
