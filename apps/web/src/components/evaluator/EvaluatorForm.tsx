'use client'

import { useState, useEffect } from 'react'
import { Form, Input, Card, Table, Typography, Button, Space, Select, InputNumber, Radio, Alert } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { CodeEditor } from './CodeEditor'
import { CODE_TEMPLATES, type CodeLanguage } from '@/lib/sandbox'
import { DEFAULT_EVALUATION_PROMPT } from '@platform/evaluators'
import type { PresetType } from '@platform/evaluators'

const { TextArea } = Input
const { Text } = Typography

// 输入参数说明
const INPUT_PARAMS = [
  { key: 'input', type: 'string', description: '原始输入' },
  { key: 'output', type: 'string', description: '模型输出' },
  { key: 'expected', type: 'string | null', description: '期望输出' },
  { key: 'metadata', type: 'object', description: '额外元数据（数据集其他字段）' },
]

// 预置评估器选项
const PRESET_OPTIONS: Array<{
  value: PresetType
  label: string
  description: string
  hasParams: boolean
}> = [
  {
    value: 'exact_match',
    label: '精确匹配',
    description: '输出与期望值完全一致',
    hasParams: false,
  },
  {
    value: 'contains',
    label: '包含匹配',
    description: '输出包含期望内容',
    hasParams: false,
  },
  {
    value: 'regex',
    label: '正则匹配',
    description: '输出匹配正则表达式',
    hasParams: true,
  },
  {
    value: 'json_schema',
    label: 'JSON Schema',
    description: '输出符合 JSON Schema 规范',
    hasParams: true,
  },
  {
    value: 'similarity',
    label: '相似度匹配',
    description: '文本相似度超过阈值',
    hasParams: true,
  },
]

type EvaluatorType = 'preset' | 'code' | 'llm' | 'composite'

type Model = {
  id: string
  name: string
  modelId: string
}

type Evaluator = {
  id: string
  name: string
  type: string
  description?: string | null
}

type EvaluatorFormProps = {
  initialValues?: {
    name?: string
    description?: string
    evaluatorType?: EvaluatorType
    language?: CodeLanguage
    code?: string
    timeout?: number
    presetType?: PresetType
    params?: Record<string, unknown>
    // LLM
    modelId?: string
    prompt?: string
    scoreRange?: { min: number; max: number }
    passThreshold?: number
    // Composite
    evaluatorIds?: string[]
    mode?: 'parallel' | 'serial'
    aggregation?: 'and' | 'or' | 'weighted_average'
    weights?: number[]
  }
  onSubmit: (values: {
    name: string
    description?: string
    type: EvaluatorType
    config: Record<string, unknown>
  }) => void
  loading?: boolean
  isEdit?: boolean
  models?: Model[]
  evaluators?: Evaluator[]
  currentId?: string
}

