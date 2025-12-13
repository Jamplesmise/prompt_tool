# Phase 4: 集成与优化 - 任务清单

## 阶段概览

| 属性 | 值 |
|------|-----|
| 预估周期 | 2 周 |
| 前置依赖 | Phase 3 完成 |
| 交付物 | 全功能通过测试 + 文档 + 上线 |
| 里程碑 | M5: 正式上线 |

---

## Week 11: 全流程集成测试

### Task 4.1.1: 基础功能 E2E 测试

**目标**：验证三种模式的基础功能

**任务清单**：
- [ ] 创建 `apps/web/e2e/goi/basic.spec.ts`
- [ ] 测试 A1：纯人工模式创建任务
  - 关闭 GOI 功能
  - 手动完成任务创建
  - 验证事件记录正确
- [ ] 测试 A2：AI 辅助模式创建任务
  - 开启 AI 辅助模式
  - 输入目标："创建一个测试任务"
  - 验证 TODO List 生成
  - 验证检查点触发
  - 完成确认流程
  - 验证任务创建成功
- [ ] 测试 A3：AI 自动模式创建任务
  - 切换到全自动模式
  - 输入目标
  - 验证除删除外自动执行
  - 验证完整流程完成

**测试代码示例**：
```typescript
import { test, expect } from '@playwright/test';

test.describe('GOI Basic Functionality', () => {
  test('A2: AI assisted mode - create task', async ({ page }) => {
    // 1. 打开页面，开启 Copilot
    await page.goto('/tasks');
    await page.click('[data-testid="copilot-toggle"]');

    // 2. 设置为 AI 辅助模式
    await page.click('[data-testid="mode-assisted"]');

    // 3. 输入目标
    await page.fill('[data-testid="goal-input"]', '创建一个测试任务，使用 test-prompt 提示词');
    await page.click('[data-testid="start-button"]');

    // 4. 等待 TODO List 生成
    await expect(page.locator('[data-testid="todo-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="todo-item"]')).toHaveCount.greaterThan(0);

    // 5. 等待检查点
    await expect(page.locator('[data-testid="checkpoint-dialog"]')).toBeVisible({ timeout: 30000 });

    // 6. 确认检查点
    await page.click('[data-testid="checkpoint-approve"]');

    // 7. 继续直到完成
    while (await page.locator('[data-testid="checkpoint-dialog"]').isVisible()) {
      await page.click('[data-testid="checkpoint-approve"]');
      await page.waitForTimeout(1000);
    }

    // 8. 验证任务创建成功
    await expect(page.locator('[data-testid="todo-status-completed"]')).toBeVisible();
  });
});
```

**验收标准**：
- [ ] 三种模式基础流程通过
- [ ] 事件记录完整
- [ ] TODO 状态正确

---

### Task 4.1.2: 人机协作 E2E 测试

**目标**：验证人机协作场景

**任务清单**：
- [ ] 创建 `apps/web/e2e/goi/collaboration.spec.ts`
- [ ] 测试 B1：用户中途接管
  - AI 执行中点击"我来操作"
  - 验证 AI 暂停
  - 验证控制权转移事件
- [ ] 测试 B2：用户完成 TODO 后交还 AI
  - 用户手动完成当前步骤
  - 点击"继续执行"
  - 验证 AI 识别已完成项
- [ ] 测试 B3：检查点修改
  - 在检查点选择"换一个"
  - 修改参数
  - 验证 AI 使用新参数执行
- [ ] 测试 B4：检查点拒绝
  - 在检查点选择"取消"
  - 验证回滚执行
  - 验证等待用户指示

**验收标准**：
- [ ] 控制权转移正确
- [ ] 状态同步正确
- [ ] 修改/拒绝流程正常

---

### Task 4.1.3: 失败恢复 E2E 测试

**目标**：验证失败处理和恢复场景

**任务清单**：
- [ ] 创建 `apps/web/e2e/goi/failure.spec.ts`
- [ ] 测试 C1：临时性失败自动重试
  - Mock 网络超时
  - 验证自动重试
  - 验证重试成功后继续
- [ ] 测试 C2：数据性失败回滚
  - 搜索不存在的资源
  - 验证正确分类为数据性失败
  - 验证状态回滚
  - 验证失败报告显示
- [ ] 测试 C3：用户选择跳过
  - 失败后选择"跳过此步"
  - 验证继续后续任务
