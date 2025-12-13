'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Form,
  Input,
  Button,
  Steps,
  Card,
  Select,
  InputNumber,
  Space,
  Typography,
  Divider,
  Alert,
  Spin,
  Dropdown,
} from 'antd'
import type { MenuProps } from 'antd'
import { FileTextOutlined, SaveOutlined, DownOutlined } from '@ant-design/icons'
import { usePrompts } from '@/hooks/usePrompts'
import { useModels, useUnifiedModels } from '@/hooks/useModels'
import { useDatasets } from '@/hooks/useDatasets'
import { useEvaluators } from '@/hooks/useEvaluators'
import { useCreateTask, useRunTask } from '@/hooks/useTasks'
import type { UnifiedModel } from '@/services/models'
import { EvaluatorRecommendHint } from '@/components/analysis/EvaluatorRecommend'
import { extractPromptFeatures, extractDatasetFeaturesFromColumns, matchEvaluators } from '@/lib/recommendation'
import { SaveTemplateModal, TemplateSelector } from '@/components/templates'
import { ModelSelector } from '@/components/common'
import type { TemplateConfig } from '@/hooks/useTemplates'
import type { MatchResult } from '@/lib/recommendation'
import type { CreateTaskInput } from '@/services/tasks'

const { Title, Text } = Typography
const { TextArea } = Input

type FormData = {
  name: string
  description?: string
  promptSelections: Array<{ promptId: string; versionId: string }>
  modelIds: string[]
  datasetId: string
  evaluatorIds: string[]
  concurrency: number
  timeoutSeconds: number
  retryCount: number
}

