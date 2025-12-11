'use client'

import { useState } from 'react'
import { Button, Tabs, Typography, Alert, Row, Col } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import {
  EvaluatorTable,
  PresetEvaluatorCard,
  EvaluatorDetailModal,
  EvaluatorEmptyState,
} from '@/components/evaluator'
import type { EvaluatorDetail } from '@/components/evaluator'
import { useEvaluators } from '@/hooks/useEvaluators'
import { PRESET_EVALUATORS } from '@/constants/evaluators'

const { Title } = Typography

export default function EvaluatorsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('preset')
  const [detailEvaluator, setDetailEvaluator] = useState<EvaluatorDetail | null>(null)

  // 获取自定义评估器
  const { data: evaluators } = useEvaluators()
  const customEvaluators = evaluators?.filter((e) => !e.isPreset) || []

  const handleCreate = () => {
    router.push('/evaluators/new')
  }

  const handleViewDocs = () => {
    window.open('/docs/evaluators', '_blank')
  }

  const items = [
    {
      key: 'preset',
      label: '预置评估器',
      children: (
        <div>
          <Alert
            type="info"
            message="预置评估器开箱即用，选择后可直接应用于测试任务"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Row gutter={[16, 16]}>
            {PRESET_EVALUATORS.map((evaluator) => (
              <Col key={evaluator.id} xs={24} sm={12} md={8} lg={6}>
                <PresetEvaluatorCard
                  id={evaluator.id}
                  type={evaluator.type}
                  name={evaluator.name}
                  description={evaluator.description}
                  useCases={evaluator.useCases}
                  onClick={() => setDetailEvaluator(evaluator)}
                />
              </Col>
            ))}
          </Row>
        </div>
      ),
    },
    {
      key: 'custom',
      label: '自定义评估器',
      children:
        customEvaluators.length === 0 ? (
          <EvaluatorEmptyState
            onCreateEvaluator={handleCreate}
            onViewDocs={handleViewDocs}
          />
        ) : (
          <EvaluatorTable />
        ),
    },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          评估器
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建评估器
        </Button>
      </div>

      <Tabs
        items={items}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <EvaluatorDetailModal
        open={!!detailEvaluator}
        evaluator={detailEvaluator}
        onClose={() => setDetailEvaluator(null)}
        onUse={() => {
          setDetailEvaluator(null)
          // 跳转到创建任务页面（评估器选择在任务创建表单中完成）
          router.push('/tasks/new')
        }}
      />
    </div>
  )
}
