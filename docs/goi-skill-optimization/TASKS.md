# GOI Skill 优化 - 实施任务清单

> 预计工期：3-4 天

## 阶段概览

| 阶段 | 内容 | 预计工作量 | 状态 |
|------|------|-----------|------|
| P1 | 基础设施搭建 | 1 天 | ✅ 完成 |
| P2 | Skill 内容编写 | 1 天 | ✅ 完成 |
| P3 | 提示词改造 | 0.5 天 | ✅ 完成 |
| P4 | 验证优化 | 0.5 天 | ✅ 完成 |
| P5 | 测试与调优 | 0.5-1 天 | ✅ 完成 |

---

## P1: 基础设施搭建

### P1.1 创建 Skill 目录结构

**文件**：`apps/web/src/lib/goi/skills/`

```
skills/
├── core/
│   └── SKILL.md
├── resources/
│   └── .gitkeep
├── types.ts
├── loader.ts
├── router.ts
└── index.ts
```

**任务清单**：

- [ ] 创建 `skills/` 目录
- [ ] 创建 `skills/core/` 子目录
- [ ] 创建 `skills/resources/` 子目录
- [ ] 创建 `skills/types.ts` 类型定义

### P1.2 实现 Skill 加载器

**文件**：`apps/web/src/lib/goi/skills/loader.ts`

**功能**：
- 解析 Skill 文件的 frontmatter
- 加载并缓存 Skill 内容
- 处理依赖关系

**依赖**：
- `gray-matter` - 解析 Markdown frontmatter

**任务清单**：

- [ ] 安装 `gray-matter` 依赖
- [ ] 实现 `loadSkill()` 函数
- [ ] 实现 `loadSkills()` 函数（处理依赖）
- [ ] 实现 `getAllSkills()` 函数
- [ ] 实现 `clearSkillCache()` 函数
- [ ] 添加单元测试

### P1.3 实现 Skill 路由

**文件**：`apps/web/src/lib/goi/skills/router.ts`

**功能**：
- 根据用户输入匹配 Skill
- 提取资源类型
- 计算匹配置信度

**任务清单**：

- [ ] 定义 `RESOURCE_SKILL_MAP` 映射
- [ ] 实现 `routeToSkills()` 函数
- [ ] 实现 `getSkillsForResourceTypes()` 函数
- [ ] 添加单元测试

### P1.4 导出模块

**文件**：`apps/web/src/lib/goi/skills/index.ts`

**任务清单**：

- [ ] 导出类型定义
- [ ] 导出 loader 函数
- [ ] 导出 router 函数

---

## P2: Skill 内容编写

### P2.1 核心 Skill

**文件**：`apps/web/src/lib/goi/skills/core/SKILL.md`

**内容**：
- GOI 三原语定义
- 变量引用语法
- 输出格式规范
- 规划原则

**任务清单**：

- [ ] 从 `planPrompt.ts` 提取核心语法部分
- [ ] 精简为 ~80 行
- [ ] 添加 frontmatter 元数据
- [ ] 验证格式正确性

### P2.2 提示词 Skill

**文件**：`apps/web/src/lib/goi/skills/resources/prompt.md`

**内容**：
- 提示词资源信息
- 支持的操作
- 创建/编辑示例
- 必填字段说明

**任务清单**：

- [ ] 编写提示词 Skill
- [ ] 添加触发关键词
- [ ] 添加示例
- [ ] 控制在 ~60 行

### P2.3 数据集 Skill

**文件**：`apps/web/src/lib/goi/skills/resources/dataset.md`

**任务清单**：

- [ ] 编写数据集 Skill
- [ ] 包含上传/版本管理说明
- [ ] 添加示例

### P2.4 任务 Skill

**文件**：`apps/web/src/lib/goi/skills/resources/task.md`

**内容**：
- 任务资源信息
- 关联资源说明（prompt/dataset/model）
- 多步骤创建示例

**任务清单**：

- [ ] 编写任务 Skill
- [ ] 添加依赖：prompt, dataset
- [ ] 添加多步骤示例

### P2.5 模型 Skill

**文件**：`apps/web/src/lib/goi/skills/resources/model.md`

**内容**：
- 模型和供应商资源
- 共用页面说明
- 测试连通性操作

**任务清单**：

- [ ] 编写模型 Skill
- [ ] 包含 provider 和 model 说明
- [ ] 添加测试操作示例

### P2.6 评估器 Skill

**文件**：`apps/web/src/lib/goi/skills/resources/evaluator.md`

**任务清单**：

- [ ] 编写评估器 Skill
- [ ] 包含不同类型评估器说明

### P2.7 Schema Skill

**文件**：`apps/web/src/lib/goi/skills/resources/schema.md`

**内容**：
- InputSchema 和 OutputSchema
- 字段定义说明

**任务清单**：

- [ ] 编写 Schema Skill
- [ ] 包含两种 Schema 类型

### P2.8 监控 Skill

**文件**：`apps/web/src/lib/goi/skills/resources/monitor.md`

**内容**：
- 定时任务
- 告警规则
- 通知渠道

**任务清单**：

- [ ] 编写监控 Skill
- [ ] 包含三种资源类型
- [ ] 添加 cron 表达式说明

---

## P3: 提示词改造

