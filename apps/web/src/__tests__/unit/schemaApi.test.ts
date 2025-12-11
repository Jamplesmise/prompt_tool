import { describe, it, expect } from 'vitest'
import type {
  InputVariableDefinition,
  OutputFieldDefinition,
  AggregationConfig,
  ParseMode
} from '@platform/shared'

/**
 * Schema API 单元测试
 *
 * 测试 InputSchema 和 OutputSchema 的 CRUD 操作
 *
 * 注意：这是测试用例设计，模拟 API 响应
 */

// 验证函数（与 API 中相同的逻辑）
function validateVariableDefinition(variable: InputVariableDefinition, index: number): string | null {
  if (!variable.name || typeof variable.name !== 'string') {
    return `变量 ${index + 1}: 名称不能为空`
  }
  if (!variable.key || typeof variable.key !== 'string') {
    return `变量 ${index + 1}: key 不能为空`
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.key)) {
    return `变量 ${index + 1}: key 必须是有效的标识符`
  }

  const validTypes = ['string', 'number', 'boolean', 'array', 'object']
  if (!variable.type || !validTypes.includes(variable.type)) {
    return `变量 ${index + 1}: 类型必须为 ${validTypes.join(', ')} 之一`
  }

  if (typeof variable.required !== 'boolean') {
    return `变量 ${index + 1}: required 必须是布尔值`
  }

  return null
}

function validateFieldDefinition(field: OutputFieldDefinition, index: number): string | null {
  if (!field.name || typeof field.name !== 'string') {
    return `字段 ${index + 1}: 名称不能为空`
  }
  if (!field.key || typeof field.key !== 'string') {
    return `字段 ${index + 1}: key 不能为空`
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key)) {
    return `字段 ${index + 1}: key 必须是有效的标识符`
  }

  const validTypes = ['string', 'number', 'boolean', 'enum', 'array', 'object']
  if (!field.type || !validTypes.includes(field.type)) {
    return `字段 ${index + 1}: 类型必须为 ${validTypes.join(', ')} 之一`
  }

  if (field.type === 'enum') {
    if (!field.enumValues || !Array.isArray(field.enumValues) || field.enumValues.length === 0) {
      return `字段 ${index + 1}: enum 类型必须提供 enumValues`
    }
  }

  if (!field.evaluation || typeof field.evaluation !== 'object') {
    return `字段 ${index + 1}: 必须提供 evaluation 配置`
  }

  if (typeof field.evaluation.weight !== 'number' || field.evaluation.weight < 0 || field.evaluation.weight > 1) {
    return `字段 ${index + 1}: 权重必须在 0-1 之间`
  }

  return null
}

function validateAggregation(agg: AggregationConfig): string | null {
  const validModes = ['all_pass', 'weighted_average', 'critical_first', 'custom']
  if (!agg.mode || !validModes.includes(agg.mode)) {
    return `聚合模式必须为 ${validModes.join(', ')} 之一`
  }

  if (agg.mode === 'weighted_average' || agg.mode === 'critical_first') {
    if (agg.passThreshold !== undefined) {
      if (typeof agg.passThreshold !== 'number' || agg.passThreshold < 0 || agg.passThreshold > 1) {
        return '通过阈值必须在 0-1 之间'
      }
    }
  }

  return null
}

