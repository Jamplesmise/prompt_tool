// Schema 预置模板数据
import type { SchemaTemplate } from '../types/schema'

export const schemaTemplates: SchemaTemplate[] = [
  // ============================================
  // 1. 智能客服意图识别
  // ============================================
  {
    id: 'tpl-customer-service-intent',
    name: '智能客服意图识别',
    category: 'customer_service',
    description: '识别用户咨询意图、提取关键信息，适用于智能客服、工单分类等场景',
    icon: 'CustomerServiceOutlined',
    inputSchema: {
      name: '客服对话输入',
      description: '智能客服场景的输入变量定义',
      variables: [
        {
          name: '当前设备',
          key: 'current_device',
          description: '用户当前使用的设备型号',
          type: 'string',
          required: true,
        },
        {
          name: '用户问题',
          key: 'user_question',
          description: '用户描述的问题内容',
          type: 'string',
          required: true,
        },
        {
          name: '所有设备',
          key: 'all_devices',
          description: '用户账号下的所有设备列表',
          type: 'array',
          itemType: 'string',
          required: false,
        },
        {
          name: '对话历史',
          key: 'chat_history',
          description: '之前的对话记录',
          type: 'array',
          itemType: 'object',
          properties: [
            { key: 'role', type: 'string' },
            { key: 'content', type: 'string' },
          ],
          required: false,
        },
      ],
    },
    outputSchema: {
      name: '客服意图输出',
      description: '智能客服场景的输出字段定义',
      fields: [
        {
          name: '思考过程',
          key: 'thinking',
          description: '模型的分析思考过程',
          type: 'string',
          required: false,
          evaluation: {
            weight: 0.1,
            isCritical: false,
          },
        },
        {
          name: '问题分类',
          key: 'problem_type',
          description: '问题的主要分类',
          type: 'enum',
          required: true,
          enumValues: ['bluetooth', 'wifi', 'battery', 'screen', 'system', 'account', 'other'],
          evaluation: {
            weight: 0.3,
            isCritical: true,
            expectedField: 'expected_type',
          },
        },
        {
          name: '是否需要换机',
          key: 'device_change',
          description: '是否需要切换到其他设备处理',
          type: 'boolean',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '目标设备',
          key: 'target_device',
          description: '如需换机，目标设备型号',
          type: 'string',
          required: false,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '置信度',
          key: 'confidence',
          description: '分类结果的置信度 0-1',
          type: 'number',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
      ],
      parseMode: 'JSON',
      aggregation: {
        mode: 'critical_first',
        passThreshold: 0.8,
      },
    },
  },

  // ============================================
  // 2. 文档摘要生成
  // ============================================
  {
    id: 'tpl-document-summary',
    name: '文档摘要生成',
    category: 'document_analysis',
    description: '生成文档摘要、提取关键词，适用于文档分析、内容理解等场景',
    icon: 'FileTextOutlined',
    inputSchema: {
      name: '文档摘要输入',
      description: '文档摘要生成的输入变量定义',
      variables: [
        {
          name: '文档内容',
          key: 'document_content',
          description: '需要摘要的文档全文',
          type: 'string',
          required: true,
        },
        {
          name: '摘要长度',
          key: 'max_length',
          description: '期望的摘要最大字数',
          type: 'number',
          required: false,
          defaultValue: 200,
        },
        {
          name: '文档类型',
          key: 'document_type',
          description: '文档的类型（如：新闻、论文、报告等）',
          type: 'string',
          required: false,
        },
      ],
    },
    outputSchema: {
      name: '文档摘要输出',
      description: '文档摘要生成的输出字段定义',
      fields: [
        {
          name: '摘要',
          key: 'summary',
          description: '生成的文档摘要',
          type: 'string',
          required: true,
          evaluation: {
            weight: 0.4,
            isCritical: true,
          },
        },
        {
          name: '关键词',
          key: 'keywords',
          description: '提取的关键词列表',
          type: 'array',
          itemType: 'string',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '主题',
          key: 'topic',
          description: '文档的主要主题',
          type: 'string',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '字数统计',
          key: 'word_count',
          description: '摘要的实际字数',
          type: 'number',
          required: false,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
      ],
      parseMode: 'JSON',
      aggregation: {
        mode: 'weighted_average',
        passThreshold: 0.7,
      },
    },
  },

  // ============================================
  // 3. 情感分析
  // ============================================
  {
    id: 'tpl-sentiment-analysis',
    name: '情感分析',
    category: 'text_analysis',
    description: '分析文本的情感倾向和强度，适用于评论分析、舆情监控等场景',
    icon: 'SmileOutlined',
    inputSchema: {
      name: '情感分析输入',
      description: '情感分析的输入变量定义',
      variables: [
        {
          name: '评论内容',
          key: 'review_content',
          description: '需要分析的评论或文本内容',
          type: 'string',
          required: true,
        },
        {
          name: '产品名称',
          key: 'product_name',
          description: '评论针对的产品或服务名称',
          type: 'string',
          required: false,
        },
      ],
    },
    outputSchema: {
      name: '情感分析输出',
      description: '情感分析的输出字段定义',
      fields: [
        {
          name: '情感倾向',
          key: 'sentiment',
          description: '整体情感倾向',
          type: 'enum',
          required: true,
          enumValues: ['positive', 'negative', 'neutral', 'mixed'],
          evaluation: {
            weight: 0.4,
            isCritical: true,
            expectedField: 'expected_sentiment',
          },
        },
        {
          name: '情感强度',
          key: 'intensity',
          description: '情感强度 0-1',
          type: 'number',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '置信度',
          key: 'confidence',
          description: '分析结果的置信度 0-1',
          type: 'number',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '关键情感词',
          key: 'emotion_words',
          description: '文本中的关键情感词汇',
          type: 'array',
          itemType: 'string',
          required: false,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
      ],
      parseMode: 'JSON',
      aggregation: {
        mode: 'critical_first',
        passThreshold: 0.8,
      },
    },
  },

  // ============================================
  // 4. 代码审查
  // ============================================
  {
    id: 'tpl-code-review',
    name: '代码审查',
    category: 'code_quality',
    description: '分析代码质量、发现潜在问题，适用于代码审查、质量检测等场景',
    icon: 'CodeOutlined',
    inputSchema: {
      name: '代码审查输入',
      description: '代码审查的输入变量定义',
      variables: [
        {
          name: '代码片段',
          key: 'code_snippet',
          description: '需要审查的代码内容',
          type: 'string',
          required: true,
        },
        {
          name: '编程语言',
          key: 'language',
          description: '代码使用的编程语言',
          type: 'string',
          required: true,
        },
        {
          name: '审查重点',
          key: 'focus_areas',
          description: '需要重点关注的方面',
          type: 'array',
          itemType: 'string',
          required: false,
        },
      ],
    },
    outputSchema: {
      name: '代码审查输出',
      description: '代码审查的输出字段定义',
      fields: [
        {
          name: '问题列表',
          key: 'issues',
          description: '发现的代码问题',
          type: 'array',
          itemType: 'object',
          properties: [
            { key: 'type', type: 'string' },
            { key: 'severity', type: 'string' },
            { key: 'line', type: 'number' },
            { key: 'description', type: 'string' },
          ],
          required: true,
          evaluation: {
            weight: 0.3,
            isCritical: true,
          },
        },
        {
          name: '改进建议',
          key: 'suggestions',
          description: '代码改进建议',
          type: 'array',
          itemType: 'string',
          required: true,
          evaluation: {
            weight: 0.3,
            isCritical: false,
          },
        },
        {
          name: '代码评分',
          key: 'score',
          description: '代码质量评分 0-100',
          type: 'number',
          required: true,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
        {
          name: '安全风险',
          key: 'security_risks',
          description: '潜在的安全风险',
          type: 'array',
          itemType: 'string',
          required: false,
          evaluation: {
            weight: 0.2,
            isCritical: false,
          },
        },
      ],
      parseMode: 'JSON',
      aggregation: {
        mode: 'weighted_average',
        passThreshold: 0.7,
      },
    },
  },

  // ============================================
  // 5. 实体抽取
  // ============================================
  {
    id: 'tpl-entity-extraction',
    name: '实体抽取',
    category: 'nlp',
    description: '从文本中提取命名实体（人名、地名、组织等），适用于信息抽取、知识图谱等场景',
    icon: 'TagsOutlined',
    inputSchema: {
      name: '实体抽取输入',
      description: '实体抽取的输入变量定义',
      variables: [
        {
          name: '文本内容',
          key: 'text_content',
          description: '需要抽取实体的文本',
          type: 'string',
          required: true,
        },
        {
          name: '实体类型',
          key: 'entity_types',
          description: '需要抽取的实体类型列表',
          type: 'array',
          itemType: 'string',
          required: false,
        },
      ],
    },
    outputSchema: {
      name: '实体抽取输出',
      description: '实体抽取的输出字段定义',
      fields: [
        {
          name: '实体列表',
          key: 'entities',
          description: '抽取出的实体',
          type: 'array',
          itemType: 'object',
          properties: [
            { key: 'text', type: 'string' },
            { key: 'type', type: 'string' },
            { key: 'start', type: 'number' },
            { key: 'end', type: 'number' },
          ],
          required: true,
          evaluation: {
            weight: 0.5,
            isCritical: true,
          },
        },
        {
          name: '人名',
          key: 'persons',
          description: '抽取出的人名列表',
          type: 'array',
          itemType: 'string',
          required: false,
          evaluation: {
            weight: 0.15,
            isCritical: false,
          },
        },
        {
          name: '地名',
          key: 'locations',
          description: '抽取出的地名列表',
          type: 'array',
          itemType: 'string',
          required: false,
          evaluation: {
            weight: 0.15,
            isCritical: false,
          },
        },
        {
          name: '组织',
          key: 'organizations',
          description: '抽取出的组织名称列表',
          type: 'array',
          itemType: 'string',
          required: false,
          evaluation: {
            weight: 0.1,
            isCritical: false,
          },
        },
        {
          name: '时间',
          key: 'dates',
          description: '抽取出的时间表达式',
          type: 'array',
          itemType: 'string',
          required: false,
          evaluation: {
            weight: 0.1,
            isCritical: false,
          },
        },
      ],
      parseMode: 'JSON',
      aggregation: {
        mode: 'critical_first',
        passThreshold: 0.8,
      },
    },
  },
]

// 模板分类映射
export const templateCategoryLabels: Record<string, string> = {
  customer_service: '客服场景',
  document_analysis: '文档分析',
  text_analysis: '文本分析',
  code_quality: '代码质量',
  nlp: 'NLP',
  general: '通用',
}

// 获取模板列表（简化版）
export function getTemplateList(): Array<{
  id: string
  name: string
  category: string
  description: string
  icon?: string
  inputVariableCount: number
  outputFieldCount: number
}> {
  return schemaTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    icon: t.icon,
    inputVariableCount: t.inputSchema.variables.length,
    outputFieldCount: t.outputSchema.fields.length,
  }))
}

// 按分类获取模板
export function getTemplatesByCategory(): Record<string, typeof schemaTemplates> {
  const grouped: Record<string, typeof schemaTemplates> = {}
  for (const template of schemaTemplates) {
    if (!grouped[template.category]) {
      grouped[template.category] = []
    }
    grouped[template.category].push(template)
  }
  return grouped
}

// 获取单个模板
export function getTemplateById(id: string): SchemaTemplate | undefined {
  return schemaTemplates.find((t) => t.id === id)
}
