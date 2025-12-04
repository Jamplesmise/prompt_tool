// 提示词相关类型

export type PromptVariable = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  required?: boolean
  defaultValue?: unknown
}

export type Prompt = {
  id: string
  name: string
  description: string | null
  content: string
  variables: PromptVariable[]
  tags: string[]
  currentVersion: number
  createdById: string
  teamId: string | null
  createdAt: Date
  updatedAt: Date
}

export type PromptVersion = {
  id: string
  promptId: string
  version: number
  content: string
  variables: PromptVariable[]
  changeLog: string | null
  branchId: string | null
  createdById: string
  createdAt: Date
}

export type CreatePromptInput = {
  name: string
  description?: string
  content: string
  variables?: PromptVariable[]
  tags?: string[]
}

export type UpdatePromptInput = Partial<CreatePromptInput>

export type PromptWithVersions = Prompt & {
  versions: PromptVersion[]
}

// Phase 10: 分支管理类型
export type PromptBranchStatus = 'ACTIVE' | 'MERGED' | 'ARCHIVED'

export type PromptBranch = {
  id: string
  promptId: string
  name: string
  description: string | null
  sourceVersionId: string
  currentVersion: number
  isDefault: boolean
  status: PromptBranchStatus
  mergedAt: Date | null
  mergedById: string | null
  mergedToId: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export type PromptBranchWithVersions = PromptBranch & {
  versions: PromptVersion[]
  sourceVersion?: PromptVersion
}

export type CreateBranchInput = {
  name: string
  description?: string
  sourceVersionId: string
}

export type UpdateBranchInput = {
  name?: string
  description?: string
}

export type MergeBranchInput = {
  targetBranchId: string
  changeLog?: string
}

export type PromptWithBranches = Prompt & {
  branches: PromptBranch[]
}

// 分支 Diff 类型
export type PromptDiff = {
  sourceVersion: PromptVersion
  targetVersion: PromptVersion
  contentDiff: string // 统一 diff 格式
  variablesDiff: {
    added: PromptVariable[]
    removed: PromptVariable[]
    modified: Array<{
      name: string
      oldValue: PromptVariable
      newValue: PromptVariable
    }>
  }
}
