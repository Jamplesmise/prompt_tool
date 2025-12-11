import { describe, it, expect } from 'vitest'
import {
  ConditionEvaluator,
  validateCondition,
  evaluateCondition,
  shouldEvaluateField,
  type EvaluationContext,
} from '../evaluation/conditionEvaluator'

describe('ConditionEvaluator', () => {
  describe('validate', () => {
    it('should accept valid simple expressions', () => {
      expect(validateCondition('fields.a === true')).toEqual({ valid: true })
      expect(validateCondition('fields.b !== "test"')).toEqual({ valid: true })
      expect(validateCondition('fields.count > 10')).toEqual({ valid: true })
      expect(validateCondition('evaluated.field_a.passed')).toEqual({ valid: true })
    })

    it('should accept valid compound expressions', () => {
      expect(validateCondition('fields.a === true && fields.b === false')).toEqual({ valid: true })
      expect(validateCondition('fields.a || fields.b')).toEqual({ valid: true })
      expect(validateCondition('evaluated.f1.passed && evaluated.f2.score > 0.8')).toEqual({ valid: true })
    })

    it('should accept valid ternary expressions', () => {
      expect(validateCondition('fields.a ? true : false')).toEqual({ valid: true })
    })

    it('should reject empty expressions', () => {
      expect(validateCondition('')).toEqual({ valid: false, error: '表达式不能为空' })
      expect(validateCondition('   ')).toEqual({ valid: false, error: '表达式不能为空' })
    })

    it('should reject expressions with forbidden keywords', () => {
      expect(validateCondition('eval("code")')).toEqual({
        valid: false,
        error: '表达式包含禁止的关键字: eval',
      })
      expect(validateCondition('Function("code")')).toEqual({
        valid: false,
        error: '表达式包含禁止的关键字: Function',
      })
      expect(validateCondition('obj.constructor')).toEqual({
        valid: false,
        error: '表达式包含禁止的关键字: constructor',
      })
      expect(validateCondition('obj.__proto__')).toEqual({
        valid: false,
        error: '表达式包含禁止的关键字: __proto__',
      })
    })

    it('should reject expressions that are too long', () => {
      const longExpr = 'a'.repeat(501)
      const result = validateCondition(longExpr)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('过长')
    })

    it('should reject unbalanced parentheses', () => {
      expect(validateCondition('(fields.a && fields.b')).toEqual({
        valid: false,
        error: '括号不匹配',
      })
      expect(validateCondition('fields.arr[0')).toEqual({
        valid: false,
        error: '括号不匹配',
      })
    })
  })

  describe('evaluate', () => {
    const baseContext: EvaluationContext = {
      fields: {
        device_change: false,
        problem_type: 'bluetooth',
        count: 10,
        name: 'test',
      },
      evaluated: {
        field_a: { passed: true, score: 0.9 },
        field_b: { passed: false, score: 0.5 },
      },
    }

    it('should evaluate simple field comparisons', () => {
      expect(evaluateCondition('fields.device_change === false', baseContext)).toEqual({
        success: true,
        result: true,
      })

      expect(evaluateCondition('fields.device_change === true', baseContext)).toEqual({
        success: true,
        result: false,
      })

      expect(evaluateCondition('fields.problem_type === "bluetooth"', baseContext)).toEqual({
        success: true,
        result: true,
      })

      expect(evaluateCondition('fields.problem_type !== "other"', baseContext)).toEqual({
        success: true,
        result: true,
      })
    })

    it('should evaluate numeric comparisons', () => {
      expect(evaluateCondition('fields.count > 5', baseContext)).toEqual({
        success: true,
        result: true,
      })

      expect(evaluateCondition('fields.count >= 10', baseContext)).toEqual({
        success: true,
        result: true,
      })

      expect(evaluateCondition('fields.count < 5', baseContext)).toEqual({
        success: true,
        result: false,
      })
    })

    it('should evaluate evaluated field results', () => {
      expect(evaluateCondition('evaluated.field_a.passed', baseContext)).toEqual({
        success: true,
        result: true,
      })

      expect(evaluateCondition('evaluated.field_b.passed', baseContext)).toEqual({
        success: true,
        result: false,
      })

      expect(evaluateCondition('evaluated.field_a.score > 0.8', baseContext)).toEqual({
        success: true,
        result: true,
      })
    })

    it('should evaluate compound expressions', () => {
      expect(
        evaluateCondition('fields.device_change === false && evaluated.field_a.passed', baseContext)
      ).toEqual({
        success: true,
        result: true,
      })

      expect(
        evaluateCondition('fields.device_change === true || evaluated.field_a.passed', baseContext)
      ).toEqual({
        success: true,
        result: true,
      })
    })

    it('should handle missing fields gracefully', () => {
      const result = evaluateCondition('fields.nonexistent === undefined', baseContext)
      expect(result.success).toBe(true)
      expect(result.result).toBe(true)
    })

    it('should return error for invalid expressions', () => {
      const result = evaluateCondition('eval("bad")', baseContext)
      expect(result.success).toBe(false)
      expect(result.error).toContain('禁止的关键字')
    })

    it('should return error for syntax errors', () => {
      const result = evaluateCondition('fields.a ==== true', baseContext)
      expect(result.success).toBe(false)
      expect(result.error).toContain('执行错误')
    })
  })

  describe('shouldEvaluateField', () => {
    const context: EvaluationContext = {
      fields: { enabled: true, disabled: false },
      evaluated: {},
    }

    it('should return true when no condition is provided', () => {
      expect(shouldEvaluateField(undefined, context)).toBe(true)
      expect(shouldEvaluateField('', context)).toBe(true)
      expect(shouldEvaluateField('   ', context)).toBe(true)
    })

    it('should return condition result when condition is valid', () => {
      expect(shouldEvaluateField('fields.enabled === true', context)).toBe(true)
      expect(shouldEvaluateField('fields.enabled === false', context)).toBe(false)
      expect(shouldEvaluateField('fields.disabled === false', context)).toBe(true)
    })

    it('should return true on condition error (fail-safe)', () => {
      // Invalid expression should default to true
      expect(shouldEvaluateField('fields.a ==== true', context)).toBe(true)
    })
  })

  describe('ConditionEvaluator class', () => {
    it('should work with static methods', () => {
      const context: EvaluationContext = {
        fields: { x: 1 },
        evaluated: {},
      }

      expect(ConditionEvaluator.validate('fields.x > 0')).toEqual({ valid: true })
      expect(ConditionEvaluator.evaluate('fields.x > 0', context)).toEqual({
        success: true,
        result: true,
      })
      expect(ConditionEvaluator.shouldEvaluate('fields.x > 0', context)).toBe(true)
    })
  })
})
