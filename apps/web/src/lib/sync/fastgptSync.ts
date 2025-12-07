/**
 * FastGPT 模型同步 - 仅服务端使用
 * 将 FastGPT 的模型同步到本地 Provider + Model 表，与本地模型统一管理
 */

// 仅在服务端运行
if (typeof window !== 'undefined') {
  throw new Error('fastgptSync.ts can only be used on the server side')
}

import { prisma } from '@/lib/prisma'
import { connectMongo } from '@/lib/mongodb'
import { getSystemModelModel } from '@/models/fastgptModel'
import { isFastGPTEnabled } from '@/lib/mongodbCompat'
import { encryptApiKey } from '@/lib/encryption'
import type { SystemModelSchemaType } from '@/types/fastgpt'
import type { Prisma } from '@prisma/client'

export type SyncResult = {
  success: boolean
  synced: number
  providersCreated: number
  providersUpdated: number
  modelsCreated: number
  modelsUpdated: number
  errors: string[]
  syncedAt: Date
}

// FastGPT OneAPI 的默认配置
const FASTGPT_ONEAPI_URL = process.env.FASTGPT_ONEAPI_URL || 'http://localhost:3001/v1'
const FASTGPT_ONEAPI_KEY = process.env.FASTGPT_ONEAPI_KEY || ''

/**
 * 安全转换为数字，空字符串或无效值返回 null
 */
function toFloatOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(num) ? null : num
}

/**
 * 安全转换为整数，空字符串或无效值返回 null
 */
function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = typeof value === 'number' ? Math.floor(value) : parseInt(String(value), 10)
  return isNaN(num) ? null : num
}

/**
 * 将 FastGPT 模型转换为 Model 表的 config 和 pricing
 */
function transformModelData(doc: SystemModelSchemaType): {
  name: string
  modelId: string
  config: Prisma.InputJsonValue
  pricing: Prisma.InputJsonValue
  isActive: boolean
} {
  const metadata = doc.metadata

  // 构建 config（模型配置）
  const config = {
    type: metadata.type,
    maxContext: toIntOrNull('maxContext' in metadata ? metadata.maxContext : null),
    maxResponse: toIntOrNull('maxResponse' in metadata ? metadata.maxResponse : null),
    vision: 'vision' in metadata ? Boolean(metadata.vision) : false,
    toolChoice: 'toolChoice' in metadata ? Boolean(metadata.toolChoice) : false,
    functionCall: 'functionCall' in metadata ? Boolean(metadata.functionCall) : false,
    reasoning: 'reasoning' in metadata ? Boolean(metadata.reasoning) : false,
    maxToken: toIntOrNull('maxToken' in metadata ? metadata.maxToken : null),
    defaultToken: toIntOrNull('defaultToken' in metadata ? metadata.defaultToken : null),
    voices: 'voices' in metadata ? metadata.voices : null,
    // 保存原始配置用于调试
    _syncedFrom: 'fastgpt',
    _syncedAt: new Date().toISOString(),
  }

  // 构建 pricing（定价信息）- 转换为每百万 token 的价格
  const inputPrice = toFloatOrNull(metadata.inputPrice)
  const outputPrice = toFloatOrNull(metadata.outputPrice)
  const pricing = {
    inputPerMillion: inputPrice ? inputPrice * 1000 : null,
    outputPerMillion: outputPrice ? outputPrice * 1000 : null,
    currency: 'CNY',
  }

  return {
    name: metadata.name || doc.model,
    modelId: doc.model,
    config: config as Prisma.InputJsonValue,
    pricing: pricing as Prisma.InputJsonValue,
    isActive: metadata.isActive ?? true,
  }
}

/**
 * 同步 FastGPT 模型到本地 Provider + Model 表
 */
