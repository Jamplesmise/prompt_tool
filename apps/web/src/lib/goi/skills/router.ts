/**
 * GOI Skill 路由器
 *
 * 根据用户输入自动匹配合适的 Skill
 */

import type { SkillRouteResult } from './types'
import { getAllSkills } from './loader'

/**
 * 资源类型到 Skill 名称的映射
 */
export const RESOURCE_SKILL_MAP: Record<string, string> = {
  // 提示词相关
  prompt: 'prompt',
  prompt_version: 'prompt',
  prompt_branch: 'prompt',
  // 数据集相关
  dataset: 'dataset',
  dataset_version: 'dataset',
  // 模型相关
  model: 'model',
  provider: 'model',
  // 评估器
  evaluator: 'evaluator',
  // 任务相关
  task: 'task',
  task_result: 'task',
  // Schema 相关
  input_schema: 'schema',
  output_schema: 'schema',
  // 监控相关
  scheduled_task: 'monitor',
  alert_rule: 'monitor',
  notify_channel: 'monitor',
}

/**
 * 内置触发词映射（补充 Skill 文件中的 triggers）
 */
const BUILTIN_TRIGGERS: Record<string, string[]> = {
  prompt: ['提示词', 'prompt', '系统提示', '用户提示', 'system prompt'],
  dataset: ['数据集', 'dataset', '数据', '测试数据', '样本'],
  task: ['任务', 'task', '测试', '跑一下', '执行', '运行'],
  model: ['模型', 'model', '供应商', 'provider', 'API'],
  evaluator: ['评估器', 'evaluator', '评估', '打分', '评分'],
  schema: ['schema', '结构', '字段', '输入结构', '输出结构'],
  monitor: ['监控', '告警', '定时', '通知', '调度', 'cron'],
}

/**
 * 动作关键词（用于提高匹配置信度）
 */
const ACTION_KEYWORDS = {
  create: ['创建', '新建', '添加', '新增', 'create', 'add', 'new'],
  view: ['查看', '打开', '看看', '显示', 'view', 'show', 'open'],
  edit: ['编辑', '修改', '更新', 'edit', 'update', 'modify'],
  delete: ['删除', '移除', 'delete', 'remove'],
  list: ['列表', '所有', '全部', 'list', 'all'],
}

/**
 * 根据用户输入路由到合适的 Skill
 *
 * @param input 用户输入文本
 * @returns 路由结果
 */
export function routeToSkills(input: string): SkillRouteResult {
  const inputLower = input.toLowerCase()
  const matchedSkills = new Set<string>()
  const resourceTypes: string[] = []
  const matchedTriggers: string[] = []
  let maxConfidence = 0

  // 获取所有 Skill 的触发词（从文件 + 内置）
  const allSkills = getAllSkills()
  const skillTriggers = new Map<string, string[]>()

  for (const skill of allSkills) {
    if (skill.name === 'core') continue

    // 合并文件中的 triggers 和内置 triggers
    const triggers = [
      ...(skill.triggers || []),
      ...(BUILTIN_TRIGGERS[skill.name] || []),
    ]
    skillTriggers.set(skill.name, triggers)
  }

  // 匹配触发词
  for (const [skillName, triggers] of skillTriggers) {
    for (const trigger of triggers) {
      const triggerLower = trigger.toLowerCase()
      if (inputLower.includes(triggerLower)) {
        matchedSkills.add(skillName)
        matchedTriggers.push(trigger)

        // 记录对应的资源类型
        for (const [resType, sName] of Object.entries(RESOURCE_SKILL_MAP)) {
          if (sName === skillName && !resourceTypes.includes(resType)) {
            resourceTypes.push(resType)
            break // 只添加主资源类型
          }
        }

        // 计算置信度
        const triggerConfidence = trigger.length > 2 ? 0.8 : 0.6
        maxConfidence = Math.max(maxConfidence, triggerConfidence)
        break // 一个 Skill 匹配一次即可
      }
    }
  }

  // 检查是否有动作关键词（提高置信度）
  for (const keywords of Object.values(ACTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (inputLower.includes(kw.toLowerCase())) {
        maxConfidence = Math.min(maxConfidence + 0.1, 1)
        break
      }
    }
  }

  // 如果没有匹配到任何 Skill，返回默认结果
  if (matchedSkills.size === 0) {
    return {
      skills: ['core'],
      confidence: 0.3,
      resourceTypes: [],
      matchedTriggers: [],
    }
  }

  // core 总是包含
  const skills = ['core', ...Array.from(matchedSkills)]

  return {
    skills,
    confidence: maxConfidence,
    resourceTypes,
    matchedTriggers,
  }
}

/**
 * 根据资源类型获取 Skill
 *
 * @param types 资源类型列表
 * @returns Skill 名称列表
 */
export function getSkillsForResourceTypes(types: string[]): string[] {
  const skills = new Set<string>(['core'])

  for (const type of types) {
    const skillName = RESOURCE_SKILL_MAP[type]
    if (skillName) {
      skills.add(skillName)
    }
  }

  return Array.from(skills)
}

/**
 * 获取 Skill 的依赖链
 *
 * @param skillName Skill 名称
 * @returns 包含依赖的 Skill 名称列表
 */
export function getSkillWithDependencies(skillName: string): string[] {
  const allSkills = getAllSkills()
  const skill = allSkills.find((s) => s.name === skillName)

  if (!skill) {
    return ['core']
  }

  const result = new Set<string>(['core'])

  // 添加依赖
  for (const dep of skill.dependencies || []) {
    result.add(dep)
  }

  // 添加自身
  result.add(skillName)

  return Array.from(result)
}

/**
 * 检测输入中是否包含多资源操作
 *
 * 例如："用情感分析提示词测试数据集" 涉及 prompt + task + dataset
 */
export function detectMultiResourceOperation(input: string): string[] {
  const result = routeToSkills(input)

  // 如果匹配到 task skill，可能需要额外加载关联资源
  if (result.skills.includes('task')) {
    const additionalSkills = new Set(result.skills)

    // task 通常需要 prompt 和 dataset
    additionalSkills.add('prompt')
    additionalSkills.add('dataset')

    return Array.from(additionalSkills)
  }

  return result.skills
}
