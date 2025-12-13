'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { SaveButtonState } from '@/components/settings/SaveButton'

type UseSettingsFormOptions<T> = {
  initialValues: T
  onSave: (values: T) => Promise<void>
}

type UseSettingsFormReturn<T> = {
  values: T
  setValues: (values: Partial<T>) => void
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  isDirty: boolean
  saveState: SaveButtonState
  errorMessage: string | undefined
  save: () => Promise<void>
  reset: () => void
}

export function useSettingsForm<T extends Record<string, unknown>>(
  options: UseSettingsFormOptions<T>
): UseSettingsFormReturn<T> {
  const { initialValues, onSave } = options
  const [baseValues, setBaseValues] = useState<T>(initialValues)
  const [values, setValuesState] = useState<T>(initialValues)
  const [saveState, setSaveState] = useState<SaveButtonState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>()
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(baseValues)
  }, [values, baseValues])

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }))
  }, [])

  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }))
  }, [])

  const save = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setSaveState('saving')
    setErrorMessage(undefined)

    try {
      await onSave(values)
      setBaseValues(values)
      setSaveState('saved')

      timerRef.current = setTimeout(() => {
        setSaveState('idle')
      }, 2000)
    } catch (error) {
      setSaveState('error')
      setErrorMessage(error instanceof Error ? error.message : '保存失败，请重试')

      timerRef.current = setTimeout(() => {
        setSaveState('idle')
      }, 3000)
    }
  }, [values, onSave])

  const reset = useCallback(() => {
    setValuesState(baseValues)
    setSaveState('idle')
    setErrorMessage(undefined)
  }, [baseValues])

  return {
    values,
    setValues,
    setFieldValue,
    isDirty,
    saveState,
    errorMessage,
    save,
    reset,
  }
}