- [ ] 测试 C4：用户选择重规划
  - 失败后选择"重新规划"
  - 验证生成新的 TODO List

**验收标准**：
- [ ] 重试机制正常
- [ ] 回滚成功
- [ ] 恢复选项功能正常

---

### Task 4.1.4: 上下文管理 E2E 测试

**目标**：验证上下文管理功能

**任务清单**：
- [ ] 创建 `apps/web/e2e/goi/context.spec.ts`
- [ ] 测试 D1：上下文自动压缩
  - 执行多步骤任务，模拟上下文增长
  - 验证达到阈值时触发压缩
  - 验证关键信息保留
- [ ] 测试 D2：压缩后继续执行
  - 压缩后继续执行任务
  - 验证任务正常完成
- [ ] 测试 D3：手动压缩
  - 手动点击压缩按钮
  - 验证压缩成功

**验收标准**：
- [ ] 自动压缩触发正确
- [ ] 压缩后可继续执行
- [ ] 手动压缩正常

---

### Task 4.1.5: 边界条件测试

**目标**：验证系统边界条件

**任务清单**：
- [ ] 创建 `apps/web/e2e/goi/edge-cases.spec.ts`
- [ ] 测试超长目标描述（10000字符）
- [ ] 测试超多 TODO 项（100项）
- [ ] 测试并发执行多个会话
- [ ] 测试网络断开后恢复
- [ ] 测试页面刷新后恢复
- [ ] 测试上下文达到上限

**验收标准**：
- [ ] 边界条件处理合理
- [ ] 无崩溃或数据丢失

---

### Task 4.1.6: Bug 修复

**目标**：修复测试中发现的问题

**任务清单**：
- [ ] 收集测试过程中的 Bug
- [ ] 按优先级排序修复
- [ ] 回归测试确认修复
- [ ] 更新测试用例

**验收标准**：
- [ ] 所有 P0/P1 Bug 修复
- [ ] 回归测试通过

---

## Week 12: 性能优化与上线准备

### Task 4.2.1: 性能基准测试

**目标**：建立性能基准，识别瓶颈

**任务清单**：
- [ ] 创建性能测试脚本
- [ ] 测试 TODO 生成延迟
- [ ] 测试单步执行延迟
- [ ] 测试 UI 同步延迟
- [ ] 测试事件处理吞吐
- [ ] 测试检查点响应延迟
- [ ] 测试回滚执行时间
- [ ] 记录基准数据

**性能目标**：
| 指标 | 目标 |
|------|------|
| TODO 生成 | < 5s |
| 单步执行 | < 2s |
| UI 同步 | < 200ms |
| 事件吞吐 | > 100/s |
| 检查点响应 | < 500ms |
| 回滚执行 | < 1s |

**验收标准**：
- [ ] 基准数据记录完整
- [ ] 识别出性能瓶颈

---

### Task 4.2.2: 性能优化实施

**目标**：根据基准测试优化性能

**任务清单**：
- [ ] 模型调用优化
  - 实现延迟合并
  - 实现结果缓存
  - 实现流式响应
- [ ] 事件系统优化
  - 实现批量写入
  - 优化数据库索引
  - 实现过期清理
- [ ] 前端优化
  - TODO List 虚拟滚动
  - 事件订阅防抖
  - Copilot 面板懒加载
- [ ] 重新测试验证优化效果

**验收标准**：
- [ ] 所有指标达标
- [ ] 无性能回退

---

### Task 4.2.3: 成本监控和控制

