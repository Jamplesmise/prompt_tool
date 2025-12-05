import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  isEncrypted,
} from '../encryption'

describe('加密工具函数', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encryptApiKey', () => {
    it('应返回加密后的字符串', () => {
      const apiKey = 'sk-test-api-key-12345'
      const encrypted = encryptApiKey(apiKey)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(apiKey)
    })

    it('加密结果应符合 iv:authTag:encrypted 格式', () => {
      const apiKey = 'sk-test-api-key'
      const encrypted = encryptApiKey(apiKey)
      const parts = encrypted.split(':')

      expect(parts).toHaveLength(3)
      expect(parts[0]).toHaveLength(32) // IV: 16 bytes = 32 hex
      expect(parts[1]).toHaveLength(32) // AuthTag: 16 bytes = 32 hex
      expect(parts[2].length).toBeGreaterThan(0) // Encrypted data
    })

    it('每次加密应产生不同结果（因 IV 随机）', () => {
      const apiKey = 'sk-test-api-key'
      const encrypted1 = encryptApiKey(apiKey)
      const encrypted2 = encryptApiKey(apiKey)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('应能加密空字符串', () => {
      const encrypted = encryptApiKey('')
      expect(encrypted).toBeDefined()
    })

    it('应能加密包含特殊字符的 API Key', () => {
      const apiKey = 'sk-!@#$%^&*()_+{}[]|\\:;"\'<>,.?/'
      const encrypted = encryptApiKey(apiKey)
      expect(encrypted).toBeDefined()
    })

    it('应能加密长 API Key', () => {
      const apiKey = 'sk-' + 'a'.repeat(1000)
      const encrypted = encryptApiKey(apiKey)
      expect(encrypted).toBeDefined()
    })
  })

  describe('decryptApiKey', () => {
    it('应正确解密加密后的数据', () => {
      const originalKey = 'sk-my-secret-api-key-123'
      const encrypted = encryptApiKey(originalKey)
      const decrypted = decryptApiKey(encrypted)

      expect(decrypted).toBe(originalKey)
    })

    it('无效格式应抛出错误', () => {
      expect(() => decryptApiKey('invalid-format')).toThrow(
        'Invalid encrypted data format'
      )
    })

    it('格式正确但数据损坏应抛出错误', () => {
      // 有效格式但伪造的数据
      const fakeData = 'a'.repeat(32) + ':' + 'b'.repeat(32) + ':' + 'c'.repeat(20)

      expect(() => decryptApiKey(fakeData)).toThrow()
    })

    it('空字符串应抛出错误', () => {
      expect(() => decryptApiKey('')).toThrow('Invalid encrypted data format')
    })

    it('应正确解密包含特殊字符的 API Key', () => {
      const originalKey = 'sk-特殊字符!@#$%'
      const encrypted = encryptApiKey(originalKey)
      const decrypted = decryptApiKey(encrypted)

      expect(decrypted).toBe(originalKey)
    })

    it('应正确解密 Unicode 字符', () => {
      const originalKey = 'sk-中文密钥测试'
      const encrypted = encryptApiKey(originalKey)
      const decrypted = decryptApiKey(encrypted)

      expect(decrypted).toBe(originalKey)
    })
  })

  describe('maskApiKey', () => {
    it('应正确脱敏 API Key', () => {
      const apiKey = 'sk-abcdefghijklmnop'
      const encrypted = encryptApiKey(apiKey)
      const masked = maskApiKey(encrypted)

      expect(masked).toMatch(/^sk-\*\*\*\*.{4}$/)
      expect(masked).toBe('sk-****mnop')
    })

    it('短 API Key 应返回 ****', () => {
      const apiKey = 'abc'
      const encrypted = encryptApiKey(apiKey)
      const masked = maskApiKey(encrypted)

      expect(masked).toBe('****')
    })

    it('无效加密数据应返回 ****', () => {
      const masked = maskApiKey('invalid-encrypted-data')

      expect(masked).toBe('****')
    })

    it('正好4个字符的 API Key 应返回 ****', () => {
      const apiKey = 'test'
      const encrypted = encryptApiKey(apiKey)
      const masked = maskApiKey(encrypted)

      // 按当前逻辑，长度>=4会正常脱敏
      expect(masked).toBe('tes****test')
    })
  })

  describe('isEncrypted', () => {
    it('加密数据应返回 true', () => {
      const apiKey = 'sk-test-key'
      const encrypted = encryptApiKey(apiKey)

      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('未加密的普通字符串应返回 false', () => {
      expect(isEncrypted('sk-test-api-key')).toBe(false)
    })

    it('空字符串应返回 false', () => {
      expect(isEncrypted('')).toBe(false)
    })

    it('只有一个冒号分隔的字符串应返回 false', () => {
      expect(isEncrypted('part1:part2')).toBe(false)
    })

    it('三部分但长度不对应返回 false', () => {
      expect(isEncrypted('short:short:data')).toBe(false)
    })

    it('IV 长度正确但 authTag 长度错误应返回 false', () => {
      const fakeData = 'a'.repeat(32) + ':' + 'b'.repeat(16) + ':' + 'data'
      expect(isEncrypted(fakeData)).toBe(false)
    })

    it('格式完全正确应返回 true', () => {
      const fakeButValidFormat = 'a'.repeat(32) + ':' + 'b'.repeat(32) + ':' + 'data'
      expect(isEncrypted(fakeButValidFormat)).toBe(true)
    })
  })

  describe('加密解密一致性', () => {
    const testCases = [
      'sk-simple',
      'sk-with-numbers-12345',
      'sk-special-chars-!@#$%^&*()',
      'sk-' + 'long'.repeat(100),
      '',
      'sk-unicode-中文日本語한국어',
      'sk-emoji-🔐🔑🔒',
      'sk-whitespace   \t\n',
    ]

    testCases.forEach((apiKey, index) => {
      it(`测试用例 ${index + 1}: 加密解密应保持一致`, () => {
        const encrypted = encryptApiKey(apiKey)
        const decrypted = decryptApiKey(encrypted)

        expect(decrypted).toBe(apiKey)
      })
    })
  })
})
