/**
 * GOI Skill 系统
 *
 * 模块化的 Skill 加载与路由系统，支持按需加载 Skill 内容
 */

// 导出类型
export type {
  SkillMetadata,
  LoadedSkill,
  SkillRouteResult,
  SkillLoadOptions,
} from './types'

// 导出 Loader 函数
export {
  loadSkill,
  loadSkills,
  getAllSkills,
  clearSkillCache,
  skillExists,
  getSkillStats,
} from './loader'

// 导出 Router 函数
export {
  RESOURCE_SKILL_MAP,
  routeToSkills,
  getSkillsForResourceTypes,
  getSkillWithDependencies,
  detectMultiResourceOperation,
} from './router'
