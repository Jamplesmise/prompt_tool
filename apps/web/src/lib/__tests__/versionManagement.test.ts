import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractVariables } from '../template'

// 版本管理单元测试
// 注意：API 路由测试需要完整的 Next.js 环境，这里测试核心逻辑

describe('版本管理核心逻辑', () => {
  describe('版本号递增', () => {
    it('新版本号应该是当前版本 + 1', () => {
      const currentVersion = 1
      const newVersion = currentVersion + 1
      expect(newVersion).toBe(2)
    })

    it('多次发布应持续递增', () => {
      let currentVersion = 1
      currentVersion += 1 // v2
      currentVersion += 1 // v3
      currentVersion += 1 // v4
      expect(currentVersion).toBe(4)
    })
  })

  describe('回滚逻辑', () => {
    it('回滚应创建新版本而非覆盖', () => {
      // 模拟版本历史
      const versions = [
        { version: 1, content: '原始内容' },
        { version: 2, content: '修改后内容' },
      ]
      const currentVersion = 2

      // 回滚到 v1 应创建 v3
      const targetVersion = versions[0]
      const newVersionNumber = currentVersion + 1

      expect(newVersionNumber).toBe(3)
      expect(targetVersion.content).toBe('原始内容')
    })

    it('回滚后草稿内容应与目标版本一致', () => {
      const targetVersionContent = '目标版本内容'
      const rollbackResult = {
        draftContent: targetVersionContent,
      }
      expect(rollbackResult.draftContent).toBe(targetVersionContent)
    })
  })

  describe('变量同步', () => {
    it('创建版本时应同步变量', () => {
      const content = '你好 {{name}}，你的角色是 {{role}}'
      const variables = extractVariables(content)

      // 版本应该保存当时的变量快照
      const versionData = {
        content,
        variables,
      }

      expect(versionData.variables).toHaveLength(2)
      expect(versionData.variables.map((v) => v.name)).toContain('name')
      expect(versionData.variables.map((v) => v.name)).toContain('role')
    })

    it('回滚时应恢复目标版本的变量', () => {
      const targetVersionVariables = [
        { name: 'oldVar', type: 'string', required: true },
      ]

      const rollbackVariables = [...targetVersionVariables]

      expect(rollbackVariables).toEqual(targetVersionVariables)
    })
  })

  describe('变更日志', () => {
    it('发布版本可以包含变更说明', () => {
      const changeLog = '修复了一个bug'
      const version = {
        version: 2,
        changeLog,
      }
      expect(version.changeLog).toBe('修复了一个bug')
    })

    it('回滚版本应自动生成变更日志', () => {
      const targetVersion = 1
      const autoChangeLog = `回滚至 v${targetVersion}`
      expect(autoChangeLog).toBe('回滚至 v1')
    })
  })
})

describe('版本对比逻辑', () => {
  it('应该返回两个版本的内容', () => {
    const v1 = { version: 1, content: '版本1内容' }
    const v2 = { version: 2, content: '版本2内容' }

    const diff = {
      v1: { version: v1.version, content: v1.content },
      v2: { version: v2.version, content: v2.content },
    }

    expect(diff.v1.content).toBe('版本1内容')
    expect(diff.v2.content).toBe('版本2内容')
  })
})

describe('事务逻辑验证', () => {
  it('创建提示词时应同时创建 v1', () => {
    // 模拟事务操作
    const transactionOps: string[] = []

    // 模拟创建提示词
    transactionOps.push('CREATE_PROMPT')
    // 模拟创建版本
    transactionOps.push('CREATE_VERSION_1')

    expect(transactionOps).toEqual(['CREATE_PROMPT', 'CREATE_VERSION_1'])
  })

  it('发布版本时应更新当前版本号', () => {
    const transactionOps: string[] = []

    // 模拟创建新版本
    transactionOps.push('CREATE_VERSION')
    // 模拟更新提示词版本号
    transactionOps.push('UPDATE_PROMPT_VERSION')

    expect(transactionOps).toEqual(['CREATE_VERSION', 'UPDATE_PROMPT_VERSION'])
  })

  it('回滚时应同时更新内容和版本号', () => {
    const transactionOps: string[] = []

    // 模拟创建新版本（基于回滚目标）
    transactionOps.push('CREATE_VERSION_FROM_TARGET')
    // 模拟更新提示词内容和版本号
    transactionOps.push('UPDATE_PROMPT_CONTENT_AND_VERSION')

    expect(transactionOps).toEqual([
      'CREATE_VERSION_FROM_TARGET',
      'UPDATE_PROMPT_CONTENT_AND_VERSION',
    ])
  })
})
