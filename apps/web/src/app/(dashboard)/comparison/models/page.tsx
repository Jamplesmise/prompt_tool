'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Breadcrumb, Spin, Typography } from 'antd'
import {
  HomeOutlined,
  ApiOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { ModelComparePanel } from '@/components/comparison'

const { Title, Text } = Typography

/**
 * 模型对比页面内容组件
 */
function ModelCompareContent() {
  const searchParams = useSearchParams()
  const promptId = searchParams.get('promptId') || undefined
  const datasetId = searchParams.get('datasetId') || undefined

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑导航 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <><HomeOutlined /> 首页</> },
          { href: '/models', title: <><ApiOutlined /> 模型</> },
          { title: <><BarChartOutlined /> 模型对比</> },
        ]}
      />

      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          模型对比分析
        </Title>
        <Text type="secondary">
          对比不同模型在相同条件下的表现，选择最适合的模型
        </Text>
      </div>

      {/* 模型对比面板 */}
      <ModelComparePanel
        initialPromptId={promptId}
        initialDatasetId={datasetId}
      />
    </div>
  )
}

/**
 * 模型对比页面
 */
export default function ModelComparePage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      }
    >
      <ModelCompareContent />
    </Suspense>
  )
}
