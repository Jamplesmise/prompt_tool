// 数据集相关类型

export type DatasetSchema = {
  columns: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'json'
    description?: string
  }>
}

export type Dataset = {
  id: string
  name: string
  description: string | null
  schema: DatasetSchema | null
  rowCount: number
  filePath: string | null
  isPersistent: boolean
  currentVersion: number
  createdById: string
  teamId: string | null
  createdAt: Date
  updatedAt: Date
}

export type DatasetRow = {
  id: string
  datasetId: string
  rowIndex: number
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type CreateDatasetInput = {
  name: string
  description?: string
  schema?: DatasetSchema
  isPersistent?: boolean
}

export type UpdateDatasetInput = Partial<CreateDatasetInput>

export type DatasetWithRows = Dataset & {
  rows: DatasetRow[]
}

// Phase 10: 数据集版本管理类型
export type DatasetVersion = {
  id: string
  datasetId: string
  version: number
  rowCount: number
  changeLog: string | null
  columns: string[]
  rowHashes: string[]
  createdById: string
  createdAt: Date
}

export type DatasetVersionRow = {
  id: string
  versionId: string
  rowIndex: number
  data: Record<string, unknown>
  hash: string
}

export type DatasetVersionWithRows = DatasetVersion & {
  rows: DatasetVersionRow[]
}

export type CreateDatasetVersionInput = {
  changeLog?: string
}

export type DatasetWithVersions = Dataset & {
  versions: DatasetVersion[]
}

// 版本对比类型
export type DatasetDiff = {
  added: number[] // 新增行索引
  removed: number[] // 删除行索引
  modified: Array<{
    index: number
    field: string
    oldValue: unknown
    newValue: unknown
  }>
  summary: {
    addedCount: number
    removedCount: number
    modifiedCount: number
  }
}

export type DatasetVersionDiffResult = {
  versionA: DatasetVersion
  versionB: DatasetVersion
  diff: DatasetDiff
}
