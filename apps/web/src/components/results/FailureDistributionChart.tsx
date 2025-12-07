'use client'

import { useMemo, useState } from 'react'
import { Card, Empty, Radio, Typography, Space, Tooltip } from 'antd'
import { BarChartOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import type { FailureDistribution } from './types'

const { Text } = Typography

type FailureDistributionChartProps = {
  data: FailureDistribution[]
  title?: string
  /** 点击某类型时的回调 */
  onCategoryClick?: (category: string) => void
  /** 当前选中的类型 */
  selectedCategory?: string | null
}

/**
 * 失败分布图表
 * 水平柱状图展示失败原因分布
 */
export function FailureDistributionChart({
  data,
  title = '失败分布',
  onCategoryClick,
  selectedCategory,
}: FailureDistributionChartProps) {
  const [sortOrder, setSortOrder] = useState<'count' | 'name'>('count')

  const sortedData = useMemo(() => {
    const sorted = [...data]
    if (sortOrder === 'count') {
      sorted.sort((a, b) => b.count - a.count)
    } else {
      sorted.sort((a, b) => a.categoryName.localeCompare(b.categoryName))
    }
    return sorted
  }, [data, sortOrder])

  const maxCount = useMemo(
    () => Math.max(...data.map(d => d.count), 1),
    [data]
  )

  if (data.length === 0) {
    return (
      <Card size="small" title={title}>
        <Empty description="暂无失败数据" />
      </Card>
    )
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <BarChartOutlined />
          {title}
        </Space>
      }
      extra={
        <Radio.Group
          size="small"
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="count">
            <Tooltip title="按数量排序">
              <SortDescendingOutlined />
            </Tooltip>
          </Radio.Button>
          <Radio.Button value="name">
            <Tooltip title="按名称排序">
              <SortAscendingOutlined />
            </Tooltip>
          </Radio.Button>
        </Radio.Group>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedData.map(item => {
          const isSelected = selectedCategory === item.category
          const barWidth = (item.count / maxCount) * 100

          return (
            <div
              key={item.category}
              onClick={() => onCategoryClick?.(item.category)}
              style={{
                cursor: onCategoryClick ? 'pointer' : 'default',
                opacity: selectedCategory && !isSelected ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text
                  strong={isSelected}
                  style={{ color: isSelected ? item.color : undefined }}
                >
                  {item.categoryName}
                </Text>
                <Text type="secondary">
                  {item.count} ({item.percentage}%)
                </Text>
              </div>
              <div
                style={{
                  height: 20,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: isSelected ? `2px solid ${item.color}` : '1px solid #e8e8e8',
                }}
              >
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: item.color,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                  }}
                >
                  {barWidth > 20 && (
                    <Text style={{ color: '#fff', fontSize: 12 }}>
                      {item.count}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/**
 * 简化版失败分布图（用于小空间展示）
 */
type FailureDistributionMiniProps = {
  data: FailureDistribution[]
}

export function FailureDistributionMini({ data }: FailureDistributionMiniProps) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.count - a.count).slice(0, 5),
    [data]
  )

  if (data.length === 0) {
    return <Text type="secondary">无失败数据</Text>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sortedData.map(item => (
        <div
          key={item.category}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.color,
              flexShrink: 0,
            }}
          />
          <Text ellipsis style={{ flex: 1, fontSize: 12 }}>
            {item.categoryName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.percentage}%
          </Text>
        </div>
      ))}
    </div>
  )
}
