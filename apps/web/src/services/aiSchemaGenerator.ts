/**
 * AI Schema 生成服务
 *
 * 通过 AI 对话生成 InputSchema 和 OutputSchema
 */

import { prisma } from '@/lib/prisma'
import { ParseMode } from '@prisma/client'
import { invokeModel, type ModelConfig } from '@/lib/modelInvoker'
import {
  assembleSchemas,
  validateAIOutput,
  type AISchemaOutput,
  type AssembleResult,
} from '@platform/shared'

// ============================================
// System Prompt
// ============================================

const SYSTEM_PROMPT = `你是配置助手。根据用户描述的测试场景，提取输入变量和输出字段的核心信息。

## 输出格式
只返回 JSON，包含 inputs 和 outputs 两个数组：

{
  "inputs": [
    { "name": "变量名", "type": "类型", "required": true/false }
  ],
  "outputs": [
    { "name": "字段名", "type": "类型", "values": ["仅enum填"], "critical": true/false }
  ]
}

## 字段说明
- name: 中文名称，简洁清晰
- type: 只能是 string / number / boolean / array / enum
- required: 输入变量是否必填
- values: 仅 enum 类型需要，列出所有可能的值
- critical: 用户强调必须准确的字段设为 true

## 规则
1. 只输出上述字段，不要添加 key、evaluator、weight 等
2. enum 类型必须提供 values 数组
3. 根据用户描述判断哪些是关键字段（critical）
4. 保持简洁，不要输出多余内容
5. 直接输出 JSON，不要添加 markdown 代码块`

// 多轮对话 System Prompt
const FOLLOWUP_SYSTEM_PROMPT = `你是配置助手。用户已经生成了一个 Schema，现在想要修改它。

## 当前 Schema
{currentSchema}

## 你的任务
根据用户的追问请求，修改现有的 Schema。可能的操作包括：
- 添加新字段
- 删除字段
- 修改字段类型或属性
- 更改字段的 critical 状态
- 修改字段名称

## 输出格式
返回修改后的完整 JSON，格式与原来相同：
{
  "inputs": [...],
  "outputs": [...]
}

## 规则
1. 保留用户没有提到要修改的字段
2. 按用户要求添加、删除或修改字段
3. 直接输出 JSON，不要添加 markdown 代码块或解释`

// 对话消息类型
export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

// ============================================
// 类型定义
// ============================================

export type GenerateSchemaInput = {
  modelId: string
  sceneName: string
  description: string
  userId: string
  teamId?: string
}

export type GenerateSchemaResult = {
  success: boolean
  aiRawOutput?: AISchemaOutput
  result?: AssembleResult
  error?: string
  tokens?: {
    input: number
    output: number
    total: number
  }
  latencyMs?: number
}

// ============================================
// 获取模型配置
// ============================================

async function getModelConfig(modelId: string): Promise<ModelConfig | null> {
  console.log('[AI Schema] Looking for model:', modelId)

  // 首先尝试从同步的 FastGPT 模型表查找（优先级更高）
  const syncedModel = await prisma.syncedModel.findUnique({
    where: { id: modelId },
  })

  if (syncedModel) {
    console.log('[AI Schema] Found FastGPT model:', syncedModel.name)
    return {
      id: syncedModel.id,
      modelId: syncedModel.modelId,
      provider: {
        type: 'openai',
        baseUrl: '',  // FastGPT 模型通过 OneHub 调用
        apiKey: '',
        headers: {},
      },
      config: {},
      pricing: {
        inputPerMillion: syncedModel.inputPrice ? syncedModel.inputPrice * 1000 : undefined,
        outputPerMillion: syncedModel.outputPrice ? syncedModel.outputPrice * 1000 : undefined,
        currency: 'CNY',
      },
      source: 'fastgpt',
    }
  }

  // 然后从本地模型表查找
  const localModel = await prisma.model.findUnique({
    where: { id: modelId },
    include: {
      provider: true,
    },
  })

  if (localModel) {
    console.log('[AI Schema] Found local model:', localModel.name, 'provider:', localModel.provider.name)
    return {
      id: localModel.id,
      modelId: localModel.modelId,
      provider: {
        type: localModel.provider.type,
        baseUrl: localModel.provider.baseUrl,
        apiKey: localModel.provider.apiKey,
        headers: (localModel.provider.headers as Record<string, string>) || {},
      },
      config: (localModel.config as Record<string, unknown>) || {},
      pricing: (localModel.pricing as ModelConfig['pricing']) || undefined,
      source: 'local',
    }
  }

  console.log('[AI Schema] Model not found:', modelId)
  return null
}

// ============================================
// 解析 AI 输出
// ============================================

function parseAIResponse(output: string): AISchemaOutput | null {
  // 尝试直接解析
  try {
    const parsed = JSON.parse(output)
    const validation = validateAIOutput(parsed)
    if (validation.valid && validation.data) {
      return validation.data
    }
  } catch {
    // 继续尝试其他方式
  }

  // 尝试从 markdown 代码块中提取
  const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      const validation = validateAIOutput(parsed)
      if (validation.valid && validation.data) {
        return validation.data
      }
    } catch {
      // 继续尝试其他方式
    }
  }

  // 尝试提取 JSON 对象
  const jsonMatch = output.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      const validation = validateAIOutput(parsed)
      if (validation.valid && validation.data) {
        return validation.data
      }
    } catch {
      // 解析失败
    }
  }

  return null
}

// ============================================
// 生成 Schema
// ============================================

/**
 * 使用 AI 生成 Schema
 */
