/**
 * FastGPT 模型服务
 * 注意：此文件不能在顶层导入 mongoose 相关模块，否则会导致构建时连接 MongoDB
 */
import { isFastGPTEnabled } from '@/lib/mongodbCompat'
import { redis, REDIS_KEY_PREFIX } from '@/lib/redis'
import type {
  SystemModelSchemaType,
  UnifiedModelType,
  ModelTypeEnum,
} from '@/types/fastgpt'

// 缓存配置
const CACHE_KEY = `${REDIS_KEY_PREFIX}fastgpt:models`
const CACHE_TTL = 300 // 5 分钟

/**
 * 将 FastGPT 模型转换为统一格式
 */
function transformToUnifiedModel(doc: SystemModelSchemaType): UnifiedModelType {
  const metadata = doc.metadata

  return {
    id: doc.model,
    name: metadata.name,
    provider: metadata.provider,
    type: metadata.type as ModelTypeEnum,
    isActive: metadata.isActive ?? true,
    isCustom: metadata.isCustom ?? false,
    source: 'fastgpt',

    // 定价
    inputPrice: metadata.inputPrice,
    outputPrice: metadata.outputPrice,
    charsPointsPrice: metadata.charsPointsPrice,

    // LLM 特有字段
    maxContext: 'maxContext' in metadata ? metadata.maxContext : undefined,
    maxResponse: 'maxResponse' in metadata ? metadata.maxResponse : undefined,
    vision: 'vision' in metadata ? metadata.vision : undefined,
    toolChoice: 'toolChoice' in metadata ? metadata.toolChoice : undefined,
    functionCall: 'functionCall' in metadata ? metadata.functionCall : undefined,
    reasoning: 'reasoning' in metadata ? metadata.reasoning : undefined,

    // Embedding 特有字段
    maxToken: 'maxToken' in metadata ? metadata.maxToken : undefined,
    defaultToken: 'defaultToken' in metadata ? metadata.defaultToken : undefined,

    // TTS 特有字段
    voices: 'voices' in metadata ? metadata.voices : undefined,

    // 原始数据
    raw: metadata,
  }
}

/**
 * 从缓存获取模型列表
 */
async function getFromCache(): Promise<UnifiedModelType[] | null> {
  try {
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      return JSON.parse(cached) as UnifiedModelType[]
    }
    return null
  } catch (error) {
    console.error('[FastGPT] Cache read error:', error)
    return null
  }
}

/**
 * 设置缓存
 */
async function setCache(models: UnifiedModelType[]): Promise<void> {
  try {
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(models))
  } catch (error) {
    console.error('[FastGPT] Cache write error:', error)
  }
}

/**
 * 清除缓存
 */
export async function clearFastGPTCache(): Promise<void> {
  try {
    await redis.del(CACHE_KEY)
    console.log('[FastGPT] Cache cleared')
  } catch (error) {
    console.error('[FastGPT] Cache clear error:', error)
  }
}

/**
 * 获取所有 FastGPT 模型
 */
export async function getAllFastGPTModels(
  skipCache = false
): Promise<UnifiedModelType[]> {
  if (!isFastGPTEnabled()) {
    return []
  }

  // 尝试从缓存获取
  if (!skipCache) {
    const cached = await getFromCache()
    if (cached) {
      return cached
    }
  }

  try {
    // 动态导入，避免构建时执行
    const { connectToFastGPTMongo } = await import('@/lib/mongodbCompat')
    const { getSystemModelModel } = await import('@/models/fastgptModel')

    await connectToFastGPTMongo()
    const Model = getSystemModelModel()
    const docs = await Model.find({}).lean<SystemModelSchemaType[]>()

    const models = docs.map(transformToUnifiedModel)

    // 写入缓存
    await setCache(models)

    return models
  } catch (error) {
    console.error('[FastGPT] Failed to fetch models:', error)
    return []
  }
}

/**
 * 获取激活的 FastGPT 模型
 */
export async function getActiveFastGPTModels(): Promise<UnifiedModelType[]> {
  const models = await getAllFastGPTModels()
  return models.filter((m) => m.isActive)
}

/**
 * 按类型获取 FastGPT 模型
 */
export async function getFastGPTModelsByType(
  type: ModelTypeEnum
): Promise<UnifiedModelType[]> {
  const models = await getAllFastGPTModels()
  return models.filter((m) => m.type === type)
}

/**
 * 获取单个 FastGPT 模型
 */
export async function getFastGPTModelByName(
  modelName: string
): Promise<UnifiedModelType | null> {
  if (!isFastGPTEnabled()) {
    return null
  }

  try {
    // 动态导入，避免构建时执行
    const { connectToFastGPTMongo } = await import('@/lib/mongodbCompat')
    const { getSystemModelModel } = await import('@/models/fastgptModel')

    await connectToFastGPTMongo()
    const Model = getSystemModelModel()
    const doc = await Model.findOne({ model: modelName }).lean<SystemModelSchemaType>()

    if (!doc) {
      return null
    }

    return transformToUnifiedModel(doc)
  } catch (error) {
    console.error('[FastGPT] Failed to fetch model:', error)
    return null
  }
}

/**
 * 获取 FastGPT 模型统计
 */
export async function getFastGPTModelStats(): Promise<{
  total: number
  active: number
  byType: Record<string, number>
}> {
  const models = await getAllFastGPTModels()

  const byType: Record<string, number> = {}
  let active = 0

  for (const model of models) {
    if (model.isActive) active++
    byType[model.type] = (byType[model.type] || 0) + 1
  }

  return {
    total: models.length,
    active,
    byType,
  }
}
