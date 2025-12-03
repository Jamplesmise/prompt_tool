'use client'

import { Button, Tabs, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { PresetList, EvaluatorTable } from '@/components/evaluator'

const { Title } = Typography

export default function EvaluatorsPage() {
  const router = useRouter()

  const handleCreate = () => {
    router.push('/evaluators/new')
  }

  const items = [
    {
      key: 'preset',
      label: '预置评估器',
      children: <PresetList />,
    },
    {
      key: 'custom',
      label: '自定义评估器',
      children: <EvaluatorTable />,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          评估器
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建评估器
        </Button>
      </div>

      <Tabs items={items} defaultActiveKey="preset" />
    </div>
  )
}