export function EvaluatorForm({
  initialValues,
  onSubmit,
  loading = false,
  isEdit = false,
  models = [],
  evaluators = [],
  currentId,
}: EvaluatorFormProps) {
  const [form] = Form.useForm()
  const [evaluatorType, setEvaluatorType] = useState<EvaluatorType>(
    initialValues?.evaluatorType || 'preset'
  )
  const [presetType, setPresetType] = useState<PresetType | undefined>(
    initialValues?.presetType
  )
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>(
    initialValues?.language || 'nodejs'
  )

  const handleFinish = (values: Record<string, unknown>) => {
    let config: Record<string, unknown> = {}

    if (values.evaluatorType === 'code') {
      config = {
        language: values.language || 'nodejs',
        code: values.code || '',
        timeout: values.timeout || 5000,
      }
    } else if (values.evaluatorType === 'preset') {
      const params: Record<string, unknown> = {}
      if (values.presetType === 'regex') {
        params.pattern = values.regexPattern || ''
        params.flags = values.regexFlags || ''
      } else if (values.presetType === 'json_schema') {
        try {
          params.schema = values.jsonSchema ? JSON.parse(values.jsonSchema as string) : {}
        } catch {
          params.schema = {}
        }
      } else if (values.presetType === 'similarity') {
        params.threshold = values.similarityThreshold || 0.8
        params.algorithm = values.similarityAlgorithm || 'levenshtein'
      }
      config = {
        presetType: values.presetType,
        params,
      }
    } else if (values.evaluatorType === 'llm') {
      config = {
        modelId: values.modelId,
        prompt: values.prompt || DEFAULT_EVALUATION_PROMPT,
        scoreRange: {
          min: (values.scoreRange as { min: number; max: number })?.min ?? 0,
          max: (values.scoreRange as { min: number; max: number })?.max ?? 10,
        },
        passThreshold: values.passThreshold ?? 0.6,
      }
    } else if (values.evaluatorType === 'composite') {
      config = {
        evaluatorIds: values.evaluatorIds || [],
        mode: values.mode || 'parallel',
        aggregation: values.aggregation || 'and',
        weights: values.aggregation === 'weighted_average' ? values.weights : undefined,
      }
    }

    onSubmit({
      name: values.name as string,
      description: values.description as string | undefined,
      type: values.evaluatorType as EvaluatorType,
      config,
    })
  }

  const selectedPreset = PRESET_OPTIONS.find((p) => p.value === presetType)

  // 语言切换时更新代码模板
  const handleLanguageChange = (lang: CodeLanguage) => {
    setCodeLanguage(lang)
    const currentCode = form.getFieldValue('code')
    const isDefaultTemplate =
      currentCode === CODE_TEMPLATES.nodejs || currentCode === CODE_TEMPLATES.python
    if (!currentCode || isDefaultTemplate) {
      form.setFieldValue('code', CODE_TEMPLATES[lang])
    }
  }

  // 可用于组合的评估器（排除自己，允许其他组合评估器，后端会检测循环依赖）
  const availableEvaluators = evaluators.filter(
    (e) => e.id !== currentId
  )

  // 获取初始值
  const getInitialValues = () => {
    const lang = initialValues?.language || 'nodejs'
    return {
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      evaluatorType: initialValues?.evaluatorType || 'preset',
      language: lang,
      code: initialValues?.code || CODE_TEMPLATES[lang],
      timeout: initialValues?.timeout || 5000,
      presetType: initialValues?.presetType,
      regexPattern: initialValues?.params?.pattern as string || '',
      regexFlags: initialValues?.params?.flags as string || '',
      jsonSchema: initialValues?.params?.schema ? JSON.stringify(initialValues.params.schema, null, 2) : '',
      similarityThreshold: initialValues?.params?.threshold as number || 0.8,
      similarityAlgorithm: initialValues?.params?.algorithm as string || 'levenshtein',
      // LLM
      modelId: initialValues?.modelId,
      prompt: initialValues?.prompt || DEFAULT_EVALUATION_PROMPT,
      scoreRange: initialValues?.scoreRange || { min: 0, max: 10 },
      passThreshold: initialValues?.passThreshold ?? 0.6,
      // Composite
      evaluatorIds: initialValues?.evaluatorIds || [],
      mode: initialValues?.mode || 'parallel',
      aggregation: initialValues?.aggregation || 'and',
      weights: initialValues?.weights || [],
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={getInitialValues()}
      onFinish={handleFinish}
    >
      <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入评估器名称' }]}
        >
          <Input placeholder="评估器名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="评估器描述（可选）" />
        </Form.Item>

        <Form.Item
          name="evaluatorType"
          label="类型"
          rules={[{ required: true, message: '请选择评估器类型' }]}
        >
          <Radio.Group
            onChange={(e) => setEvaluatorType(e.target.value)}
            disabled={isEdit}
          >
            <Radio.Button value="preset">预置评估器</Radio.Button>
            <Radio.Button value="code">代码评估器</Radio.Button>
            <Radio.Button value="llm">LLM 评估器</Radio.Button>
            <Radio.Button value="composite">组合评估器</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Card>

      {/* 预置评估器配置 */}
      {evaluatorType === 'preset' && (
        <Card title="预置评估器配置" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            name="presetType"
            label="评估器类型"
            rules={[{ required: true, message: '请选择预置评估器类型' }]}
          >
            <Select
              placeholder="选择预置评估器"
              onChange={(value) => setPresetType(value)}
              options={PRESET_OPTIONS.map((p) => ({
                value: p.value,
                label: (
                  <Space>
                    <span>{p.label}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.description}
                    </Text>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          {selectedPreset && !selectedPreset.hasParams && (
            <Alert
              type="info"
              message={`${selectedPreset.label}不需要额外配置`}
              showIcon
            />
          )}

          {presetType === 'regex' && (
            <>
              <Form.Item
                name="regexPattern"
                label="正则表达式"
                rules={[{ required: true, message: '请输入正则表达式' }]}
              >
                <Input placeholder="例如：\d{4}-\d{2}-\d{2}" />
              </Form.Item>
              <Form.Item name="regexFlags" label="标志位">
                <Input placeholder="例如：i" style={{ width: 120 }} />
              </Form.Item>
            </>
          )}

          {presetType === 'json_schema' && (
            <Form.Item
              name="jsonSchema"
              label="JSON Schema"
              rules={[{ required: true, message: '请输入 JSON Schema' }]}
            >
              <TextArea rows={8} style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}

          {presetType === 'similarity' && (
            <Space size="large">
              <Form.Item name="similarityThreshold" label="相似度阈值">
                <InputNumber min={0} max={1} step={0.05} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="similarityAlgorithm" label="算法">
                <Select
                  style={{ width: 200 }}
                  options={[
                    { value: 'levenshtein', label: 'Levenshtein' },
                    { value: 'cosine', label: 'Cosine' },
                    { value: 'jaccard', label: 'Jaccard' },
                  ]}
                />
              </Form.Item>
            </Space>
          )}
        </Card>
      )}

      {/* 代码评估器配置 */}
      {evaluatorType === 'code' && (
        <>
          <Card title="输入参数" size="small" style={{ marginBottom: 16 }}>
            <Table
              dataSource={INPUT_PARAMS}
              rowKey="key"
              size="small"
              pagination={false}
              columns={[
                { title: '参数名', dataIndex: 'key', width: 120, render: (text) => <Text code>{text}</Text> },
                { title: '类型', dataIndex: 'type', width: 150, render: (text) => <Text type="secondary">{text}</Text> },
                { title: '说明', dataIndex: 'description' },
              ]}
            />
          </Card>

          <Card
            title="代码"
            size="small"
            style={{ marginBottom: 16 }}
            extra={
              <Space>
                <Form.Item name="language" noStyle>
                  <Select
                    style={{ width: 120 }}
                    onChange={handleLanguageChange}
                    options={[
                      { value: 'nodejs', label: 'Node.js' },
                      { value: 'python', label: 'Python' },
                    ]}
                  />
                </Form.Item>
                <Text type="secondary">超时:</Text>
                <Space.Compact>
                  <Form.Item name="timeout" noStyle>
                    <InputNumber min={1000} max={30000} step={1000} style={{ width: 80 }} />
                  </Form.Item>
                  <Button disabled style={{ pointerEvents: 'none' }}>ms</Button>
                </Space.Compact>
              </Space>
            }
          >
            {codeLanguage === 'python' && (
              <Alert
                type="info"
                message="Python 评估器使用远程沙箱执行"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            <Form.Item name="code" rules={[{ required: true, message: '请输入评估代码' }]} style={{ marginBottom: 0 }}>
              <CodeEditor
                value={form.getFieldValue('code') || CODE_TEMPLATES[codeLanguage]}
                onChange={(val) => form.setFieldValue('code', val)}
                height={350}
                language={codeLanguage === 'python' ? 'python' : 'javascript'}
              />
            </Form.Item>
          </Card>
        </>
      )}

      {/* LLM 评估器配置 */}
      {evaluatorType === 'llm' && (
        <Card title="LLM 评估器配置" size="small" style={{ marginBottom: 16 }}>
          <Alert
            type="warning"
            message="LLM 评估器会消耗 Token"
            description="每次评估都会调用 LLM 模型，请注意成本控制"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="modelId"
            label="评估模型"
            rules={[{ required: true, message: '请选择评估模型' }]}
          >
            <Select
              placeholder="选择模型"
              options={models.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.modelId})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="prompt"
            label="评估提示词"
            rules={[{ required: true, message: '请输入评估提示词' }]}
            extra="可用变量: {{input}}, {{output}}, {{expected}}"
          >
            <CodeEditor
              value={form.getFieldValue('prompt') || DEFAULT_EVALUATION_PROMPT}
              onChange={(val) => form.setFieldValue('prompt', val)}
              height={250}
              language="json"
            />
          </Form.Item>

          <Space size="large">
            <Form.Item name={['scoreRange', 'min']} label="最小分">
              <InputNumber min={0} max={100} style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name={['scoreRange', 'max']} label="最大分">
              <InputNumber min={1} max={100} style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="passThreshold" label="通过阈值">
              <InputNumber min={0} max={1} step={0.1} style={{ width: 80 }} />
            </Form.Item>
          </Space>
        </Card>
      )}

      {/* 组合评估器配置 */}
      {evaluatorType === 'composite' && (
        <Card title="组合评估器配置" size="small" style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            message="组合评估器"
            description="将多个评估器组合，支持串行/并行执行和多种聚合方式"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="evaluatorIds"
            label="子评估器"
            rules={[{ required: true, message: '请选择至少一个子评估器' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择子评估器"
              options={availableEvaluators.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.type})`,
              }))}
            />
          </Form.Item>

          <Form.Item name="mode" label="执行模式">
            <Radio.Group>
              <Radio.Button value="parallel">并行执行</Radio.Button>
              <Radio.Button value="serial">串行执行</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="aggregation" label="聚合方式">
            <Radio.Group>
              <Radio.Button value="and">AND (全部通过)</Radio.Button>
              <Radio.Button value="or">OR (任一通过)</Radio.Button>
              <Radio.Button value="weighted_average">加权平均</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Card>
      )}

      <div style={{ textAlign: 'right' }}>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
          size="large"
        >
          {isEdit ? '保存' : '创建'}
        </Button>
      </div>
    </Form>
  )
}
