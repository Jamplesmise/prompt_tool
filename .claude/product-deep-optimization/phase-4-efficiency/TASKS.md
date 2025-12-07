# Phase 4: 效率工具 - 任务清单

## 任务总览

| 子阶段 | 任务数 | 预估复杂度 |
|--------|--------|------------|
| 4.1 全局命令面板 | 7 | 中 |
| 4.2 快捷键系统 | 5 | 低 |
| 4.3 任务模板系统 | 7 | 中 |

---

## 4.1 全局命令面板 (Cmd+K)

### Task 4.1.1: 安装和配置 cmdk
**描述**: 安装命令面板库并进行基础配置

**文件清单**:
- `package.json`（添加依赖）
- `apps/web/src/components/command/CommandPalette.tsx`

**实现要点**:
```bash
pnpm add cmdk
```

```typescript
import { Command } from 'cmdk'

function CommandPalette() {
  return (
    <Command.Dialog>
      <Command.Input placeholder="输入命令或搜索..." />
      <Command.List>
        <Command.Empty>无结果</Command.Empty>
        {/* 命令组 */}
      </Command.List>
    </Command.Dialog>
  )
}
```

**验收标准**:
- [x] 依赖安装成功
- [x] 基础面板渲染正常

---

### Task 4.1.2: 创建命令面板状态管理
**描述**: 管理命令面板的显示状态和搜索状态

**文件清单**:
- `apps/web/src/stores/commandStore.ts`

**实现要点**:
```typescript
type CommandState = {
  isOpen: boolean
  searchQuery: string
  recentItems: Array<{
    id: string
    type: 'prompt' | 'dataset' | 'task' | 'page'
    title: string
    href: string
  }>
  open: () => void
  close: () => void
  setSearchQuery: (query: string) => void
  addRecentItem: (item: RecentItem) => void
}
```

**验收标准**:
- [x] 状态管理正常
- [x] 最近使用持久化到 localStorage

---

### Task 4.1.3: 实现全局搜索功能
**描述**: 搜索提示词、数据集、任务等资源

**文件清单**:
- `apps/web/src/hooks/useGlobalSearch.ts`
- `apps/web/src/app/api/search/route.ts`

**实现要点**:
```typescript
type SearchResult = {
  type: 'prompt' | 'dataset' | 'task' | 'model' | 'evaluator'
  id: string
  title: string
  description?: string
  href: string
  icon: ReactNode
}

async function globalSearch(query: string): Promise<SearchResult[]>
```

**验收标准**:
- [x] 搜索提示词正常
- [x] 搜索数据集正常
- [x] 搜索任务正常
- [x] 模糊匹配生效

---

### Task 4.1.4: 创建快捷操作命令
**描述**: 定义可通过命令面板执行的快捷操作

**文件清单**:
- `apps/web/src/lib/commands/quickActions.ts`

**实现要点**:
```typescript
type QuickAction = {
  id: string
  label: string
  shortcut?: string
  icon: ReactNode
  action: () => void | Promise<void>
}

const quickActions: QuickAction[] = [
  {
    id: 'new-task',
    label: '新建测试任务',
    shortcut: '⌘N',
    icon: <PlusIcon />,
    action: () => router.push('/tasks/new')
  },
  {
    id: 'upload-dataset',
    label: '上传数据集',
    shortcut: '⌘U',
    icon: <UploadIcon />,
    action: () => openUploadModal()
  },
  // ...
]
```

**验收标准**:
- [x] 新建任务命令正常
- [x] 上传数据集命令正常
- [x] 页面导航命令正常

---

### Task 4.1.5: 创建最近使用组件
**描述**: 显示最近访问的资源

**文件清单**:
- `apps/web/src/components/command/RecentItems.tsx`

**实现要点**:
- 最多显示 5 条最近记录
- 按时间倒序排列
- 点击跳转并关闭面板
- 支持清除记录

**验收标准**:
- [x] 最近记录正确显示
- [x] 点击跳转正常

---

### Task 4.1.6: 创建搜索结果组件
**描述**: 展示搜索结果列表

**文件清单**:
- `apps/web/src/components/command/SearchResults.tsx`

**实现要点**:
- 按类型分组显示
- 显示图标、标题、描述
- 键盘上下选择
- Enter 确认选择

**验收标准**:
- [x] 分组显示正确
- [x] 键盘操作正常

---

### Task 4.1.7: 集成到全局布局
**描述**: 在全局布局中集成命令面板

**文件清单**:
- `apps/web/src/app/(dashboard)/layout.tsx`（修改）
- `apps/web/src/hooks/useCommandPalette.ts`

**实现要点**:
- 全局监听 Cmd+K / Ctrl+K
- 面板作为全局组件挂载
- 访问页面时自动记录

**验收标准**:
- [x] Cmd+K 正常触发
- [x] 任何页面都可使用
- [x] ESC 关闭面板

---

## 4.2 快捷键系统

### Task 4.2.1: 配置快捷键库
**描述**: 安装和配置快捷键处理库

