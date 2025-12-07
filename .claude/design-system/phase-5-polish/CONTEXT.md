# Phase 5: 打磨优化 - 上下文文档

> 本阶段为设计系统优化的收尾阶段，处理响应式、性能和边界情况

## 阶段目标

完善响应式适配，优化性能表现，处理边界情况，确保整体质量。

## 前置依赖

- Phase 1-4 已完成
- 基础主题、组件、页面、交互已就位

## 核心改动范围

### 1. 响应式适配

断点规范：
```scss
$breakpoint-sm:  640px;   // 手机横屏
$breakpoint-md:  768px;   // 平板竖屏
$breakpoint-lg:  1024px;  // 平板横屏/小笔记本
$breakpoint-xl:  1280px;  // 标准桌面
$breakpoint-2xl: 1536px;  // 大屏桌面
```

侧边栏响应行为：
| 断点 | 侧边栏状态 |
|------|-----------|
| < 768px | 隐藏（抽屉模式） |
| 768px - 1024px | 收起（80px） |
| > 1024px | 展开（240px） |

统计卡片响应：
| 断点 | 列数 |
|------|-----|
| < 640px | 1 列 |
| 640px - 1024px | 2 列 |
| > 1024px | 4 列 |

### 2. 性能优化

优化目标：
- 首屏加载 < 2s（LCP）
- 首次输入延迟 < 100ms（FID）
- 累积布局偏移 < 0.1（CLS）

优化手段：
- 图片懒加载
- 组件懒加载（React.lazy）
- 虚拟滚动（长列表）
- 资源预加载（关键资源）
- 代码分割
- CSS 优化（减少重绘）

### 3. 边界情况处理

需要处理的边界情况：
- 长文本截断与 tooltip
- 空数据状态
- 加载失败状态
- 网络错误重试
- 权限不足提示
- 会话过期处理
- 表单验证错误展示
- 大数据量分页

### 4. 无障碍优化

- 键盘导航支持
- 屏幕阅读器支持（ARIA 标签）
- 颜色对比度符合 WCAG 2.1
- 焦点可见性

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/styles/responsive.scss` | 新建 | 响应式样式 |
| `apps/web/src/components/common/LazyImage.tsx` | 新建 | 图片懒加载 |
| `apps/web/src/components/common/ErrorBoundary.tsx` | 新建/修改 | 错误边界 |
| `apps/web/src/components/common/NetworkError.tsx` | 新建 | 网络错误状态 |
| `apps/web/src/components/common/TextEllipsis.tsx` | 新建 | 文本截断组件 |
| 各页面组件 | 修改 | 响应式和边界处理 |

## 验收标准

- [ ] 移动端布局正常（375px 起）
- [ ] 平板布局正常
- [ ] 大屏布局正常（2K/4K）
- [ ] 首屏加载 < 2s
- [ ] 长列表滚动流畅
- [ ] 空状态显示正确
- [ ] 错误状态可恢复
- [ ] 长文本正确截断
- [ ] 键盘可完整导航
- [ ] 无控制台错误

## 技术约束

- 使用 CSS 媒体查询处理响应式
- 使用 React.lazy + Suspense 处理懒加载
- 使用 Intersection Observer 处理懒加载
- 不引入额外的响应式库

## 测试清单

### 响应式测试设备
- iPhone SE (375px)
- iPhone 14 Pro (393px)
- iPad Mini (768px)
- iPad Pro 12.9" (1024px)
- MacBook Air (1440px)
- 27" 显示器 (2560px)

### 性能测试工具
- Lighthouse（Chrome DevTools）
- WebPageTest
- React DevTools Profiler

## 参考文档

- 设计系统规范：`.claude/design-system/design-system.md` 第四章
- Web Vitals：https://web.dev/vitals/
- WCAG 2.1：https://www.w3.org/WAI/WCAG21/quickref/
