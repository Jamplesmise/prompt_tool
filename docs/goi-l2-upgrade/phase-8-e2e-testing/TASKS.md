# Phase 8: E2E 端到端测试 - 任务清单

## 任务总览

| 任务 | 状态 | 优先级 |
|------|------|--------|
| 8.1 测试 Fixtures 完善 | ⬜ 待开始 | P0 |
| 8.2 场景 A: 完整任务流程 | ⬜ 待开始 | P0 |
| 8.3 场景 B: 暂停续跑 | ⬜ 待开始 | P0 |
| 8.4 场景 C: 人机协作 | ⬜ 待开始 | P0 |
| 8.5 场景 D: 检查点确认 | ⬜ 待开始 | P0 |
| 8.6 场景 E: 三种模式对比 | ⬜ 待开始 | P1 |
| 8.7 场景 F: 失败恢复 | ⬜ 待开始 | P1 |
| 8.8 场景 G: 边界情况 | ⬜ 待开始 | P2 |
| 8.9 跨浏览器测试 | ⬜ 待开始 | P1 |
| 8.10 稳定性验证 | ⬜ 待开始 | P1 |

---

## 8.1 测试 Fixtures 完善

### 任务描述
完善 E2E 测试的 Fixtures，封装常用操作。

### 子任务

- [ ] **8.1.1** 完善 `GoiPage` 类方法

  | 方法 | 功能 |
  |------|------|
  | `login()` | 登录测试账号 |
  | `openCopilot()` | 打开 Copilot 面板 |
  | `closeCopilot()` | 关闭 Copilot 面板 |
  | `switchMode(mode)` | 切换协作模式 |
  | `startWithGoal(goal)` | 输入目标并开始 |
  | `waitForTodoList()` | 等待 TODO List 出现 |
  | `waitForCheckpoint()` | 等待检查点 |
  | `approveCheckpoint()` | 确认检查点 |
  | `modifyCheckpoint()` | 修改检查点选择 |
  | `skipCheckpoint()` | 跳过检查点 |
  | `takeoverCheckpoint()` | 接管操作 |
  | `approveAllCheckpoints()` | 确认所有检查点 |
  | `getTodoItemCount()` | 获取 TODO 项数量 |
  | `getCompletedTodoCount()` | 获取已完成数量 |
  | `isCheckpointVisible()` | 检查点是否可见 |
  | `getCurrentMode()` | 获取当前模式 |

- [ ] **8.1.2** 创建测试数据 fixtures

  ```typescript
  // fixtures/testData.ts
  export const testGoals = {
    simple: '查看任务列表',
    medium: '创建一个测试任务',
    complex: '创建评估任务，使用情感分析提示词和测试数据集',
    multiResource: '创建提示词，然后创建数据集，再创建任务',
  }

  export const testCredentials = {
    email: 'test@example.com',
    password: 'testpassword',
  }
  ```

- [ ] **8.1.3** 配置 Playwright
  ```typescript
  // playwright.config.ts
  export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    retries: 2,
    use: {
      baseURL: 'http://localhost:3000',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
  })
  ```

### 验收标准
- [ ] 所有 GoiPage 方法可正常使用
- [ ] 测试数据完整
- [ ] Playwright 配置正确

---

## 8.2 场景 A: 完整任务流程

### 任务描述
测试从自然语言输入到任务完成的完整流程。

### 测试用例

- [ ] **E2E-A1**: 复杂任务的完整执行

  ```typescript
  test('E2E-A1: 从自然语言到任务完成的完整流程', async ({ page, goiPage }) => {
    // 1. 登录并打开 Copilot
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 输入复杂目标
    await goiPage.startWithGoal('帮我创建一个评估任务，使用情感分析提示词，数据用测试数据集，模型选择 GPT-4')

    // 3. 验证计划生成
    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(3)

    // 4. 验证步骤分组
    const groups = await page.locator('[data-testid="todo-group"]').count()
    expect(groups).toBeGreaterThan(0)

    // 5. 处理所有检查点
    await goiPage.approveAllCheckpoints()

    // 6. 验证任务创建成功
    const completedCount = await goiPage.getCompletedTodoCount()
    expect(completedCount).toBeGreaterThan(0)

    // 7. 验证导航到结果页面
    await expect(page).toHaveURL(/\/tasks\/|\/results\//)
  })
  ```

