'use client'

import { useState } from 'react'
import {
  Card,
  Tag,
  Typography,
  Button,
  Space,
  Collapse,
  Tooltip,
  Badge,
} from 'antd'
import {
  BulbOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  EyeOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import type { TaskResultData, FailureCluster } from '@/components/results/types'

const { Text, Paragraph } = Typography
const { Panel } = Collapse

type ClusterCardProps = {
  cluster: FailureCluster
  index: number
  onViewSample?: (sample: TaskResultData) => void
  onApplyFix?: (fix: string) => void
}

/**
 * 聚类卡片组件
 * 展示单个聚类的详细信息
 */
export function ClusterCard({ cluster, index, onViewSample, onApplyFix }: ClusterCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      size="small"
      title={
        <Space>
          <Badge count={cluster.samples.length} color="#1890ff" />
          <Text strong>{cluster.label}</Text>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="相似度">
            <Tag color="blue">{Math.round(cluster.similarity * 100)}%</Tag>
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={expanded ? <CompressOutlined /> : <ExpandAltOutlined />}
            onClick={() => setExpanded(!expanded)}
          />
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {/* 共同特征 */}
      {cluster.commonFeatures.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>共同特征：</Text>
          <div style={{ marginTop: 4 }}>
            {cluster.commonFeatures.map((feature, i) => (
              <Tag key={i} style={{ marginBottom: 4 }}>
                {feature}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* 典型样本 */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>典型样本：</Text>
        <div
          style={{
            marginTop: 4,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 8,
            maxHeight: 100,
            overflow: 'auto',
          }}
        >
          <Text style={{ fontSize: 12 }}>
            <strong>输入：</strong>
            {JSON.stringify(cluster.centroid.input).substring(0, 100)}...
          </Text>
          <br />
          <Text type="danger" style={{ fontSize: 12 }}>
            <strong>输出：</strong>
            {(cluster.centroid.output || '（无输出）').substring(0, 100)}
            {(cluster.centroid.output || '').length > 100 && '...'}
          </Text>
        </div>
      </div>

      {/* 修复建议 */}
      {cluster.suggestedFix && (
        <div
          style={{
            padding: 12,
            background: '#fffbe6',
            borderRadius: 8,
            border: '1px solid #ffe58f',
          }}
        >
          <Space style={{ marginBottom: 4 }}>
            <BulbOutlined style={{ color: '#faad14' }} />
            <Text strong style={{ fontSize: 12 }}>修复建议</Text>
          </Space>
          <Paragraph
            style={{ marginBottom: 0, fontSize: 12 }}
            ellipsis={{ rows: 2, expandable: true }}
          >
            {cluster.suggestedFix}
          </Paragraph>
          {onApplyFix && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginTop: 4 }}
              onClick={() => onApplyFix(cluster.suggestedFix)}
            >
              应用建议
            </Button>
          )}
        </div>
      )}

      {/* 展开显示所有样本 */}
      {expanded && (
        <Collapse style={{ marginTop: 12 }} ghost>
          <Panel header={`查看所有样本 (${cluster.samples.length})`} key="samples">
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {cluster.samples.map((sample, i) => (
                <div
                  key={sample.id}
                  style={{
                    padding: 8,
                    marginBottom: 8,
                    background: '#fafafa',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Text ellipsis style={{ fontSize: 12 }}>
                      #{i + 1} {JSON.stringify(sample.input).substring(0, 50)}...
                    </Text>
                  </div>
                  {onViewSample && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => onViewSample(sample)}
                    />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>
      )}
    </Card>
  )
}
