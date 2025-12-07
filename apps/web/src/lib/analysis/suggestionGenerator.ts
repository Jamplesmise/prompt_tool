/**
 * 优化建议生成器
 * 基于失败模式生成具体可操作的优化建议
 */

import type { FailurePattern, FailureType } from './failurePatternDetector'

/**
 * 建议动作类型
 */
export type SuggestionActionType =
  | 'add_constraint'      // 添加约束
  | 'add_example'         // 添加示例
  | 'modify_instruction'  // 修改指令
  | 'add_format'          // 添加格式说明
  | 'adjust_length'       // 调整长度限制
  | 'add_keyword'         // 添加关键词要求
  | 'simplify'            // 简化提示词
  | 'add_context'         // 添加上下文

/**
 * 优化建议
 */
export type Suggestion = {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: {
    type: SuggestionActionType
    content: string
    position?: 'start' | 'end' | 'replace'
  }
  estimatedImpact: string
  relatedPatternType: FailureType
}

/**
 * 提示词信息
 */
export type PromptInfo = {
  id: string
  name: string
  content: string
  systemPrompt?: string
}

/**
 * 生成建议 ID
 */
function generateSuggestionId(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * 计算优先级
 */
function calculatePriority(pattern: FailurePattern): 'high' | 'medium' | 'low' {
  if (pattern.percentage >= 50) return 'high'
  if (pattern.percentage >= 20) return 'medium'
  return 'low'
}

/**
 * 估算影响
 */
function estimateImpact(pattern: FailurePattern): string {
  const improvementRate = Math.min(pattern.percentage * 0.8, 90)
  return `预计可将通过率提升 ${Math.round(improvementRate)}%`
}

/**
 * 检查提示词是否包含关键词
 */
function promptContains(prompt: PromptInfo, keywords: string[]): boolean {
  const fullContent = `${prompt.content} ${prompt.systemPrompt || ''}`.toLowerCase()
  return keywords.some(kw => fullContent.includes(kw.toLowerCase()))
}

/**
 * 格式错误相关建议
 */
function generateFormatSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  // 检查是否期望 JSON 输出
  const expectsJson = pattern.commonFeatures.some(f =>
    f.toLowerCase().includes('json')
  )

  if (expectsJson) {
    if (!promptContains(prompt, ['json', 'JSON'])) {
      suggestions.push({
        id: generateSuggestionId(),
        priority,
        title: '添加 JSON 格式要求',
        description: '在提示词中明确要求输出 JSON 格式，并提供格式示例',
        action: {
          type: 'add_format',
          content: '\n\n请以 JSON 格式输出，格式如下：\n```json\n{\n  "key": "value"\n}\n```',
          position: 'end',
        },
        estimatedImpact: estimateImpact(pattern),
        relatedPatternType: 'format_error',
      })
    }

    suggestions.push({
      id: generateSuggestionId(),
      priority: priority === 'high' ? 'medium' : 'low',
      title: '添加格式验证说明',
      description: '提醒模型输出前验证 JSON 格式的有效性',
      action: {
        type: 'add_constraint',
        content: '\n\n注意：请确保输出的 JSON 格式正确，可以被正确解析。',
        position: 'end',
      },
      estimatedImpact: '预计可减少 30% 的格式错误',
      relatedPatternType: 'format_error',
    })
  } else {
    suggestions.push({
      id: generateSuggestionId(),
      priority,
      title: '明确输出格式要求',
      description: '在提示词中清晰说明期望的输出格式',
      action: {
        type: 'add_format',
        content: '\n\n请按以下格式输出：\n[在此描述具体格式]',
        position: 'end',
      },
      estimatedImpact: estimateImpact(pattern),
      relatedPatternType: 'format_error',
    })
  }

  return suggestions
}

/**
 * 内容缺失相关建议
 */
function generateContentSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  suggestions.push({
    id: generateSuggestionId(),
    priority,
    title: '补充背景知识',
    description: '在系统提示词中添加相关领域的背景知识',
    action: {
      type: 'add_context',
      content: '你是一个专业的 [领域] 专家，具备以下知识：\n- [知识点1]\n- [知识点2]\n',
      position: 'start',
    },
    estimatedImpact: estimateImpact(pattern),
    relatedPatternType: 'content_missing',
  })

  suggestions.push({
    id: generateSuggestionId(),
    priority: priority === 'high' ? 'medium' : 'low',
    title: '添加输出示例',
    description: '提供期望输出的完整示例，帮助模型理解任务',
    action: {
      type: 'add_example',
      content: '\n\n示例：\n输入：[示例输入]\n输出：[示例输出]',
      position: 'end',
    },
    estimatedImpact: '预计可提升 40% 的内容完整性',
    relatedPatternType: 'content_missing',
  })

  return suggestions
}

/**
 * 关键词缺失相关建议
 */
function generateKeywordSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  // 尝试从 commonFeatures 提取缺失的关键词
  const missingKeywords = pattern.commonFeatures
    .filter(f => f.includes('缺失关键词'))
    .flatMap(f => {
      const match = f.match(/缺失关键词[:：]\s*(.+)/)
      return match ? match[1].split(/[,，、]/).map(k => k.trim()) : []
    })

  if (missingKeywords.length > 0) {
    suggestions.push({
      id: generateSuggestionId(),
      priority,
      title: '强调必须包含的关键词',
      description: `输出中缺少关键词：${missingKeywords.join('、')}`,
      action: {
        type: 'add_keyword',
        content: `\n\n重要：输出中必须包含以下关键词：${missingKeywords.join('、')}`,
        position: 'end',
      },
      estimatedImpact: estimateImpact(pattern),
      relatedPatternType: 'keyword_missing',
    })
  } else {
    suggestions.push({
      id: generateSuggestionId(),
      priority,
      title: '明确必须包含的内容',
      description: '在提示词中列出必须包含的关键信息',
      action: {
        type: 'add_keyword',
        content: '\n\n请确保输出包含以下内容：\n- [关键内容1]\n- [关键内容2]',
        position: 'end',
      },
      estimatedImpact: estimateImpact(pattern),
      relatedPatternType: 'keyword_missing',
    })
  }

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'low',
    title: '使用检查列表',
    description: '要求模型在输出前检查是否包含所有必要信息',
    action: {
      type: 'add_constraint',
      content: '\n\n输出前请检查：\n□ 包含了所有必要的关键信息\n□ 没有遗漏重要内容',
      position: 'end',
    },
    estimatedImpact: '预计可减少 20% 的关键词遗漏',
    relatedPatternType: 'keyword_missing',
  })

  return suggestions
}

/**
 * 长度问题相关建议
 */
function generateLengthSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  // 检查是否输出过短或过长
  const isTooShort = pattern.commonFeatures.some(f =>
    f.includes('过短') || f.includes('不足')
  )
  const isTooLong = pattern.commonFeatures.some(f =>
    f.includes('过长') || f.includes('超过')
  )

  if (isTooShort) {
    suggestions.push({
      id: generateSuggestionId(),
      priority,
      title: '设置最小长度要求',
      description: '明确要求输出的最小长度',
      action: {
        type: 'adjust_length',
        content: '\n\n请确保输出不少于 [X] 字。',
        position: 'end',
      },
      estimatedImpact: estimateImpact(pattern),
      relatedPatternType: 'length_violation',
    })

    suggestions.push({
      id: generateSuggestionId(),
      priority: 'medium',
      title: '要求详细阐述',
      description: '明确要求模型提供详细的解释和说明',
      action: {
        type: 'modify_instruction',
        content: '请详细阐述，包括具体的分析和解释。',
        position: 'end',
      },
      estimatedImpact: '预计可增加 50% 的输出内容',
      relatedPatternType: 'length_violation',
    })
  } else if (isTooLong) {
    suggestions.push({
      id: generateSuggestionId(),
      priority,
      title: '设置最大长度限制',
      description: '明确要求输出的最大长度',
      action: {
        type: 'adjust_length',
        content: '\n\n请控制输出在 [X] 字以内。',
        position: 'end',
      },
      estimatedImpact: estimateImpact(pattern),
      relatedPatternType: 'length_violation',
    })

    suggestions.push({
      id: generateSuggestionId(),
      priority: 'medium',
      title: '要求简洁输出',
      description: '明确要求模型输出简洁明了',
      action: {
        type: 'simplify',
        content: '请简洁作答，直接给出核心内容，避免冗余信息。',
        position: 'end',
      },
      estimatedImpact: '预计可减少 40% 的输出长度',
      relatedPatternType: 'length_violation',
    })
  } else {
    suggestions.push({
      id: generateSuggestionId(),
      priority,
      title: '明确长度要求',
      description: '在提示词中设置明确的字数范围',
      action: {
        type: 'adjust_length',
        content: '\n\n输出长度要求：[最小字数] - [最大字数] 字',
        position: 'end',
      },
      estimatedImpact: estimateImpact(pattern),
      relatedPatternType: 'length_violation',
    })
  }

  return suggestions
}

