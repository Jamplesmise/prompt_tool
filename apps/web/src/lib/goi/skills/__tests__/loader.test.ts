/**
 * Skill Loader 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { loadSkill, loadSkills, getAllSkills, clearSkillCache, skillExists } from '../loader'

describe('loadSkill', () => {
  beforeEach(() => {
    clearSkillCache()
  })

  it('应该加载 core skill', () => {
    const skill = loadSkill('core')
    expect(skill).not.toBeNull()
    expect(skill?.metadata.name).toBe('core')
    expect(skill?.content).toContain('Access')
    expect(skill?.content).toContain('State')
    expect(skill?.content).toContain('Observation')
  })

  it('应该加载 prompt skill', () => {
    const skill = loadSkill('prompt')
    expect(skill).not.toBeNull()
    expect(skill?.metadata.name).toBe('prompt')
    expect(skill?.metadata.dependencies).toContain('core')
  })

  it('应该加载 task skill', () => {
    const skill = loadSkill('task')
    expect(skill).not.toBeNull()
    expect(skill?.metadata.dependencies).toContain('prompt')
    expect(skill?.metadata.dependencies).toContain('dataset')
  })

  it('不存在的 skill 应该返回 null', () => {
    const skill = loadSkill('nonexistent')
    expect(skill).toBeNull()
  })

  it('应该使用缓存', () => {
    const skill1 = loadSkill('core')
    const skill2 = loadSkill('core')
    expect(skill1).toBe(skill2) // 相同引用
  })
})

describe('loadSkills', () => {
  beforeEach(() => {
    clearSkillCache()
  })

  it('应该加载多个 skill 并合并内容', () => {
    const content = loadSkills(['prompt', 'dataset'])
    expect(content).toContain('提示词')
    expect(content).toContain('数据集')
  })

  it('应该自动包含 core', () => {
    const content = loadSkills(['prompt'])
    expect(content).toContain('Access')
    expect(content).toContain('State')
  })

  it('应该处理依赖', () => {
    const content = loadSkills(['task'])
    // task 依赖 prompt 和 dataset
    expect(content).toContain('提示词')
    expect(content).toContain('数据集')
    expect(content).toContain('任务')
  })
})

describe('getAllSkills', () => {
  it('应该返回所有 skill 元数据', () => {
    const skills = getAllSkills()
    expect(skills.length).toBeGreaterThan(0)

    const names = skills.map(s => s.name)
    expect(names).toContain('core')
    expect(names).toContain('prompt')
    expect(names).toContain('dataset')
    expect(names).toContain('task')
  })
})

describe('skillExists', () => {
  it('存在的 skill 应该返回 true', () => {
    expect(skillExists('core')).toBe(true)
    expect(skillExists('prompt')).toBe(true)
  })

  it('不存在的 skill 应该返回 false', () => {
    expect(skillExists('nonexistent')).toBe(false)
  })
})
