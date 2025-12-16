/**
 * GOI 表单预填 Store
 *
 * 用于存储待预填的表单数据，支持：
 * 1. AccessHandler 设置预填数据
 * 2. 表单组件通过 useGoiFormPrefill 消费数据
 */

import { create } from 'zustand'

/**
 * 待预填的表单数据
 */
export type GoiFormData = {
  /** 表单 ID，如 'prompt-form', 'task-form' */
  formId: string
  /** 资源类型 */
  resourceType: string
  /** 表单字段数据 */
  data: Record<string, unknown>
  /** 是否自动提交（默认 false，让用户确认） */
  autoSubmit?: boolean
  /** 创建时间戳，用于超时清理 */
  timestamp: number
}

type GoiFormStore = {
  /** 待处理的表单预填数据 */
  pendingForm: GoiFormData | null
  /** 设置待预填数据 */
  setPendingForm: (data: Omit<GoiFormData, 'timestamp'>) => void
  /** 清除待预填数据 */
  clearPendingForm: () => void
  /** 检查并获取指定表单的数据 */
  consumeFormData: (formId: string) => GoiFormData | null
}

/** 预填数据过期时间（5分钟） */
const PREFILL_EXPIRE_MS = 5 * 60 * 1000

export const useGoiFormStore = create<GoiFormStore>((set, get) => ({
  pendingForm: null,

  setPendingForm: (data) => {
    set({
      pendingForm: {
        ...data,
        timestamp: Date.now(),
      },
    })
  },

  clearPendingForm: () => {
    set({ pendingForm: null })
  },

  consumeFormData: (formId) => {
    const { pendingForm, clearPendingForm } = get()

    if (!pendingForm) return null

    // 检查是否匹配目标表单
    if (pendingForm.formId !== formId) return null

    // 检查是否过期
    if (Date.now() - pendingForm.timestamp > PREFILL_EXPIRE_MS) {
      clearPendingForm()
      return null
    }

    // 消费数据并清除
    clearPendingForm()
    return pendingForm
  },
}))

/**
 * 资源类型到表单 ID 的映射
 */
export const RESOURCE_FORM_ID_MAP: Record<string, string> = {
  prompt: 'prompt-form',
  dataset: 'dataset-form',
  task: 'task-form',
  evaluator: 'evaluator-form',
  model: 'model-form',
  provider: 'provider-form',
  scheduled_task: 'scheduled-task-form',
  alert_rule: 'alert-rule-form',
  input_schema: 'input-schema-form',
  output_schema: 'output-schema-form',
}

/**
 * 获取资源类型对应的表单 ID
 */
export function getFormIdForResource(resourceType: string): string {
  return RESOURCE_FORM_ID_MAP[resourceType] || `${resourceType}-form`
}