/**
 * 语义不匹配相关建议
 */
function generateSemanticSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  suggestions.push({
    id: generateSuggestionId(),
    priority,
    title: '优化任务描述',
    description: '使用更清晰准确的语言描述任务目标',
    action: {
      type: 'modify_instruction',
      content: '请重新组织提示词，确保任务描述清晰明确，避免歧义。',
      position: 'replace',
    },
    estimatedImpact: estimateImpact(pattern),
    relatedPatternType: 'semantic_mismatch',
  })

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'medium',
    title: '添加正反例对比',
    description: '提供正确和错误输出的对比示例',
    action: {
      type: 'add_example',
      content: '\n\n正确示例：\n[正确输出]\n\n错误示例（请避免）：\n[错误输出]',
      position: 'end',
    },
    estimatedImpact: '预计可提升 35% 的语义准确性',
    relatedPatternType: 'semantic_mismatch',
  })

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'low',
    title: '分步骤引导',
    description: '将复杂任务拆分为多个步骤',
    action: {
      type: 'modify_instruction',
      content: '请按以下步骤完成任务：\n1. [步骤1]\n2. [步骤2]\n3. [步骤3]',
      position: 'end',
    },
    estimatedImpact: '预计可提升 25% 的理解准确性',
    relatedPatternType: 'semantic_mismatch',
  })

  return suggestions
}

/**
 * 超时相关建议
 */
function generateTimeoutSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  suggestions.push({
    id: generateSuggestionId(),
    priority,
    title: '简化任务复杂度',
    description: '将复杂任务拆分为更小的子任务',
    action: {
      type: 'simplify',
      content: '请专注于最核心的部分，简洁作答。',
      position: 'end',
    },
    estimatedImpact: estimateImpact(pattern),
    relatedPatternType: 'timeout',
  })

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'medium',
    title: '调整超时配置',
    description: '在任务配置中增加超时时间',
    action: {
      type: 'add_constraint',
      content: '建议将任务超时时间从默认值增加到 60 秒或更长',
      position: 'end',
    },
    estimatedImpact: '预计可减少 50% 的超时失败',
    relatedPatternType: 'timeout',
  })

  return suggestions
}

/**
 * 执行错误相关建议
 */
function generateErrorSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const priority = calculatePriority(pattern)

  suggestions.push({
    id: generateSuggestionId(),
    priority,
    title: '检查输入数据格式',
    description: '确保输入数据格式符合模型要求',
    action: {
      type: 'add_constraint',
      content: '建议检查数据集中的输入数据格式，确保没有特殊字符或格式问题',
      position: 'end',
    },
    estimatedImpact: estimateImpact(pattern),
    relatedPatternType: 'error',
  })

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'medium',
    title: '检查模型配置',
    description: '确认模型配置参数正确',
    action: {
      type: 'add_constraint',
      content: '建议检查模型的 API Key、端点配置和参数设置',
      position: 'end',
    },
    estimatedImpact: '预计可减少 40% 的执行错误',
    relatedPatternType: 'error',
  })

  return suggestions
}

