# Phase 4: 交互增强 - 上下文文档

> 本阶段增强用户交互体验，添加动效、快捷键、反馈机制

## 阶段目标

提升产品的交互品质，让用户操作更流畅、反馈更及时、效率更高。

## 前置依赖

- Phase 1-3 已完成
- 页面改造已完成
- 组件库已就位

## 核心改动范围

### 1. 动效系统

动效时长标准：
```scss
$duration-fast:   0.15s;   // 微交互（悬浮、按下）
$duration-normal: 0.25s;   // 常规过渡（展开、切换）
$duration-slow:   0.4s;    // 复杂动画（页面切换）
```

缓动函数：
```scss
$ease-default: cubic-bezier(0.4, 0, 0.2, 1);
$ease-in:      cubic-bezier(0.4, 0, 1, 1);
$ease-out:     cubic-bezier(0, 0, 0.2, 1);
$ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
```

通用动效类：
- `.hover-lift` - 悬浮上移 + 阴影
- `.hover-scale` - 悬浮放大
- `.fade-in` - 淡入 + 上移

### 2. 快捷键系统

| 快捷键 | 功能 | 作用域 |
|--------|------|--------|
| `Ctrl/Cmd + K` | 全局搜索 | 全局 |
| `Ctrl/Cmd + N` | 新建 | 全局 |
| `Ctrl/Cmd + S` | 保存 | 编辑页 |
| `Ctrl/Cmd + Enter` | 提交/运行 | 表单/编辑器 |
| `Escape` | 关闭弹窗 | 弹窗 |
| `?` | 显示快捷键帮助 | 全局 |
| `G + D` | 跳转工作台 | 全局 |
| `G + P` | 跳转提示词 | 全局 |
| `G + T` | 跳转任务 | 全局 |

### 3. 反馈机制

操作反馈规范：
- **成功反馈（轻量）**: `message.success('保存成功')`
- **成功反馈（带操作）**: `notification.success` + 查看按钮
- **错误反馈**: `notification.error` + duration: 0
- **确认操作**: `Modal.confirm` + 危险样式

### 4. 加载状态

- **骨架屏**: 首次加载使用 Skeleton
- **加载覆盖层**: 数据刷新使用 Spin
- **按钮加载**: 提交时显示 loading 状态
- **进度条**: 长时间操作使用 Progress

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/styles/animations.scss` | 新建 | 动效样式文件 |
| `apps/web/src/hooks/useHotkeys.ts` | 新建 | 快捷键 Hook |
| `apps/web/src/components/common/GlobalSearch.tsx` | 新建 | 全局搜索组件 |
| `apps/web/src/components/common/HotkeysHelp.tsx` | 新建 | 快捷键帮助弹窗 |
| `apps/web/src/components/common/PageSkeleton.tsx` | 新建 | 页面骨架屏 |
| `apps/web/src/lib/feedback.ts` | 新建 | 反馈工具函数 |

## 验收标准

- [ ] 卡片悬浮有上移效果
- [ ] 按钮点击有按下反馈
- [ ] 列表项加载有动画
- [ ] `Ctrl+K` 可打开全局搜索
- [ ] `?` 可显示快捷键帮助
- [ ] 保存成功有 message 反馈
- [ ] 删除操作有确认弹窗
- [ ] 首次加载有骨架屏
- [ ] 长时间操作有进度指示

## 技术约束

- 动效保持 60fps
- 快捷键不与浏览器默认冲突
- 使用 React 的 useEffect 管理事件监听
- 反馈消息 3 秒后自动消失（错误除外）

## 参考文档

- 设计系统规范：`docs/design-system/design-system.md` 第七章
- Ant Design 反馈组件：https://ant.design/components/message-cn
