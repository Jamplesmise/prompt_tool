# AI 测试平台 - UI 库迁移评估材料

## 评估目标
评估从 **Ant Design 5.x** 迁移到 **Chakra UI** 的成本与收益

## 项目现状

### 技术栈
- Next.js 14 + React 18 + TypeScript
- Ant Design 5.12.8 + ProComponents 2.6.43
- @ant-design/plots (图表)
- @ant-design/icons (图标)

### 代码规模
- TSX 文件: 197 个
- 使用 Ant Design 的文件: 100+ 个
- UI 组件调用点: 1500+

### 品牌色
- 主色: 红色 #EF4444 (已定制)

## 文件说明

| 文件 | 内容 |
|------|------|
| 01-package.json | 项目依赖 |
| 02-antdTheme.ts | Ant Design 主题配置 |
| 03-globals.css | 全局样式 |
| 04-dashboard-layout.tsx | 主布局 (ProLayout) |
| 05-providers.tsx | Provider 配置 |
| 06-PromptTable.tsx | 表格组件示例 |
| 07-AddModelModal.tsx | 表单弹窗示例 |
| 08-StatCard.tsx | 卡片组件示例 |
| 09-ui-convention.md | UI 组件规范文档 |
| 10-design-system.md | 设计系统文档 |
| screenshots-1.jpg | 界面截图 (工作台/提示词/数据集/模型) |
| screenshots-2.jpg | 界面截图 (评估器/任务/对比分析) |
| screenshots-3.jpg | 界面截图 (定时任务/监控/告警/设置) |

## 需要评估的问题

1. 迁移到 Chakra UI 的工作量预估
2. 核心组件替代方案 (Table/Form/Upload/ProLayout)
3. 收益是否值得投入
4. 是否有更好的替代方案
