/**
 * GOI Skill 加载器
 *
 * 负责加载、解析、缓存 Skill 文件
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { SkillMetadata, LoadedSkill, SkillLoadOptions } from './types'

/** Skill 文件根目录 */
const SKILLS_ROOT = path.join(process.cwd(), 'src/lib/goi/skills')

/** Skill 缓存 */
const skillCache = new Map<string, LoadedSkill>()

/** 是否已扫描过所有 Skill */
let allSkillsScanned = false

/** 所有 Skill 元数据缓存 */
let allSkillsCache: SkillMetadata[] = []

/**
 * 获取 Skill 文件路径
 */
function getSkillFilePath(name: string): string | null {
  // 优先级：core > resources
  const possiblePaths = [
    path.join(SKILLS_ROOT, 'core', 'SKILL.md'),
    path.join(SKILLS_ROOT, 'resources', `${name}.md`),
  ]

  // core skill 特殊处理
  if (name === 'core') {
    const corePath = possiblePaths[0]
    return fs.existsSync(corePath) ? corePath : null
  }

  // 其他 skill 在 resources 目录
  const resourcePath = path.join(SKILLS_ROOT, 'resources', `${name}.md`)
  return fs.existsSync(resourcePath) ? resourcePath : null
}

/**
 * 解析 Skill 文件
 */
function parseSkillFile(filePath: string): LoadedSkill | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    // 验证必填字段
    if (!data.name) {
      console.warn(`[SkillLoader] Missing 'name' in frontmatter: ${filePath}`)
      return null
    }

    const metadata: SkillMetadata = {
      name: data.name,
      description: data.description || '',
      triggers: Array.isArray(data.triggers) ? data.triggers : [],
      dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
    }

    return {
      metadata,
      content: content.trim(),
      filePath,
    }
  } catch (error) {
    console.error(`[SkillLoader] Failed to parse skill file: ${filePath}`, error)
    return null
  }
}

/**
 * 加载单个 Skill
 *
 * @param name Skill 名称
 * @param options 加载选项
 */
export function loadSkill(name: string, options?: SkillLoadOptions): LoadedSkill | null {
  const useCache = options?.useCache !== false

  // 检查缓存
  if (useCache && skillCache.has(name)) {
    return skillCache.get(name)!
  }

  // 查找文件
  const filePath = getSkillFilePath(name)
  if (!filePath) {
    console.warn(`[SkillLoader] Skill not found: ${name}`)
    return null
  }

  // 解析文件
  const skill = parseSkillFile(filePath)
  if (!skill) {
    return null
  }

  // 缓存
  if (useCache) {
    skillCache.set(name, skill)
  }

  return skill
}

/**
 * 加载多个 Skill 并合并内容
 *
 * @param names Skill 名称列表
 * @param options 加载选项
 * @returns 合并后的 Skill 内容
 */
export function loadSkills(names: string[], options?: SkillLoadOptions): string {
  const includeDeps = options?.includeDependencies !== false
  const loaded = new Set<string>()
  const skills: LoadedSkill[] = []

  // 递归加载函数（处理依赖）
  function load(name: string) {
    if (loaded.has(name)) return
    loaded.add(name)

    const skill = loadSkill(name, options)
    if (!skill) return

    // 先加载依赖
    if (includeDeps && skill.metadata.dependencies) {
      for (const dep of skill.metadata.dependencies) {
        load(dep)
      }
    }

    skills.push(skill)
  }

  // 确保 core 总是第一个加载
  if (!names.includes('core')) {
    load('core')
  }

  // 加载指定的 Skill
  for (const name of names) {
    load(name)
  }

  // 合并内容（按加载顺序）
  return skills.map((s) => s.content).join('\n\n---\n\n')
}

/**
 * 获取所有可用的 Skill 元数据
 */
export function getAllSkills(): SkillMetadata[] {
  if (allSkillsScanned && allSkillsCache.length > 0) {
    return allSkillsCache
  }

  const skills: SkillMetadata[] = []

  // 扫描 core 目录
  const corePath = path.join(SKILLS_ROOT, 'core', 'SKILL.md')
  if (fs.existsSync(corePath)) {
    const skill = parseSkillFile(corePath)
    if (skill) {
      skills.push(skill.metadata)
      skillCache.set(skill.metadata.name, skill)
    }
  }

  // 扫描 resources 目录
  const resourcesDir = path.join(SKILLS_ROOT, 'resources')
  if (fs.existsSync(resourcesDir)) {
    const files = fs.readdirSync(resourcesDir)
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(resourcesDir, file)
        const skill = parseSkillFile(filePath)
        if (skill) {
          skills.push(skill.metadata)
          skillCache.set(skill.metadata.name, skill)
        }
      }
    }
  }

  allSkillsScanned = true
  allSkillsCache = skills

  return skills
}

/**
 * 清除 Skill 缓存
 *
 * 开发时使用，修改 Skill 文件后调用
 */
export function clearSkillCache(): void {
  skillCache.clear()
  allSkillsScanned = false
  allSkillsCache = []
}

/**
 * 检查 Skill 是否存在
 */
export function skillExists(name: string): boolean {
  return getSkillFilePath(name) !== null
}

/**
 * 获取 Skill 统计信息
 */
export function getSkillStats(): {
  total: number
  cached: number
  names: string[]
} {
  const all = getAllSkills()
  return {
    total: all.length,
    cached: skillCache.size,
    names: all.map((s) => s.name),
  }
}
