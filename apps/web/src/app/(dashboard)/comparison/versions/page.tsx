'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Breadcrumb, Spin, Empty, Select, Space, Typography, Button } from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  SwapOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { VersionComparePanel } from '@/components/comparison'

const { Title, Text } = Typography

type Prompt = {
  id: string
  name: string
  description?: string
}

/**
 * 获取提示词列表
 */
async function fetchPrompts(): Promise<Prompt[]> {
  const response = await fetch('/api/v1/prompts')
  if (!response.ok) throw new Error('获取提示词列表失败')
  const result = await response.json()
  return result.data?.list || result.data || []
}

/**
 * 版本对比页面内容组件
 */
function VersionCompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const promptIdParam = searchParams.get('promptId')
  const v1Param = searchParams.get('v1')
  const v2Param = searchParams.get('v2')

  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(
    promptIdParam || undefined
  )

  // 获取提示词列表
  const { data: prompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
  })

  // 初始化选择
  useEffect(() => {
    if (!selectedPromptId && prompts.length > 0) {
      setSelectedPromptId(prompts[0].id)
    }
  }, [prompts, selectedPromptId])

  // 当前选中的提示词
  const selectedPrompt = prompts.find(p => p.id === selectedPromptId)

  // 版本变化时更新 URL
  const handleVersionChange = (v1: number, v2: number) => {
    const params = new URLSearchParams()
    if (selectedPromptId) params.set('promptId', selectedPromptId)
    params.set('v1', String(v1))
    params.set('v2', String(v2))
    router.replace(`/comparison/versions?${params.toString()}`)
  }

  // 提示词变化时更新 URL
  const handlePromptChange = (promptId: string) => {
    setSelectedPromptId(promptId)
    const params = new URLSearchParams()
    params.set('promptId', promptId)
    router.replace(`/comparison/versions?${params.toString()}`)
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑导航 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <><HomeOutlined /> 首页</> },
          { href: '/prompts', title: <><FileTextOutlined /> 提示词</> },
          { title: <><SwapOutlined /> 版本对比</> },
        ]}
      />

      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          <SwapOutlined style={{ marginRight: 8 }} />
          版本对比
        </Title>
        <Text type="secondary">
          对比不同版本的提示词效果，分析改动带来的影响
        </Text>
      </div>

      {/* 提示词选择器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text>选择提示词：</Text>
          <Select
            style={{ width: 300 }}
            placeholder="选择要对比的提示词"
            loading={promptsLoading}
            value={selectedPromptId}
            onChange={handlePromptChange}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={prompts.map(p => ({
              value: p.id,
              label: p.name,
            }))}
          />
          {selectedPrompt && (
            <Button
              type="link"
              size="small"
              onClick={() => router.push(`/prompts/${selectedPrompt.id}`)}
            >
              查看详情
            </Button>
          )}
        </Space>
      </Card>

      {/* 版本对比面板 */}
      {selectedPromptId ? (
        <VersionComparePanel
          promptId={selectedPromptId}
          initialVersion1={v1Param ? Number(v1Param) : undefined}
          initialVersion2={v2Param ? Number(v2Param) : undefined}
          onVersionChange={handleVersionChange}
        />
      ) : (
        <Card>
          <Empty
            description="请先选择一个提示词"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  )
}

/**
 * 版本对比页面
 */
export default function VersionComparePage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      }
    >
      <VersionCompareContent />
    </Suspense>
  )
}
