/**
 * Skill Router 单元测试
 */

import { describe, it, expect } from 'vitest'
import { routeToSkills, getSkillsForResourceTypes, RESOURCE_SKILL_MAP } from '../router'

describe('routeToSkills', () => {
  it('应该匹配提示词相关的输入', () => {
    const result = routeToSkills('帮我创建一个提示词')
    expect(result.skills).toContain('core')
    expect(result.skills).toContain('prompt')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('应该匹配数据集相关的输入', () => {
    const result = routeToSkills('上传一个数据集')
    expect(result.skills).toContain('dataset')
  })

  it('应该匹配任务相关的输入', () => {
    const result = routeToSkills('运行测试任务')
    expect(result.skills).toContain('task')
  })

  it('应该匹配多个 Skill', () => {
    const result = routeToSkills('用情感分析提示词测试数据集')
    expect(result.skills).toContain('prompt')
    expect(result.skills).toContain('task')
  })

  it('无匹配时应该返回 core', () => {
    const result = routeToSkills('随便说点什么')
    expect(result.skills).toEqual(['core'])
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('应该正确识别模型相关请求', () => {
    const result = routeToSkills('添加一个模型供应商')
    expect(result.skills).toContain('model')
  })

  it('应该正确识别监控相关请求', () => {
    const result = routeToSkills('创建一个定时任务')
    expect(result.skills).toContain('monitor')
  })
})

describe('getSkillsForResourceTypes', () => {
  it('应该返回对应的 Skill', () => {
    const skills = getSkillsForResourceTypes(['prompt', 'dataset'])
    expect(skills).toContain('core')
    expect(skills).toContain('prompt')
    expect(skills).toContain('dataset')
  })

  it('空输入应该只返回 core', () => {
    const skills = getSkillsForResourceTypes([])
    expect(skills).toEqual(['core'])
  })
})

describe('RESOURCE_SKILL_MAP', () => {
  it('应该包含所有主要资源类型', () => {
    expect(RESOURCE_SKILL_MAP).toHaveProperty('prompt')
    expect(RESOURCE_SKILL_MAP).toHaveProperty('dataset')
    expect(RESOURCE_SKILL_MAP).toHaveProperty('task')
    expect(RESOURCE_SKILL_MAP).toHaveProperty('model')
    expect(RESOURCE_SKILL_MAP).toHaveProperty('evaluator')
  })

  it('共用 Skill 的资源类型应该映射正确', () => {
    // model 和 provider 共用 model skill
    expect(RESOURCE_SKILL_MAP.model).toBe('model')
    expect(RESOURCE_SKILL_MAP.provider).toBe('model')

    // schema 相关
    expect(RESOURCE_SKILL_MAP.input_schema).toBe('schema')
    expect(RESOURCE_SKILL_MAP.output_schema).toBe('schema')
  })
})
