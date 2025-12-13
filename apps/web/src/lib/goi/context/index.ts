/**
 * 上下文管理模块导出
 */

// Token 计数器
export {
  TokenCounter,
  tokenCounter,
  countTokens,
  countObjectTokens,
  wouldExceedLimit,
  getRemainingTokens,
} from './tokenCounter'

// 上下文管理器
export {
  ContextManager,
  createContextManager,
  type UpdateContextOptions,
  type CompressionSuggestion,
  type ContextEventListener,
  type ContextEvent,
} from './manager'

// 压缩器
export {
  ContextCompressor,
  createCompressor,
  compressor,
  type LLMInvoker,
  type CompressOptions,
  type CompressContextInput,
} from './compressor'

// 模板和工具
export {
  STANDARD_COMPRESSION_PROMPT,
  DEEP_COMPRESSION_PROMPT,
  PHASE_COMPRESSION_PROMPT,
  SUMMARY_DISPLAY_TEMPLATE,
  renderCompressionPrompt,
  renderSummaryDisplay,
  createEmptySummary,
  mergeSummaries,
  addCompletedPhase,
  updateCurrentState,
  addKeyDecision,
  validateSummary,
  parseSummaryFromLLM,
} from './templates'
