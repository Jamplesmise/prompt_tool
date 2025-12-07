'use client'

import { useMemo, useState } from 'react'
import { Row, Col, Space, Button, Empty } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import type { TaskResultData, FailureDistribution, Dimension } from './types'
import { FailureDistributionChart } from './FailureDistributionChart'
import { DimensionAnalysisTable } from './DimensionAnalysisTable'
import { FailureSampleList } from './FailureSampleList'
import { detectPatterns, getFailureTypeName, getFailureTypeColor } from '@/lib/analysis'
import type { FailedResult } from '@/lib/analysis'

type FailureAnalysisTabProps = {
  results: TaskResultData[]
  failedResults: TaskResultData[]
}

/**
 * 失败分析标签页
 * 整合失败分布、维度分析、失败样本列表
 */
export function FailureAnalysisTab({ results, failedResults }: FailureAnalysisTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDimensionValue, setSelectedDimensionValue] = useState<string | null>(null)

  // 转换为分析格式并检测失败模式
  const analysisResult = useMemo(() => {
    if (failedResults.length === 0) return null

    const convertedResults: FailedResult[] = failedResults.map(r => ({
      id: r.id,
      input: r.input,
      output: r.output,
      expected: r.expected,
      status: r.status,
      error: r.error,
      evaluations: r.evaluations,
    }))

    return detectPatterns(convertedResults)
  }, [failedResults])

  // 构建失败分布数据
  const distributionData: FailureDistribution[] = useMemo(() => {
    if (!analysisResult) return []

    return analysisResult.patterns.map(pattern => ({
      category: pattern.type,
      categoryName: getFailureTypeName(pattern.type),
      count: pattern.count,
      percentage: pattern.percentage,
      color: getFailureTypeColor(pattern.type),
    }))
  }, [analysisResult])

  // 过滤后的失败样本
  const filteredSamples = useMemo(() => {
    let samples = failedResults

    // 按失败类型过滤
    if (selectedCategory && analysisResult) {
      const pattern = analysisResult.patterns.find(p => p.type === selectedCategory)
      if (pattern) {
        const sampleIds = new Set(pattern.examples.map(e => e.id))
        // 如果 examples 不包含所有样本 ID，需要重新分类
        samples = failedResults.filter(r => {
          // 简化判断：使用分类逻辑
          const convertedResult: FailedResult = {
            id: r.id,
            input: r.input,
            output: r.output,
            expected: r.expected,
            status: r.status,
            error: r.error,
            evaluations: r.evaluations,
          }
          // 这里简化处理，实际应该使用相同的分类逻辑
          return sampleIds.has(r.id) || pattern.examples.length === 0
        })
      }
    }

    return samples
  }, [failedResults, selectedCategory, analysisResult])

  // 处理类型点击
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(prev => prev === category ? null : category)
    setSelectedDimensionValue(null)
  }

  // 处理维度行点击
  const handleDimensionRowClick = (value: string, dimension: Dimension) => {
    setSelectedDimensionValue(prev => prev === value ? null : value)
    setSelectedCategory(null)
  }

  // 清除过滤
  const clearFilters = () => {
    setSelectedCategory(null)
    setSelectedDimensionValue(null)
  }

  if (failedResults.length === 0) {
    return <Empty description="没有失败的测试用例" />
  }

  const hasFilter = selectedCategory || selectedDimensionValue

  return (
    <div>
      {/* 过滤提示 */}
      {hasFilter && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>当前过滤：</span>
          {selectedCategory && (
            <span style={{ color: '#1890ff' }}>
              失败类型 = {getFailureTypeName(selectedCategory as never)}
            </span>
          )}
          {selectedDimensionValue && (
            <span style={{ color: '#1890ff' }}>
              维度 = {selectedDimensionValue}
            </span>
          )}
          <Button
            type="link"
            size="small"
            icon={<ClearOutlined />}
            onClick={clearFilters}
          >
            清除
          </Button>
        </div>
      )}

      <Row gutter={[16, 16]}>
        {/* 左侧：失败分布图表 */}
        <Col xs={24} md={12} lg={10}>
          <FailureDistributionChart
            data={distributionData}
            title="失败类型分布"
            onCategoryClick={handleCategoryClick}
            selectedCategory={selectedCategory}
          />
        </Col>

        {/* 右侧：维度分析表格 */}
        <Col xs={24} md={12} lg={14}>
          <DimensionAnalysisTable
            results={failedResults}
            onRowClick={handleDimensionRowClick}
            selectedValue={selectedDimensionValue}
          />
        </Col>
      </Row>

      {/* 失败样本列表 */}
      <div style={{ marginTop: 16 }}>
        <FailureSampleList
          samples={filteredSamples}
          pageSize={10}
        />
      </div>
    </div>
  )
}
