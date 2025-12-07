'use client'

import { useState } from 'react'
import { Card, Segmented, Spin, Empty, DatePicker, Space } from 'antd'
import { LineChartOutlined } from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { PRIMARY, SEMANTIC, GRAY } from '@/theme/colors'

const { RangePicker } = DatePicker

type TrendDataPoint = {
  date: string // "12/01"
  executed: number // 执行数
  passed: number // 通过数
  failed: number // 失败数
}

type TimeRangeType = '7d' | '14d' | '30d' | '60d' | 'custom'

type TrendChartProps = {
  data: TrendDataPoint[]
  timeRange: TimeRangeType
  onTimeRangeChange?: (range: TimeRangeType, customRange?: [string, string]) => void
  loading?: boolean
  height?: number
}

// 使用品牌色系
const COLORS = {
  executed: PRIMARY[500],      // 品牌主色
  passed: SEMANTIC.success,    // 语义成功色
  failed: SEMANTIC.error,      // 语义错误色
}

const TIME_OPTIONS = [
  { label: '7天', value: '7d' },
  { label: '14天', value: '14d' },
  { label: '30天', value: '30d' },
  { label: '60天', value: '60d' },
  { label: '自定义', value: 'custom' },
]

export function TrendChart({
  data,
  timeRange,
  onTimeRangeChange,
  loading = false,
  height = 300,
}: TrendChartProps) {
  const [customDates, setCustomDates] = useState<[Dayjs, Dayjs] | null>(null)

  const handleTimeRangeChange = (value: string) => {
    const range = value as TimeRangeType
    if (range === 'custom') {
      // 切换到自定义时，默认选择最近 7 天
      const end = dayjs()
      const start = end.subtract(7, 'day')
      setCustomDates([start, end])
      onTimeRangeChange?.(range, [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')])
    } else {
      setCustomDates(null)
      onTimeRangeChange?.(range)
    }
  }

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      // 限制最大 60 天
      const diffDays = dates[1].diff(dates[0], 'day')
      if (diffDays > 60) {
        // 自动调整结束日期
        const adjustedEnd = dates[0].add(60, 'day')
        setCustomDates([dates[0], adjustedEnd])
        onTimeRangeChange?.('custom', [
          dates[0].format('YYYY-MM-DD'),
          adjustedEnd.format('YYYY-MM-DD'),
        ])
      } else {
        setCustomDates([dates[0], dates[1]])
        onTimeRangeChange?.('custom', [
          dates[0].format('YYYY-MM-DD'),
          dates[1].format('YYYY-MM-DD'),
        ])
      }
    }
  }

  // 禁用超过 60 天范围的日期
  const disabledDate = (current: Dayjs) => {
    if (!customDates || !customDates[0]) {
      return current && current > dayjs().endOf('day')
    }
    // 不能超过今天，且不能超过起始日期 60 天
    const tooLate = current > dayjs().endOf('day')
    const tooEarly = current < customDates[0].subtract(60, 'day')
    const tooFar = current > customDates[0].add(60, 'day')
    return tooLate || (customDates[0] && (tooEarly || tooFar))
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <LineChartOutlined style={{ color: PRIMARY[500] }} />
          执行趋势
        </span>
      }
      extra={
        <Space size="middle">
          <Segmented
            value={timeRange}
            options={TIME_OPTIONS}
            onChange={handleTimeRangeChange}
            size="small"
          />
          {timeRange === 'custom' && (
            <RangePicker
              size="small"
              value={customDates}
              onChange={handleDateChange}
              disabledDate={disabledDate}
              allowClear={false}
              format="MM-DD"
              style={{ width: 180 }}
            />
          )}
        </Space>
      }
    >
      {loading ? (
        <div
          className="flex justify-center items-center"
          style={{ height }}
        >
          <Spin />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex justify-center items-center"
          style={{ height }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无趋势数据"
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY[100]} />
            <XAxis
              dataKey="date"
              axisLine={{ stroke: GRAY[200] }}
              tickLine={false}
              tick={{ fill: GRAY[500], fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: GRAY[500], fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${GRAY[100]}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              labelStyle={{ color: GRAY[800], fontWeight: 500 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="executed"
              name="执行数"
              stroke={COLORS.executed}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS.executed, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: COLORS.executed, strokeWidth: 2, fill: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="passed"
              name="通过数"
              stroke={COLORS.passed}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS.passed, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: COLORS.passed, strokeWidth: 2, fill: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name="失败数"
              stroke={COLORS.failed}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS.failed, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: COLORS.failed, strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

export type { TrendDataPoint, TrendChartProps, TimeRangeType }
