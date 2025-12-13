'use client'

import { use } from 'react'
import { Button, Typography, Spin, Empty, Space } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { EvaluatorForm, TestRunner } from '@/components/evaluator'
import { useEvaluator, useUpdateEvaluator, useEvaluators } from '@/hooks/useEvaluators'
import { useModels } from '@/hooks/useModels'
import type { CodeEvaluatorConfig, PresetEvaluatorConfig, LLMEvaluatorConfig, CompositeEvaluatorConfig } from '@/services/evaluators'
import type { PresetType } from '@platform/evaluators'
import type { CodeLanguage } from '@/lib/sandbox'

const { Title } = Typography

type PageProps = {
  params: Promise<{ id: string }>
}

export default function EditEvaluatorPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: evaluator, isLoading, error } = useEvaluator(id)
  const { data: models = [], isLoading: modelsLoading } = useModels()
  const { data: evaluators = [], isLoading: evaluatorsLoading } = useEvaluators()
  const updateMutation = useUpdateEvaluator()

  const handleSubmit = async (values: {
    name: string
    description?: string
    type: 'code' | 'preset' | 'llm' | 'composite'
    config: Record<string, unknown>
  }) => {
    await updateMutation.mutateAsync({
      id,
      data: {
        name: values.name,
        description: values.description,
        config: values.config,
      },
    })
  }

  if (isLoading || modelsLoading || evaluatorsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !evaluator) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="评估器不存在" />
        <Button type="primary" onClick={() => router.push('/evaluators')}>
          返回列表
        </Button>
      </div>
    )
  }

  // 根据类型获取初始值
  const getInitialValues = () => {
    const base = {
      name: evaluator.name,
      description: evaluator.description || '',
    }

    if (evaluator.type === 'code') {
      const config = evaluator.config as CodeEvaluatorConfig
      return {
        ...base,
        evaluatorType: 'code' as const,
        language: (config.language || 'nodejs') as CodeLanguage,
        code: config.code,
        timeout: config.timeout,
      }
    } else if (evaluator.type === 'llm') {
      const config = evaluator.config as LLMEvaluatorConfig
      return {
        ...base,
        evaluatorType: 'llm' as const,
        modelId: config.modelId,
        prompt: config.prompt,
        scoreRange: config.scoreRange || { min: 0, max: 10 },
        passThreshold: config.passThreshold ?? 0.6,
      }
    } else if (evaluator.type === 'composite') {
      const config = evaluator.config as CompositeEvaluatorConfig
      return {
        ...base,
        evaluatorType: 'composite' as const,
        evaluatorIds: config.evaluatorIds,
        mode: config.mode || 'parallel',
        aggregation: config.aggregation || 'and',
        weights: config.weights,
      }
    } else {
      const config = evaluator.config as PresetEvaluatorConfig
      return {
        ...base,
        evaluatorType: 'preset' as const,
        presetType: config.presetType as PresetType,
        params: config.params,
      }
    }
  }

  // 检查是否需要显示测试面板
  const showTestRunner = evaluator.type === 'code' || evaluator.type === 'llm'

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/evaluators')}
        >
          返回列表
        </Button>
        <Space style={{ marginTop: 8 }}>
          <Title level={4} style={{ margin: 0 }}>
            {evaluator.name}
          </Title>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showTestRunner ? '1fr 400px' : '1fr', gap: 16 }}>
        <div>
          <EvaluatorForm
            initialValues={getInitialValues()}
            onSubmit={handleSubmit}
            loading={updateMutation.isPending}
            isEdit
            models={models}
            evaluators={evaluators}
            currentId={id}
          />
        </div>
        {showTestRunner && (
          <div>
            <TestRunner evaluatorId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