export async function generateSchema(
  input: GenerateSchemaInput
): Promise<GenerateSchemaResult> {
  const { modelId, sceneName, description } = input

  // 1. 获取模型配置
  const modelConfig = await getModelConfig(modelId)
  if (!modelConfig) {
    return {
      success: false,
      error: `Model not found: ${modelId}`,
    }
  }

  // 2. 调用 AI
  try {
    const invokeResult = await invokeModel(modelConfig, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: description },
      ],
      temperature: 0.3,  // 使用较低温度以获得更稳定的输出
      maxTokens: 2048,
    })

    // 3. 解析 AI 输出
    const aiOutput = parseAIResponse(invokeResult.output)
    if (!aiOutput) {
      return {
        success: false,
        error: 'Failed to parse AI output. Please try again or adjust your description.',
        tokens: invokeResult.tokens,
        latencyMs: invokeResult.latencyMs,
      }
    }

    // 4. 组装 Schema
    const result = assembleSchemas(aiOutput, sceneName)

    return {
      success: true,
      aiRawOutput: aiOutput,
      result,
      tokens: invokeResult.tokens,
      latencyMs: invokeResult.latencyMs,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `AI invocation failed: ${message}`,
    }
  }
}

// ============================================
// 多轮对话：追问修改 Schema
// ============================================

export type FollowUpSchemaInput = {
  modelId: string
  sceneName: string
  followUp: string  // 用户追问内容
  currentSchema: AISchemaOutput  // 当前 Schema 状态
  conversationHistory?: ConversationMessage[]  // 历史对话（可选）
  userId: string
  teamId?: string
}

/**
 * 处理追问请求，修改现有 Schema
 */
export async function followUpSchema(
  input: FollowUpSchemaInput
): Promise<GenerateSchemaResult> {
  const { modelId, sceneName, followUp, currentSchema, conversationHistory } = input

  // 1. 获取模型配置
  const modelConfig = await getModelConfig(modelId)
  if (!modelConfig) {
    return {
      success: false,
      error: `Model not found: ${modelId}`,
    }
  }

  // 2. 构建对话消息
  const systemPrompt = FOLLOWUP_SYSTEM_PROMPT.replace(
    '{currentSchema}',
    JSON.stringify(currentSchema, null, 2)
  )

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // 添加历史对话
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }
  }

  // 添加当前追问
  messages.push({ role: 'user', content: followUp })

  // 3. 调用 AI
  try {
    const invokeResult = await invokeModel(modelConfig, {
      messages,
      temperature: 0.3,
      maxTokens: 2048,
    })

    // 4. 解析 AI 输出
    const aiOutput = parseAIResponse(invokeResult.output)
    if (!aiOutput) {
      return {
        success: false,
        error: 'Failed to parse AI output. Please try again.',
        tokens: invokeResult.tokens,
        latencyMs: invokeResult.latencyMs,
      }
    }

    // 5. 组装更新后的 Schema
    const result = assembleSchemas(aiOutput, sceneName)

    return {
      success: true,
      aiRawOutput: aiOutput,
      result,
      tokens: invokeResult.tokens,
      latencyMs: invokeResult.latencyMs,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `AI invocation failed: ${message}`,
    }
  }
}

// ============================================
// 保存 Schema
// ============================================

export type SaveSchemaInput = {
  inputSchema: {
    name: string
    description?: string
    variables: unknown[]
  }
  outputSchema: {
    name: string
    description?: string
    fields: unknown[]
    parseMode: string
    parseConfig: Record<string, unknown>
    aggregation: {
      mode: string
      passThreshold?: number
    }
  }
  userId: string
  teamId?: string
}

export type SaveSchemaResult = {
  success: boolean
  evaluationSchemaId?: string
  inputSchemaId?: string
  outputSchemaId?: string
  error?: string
}

/**
 * 保存生成的 Schema 到数据库
 * 创建 EvaluationSchema 并关联 InputSchema 和 OutputSchema
 */
export async function saveGeneratedSchemas(
  input: SaveSchemaInput
): Promise<SaveSchemaResult> {
  const { inputSchema, outputSchema, userId, teamId } = input

  try {
    // 使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 先创建 EvaluationSchema
      const evaluationSchema = await tx.evaluationSchema.create({
        data: {
          name: inputSchema.name.replace(' - 输入变量', '').replace('输入变量', ''),
          description: inputSchema.description,
          createdById: userId,
          teamId: teamId || null,
        },
      })

      // 创建 InputSchema 并关联 EvaluationSchema
      const createdInput = await tx.inputSchema.create({
        data: {
          name: inputSchema.name,
          description: inputSchema.description,
          variables: inputSchema.variables as object,
          createdById: userId,
          teamId: teamId || null,
          evaluationSchemaId: evaluationSchema.id,
        },
      })

      // 创建 OutputSchema 并关联 EvaluationSchema
      const createdOutput = await tx.outputSchema.create({
        data: {
          name: outputSchema.name,
          description: outputSchema.description,
          fields: outputSchema.fields as object,
          parseMode: outputSchema.parseMode as ParseMode,
          parseConfig: outputSchema.parseConfig as object,
          aggregation: outputSchema.aggregation as object,
          createdById: userId,
          teamId: teamId || null,
          evaluationSchemaId: evaluationSchema.id,
        },
      })

      return {
        evaluationSchemaId: evaluationSchema.id,
        inputSchemaId: createdInput.id,
        outputSchemaId: createdOutput.id,
      }
    })

    return {
      success: true,
      evaluationSchemaId: result.evaluationSchemaId,
      inputSchemaId: result.inputSchemaId,
      outputSchemaId: result.outputSchemaId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to save schemas: ${message}`,
    }
  }
}

// ============================================
// 导出
// ============================================

export default {
  generateSchema,
  followUpSchema,
  saveGeneratedSchemas,
}
