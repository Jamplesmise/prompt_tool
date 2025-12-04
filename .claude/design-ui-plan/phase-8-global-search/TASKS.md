# Phase 8: 全局搜索与快捷键 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P8-T1 | 创建 useHotkeys 快捷键 Hook | 1 | ~160 行 | ✅ |
| P8-T2 | 创建 HotkeysProvider 快捷键上下文 | 2 | ~80 行 | ✅ |
| P8-T3 | 创建 GlobalSearch 全局搜索组件 | 3 | ~380 行 | ✅ |
| P8-T4 | 创建 CommandPalette 命令面板组件 | 3 | ~220 行 | ✅ |
| P8-T5 | 创建 KeyboardShortcutsHelp 快捷键帮助 | 2 | ~150 行 | ✅ |
| P8-T6 | 新增全局搜索 API | 2 | ~180 行 | ✅ |
| P8-T7 | 集成到根布局 | 2 | ~70 行 | ✅ |

---

## P8-T1: 创建 useHotkeys 快捷键 Hook

### 任务描述
创建快捷键注册和管理 Hook

### 文件清单
- `apps/web/src/hooks/useHotkeys.ts` (新增)

### Hook 接口
```typescript
type HotkeyConfig = {
  key: string;           // 'ctrl+k', 'cmd+n', 'escape', '?'
  callback: () => void;
  description?: string;
  enabled?: boolean;
  preventDefault?: boolean;
}

type UseHotkeysOptions = {
  enabled?: boolean;
}

function useHotkeys(
  hotkeys: HotkeyConfig[],
  options?: UseHotkeysOptions
): void
```

### 键位解析
```typescript
// 支持的修饰键
type Modifier = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta';

// 解析快捷键字符串
function parseHotkey(key: string): {
  modifiers: Modifier[];
  key: string;
}

// 匹配键盘事件
function matchHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean
```

### 示例用法
```typescript
useHotkeys([
  { key: 'ctrl+k', callback: openSearch, description: '打开搜索' },
  { key: 'cmd+k', callback: openSearch, description: '打开搜索' },
  { key: 'ctrl+n', callback: newTask, description: '新建任务' },
  { key: 'escape', callback: closeModal, description: '关闭弹窗' },
  { key: '?', callback: showHelp, description: '显示帮助' },
]);
```

### 验收标准
- [x] 快捷键注册正常
- [x] 修饰键识别正确
- [x] 支持多个快捷键
- [x] 组件卸载自动清理

---

## P8-T2: 创建 HotkeysProvider 快捷键上下文

### 任务描述
创建快捷键上下文，管理全局快捷键状态

### 文件清单
- `apps/web/src/providers/HotkeysProvider.tsx` (新增)
- `apps/web/src/providers/index.ts` (新增导出)

### Context 接口
```typescript
type HotkeysContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  registeredHotkeys: HotkeyConfig[];
  registerHotkey: (config: HotkeyConfig) => () => void;
}

const HotkeysContext = createContext<HotkeysContextValue | null>(null);

function HotkeysProvider({ children }: { children: ReactNode }): JSX.Element

function useHotkeysContext(): HotkeysContextValue
```

### 功能说明
- 集中管理所有注册的快捷键
- 支持临时禁用（如在输入框聚焦时）
- 提供已注册快捷键列表供帮助面板使用

### 验收标准
- [x] Provider 正常工作
- [x] 快捷键注册/注销
- [x] 禁用状态正常

---

## P8-T3: 创建 GlobalSearch 全局搜索组件

### 任务描述
创建全局搜索弹窗组件，支持搜索和命令模式

### 文件清单
- `apps/web/src/components/global/GlobalSearch.tsx` (新增)
- `apps/web/src/components/global/index.ts` (新增导出)

### 组件接口
```typescript
type SearchResult = {
  type: 'prompt' | 'dataset' | 'task' | 'command';
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  shortcut?: string;
}

type GlobalSearchProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}
```

