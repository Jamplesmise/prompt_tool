'use client'

import { Radio, DatePicker, Space } from 'antd'
import type { TimeRange } from '@platform/shared'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

type TimeRangePickerProps = {
  value: TimeRange
  onChange: (value: TimeRange, customRange?: [string, string]) => void
  customRange?: [string, string]
}

const TIME_RANGE_OPTIONS = [
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '自定义', value: 'custom' },
]

export default function TimeRangePicker({
  value,
  onChange,
  customRange,
}: TimeRangePickerProps) {
  const handleRangeChange = (newValue: TimeRange) => {
    onChange(newValue)
  }

  const handleCustomRangeChange = (
    dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  ) => {
    if (dates && dates[0] && dates[1]) {
      onChange('custom', [
        dates[0].toISOString(),
        dates[1].toISOString(),
      ])
    }
  }

  return (
    <Space>
      <Radio.Group
        value={value}
        onChange={(e) => handleRangeChange(e.target.value)}
        optionType="button"
        buttonStyle="solid"
        options={TIME_RANGE_OPTIONS}
      />
      {value === 'custom' && (
        <RangePicker
          value={
            customRange
              ? [dayjs(customRange[0]), dayjs(customRange[1])]
              : undefined
          }
          onChange={handleCustomRangeChange}
          showTime
        />
      )}
    </Space>
  )
}
