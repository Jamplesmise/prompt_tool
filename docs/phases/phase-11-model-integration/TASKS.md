# Phase 11: 任务清单

## 子阶段 11.1: 后端 FastGPT 数据接入 ✅

### 任务列表

- [x] **11.1.1** 添加 MongoDB 依赖和连接配置
  - 安装 mongoose 包
  - 添加环境变量 `FASTGPT_MONGODB_URI`
  - 创建 MongoDB 连接管理器 `lib/mongodb/connection.ts`

- [x] **11.1.2** 创建 FastGPT 模型 Schema 和类型
  - 创建 `types/fastgpt.ts` 定义 FastGPT 模型类型
  - 创建 `models/fastgptModel.ts` Mongoose Schema（只读）

- [x] **11.1.3** 实现 FastGPT 模型服务层
  - 创建 `services/fastgptModelService.ts`
  - 实现 `getActiveModels()` 获取激活的模型
  - 实现 `getModelByName(model: string)` 获取单个模型
  - 实现模型类型筛选

- [x] **11.1.4** 创建统一模型 API
  - `GET /api/v1/fastgpt/models` - 获取 FastGPT 模型列表
  - `GET /api/v1/fastgpt/models/:model` - 获取单个模型详情
  - `GET /api/v1/models/all` - 合并 FastGPT + 本地模型

- [x] **11.1.5** 添加模型数据缓存
  - 使用 Redis 缓存 FastGPT 模型列表
  - 设置合理的缓存过期时间（5 分钟）
  - 提供手动刷新接口

### 验收标准

- [x] 能够成功连接 FastGPT MongoDB
- [x] API 返回正确的模型列表
- [x] FastGPT 不可用时不影响本地模型功能
- [x] 缓存正常工作

---

## 子阶段 11.2: 前端页面重构 ✅

### 任务列表

- [x] **11.2.1** 页面 Tab 结构改造
  - 添加 Ant Design Tabs 组件
  - Tab 1: 可用模型（模型列表）
  - Tab 2: 模型配置（详细编辑）
  - Tab 3: 提供商管理（现有功能迁移）

- [x] **11.2.2** 模型类型和提供商支持
  - 创建 `ModelTypeTag` 组件（彩色标签）
  - 创建 `ProviderAvatar` 组件（提供商 Logo）
  - 定义模型类型枚举和颜色映射

- [x] **11.2.3** 筛选栏增强
  - 添加模型类型筛选（LLM/Embedding/TTS/STT/Rerank）
  - 提供商筛选增加 Logo 显示
  - 添加「仅显示激活」开关

- [x] **11.2.4** 表格列优化
  - 模型名称列：增加模型 ID、能力标签
  - 新增模型类型列（彩色标签）
  - 优化定价列（输入/输出分开显示）
  - 启用状态改为 Switch 开关

- [x] **11.2.5** 能力标签组件
  - 创建 `ModelCapabilityTags` 组件
  - 显示：上下文长度、视觉支持、工具调用等
  - 根据模型类型显示不同标签

- [x] **11.2.6** 定价展示优化
  - 创建 `ModelPriceDisplay` 组件
  - LLM：分别显示输入/输出价格
  - Embedding/TTS/STT：显示单一价格
  - 支持不同单位（tokens/chars/秒）

### 验收标准

- [x] Tab 切换正常
- [x] 筛选功能完整
- [x] 表格展示信息丰富
- [x] 能力标签正确显示
- [x] 定价显示清晰

---

## 子阶段 11.3: 高级功能实现

### 任务列表

- [ ] **11.3.1** 模型编辑弹窗增强
  - 改为双列表格布局
  - 左侧：基础信息（ID、提供商、名称、定价）
  - 右侧：能力配置（LLM 专有字段）
  - 根据模型类型动态显示字段

- [ ] **11.3.2** 默认模型设置功能
  - 创建 `DefaultModelModal` 组件
  - 支持设置各类型默认模型
  - 存储到系统设置或数据库

- [ ] **11.3.3** JSON 批量配置功能
  - 创建 `JsonConfigModal` 组件
  - 支持导出当前模型配置为 JSON
  - 支持导入 JSON 批量更新配置
  - 导入前校验数据格式

- [x] **11.3.4** 模型数据源标识
  - 在模型列表中标识数据来源（FastGPT / 本地）
  - FastGPT 模型显示为只读
  - 本地模型支持完整编辑

- [ ] **11.3.5** 模型选择器组件升级
  - 更新任务创建页的模型选择器
  - 支持按类型筛选（仅 LLM）
  - 显示模型能力标签
  - 支持搜索

### 验收标准

- [ ] 编辑弹窗布局合理
- [ ] 默认模型设置正常保存
- [ ] JSON 导入导出功能正常
- [ ] 数据源标识清晰
- [ ] 模型选择器体验提升

---

## 文件变更清单

### 新增文件

```
apps/web/
├── src/
│   ├── lib/
│   │   └── mongodb.ts                    # MongoDB 连接管理
│   ├── types/
│   │   └── fastgpt.ts                    # FastGPT 类型定义
│   ├── services/
│   │   └── fastgptModelService.ts        # FastGPT 模型服务
│   ├── app/api/v1/
│   │   ├── fastgpt/
│   │   │   └── models/
│   │   │       ├── route.ts              # FastGPT 模型列表
│   │   │       └── [model]/route.ts      # 单个模型详情
│   │   └── models/
│   │       └── all/route.ts              # 合并模型列表
│   └── components/model/
│       ├── ModelTypeTag.tsx              # 模型类型标签
│       ├── ModelCapabilityTags.tsx       # 能力标签
│       ├── ModelPriceDisplay.tsx         # 定价展示
│       ├── ProviderAvatar.tsx            # 提供商头像
│       ├── DefaultModelModal.tsx         # 默认模型设置
│       └── JsonConfigModal.tsx           # JSON 配置弹窗
```

### 修改文件

```
apps/web/
├── .env.example                          # 新增环境变量示例
├── package.json                          # 添加 mongoose 依赖
├── src/
│   ├── app/(dashboard)/models/page.tsx   # 页面重构
│   ├── components/model/
│   │   ├── index.ts                      # 导出新组件
│   │   ├── EditModelModal.tsx            # 增强编辑弹窗
│   │   └── AddModelModal.tsx             # 适配新数据结构
│   ├── hooks/
│   │   └── useModels.ts                  # 增加 FastGPT 模型 hooks
│   └── services/
│       └── models.ts                     # 增加 FastGPT API 调用
```

---

## 开发日志

| 日期 | 完成内容 | 备注 |
|------|---------|------|
| 2025-12-07 | 11.1 后端 FastGPT 数据接入完成 | MongoDB 连接、模型服务、API、Redis 缓存 |
| 2025-12-07 | 11.2 前端页面重构完成 | Tab 结构、模型组件、筛选功能、定价展示 |
| 2025-12-07 | FastGPT 模型任务执行集成 | modelInvoker + taskExecutor 支持 FastGPT 模型通过 OneHub 调用 |
| 2025-12-07 | 修复 MongoDB 认证问题 | 添加 authSource=admin 参数 |
| 2025-12-07 | 实现模型同步方案 | SyncedModel 表 + 一键同步 + 定期同步（5分钟间隔） |
| 2025-12-07 | 前端同步按钮 | 添加"同步 FastGPT"按钮，显示上次同步时间 |
