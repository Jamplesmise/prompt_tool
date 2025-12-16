# GOI Skill 优化 - 架构设计

> 基于 Claude Code Skill 机制的 GOI 提示词模块化改造方案

## 1. 整体架构

### 1.1 设计目标

```
                    当前架构
┌─────────────────────────────────────────┐
│           planPrompt.ts (~500行)         │
│  ┌─────────────────────────────────────┐│
│  │ 核心语法 + 17种资源 + 示例 + 规则   ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
                     ↓
                所有请求都加载全部内容

                    目标架构
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  core-skill  │  │ prompt-skill │  │ dataset-skill│
│   (~80行)    │  │   (~60行)    │  │    (~60行)   │
│  GOI 核心语法 │  │  提示词操作   │  │   数据集操作  │
└──────────────┘  └──────────────┘  └──────────────┘
        ↓                ↓                 ↓
              按需组合加载，互不干扰
```

### 1.2 核心组件

```
apps/web/src/lib/goi/
├── skills/                    # [新增] Skill 目录
│   ├── core/
│   │   └── SKILL.md          # GOI 核心语法
│   ├── resources/
│   │   ├── prompt.md         # 提示词操作
│   │   ├── dataset.md        # 数据集操作
│   │   ├── task.md           # 任务操作
│   │   ├── model.md          # 模型/供应商操作
│   │   ├── evaluator.md      # 评估器操作
│   │   ├── schema.md         # Schema 操作
│   │   └── monitor.md        # 监控/告警操作
│   ├── loader.ts             # Skill 加载器
│   ├── router.ts             # Skill 路由（意图 → Skill）
│   └── index.ts              # 导出
├── prompts/
│   ├── planPrompt.ts         # [改造] 动态组装提示词
│   └── ...
└── intent/
    └── parser.ts             # [增强] 提取资源类型
```

## 2. Skill 定义规范

### 2.1 Skill 文件格式

采用 Markdown 格式，便于阅读和维护：

```markdown
---
name: skill-name
description: 简短描述 + 触发关键词 + 适用场景
triggers:
  - 关键词1
  - 关键词2
dependencies:
  - core  # 依赖的其他 Skill
---

# Skill 标题

## 资源信息
[资源类型、页面路径等基础信息]

## 支持的操作
[操作类型表格]

## 操作示例
[具体的 JSON 示例]

## 必填字段
[创建/更新时的必填字段]

## 注意事项
[特殊处理逻辑、边界情况]
```

### 2.2 Skill 类型定义

```typescript
// skills/types.ts

/**
 * Skill 元数据（从 frontmatter 解析）
 */
export type SkillMetadata = {
  /** Skill 名称（唯一标识） */
  name: string
  /** 描述（用于 LLM 理解） */
  description: string
  /** 触发关键词 */
  triggers: string[]
  /** 依赖的其他 Skill */
  dependencies?: string[]
}

/**
 * 加载后的 Skill
 */
export type LoadedSkill = {
  metadata: SkillMetadata
  content: string
}

/**
 * Skill 路由结果
 */
export type SkillRouteResult = {
  /** 匹配的 Skill 列表 */
  skills: string[]
  /** 匹配置信度 */
  confidence: number
  /** 检测到的资源类型 */
  resourceTypes: string[]
}
```

## 3. 核心 Skill 设计

### 3.1 core/SKILL.md

GOI 核心语法，所有请求都会加载：

