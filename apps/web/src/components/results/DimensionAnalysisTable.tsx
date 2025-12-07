'use client'

import { useMemo, useState } from 'react'
import { Table, Select, Card, Tag, Progress, Space, Typography, Tooltip } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, FilterOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TaskResultData, Dimension, DimensionAnalysis } from './types'
import { analyzeDimension, getAvailableDimensions, extractCustomDimensionFields } from '@/lib/results/dimensionAnalyzer'

const { Text } = Typography

type DimensionAnalysisTableProps = {
  results: TaskResultData[]
  /** 点击行时的回调，用于过滤样本 */
  onRowClick?: (dimensionValue: string, dimension: Dimension) => void
  /** 当前选中的维度值 */
  selectedValue?: string | null
}

type GroupData = {
  key: string
  label: string
  total: number
  passed: number
  failed: number
  passRate: number
  trend?: 'up' | 'down' | 'stable'
}

/**
 * 维度分析表格
 * 按不同维度分组分析结果
 */
export function DimensionAnalysisTable({
  results,
  onRowClick,
  selectedValue,
}: DimensionAnalysisTableProps) {
  const [selectedDimension, setSelectedDimension] = useState<Dimension>('failure_type')
  const [customField, setCustomField] = useState<string | undefined>()

  // 获取可用维度
  const availableDimensions = useMemo(() => getAvailableDimensions(), [])

  // 获取自定义维度字段
  const customFields = useMemo(
    () => extractCustomDimensionFields(results),
    [results]
  )

  // 分析数据
  const analysis = useMemo(() => {
    if (selectedDimension === 'custom' && customField) {
      return analyzeDimension(results, 'custom', customField)
    }
    return analyzeDimension(results, selectedDimension)
  }, [results, selectedDimension, customField])

  // 表格数据
  const tableData: GroupData[] = useMemo(() => {
    return analysis.groups.map(group => ({
      key: group.label,
      ...group,
    }))
  }, [analysis])

  // 表格列定义
  const columns: ColumnsType<GroupData> = [
    {
      title: analysis.dimensionLabel,
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record) => (
        <Space>
          <Text strong={selectedValue === label}>{label}</Text>
          {record.trend === 'up' && (
            <Tooltip title="较上次提升">
              <ArrowUpOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
          {record.trend === 'down' && (
            <Tooltip title="较上次下降">
              <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          {record.trend === 'stable' && (
            <Tooltip title="保持稳定">
              <MinusOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '总数',
      dataIndex: 'total',
      key: 'total',
      width: 80,
      align: 'right',
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: '通过',
      dataIndex: 'passed',
      key: 'passed',
      width: 80,
      align: 'right',
      render: (passed: number) => (
        <Text style={{ color: passed > 0 ? '#52c41a' : undefined }}>
          {passed}
        </Text>
      ),
      sorter: (a, b) => a.passed - b.passed,
    },
    {
      title: '失败',
      dataIndex: 'failed',
      key: 'failed',
      width: 80,
      align: 'right',
      render: (failed: number) => (
        <Text style={{ color: failed > 0 ? '#ff4d4f' : undefined }}>
          {failed}
        </Text>
      ),
      sorter: (a, b) => a.failed - b.failed,
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      key: 'passRate',
      width: 150,
      render: (passRate: number, record) => {
        const color = passRate >= 80 ? '#52c41a' : passRate >= 60 ? '#faad14' : '#ff4d4f'
        return (
          <Space>
            <Progress
              percent={passRate}
              size="small"
              strokeColor={color}
              style={{ width: 80 }}
              showInfo={false}
            />
            <Text style={{ color }}>{passRate}%</Text>
          </Space>
        )
      },
      sorter: (a, b) => a.passRate - b.passRate,
      defaultSortOrder: 'ascend',
    },
  ]

  return (
    <Card
      size="small"
      title={
        <Space>
          <FilterOutlined />
          维度分析
        </Space>
      }
      extra={
        <Space>
          <Select
            value={selectedDimension}
            onChange={value => {
              setSelectedDimension(value)
              if (value !== 'custom') {
                setCustomField(undefined)
              }
            }}
            style={{ width: 140 }}
            options={[
              ...availableDimensions,
              ...(customFields.length > 0
                ? [{ value: 'custom' as Dimension, label: '自定义字段' }]
                : []),
            ]}
          />
          {selectedDimension === 'custom' && customFields.length > 0 && (
            <Select
              value={customField}
              onChange={setCustomField}
              style={{ width: 140 }}
              placeholder="选择字段"
              options={customFields.map(field => ({
                value: field,
                label: field,
              }))}
            />
          )}
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={tableData}
        size="small"
        pagination={false}
        rowClassName={(record) =>
          selectedValue === record.label ? 'ant-table-row-selected' : ''
        }
        onRow={(record) => ({
          onClick: () => onRowClick?.(record.label, selectedDimension),
          style: {
            cursor: onRowClick ? 'pointer' : 'default',
            background: selectedValue === record.label ? '#e6f7ff' : undefined,
          },
        })}
        locale={{ emptyText: '暂无数据' }}
      />

      {/* 图例说明 */}
      <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Space size={4}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#52c41a' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>通过率 ≥80%</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#faad14' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>通过率 60-80%</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#ff4d4f' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>通过率 &lt;60%</Text>
        </Space>
      </div>
    </Card>
  )
}