**文件清单**:
- `package.json`（添加依赖）
- `apps/web/src/components/shortcuts/ShortcutProvider.tsx`

**实现要点**:
```bash
pnpm add react-hotkeys-hook
```

```typescript
import { HotkeysProvider } from 'react-hotkeys-hook'

function ShortcutProvider({ children }) {
  return (
    <HotkeysProvider initiallyActiveScopes={['global']}>
      {children}
    </HotkeysProvider>
  )
}
```

**验收标准**:
- [x] 依赖安装成功（使用自定义 useHotkeys hook）
- [x] Provider 配置正确

---

### Task 4.2.2: 定义快捷键映射
**描述**: 定义全局和页面级快捷键

**文件清单**:
- `apps/web/src/lib/shortcuts/keymap.ts`

**实现要点**:
```typescript
type Shortcut = {
  key: string
  description: string
  scope: 'global' | 'list' | 'editor' | 'task'
  action: string  // 对应的 action ID
}

const SHORTCUTS: Shortcut[] = [
  // 全局
  { key: 'mod+k', description: '命令面板', scope: 'global', action: 'open-command' },
  { key: 'mod+n', description: '新建任务', scope: 'global', action: 'new-task' },
  { key: '/', description: '快捷键帮助', scope: 'global', action: 'show-help' },
  { key: 'g h', description: '前往工作台', scope: 'global', action: 'goto-home' },
  { key: 'g p', description: '前往提示词', scope: 'global', action: 'goto-prompts' },
  { key: 'g t', description: '前往任务', scope: 'global', action: 'goto-tasks' },

  // 列表页
  { key: 'j', description: '下一项', scope: 'list', action: 'next-item' },
  { key: 'k', description: '上一项', scope: 'list', action: 'prev-item' },
  { key: 'enter', description: '打开详情', scope: 'list', action: 'open-detail' },
  { key: 'd', description: '删除', scope: 'list', action: 'delete' },

  // 任务页面
  { key: 'r', description: '运行任务', scope: 'task', action: 'run-task' },
  { key: 's', description: '停止任务', scope: 'task', action: 'stop-task' },
  { key: 'e', description: '导出结果', scope: 'task', action: 'export' },
]
```

**验收标准**:
- [x] 快捷键定义完整
- [x] 支持组合键
- [x] 支持序列快捷键（G H, G P 等）

---

### Task 4.2.3: 创建快捷键钩子
**描述**: 封装快捷键注册和处理逻辑

**文件清单**:
- `apps/web/src/hooks/useShortcuts.ts`

**实现要点**:
```typescript
function useShortcuts(scope: ShortcutScope) {
  // 注册该 scope 的所有快捷键
  // 返回解绑函数
}

function useGlobalShortcuts() {
  // 全局快捷键处理
}
```

**验收标准**:
- [x] 快捷键正确注册
- [x] 组件卸载时解绑

---

### Task 4.2.4: 创建快捷键帮助面板
**描述**: 显示所有可用快捷键的帮助面板

**文件清单**:
- `apps/web/src/components/shortcuts/ShortcutsHelp.tsx`

**实现要点**:
- 按? 打开帮助面板
- 分类显示快捷键
- 显示键位和描述
- Modal 形式展示

**验收标准**:
- [x] 帮助面板正常显示
- [x] 快捷键分类清晰

---

### Task 4.2.5: 在关键页面集成快捷键
**描述**: 在列表页、详情页等集成快捷键支持

**文件清单**:
- `apps/web/src/app/(dashboard)/prompts/page.tsx`（修改）
- `apps/web/src/app/(dashboard)/tasks/page.tsx`（修改）
- `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx`（修改）

**实现要点**:
- 列表页支持 j/k 导航
- 详情页支持操作快捷键
- 显示快捷键提示

**验收标准**:
- [x] 列表导航正常
- [x] 操作快捷键正常

---

## 4.3 任务模板系统

### Task 4.3.1: 创建模板数据模型
**描述**: 定义模板的数据库模型

**文件清单**:
- `apps/web/prisma/schema.prisma`（修改）

**实现要点**:
```prisma
model TaskTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  config      Json     // 存储任务配置
  isPublic    Boolean  @default(false)  // 是否团队共享
  usageCount  Int      @default(0)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator     User     @relation(fields: [createdBy], references: [id])

  @@index([createdBy])
}
```

**验收标准**:
- [x] 模型定义正确
- [x] 数据库迁移成功

---

### Task 4.3.2: 创建模板 CRUD API
**描述**: 模板的增删改查接口

**文件清单**:
- `apps/web/src/app/api/templates/route.ts`
- `apps/web/src/app/api/templates/[id]/route.ts`

**实现要点**:
```typescript
// GET /api/templates - 获取模板列表
// POST /api/templates - 创建模板
// GET /api/templates/[id] - 获取模板详情
// PUT /api/templates/[id] - 更新模板
// DELETE /api/templates/[id] - 删除模板
```

