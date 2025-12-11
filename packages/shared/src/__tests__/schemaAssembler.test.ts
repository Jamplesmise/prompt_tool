import { describe, it, expect } from 'vitest'
import {
  assembleSchemas,
  validateAIOutput,
  type AISchemaOutput,
} from '../schema/schemaAssembler'

describe('schemaAssembler', () => {
  describe('assembleSchemas', () => {
    it('should assemble basic input and output schemas', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [
          { name: 'user_question', type: 'string', required: true },
          { name: 'history', type: 'array', required: false },
        ],
        outputs: [
          { name: 'answer', type: 'string', critical: false },
          { name: 'category', type: 'enum', values: ['a', 'b', 'c'], critical: true },
        ],
      }

      const result = assembleSchemas(aiOutput, '智能问答')

      // 检查 inputSchema
      expect(result.inputSchema.name).toBe('智能问答输入变量')
      expect(result.inputSchema.variables).toHaveLength(2)
      expect(result.inputSchema.variables[0].key).toBe('userQuestion')
      expect(result.inputSchema.variables[0].datasetField).toBe('ctx_user_question')
      expect(result.inputSchema.variables[1].key).toBe('history')
      expect(result.inputSchema.variables[1].required).toBe(false)

      // 检查 outputSchema
      expect(result.outputSchema.name).toBe('智能问答输出结构')
      expect(result.outputSchema.fields).toHaveLength(2)
      expect(result.outputSchema.parseMode).toBe('JSON_EXTRACT')

      // 检查 enum 字段
      const categoryField = result.outputSchema.fields.find(f => f.name === 'category')
      expect(categoryField?.enumValues).toEqual(['a', 'b', 'c'])
      expect(categoryField?.evaluation.isCritical).toBe(true)

      // 检查聚合模式（有关键字段应该是 critical_first）
      expect(result.outputSchema.aggregation.mode).toBe('critical_first')

      // 检查模板列
      expect(result.templateColumns.length).toBe(4)  // 2 inputs + 2 expected
    })

    it('should use weighted_average when no critical fields', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [
          { name: 'input', type: 'string', required: true },
        ],
        outputs: [
          { name: 'output1', type: 'string', critical: false },
          { name: 'output2', type: 'number', critical: false },
        ],
      }

      const result = assembleSchemas(aiOutput, '测试')
      expect(result.outputSchema.aggregation.mode).toBe('weighted_average')
    })

    it('should distribute weights evenly', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [],
        outputs: [
          { name: 'field1', type: 'string', critical: false },
          { name: 'field2', type: 'string', critical: false },
          { name: 'field3', type: 'string', critical: false },
          { name: 'field4', type: 'string', critical: false },
        ],
      }

      const result = assembleSchemas(aiOutput, '测试')

      result.outputSchema.fields.forEach(field => {
        expect(field.evaluation.weight).toBeCloseTo(0.25)
      })
    })

    it('should infer correct evaluators based on type', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [],
        outputs: [
          { name: 'str_field', type: 'string', critical: false },
          { name: 'num_field', type: 'number', critical: false },
          { name: 'bool_field', type: 'boolean', critical: false },
          { name: 'enum_field', type: 'enum', values: ['a', 'b'], critical: false },
          { name: 'arr_field', type: 'array', critical: false },
        ],
      }

      const result = assembleSchemas(aiOutput, '测试')

      const getEvaluator = (name: string) =>
        result.outputSchema.fields.find(f => f.name === name)?.evaluation.evaluatorId

      expect(getEvaluator('str_field')).toBe('preset-contains')
      expect(getEvaluator('num_field')).toBe('preset-exact-match')
      expect(getEvaluator('bool_field')).toBe('preset-exact-match')
      expect(getEvaluator('enum_field')).toBe('preset-exact-match')
      expect(getEvaluator('arr_field')).toBe('preset-array-contains')
    })

    it('should handle Chinese field names', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [
          { name: '用户问题', type: 'string', required: true },
          { name: '设备型号', type: 'string', required: true },
        ],
        outputs: [
          { name: '问题分类', type: 'enum', values: ['硬件', '软件'], critical: true },
          { name: '意图识别', type: 'string', critical: false },
        ],
      }

      const result = assembleSchemas(aiOutput, '客服问答')

      // 检查 key 生成（应该使用英文关键词或编号）
      expect(result.inputSchema.variables[0].key).toBeTruthy()
      expect(result.inputSchema.variables[0].key).not.toContain('用户')

      // 检查 datasetField 生成
      expect(result.inputSchema.variables[0].datasetField).toMatch(/^ctx_/)
      expect(result.outputSchema.fields[0].evaluation.expectedField).toMatch(/^exp_/)
    })

    it('should generate unique keys for duplicate names', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [
          { name: '用户问题', type: 'string', required: true },
          { name: '用户问题', type: 'string', required: false },  // 重复名称
        ],
        outputs: [],
      }

      const result = assembleSchemas(aiOutput, '测试')

      const keys = result.inputSchema.variables.map(v => v.key)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)  // 所有 key 应该唯一
    })

    it('should use custom options', () => {
      const aiOutput: AISchemaOutput = {
        inputs: [],
        outputs: [
          { name: 'result', type: 'string', critical: false },
        ],
      }

      const result = assembleSchemas(aiOutput, '测试', {
        defaultParseMode: 'JSON',
        defaultPassThreshold: 0.8,
      })

      expect(result.outputSchema.parseMode).toBe('JSON')
      expect(result.outputSchema.aggregation.passThreshold).toBe(0.8)
    })
  })

  describe('validateAIOutput', () => {
    it('should validate correct output', () => {
      const output = {
        inputs: [
          { name: 'question', type: 'string', required: true },
        ],
        outputs: [
          { name: 'answer', type: 'string', critical: false },
        ],
      }

      const result = validateAIOutput(output)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toBeDefined()
    })

    it('should reject non-object input', () => {
      const result = validateAIOutput('not an object')
      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('root')
    })

    it('should reject missing inputs array', () => {
      const result = validateAIOutput({ outputs: [] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'inputs')).toBe(true)
    })

    it('should reject invalid input type', () => {
      const output = {
        inputs: [
          { name: 'test', type: 'invalid', required: true },
        ],
        outputs: [],
      }

      const result = validateAIOutput(output)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field.includes('type'))).toBe(true)
    })

    it('should require values for enum type', () => {
      const output = {
        inputs: [],
        outputs: [
          { name: 'category', type: 'enum', critical: false },  // 缺少 values
        ],
      }

      const result = validateAIOutput(output)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('values'))).toBe(true)
    })

    it('should reject missing critical field', () => {
      const output = {
        inputs: [],
        outputs: [
          { name: 'test', type: 'string' },  // 缺少 critical
        ],
      }

      const result = validateAIOutput(output)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('critical'))).toBe(true)
    })
  })
})
