'use client'

import { Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { EvaluatorForm } from '@/components/evaluator'
import { useCreateEvaluator, useEvaluators } from '@/hooks/useEvaluators'
import { useModels } from '@/hooks/useModels'
import type { CreateEvaluatorInput } from '@/services/evaluators'

const { Title } = Typography

export default function NewEvaluatorPage() {
  const router = useRouter()
  const createMutation = useCreateEvaluator()
  const { data: models = [], isLoading: modelsLoading } = useModels()
  const { data: evaluators = [], isLoading: evaluatorsLoading } = useEvaluators()

  const handleSubmit = async (values: {
    name: string
    description?: string
    type: 'preset' | 'code' | 'llm' | 'composite'
    config: Record<string, unknown>
  }) => {
    await createMutation.mutateAsync(values as CreateEvaluatorInput)
    router.push('/evaluators')
  }

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
        <Title level={4} style={{ margin: '8px 0 0 0' }}>
          新建评估器
        </Title>
      </div>

      <EvaluatorForm
        onSubmit={handleSubmit}
        loading={createMutation.isPending || modelsLoading || evaluatorsLoading}
        models={models}
        evaluators={evaluators}
      />
    </div>
  )
}
