# GOI 系统实施任务清单

> 完成 GOI 系统与页面功能的完整集成

## 相关文档

| 文档 | 用途 |
|------|------|
| `GOI-CONFIG-CHECKLIST.md` | 配置项检查清单 |
| `GOI-PAGE-FEATURES-AUDIT.md` | 页面功能审计结果 |
| `GOI-DIALOG-INTEGRATION-PLAN.md` | 弹窗集成实施方案 |

---

## 任务概览

| 阶段 | 任务数 | 预计工作量 | 优先级 |
|-----|-------|----------|-------|
| 阶段 1：基础设施 | 3 | 中 | P0 |
| 阶段 2：Access 配置补全 | 5 | 小 | P0 |
| 阶段 3：弹窗集成 | 7 | 大 | P0 |
| 阶段 4：State 操作支持 | 4 | 中 | P1 |
| 阶段 5：Observation 支持 | 3 | 小 | P2 |
| 阶段 6：测试验证 | 6 | 中 | P0 |

---

## 阶段 1：基础设施

### 1.1 创建弹窗 ID 常量文件

**文件**: `apps/web/src/lib/goi/dialogIds.ts`

```bash
# 状态: 待完成
# 依赖: 无
```

**任务**:
- [ ] 创建文件
- [ ] 定义所有弹窗 ID 常量
- [ ] 导出类型定义

---

### 1.2 创建弹窗监听 Hook

**文件**: `apps/web/src/hooks/useGoiDialogListener.ts`

```bash
# 状态: 待完成
# 依赖: 1.1
```

**任务**:
- [ ] 创建 Hook
- [ ] 实现事件监听逻辑
- [ ] 添加类型定义
- [ ] 编写使用示例

---

### 1.3 添加新 ResourceType

**文件**: `packages/shared/src/types/goi/events.ts`

```bash
# 状态: 部分完成 (已添加 settings, dashboard, monitor, schema)
# 依赖: 无
```

**任务**:
- [x] 添加 `settings`
- [x] 添加 `dashboard`
- [x] 添加 `monitor`
- [x] 添加 `schema`
- [ ] 添加 `comparison`（对比分析）

---

## 阶段 2：Access 配置补全

### 2.1 更新资源类型别名

**文件**: `apps/web/src/lib/goi/executor/shared.ts`

```bash
# 状态: 部分完成
# 依赖: 1.3
```

**任务**:
- [x] 添加系统页面别名
- [ ] 添加 `comparison` 别名

---

### 2.2 更新路由映射

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```bash
# 状态: 部分完成
# 依赖: 2.1
```

**需要添加的路由**:
- [x] `settings` - `/settings`
- [x] `dashboard` - `/`
- [x] `monitor` - `/monitor`
- [x] `schema` - `/schemas`
- [ ] `comparison` - `/comparison/versions`

---

### 2.3 更新弹窗 ID 映射

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```bash
# 状态: 待更新
# 依赖: 1.1
```

**需要更新的映射**:
- [ ] 使用 `GOI_DIALOG_IDS` 常量
- [ ] 添加 `provider` 创建弹窗
- [ ] 添加 `prompt_version` 创建弹窗
- [ ] 添加 `prompt_branch` 创建弹窗
- [ ] 添加 `dataset_version` 创建弹窗

---

### 2.4 更新选择器弹窗映射

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```bash
# 状态: 待完成
# 依赖: 1.1
```

**任务**:
- [ ] 使用 `GOI_DIALOG_IDS` 常量
- [ ] 验证所有选择器 ID 正确

---

### 2.5 添加 Provider 路由

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```bash
# 状态: 待完成
# 依赖: 2.1
```

**任务**:
- [ ] 完善 `provider` 路由（支持 create, edit, view）

---

## 阶段 3：弹窗集成

### 3.1 模型配置页面

**文件**: `apps/web/src/app/(dashboard)/models/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `add-provider-modal` 监听
- [ ] 添加 `add-model-modal` 监听
- [ ] 添加 `edit-provider-modal` 监听（URL 参数方式）
- [ ] 添加 `edit-model-modal` 监听（URL 参数方式）

---

### 3.2 提示词详情页面

**文件**: `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `publish-version-modal` 监听
- [ ] 添加 `create-branch-modal` 监听
- [ ] 添加 `merge-branch-modal` 监听

---

### 3.3 数据集详情页面

**文件**: `apps/web/src/app/(dashboard)/datasets/[id]/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `create-version-modal` 监听
- [ ] 添加 `upload-modal` 监听

---

### 3.4 定时任务页面

**文件**: `apps/web/src/app/(dashboard)/scheduled/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `create-scheduled-modal` 监听
- [ ] 添加 `edit-scheduled-modal` 监听

---

### 3.5 监控告警页面

**文件**: `apps/web/src/app/(dashboard)/monitor/alerts/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `create-alert-rule-modal` 监听
- [ ] 添加 `create-notify-channel-modal` 监听

---

### 3.6 Schema 管理页面

**文件**: `apps/web/src/app/(dashboard)/schemas/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `infer-schema-modal` 监听

---

### 3.7 数据集列表页面

**文件**: `apps/web/src/app/(dashboard)/datasets/page.tsx`

```bash
# 状态: 待完成
# 依赖: 1.2
```

**任务**:
- [ ] 导入 `useGoiDialogListener`
- [ ] 添加 `create-dataset-modal` 监听

---

