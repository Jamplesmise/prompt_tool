/**
 * GOI 表单预填 Hook
 *
 * 用于表单组件自动接收 GOI 预填数据
 *
 * 使用方式：
 * ```typescript
 * const [form] = Form.useForm()
 *
 * useGoiFormPrefill(form, 'prompt-form', {
 *   onPrefill: (data) => console.log('预填数据:', data),
 *   autoSubmit: false,
 * })
 * ```
 */

import { useEffect, useRef } from 'react'
import type { FormInstance } from 'antd'
import { useGoiFormStore } from '@/lib/goi/formStore'

export type GoiFormPrefillOptions = {
  /** 预填完成后的回调 */
  onPrefill?: (data: Record<string, unknown>) => void
  /** 是否自动提交（默认 false） */
  autoSubmit?: boolean
  /** 字段映射（源字段名 -> 表单字段名） */
  fieldMapping?: Record<string, string>
  /** 字段转换函数 */
  fieldTransform?: Record<string, (value: unknown) => unknown>
}

/**
 * GOI 表单预填 Hook
 *
 * @param form Ant Design 表单实例
 * @param formId 表单 ID，需与 GOI 传递的 formId 匹配
 * @param options 配置选项
 */
export function useGoiFormPrefill(
  form: FormInstance,
  formId: string,
  options?: GoiFormPrefillOptions
) {
  const { pendingForm, consumeFormData } = useGoiFormStore()
  const processedRef = useRef(false)

  // 监听 CustomEvent
  useEffect(() => {
    const handler = (e: CustomEvent<{
      formId: string
      resourceType: string
      data: Record<string, unknown>
      autoSubmit?: boolean
    }>) => {
      if (e.detail.formId !== formId) return

      const { data, autoSubmit: eventAutoSubmit } = e.detail
      applyPrefill(data, eventAutoSubmit)
    }

    window.addEventListener('goi:prefillForm', handler as EventListener)
    return () => window.removeEventListener('goi:prefillForm', handler as EventListener)
  }, [form, formId, options])

  // 监听 Store 中的数据
  useEffect(() => {
    if (processedRef.current) return
    if (!pendingForm || pendingForm.formId !== formId) return

    // 消费数据
    const formData = consumeFormData(formId)
    if (formData) {
      processedRef.current = true
      applyPrefill(formData.data, formData.autoSubmit)

      // 重置标记，允许下次预填
      setTimeout(() => {
        processedRef.current = false
      }, 1000)
    }
  }, [pendingForm, formId, consumeFormData])

  /**
   * 应用预填数据
   */
  function applyPrefill(data: Record<string, unknown>, eventAutoSubmit?: boolean) {
    // 应用字段映射
    let mappedData = { ...data }
    if (options?.fieldMapping) {
      mappedData = {}
      for (const [sourceKey, targetKey] of Object.entries(options.fieldMapping)) {
        if (sourceKey in data) {
          mappedData[targetKey] = data[sourceKey]
        }
      }
      // 保留未映射的字段
      for (const [key, value] of Object.entries(data)) {
        if (!(key in options.fieldMapping)) {
          mappedData[key] = value
        }
      }
    }

    // 应用字段转换
    if (options?.fieldTransform) {
      for (const [field, transform] of Object.entries(options.fieldTransform)) {
        if (field in mappedData) {
          mappedData[field] = transform(mappedData[field])
        }
      }
    }

    // 设置表单值
    form.setFieldsValue(mappedData)

    // 触发回调
    options?.onPrefill?.(mappedData)

    // 自动提交
    const shouldAutoSubmit = eventAutoSubmit ?? options?.autoSubmit
    if (shouldAutoSubmit) {
      setTimeout(() => {
        form.submit()
      }, 100)
    }
  }
}

/**
 * 发送表单预填事件
 *
 * 供 Handler 调用，通知表单进行预填
 */
export function dispatchFormPrefill(
  formId: string,
  resourceType: string,
  data: Record<string, unknown>,
  autoSubmit = false
) {
  window.dispatchEvent(
    new CustomEvent('goi:prefillForm', {
      detail: { formId, resourceType, data, autoSubmit },
    })
  )
}

export default useGoiFormPrefill
