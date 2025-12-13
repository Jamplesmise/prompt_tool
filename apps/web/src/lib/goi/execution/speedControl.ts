/**
 * GOI 执行速度控制模块
 *
 * 提供执行速度配置和控制，让用户可以调节 AI 操作的快慢。
 * 支持四种速度等级：快速、正常、慢速（演示）、单步执行
 */

/**
 * 执行速度等级
 */
export type ExecutionSpeed = 'fast' | 'normal' | 'slow' | 'step'

/**
 * 速度配置项
 */
export type SpeedConfig = {
  /** 操作间隔（ms），-1 表示需要手动确认 */
  delay: number
  /** 高亮持续时间（ms） */
  highlightDuration: number
  /** 气泡显示时间（ms） */
  bubbleDuration: number
  /** 显示标签 */
  label: string
  /** 标签英文 */
  labelEn: string
  /** 描述 */
  description: string
}

/**
 * 速度配置映射
 */
export const SPEED_CONFIG: Record<ExecutionSpeed, SpeedConfig> = {
  fast: {
    delay: 200,
    highlightDuration: 300,
    bubbleDuration: 500,
    label: '快速',
    labelEn: 'Fast',
    description: '最快执行，适合熟练用户',
  },
  normal: {
    delay: 800,
    highlightDuration: 600,
    bubbleDuration: 1500,
    label: '正常',
    labelEn: 'Normal',
    description: '默认速度，可以跟上执行节奏',
  },
  slow: {
    delay: 2000,
    highlightDuration: 1500,
    bubbleDuration: 3000,
    label: '慢速',
    labelEn: 'Slow',
    description: '演示模式，详细展示每一步',
  },
  step: {
    delay: -1,
    highlightDuration: -1,
    bubbleDuration: -1,
    label: '单步',
    labelEn: 'Step',
    description: '每步需要手动确认才能继续',
  },
}

/**
 * 速度控制器事件
 */
export type SpeedControllerEvents = {
  onSpeedChange?: (speed: ExecutionSpeed) => void
  onStepConfirm?: () => void
  onPause?: () => void
  onResume?: () => void
}

/**
 * 速度控制器
 *
 * 管理执行速度，提供等待和确认机制
 */
export class SpeedController {
  private speed: ExecutionSpeed = 'normal'
  private stepResolve: (() => void) | null = null
  private isPaused = false
  private pauseResolve: (() => void) | null = null
  private events: SpeedControllerEvents = {}

  /**
   * 设置执行速度
   */
  setSpeed(speed: ExecutionSpeed): void {
    this.speed = speed
    this.events.onSpeedChange?.(speed)
  }

  /**
   * 获取当前速度
   */
  getSpeed(): ExecutionSpeed {
    return this.speed
  }

  /**
   * 获取当前速度配置
   */
  getConfig(): SpeedConfig {
    return SPEED_CONFIG[this.speed]
  }

  /**
   * 设置事件监听器
   */
  setEvents(events: SpeedControllerEvents): void {
    this.events = events
  }

  /**
   * 等待适当的时间
   *
   * - 如果处于暂停状态，等待恢复
   * - 如果是单步模式，等待用户确认
   * - 否则等待配置的延迟时间
   */
  async wait(): Promise<void> {
    // 检查是否暂停
    if (this.isPaused) {
      await new Promise<void>((resolve) => {
        this.pauseResolve = resolve
      })
    }

    const config = SPEED_CONFIG[this.speed]

    if (config.delay === -1) {
      // 单步模式：等待用户确认
      return new Promise((resolve) => {
        this.stepResolve = resolve
      })
    }

    return new Promise((resolve) => setTimeout(resolve, config.delay))
  }

  /**
   * 等待高亮显示时间
   */
  async waitHighlight(): Promise<void> {
    const config = SPEED_CONFIG[this.speed]
    if (config.highlightDuration <= 0) return
    return new Promise((resolve) =>
      setTimeout(resolve, config.highlightDuration)
    )
  }

  /**
   * 等待气泡显示时间
   */
  async waitBubble(): Promise<void> {
    const config = SPEED_CONFIG[this.speed]
    if (config.bubbleDuration <= 0) return
    return new Promise((resolve) =>
      setTimeout(resolve, config.bubbleDuration)
    )
  }

  /**
   * 用户确认继续（单步模式）
   */
  confirmStep(): void {
    if (this.stepResolve) {
      this.stepResolve()
      this.stepResolve = null
      this.events.onStepConfirm?.()
    }
  }

  /**
   * 检查是否等待确认
   */
  isWaitingForConfirm(): boolean {
    return this.stepResolve !== null
  }

  /**
   * 暂停执行
   */
  pause(): void {
    this.isPaused = true
    this.events.onPause?.()
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.isPaused = false
    if (this.pauseResolve) {
      this.pauseResolve()
      this.pauseResolve = null
    }
    this.events.onResume?.()
  }

  /**
   * 检查是否暂停
   */
  isPausedState(): boolean {
    return this.isPaused
  }

  /**
   * 重置控制器状态
   */
  reset(): void {
    this.isPaused = false
    this.stepResolve = null
    this.pauseResolve = null
  }
}

// 全局单例实例
export const speedController = new SpeedController()

/**
 * 速度图标映射
 */
export const SPEED_ICONS: Record<ExecutionSpeed, string> = {
  fast: '⚡',
  normal: '▶️',
  slow: '🐢',
  step: '👆',
}

/**
 * 获取速度列表（用于 UI 选择器）
 */
export function getSpeedOptions(): Array<{
  value: ExecutionSpeed
  label: string
  icon: string
  description: string
}> {
  return (Object.keys(SPEED_CONFIG) as ExecutionSpeed[]).map((speed) => ({
    value: speed,
    label: SPEED_CONFIG[speed].label,
    icon: SPEED_ICONS[speed],
    description: SPEED_CONFIG[speed].description,
  }))
}