```markdown
---
name: core
description: GOI 核心语法和输出格式规范
triggers: []
dependencies: []
---

# GOI 核心语法

你是一个 AI 测试平台的操作规划专家。将用户目标拆分为原子操作的 TODO List。

## 三种操作类型

### 1. Access（访问）
导航到页面、打开弹窗、选择资源。

```json
{
  "type": "access",
  "target": { "resourceType": "xxx", "resourceId": "可选" },
  "action": "view|edit|create|select|navigate",
  "context": { "page": "可选", "dialog": "可选" }
}
```

### 2. State（状态变更）
创建、更新、删除资源。

```json
{
  "type": "state",
  "target": { "resourceType": "xxx", "resourceId": "更新/删除时必填" },
  "action": "create|update|delete",
  "expectedState": { "字段": "值" }
}
```

### 3. Observation（查询）
查询资源状态、获取列表。

```json
{
  "type": "observation",
  "queries": [{
    "resourceType": "xxx",
    "filters": { "字段": "条件" },
    "fields": ["id", "name", "..."]
  }]
}
```

## 变量引用

后续步骤可引用前序步骤的结果：

- `$1.result.resourceId` - 引用步骤1创建的资源 ID
- `$prev.result.id` - 引用上一步结果
- `$prompt:情感分析` - 按名称搜索资源

## 输出格式

```json
{
  "goalAnalysis": "对用户目标的理解",
  "items": [
    {
      "id": "1",
      "title": "步骤标题",
      "description": "步骤描述",
      "category": "access|state|observation",
      "goiOperation": { ... },
      "dependsOn": [],
      "checkpoint": { "required": false }
    }
  ],
  "warnings": []
}
```

## 规划原则

1. 每个步骤只做一件事
2. 明确指定依赖关系
3. 关键步骤设置检查点
4. 避免冗余导航
```

### 3.2 resources/prompt.md

提示词操作专用 Skill：

