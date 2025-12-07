'use client'

import { useMemo, useState } from 'react'
import { Card, Empty, Space, Typography, Statistic, Row, Col, Select, Spin } from 'antd'
import { ClusterOutlined, SortAscendingOutlined } from '@ant-design/icons'
import { ClusterCard } from './ClusterCard'
import type { TaskResultData, FailureCluster } from '@/components/results/types'
import { clusterFailures, generateClusterSummary } from '@/lib/analysis'
import type { FailedResult } from '@/lib/analysis'

const { Text } = Typography

type ClusterListProps = {
  failedResults: TaskResultData[]
  loading?: boolean
  onViewSample?: (sample: TaskResultData) => void
  onApplyFix?: (fix: string) => void
}

type SortOption = 'size' | 'similarity'

/**
 * 聚类列表组件
 * 展示所有失败样本的聚类结果
 */
export function ClusterList({
  failedResults,
  loading = false,
  onViewSample,
  onApplyFix,
}: ClusterListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('size')

  // 执行聚类分析
  const clusterResult = useMemo(() => {
    if (failedResults.length < 2) return null

    // 转换为聚类所需格式
    const convertedResults: FailedResult[] = failedResults.map(r => ({
      id: r.id,
      input: r.input,
      output: r.output,
      expected: r.expected,
      status: r.status,
      error: r.error,
      evaluations: r.evaluations,
    }))

    const clusters = clusterFailures(convertedResults)
    const summary = generateClusterSummary(clusters)

    // 转换为组件所需格式
    const formattedClusters: FailureCluster[] = clusters.map(cluster => {
      // 找到原始样本
      const samples = cluster.samples
        .map(s => failedResults.find(r => r.id === s.id))
        .filter((s): s is TaskResultData => s !== undefined)

      const centroid = failedResults.find(r => r.id === cluster.representativeSample.id) || failedResults[0]

      // 从 commonPattern 提取共同特征
      const commonFeatures = cluster.commonPattern
        ? cluster.commonPattern.split('；').filter(f => f.trim().length > 0)
        : []

      return {
        id: cluster.id,
        label: cluster.label,
        samples,
        centroid,
        commonFeatures,
        suggestedFix: getSuggestedFix(cluster.label, commonFeatures),
        similarity: cluster.avgSimilarity || 0.7,
      }
    })

    return {
      clusters: formattedClusters,
      summary,
    }
  }, [failedResults])

  // 排序后的聚类
  const sortedClusters = useMemo(() => {
    if (!clusterResult) return []

    const clusters = [...clusterResult.clusters]
    if (sortBy === 'size') {
      clusters.sort((a, b) => b.samples.length - a.samples.length)
    } else {
      clusters.sort((a, b) => b.similarity - a.similarity)
    }
    return clusters
  }, [clusterResult, sortBy])

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在聚类分析...</Text>
          </div>
        </div>
      </Card>
    )
  }

  if (failedResults.length < 2) {
    return (
      <Card>
        <Empty description="样本数量不足，无法进行聚类分析（至少需要 2 个）" />
      </Card>
    )
  }

  if (!clusterResult || clusterResult.clusters.length === 0) {
    return (
      <Card>
        <Empty description="未能识别出有意义的聚类" />
      </Card>
    )
  }

  return (
    <Card
      title={
        <Space>
          <ClusterOutlined />
          失败样本聚类
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary">排序：</Text>
          <Select
            value={sortBy}
            onChange={setSortBy}
            size="small"
            style={{ width: 100 }}
            options={[
              { value: 'size', label: '按数量' },
              { value: 'similarity', label: '按相似度' },
            ]}
          />
        </Space>
      }
    >
      {/* 聚类统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Statistic
            title="聚类数量"
            value={clusterResult.summary.clusterCount}
            prefix={<ClusterOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="样本总数"
            value={clusterResult.summary.totalSamples}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="平均相似度"
            value={(clusterResult.summary.avgSimilarity * 100).toFixed(0)}
            suffix="%"
          />
        </Col>
      </Row>

      {/* 聚类列表 */}
      <div>
        {sortedClusters.map((cluster, index) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            index={index}
            onViewSample={onViewSample}
            onApplyFix={onApplyFix}
          />
        ))}
      </div>
    </Card>
  )
}

/**
 * 根据聚类标签和共同特征生成修复建议
 */
function getSuggestedFix(label: string, features: string[]): string {
  const lowerLabel = label.toLowerCase()
  const lowerFeatures = features.map(f => f.toLowerCase()).join(' ')

  if (lowerLabel.includes('格式') || lowerLabel.includes('format') || lowerFeatures.includes('json')) {
    return '在提示词中明确指定输出格式要求，并提供正确格式的示例。考虑添加格式验证提示，如"请确保输出是有效的 JSON 格式"。'
  }

  if (lowerLabel.includes('空') || lowerLabel.includes('缺失') || lowerFeatures.includes('empty')) {
    return '检查提示词是否提供了足够的上下文信息。考虑添加"请给出详细的回答"等指令，确保模型理解需要输出内容。'
  }

  if (lowerLabel.includes('关键') || lowerLabel.includes('keyword')) {
    return '在提示词中强调必须包含的关键信息，可以使用列表形式明确要求。例如："回答必须包含以下要点：..."'
  }

  if (lowerLabel.includes('长度') || lowerLabel.includes('length')) {
    return '明确指定输出的长度范围，如"请用 100-200 字回答"。如果输出过短，可能需要补充更多背景信息。'
  }

  if (lowerLabel.includes('语义') || lowerLabel.includes('semantic')) {
    return '优化提示词表述，使指令更加清晰明确。考虑添加角色设定和具体场景说明，帮助模型更好地理解任务。'
  }

  if (lowerLabel.includes('超时') || lowerLabel.includes('timeout')) {
    return '考虑简化任务复杂度，将复杂任务拆分为多个步骤。如果问题持续，可能需要调整超时设置或使用更快的模型。'
  }

  return '仔细分析该类失败的共同特征，针对性地优化提示词内容。可以尝试添加更多示例或明确的指令说明。'
}
