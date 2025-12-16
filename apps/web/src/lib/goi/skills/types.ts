/**
 * GOI Skill 类型定义
 */

/**
 * Skill 元数据（从 frontmatter 解析）
 */
export type SkillMetadata = {
  /** Skill 名称（唯一标识） */
  name: string
  /** 描述（用于 LLM 理解和触发匹配） */
  description: string
  /** 触发关键词 */
  triggers?: string[]
  /** 依赖的其他 Skill */
  dependencies?: string[]
}

/**
 * 加载后的 Skill
 */
export type LoadedSkill = {
  /** 元数据 */
  metadata: SkillMetadata
  /** Skill 内容（Markdown 正文） */
  content: string
  /** 文件路径 */
  filePath: string
}

/**
 * Skill 路由结果
 */
export type SkillRouteResult = {
  /** 匹配的 Skill 名称列表 */
  skills: string[]
  /** 匹配置信度 (0-1) */
  confidence: number
  /** 检测到的资源类型 */
  resourceTypes: string[]
  /** 匹配的触发词 */
  matchedTriggers: string[]
}

/**
 * Skill 加载选项
 */
export type SkillLoadOptions = {
  /** 是否包含依赖 */
  includeDependencies?: boolean
  /** 是否使用缓存 */
  useCache?: boolean
}
