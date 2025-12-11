/**
 * Prompt 特征提取器测试（包含 ReDoS 安全测试）
 */
import { describe, it, expect } from 'vitest'
import { extractPromptFeatures } from '../recommendation/promptFeatureExtractor'

describe('promptFeatureExtractor', () => {
  describe('extractPromptFeatures()', () => {
    it('应检测 JSON 输出要求', () => {
      const prompt = '请将结果以 JSON 格式输出'
      const features = extractPromptFeatures(prompt)
      expect(features.hasJsonOutput).toBe(true)
    })

    it('应检测关键词要求', () => {
      const prompt = '回答必须包含以下关键词：人工智能、机器学习'
      const features = extractPromptFeatures(prompt)
      expect(features.hasKeywordRequirement).toBe(true)
    })

    it('应检测长度约束', () => {
      const prompt = '请用不超过100字总结'
      const features = extractPromptFeatures(prompt)
      expect(features.hasLengthConstraint).toBe(true)
    })

    it('应检测分类任务', () => {
      const prompt = '请对以下文本进行情感分类'
      const features = extractPromptFeatures(prompt)
      expect(features.hasClassification).toBe(true)
      expect(features.taskType).toBe('classification')
    })

    it('应检测问答任务', () => {
      const prompt = '根据以下内容回答问题'
      const features = extractPromptFeatures(prompt)
      expect(features.taskType).toBe('qa')
    })

    it('应检测翻译任务', () => {
      const prompt = '请将以下英文翻译成中文'
      const features = extractPromptFeatures(prompt)
      expect(features.taskType).toBe('translation')
    })

    it('应检测代码任务', () => {
      const prompt = '请实现一个 Python 函数，代码如下'
      const features = extractPromptFeatures(prompt)
      expect(features.taskType).toBe('code')
    })
  })

  describe('ReDoS 安全测试', () => {
    it('应在合理时间内处理长字符串', () => {
      // 构造可能触发 ReDoS 的长字符串
      const longString = '根据'.repeat(10000) + '回答'

      const startTime = Date.now()
      const features = extractPromptFeatures(longString)
      const endTime = Date.now()

      // 应在 100ms 内完成
      expect(endTime - startTime).toBeLessThan(100)
      expect(features).toBeDefined()
    })

    it('应安全处理特殊字符', () => {
      const maliciousInput = 'a]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]!'

      const startTime = Date.now()
      const features = extractPromptFeatures(maliciousInput)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100)
      expect(features.taskType).toBe('other')
    })

    it('应安全处理重复模式', () => {
      // 典型的 ReDoS 攻击模式
      const repeatedPattern = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!'

      const startTime = Date.now()
      const features = extractPromptFeatures(repeatedPattern)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('关键词提取', () => {
    it('应提取引号内的关键词', () => {
      const prompt = '请确保回答包含"机器学习"和"深度学习"'
      const features = extractPromptFeatures(prompt)
      expect(features.detectedKeywords).toContain('机器学习')
      expect(features.detectedKeywords).toContain('深度学习')
    })
  })
})