export function CreateTaskForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm<FormData>()

  // 模板相关状态
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)

  // 加载选项数据
  const { data: promptsData, isLoading: promptsLoading } = usePrompts({ pageSize: 100 })
  const { data: modelsData, isLoading: modelsLoading } = useModels()
  const { data: unifiedModelsData, isLoading: unifiedModelsLoading } = useUnifiedModels()
  const { data: datasetsData, isLoading: datasetsLoading, refetch: refetchDatasets } = useDatasets({ pageSize: 100 })
  const { data: evaluatorsData, isLoading: evaluatorsLoading } = useEvaluators()

  // 合并本地和 FastGPT 模型用于选择
  const allModels = useMemo(() => {
    const models: Array<UnifiedModel & { displayLabel: string }> = []

    // 本地模型
    if (modelsData) {
      for (const m of modelsData) {
        if (m.isActive) {
          models.push({
            id: m.id,
            name: m.name,
            provider: m.provider.name,
            type: 'llm',
            isActive: true,
            isCustom: true,
            source: 'local',
            displayLabel: `${m.name} (${m.provider.name})`,
          })
        }
      }
    }

    // FastGPT 模型（仅 LLM 类型）
    if (unifiedModelsData?.models) {
      for (const m of unifiedModelsData.models) {
        if (m.source === 'fastgpt' && m.type === 'llm' && m.isActive) {
          models.push({
            ...m,
            displayLabel: `${m.name} (${m.provider}) [FastGPT]`,
          })
        }
      }
    }

    return models
  }, [modelsData, unifiedModelsData])

  // 进入第二步时刷新数据集列表，确保获取最新的 rowCount
  useEffect(() => {
    if (currentStep === 1) {
      refetchDatasets()
    }
  }, [currentStep, refetchDatasets])

  const createTask = useCreateTask()
  const runTask = useRunTask()

  // 选中的提示词 ID
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([])
  const [promptVersions, setPromptVersions] = useState<
    Record<string, Array<{ id: string; version: number }>>
  >({})
  // 评估器推荐结果
  const [evaluatorMatchResult, setEvaluatorMatchResult] = useState<MatchResult | null>(null)

  // 当选中提示词变化时，加载版本
  useEffect(() => {
    const loadVersions = async () => {
      const newVersions: Record<string, Array<{ id: string; version: number }>> = {}
      for (const promptId of selectedPromptIds) {
        try {
          const response = await fetch(`/api/v1/prompts/${promptId}/versions`)
          const data = await response.json()
          if (data.code === 200) {
            newVersions[promptId] = data.data.map((v: { id: string; version: number }) => ({
              id: v.id,
              version: v.version,
            }))
          }
        } catch {
          // ignore
        }
      }
      setPromptVersions(newVersions)
    }

    if (selectedPromptIds.length > 0) {
      loadVersions()
    }
  }, [selectedPromptIds])

  // 计算预估数量
  const formValues = Form.useWatch([], form)
  const estimatedCount = (() => {
    const prompts = formValues?.promptSelections?.filter((p: { promptId: string }) => p?.promptId) || []
    const models = formValues?.modelIds?.length || 0
    const datasetId = formValues?.datasetId
    const dataset = datasetsData?.list?.find((d) => d.id === datasetId)
    const rows = dataset?.rowCount || 0
    return prompts.length * models * rows
  })()

  const handlePromptChange = (promptIds: string[]) => {
    setSelectedPromptIds(promptIds)
    // 重置版本选择
    const currentSelections = form.getFieldValue('promptSelections') || []
    const newSelections = promptIds.map((id) => {
      const existing = currentSelections.find(
        (s: { promptId: string }) => s?.promptId === id
      )
      return existing || { promptId: id, versionId: '' }
    })
    form.setFieldValue('promptSelections', newSelections)
  }

  // 当进入评估配置步骤时，生成评估器推荐
  useEffect(() => {
    if (currentStep !== 2) return
    if (selectedPromptIds.length === 0) return

    const generateRecommendation = async () => {
      try {
        // 获取选中的提示词内容（从 API 获取）
        let promptContent = ''
        const promptId = selectedPromptIds[0]
        try {
          const response = await fetch(`/api/v1/prompts/${promptId}`)
          const data = await response.json()
          if (data.code === 200 && data.data?.content) {
            promptContent = data.data.content
          }
        } catch {
          // 获取失败时跳过
        }

        if (!promptContent) return

        // 提取提示词特征
        const promptFeatures = extractPromptFeatures(promptContent)

        // 获取数据集信息
        const datasetId = form.getFieldValue('datasetId')
        const dataset = datasetsData?.list?.find(d => d.id === datasetId)

        // 提取数据集特征（使用基本信息）
        const datasetFeatures = extractDatasetFeaturesFromColumns(
          [], // 列信息需要单独获取，这里简化处理
          [],
          dataset?.rowCount || 0
        )

        // 匹配评估器
        const matchResult = matchEvaluators(promptFeatures, datasetFeatures)
        setEvaluatorMatchResult(matchResult)
      } catch (err) {
        console.error('Failed to generate evaluator recommendation:', err)
      }
    }

    generateRecommendation()
  }, [currentStep, selectedPromptIds, datasetsData, form])

  // 从模板应用配置
  const handleApplyTemplate = (config: TemplateConfig) => {
    // 应用提示词配置
    if (config.promptId) {
      setSelectedPromptIds([config.promptId])
      if (config.promptVersionId) {
        form.setFieldValue('promptSelections', [
          { promptId: config.promptId, versionId: config.promptVersionId }
        ])
      }
    }

    // 应用模型配置
    if (config.modelId) {
      form.setFieldValue('modelIds', [config.modelId])
    }

    // 应用数据集配置
    if (config.datasetId) {
      form.setFieldValue('datasetId', config.datasetId)
    }

    // 应用评估器配置
    if (config.evaluatorIds?.length) {
      form.setFieldValue('evaluatorIds', config.evaluatorIds)
    }

    // 应用采样配置（如有）
    if (config.samplingConfig) {
      // 当前表单暂不支持采样配置，可在后续扩展
    }
  }

  // 获取当前表单配置用于保存模板
  const getCurrentConfig = (): TemplateConfig => {
    const values = form.getFieldsValue(true)
    const config: TemplateConfig = {}

    // 提示词配置（仅保存第一个）
    if (values.promptSelections?.length > 0) {
      config.promptId = values.promptSelections[0].promptId
      config.promptVersionId = values.promptSelections[0].versionId
    }

    // 模型配置（仅保存第一个）
    if (values.modelIds?.length > 0) {
      config.modelId = values.modelIds[0]
    }

    // 数据集配置
    if (values.datasetId) {
      config.datasetId = values.datasetId
    }

    // 评估器配置
    if (values.evaluatorIds?.length > 0) {
      config.evaluatorIds = values.evaluatorIds
    }

    // 采样配置
    config.samplingConfig = {
      type: 'all',
    }

    return config
  }

  // 应用评估器推荐
  const handleApplyRecommendation = () => {
    if (!evaluatorMatchResult) return

    // 根据推荐的评估器类型，找到对应的评估器 ID
    const recommendedTypes = new Set(evaluatorMatchResult.recommendations.map(r => r.evaluatorId))
    const matchedEvaluatorIds: string[] = []

    // 简单映射：根据评估器名称或类型匹配
    for (const evaluator of evaluatorsData || []) {
      const evaluatorType = evaluator.type.toLowerCase()
      const evaluatorName = evaluator.name.toLowerCase()

      // JSON 相关
      if (recommendedTypes.has('json_valid') && (evaluatorName.includes('json') || evaluatorType.includes('json'))) {
        matchedEvaluatorIds.push(evaluator.id)
      }
      // 关键词相关
      if (recommendedTypes.has('keyword_include') && (evaluatorName.includes('关键') || evaluatorName.includes('keyword') || evaluatorName.includes('包含'))) {
        matchedEvaluatorIds.push(evaluator.id)
      }
      // 长度相关
      if (recommendedTypes.has('length_range') && (evaluatorName.includes('长度') || evaluatorName.includes('length'))) {
        matchedEvaluatorIds.push(evaluator.id)
      }
      // 相似度相关
      if (recommendedTypes.has('similarity') && (evaluatorName.includes('相似') || evaluatorName.includes('similarity'))) {
        matchedEvaluatorIds.push(evaluator.id)
      }
      // LLM 评估
      if (recommendedTypes.has('llm') && (evaluatorType === 'llm' || evaluatorName.includes('llm'))) {
        matchedEvaluatorIds.push(evaluator.id)
      }
    }

    if (matchedEvaluatorIds.length > 0) {
      form.setFieldValue('evaluatorIds', [...new Set(matchedEvaluatorIds)])
    }
  }

  const handleSubmit = async () => {
    try {
      // 获取所有表单字段的值
      const values = form.getFieldsValue(true)
      console.log('Form values:', values)

      // 验证必填字段
      if (!values.name || !values.promptSelections?.length || !values.modelIds?.length ||
          !values.datasetId || !values.evaluatorIds?.length) {
        console.error('Missing required fields')
        return
      }

      // 分离本地模型和 FastGPT 模型
      const localModelIds: string[] = []
      const fastgptModels: Array<{
        id: string
        modelId: string
        name: string
        provider: string
        inputPrice?: number
        outputPrice?: number
        maxContext?: number
        maxResponse?: number
      }> = []

      for (const modelId of values.modelIds) {
        const model = allModels.find((m) => m.id === modelId)
        if (model) {
          if (model.source === 'local') {
            localModelIds.push(modelId)
          } else if (model.source === 'fastgpt') {
            fastgptModels.push({
              id: model.id,
              modelId: model.id, // FastGPT 模型的 id 就是 modelId
              name: model.name,
              provider: model.provider,
              inputPrice: model.inputPrice,
              outputPrice: model.outputPrice,
              maxContext: model.maxContext,
              maxResponse: model.maxResponse,
            })
          }
        }
      }

      const input: CreateTaskInput = {
        name: values.name,
        description: values.description,
        config: {
          promptIds: values.promptSelections.map((s: { promptId: string }) => s.promptId),
          promptVersionIds: values.promptSelections.map((s: { versionId: string }) => s.versionId),
          modelIds: localModelIds, // 只传本地模型 ID
          datasetId: values.datasetId,
          evaluatorIds: values.evaluatorIds,
          execution: {
            concurrency: values.concurrency || 5,
            timeoutSeconds: values.timeoutSeconds || 30,
            retryCount: values.retryCount || 3,
          },
          // FastGPT 模型配置存入 config
          fastgptModels: fastgptModels.length > 0 ? fastgptModels : undefined,
        },
      }
      console.log('Task input:', input)

      const result = await createTask.mutateAsync(input)

      // 创建成功后自动启动任务
      try {
        await runTask.mutateAsync(result.id)
      } catch (runErr) {
        console.error('Auto run task error:', runErr)
        // 即使启动失败也跳转到详情页，用户可以手动启动
      }

      router.push(`/tasks/${result.id}`)
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const steps = [
    {
      title: '基本信息',
      content: (
        <Card>
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="输入任务名称" maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea placeholder="输入任务描述（可选）" rows={3} maxLength={500} />
          </Form.Item>
        </Card>
      ),
    },
    {
      title: '测试配置',
      content: (
        <Card>
          <Spin spinning={promptsLoading || modelsLoading || datasetsLoading}>
            <Form.Item
              label="选择提示词"
              rules={[{ required: true, message: '请选择提示词' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择要测试的提示词"
                value={selectedPromptIds}
                onChange={handlePromptChange}
                options={promptsData?.list?.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>

            {selectedPromptIds.length > 0 && (
              <Form.List name="promptSelections">
                {(fields) => (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">选择每个提示词的版本：</Text>
                    {fields.map((field, index) => {
                      const promptId = selectedPromptIds[index]
                      const prompt = promptsData?.list?.find((p) => p.id === promptId)
                      const versions = promptVersions[promptId] || []
                      return (
                        <div key={field.key} style={{ marginTop: 8 }}>
                          <Space>
                            <Text>{prompt?.name}:</Text>
                            <Form.Item
                              {...field}
                              name={[field.name, 'versionId']}
                              noStyle
                              rules={[{ required: true, message: '请选择版本' }]}
                            >
                              <Select
                                placeholder="选择版本"
                                style={{ width: 200 }}
                                options={versions.map((v) => ({
                                  value: v.id,
                                  label: `v${v.version}`,
                                }))}
                              />
                            </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, 'promptId']}
                              noStyle
                              initialValue={promptId}
                            >
                              <Input type="hidden" />
                            </Form.Item>
                          </Space>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Form.List>
            )}

            <Divider />

            <Form.Item
              name="modelIds"
              label="选择模型"
              rules={[{ required: true, message: '请选择模型' }]}
              extra={unifiedModelsData?.fastgptEnabled ? '支持本地模型和 FastGPT 模型' : undefined}
            >
              <ModelSelector
                models={allModels}
                multiple
                placeholder="选择要测试的模型"
                loading={modelsLoading || unifiedModelsLoading}
                filterType="llm"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="datasetId"
              label="选择数据集"
              rules={[{ required: true, message: '请选择数据集' }]}
            >
              <Select
                placeholder="选择测试数据集"
                options={datasetsData?.list?.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.rowCount} 条)`,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Spin>
        </Card>
      ),
    },
    {
      title: '评估配置',
      content: (
        <Card>
          <Spin spinning={evaluatorsLoading}>
            {/* 智能推荐提示 */}
            <EvaluatorRecommendHint
              matchResult={evaluatorMatchResult}
              onClick={handleApplyRecommendation}
            />

            <Form.Item
              name="evaluatorIds"
              label="选择评估器"
              rules={[{ required: true, message: '请选择评估器' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择评估器"
                options={evaluatorsData?.map((e) => ({
                  value: e.id,
                  label: `${e.name} (${e.type === 'preset' ? '预置' : '代码'})`,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Spin>
        </Card>
      ),
    },
    {
      title: '执行配置',
      content: (
        <Card>
          <Form.Item
            name="concurrency"
            label="并发数"
            initialValue={5}
            rules={[{ required: true }]}
            extra="同时执行的测试数量，建议 1-10"
          >
            <InputNumber min={1} max={20} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="timeoutSeconds"
            label="超时时间(秒)"
            initialValue={30}
            rules={[{ required: true }]}
            extra="单次模型调用的超时时间"
          >
            <InputNumber min={10} max={300} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="retryCount"
            label="重试次数"
            initialValue={3}
            rules={[{ required: true }]}
            extra="失败后的重试次数（使用指数退避）"
          >
            <InputNumber min={0} max={5} style={{ width: 200 }} />
          </Form.Item>

          <Divider />

          <Alert
            type="info"
            message="预估信息"
            description={
              <div>
                <p>预估测试数量: <strong>{estimatedCount}</strong></p>
                <Text type="secondary">
                  = {selectedPromptIds.length} 个提示词 × {formValues?.modelIds?.length || 0} 个模型
                  × {datasetsData?.list?.find((d) => d.id === formValues?.datasetId)?.rowCount || 0} 条数据
                </Text>
              </div>
            }
          />
        </Card>
      ),
    },
  ]

  const next = async () => {
    try {
      // 验证当前步骤的字段
      if (currentStep === 0) {
        await form.validateFields(['name'])
      } else if (currentStep === 1) {
        await form.validateFields(['promptSelections', 'modelIds', 'datasetId'])
      } else if (currentStep === 2) {
        await form.validateFields(['evaluatorIds'])
      }
      setCurrentStep(currentStep + 1)
    } catch {
      // validation failed
    }
  }

  const prev = () => {
    setCurrentStep(currentStep - 1)
  }

  // 模板下拉菜单
  const templateMenuItems: MenuProps['items'] = [
    {
      key: 'from-template',
      icon: <FileTextOutlined />,
      label: '从模板创建',
      onClick: () => setTemplateSelectorOpen(true),
    },
    {
      key: 'save-template',
      icon: <SaveOutlined />,
      label: '保存为模板',
      onClick: () => setSaveTemplateOpen(true),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>创建测试任务</Title>
        <Dropdown menu={{ items: templateMenuItems }} placement="bottomRight">
          <Button icon={<FileTextOutlined />}>
            模板 <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((item) => (
          <Steps.Step key={item.title} title={item.title} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          concurrency: 5,
          timeoutSeconds: 30,
          retryCount: 3,
        }}
      >
        {steps[currentStep].content}
      </Form>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={() => router.back()}>取消</Button>
          {currentStep > 0 && <Button onClick={prev}>上一步</Button>}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              下一步
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={createTask.isPending || runTask.isPending}
            >
              {createTask.isPending ? '创建中...' : runTask.isPending ? '启动中...' : '创建并执行'}
            </Button>
          )}
        </Space>
      </div>

      {/* 模板选择器 */}
      <TemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={handleApplyTemplate}
      />

      {/* 保存模板 */}
      <SaveTemplateModal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        config={getCurrentConfig()}
      />
    </div>
  )
}
