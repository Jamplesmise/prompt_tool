import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promptsService } from '../prompts'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('promptsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('list', () => {
    it('无参数时应调用正确的 URL', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            code: 200,
            data: { list: [], total: 0, page: 1, pageSize: 20 },
          }),
      })

      await promptsService.list()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts')
    })

    it('有参数时应正确构建 URL', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            code: 200,
            data: { list: [], total: 0, page: 2, pageSize: 10 },
          }),
      })

      await promptsService.list({
        page: 2,
        pageSize: 10,
        keyword: '测试',
        tags: ['tag1', 'tag2'],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/prompts\?/)
      )
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('pageSize=10')
      expect(calledUrl).toContain('keyword=%E6%B5%8B%E8%AF%95')
      expect(calledUrl).toContain('tags=tag1%2Ctag2')
    })

    it('应返回正确的响应格式', async () => {
      const mockData = {
        list: [{ id: '1', name: '测试提示词' }],
        total: 1,
        page: 1,
        pageSize: 20,
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200, data: mockData }),
      })

      const result = await promptsService.list()

      expect(result.code).toBe(200)
      expect(result.data).toEqual(mockData)
    })
  })

  describe('get', () => {
    it('应调用正确的 URL', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200, data: { id: '123' } }),
      })

      await promptsService.get('123')

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/123')
    })
  })

  describe('create', () => {
    it('应发送正确的请求', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            code: 200,
            data: { id: 'new-id', name: '新提示词' },
          }),
      })

      const input = {
        name: '新提示词',
        description: '描述',
        content: '内容 {{variable}}',
        tags: ['标签1'],
      }

      await promptsService.create(input)

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    })
  })

  describe('update', () => {
    it('应发送正确的 PUT 请求', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200, data: { id: '123' } }),
      })

      const input = { name: '更新名称', content: '更新内容' }

      await promptsService.update('123', input)

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    })
  })

  describe('delete', () => {
    it('应发送正确的 DELETE 请求', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200, data: { id: '123' } }),
      })

      await promptsService.delete('123')

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/123', {
        method: 'DELETE',
      })
    })
  })

  describe('batchDelete', () => {
    it('应发送正确的批量删除请求', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200, data: { deleted: 3 } }),
      })

      await promptsService.batchDelete(['1', '2', '3'])

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['1', '2', '3'] }),
      })
    })
  })

  describe('test', () => {
    it('应发送正确的测试请求', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            code: 200,
            data: { success: true, output: '测试输出', latencyMs: 500 },
          }),
      })

      const input = {
        modelId: 'model-1',
        versionId: 'version-1',
        variables: { name: '张三' },
      }

      await promptsService.test('prompt-1', input)

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/prompt-1/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    })
  })

  describe('versions', () => {
    describe('list', () => {
      it('应获取版本列表', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: [] }),
        })

        await promptsService.versions.list('prompt-1')

        expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/prompt-1/versions')
      })
    })

    describe('get', () => {
      it('应获取版本详情', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: { id: 'v1' } }),
        })

        await promptsService.versions.get('prompt-1', 'version-1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/prompts/prompt-1/versions/version-1'
        )
      })
    })

    describe('publish', () => {
      it('应发布新版本', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ code: 200, data: { id: 'new-version' } }),
        })

        await promptsService.versions.publish('prompt-1', { changeLog: '更新日志' })

        expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/prompt-1/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeLog: '更新日志' }),
        })
      })
    })

    describe('rollback', () => {
      it('应回滚到指定版本', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: {} }),
        })

        await promptsService.versions.rollback('prompt-1', 'version-1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/prompts/prompt-1/versions/version-1/rollback',
          { method: 'POST' }
        )
      })
    })

    describe('diff', () => {
      it('应对比两个版本', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: {} }),
        })

        await promptsService.versions.diff('prompt-1', 'v1', 'v2')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/prompts/prompt-1/versions/diff?v1=v1&v2=v2'
        )
      })
    })
  })

  describe('branches', () => {
    describe('list', () => {
      it('应获取分支列表', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: [] }),
        })

        await promptsService.branches.list('prompt-1')

        expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/prompt-1/branches')
      })
    })

    describe('create', () => {
      it('应创建分支', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ code: 200, data: { id: 'new-branch' } }),
        })

        const input = {
          name: '实验分支',
          description: '测试新功能',
          sourceVersionId: 'version-1',
        }

        await promptsService.branches.create('prompt-1', input)

        expect(mockFetch).toHaveBeenCalledWith('/api/v1/prompts/prompt-1/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
      })
    })

    describe('merge', () => {
      it('应合并分支', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: {} }),
        })

        const input = {
          targetBranchId: 'main-branch',
          changeLog: '合并实验分支',
        }

        await promptsService.branches.merge('prompt-1', 'exp-branch', input)

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/prompts/prompt-1/branches/exp-branch/merge',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        )
      })
    })

    describe('archive', () => {
      it('应归档分支', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: {} }),
        })

        await promptsService.branches.archive('prompt-1', 'branch-1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/prompts/prompt-1/branches/branch-1/archive',
          { method: 'POST' }
        )
      })
    })

    describe('diff', () => {
      it('应对比两个分支', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ code: 200, data: {} }),
        })

        await promptsService.branches.diff('prompt-1', 'branch-1', 'branch-2')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/prompts/prompt-1/branches/diff?source=branch-1&target=branch-2'
        )
      })
    })
  })
})
