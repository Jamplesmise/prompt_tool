// LLM 评估器默认提示词模板

/**
 * 默认评估提示词模板
 * 可用变量：{{input}}, {{output}}, {{expected}}
 */
export const DEFAULT_EVALUATION_PROMPT = `你是一个专业的 AI 输出质量评估专家。请评估以下模型输出的质量。

## 原始输入
{{input}}

## 模型输出
{{output}}

{{#if expected}}
## 期望输出
{{expected}}
{{/if}}

## 评估要求
请从以下几个维度评估输出质量：
1. 相关性：输出是否与输入相关
2. 准确性：输出内容是否正确
3. 完整性：输出是否完整回答了问题
4. 清晰度：输出是否表达清晰

## 输出格式
请以 JSON 格式返回评估结果：
\`\`\`json
{
  "overall": <0-10 的整体评分>,
  "dimensions": {
    "relevance": <0-10>,
    "accuracy": <0-10>,
    "completeness": <0-10>,
    "clarity": <0-10>
  },
  "reason": "<简要说明评分理由>"
}
\`\`\`

请直接输出 JSON，不要添加其他内容。`

/**
 * 简单评分模板
 */
export const SIMPLE_SCORING_PROMPT = `评估以下 AI 输出的质量，给出 0-10 分的评分。

输入：{{input}}
输出：{{output}}
{{#if expected}}期望：{{expected}}{{/if}}

返回 JSON 格式：{"overall": <分数>, "reason": "<理由>"}`

/**
 * 对比评估模板
 */
export const COMPARISON_PROMPT = `比较模型输出与期望输出的差异。

输入：{{input}}
模型输出：{{output}}
期望输出：{{expected}}

评估维度：
1. 语义相似度 (0-10)
2. 关键信息覆盖度 (0-10)
3. 格式符合度 (0-10)

返回 JSON：
{
  "overall": <综合评分>,
  "semantic_similarity": <分数>,
  "key_info_coverage": <分数>,
  "format_compliance": <分数>,
  "reason": "<评估理由>"
}`

/**
 * 模板变量替换
 */
export function renderTemplate(
  template: string,
  variables: {
    input: string
    output: string
    expected?: string | null
  }
): string {
  let result = template

  // 替换简单变量
  result = result.replace(/\{\{input\}\}/g, variables.input)
  result = result.replace(/\{\{output\}\}/g, variables.output)

  // 处理条件块 {{#if expected}}...{{/if}}
  if (variables.expected) {
    result = result.replace(/\{\{expected\}\}/g, variables.expected)
    result = result.replace(/\{\{#if expected\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
  } else {
    result = result.replace(/\{\{#if expected\}\}[\s\S]*?\{\{\/if\}\}/g, '')
  }

  return result.trim()
}
