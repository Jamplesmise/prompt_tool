'use client'

import { useState, useCallback } from 'react'
import { modelsService } from '@/services/models'
import type { TestResult } from '@/components/model'

type UseModelTestReturn = {
  testing: boolean
  testingId: string | null      // 正在测试的 ID
  result: TestResult | null
  testProvider: (providerId: string) => Promise<TestResult>
  testModel: (modelId: string) => Promise<TestResult>
  clearResult: () => void
}

export function useModelTest(): UseModelTestReturn {
  const [testing, setTesting] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [result, setResult] = useState<TestResult | null>(null)

  const testProvider = useCallback(async (providerId: string): Promise<TestResult> => {
    setTesting(true)
    setTestingId(providerId)
    setResult(null)

    try {
      const response = await modelsService.providers.test(providerId)

      const testResult: TestResult = {
        success: response.code === 200 && response.data?.success === true,
        latency: response.data?.latencyMs || 0,
        error: response.code !== 200 ? response.message : response.data?.message,
      }

      setResult(testResult)
      return testResult
    } catch (err) {
      const testResult: TestResult = {
        success: false,
        latency: 0,
        error: err instanceof Error ? err.message : '测试失败',
      }
      setResult(testResult)
      return testResult
    } finally {
      setTesting(false)
      setTestingId(null)
    }
  }, [])

  const testModel = useCallback(async (modelId: string): Promise<TestResult> => {
    setTesting(true)
    setTestingId(modelId)
    setResult(null)

    try {
      const response = await modelsService.models.test(modelId)

      const testResult: TestResult = {
        success: response.code === 200 && response.data?.success === true,
        latency: response.data?.latencyMs || 0,
        tokenUsage: response.data?.tokenUsage,
        response: response.data?.response,
        error: response.code !== 200 ? response.message : response.data?.message,
      }

      setResult(testResult)
      return testResult
    } catch (err) {
      const testResult: TestResult = {
        success: false,
        latency: 0,
        error: err instanceof Error ? err.message : '测试失败',
      }
      setResult(testResult)
      return testResult
    } finally {
      setTesting(false)
      setTestingId(null)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setTestingId(null)
  }, [])

  return {
    testing,
    testingId,
    result,
    testProvider,
    testModel,
    clearResult,
  }
}
