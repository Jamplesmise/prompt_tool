'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Play, GitCompare } from 'lucide-react'
import { ContextualTip } from './ContextualTip'
import { useEventBus, type EventData } from '@/lib/eventBus'
import { TIP_IDS } from '@/stores/guidanceStore'

type PromptSavedTipProps = {
  /** 当前提示词 ID */
  promptId: string
}

export function PromptSavedTip({ promptId }: PromptSavedTipProps) {
  const router = useRouter()
  const [savedPrompt, setSavedPrompt] = useState<EventData['prompt:saved'] | null>(null)

  // 监听提示词保存事件
  useEventBus(
    'prompt:saved',
    useCallback(
      (data) => {
        if (data.promptId === promptId) {
          setSavedPrompt(data)
        }
      },
      [promptId]
    )
  )

  if (!savedPrompt) {
    return null
  }

  const handleRunTest = () => {
    // 跳转到快速测试 tab
    router.push(`/prompts/${promptId}?tab=test`)
    setSavedPrompt(null)
  }

  const handleCompare = () => {
    // 跳转到版本对比
    router.push(`/prompts/${promptId}?tab=versions`)
    setSavedPrompt(null)
  }

  return (
    <ContextualTip
      tipId={TIP_IDS.PROMPT_SAVED}
      icon={<Play size={20} />}
      title="提示词已保存"
      description="建议运行测试验证修改效果，或与历史版本进行对比。"
      primaryAction={{
        text: '运行测试',
        onClick: handleRunTest,
      }}
      secondaryAction={{
        text: '版本对比',
        onClick: handleCompare,
      }}
      type="success"
      onClose={() => setSavedPrompt(null)}
      style={{ marginBottom: 16 }}
    />
  )
}
