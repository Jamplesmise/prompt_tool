# Phase 11: FastGPT 模型集成与前端优化

## 阶段概述

本阶段实现 FastGPT 模型配置的直接集成，让 prompt_tool 可以直接读取和使用 FastGPT 已配置的模型，同时优化前端模型管理页面，参考 FastGPT 的 UI/UX 设计。

## 背景与目标

### 当前问题

1. **模型配置重复维护**：FastGPT 和 prompt_tool 各自维护独立的模型配置，增加运维成本
2. **前端功能简单**：当前模型管理页面功能较基础，缺少模型类型筛选、能力标签、批量配置等功能
3. **模型类型单一**：仅支持 LLM 类型，不支持 Embedding、TTS 等其他模型类型

### 目标

1. 直接读取 FastGPT MongoDB 中的模型配置（只读）
2. 保留本地自定义模型能力（PostgreSQL）
3. 前端参考 FastGPT 优化用户体验

## 技术架构

### 数据源架构

```
┌─────────────────────────────────────────────────────────────┐
│                      prompt_tool                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │   PostgreSQL        │    │   FastGPT MongoDB   │         │
│  │   (Prisma)          │    │   (只读连接)         │         │
│  ├─────────────────────┤    ├─────────────────────┤         │
│  │ - Provider          │    │ - system_models     │         │
│  │ - Model (自定义)     │    │   (模型配置)         │         │
│  └─────────────────────┘    └─────────────────────┘         │
│            │                          │                      │
│            └──────────┬───────────────┘                      │
│                       ▼                                      │
│         ┌─────────────────────────┐                         │
│         │   ModelService          │                         │
│         │   (统一模型服务层)        │                         │
│         │   - getAllModels()      │                         │
│         │   - getActiveModels()   │                         │
│         └─────────────────────────┘                         │
│                       │                                      │
│                       ▼                                      │
│         ┌─────────────────────────┐                         │
│         │   API Layer             │                         │
│         │   /api/v1/models/...    │                         │
│         └─────────────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### FastGPT 模型数据结构

```typescript
// FastGPT system_models 集合结构
type SystemModelItemType = {
  model: string           // 模型标识（唯一键）
  metadata: {
    type: 'llm' | 'embedding' | 'tts' | 'stt' | 'rerank'
    provider: string      // 提供商 ID
    name: string          // 显示名称
    isActive: boolean     // 是否激活
    isCustom: boolean     // 是否自定义

    // 定价（两种模式）
    inputPrice?: number   // 输入价格 / 1K tokens
    outputPrice?: number  // 输出价格 / 1K tokens
    charsPointsPrice?: number  // 字符价格

    // LLM 特有字段
    maxContext?: number   // 最大上下文
    maxResponse?: number  // 最大响应长度
    vision?: boolean      // 视觉能力
    toolChoice?: boolean  // 工具调用
    functionCall?: boolean

    // Embedding 特有字段
    maxToken?: number
    defaultToken?: number

    // 其他...
  }
}
```

## 前端优化参考

### FastGPT 模型管理页面特性

1. **Tab 页结构**
   - 可用模型（ModelTable）- 显示激活模型列表
   - 模型配置（ModelConfigTable）- 详细配置管理
   - 渠道管理（ChannelTable）- AI Proxy 渠道
   - 调用日志（ChannelLog）
   - 监控仪表板（ModelDashboard）

2. **筛选功能**
   - 提供商筛选（带 Logo）
   - 模型类型筛选（LLM/Embedding/TTS/STT/Rerank）
   - 名称搜索
   - 仅显示激活模型

3. **表格展示**
   - 模型名称 + 能力标签（上下文长度、视觉、工具调用）
   - 模型类型彩色标签
   - 定价信息（输入/输出分开）
   - 启用开关（直接切换）
   - 操作按钮（测试、编辑、删除）

4. **编辑弹窗**
   - 双列表格布局
   - 左侧：基础信息（ID、提供商、名称、定价）
   - 右侧：能力配置（工具调用、视觉、推理等）

5. **高级功能**
   - JSON 批量配置导入导出
   - 默认模型设置
   - 模型测试

## 环境配置

### 新增环境变量

```env
# FastGPT MongoDB 连接（只读）
FASTGPT_MONGODB_URI=mongodb://localhost:27017/fastgpt

# 是否启用 FastGPT 模型同步
ENABLE_FASTGPT_MODELS=true
```

## 依赖关系

### 前置条件

- Phase 1-10 全部完成
- FastGPT 已部署并配置了模型
- MongoDB 网络可达

### 影响范围

- 模型管理页面（重构）
- 任务创建页面（模型选择器）
- 评估器配置（LLM 评估器模型选择）

## 风险与注意事项

1. **MongoDB 连接安全**：使用只读账号，避免误修改 FastGPT 数据
2. **数据一致性**：FastGPT 模型变更后需同步刷新
3. **降级策略**：FastGPT 不可用时，仍可使用本地自定义模型
4. **前端兼容**：保持与现有任务创建流程的兼容性

## 参考资料

### FastGPT 相关文件

| 文件 | 说明 |
|------|------|
| `/home/sinocare/dev/FastGPT/packages/global/core/ai/model.d.ts` | 模型类型定义 |
| `/home/sinocare/dev/FastGPT/packages/service/core/ai/config/schema.ts` | MongoDB Schema |
| `/home/sinocare/dev/FastGPT/projects/app/src/pages/account/model/index.tsx` | 模型管理主页 |
| `/home/sinocare/dev/FastGPT/projects/app/src/components/core/ai/ModelTable/index.tsx` | 模型表格组件 |
| `/home/sinocare/dev/FastGPT/projects/app/src/pageComponents/account/model/AddModelBox.tsx` | 模型编辑弹窗 |
| `/home/sinocare/dev/FastGPT/projects/app/src/pageComponents/account/model/ModelConfigTable.tsx` | 配置表格 |

### 本项目相关文件

| 文件 | 说明 |
|------|------|
| `apps/web/src/app/(dashboard)/models/page.tsx` | 当前模型管理页 |
| `apps/web/src/components/model/` | 模型相关组件 |
| `apps/web/src/hooks/useModels.ts` | 模型数据 Hooks |
| `apps/web/src/services/models.ts` | 模型 API 服务 |
| `apps/web/prisma/schema.prisma` | 数据库 Schema |
