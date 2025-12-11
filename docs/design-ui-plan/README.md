# UI/UX 优化改造计划

> AI 测试平台 UI/UX 整体优化方案，基于熵控制驱动开发理念，遵循 MVU 原则拆分

## 总体目标

基于 `ui-optimization-plan.md` 设计方案，对平台进行全面 UI/UX 优化：

1. **视觉层次** - 页面元素层次分明，重要信息突出
2. **信息密度** - 合理利用空间，减少无效滚动
3. **操作效率** - 常用操作入口集中，支持快捷键
4. **数据可视化** - 趋势图表，直观感知变化
5. **引导性** - 新用户引导完善，空状态设计优化
6. **一致性** - 统一布局风格和交互模式

## 阶段概览

| 阶段 | 名称 | 优先级 | 任务数 | 预估代码量 |
|------|------|--------|--------|-----------|
| Phase 1 | [工作台重构](./phase-1-dashboard/) | P0 | 6 | ~610 行 |
| Phase 2 | [任务列表增强](./phase-2-task-list/) | P0 | 6 | ~630 行 |
| Phase 3 | [提示词管理优化](./phase-3-prompt-management/) | P1 | 7 | ~790 行 |
| Phase 4 | [数据集上传优化](./phase-4-dataset-upload/) | P1 | 7 | ~720 行 |
| Phase 5 | [模型配置优化](./phase-5-model-config/) | P1 | 6 | ~610 行 |
| Phase 6 | [评估器展示增强](./phase-6-evaluator/) | P2 | 6 | ~540 行 |
| Phase 7 | [监控中心数据可视化](./phase-7-monitor/) | P2 | 7 | ~780 行 |
| Phase 8 | [全局搜索与快捷键](./phase-8-global-search/) | P2 | 7 | ~670 行 |
| Phase 9 | [设置页面重构](./phase-9-settings/) | P3 | 6 | ~570 行 |

**总计**: 58 个任务，约 5,920 行代码

## 优先级说明

- **P0** - 核心功能页面，影响主要用户流程
- **P1** - 重要功能页面，提升使用体验
- **P2** - 增强功能，提升操作效率
- **P3** - 优化功能，完善细节体验

## 开发原则

### MVU 原则 (Minimum Viable Unit)
- 单次改动 < 5 个文件
- 单次代码 < 200 行
- 每个单元可独立运行验证

### 会话隔离原则
- 1 会话 = 1 任务
- Context > 60% 立即 /clear
- 任务完成立即关闭会话

### 阶段门控制
- 每阶段需要审核通过后进入下一阶段
- 每个任务有明确的验收标准

## 使用方式

1. **按优先级顺序开发** - P0 → P1 → P2 → P3
2. **每阶段独立** - 先阅读 `CONTEXT.md` 了解上下文
3. **按任务执行** - 按 `TASKS.md` 中的任务清单逐项完成
4. **记录进度** - 在任务清单底部的开发日志中记录

## 目录结构

```
docs/design-ui-plan/
├── README.md                           # 本文件
├── phase-1-dashboard/                  # Phase 1: 工作台重构
│   ├── CONTEXT.md                      # 上下文说明
│   └── TASKS.md                        # 任务清单
├── phase-2-task-list/                  # Phase 2: 任务列表增强
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-3-prompt-management/          # Phase 3: 提示词管理优化
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-4-dataset-upload/             # Phase 4: 数据集上传优化
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-5-model-config/               # Phase 5: 模型配置优化
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-6-evaluator/                  # Phase 6: 评估器展示增强
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-7-monitor/                    # Phase 7: 监控中心数据可视化
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-8-global-search/              # Phase 8: 全局搜索与快捷键
│   ├── CONTEXT.md
│   └── TASKS.md
└── phase-9-settings/                   # Phase 9: 设置页面重构
    ├── CONTEXT.md
    └── TASKS.md
```

## 技术依赖

### 新增依赖
- `recharts` - 图表库（Phase 1, 7）

### 现有依赖
- `antd` - UI 组件库
- `@ant-design/icons` - 图标
- `@ant-design/pro-components` - 高级组件
- `zustand` - 状态管理
- `react-query` - 数据请求

## 设计规范速查

### 颜色体系
```
Primary: #1677FF
Success: #52C41A
Warning: #FAAD14
Error: #FF4D4F

背景层次:
- Level 0: #FFFFFF (卡片)
- Level 1: #FAFAFA (页面背景)
- Level 2: #F5F5F5 (分组背景)

强调色:
- Gradient: linear-gradient(135deg, #1677FF, #69B1FF)
- Highlight: #E6F4FF
```

### 组件规格
- 卡片圆角: 8px
- 按钮圆角: 6px
- hover 效果: translateY(-2px) + 阴影增强
- 过渡动画: all 0.3s ease

### 状态颜色
| 状态 | 颜色 | 图标 |
|------|------|------|
| 成功/已连接 | #52C41A | ✅ |
| 警告/连接慢 | #FAAD14 | ⚠️ |
| 错误/失败 | #FF4D4F | ❌ |
| 信息/进行中 | #1677FF | 🔄 |
| 未知/待处理 | #8c8c8c | ⏳ |

## 验收标准

### 视觉层面
- [ ] 页面布局一致性检查
- [ ] 颜色使用规范检查
- [ ] 响应式适配验证

### 功能层面
- [ ] 核心流程可用性测试
- [ ] 快捷键功能验证
- [ ] 操作反馈及时性验证

### 性能层面
- [ ] 首屏加载时间 < 2s
- [ ] 交互响应时间 < 100ms
- [ ] 动画流畅度 > 60fps

## 开发日志

| 日期 | 阶段 | 完成任务 | 备注 |
|------|------|---------|------|
| | | | |
