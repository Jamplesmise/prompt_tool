# Phase 4: 效率工具 - 上下文文档

## 阶段目标

减少重复工作，提供快捷路径，提升用户操作效率。

## 前置依赖

- Phase 1: 用户旅程优化（基础组件、事件系统）

## 核心问题

1. 导航操作繁琐，需要多次点击
2. 重复创建相似配置的任务
3. 缺乏键盘操作支持

## 功能范围

### 4.1 全局命令面板 (Cmd+K)
- 快速搜索和导航
- 最近使用记录
- 快捷操作命令
- 模糊搜索支持

### 4.2 快捷键系统
- 全局快捷键（导航、新建）
- 页面级快捷键（操作）
- 快捷键帮助面板
- 可自定义配置

### 4.3 任务模板系统
- 保存任务配置为模板
- 从模板快速创建任务
- 个人模板和团队模板
- 模板管理（编辑/删除）

## 技术要点

- 使用 cmdk 库实现命令面板
- 使用 react-hotkeys-hook 处理快捷键
- 模板存储在数据库
- 搜索使用 Fuse.js 模糊匹配

## 涉及文件（预估）

```
apps/web/src/
├── components/
│   └── command/
│       ├── CommandPalette.tsx        # 命令面板
│       ├── CommandItem.tsx           # 命令项
│       ├── RecentItems.tsx           # 最近使用
│       └── SearchResults.tsx         # 搜索结果
│   └── shortcuts/
│       ├── ShortcutsHelp.tsx         # 快捷键帮助
│       └── ShortcutProvider.tsx      # 快捷键提供者
│   └── templates/
│       ├── TemplateList.tsx          # 模板列表
│       ├── TemplateCard.tsx          # 模板卡片
│       ├── SaveTemplateModal.tsx     # 保存模板弹窗
│       └── TemplateManager.tsx       # 模板管理
├── hooks/
│   ├── useCommandPalette.ts          # 命令面板钩子
│   ├── useShortcuts.ts               # 快捷键钩子
│   └── useTemplates.ts               # 模板钩子
├── stores/
│   └── commandStore.ts               # 命令面板状态
└── app/api/
    └── templates/
        └── route.ts                  # 模板 CRUD API
```

## 验收标准

1. Cmd+K 打开命令面板，响应时间 < 100ms
2. 搜索结果准确，支持模糊匹配
3. 所有快捷键正常工作
4. 模板保存和使用正常
5. 帮助面板信息完整

## 预估分值提升

- 完成本阶段后：+4 分（73 → 77）
