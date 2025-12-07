import { describe, it, expect } from 'vitest'
import {
  success,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalError,
} from '../api'
import { ERROR_CODES } from '@platform/shared'

describe('API 响应工具函数', () => {
  describe('success', () => {
    it('应返回正确的成功响应格式', () => {
      const data = { id: '1', name: 'test' }
      const result = success(data)

      expect(result).toEqual({
        code: 200,
        message: 'success',
        data: { id: '1', name: 'test' },
      })
    })

    it('应支持自定义消息', () => {
      const result = success({ items: [] }, '获取成功')

      expect(result.message).toBe('获取成功')
      expect(result.code).toBe(200)
    })

    it('应正确处理 null 数据', () => {
      const result = success(null)

      expect(result.data).toBeNull()
      expect(result.code).toBe(200)
    })

    it('应正确处理数组数据', () => {
      const data = [1, 2, 3]
      const result = success(data)

      expect(result.data).toEqual([1, 2, 3])
    })

    it('应正确处理基本类型数据', () => {
      expect(success('string').data).toBe('string')
      expect(success(123).data).toBe(123)
      expect(success(true).data).toBe(true)
    })
  })

  describe('error', () => {
    it('应返回正确的错误响应格式', () => {
      const result = error(ERROR_CODES.BAD_REQUEST, '请求参数错误')

      expect(result).toEqual({
        code: 400000,
        message: '请求参数错误',
        data: null,
      })
    })

    it('未提供消息时应使用默认错误消息', () => {
      const result = error(ERROR_CODES.UNAUTHORIZED)

      expect(result.message).toBe('未授权')
      expect(result.code).toBe(401000)
    })

    it('未知错误码应返回未知错误消息', () => {
      const result = error(999999)

      expect(result.message).toBe('未知错误')
    })

    it('data 应始终为 null', () => {
      const result = error(ERROR_CODES.NOT_FOUND, '资源不存在')

      expect(result.data).toBeNull()
    })
  })

  describe('badRequest', () => {
    it('应返回 400000 错误码', () => {
      const result = badRequest('参数缺失')

      expect(result.code).toBe(ERROR_CODES.BAD_REQUEST)
      expect(result.message).toBe('参数缺失')
    })

    it('未提供消息时应使用默认消息', () => {
      const result = badRequest()

      expect(result.code).toBe(ERROR_CODES.BAD_REQUEST)
      expect(result.message).toBe('请求错误')
    })
  })

  describe('unauthorized', () => {
    it('应返回 401000 错误码', () => {
      const result = unauthorized('登录已过期')

      expect(result.code).toBe(ERROR_CODES.UNAUTHORIZED)
      expect(result.message).toBe('登录已过期')
    })

    it('未提供消息时应使用默认消息', () => {
      const result = unauthorized()

      expect(result.code).toBe(ERROR_CODES.UNAUTHORIZED)
      expect(result.message).toBe('未授权')
    })
  })

  describe('forbidden', () => {
    it('应返回 403000 错误码', () => {
      const result = forbidden('没有操作权限')

      expect(result.code).toBe(ERROR_CODES.FORBIDDEN)
      expect(result.message).toBe('没有操作权限')
    })

    it('未提供消息时应使用默认消息', () => {
      const result = forbidden()

      expect(result.code).toBe(ERROR_CODES.FORBIDDEN)
      expect(result.message).toBe('禁止访问')
    })
  })

  describe('notFound', () => {
    it('应返回 404000 错误码', () => {
      const result = notFound('用户不存在')

      expect(result.code).toBe(ERROR_CODES.NOT_FOUND)
      expect(result.message).toBe('用户不存在')
    })

    it('未提供消息时应使用默认消息', () => {
      const result = notFound()

      expect(result.code).toBe(ERROR_CODES.NOT_FOUND)
      expect(result.message).toBe('资源不存在')
    })
  })

  describe('internalError', () => {
    it('应返回 500000 错误码', () => {
      const result = internalError('数据库连接失败')

      expect(result.code).toBe(ERROR_CODES.INTERNAL_ERROR)
      expect(result.message).toBe('数据库连接失败')
    })

    it('未提供消息时应使用默认消息', () => {
      const result = internalError()

      expect(result.code).toBe(ERROR_CODES.INTERNAL_ERROR)
      expect(result.message).toBe('服务器内部错误')
    })
  })
})
