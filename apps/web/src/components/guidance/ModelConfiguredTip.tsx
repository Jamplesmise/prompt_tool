'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, FileText } from 'lucide-react'
import { ContextualTip } from './ContextualTip'
import { useEventBus, type EventData } from '@/lib/eventBus'
import { TIP_IDS } from '@/stores/guidanceStore'

export function ModelConfiguredTip() {
  const router = useRouter()
  const [configuredModel, setConfiguredModel] = useState<EventData['model:configured'] | null>(
    null
  )

  // 监听模型配置事件
  useEventBus(
    'model:configured',
    useCallback((data) => {
      setConfiguredModel(data)
    }, [])
  )

  if (!configuredModel) {
    return null
  }

  const handleCreatePrompt = () => {
    router.push('/prompts/new')
    setConfiguredModel(null)
  }

  const handleViewPrompts = () => {
    router.push('/prompts')
    setConfiguredModel(null)
  }

  return (
    <ContextualTip
      tipId={TIP_IDS.MODEL_CONFIGURED}
      icon={<Cpu size={20} />}
      title={`模型 "${configuredModel.providerName}" 配置成功`}
      description="现在可以创建提示词并使用此模型进行测试。"
      primaryAction={{
        text: '创建提示词',
        onClick: handleCreatePrompt,
      }}
      secondaryAction={{
        text: '查看提示词',
        onClick: handleViewPrompts,
      }}
      type="success"
      onClose={() => setConfiguredModel(null)}
      style={{ marginBottom: 16 }}
    />
  )
}