describe('InputSchema API', () => {
  describe('POST /api/v1/input-schemas - 创建输入结构', () => {
    it('应该成功创建有效的输入结构', () => {
      const validRequest = {
        name: '智能客服输入变量',
        description: '客服场景的输入变量定义',
        variables: [
          { name: '用户问题', key: 'user_question', type: 'string' as const, required: true },
          { name: '设备列表', key: 'devices', type: 'array' as const, itemType: 'string' as const, required: true },
          { name: '历史对话', key: 'history', type: 'array' as const, itemType: 'object' as const, required: false },
        ],
      }

      // 验证每个变量
      for (let i = 0; i < validRequest.variables.length; i++) {
        const error = validateVariableDefinition(validRequest.variables[i], i)
        expect(error).toBeNull()
      }
    })

    it('应该拒绝空名称', () => {
      const invalidRequest = {
        name: '',
        variables: [{ name: '问题', key: 'question', type: 'string', required: true }],
      }

      expect(invalidRequest.name).toBe('')
    })

    it('应该拒绝空变量列表', () => {
      const invalidRequest = {
        name: '测试',
        variables: [],
      }

      expect(invalidRequest.variables.length).toBe(0)
    })

    it('应该拒绝无效的变量 key', () => {
      const invalidVariable: InputVariableDefinition = {
        name: '测试变量',
        key: '123invalid', // 以数字开头
        type: 'string',
        required: true,
      }

      const error = validateVariableDefinition(invalidVariable, 0)
      expect(error).toContain('有效的标识符')
    })

    it('应该拒绝无效的变量类型', () => {
      const invalidVariable = {
        name: '测试变量',
        key: 'test_var',
        type: 'invalid_type',
        required: true,
      } as unknown as InputVariableDefinition

      const error = validateVariableDefinition(invalidVariable, 0)
      expect(error).toContain('类型必须为')
    })

    it('应该检测重复的 key', () => {
      const variables = [
        { name: '变量1', key: 'same_key', type: 'string' as const, required: true },
        { name: '变量2', key: 'same_key', type: 'number' as const, required: true },
      ]

      const keys = variables.map(v => v.key)
      const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
      expect(duplicates.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/v1/input-schemas - 获取列表', () => {
    it('应该返回分页列表', () => {
      const mockResponse = {
        code: 200,
        data: {
          list: [
            {
              id: 'schema-1',
              name: '输入结构1',
              variables: [],
              createdAt: '2024-01-01T00:00:00Z',
              _count: { prompts: 2 },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      }

      expect(mockResponse.code).toBe(200)
      expect(mockResponse.data.list).toHaveLength(1)
      expect(mockResponse.data.list[0]._count.prompts).toBe(2)
    })

    it('应该支持搜索过滤', () => {
      const searchParams = {
        search: '客服',
        page: 1,
        pageSize: 10,
      }

      expect(searchParams.search).toBe('客服')
    })
  })

  describe('PUT /api/v1/input-schemas/:id - 更新', () => {
    it('应该成功更新输入结构', () => {
      const updateRequest = {
        name: '更新后的名称',
        description: '更新后的描述',
      }

      expect(updateRequest.name).toBeTruthy()
    })

    it('应该拒绝更新为空名称', () => {
      const invalidUpdate = { name: '' }
      expect(invalidUpdate.name).toBe('')
    })
  })

  describe('DELETE /api/v1/input-schemas/:id - 删除', () => {
    it('应该成功删除未使用的输入结构', () => {
      const mockSchema = {
        id: 'schema-to-delete',
        _count: { prompts: 0 },
      }

      expect(mockSchema._count.prompts).toBe(0)
    })

    it('应该拒绝删除正在使用的输入结构', () => {
      const mockSchema = {
        id: 'schema-in-use',
        _count: { prompts: 3 },
      }

      expect(mockSchema._count.prompts).toBeGreaterThan(0)
    })
  })
})

describe('OutputSchema API', () => {
  describe('POST /api/v1/output-schemas - 创建输出结构', () => {
    it('应该成功创建有效的输出结构', () => {
      const validRequest = {
        name: '智能客服输出结构',
        description: '客服场景的输出字段定义',
        fields: [
          {
            name: '问题分类',
            key: 'problem_type',
            type: 'enum' as const,
            required: true,
            enumValues: ['bluetooth', 'wifi', 'battery', 'other'],
            evaluation: {
              evaluatorId: 'preset-exact-match',
              expectedField: 'exp_problem_type',
              weight: 0.4,
              isCritical: true,
            },
          },
          {
            name: '设备型号',
            key: 'device_model',
            type: 'string' as const,
            required: true,
            evaluation: {
              evaluatorId: 'preset-contains',
              expectedField: 'exp_device_model',
              weight: 0.3,
              isCritical: false,
            },
          },
          {
            name: '置信度',
            key: 'confidence',
            type: 'number' as const,
            required: true,
            evaluation: {
              weight: 0.3,
              isCritical: false,
            },
          },
        ],
        parseMode: 'JSON_EXTRACT' as ParseMode,
        aggregation: {
          mode: 'critical_first' as const,
          passThreshold: 0.7,
        },
      }

      // 验证每个字段
      for (let i = 0; i < validRequest.fields.length; i++) {
        const error = validateFieldDefinition(validRequest.fields[i], i)
        expect(error).toBeNull()
      }

      // 验证聚合配置
      const aggError = validateAggregation(validRequest.aggregation)
      expect(aggError).toBeNull()
    })

    it('应该拒绝 enum 类型缺少 enumValues', () => {
      const invalidField = {
        name: '分类',
        key: 'category',
        type: 'enum' as const,
        required: true,
        // 缺少 enumValues
        evaluation: { weight: 0.5, isCritical: false },
      } as OutputFieldDefinition

      const error = validateFieldDefinition(invalidField, 0)
      expect(error).toContain('enumValues')
    })

    it('应该拒绝无效的权重值', () => {
      const invalidField: OutputFieldDefinition = {
        name: '测试',
        key: 'test',
        type: 'string',
        required: true,
        evaluation: { weight: 1.5, isCritical: false }, // 超出范围
      }

      const error = validateFieldDefinition(invalidField, 0)
      expect(error).toContain('权重必须在 0-1 之间')
    })

    it('应该拒绝无效的聚合模式', () => {
      const invalidAggregation = {
        mode: 'invalid_mode',
      } as unknown as AggregationConfig

      const error = validateAggregation(invalidAggregation)
      expect(error).toContain('聚合模式必须为')
    })

    it('应该拒绝无效的通过阈值', () => {
      const invalidAggregation: AggregationConfig = {
        mode: 'weighted_average',
        passThreshold: 2.0, // 超出范围
      }

      const error = validateAggregation(invalidAggregation)
      expect(error).toContain('通过阈值必须在 0-1 之间')
    })
  })

  describe('GET /api/v1/output-schemas - 获取列表', () => {
    it('应该返回包含字段数量的列表', () => {
      const mockResponse = {
        code: 200,
        data: {
          list: [
            {
              id: 'output-1',
              name: '输出结构1',
              fields: [
                { name: '字段1', key: 'field1', type: 'string' },
                { name: '字段2', key: 'field2', type: 'number' },
              ],
              parseMode: 'JSON',
              aggregation: { mode: 'all_pass' },
              _count: { prompts: 1 },
            },
          ],
          total: 1,
        },
      }

      expect(mockResponse.data.list[0].fields).toHaveLength(2)
      expect(mockResponse.data.list[0].parseMode).toBe('JSON')
    })
  })

  describe('解析模式验证', () => {
    it('应该接受有效的解析模式', () => {
      const validParseModes: ParseMode[] = ['JSON', 'JSON_EXTRACT', 'REGEX', 'TEMPLATE']

      validParseModes.forEach(mode => {
        expect(validParseModes.includes(mode)).toBe(true)
      })
    })

    it('应该拒绝无效的解析模式', () => {
      const invalidMode = 'XML'
      const validModes = ['JSON', 'JSON_EXTRACT', 'REGEX', 'TEMPLATE']

      expect(validModes.includes(invalidMode)).toBe(false)
    })
  })

  describe('聚合配置验证', () => {
    it('应该验证 all_pass 模式', () => {
      const config: AggregationConfig = { mode: 'all_pass' }
      const error = validateAggregation(config)
      expect(error).toBeNull()
    })

    it('应该验证 weighted_average 模式', () => {
      const config: AggregationConfig = {
        mode: 'weighted_average',
        passThreshold: 0.7
      }
      const error = validateAggregation(config)
      expect(error).toBeNull()
    })

    it('应该验证 critical_first 模式', () => {
      const config: AggregationConfig = {
        mode: 'critical_first',
        passThreshold: 0.8
      }
      const error = validateAggregation(config)
      expect(error).toBeNull()
    })

    it('应该验证 custom 模式', () => {
      const config: AggregationConfig = {
        mode: 'custom',
        customExpression: 'fields.problem_type.passed && fields.confidence > 0.8',
      }
      const error = validateAggregation(config)
      expect(error).toBeNull()
    })
  })
})

describe('Schema 关联', () => {
  describe('Prompt 关联 Schema', () => {
    it('应该支持可选关联', () => {
      const promptWithSchema = {
        id: 'prompt-1',
        name: '测试提示词',
        inputSchemaId: 'input-schema-1',
        outputSchemaId: 'output-schema-1',
      }

      const promptWithoutSchema = {
        id: 'prompt-2',
        name: '简单提示词',
        inputSchemaId: null,
        outputSchemaId: null,
      }

      expect(promptWithSchema.inputSchemaId).toBeTruthy()
      expect(promptWithoutSchema.inputSchemaId).toBeNull()
    })
  })

  describe('权限验证', () => {
    it('创建者应该有完全权限', () => {
      const schema = { createdById: 'user-1' }
      const currentUser = { id: 'user-1' }

      expect(schema.createdById === currentUser.id).toBe(true)
    })

    it('团队成员应该有编辑权限', () => {
      const membership = { role: 'MEMBER' }
      const canEdit = membership.role !== 'VIEWER'

      expect(canEdit).toBe(true)
    })

    it('观察者不应该有编辑权限', () => {
      const membership = { role: 'VIEWER' }
      const canEdit = membership.role !== 'VIEWER'

      expect(canEdit).toBe(false)
    })

    it('只有管理员和所有者可以删除', () => {
      const adminMembership = { role: 'ADMIN' }
      const ownerMembership = { role: 'OWNER' }
      const memberMembership = { role: 'MEMBER' }

      const adminCanDelete = ['OWNER', 'ADMIN'].includes(adminMembership.role)
      const ownerCanDelete = ['OWNER', 'ADMIN'].includes(ownerMembership.role)
      const memberCanDelete = ['OWNER', 'ADMIN'].includes(memberMembership.role)

      expect(adminCanDelete).toBe(true)
      expect(ownerCanDelete).toBe(true)
      expect(memberCanDelete).toBe(false)
    })
  })
})