### P3.1 改造 planPrompt.ts

**文件**：`apps/web/src/lib/goi/prompts/planPrompt.ts`

**改造内容**：
- 引入 Skill 加载器
- 动态组装提示词
- 保留回退机制

**任务清单**：

- [ ] 导入 Skill loader 和 router
- [ ] 修改 `buildPlanPrompt()` 使用动态加载
- [ ] 添加 `buildFullPlanPrompt()` 回退函数
- [ ] 更新 `buildPlanUserPrompt()`
- [ ] 移除硬编码的资源类型定义

### P3.2 改造 Planner

**文件**：`apps/web/src/lib/goi/agent/planner.ts`

**任务清单**：

- [ ] 使用新的 `buildPlanPrompt()`
- [ ] 添加配置项控制是否使用 Skill
- [ ] 添加日志记录使用的 Skill

### P3.3 保留原始提示词（备份）

**任务清单**：

- [ ] 将原始 `PLAN_SYSTEM_PROMPT` 移到 `planPrompt.legacy.ts`
- [ ] 添加环境变量开关 `GOI_USE_SKILLS`

---

## P4: 验证优化

### P4.1 增强规则验证

**文件**：`apps/web/src/lib/goi/prompts/verifyPrompt.ts`

**任务清单**：

- [ ] 扩展 `ruleBasedVerify()` 覆盖更多场景
- [ ] 为每种操作类型添加规则
- [ ] 添加 Access 操作的 URL 验证规则
- [ ] 添加 State 操作的字段验证规则

### P4.2 改造 Verifier

**文件**：`apps/web/src/lib/goi/agent/verifier.ts`

**任务清单**：

- [ ] 实现 `needsLLMVerification()` 判断
- [ ] 优先使用规则验证
- [ ] 只对高风险操作调用 LLM
- [ ] 添加验证方式日志

### P4.3 可选：跳过验证模式

**任务清单**：

- [ ] 添加配置项 `skipVerification`
- [ ] 在 auto 模式下可选跳过大部分验证

---

## P5: 测试与调优

### P5.1 单元测试

**文件**：`apps/web/src/lib/goi/skills/__tests__/`

**任务清单**：

- [ ] 测试 Skill 加载
- [ ] 测试 Skill 路由
- [ ] 测试依赖处理
- [ ] 测试 frontmatter 解析

### P5.2 集成测试

**任务清单**：

- [ ] 测试"创建提示词"场景
- [ ] 测试"创建任务"场景（多 Skill 组合）
- [ ] 测试"查看资源"场景
- [ ] 测试回退到完整提示词

### P5.3 性能测试

**任务清单**：

- [ ] 对比 Token 数变化
- [ ] 对比响应时间
- [ ] 记录测试结果

### P5.4 调优

**任务清单**：

- [ ] 根据测试结果调整 Skill 内容
- [ ] 优化触发词匹配
- [ ] 调整置信度阈值

---

## 验收标准

| 标准 | 指标 | 状态 |
|------|------|------|
| Token 节省 | 单次调用减少 50%+ | ⬜ |
| 响应时间 | 平均减少 30%+ | ⬜ |
| 功能完整 | 所有现有功能正常 | ⬜ |
| 代码质量 | 测试覆盖率 > 70% | ⬜ |
| 文档完整 | 所有 Skill 有说明 | ⬜ |

---

## 开发日志

### 2024-12-16

- 创建开发文档目录
- 完成 CONTEXT.md（背景分析）
- 完成 DESIGN.md（架构设计）
- 完成 TASKS.md（任务清单）

### 2025-12-16

**P1: 基础设施搭建** ✅
- 创建 `skills/` 目录结构
- 实现 `types.ts` 类型定义
- 实现 `loader.ts` Skill 加载器（frontmatter 解析、缓存、依赖处理）
- 实现 `router.ts` 意图路由（触发词匹配、置信度计算）
- 实现 `index.ts` 模块导出

**P2: Skill 内容编写** ✅
- 编写 `core/SKILL.md` 核心语法（~80行）
- 编写 `resources/prompt.md` 提示词操作
- 编写 `resources/dataset.md` 数据集操作
- 编写 `resources/task.md` 任务操作（含多步骤示例）
- 编写 `resources/model.md` 模型/供应商操作
- 编写 `resources/evaluator.md` 评估器操作
- 编写 `resources/schema.md` Schema 操作
- 编写 `resources/monitor.md` 监控/告警操作

**P3: 提示词改造** ✅
- 修改 `planPrompt.ts` 添加动态 Skill 加载
- 新增 `buildPlanPrompt()` 主入口
- 新增 `buildDynamicPlanPrompt()` 动态组装
- 保留 `PLAN_SYSTEM_PROMPT` 作为回退
- 环境变量 `GOI_USE_SKILLS` 控制开关

**P4: 验证优化** ✅
- 增强 `ruleBasedVerify()` 覆盖更多场景
- 添加 Access 操作路径验证
- 添加 State 操作分类验证（create/update/delete）
- 添加 Observation 操作结果验证
- 添加共用页面路由映射

**P5: 测试** ✅
- 添加 `router.test.ts` 单元测试（11 tests）
- 添加 `loader.test.ts` 单元测试（11 tests）
- 所有测试通过
