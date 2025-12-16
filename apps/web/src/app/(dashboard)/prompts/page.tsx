'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Typography } from 'antd'
import {
  usePrompts,
  usePrompt,
  useDeletePrompt,
  useCopyPrompt,
  useBatchDeletePrompts,
  useBatchExportPrompts,
} from '@/hooks/usePrompts'
import { LoadingState, ErrorState, EmptyState } from '@/components/common'
import {
  PromptFilters,
  PromptTable,
  PromptPreviewCard,
  PromptBatchActions,
} from '@/components/prompt'
import type { PromptFiltersValue } from '@/components/prompt'
import { appMessage } from '@/lib/message'
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
import { useGoiResourceListener } from '@/hooks/useGoiResourceListener'
import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'

const { Title } = Typography

// 可用标签
const AVAILABLE_TAGS = ['生产', '测试', '开发', '归档']

export default function PromptsPage() {
  const router = useRouter()

  // 筛选状态
  const [filters, setFilters] = useState<PromptFiltersValue>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 预览状态
  const [previewId, setPreviewId] = useState<string | null>(null)

  // 数据查询
  const { data, isLoading, error, refetch } = usePrompts({
    page,
    pageSize,
    keyword: filters.search,
    tags: filters.tags,
  })

  // 预览数据
  const { data: previewData, isLoading: previewLoading } = usePrompt(previewId || '')

  // 操作 hooks
  const deletePrompt = useDeletePrompt()
  const copyPrompt = useCopyPrompt()
  const batchDelete = useBatchDeletePrompts()
  const batchExport = useBatchExportPrompts()

  // GOI 弹窗事件监听 - 创建时导航到新建页面
  useGoiDialogListener({
    [GOI_DIALOG_IDS.CREATE_PROMPT]: () => router.push('/prompts/new'),
  })

  // GOI 资源变更监听 - 自动刷新列表
  useGoiResourceListener('prompt')

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: PromptFiltersValue) => {
    setFilters(newFilters)
    setPage(1)
    setSelectedIds([])
  }, [])

  // 处理分页变化
  const handlePaginationChange = useCallback((p: number, ps: number) => {
    setPage(p)
    setPageSize(ps)
  }, [])

  // 单个删除
  const handleDelete = useCallback(async (id: string) => {
    await deletePrompt.mutateAsync(id)
    setSelectedIds((prev) => prev.filter((i) => i !== id))
  }, [deletePrompt])

  // 复制提示词
  const handleCopy = useCallback(async (id: string) => {
    await copyPrompt.mutateAsync(id)
  }, [copyPrompt])

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    await batchDelete.mutateAsync(selectedIds)
    setSelectedIds([])
  }, [selectedIds, batchDelete])

  // 批量导出
  const handleBatchExport = useCallback(async () => {
    if (selectedIds.length === 0) return
    await batchExport.mutateAsync(selectedIds)
  }, [selectedIds, batchExport])

  // 全选
  const handleSelectAll = useCallback(() => {
    if (data?.list) {
      setSelectedIds(data.list.map((item) => item.id))
    }
  }, [data?.list])

  // 取消全选
  const handleDeselectAll = useCallback(() => {
    setSelectedIds([])
  }, [])

  // 预览关闭
  const handlePreviewClose = useCallback(() => {
    setPreviewId(null)
  }, [])

  // 提取变量名
  const extractVariableNames = (variables: unknown): string[] => {
    if (!variables || !Array.isArray(variables)) return []
    return variables.map((v: { name?: string }) => v.name || '').filter(Boolean)
  }

  // 加载状态
  if (isLoading && !data) {
    return <LoadingState />
  }

  // 错误状态
  if (error) {
    return <ErrorState message="获取提示词列表失败" onRetry={() => refetch()} />
  }

  // 空状态
  if (data?.list?.length === 0 && !filters.search && !filters.tags?.length) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            提示词管理
          </Title>
        </div>
        <EmptyState
          description="暂无提示词"
          actionText="新建提示词"
          onAction={() => router.push('/prompts/new')}
        />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          提示词管理
        </Title>
      </div>

      {/* 筛选器 */}
      <PromptFilters
        value={filters}
        onChange={handleFiltersChange}
        onCreatePrompt={() => router.push('/prompts/new')}
        availableTags={AVAILABLE_TAGS}
      />

      {/* 表格 */}
      <PromptTable
        data={data?.list || []}
        loading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={(id) => router.push(`/prompts/${id}`)}
        onTest={(id) => router.push(`/prompts/${id}?tab=test`)}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onPreview={setPreviewId}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          onChange: handlePaginationChange,
        }}
      />

      {/* 批量操作栏 */}
      <PromptBatchActions
        total={data?.total || 0}
        selectedCount={selectedIds.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBatchDelete={handleBatchDelete}
        onBatchExport={handleBatchExport}
        loading={batchDelete.isPending || batchExport.isPending}
      />

      {/* 预览卡片 */}
      {previewId && (
        <PromptPreviewCard
          id={previewId}
          name={previewData?.name || ''}
          version={previewData?.currentVersion || 1}
          tags={previewData?.tags || []}
          systemPrompt={previewData?.content || ''}
          variables={extractVariableNames(previewData?.variables)}
          createdBy={previewData?.createdBy?.name || ''}
          updatedAt={previewData?.updatedAt ? String(previewData.updatedAt) : ''}
          loading={previewLoading}
          onViewDetail={() => {
            setPreviewId(null)
            router.push(`/prompts/${previewId}`)
          }}
          onTest={() => {
            setPreviewId(null)
            router.push(`/prompts/${previewId}?tab=test`)
          }}
          onClose={handlePreviewClose}
        />
      )}
    </div>
  )
}
