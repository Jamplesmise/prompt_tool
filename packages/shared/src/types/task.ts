// 任务相关类型

export type TaskType = 'PROMPT' | 'AGENT' | 'API' | 'AB_TEST'

export type TaskStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'STOPPED'

export type ResultStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'ERROR'

export type TaskProgress = {
  total: number
  completed: number
  failed: number
}

export type TaskStats = {
  avgLatencyMs?: number
  totalTokens?: number
  totalCost?: number
  passRate?: number
  avgScore?: number
}

export type TaskConfig = {
  concurrency?: number
  timeout?: number
  retryCount?: number
  retryDelay?: number
}

export type Task = {
  id: string
  name: string
  description: string | null
  type: TaskType
  status: TaskStatus
  config: TaskConfig
  progress: TaskProgress
  stats: TaskStats
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  datasetId: string
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export type TokenUsage = {
  input: number
  output: number
  total: number
}

export type TaskResult = {
  id: string
  taskId: string
  datasetRowId: string
  promptId: string
  promptVersionId: string
  modelId: string
  input: Record<string, unknown>
  output: string | null
  expected: string | null
  latencyMs: number | null
  tokens: TokenUsage
  cost: number | null
  status: ResultStatus
  error: string | null
  createdAt: Date
}

export type EvaluationResult = {
  id: string
  taskResultId: string
  evaluatorId: string
  passed: boolean
  score: number | null
  reason: string | null
  details: Record<string, unknown>
  latencyMs: number | null
  createdAt: Date
}

export type CreateTaskInput = {
  name: string
  description?: string
  type?: TaskType
  config?: TaskConfig
  datasetId: string
  promptIds: string[]
  modelIds: string[]
  evaluatorIds: string[]
}

export type TaskWithRelations = Task & {
  results: TaskResult[]
}
