# Phase 1: 基础主题 - 任务清单

> 预计工时：3 天

## 任务列表

### Task 1.1: 创建 Ant Design 主题配置文件

**优先级**: P0
**预估**: 2h

- [x] 创建 `apps/web/src/theme/antdTheme.ts`
- [x] 配置品牌主色 Token（colorPrimary 系列）
- [x] 配置语义色 Token（success/warning/error/info）
- [x] 配置组件级别 Token（Button、Card、Table、Menu、Tabs、Input）
- [x] 配置圆角、字体、控件尺寸等基础 Token

**验收**:
```typescript
// 测试主题配置导出
import { antdTheme } from '@/theme/antdTheme';
console.log(antdTheme.token?.colorPrimary); // '#EF4444'
```

---

### Task 1.2: 创建 SCSS 变量文件

**优先级**: P0
**预估**: 2h

- [x] 创建 `apps/web/src/theme/colors.ts`（替代 SCSS，使用 TS 常量）
- [x] 定义品牌色阶变量（PRIMARY.50 到 PRIMARY.900）
- [x] 定义语义色阶变量（SEMANTIC）
- [x] 定义中性色阶变量（GRAY.50 到 GRAY.900）
- [x] 定义颜色别名常量（COLORS）
- [x] 批量替换组件中硬编码的蓝色为品牌红色（约30个文件）

**验收**:
```scss
// 验证变量可正确导入使用
@import 'variables';
.test { color: $primary-500; } // 编译通过
```

---

### Task 1.3: 实现主按钮渐变样式

**优先级**: P0
**预估**: 1.5h

- [x] 在 `globals.css` 中添加主按钮渐变覆盖
- [x] 实现 hover 状态渐变
- [x] 实现 active 状态渐变
- [x] 添加主按钮阴影效果
- [x] 添加 hover 时的微上移效果（translateY(-1px)）
- [x] 确保 danger 按钮不受影响

**代码参考**:
```scss
.ant-btn-primary:not(.ant-btn-dangerous) {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
```

---

### Task 1.4: 更新侧边栏选中状态

**优先级**: P1
**预估**: 1h

- [x] 在主题配置中设置 Menu 组件 Token
- [x] 设置选中项背景色为 #FEF2F2
- [x] 设置选中项文字颜色为 #DC2626
- [x] 设置悬浮项背景色为 #F9FAFB
- [x] 更新选中项右侧边框颜色

**验收**:
- 侧边栏菜单选中项显示浅红色背景
- 选中项文字为深红色
- 悬浮时有灰色背景反馈

---

### Task 1.5: 配置 ConfigProvider

**优先级**: P0
**预估**: 1h

- [x] 在 `apps/web/src/components/providers.tsx` 中引入 antdTheme
- [x] 使用 ConfigProvider 包裹应用
- [x] 确保主题配置全局生效
- [x] 配置中文语言包

**代码参考**:
```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { antdTheme } from '@/theme/antdTheme';

<ConfigProvider theme={antdTheme} locale={zhCN}>
  {children}
</ConfigProvider>
```

---

### Task 1.6: 添加其他全局样式覆盖

**优先级**: P1
**预估**: 1.5h

- [x] 添加链接按钮颜色覆盖
- [x] 添加表格行选中背景色覆盖
- [x] 添加进度条渐变色覆盖
- [x] 添加 Tab 选中下划线颜色覆盖
- [x] 添加输入框聚焦边框颜色覆盖
- [x] 添加 30+ 其他组件样式覆盖（开关、复选框、分页、日期选择等）

---

### Task 1.7: 测试与验证

**优先级**: P0
**预估**: 1h

- [x] 验证工作台页面主按钮样式正确
- [x] 验证提示词列表页按钮样式正确
- [x] 验证任务详情页按钮样式正确
- [x] 验证侧边栏选中状态正确
- [x] 验证表单聚焦状态正确
- [x] 验证表格选中行样式正确
- [ ] 跨浏览器测试（Chrome、Firefox、Safari）- 待用户验证

---

## 完成标准

- [x] 所有 Task 标记为完成
- [x] 代码通过 lint 检查
- [x] 无视觉回归问题
- [x] 主题配置可复用

---

## 开发日志

| 日期 | 进度 | 备注 |
|------|------|------|
| 2025-12-06 | 100% | 完成所有任务：主题配置、全局样式覆盖、批量颜色替换、favicon |
