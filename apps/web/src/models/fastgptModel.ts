import mongoose from 'mongoose'
import type { SystemModelSchemaType, SystemModelItemType } from '@/types/fastgpt'

// Schema 定义（只读，与 FastGPT 保持一致）
const SystemModelSchema = new mongoose.Schema<SystemModelSchemaType>(
  {
    model: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    collection: 'system_models',
    timestamps: false,
  }
)

// 获取或创建模型（避免重复编译）
export function getSystemModelModel() {
  return (
    mongoose.models.system_models ||
    mongoose.model<SystemModelSchemaType>('system_models', SystemModelSchema)
  )
}

// 类型守卫
export function isLLMModel(model: SystemModelItemType): boolean {
  return model.type === 'llm'
}

export function isEmbeddingModel(model: SystemModelItemType): boolean {
  return model.type === 'embedding'
}

export function isTTSModel(model: SystemModelItemType): boolean {
  return model.type === 'tts'
}

export function isSTTModel(model: SystemModelItemType): boolean {
  return model.type === 'stt'
}

export function isRerankModel(model: SystemModelItemType): boolean {
  return model.type === 'rerank'
}
