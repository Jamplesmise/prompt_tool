import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ModelInvokeError } from '../modelInvoker'

// Mock decryptApiKey
vi.mock('../encryption', () => ({
  decryptApiKey: vi.fn((key: string) => `decrypted_${key}`),
}))

describe('modelInvoker.ts', () => {
  describe('ModelInvokeError', () => {
    it('应该是 Error 的实例', () => {
      const error = new ModelInvokeError('test message')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ModelInvokeError)
    })

    it('应该有正确的 name 属性', () => {
      const error = new ModelInvokeError('test')
      expect(error.name).toBe('ModelInvokeError')
    })

    it('应该保存 statusCode', () => {
      const error = new ModelInvokeError('not found', 404)
      expect(error.message).toBe('not found')
      expect(error.statusCode).toBe(404)
    })

    it('statusCode 可以为 undefined', () => {
      const error = new ModelInvokeError('network error')
      expect(error.statusCode).toBeUndefined()
    })
  })

  // 注意：invokeModel 函数依赖 fetch，需要 mock fetch 才能进行完整测试
  // 这里提供基础测试结构，实际使用时可以配合 msw 或 fetch mock 进行测试

  describe('invokeModel - OpenAI 格式', () => {
    const originalFetch = global.fetch

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('应该正确构建 OpenAI 请求', async () => {
      let capturedUrl: string = ''
      let capturedOptions: RequestInit = {}

      global.fetch = vi.fn().mockImplementation((url: string, options: RequestInit) => {
        capturedUrl = url
        capturedOptions = options
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'Hello!' } }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
        })
      })

      const { invokeModel } = await import('../modelInvoker')

      const model = {
        id: 'model-1',
        modelId: 'gpt-4',
        provider: {
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          headers: {},
        },
        config: {},
      }

      const result = await invokeModel(model, {
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(capturedUrl).toBe('https://api.openai.com/v1/chat/completions')
      expect(JSON.parse(capturedOptions.body as string)).toMatchObject({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      })
      expect(result.output).toBe('Hello!')
      expect(result.tokens).toEqual({ input: 10, output: 5, total: 15 })
    })

    it('应该正确解析 Anthropic 响应', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: 'Hello from Claude!' }],
            usage: { input_tokens: 8, output_tokens: 4 },
          }),
      })

      const { invokeModel } = await import('../modelInvoker')

      const model = {
        id: 'model-2',
        modelId: 'claude-3-opus',
        provider: {
          type: 'anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          apiKey: 'sk-ant-test',
          headers: {},
        },
        config: {},
      }

      const result = await invokeModel(model, {
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result.output).toBe('Hello from Claude!')
      expect(result.tokens).toEqual({ input: 8, output: 4, total: 12 })
    })

    it('应该在请求失败时抛出 ModelInvokeError', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () =>
          Promise.resolve({
            error: { message: 'Invalid API key' },
          }),
      })

      const { invokeModel } = await import('../modelInvoker')

      const model = {
        id: 'model-1',
        modelId: 'gpt-4',
        provider: {
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'invalid',
          headers: {},
        },
        config: {},
      }

      await expect(
        invokeModel(model, { messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow(ModelInvokeError)
    })

    it('应该计算费用', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
            usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
          }),
      })

      const { invokeModel } = await import('../modelInvoker')

      const model = {
        id: 'model-1',
        modelId: 'gpt-4',
        provider: {
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          headers: {},
        },
        config: {},
        pricing: {
          inputPerMillion: 30, // $30 per million input tokens
          outputPerMillion: 60, // $60 per million output tokens
        },
      }

      const result = await invokeModel(model, {
        messages: [{ role: 'user', content: 'Hi' }],
      })

      // 1000 input tokens = 0.03, 500 output tokens = 0.03, total = 0.06
      expect(result.cost).toBeCloseTo(0.06, 5)
    })

    it('没有定价信息时费用应为 null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          }),
      })

      const { invokeModel } = await import('../modelInvoker')

      const model = {
        id: 'model-1',
        modelId: 'custom-model',
        provider: {
          type: 'custom',
          baseUrl: 'https://custom.api',
          apiKey: 'key',
          headers: {},
        },
        config: {},
      }

      const result = await invokeModel(model, {
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result.cost).toBeNull()
    })

    it('应该记录延迟', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    choices: [{ message: { content: 'Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                  }),
              }),
            50
          )
        )
      )

      const { invokeModel } = await import('../modelInvoker')

      const model = {
        id: 'model-1',
        modelId: 'gpt-4',
        provider: {
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          headers: {},
        },
        config: {},
      }

      const result = await invokeModel(model, {
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result.latencyMs).toBeGreaterThanOrEqual(45)
    })
  })
})
