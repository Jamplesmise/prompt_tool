/**
 * 提示词特征提取器
 * 从提示词中提取用于评估器推荐的特征
 */

/**
 * 任务类型
 */
export type TaskType =
  | 'classification'  // 分类任务
  | 'generation'      // 生成任务
  | 'extraction'      // 信息抽取
  | 'qa'              // 问答任务
  | 'translation'     // 翻译任务
  | 'summarization'   // 摘要任务
  | 'code'            // 代码相关
  | 'other'           // 其他

/**
 * 提示词特征
 */
export type PromptFeatures = {
  /** 是否要求 JSON 输出 */
  hasJsonOutput: boolean
  /** 是否有关键词要求 */
  hasKeywordRequirement: boolean
  /** 是否有长度约束 */
  hasLengthConstraint: boolean
  /** 是否有格式示例 */
  hasFormatExample: boolean
  /** 是否有评分/打分要求 */
  hasScoreRequirement: boolean
  /** 是否有多选/分类要求 */
  hasClassification: boolean
  /** 推断的任务类型 */
  taskType: TaskType
  /** 检测到的关键词列表 */
  detectedKeywords: string[]
  /** 置信度 (0-1) */
  confidence: number
}

/**
 * JSON 输出相关关键词
 */
const JSON_KEYWORDS = [
  'json', 'JSON', '{}', '[]',
  '格式如下', '格式为', '以下格式',
  'format as', 'output format', 'return format',
  '返回格式', '输出格式'
]

/**
 * 关键词要求相关模式
 */
const KEYWORD_PATTERNS = [
  '必须包含', '需要包含', '应该包含', '确保包含',
  'must include', 'should include', 'ensure',
  '关键词', 'keyword', '关键信息',
  '不能遗漏', '不要遗漏'
]

/**
 * 长度约束相关模式
 */
const LENGTH_PATTERNS = [
  '字数', '字符', '长度', '不超过', '不少于',
  '大约', '左右', '以内', '至少',
  'characters', 'words', 'length', 'maximum', 'minimum',
  'at least', 'at most', 'no more than', 'no less than'
]

/**
 * 分类任务相关模式
 */
const CLASSIFICATION_PATTERNS = [
  '分类', '类别', '类型', '归类',
  'classify', 'classification', 'category', 'categorize',
  '选择', '选项', 'choose', 'select', 'option',
  '判断', '是否', 'determine', 'whether'
]

/**
 * 生成任务相关模式
 */
const GENERATION_PATTERNS = [
  '生成', '创作', '写', '编写', '撰写',
  'generate', 'create', 'write', 'compose',
  '续写', '改写', 'continue', 'rewrite'
]

/**
 * 信息抽取相关模式
 */
const EXTRACTION_PATTERNS = [
  '提取', '抽取', '找出', '识别',
  'extract', 'identify', 'find', 'recognize',
  '实体', 'entity', '关键信息', 'key information'
]

/**
 * 问答任务相关模式
 */
const QA_PATTERNS = [
  '回答', '问题', '解答',
  'answer', 'question', 'respond',
  '根据.*回答', '请回答'
]

/**
 * 翻译任务相关模式
 */
const TRANSLATION_PATTERNS = [
  '翻译', '译成', '转换成',
  'translate', 'translation', 'convert to'
]

/**
 * 摘要任务相关模式
 */
const SUMMARIZATION_PATTERNS = [
  '总结', '摘要', '概括', '归纳',
  'summarize', 'summary', 'abstract', 'brief'
]

/**
 * 代码任务相关模式
 */
const CODE_PATTERNS = [
  '代码', '函数', '方法', '程序',
  'code', 'function', 'method', 'program',
  'python', 'javascript', 'typescript', 'java', 'c++',
  '```', 'def ', 'function ', 'class '
]

/**
 * 评分要求相关模式
 */
const SCORE_PATTERNS = [
  '评分', '打分', '分数', '得分',
  'score', 'rating', 'rate', 'grade',
  '1-10', '1-5', '0-100'
]

/**
 * 检查文本是否包含任一模式
 */
function containsAny(text: string, patterns: string[]): boolean {
  const lowerText = text.toLowerCase()
  return patterns.some(p => lowerText.includes(p.toLowerCase()))
}

