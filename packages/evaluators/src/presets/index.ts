// 预置评估器统一导出
import type {
  EvaluatorInput,
  EvaluatorOutput,
  PresetType,
  PresetParams,
  PresetEvaluatorDefinition,
  RegexParams,
  JsonSchemaParams,
  SimilarityParams,
} from '../types'

import { exactMatch } from './exactMatch'
import { contains } from './contains'
import { regex } from './regex'
import { jsonSchema } from './jsonSchema'
import { similarity, calculateSimilarity } from './similarity'

// 导出各个评估器
export { exactMatch, contains, regex, jsonSchema, similarity, calculateSimilarity }

// 预置评估器元数据定义
export const PRESET_EVALUATOR_DEFINITIONS: PresetEvaluatorDefinition[] = [
  {
    id: 'preset_exact_match',
    name: '精确匹配',
    description: '输出与期望值完全一致',
    type: 'PRESET',
    presetType: 'exact_match',
  },
  {
    id: 'preset_contains',
    name: '包含匹配',
    description: '输出包含期望内容',
    type: 'PRESET',
    presetType: 'contains',
  },
  {
    id: 'preset_regex',
    name: '正则匹配',
    description: '输出匹配正则表达式',
    type: 'PRESET',
    presetType: 'regex',
    defaultParams: { pattern: '', flags: '' } as RegexParams,
  },
  {
    id: 'preset_json_schema',
    name: 'JSON Schema',
    description: '输出符合 JSON Schema',
    type: 'PRESET',
    presetType: 'json_schema',
    defaultParams: { schema: {} } as JsonSchemaParams,
  },
  {
    id: 'preset_similarity',
    name: '相似度',
    description: '文本相似度超过阈值',
    type: 'PRESET',
    presetType: 'similarity',
    defaultParams: { threshold: 0.8, algorithm: 'levenshtein' } as SimilarityParams,
  },
]

/**
 * 运行预置评估器
 */
export function runPresetEvaluator(
  presetType: PresetType,
  input: EvaluatorInput,
  params?: PresetParams
): EvaluatorOutput {
  switch (presetType) {
    case 'exact_match':
      return exactMatch(input)
    case 'contains':
      return contains(input)
    case 'regex':
      return regex(input, params as RegexParams)
    case 'json_schema':
      return jsonSchema(input, params as JsonSchemaParams)
    case 'similarity':
      return similarity(input, params as SimilarityParams)
    default: {
      const _exhaustiveCheck: never = presetType
      return {
        passed: false,
        score: 0,
        reason: `未知的预置评估器类型: ${_exhaustiveCheck}`,
      }
    }
  }
}
