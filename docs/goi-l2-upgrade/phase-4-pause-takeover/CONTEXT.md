# Phase 4: 暂停与接管

## 阶段目标

让用户可以随时暂停 AI 执行、接管控制权，并在需要时让 AI 继续。

## 当前问题

### 1. 无法中途停止

AI 执行时用户无法：
- 点击暂停
- 中止任务
- 修改计划

### 2. 暂停后状态不清

暂停后用户不知道：
- 哪些已完成
- 正在执行什么
- 还剩什么

### 3. 接管后无法继续

用户手动操作后：
- AI 不知道用户做了什么
- 无法从断点继续
- 只能重新开始

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/lib/goi/collaboration/controlTransfer.ts` | 控制权转移 |
| `apps/web/src/lib/goi/agent/sessionManager.ts` | 会话管理 |

## 设计方案

### 1. 执行状态机

```
       start
         │
         ▼
    ┌─────────┐
    │ RUNNING │◄────────────────┐
    └────┬────┘                 │
         │                      │
    pause│          resume      │
         │                      │
         ▼                      │
    ┌─────────┐    continue     │
    │ PAUSED  │─────────────────┘
    └────┬────┘
         │
    takeover
         │
         ▼
    ┌─────────┐    handback
    │ MANUAL  │─────────────────┐
    └─────────┘                 │
         │                      │
         └──────────────────────┘
```

### 2. 暂停状态展示

```
╔══════════════════════════════════════════════════════╗
║ ⏸️ 已暂停                                            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ 已完成 (3/8):                                        ║
║   ✓ 打开任务创建页                                   ║
║   ✓ 选择 Prompt → sentiment-v2                      ║
║   ✓ 选择 Dataset → test-data                        ║
║                                                      ║
║ 暂停在:                                              ║
║   ◉ 配置字段映射 ← 执行到这里暂停了                   ║
║                                                      ║
║ 等待执行 (4项):                                      ║
║   ○ 选择评估模型                                     ║
║   ○ 设置评估指标                                     ║
║   ○ 启动任务                                         ║
║   ○ 生成报告                                         ║
║                                                      ║
║ ┌────────────────────────────────────────────────┐  ║
║ │ [▶ 继续执行] [✋ 我来操作] [✕ 取消任务]         │  ║
║ └────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════╝
```

### 3. 控制权转移

```typescript
type ControlMode = 'ai' | 'human' | 'collaborative'

type ControlState = {
  mode: ControlMode
  holder: 'ai' | 'user'
  pausedAt?: Date
  pausedAtStep?: string
  manualActions: ManualAction[]   // 用户在接管期间的操作
}

type ManualAction = {
  timestamp: Date
  type: string
  target?: string
  data?: unknown
}
```

### 4. 暂停响应机制

暂停信号 → 当前原子操作完成 → 保存状态 → 进入暂停状态

```typescript
class PauseController {
  private isPausing = false
  private pauseResolve: (() => void) | null = null

  requestPause(): Promise<void> {
    this.isPausing = true
    return new Promise(resolve => {
      this.pauseResolve = resolve
    })
  }

  checkPausePoint(): boolean {
    if (this.isPausing) {
      this.isPausing = false
      this.pauseResolve?.()
      return true
    }
    return false
  }
}
```

## 验收标准

1. [ ] 点击暂停 500ms 内响应
2. [ ] 暂停时显示完整状态（已完成、当前、待执行）
3. [ ] 可选择继续执行或接管
4. [ ] 接管后可随时交还给 AI
5. [ ] 取消任务能正确回滚

## 依赖

- Phase 3 完成（检查点确认）

## 下一阶段

完成本阶段后，进入 Phase 5：人工操作感知
