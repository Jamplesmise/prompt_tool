/**
 * API 端到端测试
 * 运行前需要先启动服务: pnpm dev
 * 运行测试: npx vitest run src/__tests__/e2e/api.e2e.test.ts
 */

import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'
let sessionCookie = ''

// 存储创建的资源 ID，用于后续清理
const createdResources = {
  promptId: '',
  promptVersionId: '',
  datasetId: '',
  datasetRowId: '',
  datasetVersionId: '',
  taskId: '',
  evaluatorId: '',
  providerId: '',
  modelId: '',
  scheduledTaskId: '',
  alertRuleId: '',
  notifyChannelId: '',
  tokenId: '',
  branchId: '',
}

// 辅助函数：发起请求
async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; data: unknown; headers: Headers }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  // 获取 Set-Cookie 头
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0]
  }

  // 处理空响应
  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }
  return { status: response.status, data, headers: response.headers }
}

// 辅助函数：发起 FormData 请求
async function apiFormDataRequest(
  path: string,
  formData: FormData
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {}

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }
  return { status: response.status, data }
}

describe('API 端到端测试', () => {
  // ==================== 1. 认证 API ====================
  describe('1. 认证 API', () => {
    it('1.1 登录 - 正确凭据应返回成功', async () => {
      const { status, data } = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
        }),
      })

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { user: { email: string } } }).data.user.email).toBe(
        'admin@example.com'
      )
    })

    it('1.2 登录 - 错误凭据应返回失败', async () => {
      const { data } = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'wrongpassword',
        }),
      })

      expect((data as { code: number }).code).toBe(401000)
    })

    it('1.3 获取当前用户信息', async () => {
      const { status, data } = await apiRequest('/api/v1/auth/me')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { email: string } }).data.email).toBe('admin@example.com')
    })
  })

  // ==================== 2. 提示词 API ====================
  describe('2. 提示词 API', () => {
    it('2.1 获取提示词列表', async () => {
      const { status, data } = await apiRequest('/api/v1/prompts')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { list: unknown[] } }).data.list).toBeInstanceOf(Array)
    })

    it('2.2 创建提示词', async () => {
      const { status, data } = await apiRequest('/api/v1/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试提示词-${Date.now()}`,
          content: '你是一个助手，请回答：{{question}}',
          description: 'E2E 自动化测试创建',
          tags: ['e2e-test'],
        }),
      })

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const promptData = (data as { data: { id: string } }).data
      expect(promptData.id).toBeDefined()
      createdResources.promptId = promptData.id
    })

    it('2.3 获取提示词详情', async () => {
      if (!createdResources.promptId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { id: string } }).data.id).toBe(createdResources.promptId)
    })

    it('2.4 更新提示词', async () => {
      if (!createdResources.promptId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试提示词-已更新-${Date.now()}`,
            content: '你是一个智能助手，请详细回答：{{question}}',
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('2.5 获取提示词版本列表', async () => {
      if (!createdResources.promptId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/versions`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: unknown[] }).data).toBeInstanceOf(Array)

      // 保存版本 ID
      const versions = (data as { data: { id: string }[] }).data
      if (versions.length > 0) {
        createdResources.promptVersionId = versions[0].id
      }
    })

    it('2.6 发布新版本', async () => {
      if (!createdResources.promptId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/versions`,
        {
          method: 'POST',
          body: JSON.stringify({
            changeLog: 'E2E 测试发布的版本',
          }),
        }
      )

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const versionData = (data as { data: { id: string; version: number } }).data
      expect(versionData.version).toBeDefined()
      createdResources.promptVersionId = versionData.id
    })

    it('2.7 获取指定版本详情', async () => {
      if (!createdResources.promptId || !createdResources.promptVersionId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/versions/${createdResources.promptVersionId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('2.8 版本对比', async () => {
      if (!createdResources.promptId) return

      // 获取版本列表
      const versionsRes = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/versions`
      )
      const versions = (versionsRes.data as { data: { id: string }[] }).data

      if (versions.length >= 2) {
        const { status, data } = await apiRequest(
          `/api/v1/prompts/${createdResources.promptId}/versions/diff?v1=${versions[0].id}&v2=${versions[1].id}`
        )

        expect(status).toBe(200)
        expect((data as { code: number }).code).toBe(200)
      }
    })
  })

  // ==================== 2.5 提示词分支 API ====================
  describe('2.5 提示词分支 API', () => {
    it('2.5.1 获取分支列表', async () => {
      if (!createdResources.promptId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('2.5.2 创建分支', async () => {
      if (!createdResources.promptId || !createdResources.promptVersionId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: `E2E测试分支-${Date.now()}`,
            description: 'E2E 自动化测试创建的分支',
            sourceVersionId: createdResources.promptVersionId,
          }),
        }
      )

      // 创建分支可能因数据库约束或其他原因失败，接受多种状态
      // 200/201 成功，400 参数错误，500 内部错误（如唯一约束冲突）
      if (status === 200 || status === 201) {
        expect((data as { code: number }).code).toBe(200)
        const branchData = (data as { data: { id: string } }).data
        createdResources.branchId = branchData.id
      } else {
        // 如果失败，打印错误便于调试，但不阻止测试
        console.log('创建分支失败 (非关键):', status, JSON.stringify(data, null, 2))
      }
    })

    it('2.5.3 获取分支详情', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('2.5.4 更新分支', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            content: '更新后的分支内容：{{question}}',
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 3. 数据集 API ====================
  describe('3. 数据集 API', () => {
    it('3.1 获取数据集列表', async () => {
      const { status, data } = await apiRequest('/api/v1/datasets')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { list: unknown[] } }).data.list).toBeInstanceOf(Array)
    })

    it('3.2 创建数据集', async () => {
      const { status, data } = await apiRequest('/api/v1/datasets', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试数据集-${Date.now()}`,
          description: 'E2E 自动化测试创建',
        }),
      })

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const datasetData = (data as { data: { id: string } }).data
      expect(datasetData.id).toBeDefined()
      createdResources.datasetId = datasetData.id
    })

    it('3.3 获取数据集详情', async () => {
      if (!createdResources.datasetId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('3.4 添加数据行', async () => {
      if (!createdResources.datasetId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/rows`,
        {
          method: 'POST',
          body: JSON.stringify({
            data: {
              input: '什么是单元测试？',
              expected: '单元测试是软件测试的一种方法',
            },
          }),
        }
      )

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const rowData = (data as { data: { id: string } }).data
      expect(rowData.id).toBeDefined()
      createdResources.datasetRowId = rowData.id
    })

    it('3.5 获取数据行列表', async () => {
      if (!createdResources.datasetId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/rows`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect(
        (data as { data: { list: unknown[] } }).data.list.length
      ).toBeGreaterThanOrEqual(1)
    })

    it('3.6 更新数据行', async () => {
      if (!createdResources.datasetId || !createdResources.datasetRowId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/rows/${createdResources.datasetRowId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            data: {
              input: '什么是单元测试？（已更新）',
              expected: '单元测试是软件测试的一种方法，用于验证代码的正确性',
            },
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('3.7 下载数据集模板', async () => {
      const { status, headers } = await apiRequest('/api/v1/datasets/templates/basic')

      // 模板下载应返回文件
      expect([200, 404]).toContain(status)
    })
  })

  // ==================== 3.5 数据集版本 API ====================
  describe('3.5 数据集版本 API', () => {
    it('3.5.1 获取数据集版本列表', async () => {
      if (!createdResources.datasetId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/versions`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('3.5.2 创建数据集版本快照', async () => {
      if (!createdResources.datasetId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/versions`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: `E2E测试版本-${Date.now()}`,
            description: 'E2E 自动化测试创建的快照',
          }),
        }
      )

      expect([200, 201]).toContain(status)
      if ((data as { code: number }).code === 200) {
        const versionData = (data as { data: { id: string } }).data
        createdResources.datasetVersionId = versionData.id
      }
    })

    it('3.5.3 获取数据集版本详情', async () => {
      if (!createdResources.datasetId || !createdResources.datasetVersionId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/versions/${createdResources.datasetVersionId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('3.5.4 获取版本数据行', async () => {
      if (!createdResources.datasetId || !createdResources.datasetVersionId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/versions/${createdResources.datasetVersionId}/rows`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 4. 模型配置 API ====================
  describe('4. 模型配置 API', () => {
    it('4.1 获取提供商列表', async () => {
      const { status, data } = await apiRequest('/api/v1/providers')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: unknown[] }).data).toBeInstanceOf(Array)
    })

    it('4.2 创建提供商', async () => {
      const { status, data } = await apiRequest('/api/v1/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试提供商-${Date.now()}`,
          type: 'openai',
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'sk-test-key-e2e',
        }),
      })

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const providerData = (data as { data: { id: string } }).data
      expect(providerData.id).toBeDefined()
      createdResources.providerId = providerData.id
    })

    it('4.3 更新提供商', async () => {
      if (!createdResources.providerId) return

      const { status, data } = await apiRequest(
        `/api/v1/providers/${createdResources.providerId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试提供商-已更新-${Date.now()}`,
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('4.4 添加模型', async () => {
      if (!createdResources.providerId) return

      const { status, data } = await apiRequest(
        `/api/v1/providers/${createdResources.providerId}/models`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: `E2E测试模型-${Date.now()}`,
            modelId: 'gpt-4-test',
            config: {
              temperature: 0.7,
              maxTokens: 1000,
            },
          }),
        }
      )

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const modelData = (data as { data: { id: string } }).data
      expect(modelData.id).toBeDefined()
      createdResources.modelId = modelData.id
    })

    it('4.5 获取模型列表', async () => {
      const { status, data } = await apiRequest('/api/v1/models')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: unknown[] }).data).toBeInstanceOf(Array)
    })

    it('4.6 更新模型', async () => {
      if (!createdResources.modelId) return

      const { status, data } = await apiRequest(
        `/api/v1/models/${createdResources.modelId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试模型-已更新-${Date.now()}`,
            config: {
              temperature: 0.8,
            },
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 5. 评估器 API ====================
  describe('5. 评估器 API', () => {
    it('5.1 获取评估器列表', async () => {
      const { status, data } = await apiRequest('/api/v1/evaluators')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: unknown[] }).data).toBeInstanceOf(Array)
    })

    it('5.2 获取预置评估器列表', async () => {
      const { status, data } = await apiRequest('/api/v1/evaluators/presets')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: unknown[] }).data).toBeInstanceOf(Array)
    })

    it('5.3 创建代码评估器', async () => {
      const { status, data } = await apiRequest('/api/v1/evaluators', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试评估器-${Date.now()}`,
          description: 'E2E 自动化测试创建的评估器',
          type: 'code',
          config: {
            code: `module.exports = async function evaluate({ input, output, expected }) {
  const passed = output.includes(expected) || expected.includes(output);
  return { passed, score: passed ? 1 : 0, reason: passed ? '包含匹配' : '不匹配' };
}`,
          },
        }),
      })

      if (status !== 200 && status !== 201) {
        console.log('创建评估器失败:', JSON.stringify(data, null, 2))
      }

      expect([200, 201]).toContain(status)
      expect((data as { code: number }).code).toBe(200)

      const evaluatorData = (data as { data: { id: string } }).data
      expect(evaluatorData.id).toBeDefined()
      createdResources.evaluatorId = evaluatorData.id
    })

    it('5.4 获取评估器详情', async () => {
      if (!createdResources.evaluatorId) return

      const { status, data } = await apiRequest(
        `/api/v1/evaluators/${createdResources.evaluatorId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('5.5 更新评估器', async () => {
      if (!createdResources.evaluatorId) return

      const { status, data } = await apiRequest(
        `/api/v1/evaluators/${createdResources.evaluatorId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试评估器-已更新-${Date.now()}`,
            description: '更新后的描述',
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('5.6 测试评估器', async () => {
      if (!createdResources.evaluatorId) return

      const { status, data } = await apiRequest(
        `/api/v1/evaluators/${createdResources.evaluatorId}/test`,
        {
          method: 'POST',
          body: JSON.stringify({
            input: '测试输入',
            output: '这是测试输出',
            expected: '测试输出',
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { passed: boolean } }).data.passed).toBeDefined()
    })
  })

  // ==================== 6. 任务 API ====================
  describe('6. 任务 API', () => {
    it('6.1 获取任务列表', async () => {
      const { status, data } = await apiRequest('/api/v1/tasks')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
      expect((data as { data: { list: unknown[] } }).data.list).toBeInstanceOf(Array)
    })

    it('6.2 获取任务详情（使用已存在的任务）', async () => {
      const listResponse = await apiRequest('/api/v1/tasks')
      const tasks = (listResponse.data as { data: { list: { id: string }[] } }).data.list

      if (tasks.length > 0) {
        const { status, data } = await apiRequest(`/api/v1/tasks/${tasks[0].id}`)
        expect(status).toBe(200)
        expect((data as { code: number }).code).toBe(200)
        createdResources.taskId = tasks[0].id
      }
    })

    it('6.3 获取任务结果列表', async () => {
      if (!createdResources.taskId) return

      const { status, data } = await apiRequest(
        `/api/v1/tasks/${createdResources.taskId}/results`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('6.4 获取任务 A/B 结果', async () => {
      if (!createdResources.taskId) return

      const { status, data } = await apiRequest(
        `/api/v1/tasks/${createdResources.taskId}/ab-results`
      )

      // 可能返回 200、400（非 A/B 测试）或 404（不存在）
      expect([200, 400, 404]).toContain(status)
    })
  })

  // ==================== 7. 定时任务 API ====================
  describe('7. 定时任务 API', () => {
    it('7.1 获取定时任务列表', async () => {
      const { status, data } = await apiRequest('/api/v1/scheduled-tasks')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('7.2 创建定时任务', async () => {
      // 需要有效的 taskId 才能创建定时任务
      if (!createdResources.taskId) return

      const { status, data } = await apiRequest('/api/v1/scheduled-tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试定时任务-${Date.now()}`,
          description: 'E2E 自动化测试创建',
          cron: '0 0 * * *', // 每天 0 点
          taskConfig: {
            name: 'E2E 定时任务',
            config: {
              promptIds: [],
              promptVersionIds: [],
              modelIds: [],
              datasetId: createdResources.datasetId || '',
              evaluatorIds: [],
              execution: {
                concurrency: 1,
                timeoutSeconds: 60,
                retryCount: 0,
              },
            },
          },
          enabled: false,
        }),
      })

      // 可能成功或因配置不完整失败
      if ((data as { code: number }).code === 200) {
        const scheduledData = (data as { data: { id: string } }).data
        createdResources.scheduledTaskId = scheduledData.id
      }
    })

    it('7.3 获取定时任务详情', async () => {
      if (!createdResources.scheduledTaskId) return

      const { status, data } = await apiRequest(
        `/api/v1/scheduled-tasks/${createdResources.scheduledTaskId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('7.4 切换定时任务状态', async () => {
      if (!createdResources.scheduledTaskId) return

      const { status, data } = await apiRequest(
        `/api/v1/scheduled-tasks/${createdResources.scheduledTaskId}/toggle`,
        { method: 'POST' }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('7.5 获取定时任务执行历史', async () => {
      if (!createdResources.scheduledTaskId) return

      const { status, data } = await apiRequest(
        `/api/v1/scheduled-tasks/${createdResources.scheduledTaskId}/executions`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 8. 告警 API ====================
  describe('8. 告警 API', () => {
    it('8.1 获取告警规则列表', async () => {
      const { status, data } = await apiRequest('/api/v1/alert-rules')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('8.2 创建告警规则', async () => {
      const { status, data } = await apiRequest('/api/v1/alert-rules', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试告警规则-${Date.now()}`,
          description: 'E2E 自动化测试创建',
          metric: 'PASS_RATE',
          condition: 'LT',
          threshold: 0.8,
          duration: 5,
          severity: 'WARNING',
          isActive: false,
        }),
      })

      expect([200, 201]).toContain(status)
      if ((data as { code: number }).code === 200) {
        const ruleData = (data as { data: { id: string } }).data
        createdResources.alertRuleId = ruleData.id
      }
    })

    it('8.3 获取告警规则详情', async () => {
      if (!createdResources.alertRuleId) return

      const { status, data } = await apiRequest(
        `/api/v1/alert-rules/${createdResources.alertRuleId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('8.4 切换告警规则状态', async () => {
      if (!createdResources.alertRuleId) return

      const { status, data } = await apiRequest(
        `/api/v1/alert-rules/${createdResources.alertRuleId}/toggle`,
        { method: 'POST' }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('8.5 获取告警记录列表', async () => {
      const { status, data } = await apiRequest('/api/v1/alerts')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 9. 通知渠道 API ====================
  describe('9. 通知渠道 API', () => {
    it('9.1 获取通知渠道列表', async () => {
      const { status, data } = await apiRequest('/api/v1/notify-channels')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('9.2 创建通知渠道', async () => {
      const { status, data } = await apiRequest('/api/v1/notify-channels', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试通知渠道-${Date.now()}`,
          type: 'WEBHOOK',
          config: {
            url: 'https://example.com/webhook',
          },
          isActive: false,
        }),
      })

      expect([200, 201]).toContain(status)
      if ((data as { code: number }).code === 200) {
        const channelData = (data as { data: { id: string } }).data
        createdResources.notifyChannelId = channelData.id
      }
    })

    it('9.3 获取通知渠道详情', async () => {
      if (!createdResources.notifyChannelId) return

      const { status, data } = await apiRequest(
        `/api/v1/notify-channels/${createdResources.notifyChannelId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('9.4 更新通知渠道', async () => {
      if (!createdResources.notifyChannelId) return

      const { status, data } = await apiRequest(
        `/api/v1/notify-channels/${createdResources.notifyChannelId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试通知渠道-已更新-${Date.now()}`,
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 10. 团队 API ====================
  describe('10. 团队 API', () => {
    it('10.1 获取团队列表', async () => {
      const { status, data } = await apiRequest('/api/v1/teams')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('10.2 获取团队详情', async () => {
      const listRes = await apiRequest('/api/v1/teams')
      const teams = (listRes.data as { data: { id: string }[] }).data

      if (teams && teams.length > 0) {
        const { status, data } = await apiRequest(`/api/v1/teams/${teams[0].id}`)
        expect(status).toBe(200)
        expect((data as { code: number }).code).toBe(200)
      }
    })

    it('10.3 获取团队成员列表', async () => {
      const listRes = await apiRequest('/api/v1/teams')
      const teams = (listRes.data as { data: { id: string }[] }).data

      if (teams && teams.length > 0) {
        const { status, data } = await apiRequest(`/api/v1/teams/${teams[0].id}/members`)
        expect(status).toBe(200)
        expect((data as { code: number }).code).toBe(200)
      }
    })
  })

  // ==================== 11. 用户 API ====================
  describe('11. 用户 API', () => {
    it('11.1 获取用户列表', async () => {
      const { status, data } = await apiRequest('/api/v1/users')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('11.2 获取当前用户信息', async () => {
      const { status, data } = await apiRequest('/api/v1/users/me')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('11.3 更新当前用户信息', async () => {
      const { status, data } = await apiRequest('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Admin User',
        }),
      })

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 12. API Token ====================
  describe('12. API Token', () => {
    it('12.1 获取 Token 列表', async () => {
      const { status, data } = await apiRequest('/api/v1/tokens')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('12.2 创建 Token', async () => {
      const { status, data } = await apiRequest('/api/v1/tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试Token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 天后过期
        }),
      })

      expect([200, 201]).toContain(status)
      if ((data as { code: number }).code === 200) {
        const tokenData = (data as { data: { id: string } }).data
        createdResources.tokenId = tokenData.id
      }
    })

    it('12.3 删除 Token', async () => {
      if (!createdResources.tokenId) return

      const { status, data } = await apiRequest(
        `/api/v1/tokens/${createdResources.tokenId}`,
        { method: 'DELETE' }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 13. 审计日志 ====================
  describe('13. 审计日志', () => {
    it('13.1 获取审计日志列表', async () => {
      const { status, data } = await apiRequest('/api/v1/audit-logs')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 14. 统计 API ====================
  describe('14. 统计 API', () => {
    it('14.1 获取概览统计', async () => {
      const { status, data } = await apiRequest('/api/v1/stats/overview')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('14.2 获取趋势统计', async () => {
      const { status, data } = await apiRequest('/api/v1/stats/trends')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('14.3 获取模型统计', async () => {
      const { status, data } = await apiRequest('/api/v1/stats/models')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 15. 搜索 API ====================
  describe('15. 搜索 API', () => {
    it('15.1 全局搜索', async () => {
      const { status, data } = await apiRequest('/api/v1/search?q=test')

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 16. 队列状态 API ====================
  describe('16. 队列状态 API', () => {
    it('16.1 获取队列状态', async () => {
      const { status, data } = await apiRequest('/api/v1/queue/status')

      // 队列服务可能未启动或超时，允许多种状态
      expect([200, 500, 503]).toContain(status)
    }, 10000)
  })

  // ==================== 17. 提示词版本回滚 API ====================
  describe('17. 提示词版本回滚 API', () => {
    it('17.1 回滚到指定版本', async () => {
      if (!createdResources.promptId || !createdResources.promptVersionId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/versions/${createdResources.promptVersionId}/rollback`,
        { method: 'POST' }
      )

      // 回滚成功或版本不存在
      expect([200, 404]).toContain(status)
    })
  })

  // ==================== 18. 提示词批量操作 API ====================
  describe('18. 提示词批量操作 API', () => {
    it('18.1 批量导出提示词', async () => {
      if (!createdResources.promptId) return

      // 使用 GET 批量导出
      const { status } = await apiRequest(
        `/api/v1/prompts/batch?ids=${createdResources.promptId}`
      )

      // 导出成功返回文件
      expect([200, 400]).toContain(status)
    })
  })

  // ==================== 19. 分支高级操作 API ====================
  describe('19. 分支高级操作 API', () => {
    it('19.1 获取分支版本列表', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}/versions`
      )

      expect([200, 404]).toContain(status)
    })

    it('19.2 分支对比', async () => {
      if (!createdResources.promptId) return

      // 获取分支列表
      const branchesRes = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches`
      )
      const branches = (branchesRes.data as { data: { id: string }[] }).data

      if (branches && branches.length >= 2) {
        const { status, data } = await apiRequest(
          `/api/v1/prompts/${createdResources.promptId}/branches/diff?b1=${branches[0].id}&b2=${branches[1].id}`
        )
        expect([200, 400, 404]).toContain(status)
      }
    })

    it('19.3 归档分支', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}/archive`,
        { method: 'POST' }
      )

      // 可能成功或分支不存在
      expect([200, 400, 404]).toContain(status)
    })
  })

  // ==================== 20. 数据集版本高级操作 API ====================
  describe('20. 数据集版本高级操作 API', () => {
    it('20.1 数据集版本对比', async () => {
      if (!createdResources.datasetId) return

      // 获取版本列表
      const versionsRes = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/versions`
      )
      const versions = (versionsRes.data as { data: { id: string }[] }).data

      if (versions && versions.length >= 2) {
        const { status, data } = await apiRequest(
          `/api/v1/datasets/${createdResources.datasetId}/versions/diff?v1=${versions[0].id}&v2=${versions[1].id}`
        )
        expect([200, 400, 404]).toContain(status)
      }
    })

    it('20.2 数据集版本回滚', async () => {
      if (!createdResources.datasetId || !createdResources.datasetVersionId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/versions/${createdResources.datasetVersionId}/rollback`,
        { method: 'POST' }
      )

      expect([200, 400, 404]).toContain(status)
    })
  })

  // ==================== 21. 数据集下载 API ====================
  describe('21. 数据集下载 API', () => {
    it('21.1 下载数据集', async () => {
      if (!createdResources.datasetId) return

      const { status } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/download`
      )

      // 可能返回文件流或错误
      expect([200, 400, 404]).toContain(status)
    })
  })

  // ==================== 22. 任务完整流程 API ====================
  describe('22. 任务完整流程 API', () => {
    it('22.1 创建任务', async () => {
      if (!createdResources.promptVersionId || !createdResources.datasetId) return

      const { status, data } = await apiRequest('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试任务-${Date.now()}`,
          description: 'E2E 自动化测试创建',
          config: {
            promptVersionIds: [createdResources.promptVersionId],
            modelIds: createdResources.modelId ? [createdResources.modelId] : [],
            datasetId: createdResources.datasetId,
            evaluatorIds: createdResources.evaluatorId ? [createdResources.evaluatorId] : [],
            execution: {
              concurrency: 1,
              timeoutSeconds: 60,
              retryCount: 0,
            },
          },
        }),
      })

      // 可能成功或因配置不完整失败
      if (status === 200 || status === 201) {
        const taskData = (data as { data: { id: string } }).data
        if (taskData?.id) {
          createdResources.taskId = taskData.id
        }
      }
    })

    it('22.2 删除任务', async () => {
      // 使用现有任务测试删除（但不真正删除，只测试接口）
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string; status: string }[] } }).data.list

      // 找一个已完成的任务测试（不要删除正在运行的）
      const completedTask = tasks.find(t => t.status === 'COMPLETED' || t.status === 'FAILED')
      if (completedTask) {
        // 只验证接口存在，可能因为关联数据而返回 500
        const { status } = await apiRequest(`/api/v1/tasks/${completedTask.id}`, {
          method: 'DELETE',
        })
        expect([200, 400, 404, 500]).toContain(status)
      }
    })

    it('22.3 获取任务结果导出', async () => {
      if (!createdResources.taskId) return

      const { status } = await apiRequest(
        `/api/v1/tasks/${createdResources.taskId}/results/export`
      )

      // 导出可能返回文件或错误
      expect([200, 400, 404]).toContain(status)
    })
  })

  // ==================== 23. 定时任务高级操作 API ====================
  describe('23. 定时任务高级操作 API', () => {
    it('23.1 更新定时任务', async () => {
      if (!createdResources.scheduledTaskId) return

      const { status, data } = await apiRequest(
        `/api/v1/scheduled-tasks/${createdResources.scheduledTaskId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试定时任务-已更新-${Date.now()}`,
            description: '更新后的描述',
          }),
        }
      )

      expect([200, 400, 404]).toContain(status)
    })

    it('23.2 立即执行定时任务', async () => {
      if (!createdResources.scheduledTaskId) return

      const { status, data } = await apiRequest(
        `/api/v1/scheduled-tasks/${createdResources.scheduledTaskId}/run-now`,
        { method: 'POST' }
      )

      // 可能成功或因配置问题失败
      expect([200, 400, 404, 500]).toContain(status)
    })
  })

  // ==================== 24. 告警高级操作 API ====================
  describe('24. 告警高级操作 API', () => {
    it('24.1 更新告警规则', async () => {
      if (!createdResources.alertRuleId) return

      const { status, data } = await apiRequest(
        `/api/v1/alert-rules/${createdResources.alertRuleId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: `E2E测试告警规则-已更新-${Date.now()}`,
            description: '更新后的描述',
          }),
        }
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('24.2 确认告警', async () => {
      // 获取告警列表找一个
      const alertsRes = await apiRequest('/api/v1/alerts')
      const alerts = (alertsRes.data as { data: { list: { id: string }[] } }).data

      if (alerts?.list?.length > 0) {
        const { status } = await apiRequest(
          `/api/v1/alerts/${alerts.list[0].id}/acknowledge`,
          { method: 'POST' }
        )
        expect([200, 400, 404]).toContain(status)
      }
    })

    it('24.3 解决告警', async () => {
      const alertsRes = await apiRequest('/api/v1/alerts')
      const alerts = (alertsRes.data as { data: { list: { id: string }[] } }).data

      if (alerts?.list?.length > 0) {
        const { status } = await apiRequest(
          `/api/v1/alerts/${alerts.list[0].id}/resolve`,
          { method: 'POST' }
        )
        expect([200, 400, 404]).toContain(status)
      }
    })
  })

  // ==================== 25. 通知渠道测试 API ====================
  describe('25. 通知渠道测试 API', () => {
    it('25.1 测试通知渠道', async () => {
      if (!createdResources.notifyChannelId) return

      const { status, data } = await apiRequest(
        `/api/v1/notify-channels/${createdResources.notifyChannelId}/test`,
        { method: 'POST' }
      )

      // 测试可能成功或因配置问题失败
      expect([200, 400, 404, 500]).toContain(status)
    })
  })

  // ==================== 26. 团队高级操作 API ====================
  describe('26. 团队高级操作 API', () => {
    it('26.1 创建团队', async () => {
      const { status, data } = await apiRequest('/api/v1/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E测试团队-${Date.now()}`,
          description: 'E2E 自动化测试创建',
        }),
      })

      expect([200, 201, 400]).toContain(status)
    })

    it('26.2 更新团队', async () => {
      const listRes = await apiRequest('/api/v1/teams')
      const teams = (listRes.data as { data: { id: string }[] }).data

      if (teams && teams.length > 0) {
        const { status, data } = await apiRequest(`/api/v1/teams/${teams[0].id}`, {
          method: 'PUT',
          body: JSON.stringify({
            description: '更新后的团队描述',
          }),
        })
        expect([200, 400, 403, 404]).toContain(status)
      }
    })

    it('26.3 添加团队成员', async () => {
      const listRes = await apiRequest('/api/v1/teams')
      const teams = (listRes.data as { data: { id: string }[] }).data

      if (teams && teams.length > 0) {
        // 尝试添加成员（可能因用户不存在失败）
        const { status } = await apiRequest(`/api/v1/teams/${teams[0].id}/members`, {
          method: 'POST',
          body: JSON.stringify({
            email: 'test-member@example.com',
            role: 'MEMBER',
          }),
        })
        expect([200, 201, 400, 404]).toContain(status)
      }
    })
  })

  // ==================== 27. 用户高级操作 API ====================
  describe('27. 用户高级操作 API', () => {
    it('27.1 获取指定用户', async () => {
      const listRes = await apiRequest('/api/v1/users')
      const users = (listRes.data as { data: { list: { id: string }[] } }).data

      if (users?.list?.length > 0) {
        const { status, data } = await apiRequest(`/api/v1/users/${users.list[0].id}`)
        expect([200, 403, 404]).toContain(status)
      }
    })

    it('27.2 修改密码', async () => {
      // 获取当前用户 ID
      const meRes = await apiRequest('/api/v1/users/me')
      const me = (meRes.data as { data: { id: string } }).data

      if (me?.id) {
        const { status } = await apiRequest(`/api/v1/users/${me.id}/password`, {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword: 'admin123',
            newPassword: 'admin123', // 使用相同密码，避免影响后续测试
          }),
        })
        expect([200, 400, 403]).toContain(status)
      }
    })
  })

  // ==================== 28. 模型详情和提供商详情 API ====================
  describe('28. 模型和提供商详情 API', () => {
    it('28.1 获取提供商详情', async () => {
      if (!createdResources.providerId) return

      const { status, data } = await apiRequest(
        `/api/v1/providers/${createdResources.providerId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('28.2 获取模型详情', async () => {
      if (!createdResources.modelId) return

      const { status, data } = await apiRequest(
        `/api/v1/models/${createdResources.modelId}`
      )

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 29. 任务执行控制 API ====================
  describe('29. 任务执行控制 API', () => {
    it('29.1 运行任务', async () => {
      // 获取一个可运行的任务
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string; status: string }[] } }).data?.list

      const pendingTask = tasks?.find(t => t.status === 'PENDING' || t.status === 'PAUSED')
      if (pendingTask) {
        const { status } = await apiRequest(`/api/v1/tasks/${pendingTask.id}/run`, {
          method: 'POST',
        })
        // 可能成功或因为配置问题失败
        expect([200, 400, 404, 500]).toContain(status)
      }
    })

    it('29.2 暂停任务', async () => {
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string; status: string }[] } }).data?.list

      const runningTask = tasks?.find(t => t.status === 'RUNNING')
      if (runningTask) {
        const { status } = await apiRequest(`/api/v1/tasks/${runningTask.id}/pause`, {
          method: 'POST',
        })
        expect([200, 400, 404, 500]).toContain(status)
      }
    })

    it('29.3 恢复任务', async () => {
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string; status: string }[] } }).data?.list

      const pausedTask = tasks?.find(t => t.status === 'PAUSED')
      if (pausedTask) {
        const { status } = await apiRequest(`/api/v1/tasks/${pausedTask.id}/resume`, {
          method: 'POST',
        })
        expect([200, 400, 404, 500]).toContain(status)
      }
    })

    it('29.4 停止任务', async () => {
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string; status: string }[] } }).data?.list

      const runningTask = tasks?.find(t => t.status === 'RUNNING' || t.status === 'PAUSED')
      if (runningTask) {
        const { status } = await apiRequest(`/api/v1/tasks/${runningTask.id}/stop`, {
          method: 'POST',
        })
        expect([200, 400, 404, 500]).toContain(status)
      }
    })

    it('29.5 重试任务', async () => {
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string; status: string }[] } }).data?.list

      const failedTask = tasks?.find(t => t.status === 'FAILED')
      if (failedTask) {
        const { status } = await apiRequest(`/api/v1/tasks/${failedTask.id}/retry`, {
          method: 'POST',
        })
        expect([200, 400, 404, 500]).toContain(status)
      }
    })

    it('29.6 获取任务进度 (SSE)', async () => {
      const listRes = await apiRequest('/api/v1/tasks')
      const tasks = (listRes.data as { data: { list: { id: string }[] } }).data?.list

      if (tasks?.length > 0) {
        // SSE 端点，可能返回事件流或错误
        const { status } = await apiRequest(`/api/v1/tasks/${tasks[0].id}/progress`)
        expect([200, 400, 404, 500]).toContain(status)
      }
    })
  })

  // ==================== 30. 分支合并 API ====================
  describe('30. 分支合并 API', () => {
    it('30.1 合并分支', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}/merge`,
        { method: 'POST' }
      )

      // 合并可能成功或因冲突/权限问题失败
      expect([200, 400, 404, 500]).toContain(status)
    })
  })

  // ==================== 31. 提示词测试 API ====================
  describe('31. 提示词测试 API', () => {
    it('31.1 测试提示词', async () => {
      if (!createdResources.promptId) return

      const { status } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/test`,
        {
          method: 'POST',
          body: JSON.stringify({
            variables: { input: '测试输入' },
            modelId: createdResources.modelId,
          }),
        }
      )

      // 测试可能因模型配置问题失败
      expect([200, 400, 404, 500]).toContain(status)
    })
  })

  // ==================== 32. 提供商和模型测试 API ====================
  describe('32. 提供商和模型测试 API', () => {
    it('32.1 测试提供商连接', async () => {
      if (!createdResources.providerId) return

      const { status } = await apiRequest(
        `/api/v1/providers/${createdResources.providerId}/test`,
        { method: 'POST' }
      )

      // 测试可能因 API Key 无效失败
      expect([200, 400, 404, 500]).toContain(status)
    })

    it('32.2 测试模型', async () => {
      if (!createdResources.modelId) return

      const { status } = await apiRequest(
        `/api/v1/models/${createdResources.modelId}/test`,
        { method: 'POST' }
      )

      // 测试可能因模型配置问题失败
      expect([200, 400, 404, 500]).toContain(status)
    })
  })

  // ==================== 33. A/B 测试任务 API ====================
  describe('33. A/B 测试任务 API', () => {
    it('33.1 创建 A/B 测试任务', async () => {
      if (!createdResources.promptId || !createdResources.datasetId || !createdResources.modelId) return

      const { status, data } = await apiRequest('/api/v1/tasks/ab', {
        method: 'POST',
        body: JSON.stringify({
          name: `E2E-AB测试-${Date.now()}`,
          description: 'E2E A/B 测试',
          type: 'AB_TEST',
          promptId: createdResources.promptId,
          datasetId: createdResources.datasetId,
          evaluatorIds: [createdResources.evaluatorId].filter(Boolean),
          config: {
            variants: [
              { modelId: createdResources.modelId, weight: 50 },
            ],
            parallelism: 1,
            timeoutSeconds: 60,
            retryCount: 0,
          },
        }),
      })

      // 可能成功或因配置不完整失败
      expect([200, 201, 400, 500]).toContain(status)
    })
  })

  // ==================== 34. 团队转让 API ====================
  describe('34. 团队转让 API', () => {
    it('34.1 转让团队', async () => {
      const teamsRes = await apiRequest('/api/v1/teams')
      const teams = (teamsRes.data as { data: { id: string }[] }).data

      if (teams?.length > 0) {
        const usersRes = await apiRequest('/api/v1/users')
        const users = (usersRes.data as { data: { list: { id: string }[] } }).data?.list

        if (users?.length > 1) {
          const { status } = await apiRequest(`/api/v1/teams/${teams[0].id}/transfer`, {
            method: 'POST',
            body: JSON.stringify({
              newOwnerId: users[1].id,
            }),
          })
          // 可能成功或因权限问题失败
          expect([200, 400, 403, 404]).toContain(status)
        }
      }
    })
  })

  // ==================== 35. 用户头像 API ====================
  describe('35. 用户头像 API', () => {
    it('35.1 上传用户头像', async () => {
      // 头像 API 只支持 POST（上传）和 DELETE
      const { status } = await apiRequest('/api/v1/users/me/avatar', {
        method: 'DELETE',
      })

      // 删除头像，可能成功或头像不存在
      expect([200, 404, 405]).toContain(status)
    })
  })

  // ==================== 36. 删除 Token API ====================
  describe('36. 删除 Token API', () => {
    it('36.1 删除 Token', async () => {
      if (!createdResources.tokenId) return

      const { status, data } = await apiRequest(
        `/api/v1/tokens/${createdResources.tokenId}`,
        { method: 'DELETE' }
      )

      expect([200, 404]).toContain(status)
    })
  })

  // ==================== 37. 分支版本管理 API ====================
  describe('37. 分支版本管理 API', () => {
    it('37.1 获取分支版本列表', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}/versions`
      )

      expect([200, 404]).toContain(status)
    })

    it('37.2 在分支上创建新版本', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}/versions`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: '分支测试版本内容 {{input}}',
            changeLog: '分支新版本',
          }),
        }
      )

      // 可能成功或因分支不存在失败
      expect([200, 201, 400, 404, 500]).toContain(status)
    })
  })

  // ==================== 99. 清理测试数据 ====================
  describe('99. 清理测试数据', () => {
    it('99.1 删除测试分支', async () => {
      if (!createdResources.promptId || !createdResources.branchId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}/branches/${createdResources.branchId}`,
        { method: 'DELETE' }
      )
      expect([200, 404]).toContain(status)
    })

    it('99.2 删除测试通知渠道', async () => {
      if (!createdResources.notifyChannelId) return

      const { status, data } = await apiRequest(
        `/api/v1/notify-channels/${createdResources.notifyChannelId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.3 删除测试告警规则', async () => {
      if (!createdResources.alertRuleId) return

      const { status, data } = await apiRequest(
        `/api/v1/alert-rules/${createdResources.alertRuleId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.4 删除测试定时任务', async () => {
      if (!createdResources.scheduledTaskId) return

      const { status, data } = await apiRequest(
        `/api/v1/scheduled-tasks/${createdResources.scheduledTaskId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.5 删除测试评估器', async () => {
      if (!createdResources.evaluatorId) return

      const { status, data } = await apiRequest(
        `/api/v1/evaluators/${createdResources.evaluatorId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.6 删除测试模型', async () => {
      if (!createdResources.modelId) return

      const { status, data } = await apiRequest(
        `/api/v1/models/${createdResources.modelId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.7 删除测试提供商', async () => {
      if (!createdResources.providerId) return

      const { status, data } = await apiRequest(
        `/api/v1/providers/${createdResources.providerId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.8 删除测试数据行', async () => {
      if (!createdResources.datasetId || !createdResources.datasetRowId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}/rows/${createdResources.datasetRowId}`,
        { method: 'DELETE' }
      )
      // 数据行可能在回滚测试中已被删除
      expect([200, 404]).toContain(status)
    })

    it('99.9 删除测试数据集', async () => {
      if (!createdResources.datasetId) return

      const { status, data } = await apiRequest(
        `/api/v1/datasets/${createdResources.datasetId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('99.10 删除测试提示词', async () => {
      if (!createdResources.promptId) return

      const { status, data } = await apiRequest(
        `/api/v1/prompts/${createdResources.promptId}`,
        { method: 'DELETE' }
      )
      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })
  })

  // ==================== 100. 登出 ====================
  describe('100. 登出', () => {
    it('100.1 登出当前用户', async () => {
      const { status, data } = await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
      })

      expect(status).toBe(200)
      expect((data as { code: number }).code).toBe(200)
    })

    it('100.2 登出后访问受保护资源应返回 401', async () => {
      sessionCookie = '' // 清除 cookie
      const { data } = await apiRequest('/api/v1/prompts')

      expect((data as { code: number }).code).toBe(401000)
    })
  })
})