- [ ] **E2E-A2**: 简单查询任务

  | 步骤 | 验证点 |
  |------|--------|
  | 输入"查看所有提示词" | TODO 步骤 <= 3 |
  | 处理检查点 | 检查点触发正常 |
  | 验证导航 | URL 包含 /prompts |

- [ ] **E2E-A3**: 多资源创建任务

  | 步骤 | 验证点 |
  |------|--------|
  | 输入多资源任务 | TODO 包含多个资源操作 |
  | 验证步骤 | 包含提示词、数据集、任务 |

### 验收标准
- [ ] 3 个测试用例全部通过
- [ ] 完整流程可重复执行

---

## 8.3 场景 B: 暂停续跑

### 任务描述
测试暂停和恢复执行的功能。

### 测试用例

- [ ] **E2E-B1**: 模式切换暂停执行

  | 步骤 | 验证点 |
  |------|--------|
  | 启动任务 | TODO List 生成 |
  | 切换到手动模式 | 暂停指示器出现 |
  | 验证状态保持 | TODO 数量不变 |
  | 切换回辅助模式 | 可继续执行 |

- [ ] **E2E-B2**: 使用暂停按钮

  | 步骤 | 验证点 |
  |------|--------|
  | 自动模式启动 | 开始执行 |
  | 点击暂停按钮 | 响应时间 < 500ms |
  | 验证暂停状态 | 暂停指示器出现 |

- [ ] **E2E-B3**: 长时间暂停后恢复

  | 步骤 | 验证点 |
  |------|--------|
  | 执行部分步骤 | 有完成的 TODO |
  | 暂停 5 秒 | 状态保持 |
  | 恢复执行 | 进度正确，可继续 |

### 验收标准
- [ ] 暂停响应时间 < 500ms
- [ ] 状态在暂停期间保持一致

---

## 8.4 场景 C: 人机协作

### 任务描述
测试用户接管和交还控制权的功能。

### 测试用例

- [ ] **E2E-C1**: 用户接管后手动操作

  ```typescript
  test('E2E-C1: 用户接管后手动操作', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('选择一个提示词进行测试')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 接管操作
    await goiPage.takeoverCheckpoint()

    // 验证控制权转移
    await expect(page.locator('[data-testid="user-control-indicator"]')).toBeVisible()

    // 用户手动操作
    await page.click('[data-testid="menu-prompts"]')
    await page.waitForURL(/\/prompts/)
  })
  ```

- [ ] **E2E-C2**: 用户操作后交还 AI

  | 步骤 | 验证点 |
  |------|--------|
  | 接管操作 | 控制权转移 |
  | 手动导航 | 用户操作成功 |
  | 交还 AI | 切换回辅助模式 |
  | 验证 | AI 可继续执行 |

- [ ] **E2E-C3**: 操作偏差检测和计划调整

  | 步骤 | 验证点 |
  |------|--------|
  | 启动提示词查看任务 | 计划生成 |
  | 用户导航到数据集 | 偏离计划 |
  | 验证系统响应 | 偏差警告或计划调整 |

### 验收标准
- [ ] 接管/交还流程正常
- [ ] 操作感知正确

---

## 8.5 场景 D: 检查点确认

### 任务描述
测试各类检查点的交互。

### 测试用例

- [ ] **E2E-D1**: 资源选择检查点

  | 验证点 |
  |--------|
  | 检查点类型 = resource_selection |
  | 候选选项 > 0 |
  | 推荐选项高亮显示 |

- [ ] **E2E-D2**: 修改检查点选择

  | 步骤 | 验证点 |
  |------|--------|
  | 获取默认选择 | 记录初始值 |
  | 点击修改 | 选项列表出现 |
  | 选择其他选项 | 可点击 |
  | 确认修改 | 选择已更改 |

- [ ] **E2E-D3**: 不可逆操作检查点

  | 验证点 |
  |--------|
  | 检查点类型 = irreversible |
  | 警告信息包含"不可恢复" |

- [ ] **E2E-D4**: 跳过检查点

  | 步骤 | 验证点 |
  |------|--------|
  | 点击跳过 | 检查点关闭 |
  | 验证 | 进入下一步骤 |

### 验收标准
- [ ] 所有检查点类型测试通过
- [ ] 交互响应正常

---

## 8.6 场景 E: 三种模式对比

### 任务描述
测试三种协作模式的行为差异。

### 测试用例

