/**
 * 结果分析工具库
 */

export {
  analyzeDimension,
  analyzeMultipleDimensions,
  getAvailableDimensions,
  extractCustomDimensionFields,
} from './dimensionAnalyzer'

export {
  detectRegressions,
  detectRegressionFromBaseline,
  getRegressionTypeName,
  getSeverityStyle,
  calculateTrend,
} from './regressionDetector'
