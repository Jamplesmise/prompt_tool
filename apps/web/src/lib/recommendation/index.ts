/**
 * 智能推荐模块
 */

// 提示词特征提取
export {
  extractPromptFeatures,
  extractMultiplePromptFeatures,
} from './promptFeatureExtractor'

export type {
  TaskType,
  PromptFeatures,
} from './promptFeatureExtractor'

// 数据集特征提取
export {
  extractDatasetFeatures,
  extractDatasetFeaturesFromColumns,
} from './datasetFeatureExtractor'

export type {
  DatasetRow,
  DatasetInfo,
  DatasetFeatures,
} from './datasetFeatureExtractor'

// 评估器匹配
export {
  matchEvaluators,
  getEvaluatorInfo,
  getAllEvaluatorInfo,
} from './evaluatorMatcher'

export type {
  EvaluatorTypeId,
  EvaluatorRecommendation,
  MatchResult,
} from './evaluatorMatcher'