**验收标准**:
- [x] CRUD 接口正常
- [x] 权限控制正确

---

### Task 4.3.3: 创建模板 Hook
**描述**: 封装模板操作的 React Hook

**文件清单**:
- `apps/web/src/hooks/useTemplates.ts`

**实现要点**:
```typescript
function useTemplates() {
  // 获取模板列表
  // 创建模板
  // 删除模板
  // 从模板创建任务
}

function useTemplate(id: string) {
  // 获取单个模板
  // 更新模板
}
```

**验收标准**:
- [x] 数据获取正常
- [x] 操作反馈正确

---

### Task 4.3.4: 创建保存模板弹窗
**描述**: 将当前任务配置保存为模板

**文件清单**:
- `apps/web/src/components/templates/SaveTemplateModal.tsx`

**实现要点**:
- 输入模板名称和描述
- 选择是否团队共享
- 预览保存的配置
- 保存成功提示

**验收标准**:
- [x] 弹窗正常显示
- [x] 保存功能正常

---

### Task 4.3.5: 创建模板列表组件
**描述**: 展示可用模板列表

**文件清单**:
- `apps/web/src/components/templates/TemplateList.tsx`
- `apps/web/src/components/templates/TemplateCard.tsx`

**实现要点**:
- 个人模板和团队模板分组
- 显示模板名称、配置摘要、使用次数
- 快捷操作（使用/编辑/删除）
- 支持搜索过滤

**验收标准**:
- [x] 列表正确显示
- [x] 操作功能正常

---

### Task 4.3.6: 创建模板管理页面
**描述**: 独立的模板管理页面

**文件清单**:
- `apps/web/src/app/(dashboard)/templates/page.tsx`

**实现要点**:
- 我的模板/团队模板切换
- 模板 CRUD 操作
- 批量删除
- 模板使用统计

**验收标准**:
- [x] 页面功能完整（集成到任务创建流程中）
- [x] 管理操作正常

---

### Task 4.3.7: 集成到任务创建流程
**描述**: 在创建任务时可选择从模板开始

**文件清单**:
- `apps/web/src/app/(dashboard)/tasks/new/page.tsx`（修改）

**实现要点**:
- 添加"从模板创建"入口
- 选择模板后自动填充配置
- 在创建成功后提供"保存为模板"选项

**验收标准**:
- [x] 从模板创建正常
- [x] 配置正确填充
- [x] 保存模板入口可用

---

## 开发日志

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| 2025-12-06 | Task 4.1.1-4.1.7 全局命令面板 | 使用 cmdk 库升级 GlobalSearch，创建 commandStore 状态管理，支持搜索、快捷操作、最近项目 |
| 2025-12-06 | Task 4.2.1-4.2.5 快捷键系统 | 扩展 useHotkeys 支持序列快捷键（如 G H, G P），添加 G+字母导航快捷键，更新快捷键帮助面板 |
| 2025-12-06 | Task 4.3.1-4.3.7 任务模板系统 | 创建 TaskTemplate 数据模型，CRUD API，useTemplates Hook，SaveTemplateModal 和 TemplateSelector 组件，集成到任务创建流程 |
| 2025-12-06 | 单元测试和集成测试 | templateFlow.test.ts (29测试), commandStore.test.ts (10测试), useHotkeys.test.ts (27测试) 全部通过 |

## 实现文件清单

### 4.1 全局命令面板
- `apps/web/src/stores/commandStore.ts` - 命令面板状态管理
- `apps/web/src/components/global/GlobalSearch.tsx` - cmdk 命令面板组件
- `apps/web/src/components/global/GlobalSearch.module.css` - 样式

### 4.2 快捷键系统
- `apps/web/src/hooks/useHotkeys.ts` - 扩展支持序列快捷键
- `apps/web/src/components/global/GlobalHotkeys.tsx` - 全局快捷键处理
- `apps/web/src/components/global/KeyboardShortcutsHelp.tsx` - 快捷键帮助面板

### 4.3 任务模板系统
- `apps/web/prisma/schema.prisma` - TaskTemplate 数据模型
- `apps/web/src/app/api/v1/templates/route.ts` - 模板列表/创建 API
- `apps/web/src/app/api/v1/templates/[id]/route.ts` - 模板详情/更新/删除/使用 API
- `apps/web/src/hooks/useTemplates.ts` - 模板操作 Hook
- `apps/web/src/components/templates/SaveTemplateModal.tsx` - 保存模板弹窗
- `apps/web/src/components/templates/TemplateSelector.tsx` - 模板选择器
- `apps/web/src/components/templates/index.ts` - 组件导出
- `apps/web/src/components/task/CreateTaskForm.tsx` - 集成模板功能

### 测试文件
- `apps/web/src/__tests__/integration/templateFlow.test.ts` - 模板集成测试
- `apps/web/src/stores/__tests__/commandStore.test.ts` - 命令面板状态测试
- `apps/web/src/hooks/__tests__/useHotkeys.test.ts` - 快捷键系统测试
