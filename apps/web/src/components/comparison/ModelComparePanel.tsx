'use client'

import { useState, useMemo } from 'react'
import { Card, Select, Space, Button, Spin, Steps, Divider, Typography, Alert } from 'antd'
import {
  FileTextOutlined,
  DatabaseOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ModelCompareTable } from './ModelCompareTable'
import { ModelRecommendation } from './ModelRecommendation'
import { ModelSelector } from '@/components/common'
import type { ModelComparisonResult } from '@/services/comparisonService'
import type { UnifiedModel } from '@/services/models'

const { Text, Title } = Typography

type Prompt = {
  id: string
  name: string
  currentVersion: number
}

type PromptVersion = {
  id: string
  version: number
}

type Dataset = {
  id: string
  name: string
  rowCount: number
}

type Model = {
  id: string
  name: string
  provider: { name: string }
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
 * 获取提示词版本
 */
async function fetchVersions(promptId: string): Promise<PromptVersion[]> {
  const response = await fetch(`/api/v1/prompts/${promptId}/versions`)
  if (!response.ok) throw new Error('获取版本列表失败')
  const result = await response.json()
  return result.data || []
}

/**
 * 获取数据集列表
 */
async function fetchDatasets(): Promise<Dataset[]> {
  const response = await fetch('/api/v1/datasets')
  if (!response.ok) throw new Error('获取数据集列表失败')
  const result = await response.json()
  return result.data?.list || result.data || []
}

/**
 * 获取模型列表
 */
async function fetchModels(): Promise<Model[]> {
  const response = await fetch('/api/v1/models')
  if (!response.ok) throw new Error('获取模型列表失败')
  const result = await response.json()
  return result.data?.list || result.data || []
}

/**
 * 运行模型对比
 */
async function runComparison(params: {
  promptId: string
  promptVersionId: string
  datasetId: string
  modelIds: string[]
}): Promise<ModelComparisonResult> {
  const response = await fetch('/api/v1/comparison/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('运行对比失败')
  const result = await response.json()
  return result.data
}

type ModelComparePanelProps = {
  initialPromptId?: string
  initialDatasetId?: string
}

/**
 * 模型对比面板组件
 */
export function ModelComparePanel({ initialPromptId, initialDatasetId }: ModelComparePanelProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(initialPromptId)
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>()
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | undefined>(initialDatasetId)
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [comparisonResult, setComparisonResult] = useState<ModelComparisonResult | null>(null)

  // 获取数据
  const { data: prompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
  })

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['versions', selectedPromptId],
    queryFn: () => fetchVersions(selectedPromptId!),
    enabled: !!selectedPromptId,
  })

  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  })

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
  })

  // 转换为 UnifiedModel 格式
  const unifiedModels: UnifiedModel[] = useMemo(() => {
    return models.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider.name,
      type: 'llm',
      isActive: true,
      isCustom: true,
      source: 'local' as const,
    }))
  }, [models])

  // 运行对比
  const comparisonMutation = useMutation({
    mutationFn: runComparison,
    onSuccess: (data) => {
      setComparisonResult(data)
      setCurrentStep(4)
    },
  })

  // 选择提示词时自动选择最新版本
  const handlePromptChange = (promptId: string) => {
    setSelectedPromptId(promptId)
    setSelectedVersionId(undefined)
  }

  // 版本变化时更新
  useMemo(() => {
    if (versions.length > 0 && !selectedVersionId) {
      const latest = versions.reduce((a, b) => (a.version > b.version ? a : b))
      setSelectedVersionId(latest.id)
    }
  }, [versions, selectedVersionId])

  // 检查每一步是否完成
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return !!selectedPromptId && !!selectedVersionId
      case 1:
        return !!selectedDatasetId
      case 2:
        return selectedModelIds.length >= 2
      default:
        return true
    }
  }, [currentStep, selectedPromptId, selectedVersionId, selectedDatasetId, selectedModelIds])

  // 运行对比
  const handleRunComparison = () => {
    if (!selectedPromptId || !selectedVersionId || !selectedDatasetId || selectedModelIds.length < 2) {
      return
    }

    comparisonMutation.mutate({
      promptId: selectedPromptId,
      promptVersionId: selectedVersionId,
      datasetId: selectedDatasetId,
      modelIds: selectedModelIds,
    })
  }

  // 重置
  const handleReset = () => {
    setCurrentStep(0)
    setComparisonResult(null)
    setSelectedModelIds([])
  }

  // 步骤内容
  const steps = [
    {
      title: '选择提示词',
      icon: <FileTextOutlined />,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">选择要测试的提示词：</Text>
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择提示词"
              loading={promptsLoading}
              value={selectedPromptId}
              onChange={handlePromptChange}
              showSearch
              optionFilterProp="label"
              options={prompts.map(p => ({
                value: p.id,
                label: p.name,
              }))}
            />
            {selectedPromptId && (
              <Select
                style={{ width: '100%' }}
                placeholder="选择版本"
                loading={versionsLoading}
                value={selectedVersionId}
                onChange={setSelectedVersionId}
                options={versions.map(v => ({
                  value: v.id,
                  label: `版本 ${v.version}`,
                }))}
              />
            )}
          </Space>
        </div>
      ),
    },
    {
      title: '选择数据集',
      icon: <DatabaseOutlined />,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">选择测试数据集：</Text>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择数据集"
            loading={datasetsLoading}
            value={selectedDatasetId}
            onChange={setSelectedDatasetId}
            showSearch
            optionFilterProp="label"
            options={datasets.map(d => ({
              value: d.id,
              label: `${d.name} (${d.rowCount} 条)`,
            }))}
          />
        </div>
      ),
    },
    {
      title: '选择模型',
      icon: <ApiOutlined />,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">选择要对比的模型（至少 2 个）：</Text>
          </div>
          <ModelSelector
            models={unifiedModels}
            multiple
            value={selectedModelIds}
            onChange={(val) => setSelectedModelIds(val as string[])}
            placeholder="选择模型"
            loading={modelsLoading}
            style={{ width: '100%' }}
          />
          {selectedModelIds.length > 0 && selectedModelIds.length < 2 && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              message="请至少选择 2 个模型进行对比"
              showIcon
            />
          )}
        </div>
      ),
    },
    {
      title: '运行对比',
      icon: <PlayCircleOutlined />,
      content: (
        <div style={{ textAlign: 'center', padding: 24 }}>
          {comparisonMutation.isPending ? (
            <div>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">正在运行模型对比测试...</Text>
              </div>
            </div>
          ) : (
            <div>
              <Title level={4}>准备就绪</Title>
              <div style={{ marginBottom: 24 }}>
                <Text type="secondary">
                  将对比 {selectedModelIds.length} 个模型的表现
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleRunComparison}
              >
                开始对比
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '查看结果',
      icon: <BarChartOutlined />,
      content: comparisonResult ? (
        <div>
          <ModelCompareTable
            data={comparisonResult.models}
            winner={comparisonResult.winner}
          />
          <Divider />
          <ModelRecommendation recommendations={comparisonResult.recommendations} />
        </div>
      ) : null,
    },
  ]

  return (
    <div>
      {/* 步骤指示器 */}
      <Steps
        current={currentStep}
        items={steps.map(s => ({ title: s.title, icon: s.icon }))}
        style={{ marginBottom: 24 }}
      />

      {/* 步骤内容 */}
      <Card style={{ marginBottom: 16 }}>
        {steps[currentStep].content}
      </Card>

      {/* 导航按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(currentStep - 1)}
        >
          上一步
        </Button>
        <Space>
          {currentStep === 4 && (
            <Button onClick={handleReset}>
              重新对比
            </Button>
          )}
          {currentStep < 3 && (
            <Button
              type="primary"
              disabled={!canProceed}
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}

/**
 * 简化的模型对比（直接显示结果，不需要步骤）
 */
type QuickModelCompareProps = {
  result: ModelComparisonResult
}

export function QuickModelCompare({ result }: QuickModelCompareProps) {
  return (
    <div>
      <ModelCompareTable data={result.models} winner={result.winner} sortable={false} />
      {result.recommendations.length > 0 && (
        <>
          <Divider />
          <ModelRecommendation recommendations={result.recommendations} />
        </>
      )}
    </div>
  )
}
