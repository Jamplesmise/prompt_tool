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
  createdById: string
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