## 阶段 4：State 操作支持

### 4.1 添加 Provider State 支持

**文件**: `apps/web/src/lib/goi/executor/stateHandler.ts`

```bash
# 状态: 待完成
# 依赖: 无
```

**任务**:
- [ ] 添加 `provider` 到 `resourceModelMap`
- [ ] 实现 `handleCreate` case
- [ ] 实现 `handleUpdate` case
- [ ] 实现 `handleDelete` case

---

### 4.2 添加版本相关 State 支持

**文件**: `apps/web/src/lib/goi/executor/stateHandler.ts`

```bash
# 状态: 待完成
# 依赖: 无
```

**任务**:
- [ ] 添加 `prompt_version` 支持
- [ ] 添加 `prompt_branch` 支持
- [ ] 添加 `dataset_version` 支持

---

### 4.3 添加定时任务 State 支持

**文件**: `apps/web/src/lib/goi/executor/stateHandler.ts`

```bash
# 状态: 待完成
# 依赖: 无
```

**任务**:
- [ ] 完善 `scheduled_task` State 操作

---

### 4.4 添加监控 State 支持

**文件**: `apps/web/src/lib/goi/executor/stateHandler.ts`

```bash
# 状态: 待完成
# 依赖: 无
```

**任务**:
- [ ] 完善 `alert_rule` State 操作
- [ ] 完善 `notify_channel` State 操作

---

## 阶段 5：Observation 支持

### 5.1 添加 Provider Observation 支持

**文件**: `apps/web/src/lib/goi/executor/observationHandler.ts`

```bash
# 状态: 待完成
# 依赖: 无
```

**任务**:
- [ ] 添加 `provider` 到 `resourceModelMap`
- [ ] 添加默认查询字段

---

### 5.2 添加版本 Observation 支持

**文件**: `apps/web/src/lib/goi/executor/observationHandler.ts`

```bash
# 状态: 部分完成
# 依赖: 无
```

**任务**:
- [x] 添加 `prompt_version` 支持
- [ ] 添加 `prompt_branch` 支持
- [ ] 添加 `dataset_version` 支持

---

### 5.3 添加定时任务/监控 Observation 支持

**文件**: `apps/web/src/lib/goi/executor/observationHandler.ts`

```bash
# 状态: 部分完成
# 依赖: 无
```

**任务**:
- [x] 添加 `scheduled_task` 支持
- [x] 添加 `alert_rule` 支持
- [x] 添加 `notify_channel` 支持

---

## 阶段 6：测试验证

### 6.1 模型配置测试

```bash
# 状态: 待完成
# 依赖: 3.1
```

**测试用例**:
- [ ] "帮我添加一个 OpenAI 供应商" → 打开 AddProviderModal
- [ ] "添加一个 GPT-4 模型" → 打开 AddModelModal
- [ ] "打开模型配置页" → 导航到 /models

---

### 6.2 提示词管理测试

```bash
# 状态: 待完成
# 依赖: 3.2
```

**测试用例**:
- [ ] "创建一个新提示词" → 导航到 /prompts/new
- [ ] "发布当前版本" → 打开 PublishModal
- [ ] "创建实验分支" → 打开 CreateBranchModal

---

### 6.3 数据集管理测试

```bash
# 状态: 待完成
# 依赖: 3.3, 3.7
```

**测试用例**:
- [ ] "创建新数据集" → 打开 DatasetUploadModal
- [ ] "创建新版本" → 打开 CreateVersionModal

---

### 6.4 定时任务测试

```bash
# 状态: 待完成
# 依赖: 3.4
```

**测试用例**:
- [ ] "创建定时任务" → 打开 CreateScheduledModal
- [ ] "查看定时任务列表" → 导航到 /scheduled

---

### 6.5 监控告警测试

```bash
# 状态: 待完成
# 依赖: 3.5
```

**测试用例**:
- [ ] "创建告警规则" → 打开 AlertRuleModal
- [ ] "添加通知渠道" → 打开 CreateChannelModal

---

### 6.6 端到端流程测试

```bash
# 状态: 待完成
# 依赖: 6.1-6.5
```

**测试用例**:
- [ ] 完整流程："帮我创建一个测试任务，使用 GPT-4 模型测试情感分析提示词"
- [ ] 多步骤流程："创建供应商 → 添加模型 → 创建提示词 → 创建任务"

---

## 执行顺序建议

```
周期 1 (基础):
├── 1.1 创建 dialogIds.ts
├── 1.2 创建 useGoiDialogListener.ts
└── 2.3 更新弹窗 ID 映射

周期 2 (核心页面):
├── 3.1 模型配置页面
├── 6.1 模型配置测试
├── 3.4 定时任务页面
└── 6.4 定时任务测试

周期 3 (提示词/数据集):
├── 3.2 提示词详情页面
├── 3.3 数据集详情页面
├── 3.7 数据集列表页面
├── 6.2 提示词管理测试
└── 6.3 数据集管理测试

周期 4 (监控/Schema):
├── 3.5 监控告警页面
├── 3.6 Schema 管理页面
├── 6.5 监控告警测试
└── 4.1-4.4 State 操作

周期 5 (收尾):
├── 5.1-5.3 Observation 支持
├── 2.4-2.5 其他配置
└── 6.6 端到端测试
```

---

## 进度跟踪

| 日期 | 完成任务 | 备注 |
|-----|---------|------|
| - | - | - |
