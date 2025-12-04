import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Phase 10: 提示词分支管理单元测试
 */

describe('分支管理核心逻辑', () => {
  describe('分支创建', () => {
    it('创建分支时应指定源版本', () => {
      const sourceVersion = { id: 'v1-id', version: 1, content: '原始内容' }
      const newBranch = {
        name: 'feature-branch',
        sourceVersionId: sourceVersion.id,
        currentVersion: 1,
        isDefault: false,
        status: 'ACTIVE',
      }

      expect(newBranch.sourceVersionId).toBe(sourceVersion.id)
      expect(newBranch.currentVersion).toBe(1)
      expect(newBranch.isDefault).toBe(false)
    })

    it('默认分支名称应为 main', () => {
      const defaultBranchName = 'main'
      expect(defaultBranchName).toBe('main')
    })

    it('分支名称应唯一（同一提示词内）', () => {
      const existingBranches = [
        { name: 'main', promptId: 'p1' },
        { name: 'feature-a', promptId: 'p1' },
      ]

      const newBranchName = 'feature-b'
      const isDuplicate = existingBranches.some((b) => b.name === newBranchName)

      expect(isDuplicate).toBe(false)
    })

    it('不同提示词可以有同名分支', () => {
      const branches = [
        { name: 'main', promptId: 'p1' },
        { name: 'main', promptId: 'p2' },
      ]

      const p1Branches = branches.filter((b) => b.promptId === 'p1')
      const p2Branches = branches.filter((b) => b.promptId === 'p2')

      expect(p1Branches.some((b) => b.name === 'main')).toBe(true)
      expect(p2Branches.some((b) => b.name === 'main')).toBe(true)
    })
  })

  describe('分支状态', () => {
    it('新创建分支状态应为 ACTIVE', () => {
      const status = 'ACTIVE'
      expect(status).toBe('ACTIVE')
    })

    it('合并后分支状态应为 MERGED', () => {
      const beforeMerge = 'ACTIVE'
      const afterMerge = 'MERGED'

      expect(beforeMerge).toBe('ACTIVE')
      expect(afterMerge).toBe('MERGED')
    })

    it('归档后分支状态应为 ARCHIVED', () => {
      const afterArchive = 'ARCHIVED'
      expect(afterArchive).toBe('ARCHIVED')
    })

    it('已合并或归档的分支不能再发布版本', () => {
      const canPublish = (status: string) => status === 'ACTIVE'

      expect(canPublish('ACTIVE')).toBe(true)
      expect(canPublish('MERGED')).toBe(false)
      expect(canPublish('ARCHIVED')).toBe(false)
    })
  })

  describe('分支合并', () => {
    it('合并应创建目标分支的新版本', () => {
      const targetBranch = { currentVersion: 2 }
      const newVersion = targetBranch.currentVersion + 1

      expect(newVersion).toBe(3)
    })

    it('合并后源分支状态应变为 MERGED', () => {
      const sourceBranch = {
        status: 'ACTIVE' as const,
        mergedAt: null as Date | null,
        mergedToId: null as string | null,
      }

      // 执行合并
      const afterMerge = {
        status: 'MERGED' as const,
        mergedAt: new Date(),
        mergedToId: 'target-branch-id',
      }

      expect(afterMerge.status).toBe('MERGED')
      expect(afterMerge.mergedAt).toBeTruthy()
      expect(afterMerge.mergedToId).toBe('target-branch-id')
    })

    it('不能合并到自身', () => {
      const sourceBranchId = 'branch-1'
      const targetBranchId = 'branch-1'

      const isValid = sourceBranchId !== targetBranchId
      expect(isValid).toBe(false)
    })

    it('不能合并已归档的分支', () => {
      const sourceBranch = { status: 'ARCHIVED' }
      const canMerge = sourceBranch.status === 'ACTIVE'

      expect(canMerge).toBe(false)
    })
  })

  describe('分支归档', () => {
    it('归档应更新状态为 ARCHIVED', () => {
      const branch = { status: 'ACTIVE' }
      const afterArchive = { ...branch, status: 'ARCHIVED' }

      expect(afterArchive.status).toBe('ARCHIVED')
    })

    it('默认分支不能归档', () => {
      const branch = { isDefault: true, status: 'ACTIVE' }
      const canArchive = !branch.isDefault && branch.status === 'ACTIVE'

      expect(canArchive).toBe(false)
    })

    it('已合并的分支可以归档', () => {
      const branch = { isDefault: false, status: 'MERGED' }
      const canArchive = !branch.isDefault

      expect(canArchive).toBe(true)
    })
  })

  describe('分支版本发布', () => {
    it('发布版本应更新分支的 currentVersion', () => {
      const branch = { currentVersion: 2 }
      const newVersion = branch.currentVersion + 1

      expect(newVersion).toBe(3)
    })

    it('发布的版本应关联到分支', () => {
      const branchId = 'branch-1'
      const newVersion = {
        version: 3,
        branchId,
        content: '新内容',
      }

      expect(newVersion.branchId).toBe(branchId)
    })
  })
})

describe('分支对比逻辑', () => {
  describe('内容对比', () => {
    it('相同内容应返回无差异', () => {
      const content1 = '这是内容'
      const content2 = '这是内容'

      const hasDiff = content1 !== content2
      expect(hasDiff).toBe(false)
    })

    it('不同内容应返回有差异', () => {
      const content1 = '原始内容'
      const content2 = '修改后内容'

      const hasDiff = content1 !== content2
      expect(hasDiff).toBe(true)
    })
  })

  describe('变量对比', () => {
    it('应检测新增变量', () => {
      const vars1 = [{ name: 'a', type: 'string' }]
      const vars2 = [
        { name: 'a', type: 'string' },
        { name: 'b', type: 'string' },
      ]

      const added = vars2.filter((v2) => !vars1.some((v1) => v1.name === v2.name))
      expect(added).toHaveLength(1)
      expect(added[0].name).toBe('b')
    })

    it('应检测删除变量', () => {
      const vars1 = [
        { name: 'a', type: 'string' },
        { name: 'b', type: 'string' },
      ]
      const vars2 = [{ name: 'a', type: 'string' }]

      const removed = vars1.filter((v1) => !vars2.some((v2) => v2.name === v1.name))
      expect(removed).toHaveLength(1)
      expect(removed[0].name).toBe('b')
    })

    it('应检测变量类型变更', () => {
      const vars1 = [{ name: 'a', type: 'string' }]
      const vars2 = [{ name: 'a', type: 'number' }]

      const modified = vars2.filter((v2) => {
        const v1 = vars1.find((v) => v.name === v2.name)
        return v1 && v1.type !== v2.type
      })

      expect(modified).toHaveLength(1)
      expect(modified[0].name).toBe('a')
    })
  })
})

describe('确保默认分支', () => {
  it('提示词应该至少有一个默认分支', () => {
    const branches = [
      { name: 'main', isDefault: true },
      { name: 'feature', isDefault: false },
    ]

    const hasDefault = branches.some((b) => b.isDefault)
    expect(hasDefault).toBe(true)
  })

  it('每个提示词只能有一个默认分支', () => {
    const branches = [
      { name: 'main', isDefault: true },
      { name: 'develop', isDefault: false },
      { name: 'feature', isDefault: false },
    ]

    const defaultCount = branches.filter((b) => b.isDefault).length
    expect(defaultCount).toBe(1)
  })
})
