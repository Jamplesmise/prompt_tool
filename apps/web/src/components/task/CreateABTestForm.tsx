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
  Radio,
  Row,
  Col,
} from 'antd'
import { SwapOutlined } from '@ant-design/icons'
import { usePrompts } from '@/hooks/usePrompts'
import { useModels } from '@/hooks/useModels'
import { useDatasets } from '@/hooks/useDatasets'
import { useEvaluators } from '@/hooks/useEvaluators'
import { useCreateABTest } from '@/hooks/useTasks'
import type { CreateABTestInput } from '@/services/tasks'

const { Title, Text } = Typography
const { TextArea } = Input

type FormData = {
  name: string
  description?: string
  compareType: 'prompt' | 'model'
  // 配置 A
  promptIdA: string
  versionIdA: string
  modelIdA: string
  // 配置 B
  promptIdB: string
  versionIdB: string
  modelIdB: string
  // 共用
  datasetId: string
  evaluatorIds: string[]
  concurrency: number
  timeoutSeconds: number
  retryCount: number
}

export function CreateABTestForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm<FormData>()
  const compareType = Form.useWatch('compareType', form)

  // 加载选项数据（禁用缓存以确保获取最新数据）
  const { data: promptsData, isLoading: promptsLoading } = usePrompts({ pageSize: 100 })
  const { data: modelsData, isLoading: modelsLoading } = useModels()
  const { data: datasetsData, isLoading: datasetsLoading, refetch: refetchDatasets } = useDatasets({ pageSize: 100 })
  const { data: evaluatorsData, isLoading: evaluatorsLoading } = useEvaluators()

  // 进入第二步和最后一步时刷新数据集列表，确保获取最新的 rowCount
  useEffect(() => {
    if (currentStep === 1 || currentStep === 3) {
      refetchDatasets()
    }
  }, [currentStep, refetchDatasets])

  const createABTest = useCreateABTest()

  // 提示词版本
  const [promptVersions, setPromptVersions] = useState<
    Record<string, Array<{ id: string; version: number }>>
  >({})

  // 加载版本
  const loadVersions = async (promptId: string) => {
    if (promptVersions[promptId]) return
    try {
      const response = await fetch(`/api/v1/prompts/${promptId}/versions`)
      const data = await response.json()
      if (data.code === 200) {
        setPromptVersions((prev) => ({
          ...prev,
          [promptId]: data.data.map((v: { id: string; version: number }) => ({
            id: v.id,
            version: v.version,
          })),
        }))
      }
    } catch {
      // ignore
    }
  }

  // 当选择提示词时加载版本
  const handlePromptSelect = (promptId: string) => {
    loadVersions(promptId)
  }

  // 计算预估数量
  const formValues = Form.useWatch([], form)
  const watchedDatasetId = Form.useWatch('datasetId', form)
  const estimatedCount = (() => {
    // 优先使用专门监听的 datasetId，回退到 formValues
    const datasetId = watchedDatasetId || formValues?.datasetId
    const dataset = datasetsData?.list?.find((d) => d.id === datasetId)
    const rows = dataset?.rowCount || 0
    // A/B 测试每行数据执行 2 次（A 和 B 各一次）
    return rows * 2
  })()

  const handleSubmit = async () => {
    try {
      const values = form.getFieldsValue(true)

      const input: CreateABTestInput = {
        name: values.name,
        description: values.description,
        compareType: values.compareType,
        configA: {
          promptId: values.promptIdA,
          promptVersionId: values.versionIdA,
          modelId: values.modelIdA,
        },
        configB: {
          promptId: values.promptIdB,
          promptVersionId: values.versionIdB,
          modelId: values.modelIdB,
        },
        datasetId: values.datasetId,
        evaluatorIds: values.evaluatorIds,
        execution: {
          concurrency: values.concurrency || 5,
          timeoutSeconds: values.timeoutSeconds || 30,
          retryCount: values.retryCount || 3,
        },
      }

      const result = await createABTest.mutateAsync(input)
      router.push(`/tasks/${result.id}`)
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  // 当比较类型变化时，同步配置
  useEffect(() => {
    if (compareType === 'prompt') {
      // 提示词对比：模型必须相同
      const modelIdA = form.getFieldValue('modelIdA')
      if (modelIdA) {
        form.setFieldValue('modelIdB', modelIdA)
      }
    } else if (compareType === 'model') {
      // 模型对比：提示词必须相同
      const promptIdA = form.getFieldValue('promptIdA')
      const versionIdA = form.getFieldValue('versionIdA')
      if (promptIdA) {
        form.setFieldValue('promptIdB', promptIdA)
        if (versionIdA) {
          form.setFieldValue('versionIdB', versionIdA)
        }
      }
    }
  }, [compareType, form])

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
            <Input placeholder="输入 A/B 测试任务名称" maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea placeholder="输入任务描述（可选）" rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item
            name="compareType"
            label="对比类型"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio.Button value="prompt">提示词对比</Radio.Button>
              <Radio.Button value="model">模型对比</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Alert
            type="info"
            message={
              compareType === 'prompt'
                ? '提示词对比：使用相同模型，对比不同提示词的效果'
                : '模型对比：使用相同提示词，对比不同模型的效果'
            }
          />
        </Card>
      ),
    },
    {
      title: 'A/B 配置',
      content: (
        <Card>
          <Spin spinning={promptsLoading || modelsLoading}>
            <Row gutter={24}>
              {/* 配置 A */}
              <Col span={11}>
                <Title level={5}>配置 A</Title>
                <Form.Item
                  name="promptIdA"
                  label="提示词"
                  rules={[{ required: true, message: '请选择提示词' }]}
                >
                  <Select
                    placeholder="选择提示词"
                    onChange={handlePromptSelect}
                    options={promptsData?.list?.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="versionIdA"
                  label="版本"
                  rules={[{ required: true, message: '请选择版本' }]}
                >
                  <Select
                    placeholder="选择版本"
                    disabled={!formValues?.promptIdA}
                    options={
                      promptVersions[formValues?.promptIdA]?.map((v) => ({
                        value: v.id,
                        label: `v${v.version}`,
                      })) || []
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="modelIdA"
                  label="模型"
                  rules={[{ required: true, message: '请选择模型' }]}
                >
                  <Select
                    placeholder="选择模型"
                    disabled={compareType === 'prompt' && !!formValues?.modelIdB}
                    onChange={(val) => {
                      if (compareType === 'prompt') {
                        form.setFieldValue('modelIdB', val)
                      }
                    }}
                    options={modelsData
                      ?.filter((m) => m.isActive)
                      ?.map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.provider.name})`,
                      }))}
                  />
                </Form.Item>
              </Col>

              {/* 分隔 */}
              <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SwapOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </Col>

              {/* 配置 B */}
              <Col span={11}>
                <Title level={5}>配置 B</Title>
                <Form.Item
                  name="promptIdB"
                  label="提示词"
                  rules={[{ required: true, message: '请选择提示词' }]}
                >
                  <Select
                    placeholder="选择提示词"
                    disabled={compareType === 'model'}
                    onChange={handlePromptSelect}
                    options={promptsData?.list?.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="versionIdB"
                  label="版本"
                  rules={[{ required: true, message: '请选择版本' }]}
                >
                  <Select
                    placeholder="选择版本"
                    disabled={compareType === 'model' || !formValues?.promptIdB}
                    options={
                      promptVersions[formValues?.promptIdB]?.map((v) => ({
                        value: v.id,
                        label: `v${v.version}`,
                      })) || []
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="modelIdB"
                  label="模型"
                  rules={[{ required: true, message: '请选择模型' }]}
                >
                  <Select
                    placeholder="选择模型"
                    disabled={compareType === 'prompt'}
                    options={modelsData
                      ?.filter((m) => m.isActive)
                      ?.map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.provider.name})`,
                      }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Form.Item
              name="datasetId"
              label="选择数据集"
              rules={[{ required: true, message: '请选择数据集' }]}
            >
              <Select
                placeholder="选择测试数据集"
                loading={datasetsLoading}
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
            rules={[{ required: true }]}
            extra="同时执行的测试数量，建议 1-10"
          >
            <InputNumber min={1} max={20} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="timeoutSeconds"
            label="超时时间(秒)"
            rules={[{ required: true }]}
            extra="单次模型调用的超时时间"
          >
            <InputNumber min={10} max={300} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="retryCount"
            label="重试次数"
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
                  = {datasetsData?.list?.find((d) => d.id === (watchedDatasetId || formValues?.datasetId))?.rowCount || 0} 条数据 × 2（A/B 各一次）
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
      if (currentStep === 0) {
        await form.validateFields(['name', 'compareType'])
      } else if (currentStep === 1) {
        await form.validateFields([
          'promptIdA',
          'versionIdA',
          'modelIdA',
          'promptIdB',
          'versionIdB',
          'modelIdB',
          'datasetId',
        ])
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
      <Title level={4}>创建 A/B 测试任务</Title>

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((item) => (
          <Steps.Step key={item.title} title={item.title} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          compareType: 'prompt',
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
              loading={createABTest.isPending}
            >
              创建 A/B 测试
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
