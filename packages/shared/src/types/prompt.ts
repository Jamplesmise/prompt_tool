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
