'use client'

import { Input, Select, Button, Space, Dropdown } from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  DownOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import type { TaskStatus } from '@platform/shared'
import type { CSSProperties } from 'react'
import { PRIMARY, GRAY } from '@/theme/colors'

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '等待中' },
  { value: 'RUNNING', label: '执行中' },
  { value: 'PAUSED', label: '已暂停' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
  { value: 'STOPPED', label: '已终止' },
]

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'STANDARD', label: '标准测试' },
  { value: 'AB_TEST', label: 'A/B 测试' },
]

const TIME_RANGE_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

type TaskFiltersValue = {
  search?: string
  type?: string
  status?: TaskStatus | ''
  timeRange?: string
}

type TaskFiltersProps = {
  value: TaskFiltersValue
  onChange: (value: TaskFiltersValue) => void
  onRefresh?: () => void
  onCreateTask?: () => void
  onCreateABTest?: () => void
  loading?: boolean
}

export function TaskFilters({
  value,
  onChange,
  onRefresh,
  onCreateTask,
  onCreateABTest,
  loading = false,
}: TaskFiltersProps) {
  const handleSearchChange = (search: string) => {
    onChange({ ...value, search })
  }

  const handleTypeChange = (type: string) => {
    onChange({ ...value, type })
  }

  const handleStatusChange = (status: TaskStatus | '') => {
    onChange({ ...value, status })
  }

  const handleTimeRangeChange = (timeRange: string) => {
    onChange({ ...value, timeRange })
  }

  const createButtonStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
    border: 'none',
    boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
  }

  const hasFilters = value.search || value.type || value.status || value.timeRange

  return (
    <div style={{ marginBottom: 20 }}>
      {/* 第一行：搜索框 + 创建按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Input
          placeholder="搜索任务名称..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={value.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />

        <Dropdown
          menu={{
            items: [
              {
                key: 'standard',
                icon: <PlusOutlined />,
                label: '标准测试任务',
                onClick: onCreateTask,
              },
              {
                key: 'ab',
                icon: <ExperimentOutlined />,
                label: 'A/B 测试任务',
                onClick: onCreateABTest,
              },
            ],
          }}
          placement="bottomRight"
        >
          <Button type="primary" icon={<PlusOutlined />} style={createButtonStyle}>
            创建任务 <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      {/* 第二行：筛选器 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="middle">
          <Space size={4}>
            <FilterOutlined style={{ color: GRAY[500] }} />
            <span style={{ color: GRAY[500], fontSize: 14 }}>筛选:</span>
          </Space>
          <Select
            value={value.type || ''}
            onChange={handleTypeChange}
            options={TYPE_OPTIONS}
            style={{ width: 120 }}
            popupMatchSelectWidth={false}
          />
          <Select
            value={value.status || ''}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            style={{ width: 120 }}
            popupMatchSelectWidth={false}
          />
          <Select
            value={value.timeRange || ''}
            onChange={handleTimeRangeChange}
            options={TIME_RANGE_OPTIONS}
            style={{ width: 120 }}
            popupMatchSelectWidth={false}
          />
          {hasFilters && (
            <Button
              type="link"
              size="small"
              onClick={() => onChange({ search: '', type: '', status: '', timeRange: '' })}
              style={{ color: PRIMARY[500] }}
            >
              清除筛选
            </Button>
          )}
        </Space>

        <Button
          icon={<ReloadOutlined spin={loading} />}
          onClick={onRefresh}
          loading={loading}
        >
          刷新
        </Button>
      </div>
    </div>
  )
}

export type { TaskFiltersValue, TaskFiltersProps }