- [ ] **E2E-E1**: 手动模式 - AI 不干预

  | 验证点 |
  |--------|
  | 输入目标后无检查点 |
  | 无自动导航 |
  | 用户完全控制 |

- [ ] **E2E-E2**: 辅助模式 - 检查点确认

  | 验证点 |
  |--------|
  | 关键步骤有检查点 |
  | 等待用户确认 |

- [ ] **E2E-E3**: 自动模式 - 自动执行

  | 验证点 |
  |--------|
  | 非删除操作自动执行 |
  | 步骤自动完成 |
  | 页面自动导航 |

- [ ] **E2E-E4**: 模式间快速切换

  | 步骤 | 验证点 |
  |------|--------|
  | 快速切换 5 次 | 无错误 |
  | 验证最终状态 | 模式正确 |
  | 验证界面 | 正常显示 |

### 验收标准
- [ ] 三种模式行为符合预期
- [ ] 模式切换稳定

---

## 8.7 场景 F: 失败恢复

### 任务描述
测试错误处理和恢复功能。

### 测试用例

- [ ] **E2E-F1**: 网络错误重试

  | 步骤 | 验证点 |
  |------|--------|
  | 模拟网络错误 | 前 2 次失败 |
  | 等待重试 | 自动重试 |
  | 验证结果 | 最终成功 |

- [ ] **E2E-F2**: 执行失败后回滚

  | 步骤 | 验证点 |
  |------|--------|
  | 执行部分步骤 | 记录进度 |
  | 模拟失败 | 显示恢复选项 |
  | 选择回滚 | 进度回退 |

- [ ] **E2E-F3**: 手动修复后继续

  | 步骤 | 验证点 |
  |------|--------|
  | 出现验证错误 | 错误提示显示 |
  | 手动修复 | 填写正确数据 |
  | 点击继续 | 可继续执行 |

### 验收标准
- [ ] 错误处理正常
- [ ] 恢复流程完整

---

## 8.8 场景 G: 边界情况

### 任务描述
测试异常输入和边界情况。

### 测试用例

- [ ] **E2E-EC1**: 空目标处理 - 按钮禁用
- [ ] **E2E-EC2**: 超长目标处理 - 错误或截断
- [ ] **E2E-EC3**: 快速连续点击 - 防重复
- [ ] **E2E-EC4**: 浏览器刷新后恢复 - 状态保持
- [ ] **E2E-EC5**: 并发操作处理 - 状态一致
- [ ] **E2E-EC6**: 中英文混合输入 - 正常处理
- [ ] **E2E-EC7**: 特殊字符处理 - XSS 防护

### 验收标准
- [ ] 边界情况处理正确
- [ ] 无 XSS 漏洞

---

## 8.9 跨浏览器测试

### 任务描述
在多个浏览器中运行核心测试。

### 子任务

- [ ] **8.9.1** Chromium 测试
  ```bash
  pnpm test:e2e -- --project=chromium
  ```

- [ ] **8.9.2** Firefox 测试
  ```bash
  pnpm test:e2e -- --project=firefox
  ```

- [ ] **8.9.3** 记录浏览器兼容性问题

### 验收标准
- [ ] Chromium 全部通过
- [ ] Firefox 核心场景通过

---

## 8.10 稳定性验证

### 任务描述
验证测试的稳定性和可重复性。

### 子任务

- [ ] **8.10.1** 运行 3 次完整测试
  ```bash
  for i in 1 2 3; do pnpm test:e2e; done
  ```

- [ ] **8.10.2** 识别不稳定测试

- [ ] **8.10.3** 修复 flaky 测试

- [ ] **8.10.4** 添加重试机制（已在 playwright.config.ts 配置）

### 验收标准
- [ ] 连续 3 次运行全部通过
- [ ] 无 flaky 测试

---

## 运行命令

```bash
# 运行所有 GOI E2E 测试
pnpm test:e2e -- e2e/goi/

# 运行特定场景
pnpm test:e2e -- e2e/goi/complete-task-flow.spec.ts

# 带 UI 运行（调试）
pnpm test:e2e -- --ui

# 生成报告
pnpm test:e2e -- --reporter=html

# 指定浏览器
pnpm test:e2e -- --project=chromium
```

---

## 开发日志

| 日期 | 任务 | 完成内容 | 负责人 |
|------|------|---------|--------|
| - | - | - | - |
