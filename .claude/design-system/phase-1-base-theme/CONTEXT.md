# Phase 1: 基础主题 - 上下文文档

> 本阶段为设计系统优化的基础阶段，建立统一的视觉基础

## 阶段目标

配置 Ant Design 主题 Token，创建全局样式变量，实现核心视觉风格统一。

## 前置依赖

- 无前置阶段依赖
- 项目已使用 Ant Design 5.x + ProComponents
- 项目已有基础样式文件

## 核心改动范围

### 1. 主题 Token 配置

创建 `apps/web/src/theme/antdTheme.ts`，配置品牌色系统：

```typescript
// 品牌主色：红色系
colorPrimary: '#EF4444'
colorPrimaryHover: '#DC2626'
colorPrimaryActive: '#B91C1C'

// 语义色
colorSuccess: '#10B981'  // 绿色
colorWarning: '#F59E0B'  // 琥珀色
colorError: '#EF4444'    // 红色
colorInfo: '#3B82F6'     // 蓝色
```

### 2. 全局样式变量

创建 SCSS 变量文件 `apps/web/src/styles/variables.scss`：

- 品牌色阶（primary-50 到 primary-900）
- 语义色阶（success、warning、error、info）
- 中性色阶（gray-50 到 gray-900）
- 间距系统（基于 4px）
- 字号系统
- 圆角系统
- 阴影系统
- 动效时长

### 3. 主按钮渐变样式

覆盖 Ant Design 主按钮为品牌渐变色：

```scss
.ant-btn-primary:not(.ant-btn-dangerous) {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
}
```

### 4. 侧边栏选中状态

更新菜单选中样式，使用品牌色高亮：

```scss
itemSelectedBg: '#FEF2F2'
itemSelectedColor: '#DC2626'
```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/theme/antdTheme.ts` | 新建 | Ant Design 主题配置 |
| `apps/web/src/styles/variables.scss` | 新建 | SCSS 变量文件 |
| `apps/web/src/styles/globals.scss` | 修改 | 添加全局样式覆盖 |
| `apps/web/src/app/layout.tsx` | 修改 | 引入 ConfigProvider 主题 |

## 验收标准

- [ ] 所有主按钮显示为品牌渐变色
- [ ] 侧边栏选中项使用品牌色高亮
- [ ] 链接文字使用品牌色
- [ ] 表单聚焦边框使用品牌色
- [ ] 进度条使用品牌渐变
- [ ] 主题配置可在全局生效

## 技术约束

- 使用 Ant Design 5.x ConfigProvider 配置主题
- SCSS 变量命名遵循 `$category-modifier` 格式
- 不引入新的 CSS 框架
- 保持向后兼容，不破坏现有功能

## 参考文档

- 设计系统规范：`.claude/design-system/design-system.md`
- Ant Design 主题定制：https://ant.design/docs/react/customize-theme-cn
