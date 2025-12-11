import type {
  ApiResponse,
  InputSchema,
  OutputSchema,
  InputSchemaListItem,
  OutputSchemaListItem,
  CreateInputSchemaRequest,
  UpdateInputSchemaRequest,
  CreateOutputSchemaRequest,
  UpdateOutputSchemaRequest,
  EvaluationSchema,
  EvaluationSchemaListItem,
  CreateEvaluationSchemaRequest,
  UpdateEvaluationSchemaRequest,
} from '@platform/shared'

const API_BASE = '/api/v1'

// 列表响应格式
type ListResponse<T> = {
  list: T[]
  total: number
}

export const inputSchemasService = {
  // 获取输入结构列表
  async list(search?: string): Promise<ApiResponse<ListResponse<InputSchemaListItem>>> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await fetch(`${API_BASE}/input-schemas${params}`)
    return response.json()
  },

  // 获取输入结构详情
  async get(id: string): Promise<ApiResponse<InputSchema>> {
    const response = await fetch(`${API_BASE}/input-schemas/${id}`)
    return response.json()
  },

  // 创建输入结构
  async create(data: CreateInputSchemaRequest): Promise<ApiResponse<InputSchema>> {
    const response = await fetch(`${API_BASE}/input-schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新输入结构
  async update(id: string, data: UpdateInputSchemaRequest): Promise<ApiResponse<InputSchema>> {
    const response = await fetch(`${API_BASE}/input-schemas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除输入结构
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await fetch(`${API_BASE}/input-schemas/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
}

export const outputSchemasService = {
  // 获取输出结构列表
  async list(search?: string): Promise<ApiResponse<ListResponse<OutputSchemaListItem>>> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await fetch(`${API_BASE}/output-schemas${params}`)
    return response.json()
  },

  // 获取输出结构详情
  async get(id: string): Promise<ApiResponse<OutputSchema>> {
    const response = await fetch(`${API_BASE}/output-schemas/${id}`)
    return response.json()
  },

  // 创建输出结构
  async create(data: CreateOutputSchemaRequest): Promise<ApiResponse<OutputSchema>> {
    const response = await fetch(`${API_BASE}/output-schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新输出结构
  async update(id: string, data: UpdateOutputSchemaRequest): Promise<ApiResponse<OutputSchema>> {
    const response = await fetch(`${API_BASE}/output-schemas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除输出结构
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await fetch(`${API_BASE}/output-schemas/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
}

// Schema 模板相关类型
export type SchemaTemplateListItem = {
  id: string
  name: string
  category: string
  description: string
  icon?: string
  inputVariableCount: number
  outputFieldCount: number
}

export type SchemaTemplateCategory = {
  key: string
  label: string
  templates: SchemaTemplateListItem[]
}

export type SchemaTemplateDetail = {
  id: string
  name: string
  category: string
  categoryLabel: string
  description: string
  icon?: string
  inputSchema: {
    name: string
    description?: string
    variables: unknown[]
  }
  outputSchema: {
    name: string
    description?: string
    fields: unknown[]
    parseMode: string
    aggregation: { mode: string; passThreshold?: number }
  }
}

export type UseTemplateResult = {
  inputSchemaId: string
  outputSchemaId: string
  inputSchema: {
    id: string
    name: string
    description?: string | null
    variables: unknown
  }
  outputSchema: {
    id: string
    name: string
    description?: string | null
    fields: unknown
    parseMode: string
    aggregation: unknown
  }
  templateId: string
  templateName: string
}

// Schema 推断相关类型
export type InferredField = {
  key: string
  name: string
  suggestedName: string
  type: string
  required: boolean
  itemType?: string
  enumValues?: string[]
  properties?: Array<{ key: string; type: string }>
}

export type InferSchemaResult = {
  fields: InferredField[]
  parsedOutput: Record<string, unknown>
  fieldCount: number
}

export const schemaInferService = {
  // 从样本输出推断 Schema
  async inferFromOutput(sampleOutput: string): Promise<ApiResponse<InferSchemaResult>> {
    const response = await fetch(`${API_BASE}/schemas/infer-from-output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleOutput }),
    })
    return response.json()
  },
}

export const schemaTemplatesService = {
  // 获取模板列表
  async list(): Promise<ApiResponse<{
    templates: SchemaTemplateListItem[]
    categories: SchemaTemplateCategory[]
    total: number
  }>> {
    const response = await fetch(`${API_BASE}/schemas/templates`)
    return response.json()
  },

  // 获取模板详情
  async get(id: string): Promise<ApiResponse<SchemaTemplateDetail>> {
    const response = await fetch(`${API_BASE}/schemas/templates/${id}`)
    return response.json()
  },

  // 使用模板创建 Schema
  async use(id: string, options?: {
    teamId?: string
    inputSchemaName?: string
    outputSchemaName?: string
  }): Promise<ApiResponse<UseTemplateResult>> {
    const response = await fetch(`${API_BASE}/schemas/templates/${id}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    })
    return response.json()
  },
}

// 评估结构服务（输入+输出的完整单元）
export const evaluationSchemasService = {
  // 获取评估结构列表
  async list(search?: string): Promise<ApiResponse<ListResponse<EvaluationSchemaListItem>>> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await fetch(`${API_BASE}/evaluation-schemas${params}`)
    return response.json()
  },

  // 获取评估结构详情
  async get(id: string): Promise<ApiResponse<EvaluationSchema>> {
    const response = await fetch(`${API_BASE}/evaluation-schemas/${id}`)
    return response.json()
  },

  // 创建评估结构
  async create(data: CreateEvaluationSchemaRequest): Promise<ApiResponse<EvaluationSchema>> {
    const response = await fetch(`${API_BASE}/evaluation-schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新评估结构
  async update(id: string, data: UpdateEvaluationSchemaRequest): Promise<ApiResponse<EvaluationSchema>> {
    const response = await fetch(`${API_BASE}/evaluation-schemas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除评估结构
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await fetch(`${API_BASE}/evaluation-schemas/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
}

export type {
  InputSchema,
  OutputSchema,
  InputSchemaListItem,
  OutputSchemaListItem,
  CreateInputSchemaRequest,
  UpdateInputSchemaRequest,
  CreateOutputSchemaRequest,
  UpdateOutputSchemaRequest,
  EvaluationSchema,
  EvaluationSchemaListItem,
  CreateEvaluationSchemaRequest,
  UpdateEvaluationSchemaRequest,
}
