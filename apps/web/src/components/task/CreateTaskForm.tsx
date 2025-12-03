'use client'

import { useState, useEffect } from 'react'
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
} from 'antd'
import { usePrompts } from '@/hooks/usePrompts'
import { useModels } from '@/hooks/useModels'
import { useDatasets } from '@/hooks/useDatasets'
import { useEvaluators } from '@/hooks/useEvaluators'
import { useCreateTask } from '@/hooks/useTasks'
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

  // 加载选项数据
  const { data: promptsData, isLoading: promptsLoading } = usePrompts({ pageSize: 100 })
  const { data: modelsData, isLoading: modelsLoading } = useModels()
  const { data: datasetsData, isLoading: datasetsLoading, refetch: refetchDatasets } = useDatasets({ pageSize: 100 })
  const { data: evaluatorsData, isLoading: evaluatorsLoading } = useEvaluators()

  // 进入第二步时刷新数据集列表，确保获取最新的 rowCount
  useEffect(() => {
    if (currentStep === 1) {
      refetchDatasets()
    }
  }, [currentStep, refetchDatasets])

  const createTask = useCreateTask()

  // 选中的提示词 ID
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([])
  const [promptVersions, setPromptVersions] = useState<
    Record<string, Array<{ id: string; version: number }>>
  >({})

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

      const input: CreateTaskInput = {
        name: values.name,
        description: values.description,
        config: {
          promptIds: values.promptSelections.map((s: { promptId: string }) => s.promptId),
          promptVersionIds: values.promptSelections.map((s: { versionId: string }) => s.versionId),
          modelIds: values.modelIds,
          datasetId: values.datasetId,
          evaluatorIds: values.evaluatorIds,
          execution: {
            concurrency: values.concurrency || 5,
            timeoutSeconds: values.timeoutSeconds || 30,
            retryCount: values.retryCount || 3,
          },
        },
      }
      console.log('Task input:', input)

      const result = await createTask.mutateAsync(input)
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
            >
              <Select
                mode="multiple"
                placeholder="选择要测试的模型"
                options={modelsData
                  ?.filter((m) => m.isActive)
                  ?.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.provider.name})`,
                  }))}
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

  return (
    <div>
      <Title level={4}>创建测试任务</Title>

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
              loading={createTask.isPending}
            >
              创建任务
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