**目标**：实现模型调用成本监控

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/metrics.ts`
- [ ] 实现模型调用计数
- [ ] 实现 Token 使用统计
- [ ] 实现成本估算
- [ ] 添加成本告警
- [ ] 创建成本报表 API

**验收标准**：
- [ ] 成本可监控
- [ ] 告警配置完成

---

### Task 4.2.4: 功能开关和灰度发布

**目标**：准备功能开关和灰度发布机制

**任务清单**：
- [ ] 实现功能开关配置
  ```typescript
  const featureFlags = {
    goi_enabled: boolean;
    goi_auto_mode: boolean;
    goi_context_compression: boolean;
    goi_model_tier: 'free' | 'standard' | 'premium';
  };
  ```
- [ ] 实现灰度发布机制（按用户比例）
- [ ] 创建开关管理界面
- [ ] 测试开关生效

**验收标准**：
- [ ] 功能开关可用
- [ ] 灰度机制正常

---

### Task 4.2.5: 文档编写

**目标**：编写完整的文档

**任务清单**：
- [ ] 创建 `docs/goi/user-guide.md` - 用户指南
  - GOI 功能介绍
  - 三种模式说明
  - 使用示例
  - 常见问题
- [ ] 创建 `docs/goi/api-reference.md` - API 参考
  - GOI API 列表
  - 请求/响应格式
  - 错误码说明
- [ ] 更新 `CLAUDE.md` - 添加 GOI 相关信息
- [ ] 创建运维文档
  - 部署说明
  - 监控配置
  - 故障处理

**验收标准**：
- [ ] 用户指南完整
- [ ] API 文档完整
- [ ] 运维文档完整

---

### Task 4.2.6: 监控告警配置

**目标**：配置生产环境监控告警

**任务清单**：
- [ ] 配置 GOI 可用性监控
- [ ] 配置响应延迟监控
- [ ] 配置模型调用监控
- [ ] 配置回滚失败告警
- [ ] 测试告警触发

**告警配置**：
| 告警 | 条件 | 级别 |
|------|------|------|
| GOI 可用性 | 成功率 < 95% | P1 |
| 响应延迟 | P99 > 10s | P2 |
| 模型调用失败 | 失败率 > 5% | P2 |
| 回滚失败 | 任何失败 | P1 |

**验收标准**：
- [ ] 监控配置完成
- [ ] 告警测试通过

---

### Task 4.2.7: 上线发布

**目标**：正式发布 GOI 功能

**任务清单**：
- [ ] 代码合并到 main 分支
- [ ] 部署到预发布环境
- [ ] 预发布环境验证
- [ ] 部署到生产环境（5% 灰度）
- [ ] 观察监控指标
- [ ] 逐步扩大灰度（20% → 50% → 100%）
- [ ] 全量发布确认

**验收标准**：
- [ ] 预发布验证通过
- [ ] 生产环境稳定
- [ ] 全量发布完成

---

## 阶段验收

### M5 里程碑验收标准

**功能验收**：
- [ ] 所有 E2E 测试场景通过
- [ ] 边界条件测试通过
- [ ] 三种模式可正常切换使用
- [ ] 无 P0/P1 Bug

**性能验收**：
- [ ] TODO 生成延迟 < 5s
- [ ] 单步执行延迟 < 2s
- [ ] UI 同步延迟 < 200ms
- [ ] 事件处理吞吐 > 100/s

**可靠性验收**：
- [ ] AI 任务完成率 > 80%
- [ ] 回滚成功率 > 95%
- [ ] 上下文压缩保真率 > 90%

**上线验收**：
- [ ] 文档完整
- [ ] 监控告警配置
- [ ] 灰度发布完成
- [ ] 生产环境稳定运行 7 天

---

## 开发日志

<!-- 在此记录每日开发进度 -->

### 2025-12-11
- 完成任务：
  - [x] Task 4.1.1: 基础功能 E2E 测试
    - 创建 `apps/web/playwright.config.ts` 配置文件
    - 创建 `apps/web/e2e/goi/fixtures.ts` 测试辅助工具
    - 创建 `apps/web/e2e/goi/basic.spec.ts` 基础功能测试
  - [x] Task 4.1.2: 人机协作 E2E 测试
    - 创建 `apps/web/e2e/goi/collaboration.spec.ts`
  - [x] Task 4.1.3: 失败恢复 E2E 测试
    - 创建 `apps/web/e2e/goi/failure.spec.ts`
  - [x] Task 4.1.4: 上下文管理 E2E 测试
    - 创建 `apps/web/e2e/goi/context.spec.ts`
  - [x] Task 4.1.5: 边界条件测试
    - 创建 `apps/web/e2e/goi/edge-cases.spec.ts`
  - 为组件添加 data-testid 属性以支持测试
  - 更新 package.json 添加 E2E 测试脚本
- 遇到问题：
  - CopilotPanel 组件已被重构为使用 FloatingWindow
- 解决方案：
  - 适配新的组件结构
- 下一步计划：
  - 运行测试并修复发现的 Bug
  - 开始 Week 12 的性能优化任务