```markdown
---
name: prompt
description: 处理提示词的创建、编辑、查看操作。当用户提到"提示词"、"prompt"、"系统提示"时激活。
triggers:
  - 提示词
  - prompt
  - 系统提示
  - 用户提示
dependencies:
  - core
---

# 提示词操作

## 资源信息

| 属性 | 值 |
|------|-----|
| 类型 | `prompt` |
| 列表页 | `/prompts` |
| 创建页 | `/prompts/new` |
| 详情页 | `/prompts/{id}` |

## 支持的操作

| 操作 | GOI 类型 | 必填字段 |
|------|----------|----------|
| 创建 | State | name, content |
| 编辑 | State | resourceId |
| 查看 | Access | 可选 resourceId |
| 删除 | State | resourceId（建议 checkpoint） |

## 创建示例

```json
{
  "type": "state",
  "target": { "resourceType": "prompt" },
  "action": "create",
  "expectedState": {
    "name": "情感分析提示词",
    "description": "分析文本情感倾向",
    "content": "你是一个情感分析助手。请分析以下文本的情感倾向（正面/负面/中性）：\n\n{{input}}",
    "systemPrompt": "你是专业的情感分析专家。",
    "tags": ["情感", "分析"]
  }
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| name | ✅ | 提示词名称 |
| content | ✅ | 用户提示词内容，支持 `{{变量}}` 语法 |
| description | ❌ | 描述 |
| systemPrompt | ❌ | 系统提示词 |
| tags | ❌ | 标签数组 |

## 变量语法

提示词内容支持变量占位符：
- `{{input}}` - 单个输入变量
- `{{question}}` - 问题变量
- `{{context}}` - 上下文变量

系统会自动提取变量列表。
```

### 3.3 resources/task.md

任务操作 Skill（关联多个资源）：

```markdown
---
name: task
description: 创建和管理测试任务。当用户提到"测试"、"任务"、"跑一下"、"执行"时激活。
triggers:
  - 测试
  - 任务
  - 跑一下
  - 执行
  - 测试任务
dependencies:
  - core
  - prompt   # 任务需要关联提示词
  - dataset  # 任务需要关联数据集
---

# 任务操作

## 资源信息

| 属性 | 值 |
|------|-----|
| 类型 | `task` |
| 列表页 | `/tasks` |
| 创建页 | `/tasks/new` |
| 结果页 | `/tasks/{id}/results` |

## 支持的操作

| 操作 | GOI 类型 | 必填字段 |
|------|----------|----------|
| 创建 | State | name, datasetId |
| 查看 | Access | resourceId |
| 暂停 | State | resourceId |
| 恢复 | State | resourceId |
| 停止 | State | resourceId |

## 创建示例

创建任务需要关联提示词、数据集、模型，通常是多步骤操作：

```json
// 步骤 1：查找提示词
{
  "type": "observation",
  "queries": [{
    "resourceType": "prompt",
    "filters": { "name": { "contains": "情感" } },
    "fields": ["id", "name"]
  }]
}

// 步骤 2：查找数据集
{
  "type": "observation",
  "queries": [{
    "resourceType": "dataset",
    "filters": { "name": { "contains": "测试" } },
    "fields": ["id", "name", "rowCount"]
  }]
}

// 步骤 3：查找可用模型
{
  "type": "observation",
  "queries": [{
    "resourceType": "model",
    "filters": { "isActive": true },
    "fields": ["id", "name"]
  }]
}

// 步骤 4：创建任务（引用前序结果）
{
  "type": "state",
  "target": { "resourceType": "task" },
  "action": "create",
  "expectedState": {
    "name": "情感分析测试",
    "promptId": "$1.result.results[0].id",
    "datasetId": "$2.result.results[0].id",
    "modelIds": ["$3.result.results[0].id"]
  }
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| name | ✅ | 任务名称 |
| datasetId | ✅ | 数据集 ID |
| promptId | ❌ | 提示词 ID（A/B 测试时可选） |
| modelIds | ❌ | 模型 ID 数组 |
| evaluatorIds | ❌ | 评估器 ID 数组 |

## 注意事项

- 创建任务后会自动入队执行
- 任务执行中不可删除
- 建议在创建前查询关联资源是否存在
```

## 4. Skill 加载器

### 4.1 loader.ts

```typescript
// skills/loader.ts

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { SkillMetadata, LoadedSkill } from './types'

/** Skill 文件目录 */
const SKILLS_DIR = path.join(process.cwd(), 'src/lib/goi/skills')

/** Skill 缓存 */
const skillCache = new Map<string, LoadedSkill>()

/**
 * 加载单个 Skill
 */
export function loadSkill(name: string): LoadedSkill | null {
  // 检查缓存
  if (skillCache.has(name)) {
    return skillCache.get(name)!
  }

  // 查找 Skill 文件
  const possiblePaths = [
    path.join(SKILLS_DIR, 'core', 'SKILL.md'),
    path.join(SKILLS_DIR, 'resources', `${name}.md`),
  ]

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data, content } = matter(fileContent)

      const skill: LoadedSkill = {
        metadata: data as SkillMetadata,
        content: content.trim(),
      }

      skillCache.set(name, skill)
      return skill
    }
  }

  console.warn(`[SkillLoader] Skill not found: ${name}`)
  return null
}

/**
 * 加载多个 Skill 并合并
 */
export function loadSkills(names: string[]): string {
  const skills: LoadedSkill[] = []
  const loaded = new Set<string>()

  // 递归加载（处理依赖）
  function load(name: string) {
    if (loaded.has(name)) return
    loaded.add(name)

    const skill = loadSkill(name)
    if (!skill) return

    // 先加载依赖
    for (const dep of skill.metadata.dependencies || []) {
      load(dep)
    }

    skills.push(skill)
  }

  for (const name of names) {
    load(name)
  }

  // 合并内容
  return skills.map(s => s.content).join('\n\n---\n\n')
}

/**
 * 获取所有可用 Skill
 */
export function getAllSkills(): SkillMetadata[] {
  const skills: SkillMetadata[] = []

  // 扫描 core 目录
  const corePath = path.join(SKILLS_DIR, 'core', 'SKILL.md')
  if (fs.existsSync(corePath)) {
    const { data } = matter(fs.readFileSync(corePath, 'utf-8'))
    skills.push(data as SkillMetadata)
  }

  // 扫描 resources 目录
  const resourcesDir = path.join(SKILLS_DIR, 'resources')
  if (fs.existsSync(resourcesDir)) {
    for (const file of fs.readdirSync(resourcesDir)) {
      if (file.endsWith('.md')) {
        const filePath = path.join(resourcesDir, file)
        const { data } = matter(fs.readFileSync(filePath, 'utf-8'))
        skills.push(data as SkillMetadata)
      }
    }
  }

  return skills
}

/**
 * 清除缓存（开发时使用）
 */
export function clearSkillCache(): void {
  skillCache.clear()
}
```

### 4.2 router.ts

```typescript
// skills/router.ts

import type { SkillRouteResult, SkillMetadata } from './types'
import { getAllSkills } from './loader'

/** 资源类型到 Skill 名称的映射 */
const RESOURCE_SKILL_MAP: Record<string, string> = {
  prompt: 'prompt',
  prompt_version: 'prompt',
  prompt_branch: 'prompt',
  dataset: 'dataset',
  dataset_version: 'dataset',
  model: 'model',
  provider: 'model',
  evaluator: 'evaluator',
  task: 'task',
  task_result: 'task',
  scheduled_task: 'monitor',
  alert_rule: 'monitor',
  notify_channel: 'monitor',
  input_schema: 'schema',
  output_schema: 'schema',
}

/**
 * 根据用户输入路由到合适的 Skill
 */
export function routeToSkills(input: string): SkillRouteResult {
  const inputLower = input.toLowerCase()
  const matchedSkills = new Set<string>(['core']) // core 总是加载
  const resourceTypes: string[] = []
  let maxConfidence = 0

  // 获取所有 Skill 的触发词
  const allSkills = getAllSkills()

  for (const skill of allSkills) {
    if (skill.name === 'core') continue

    // 检查触发词匹配
    for (const trigger of skill.triggers || []) {
      if (inputLower.includes(trigger.toLowerCase())) {
        matchedSkills.add(skill.name)
        maxConfidence = Math.max(maxConfidence, 0.8)

        // 记录资源类型
        const resourceType = Object.entries(RESOURCE_SKILL_MAP)
          .find(([_, skillName]) => skillName === skill.name)?.[0]
        if (resourceType && !resourceTypes.includes(resourceType)) {
          resourceTypes.push(resourceType)
        }
        break
      }
    }
  }

  // 如果没有匹配到任何 Skill，使用默认规则
  if (matchedSkills.size === 1) {
    // 关键词检测
    if (/创建|新建|添加/.test(input)) {
      maxConfidence = 0.6
    }
    if (/测试|跑|执行/.test(input)) {
      matchedSkills.add('task')
      maxConfidence = 0.7
    }
  }

  return {
    skills: Array.from(matchedSkills),
    confidence: maxConfidence || 0.5,
    resourceTypes,
  }
}

/**
 * 根据资源类型获取 Skill
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
```

## 5. 提示词组装

### 5.1 改造 planPrompt.ts

```typescript
// prompts/planPrompt.ts（改造后）

import { loadSkills } from '../skills/loader'
import { routeToSkills, getSkillsForResourceTypes } from '../skills/router'
import type { PlanContext } from './types'

/**
 * 构建计划提示词（动态加载 Skill）
 */
export function buildPlanPrompt(
  goal: string,
  context?: PlanContext
): string {
  // 1. 路由到合适的 Skill
  const routeResult = routeToSkills(goal)

  // 2. 如果上下文中有资源类型，补充相关 Skill
  if (context?.selectedResources) {
    const resourceTypes = context.selectedResources.map(r => r.type)
    const additionalSkills = getSkillsForResourceTypes(resourceTypes)
    for (const skill of additionalSkills) {
      if (!routeResult.skills.includes(skill)) {
        routeResult.skills.push(skill)
      }
    }
  }

  // 3. 加载并合并 Skill
  const skillContent = loadSkills(routeResult.skills)

  // 4. 构建最终提示词
  return `${skillContent}

---

## 当前上下文

${buildContextSection(context)}

## 用户目标

${goal}

## 任务

请将上述目标拆分为原子操作，生成 TODO List。返回纯 JSON 格式。`
}

/**
 * 构建上下文部分
 */
function buildContextSection(context?: PlanContext): string {
  if (!context) return '无'

  const parts: string[] = []

  if (context.currentPage) {
    parts.push(`- 当前页面：${context.currentPage}`)
  }

  if (context.selectedResources?.length) {
    parts.push('- 选中的资源：')
    for (const r of context.selectedResources) {
      parts.push(`  - ${r.type}: ${r.name || r.id}`)
    }
  }

  return parts.length > 0 ? parts.join('\n') : '无'
}

/**
 * 回退：使用完整提示词（兼容模式）
 */
export function buildFullPlanPrompt(goal: string, context?: PlanContext): string {
  // 加载所有 Skill
  const allSkills = ['core', 'prompt', 'dataset', 'task', 'model', 'evaluator', 'schema', 'monitor']
  return loadSkills(allSkills) + buildContextSection(context) + goal
}
```

## 6. 验证优化

### 6.1 规则优先策略

```typescript
// agent/verifier.ts（改造）

import { ruleBasedVerify, canUseRuleVerification } from '../prompts/verifyPrompt'

export class Verifier {
  /**
   * 验证执行结果
   * 优先使用规则验证，只有必要时才调用 LLM
   */
  async verify(item: TodoItem, result: unknown): Promise<VerifyResult> {
    // 1. 尝试规则验证（无 LLM 调用）
    if (canUseRuleVerification(item)) {
      const ruleResult = ruleBasedVerify(item, result)
      if (ruleResult) {
        return ruleResult
      }
    }

    // 2. 只有复杂情况才调用 LLM
    if (this.needsLLMVerification(item)) {
      return this.llmVerify(item, result)
    }

    // 3. 默认通过
    return {
      success: true,
      method: 'rule',
      reason: '操作已完成',
      confidence: 0.8,
      needsHumanReview: false,
      suggestedAction: 'continue',
    }
  }

  /**
   * 判断是否需要 LLM 验证
   */
  private needsLLMVerification(item: TodoItem): boolean {
    // 删除操作需要验证
    const operation = item.goiOperation as { action?: string }
    if (operation.action === 'delete') return true

    // 复合操作需要验证
    if (item.category === 'compound') return true

    // 明确要求人工审查
    if (item.checkpoint?.type === 'review') return true

    return false
  }
}
```

## 7. 性能对比

### 7.1 Token 数估算

| 场景 | 当前 | 优化后 | 节省 |
|------|------|--------|------|
| 创建提示词 | ~4000 | ~800 | **80%** |
| 创建任务 | ~4000 | ~1200 | **70%** |
| 查看资源 | ~4000 | ~600 | **85%** |
| 复杂操作 | ~4000 | ~1500 | **62%** |

### 7.2 LLM 调用次数

| 场景 | 当前 | 优化后 | 说明 |
|------|------|--------|------|
| 3 步任务 | 4 次 | 1-2 次 | 规则验证跳过 LLM |
| 简单导航 | 2 次 | 0 次 | 规则直接处理 |
| 删除操作 | 2 次 | 2 次 | 保持验证 |

## 8. 扩展指南

### 8.1 添加新资源类型

1. 创建 Skill 文件：`skills/resources/new-resource.md`
2. 更新路由映射：`router.ts` 中的 `RESOURCE_SKILL_MAP`
3. 无需修改核心提示词

### 8.2 Skill 编写规范

1. **保持简洁**：每个 Skill < 100 行
2. **必备章节**：资源信息、支持操作、示例、字段说明
3. **触发词明确**：description 中包含关键词
4. **依赖显式**：在 frontmatter 中声明依赖
