'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, Database } from 'lucide-react'
import { ContextualTip } from './ContextualTip'
import { useEventBus, type EventData } from '@/lib/eventBus'
import { TIP_IDS } from '@/stores/guidanceStore'

export function DatasetUploadedTip() {
  const router = useRouter()
  const [uploadedDataset, setUploadedDataset] = useState<EventData['dataset:uploaded'] | null>(
    null
  )

  // 监听数据集上传事件
  useEventBus(
    'dataset:uploaded',
    useCallback((data) => {
      setUploadedDataset(data)
    }, [])
  )

  if (!uploadedDataset) {
    return null
  }

  const handleCreateTask = () => {
    // 跳转到创建任务页面，预填数据集
    router.push(`/tasks/new?datasetId=${uploadedDataset.datasetId}`)
    setUploadedDataset(null)
  }

  const handleViewDataset = () => {
    // 跳转到数据集详情
    router.push(`/datasets/${uploadedDataset.datasetId}`)
    setUploadedDataset(null)
  }

  return (
    <ContextualTip
      tipId={TIP_IDS.DATASET_UPLOADED}
      icon={<Database size={20} />}
      title={`数据集 "${uploadedDataset.datasetName}" 上传成功`}
      description={`已成功导入 ${uploadedDataset.rowCount} 条数据。现在可以创建测试任务来验证您的提示词。`}
      primaryAction={{
        text: '创建测试任务',
        onClick: handleCreateTask,
      }}
      secondaryAction={{
        text: '查看数据集',
        onClick: handleViewDataset,
      }}
      type="success"
      onClose={() => setUploadedDataset(null)}
      style={{ marginBottom: 16 }}
    />
  )
}