/**
 * 其他问题的通用建议
 */
function generateOtherSuggestions(
  pattern: FailurePattern,
  prompt: PromptInfo
): Suggestion[] {
  const suggestions: Suggestion[] = []

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'medium',
    title: '检查评估器配置',
    description: '确认评估器的配置和阈值设置合理',
    action: {
      type: 'add_constraint',
      content: '建议检查评估器的评判标准是否过于严格',
      position: 'end',
    },
    estimatedImpact: '可能提升通过率',
    relatedPatternType: 'other',
  })

  suggestions.push({
    id: generateSuggestionId(),
    priority: 'low',
    title: '添加更多示例',
    description: '在提示词中增加输入输出示例',
    action: {
      type: 'add_example',
      content: '\n\n参考示例：\n输入：[示例]\n输出：[示例]',
      position: 'end',
    },
    estimatedImpact: '预计可提升 20% 的通过率',
    relatedPatternType: 'other',
  })

  return suggestions
}

/**
 * 根据失败模式生成优化建议
 * @param patterns 失败模式列表
 * @param prompt 提示词信息
 * @returns 优化建议列表
 */
export function generateSuggestions(
  patterns: FailurePattern[],
  prompt: PromptInfo
): Suggestion[] {
  const allSuggestions: Suggestion[] = []

  for (const pattern of patterns) {
    let suggestions: Suggestion[] = []

    switch (pattern.type) {
      case 'format_error':
        suggestions = generateFormatSuggestions(pattern, prompt)
        break
      case 'content_missing':
        suggestions = generateContentSuggestions(pattern, prompt)
        break
      case 'keyword_missing':
        suggestions = generateKeywordSuggestions(pattern, prompt)
        break
      case 'length_violation':
        suggestions = generateLengthSuggestions(pattern, prompt)
        break
      case 'semantic_mismatch':
        suggestions = generateSemanticSuggestions(pattern, prompt)
        break
      case 'timeout':
        suggestions = generateTimeoutSuggestions(pattern, prompt)
        break
      case 'error':
        suggestions = generateErrorSuggestions(pattern, prompt)
        break
      case 'other':
      default:
        suggestions = generateOtherSuggestions(pattern, prompt)
    }

    allSuggestions.push(...suggestions)
  }

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  allSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // 去重（相同类型的建议只保留最高优先级的）
  const seen = new Set<string>()
  const uniqueSuggestions = allSuggestions.filter(s => {
    const key = `${s.action.type}-${s.relatedPatternType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return uniqueSuggestions
}

/**
 * 应用建议到提示词
 * @param prompt 原始提示词
 * @param suggestion 建议
 * @returns 修改后的提示词
 */
export function applySuggestion(
  prompt: PromptInfo,
  suggestion: Suggestion
): PromptInfo {
  const { action } = suggestion
  let newContent = prompt.content

  switch (action.position) {
    case 'start':
      newContent = action.content + '\n\n' + prompt.content
      break
    case 'end':
      newContent = prompt.content + action.content
      break
    case 'replace':
      // replace 模式下，action.content 是一个建议，不直接替换
      // 这里保持原样，由用户手动修改
      break
    default:
      newContent = prompt.content + action.content
  }

  return {
    ...prompt,
    content: newContent,
  }
}

/**
 * 预览建议应用后的 diff
 */
export function previewSuggestionDiff(
  prompt: PromptInfo,
  suggestion: Suggestion
): {
  original: string
  modified: string
  addedLines: string[]
} {
  const modified = applySuggestion(prompt, suggestion)

  const originalLines = prompt.content.split('\n')
  const modifiedLines = modified.content.split('\n')

  const addedLines = modifiedLines.filter(line => !originalLines.includes(line))

  return {
    original: prompt.content,
    modified: modified.content,
    addedLines,
  }
}