/**
 * 检查文本是否匹配任一正则模式
 */
function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some(p => new RegExp(p, 'i').test(text))
}

/**
 * 提取提示词中的关键词要求
 */
function extractKeywords(prompt: string): string[] {
  const keywords: string[] = []

  // 匹配引号内的内容
  const quotedMatches = prompt.match(/["""]([^"""]+)["""]/g)
  if (quotedMatches) {
    quotedMatches.forEach(m => {
      const word = m.replace(/["""]/g, '').trim()
      if (word.length >= 2 && word.length <= 20) {
        keywords.push(word)
      }
    })
  }

  // 匹配"必须包含X"模式
  const mustIncludePattern = /(?:必须|需要|应该)包含[：:]\s*(.+?)(?:[。,，;；\n]|$)/g
  let match
  while ((match = mustIncludePattern.exec(prompt)) !== null) {
    const items = match[1].split(/[,，、]/).map(s => s.trim()).filter(s => s.length >= 2)
    keywords.push(...items)
  }

  return [...new Set(keywords)]
}

/**
 * 推断任务类型
 */
function inferTaskType(prompt: string): TaskType {
  const scores: Record<TaskType, number> = {
    classification: 0,
    generation: 0,
    extraction: 0,
    qa: 0,
    translation: 0,
    summarization: 0,
    code: 0,
    other: 0,
  }

  if (containsAny(prompt, CLASSIFICATION_PATTERNS)) scores.classification += 2
  if (containsAny(prompt, GENERATION_PATTERNS)) scores.generation += 2
  if (containsAny(prompt, EXTRACTION_PATTERNS)) scores.extraction += 2
  if (containsAny(prompt, QA_PATTERNS)) scores.qa += 2
  if (containsAny(prompt, TRANSLATION_PATTERNS)) scores.translation += 2
  if (containsAny(prompt, SUMMARIZATION_PATTERNS)) scores.summarization += 2
  if (containsAny(prompt, CODE_PATTERNS)) scores.code += 2

  // 找出得分最高的类型
  let maxType: TaskType = 'other'
  let maxScore = 0
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      maxType = type as TaskType
    }
  }

  return maxScore > 0 ? maxType : 'other'
}

/**
 * 计算特征提取的置信度
 */
function calculateConfidence(features: Omit<PromptFeatures, 'confidence'>): number {
  let score = 0.5 // 基础分

  // 有明确的特征时增加置信度
  if (features.hasJsonOutput) score += 0.1
  if (features.hasKeywordRequirement) score += 0.1
  if (features.hasLengthConstraint) score += 0.1
  if (features.hasFormatExample) score += 0.1
  if (features.taskType !== 'other') score += 0.1

  return Math.min(score, 1)
}

/**
 * 从提示词中提取特征
 * @param prompt 提示词内容
 * @returns 提取的特征
 */
export function extractPromptFeatures(prompt: string): PromptFeatures {
  const hasJsonOutput = containsAny(prompt, JSON_KEYWORDS)
  const hasKeywordRequirement = containsAny(prompt, KEYWORD_PATTERNS)
  const hasLengthConstraint = containsAny(prompt, LENGTH_PATTERNS)
  const hasFormatExample = prompt.includes('```') || prompt.includes('示例') || prompt.includes('example')
  const hasScoreRequirement = containsAny(prompt, SCORE_PATTERNS)
  const hasClassification = containsAny(prompt, CLASSIFICATION_PATTERNS)
  const taskType = inferTaskType(prompt)
  const detectedKeywords = extractKeywords(prompt)

  const partialFeatures = {
    hasJsonOutput,
    hasKeywordRequirement,
    hasLengthConstraint,
    hasFormatExample,
    hasScoreRequirement,
    hasClassification,
    taskType,
    detectedKeywords,
  }

  return {
    ...partialFeatures,
    confidence: calculateConfidence(partialFeatures),
  }
}

/**
 * 批量提取多个提示词的特征
 */
export function extractMultiplePromptFeatures(prompts: string[]): PromptFeatures[] {
  return prompts.map(extractPromptFeatures)
}
