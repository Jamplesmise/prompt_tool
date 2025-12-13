/**
 * GOI 意图理解模块
 *
 * 提供 L1 级别的意图识别能力：
 * - 意图解析（规则 + LLM 混合）
 * - 实体识别
 * - 模糊匹配
 * - 置信度评估
 * - 澄清对话
 */

// 意图解析器
export {
  parseIntent,
  parseIntentByRules,
  quickParseIntent,
  needsClarification,
  buildIntentParsePrompt,
  parseLLMResponse,
  type LLMInvoker,
  type ParserConfig,
} from './parser'

// 实体识别器
export {
  recognizeEntities,
  recognizeResourceType,
  recognizeAllResourceTypes,
  recognizeAction,
  extractResourceName,
  extractMultipleResourceNames,
  extractParameters,
  mergeEntities,
  filterEntitiesByType,
  getTopConfidenceEntity,
  enrichEntityWithCandidates,
  type RecognitionContext,
  type RecognitionResult,
} from './entityRecognizer'

// 模糊匹配器
export {
  levenshteinDistance,
  similarityScore,
  calculateMatchScore,
  getBestMatchStrategy,
  exactMatch,
  prefixMatch,
  containsMatch,
  pinyinMatch,
  fuzzyMatch,
  fuzzySearchResources,
  fuzzySearchAllResources,
  fuzzyMatchResourceType,
  generateMatchSuggestions,
  needsDisambiguation,
  highlightMatch,
  formatScore,
  getPinyinInitials,
  type MatchStrategy,
  type MatchResult,
  type ResourceSearchFn,
} from './fuzzyMatcher'

// 置信度评估
export {
  evaluateConfidence,
  quickEvaluate,
  canAutoExecute,
  needsConfirmation,
  needsClarification as needsClarificationByConfidence,
  checkIntentCompleteness,
  calculateEntityConfidence,
  calculateContextBonus,
  getIntentRiskLevel,
  hasAmbiguity,
  adjustConfidenceByFeedback,
  adjustConfidenceByHistory,
  decideActionWithCustomThresholds,
  CONFIDENCE_THRESHOLDS,
  decideActionByConfidence,
  type ConfidenceContext,
  type ConfidenceEvaluation,
  type CustomThresholds,
} from './confidence'

// 澄清对话
export {
  generateClarification,
  processResponse,
  createClarificationState,
  startClarification,
  completeClarification,
  hasReachedMaxRounds,
  generateExamples,
  generateHelpMessage,
  processUserInput,
  type ClarificationContext,
  type ClarificationState,
} from './clarification'

// 从 shared 重新导出类型
export type {
  IntentCategory,
  ParsedIntent,
  EntityMatch,
  EntityType,
  EntityCandidate,
  IntentParseResult,
  ConfidenceAction,
  ClarificationType,
  ClarificationRequest,
  ClarificationResponse,
  ClarificationInfo,
  IntentProcessResult,
} from '@platform/shared'

export {
  RESOURCE_TYPE_ALIASES,
  ACTION_ALIASES,
  INTENT_CATEGORY_LABELS,
  getResourceTypeLabel,
  normalizeAction,
} from '@platform/shared'