export async function syncFastGPTModels(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    synced: 0,
    providersCreated: 0,
    providersUpdated: 0,
    modelsCreated: 0,
    modelsUpdated: 0,
    errors: [],
    syncedAt: new Date(),
  }

  if (!isFastGPTEnabled()) {
    result.errors.push('FastGPT 未启用或未配置 MongoDB URI')
    return result
  }

  if (!FASTGPT_ONEAPI_KEY) {
    result.errors.push('请配置 FASTGPT_ONEAPI_KEY 环境变量')
    return result
  }

  try {
    // 连接 MongoDB 并获取模型
    await connectMongo()
    const Model = getSystemModelModel()
    const docs = await Model.find({}).lean<SystemModelSchemaType[]>()

    console.log(`[Sync] 从 FastGPT 获取到 ${docs.length} 个模型`)

    // 按 provider 分组
    const modelsByProvider = new Map<string, SystemModelSchemaType[]>()
    for (const doc of docs) {
      const provider = doc.metadata.provider || 'Unknown'
      if (!modelsByProvider.has(provider)) {
        modelsByProvider.set(provider, [])
      }
      modelsByProvider.get(provider)!.push(doc)
    }

    console.log(`[Sync] 共 ${modelsByProvider.size} 个供应商`)

    // 遍历每个供应商
    for (const [providerName, models] of modelsByProvider) {
      try {
        // 查找或创建供应商（使用名称 + FastGPT 标记来唯一标识）
        const providerKey = `FastGPT-${providerName}`
        let provider = await prisma.provider.findFirst({
          where: { name: providerKey },
        })

        // 每次同步都重新加密 API Key（确保使用最新的 key）
        const encryptedApiKey = encryptApiKey(FASTGPT_ONEAPI_KEY)

        if (!provider) {
          // 创建新供应商
          provider = await prisma.provider.create({
            data: {
              name: providerKey,
              type: 'CUSTOM',
              baseUrl: FASTGPT_ONEAPI_URL,
              apiKey: encryptedApiKey,
              headers: { 'X-Synced-From': 'FastGPT', 'X-Original-Provider': providerName },
              isActive: true,
            },
          })
          result.providersCreated++
        } else {
          // 更新供应商（确保 API Key 和 URL 是最新的）
          await prisma.provider.update({
            where: { id: provider.id },
            data: {
              baseUrl: FASTGPT_ONEAPI_URL,
              apiKey: encryptedApiKey,
            },
          })
          result.providersUpdated++
        }

        // 获取该供应商下现有的模型
        const existingModels = await prisma.model.findMany({
          where: { providerId: provider.id },
          select: { id: true, modelId: true },
        })
        const existingModelIds = new Map(existingModels.map(m => [m.modelId, m.id]))

        // 同步每个模型
        for (const doc of models) {
          try {
            // 跳过无效模型（没有 model ID 或 name）
            if (!doc.model || !doc.metadata?.name) {
              result.errors.push(`跳过无效模型: model=${doc.model}, name=${doc.metadata?.name}`)
              continue
            }

            const modelData = transformModelData(doc)
            const existingId = existingModelIds.get(doc.model)

            if (existingId) {
              // 更新现有模型
              await prisma.model.update({
                where: { id: existingId },
                data: modelData,
              })
              result.modelsUpdated++
            } else {
              // 创建新模型
              await prisma.model.create({
                data: {
                  ...modelData,
                  providerId: provider.id,
                },
              })
              result.modelsCreated++
            }
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err)
            result.errors.push(`同步模型 ${doc.model} 失败: ${error}`)
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        result.errors.push(`同步供应商 ${providerName} 失败: ${error}`)
      }
    }

    result.synced = result.modelsCreated + result.modelsUpdated
    result.success = result.errors.length === 0

    console.log(`[Sync] 同步完成: 供应商 ${result.providersCreated} 创建 / ${result.providersUpdated} 更新, 模型 ${result.modelsCreated} 创建 / ${result.modelsUpdated} 更新`)

    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    result.errors.push(`同步失败: ${error}`)
    console.error('[Sync] 同步失败:', err)
    return result
  }
}