### 状态管理
```typescript
const [query, setQuery] = useState('');
const [mode, setMode] = useState<'search' | 'command'>('search');
const [results, setResults] = useState<SearchResult[]>([]);
const [selectedIndex, setSelectedIndex] = useState(0);
const [loading, setLoading] = useState(false);
```

### 布局结构
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 搜索...                                        Esc 关闭      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📝 提示词                                                       │
│ ▶ • GPT-4 通用助手                                    v3       │  ← 选中态
│   • 分类任务模板                                      v2       │
│                                                                 │
│ 📊 数据集                                                       │
│   • 客服对话测试集                                 1,234行     │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│ 💡 输入 > 进入命令模式                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 键盘导航
- ↑/↓: 上下移动选择
- Enter: 确认选择
- Esc: 关闭
- 输入 `>`: 进入命令模式

### 验收标准
- [x] 搜索结果分类显示
- [x] 键盘导航正常
- [x] 防抖搜索
- [x] 空状态提示

---

## P8-T4: 创建 CommandPalette 命令面板组件

### 任务描述
创建命令面板组件，用于命令模式

### 文件清单
- `apps/web/src/components/global/CommandPalette.tsx` (新增)
- `apps/web/src/components/global/index.ts` (更新导出)

### 组件接口
```typescript
type Command = {
  id: string;
  name: string;
  description?: string;
  shortcut?: string;
  icon?: ReactNode;
  action: () => void;
}

type CommandPaletteProps = {
  commands: Command[];
  query: string;
  selectedIndex: number;
  onSelect: (command: Command) => void;
}
```

### 默认命令列表
```typescript
const DEFAULT_COMMANDS: Command[] = [
  {
    id: 'new-task',
    name: '新建测试任务',
    shortcut: 'Ctrl+N',
    icon: <ThunderboltOutlined />,
    action: () => router.push('/tasks/new'),
  },
  {
    id: 'new-ab-test',
    name: '新建 A/B 测试',
    icon: <SplitCellsOutlined />,
    action: () => router.push('/tasks/new?type=ab'),
  },
  {
    id: 'new-prompt',
    name: '新建提示词',
    icon: <FileTextOutlined />,
    action: () => router.push('/prompts/new'),
  },
  {
    id: 'upload-dataset',
    name: '上传数据集',
    icon: <UploadOutlined />,
    action: () => openUploadModal(),
  },
  {
    id: 'settings',
    name: '打开设置',
    shortcut: 'Ctrl+,',
    icon: <SettingOutlined />,
    action: () => router.push('/settings'),
  },
];
```

### 验收标准
- [x] 命令列表过滤
- [x] 快捷键标签显示
- [x] 执行命令正常

---

## P8-T5: 创建 KeyboardShortcutsHelp 快捷键帮助

### 任务描述
创建快捷键帮助弹窗组件

### 文件清单
- `apps/web/src/components/global/KeyboardShortcutsHelp.tsx` (新增)
- `apps/web/src/components/global/index.ts` (更新导出)

### 组件接口
```typescript
type ShortcutGroup = {
  title: string;
  shortcuts: {
    keys: string[];      // ['Ctrl', 'K'] 或 ['Cmd', 'K']
    description: string;
  }[];
}

type KeyboardShortcutsHelpProps = {
  open: boolean;
  onClose: () => void;
}
```

### 快捷键分组
```typescript
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '全局',
    shortcuts: [
      { keys: ['Ctrl/Cmd', 'K'], description: '打开全局搜索' },
      { keys: ['Ctrl/Cmd', 'N'], description: '新建任务' },
      { keys: ['Ctrl/Cmd', ','], description: '打开设置' },
      { keys: ['?'], description: '显示快捷键帮助' },
    ],
  },
  {
    title: '编辑',
    shortcuts: [
      { keys: ['Ctrl/Cmd', 'S'], description: '保存当前编辑' },
      { keys: ['Escape'], description: '关闭弹窗/取消' },
    ],
  },
  {
    title: '导航',
    shortcuts: [
      { keys: ['↑', '↓'], description: '上下移动选择' },
      { keys: ['Enter'], description: '确认选择' },
    ],
  },
];
```

