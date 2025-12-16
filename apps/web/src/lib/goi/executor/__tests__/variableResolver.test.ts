/**
 * 变量解析器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveVariables,
  resolveStringVariables,
  resolveVariable,
  getNestedValue,
  hasVariableReference,
  extractVariableReferences,
  getReferencedStepIds,
  createStepResults,
  addStepResult,
  type StepResults,
  type VariableResolverContext,
} from '../variableResolver'

describe('变量解析器', () => {
  let stepResults: StepResults
  let context: VariableResolverContext

  beforeEach(() => {
    stepResults = createStepResults()
    context = { currentStepIndex: 3 }
  })

  describe('getNestedValue - 嵌套值访问', () => {
    it('应该正确访问对象属性', () => {
      const obj = { id: '123', name: 'test' }
      expect(getNestedValue(obj, '.id')).toBe('123')
      expect(getNestedValue(obj, '.name')).toBe('test')
    })

    it('应该正确访问数组索引', () => {
      const arr = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
      expect(getNestedValue(arr, '[0]')).toEqual({ id: 'a' })
      expect(getNestedValue(arr, '[1]')).toEqual({ id: 'b' })
      expect(getNestedValue(arr, '[2]')).toEqual({ id: 'c' })
    })

    it('应该正确访问嵌套路径', () => {
      const obj = {
        data: {
          items: [
            { id: 'item-1', meta: { version: 1 } },
            { id: 'item-2', meta: { version: 2 } },
          ],
        },
      }
      expect(getNestedValue(obj, '.data.items[0].id')).toBe('item-1')
      expect(getNestedValue(obj, '.data.items[1].meta.version')).toBe(2)
    })

    it('应该对无效路径返回 undefined', () => {
      const obj = { id: '123' }
      expect(getNestedValue(obj, '.nonexistent')).toBeUndefined()
      expect(getNestedValue(obj, '.nested.path')).toBeUndefined()
    })

    it('应该对 null/undefined 返回 undefined', () => {
      expect(getNestedValue(null, '.id')).toBeUndefined()
      expect(getNestedValue(undefined, '.id')).toBeUndefined()
    })

    it('应该对空路径返回原对象', () => {
      const obj = { id: '123' }
      expect(getNestedValue(obj, '')).toEqual(obj)
    })
  })

  describe('resolveVariable - 单变量解析', () => {
    beforeEach(() => {
      // 模拟步骤 1 的结果
      addStepResult(stepResults, '1', { resourceId: 'prompt-123', name: '测试提示词' }, 'success')

      // 模拟步骤 2 的结果
      addStepResult(
        stepResults,
        '2',
        {
          results: [
            { id: 'dataset-1', name: '测试数据集' },
            { id: 'dataset-2', name: '另一个数据集' },
          ],
        },
        'success'
      )
    })

    it('应该正确解析简单变量引用 $1.result.resourceId', () => {
      const result = resolveVariable('$1.result.resourceId', stepResults, context)
      expect(result).toBe('prompt-123')
    })

    it('应该正确解析数组索引 $2.result.results[0].id', () => {
      const result = resolveVariable('$2.result.results[0].id', stepResults, context)
      expect(result).toBe('dataset-1')
    })

    it('应该正确解析整个结果 $1.result', () => {
      const result = resolveVariable('$1.result', stepResults, context)
      expect(result).toEqual({ resourceId: 'prompt-123', name: '测试提示词' })
    })

    it('应该对不存在的步骤返回 undefined', () => {
      const result = resolveVariable('$99.result.id', stepResults, context)
      expect(result).toBeUndefined()
    })

    it('应该对失败的步骤返回 undefined', () => {
      addStepResult(stepResults, '3', { error: 'Failed' }, 'failed')
      const result = resolveVariable('$3.result.error', stepResults, context)
      expect(result).toBeUndefined()
    })

    it('应该正确解析 $prev 引用', () => {
      context = { currentStepIndex: 3, stepIdOrder: ['1', '2', '3'], currentStepId: '3' }
      const result = resolveVariable('$prev.result.results[0].id', stepResults, context)
      expect(result).toBe('dataset-1')
    })
  })

  describe('resolveStringVariables - 字符串变量解析', () => {
    beforeEach(() => {
      addStepResult(stepResults, '1', { resourceId: 'prompt-123' }, 'success')
      addStepResult(stepResults, '2', { results: [{ id: 'dataset-1' }] }, 'success')
    })

    it('应该解析完整变量引用并保持类型', () => {
      const result = resolveStringVariables('$1.result', stepResults, context)
      expect(result).toEqual({ resourceId: 'prompt-123' })
      expect(typeof result).toBe('object')
    })

    it('应该解析单个变量字符串并返回原始值', () => {
      const result = resolveStringVariables('$1.result.resourceId', stepResults, context)
      expect(result).toBe('prompt-123')
    })

    it('应该解析混合文本中的变量', () => {
      const result = resolveStringVariables(
        'Prompt ID: $1.result.resourceId, Dataset ID: $2.result.results[0].id',
        stepResults,
        context
      )
      expect(result).toBe('Prompt ID: prompt-123, Dataset ID: dataset-1')
    })

    it('应该将缺失变量替换为空字符串', () => {
      const result = resolveStringVariables('ID: $99.result.id', stepResults, context)
      expect(result).toBe('ID: ')
    })

    it('应该保持无变量字符串不变', () => {
      const result = resolveStringVariables('普通文本', stepResults, context)
      expect(result).toBe('普通文本')
    })
  })

  describe('resolveVariables - 递归变量解析', () => {
    beforeEach(() => {
      addStepResult(stepResults, '1', { resourceId: 'prompt-123', name: '测试' }, 'success')
      addStepResult(stepResults, '2', { results: [{ id: 'dataset-1' }, { id: 'dataset-2' }] }, 'success')
      addStepResult(stepResults, '3', { results: [{ id: 'model-1' }] }, 'success')
    })

    it('应该解析对象中的变量', () => {
      const input = {
        name: '任务名称',
        promptId: '$1.result.resourceId',
        datasetId: '$2.result.results[0].id',
      }
      const result = resolveVariables(input, stepResults, context)
      expect(result).toEqual({
        name: '任务名称',
        promptId: 'prompt-123',
        datasetId: 'dataset-1',
      })
    })

    it('应该解析数组中的变量', () => {
      const input = ['$1.result.resourceId', '$2.result.results[0].id']
      const result = resolveVariables(input, stepResults, context)
      expect(result).toEqual(['prompt-123', 'dataset-1'])
    })

    it('应该解析嵌套对象中的变量', () => {
      const input = {
        config: {
          prompt: '$1.result.resourceId',
          datasets: ['$2.result.results[0].id', '$2.result.results[1].id'],
        },
      }
      const result = resolveVariables(input, stepResults, context)
      expect(result).toEqual({
        config: {
          prompt: 'prompt-123',
          datasets: ['dataset-1', 'dataset-2'],
        },
      })
    })

    it('应该保持非字符串值不变', () => {
      const input = {
        count: 10,
        active: true,
        empty: null,
        promptId: '$1.result.resourceId',
      }
      const result = resolveVariables(input, stepResults, context)
      expect(result).toEqual({
        count: 10,
        active: true,
        empty: null,
        promptId: 'prompt-123',
      })
    })

    it('应该正确解析完整的 GOI 操作对象', () => {
      const goiOperation = {
        type: 'state',
        target: { resourceType: 'task' },
        action: 'create',
        expectedState: {
          name: '情感分析测试',
          promptId: '$1.result.resourceId',
          datasetId: '$2.result.results[0].id',
          modelIds: ['$3.result.results[0].id'],
        },
      }
      const result = resolveVariables(goiOperation, stepResults, context)
      expect(result).toEqual({
        type: 'state',
        target: { resourceType: 'task' },
        action: 'create',
        expectedState: {
          name: '情感分析测试',
          promptId: 'prompt-123',
          datasetId: 'dataset-1',
          modelIds: ['model-1'],
        },
      })
    })
  })

  describe('hasVariableReference - 变量引用检测', () => {
    it('应该检测字符串中的变量引用', () => {
      expect(hasVariableReference('$1.result.id')).toBe(true)
      expect(hasVariableReference('普通文本')).toBe(false)
    })

    it('应该检测对象中的变量引用', () => {
      expect(hasVariableReference({ id: '$1.result.id' })).toBe(true)
      expect(hasVariableReference({ id: '123' })).toBe(false)
    })

    it('应该检测数组中的变量引用', () => {
      expect(hasVariableReference(['$1.result.id'])).toBe(true)
      expect(hasVariableReference(['123'])).toBe(false)
    })

    it('应该检测嵌套结构中的变量引用', () => {
      expect(hasVariableReference({ nested: { id: '$1.result.id' } })).toBe(true)
      expect(hasVariableReference({ nested: { id: '123' } })).toBe(false)
    })
  })

  describe('extractVariableReferences - 变量引用提取', () => {
    it('应该提取所有变量引用', () => {
      const refs = extractVariableReferences({
        promptId: '$1.result.resourceId',
        datasetId: '$2.result.results[0].id',
        modelId: '$3.result.id',
      })
      expect(refs).toContain('$1.result.resourceId')
      expect(refs).toContain('$2.result.results[0].id')
      expect(refs).toContain('$3.result.id')
      expect(refs).toHaveLength(3)
    })

    it('应该去重重复的引用', () => {
      const refs = extractVariableReferences({
        field1: '$1.result.id',
        field2: '$1.result.id',
      })
      expect(refs).toHaveLength(1)
      expect(refs[0]).toBe('$1.result.id')
    })

    it('应该返回空数组当没有引用时', () => {
      const refs = extractVariableReferences({ id: '123', name: 'test' })
      expect(refs).toEqual([])
    })
  })

  describe('getReferencedStepIds - 依赖步骤ID提取', () => {
    it('应该提取所有依赖的步骤ID', () => {
      const stepIds = getReferencedStepIds({
        promptId: '$1.result.id',
        datasetId: '$2.result.id',
        modelId: '$3.result.id',
      })
      expect(stepIds).toContain('1')
      expect(stepIds).toContain('2')
      expect(stepIds).toContain('3')
      expect(stepIds).toHaveLength(3)
    })

    it('应该去重重复的步骤ID', () => {
      const stepIds = getReferencedStepIds({
        field1: '$1.result.id',
        field2: '$1.result.name',
      })
      expect(stepIds).toHaveLength(1)
      expect(stepIds[0]).toBe('1')
    })

    it('应该排除 $prev 引用', () => {
      const stepIds = getReferencedStepIds({
        field1: '$1.result.id',
        field2: '$prev.result.id',
      })
      expect(stepIds).toHaveLength(1)
      expect(stepIds[0]).toBe('1')
    })
  })

  describe('边界情况', () => {
    beforeEach(() => {
      addStepResult(stepResults, '1', { id: '123' }, 'success')
    })

    it('应该处理空对象', () => {
      expect(resolveVariables({}, stepResults, context)).toEqual({})
    })

    it('应该处理空数组', () => {
      expect(resolveVariables([], stepResults, context)).toEqual([])
    })

    it('应该处理 undefined', () => {
      expect(resolveVariables(undefined, stepResults, context)).toBeUndefined()
    })

    it('应该处理 null', () => {
      expect(resolveVariables(null, stepResults, context)).toBeNull()
    })

    it('应该处理数字', () => {
      expect(resolveVariables(123, stepResults, context)).toBe(123)
    })

    it('应该处理布尔值', () => {
      expect(resolveVariables(true, stepResults, context)).toBe(true)
      expect(resolveVariables(false, stepResults, context)).toBe(false)
    })

    it('应该处理无效变量格式', () => {
      const result = resolveVariable('invalid', stepResults, context)
      expect(result).toBeUndefined()
    })

    it('应该处理部分匹配的变量格式', () => {
      const result = resolveVariable('$1', stepResults, context)
      expect(result).toBeUndefined()
    })
  })
})
