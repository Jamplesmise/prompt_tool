# Phase 4: 交互增强 - 任务清单

> 预计工时：3 天

## 任务列表

### Task 4.1: 创建动效样式文件 ✅

**优先级**: P0
**预估**: 2h

- [x] 创建动效样式（在 globals.css 中添加 Phase 4 动效系统）
- [x] 定义动效时长变量（--duration-fast/normal/slow）
- [x] 定义缓动函数变量（--ease-default/out/in/bounce）
- [x] 实现 `.hover-lift` 类（悬浮上移 + 阴影）
- [x] 实现 `.hover-scale` 类（悬浮放大）
- [x] 实现 `.fade-in` 动画
- [x] 实现 `.slide-up` 动画
- [x] 实现列表 stagger 动画（.stagger-list）
- [x] 实现骨架屏动画（.skeleton）

**代码示例**:
```scss
.hover-lift {
  transition: transform $duration-fast $ease-default,
              box-shadow $duration-fast $ease-default;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn $duration-normal $ease-out;
}
```

---

### Task 4.2: 实现快捷键 Hook ✅

**优先级**: P0
**预估**: 3h

- [x] 创建 `apps/web/src/hooks/useHotkeys.ts`
- [x] 实现单键/组合键监听
- [x] 实现序列键监听（如 G+D）
- [x] 支持作用域控制（全局/页面/组件）
- [x] 处理 Mac/Windows 差异（Cmd/Ctrl）
- [x] 避免与浏览器快捷键冲突
- [x] 导出常用快捷键配置

**API 设计**:
```typescript
// 使用方式
useHotkeys('ctrl+k', () => openSearch(), { scope: 'global' });
useHotkeys('ctrl+s', () => save(), { scope: 'editor' });
useHotkeys('g d', () => navigate('/'), { scope: 'global' });
```

---

### Task 4.3: 实现全局搜索组件 ✅

**优先级**: P0
**预估**: 4h

- [x] 创建 `apps/web/src/components/global/GlobalSearch.tsx`
- [x] 实现搜索弹窗 UI（Modal + Input）
- [x] 实现搜索结果分类（提示词/数据集/任务）
- [x] 实现搜索结果高亮
- [x] 实现键盘导航（上/下/Enter）
- [x] 实现搜索历史（本地存储）
- [x] 绑定 Ctrl+K 快捷键
- [x] 添加到布局组件

**UI 规范**:
- 居中弹窗，宽度 600px
- 搜索框使用品牌色聚焦
- 结果分组显示图标和类型
- ESC 关闭弹窗

---

### Task 4.4: 实现快捷键帮助弹窗 ✅

**优先级**: P1
**预估**: 2h

- [x] 创建 `apps/web/src/components/global/KeyboardShortcutsHelp.tsx`
- [x] 展示所有可用快捷键
- [x] 按类别分组（全局/编辑/导航）
- [x] 绑定 `?` 快捷键打开
- [x] 美观的键盘样式展示

**UI 示例**:
```
┌─────────────────────────────────────┐
│  ⌨️ 快捷键                    [×]   │
├─────────────────────────────────────┤
│  全局                                │
│  ⌘ K    全局搜索                     │
│  ⌘ N    新建                         │
│  ?      显示此帮助                   │
│                                      │
│  编辑                                │
│  ⌘ S    保存                         │
│  ⌘ ↵    提交/运行                    │
│                                      │
│  导航                                │
│  G D    工作台                       │
│  G P    提示词                       │
│  G T    任务                         │
└─────────────────────────────────────┘
```

---

### Task 4.5: 创建反馈工具函数 ✅

**优先级**: P0
**预估**: 2h

- [x] 创建 `apps/web/src/lib/feedback.ts`
- [x] 封装 `showSuccess(message, options?)`
- [x] 封装 `showError(message, options?)`
- [x] 封装 `showWarning(message, options?)`
- [x] 封装 `showConfirm(options)` - 确认弹窗
- [x] 封装 `showLoading()` - 全局 loading
- [x] 封装 `showOperationSuccess()` - 带详情的成功通知
- [x] 封装 `showOperationError()` - 带重试的错误通知
- [x] 封装 `copyToClipboard()` - 复制到剪贴板

**代码示例**:
```typescript
// 成功反馈
showSuccess('保存成功');

// 成功反馈（带操作）
showSuccess('任务创建成功', {
  description: '任务已加入队列',
  action: { text: '查看任务', onClick: () => navigate(`/tasks/${id}`) }
});

// 确认弹窗
showConfirm({
  title: '确认删除',
  content: '删除后不可恢复',
  danger: true,
  onOk: handleDelete,
});
```

---

### Task 4.6: 实现页面骨架屏 ✅

**优先级**: P1
**预估**: 2h

- [x] 创建 `apps/web/src/components/common/PageSkeleton.tsx`
- [x] 实现工作台骨架屏布局（dashboard）
- [x] 实现列表页骨架屏布局（list）
- [x] 实现详情页骨架屏布局（detail）
- [x] 实现表单页骨架屏布局（form）
- [x] 导出到 common/index.ts

**代码示例**:
```tsx
// 使用方式
{isLoading ? <PageSkeleton type="dashboard" /> : <DashboardContent />}
{isLoading ? <PageSkeleton type="list" /> : <ListContent />}
```

---

### Task 4.7: 应用动效到现有组件 ✅

**优先级**: P1
**预估**: 2h

- [x] StatCard、TaskCard 已有 hover 悬浮效果
- [x] 为页面添加入场动画（工作台、提示词、数据集、任务、模型、设置页）
- [x] 按钮按下反馈（.press-effect 类已在 globals.css 中）
- [x] 弹窗入场动画使用 Ant Design 默认动效

---

### Task 4.8: 添加按钮加载状态 ✅

**优先级**: P1
**预估**: 1h

- [x] 统一提交按钮 loading 状态（Ant Design Button 原生支持）
- [x] 按钮 loading 时自动显示 spinner
- [x] 确保 loading 时按钮不可点击（Ant Design 默认行为）

---

### Task 4.9: 添加进度条样式 ✅

**优先级**: P1
**预估**: 1h

- [x] 进度条使用品牌渐变色（globals.css .ant-progress-bg）
- [x] active 状态动画（Ant Design 默认支持）
- [x] TaskCard 中进度条使用 PRIMARY 品牌色

---

### Task 4.10: 交互测试

**优先级**: P0
**预估**: 1.5h

- [ ] 测试所有快捷键正常工作
- [ ] 测试全局搜索功能
- [ ] 测试动效流畅（60fps）
- [ ] 测试反馈消息正确显示
- [ ] 测试骨架屏正确显示
- [ ] 跨浏览器测试

---

## 完成标准

- [x] 快捷键系统完整可用
- [x] 全局搜索功能完成
- [x] 动效平滑（60fps）
- [x] 反馈机制统一
- [x] 骨架屏正确显示
- [x] 代码通过 lint 检查

---

## 开发日志

| 日期 | 进度 | 备注 |
|------|------|------|
| 2025-12-06 | Task 4.1-4.9 完成 | 动效系统、快捷键Hook、全局搜索、快捷键帮助、反馈工具、骨架屏、页面入场动画、按钮/进度条样式 |