### 布局结构
```
┌─────────────────────────────────────────────────────────────────┐
│  ⌨️ 快捷键帮助                                        [关闭 ×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  全局                                                           │
│  ─────────────────────────────────────────────────────────────  │
│  [Ctrl/Cmd] + [K]      打开全局搜索                             │
│  [Ctrl/Cmd] + [N]      新建任务                                 │
│  ...                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [x] 分组显示正确
- [x] 按键样式正确
- [x] 响应式布局

---

## P8-T6: 新增全局搜索 API

### 任务描述
新增全局搜索 API，支持跨类型搜索

### 文件清单
- `apps/web/src/app/api/v1/search/route.ts` (新增)
- `apps/web/src/hooks/useGlobalSearch.ts` (新增)

### API 设计
```typescript
// GET /api/v1/search?q=keyword&types=prompt,dataset,task&limit=10
// Response:
{
  code: 200,
  data: {
    prompts: [
      { id: '...', name: '...', description: '...', version: 3 },
    ],
    datasets: [
      { id: '...', name: '...', rowCount: 1234 },
    ],
    tasks: [
      { id: '...', name: '...', status: 'RUNNING' },
    ],
  }
}
```

### Hook 接口
```typescript
type UseGlobalSearchReturn = {
  results: {
    prompts: PromptSearchResult[];
    datasets: DatasetSearchResult[];
    tasks: TaskSearchResult[];
  } | null;
  loading: boolean;
  search: (query: string) => void;
}

function useGlobalSearch(): UseGlobalSearchReturn
```

### 验收标准
- [x] 搜索 API 正常
- [x] 支持类型过滤
- [x] Hook 防抖处理

---

## P8-T7: 集成到根布局

### 任务描述
将全局搜索和快捷键集成到应用根布局

### 文件清单
- `apps/web/src/app/layout.tsx` (修改)
- `apps/web/src/components/global/GlobalHotkeys.tsx` (新增)

### 集成方式
```tsx
// app/layout.tsx
import { HotkeysProvider } from '@/providers/HotkeysProvider';
import { GlobalHotkeys } from '@/components/global/GlobalHotkeys';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <HotkeysProvider>
          <GlobalHotkeys />
          {children}
        </HotkeysProvider>
      </body>
    </html>
  );
}
```

### GlobalHotkeys 组件
```tsx
// components/global/GlobalHotkeys.tsx
export function GlobalHotkeys() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();

  useHotkeys([
    { key: 'ctrl+k', callback: () => setSearchOpen(true) },
    { key: 'cmd+k', callback: () => setSearchOpen(true) },
    { key: 'ctrl+n', callback: () => router.push('/tasks/new') },
    { key: '?', callback: () => setHelpOpen(true) },
    { key: 'escape', callback: () => { setSearchOpen(false); setHelpOpen(false); } },
  ]);

  return (
    <>
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSelect}
      />
      <KeyboardShortcutsHelp
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}
```

### 验收标准
- [x] 全局快捷键正常
- [x] 搜索弹窗正常
- [x] 帮助弹窗正常
- [x] 不影响表单输入

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-04 | P8-T1 | ✅ | 创建 useHotkeys Hook，支持快捷键注册、修饰键解析、输入框禁用 |
| 2025-12-04 | P8-T2 | ✅ | 创建 HotkeysProvider 和 useHotkeysContext |
| 2025-12-04 | P8-T3 | ✅ | 创建 GlobalSearch 组件 + CSS Module |
| 2025-12-04 | P8-T4 | ✅ | 创建 CommandPalette 组件 + CSS Module |
| 2025-12-04 | P8-T5 | ✅ | 创建 KeyboardShortcutsHelp 组件 + CSS Module |
| 2025-12-04 | P8-T6 | ✅ | 创建 /api/v1/search API + useGlobalSearch Hook |
| 2025-12-04 | P8-T7 | ✅ | 创建 GlobalHotkeys 组件，集成到 dashboard layout |
