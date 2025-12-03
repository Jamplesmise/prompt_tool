// @platform/evaluators - 评估器核心逻辑

export const EVALUATORS_VERSION = '0.1.0'

// 类型导出
export type {
  EvaluatorInput,
  EvaluatorOutput,
  PresetType,
  SimilarityAlgorithm,
  RegexParams,
  JsonSchemaParams,
  SimilarityParams,
  PresetParams,
  PresetEvaluatorFn,
  PresetEvaluatorDefinition,
  LLMEvaluatorConfig,
  CompositeEvaluatorConfig,
} from './types'

// 预置评估器
export {
  exactMatch,
  contains,
  regex,
  jsonSchema,
  similarity,
  calculateSimilarity,
  runPresetEvaluator,
  PRESET_EVALUATOR_DEFINITIONS,
} from './presets'

// 执行引擎
export type { EvaluatorConfig, RunEvaluatorOptions } from './runner'
export { runEvaluator, runEvaluators, aggregateResults } from './runner'

// LLM 评估器
export {
  runLLMEvaluator,
  parseLLMOutput,
  extractScoreFromText,
  renderTemplate,
  DEFAULT_EVALUATION_PROMPT,
  SIMPLE_SCORING_PROMPT,
  COMPARISON_PROMPT,
  type ModelInvoker,
  type ScoreRange,
  type LLMEvaluationResult,
} from './llm'

// 组合评估器
export {
  runCompositeEvaluator,
  detectCycle,
  aggregate,
  type EvaluatorExecutor,
  type CompositeExecutorOptions,
  type AggregationType,
} from './composite'
