'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, Select, Row, Col, Spin, Empty, Button, Space, Typography, Divider } from 'antd'
import { SwapOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { VersionMetricsCard, MetricsComparisonCards } from './VersionMetricsCard'
import { PromptDiffView } from './PromptDiffView'
import { EffectChangeAnalysis } from './EffectChangeAnalysis'
import {
  compareMetrics,
  analyzeEffect,
  generateDiff,
  type VersionMetrics,
  type MetricsComparison,
  type EffectAnalysis,
} from '@/lib/comparison'

const { Text } = Typography

type PromptVersion = {
  id: string
  version: number
  content: string
  changeLog?: string
  createdAt: string
}

type VersionComparePanelProps = {
  promptId: string
  initialVersion1?: number
  initialVersion2?: number
  onVersionChange?: (v1: number, v2: number) => void
}

/**
 * 获取提示词版本列表
 */
async function fetchVersions(promptId: string): Promise<PromptVersion[]> {
  const response = await fetch(`/api/v1/prompts/${promptId}/versions`)
  if (!response.ok) throw new Error('获取版本列表失败')
  const result = await response.json()
  return result.data || []
}

/**
 * 获取版本指标（模拟数据，实际需要从 API 获取）
 */
async function fetchVersionMetrics(
  promptId: string,
  versionId: string
): Promise<VersionMetrics | null> {
  // 实际项目中应该调用 API
  const response = await fetch(`/api/v1/prompts/${promptId}/versions/${versionId}/metrics`)
  if (!response.ok) {
    // 返回模拟数据
    return null
  }
  const result = await response.json()
  return result.data
}

/**
 * 版本对比面板组件
 */
export function VersionComparePanel({
  promptId,
  initialVersion1,
  initialVersion2,
  onVersionChange,
}: VersionComparePanelProps) {
  const [selectedV1, setSelectedV1] = useState<number | undefined>(initialVersion1)
  const [selectedV2, setSelectedV2] = useState<number | undefined>(initialVersion2)

  // 获取版本列表
  const {
    data: versions = [],
    isLoading: versionsLoading,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: ['promptVersions', promptId],
    queryFn: () => fetchVersions(promptId),
    enabled: !!promptId,
  })

  // 初始化选择
  useEffect(() => {
    if (versions.length >= 2 && !selectedV1 && !selectedV2) {
      // 默认选择最新两个版本
      const sortedVersions = [...versions].sort((a, b) => b.version - a.version)
      setSelectedV2(sortedVersions[0].version)
      setSelectedV1(sortedVersions[1]?.version || sortedVersions[0].version)
    }
  }, [versions, selectedV1, selectedV2])

  // 通知版本变化
  useEffect(() => {
    if (selectedV1 && selectedV2 && onVersionChange) {
      onVersionChange(selectedV1, selectedV2)
    }
  }, [selectedV1, selectedV2, onVersionChange])

  // 获取选中的版本数据
  const version1 = useMemo(
    () => versions.find(v => v.version === selectedV1),
    [versions, selectedV1]
  )

  const version2 = useMemo(
    () => versions.find(v => v.version === selectedV2),
    [versions, selectedV2]
  )

  // 模拟指标数据（实际应该从 API 获取）
  const metrics1: VersionMetrics | null = useMemo(() => {
    if (!version1) return null
    return {
      versionId: version1.id,
      version: version1.version,
      passRate: 0.75 + Math.random() * 0.2,
      avgLatency: 1.5 + Math.random() * 2,
      avgTokens: Math.floor(500 + Math.random() * 500),
      estimatedCost: 0.001 + Math.random() * 0.01,
      formatAccuracy: 0.8 + Math.random() * 0.15,
      totalTests: Math.floor(50 + Math.random() * 100),
      passedTests: 0,
      failedTests: 0,
      avgScore: 0.7 + Math.random() * 0.25,
    }
  }, [version1])

  const metrics2: VersionMetrics | null = useMemo(() => {
    if (!version2) return null
    return {
      versionId: version2.id,
      version: version2.version,
      passRate: 0.75 + Math.random() * 0.2,
      avgLatency: 1.5 + Math.random() * 2,
      avgTokens: Math.floor(500 + Math.random() * 500),
      estimatedCost: 0.001 + Math.random() * 0.01,
      formatAccuracy: 0.8 + Math.random() * 0.15,
      totalTests: Math.floor(50 + Math.random() * 100),
      passedTests: 0,
      failedTests: 0,
      avgScore: 0.7 + Math.random() * 0.25,
    }
  }, [version2])

  // 计算对比和分析
  const comparison: MetricsComparison | null = useMemo(() => {
    if (!metrics1 || !metrics2) return null
    // 补充 passedTests 和 failedTests
    const m1 = {
      ...metrics1,
      passedTests: Math.floor(metrics1.totalTests * metrics1.passRate),
      failedTests: Math.floor(metrics1.totalTests * (1 - metrics1.passRate)),
    }
    const m2 = {
      ...metrics2,
      passedTests: Math.floor(metrics2.totalTests * metrics2.passRate),
      failedTests: Math.floor(metrics2.totalTests * (1 - metrics2.passRate)),
    }
    return compareMetrics(m1, m2)
  }, [metrics1, metrics2])

  const analysis: EffectAnalysis | null = useMemo(() => {
    if (!comparison || !version1 || !version2) return null
    const diff = generateDiff(version1.content, version2.content)
    return analyzeEffect(comparison, diff)
  }, [comparison, version1, version2])

  // 交换版本
  const swapVersions = () => {
    const temp = selectedV1
    setSelectedV1(selectedV2)
    setSelectedV2(temp)
  }

  // 版本选项
  const versionOptions = versions.map(v => ({
    value: v.version,
    label: `版本 ${v.version}`,
  }))

  if (versionsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">加载版本列表...</Text>
        </div>
      </div>
    )
  }

  if (versions.length < 2) {
    return (
      <Empty
        description="需要至少两个版本才能进行对比"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <div>
      {/* 版本选择器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={10}>
            <Text type="secondary" style={{ marginBottom: 4, display: 'block' }}>
              基准版本（旧）
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedV1}
              onChange={setSelectedV1}
              options={versionOptions}
              placeholder="选择版本"
            />
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              icon={<SwapOutlined />}
              onClick={swapVersions}
              title="交换版本"
            />
          </Col>
          <Col span={10}>
            <Text type="secondary" style={{ marginBottom: 4, display: 'block' }}>
              对比版本（新）
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedV2}
              onChange={setSelectedV2}
              options={versionOptions}
              placeholder="选择版本"
            />
          </Col>
        </Row>
      </Card>

      {/* 指标对比 */}
      {comparison && metrics1 && metrics2 && (
        <>
          <MetricsComparisonCards
            oldMetrics={{
              ...metrics1,
              passedTests: Math.floor(metrics1.totalTests * metrics1.passRate),
              failedTests: Math.floor(metrics1.totalTests * (1 - metrics1.passRate)),
            }}
            newMetrics={{
              ...metrics2,
              passedTests: Math.floor(metrics2.totalTests * metrics2.passRate),
              failedTests: Math.floor(metrics2.totalTests * (1 - metrics2.passRate)),
            }}
            changes={comparison.changes}
          />
          <Divider />
        </>
      )}

      {/* 提示词 Diff */}
      {version1 && version2 && (
        <>
          <PromptDiffView
            oldText={version1.content}
            newText={version2.content}
            oldLabel={`版本 ${version1.version}`}
            newLabel={`版本 ${version2.version}`}
          />
          <Divider />
        </>
      )}

      {/* 效果分析 */}
      {analysis && (
        <Card title="效果变化分析" size="small">
          <EffectChangeAnalysis
            analysis={analysis}
            showActions={false}
          />
        </Card>
      )}
    </div>
  )
}

/**
 * 简化的版本快速对比（用于弹窗或小区域）
 */
type QuickVersionCompareProps = {
  promptId: string
  version1: number
  version2: number
}

export function QuickVersionCompare({ promptId, version1, version2 }: QuickVersionCompareProps) {
  const { data: versions = [] } = useQuery({
    queryKey: ['promptVersions', promptId],
    queryFn: () => fetchVersions(promptId),
    enabled: !!promptId,
  })

  const v1 = versions.find(v => v.version === version1)
  const v2 = versions.find(v => v.version === version2)

  if (!v1 || !v2) {
    return <Spin size="small" />
  }

  return (
    <PromptDiffView
      oldText={v1.content}
      newText={v2.content}
      oldLabel={`v${version1}`}
      newLabel={`v${version2}`}
      showLineNumbers={false}
      foldUnchanged={false}
      initialViewMode="unified"
    />
  )
}
