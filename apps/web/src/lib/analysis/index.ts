/**
 * 智能分析模块
 */

// 失败模式检测
export {
  detectPatterns,
  analyzeFailurePatterns,
  getFailureTypeName,
  getFailureTypeColor,
  getFailureTypeIcon,
} from './failurePatternDetector'

export type {
  FailureType,
  FailedResult,
  FailurePattern,
  DetectionResult,
} from './failurePatternDetector'

// 文本相似度
export {
  jaccardSimilarity,
  editDistanceSimilarity,
  cosineSimilarity,
  combinedSimilarity,
  cachedSimilarity,
  computeSimilarityMatrix,
  tokenize,
  clearSimilarityCache,
} from './textSimilarity'

// 聚类分析
export {
  clusterFailures,
  clusterFailuresWithConfig,
  generateClusterSummary,
} from './clusterAnalysis'

export type {
  Cluster,
  ClusterConfig,
  ClusterSummary,
} from './clusterAnalysis'

// 建议生成
export {
  generateSuggestions,
  applySuggestion,
  previewSuggestionDiff,
} from './suggestionGenerator'

export type {
  Suggestion,
  SuggestionActionType,
  PromptInfo,
} from './suggestionGenerator'

// 异常检测
export {
  detectAnomaly,
  detectAnomalies,
  getAnomalyTypeName,
  getSeverityStyle,
} from './anomalyDetector'

export type {
  AnomalyType,
  AnomalySeverity,
  Anomaly,
  DetectionConfig,
} from './anomalyDetector'

// 异常原因分析
export {
  analyzeCauses,
  analyzeCausesSync,
  getCauseCategoryName,
  getLikelihoodStyle,
} from './anomalyCauseAnalyzer'

export type {
  PossibleCause,
  AnalysisContext,
  ChangeDetectionResult,
  CauseAnalysisResult,
} from './anomalyCauseAnalyzer'
