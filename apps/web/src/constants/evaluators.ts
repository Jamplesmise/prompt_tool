import type { EvaluatorTypeKey } from '@/components/evaluator'
import type { EvaluatorDetail } from '@/components/evaluator'

// 评估器类型配置（从 EvaluatorTypeTag 组件中导出）
export { EVALUATOR_TYPE_CONFIG } from '@/components/evaluator'

// 预置评估器列表
export const PRESET_EVALUATORS: EvaluatorDetail[] = [
  {
    id: 'exact_match',
    type: 'exact_match',
    name: '精确匹配',
    description: '判断模型输出是否与期望值完全一致，区分大小写。',
    useCases: ['分类任务（输出固定类别）', '是/否判断', '选项选择'],
    configOptions: [
      { key: 'ignoreCase', label: '忽略大小写', defaultValue: 'false' },
      { key: 'trim', label: '去除首尾空格', defaultValue: 'true' },
    ],
    example: {
      input: '这段话的情感是正面还是负面？',
      expected: '正面',
      output: '正面',
      result: true,
    },
  },
  {
    id: 'contains',
    type: 'contains',
    name: '包含匹配',
    description: '判断模型输出是否包含期望的关键内容。',
    useCases: ['关键词检测', '要点提取', '内容包含验证'],
    configOptions: [
      { key: 'ignoreCase', label: '忽略大小写', defaultValue: 'true' },
      { key: 'all', label: '必须包含所有关键词', defaultValue: 'false' },
    ],
    example: {
      input: '总结这篇文章的主题',
      expected: '人工智能',
      output: '这篇文章主要讨论了人工智能在医疗领域的应用。',
      result: true,
    },
  },
  {
    id: 'regex',
    type: 'regex',
    name: '正则匹配',
    description: '使用正则表达式验证模型输出的格式或内容。',
    useCases: ['格式校验', '数据提取', '模式匹配'],
    configOptions: [
      { key: 'flags', label: '正则标志', defaultValue: 'i' },
    ],
    example: {
      input: '提取文本中的邮箱地址',
      expected: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
      output: 'example@test.com',
      result: true,
    },
  },
  {
    id: 'json_schema',
    type: 'json_schema',
    name: 'JSON Schema',
    description: '验证模型输出是否符合指定的 JSON Schema 规范。',
    useCases: ['结构化输出验证', 'API 响应格式检查', '数据类型校验'],
    configOptions: [
      { key: 'strict', label: '严格模式', defaultValue: 'true' },
    ],
    example: {
      input: '返回用户信息的 JSON',
      expected: '{"type":"object","properties":{"name":{"type":"string"}}}',
      output: '{"name":"张三","age":25}',
      result: true,
    },
  },
  {
    id: 'similarity',
    type: 'similarity',
    name: '相似度匹配',
    description: '计算模型输出与期望值的语义相似度，判断是否达到阈值。',
    useCases: ['文本生成评估', '翻译质量', '摘要评估'],
    configOptions: [
      { key: 'threshold', label: '相似度阈值', defaultValue: '0.8' },
      { key: 'algorithm', label: '算法', defaultValue: 'cosine' },
    ],
    example: {
      input: '翻译：Hello World',
      expected: '你好，世界',
      output: '你好世界',
      result: true,
    },
  },
  {
    id: 'llm_judge',
    type: 'llm_judge',
    name: 'LLM 评估',
    description: '使用大语言模型进行智能评估，支持复杂的评判标准。',
    useCases: ['主观评估', '创意写作评分', '对话质量评估'],
    configOptions: [
      { key: 'model', label: '评估模型', defaultValue: 'gpt-4' },
      { key: 'prompt', label: '评估提示词', defaultValue: '自定义' },
    ],
    example: {
      input: '写一首关于春天的诗',
      expected: '诗歌应该包含春天的意象，有一定的文学性',
      output: '春风拂面花开早，燕子归来柳色新。',
      result: true,
    },
  },
]

// 预置评估器 ID 列表
export const PRESET_EVALUATOR_IDS = PRESET_EVALUATORS.map((e) => e.id)

// 根据 ID 获取预置评估器
export function getPresetEvaluatorById(id: string): EvaluatorDetail | undefined {
  return PRESET_EVALUATORS.find((e) => e.id === id)
}

// 根据类型获取预置评估器
export function getPresetEvaluatorsByType(type: EvaluatorTypeKey): EvaluatorDetail[] {
  return PRESET_EVALUATORS.filter((e) => e.type === type)
}
