/**
 * GOI (Guided Operation Intelligence) 配置
 *
 * 功能开关和配置项，用于控制 GOI 功能的启用状态
 */

export type GoiLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export type GoiFeatures = {
  /** 多步骤任务规划 */
  multiStepPlanning: boolean
  /** 操作可视化 (TODO List) */
  operationVisualization: boolean
  /** 检查点确认机制 */
  checkpointConfirmation: boolean
  /** 暂停与接管功能 */
  pauseAndTakeover: boolean
  /** 人工操作感知 */
  humanActionSensing: boolean
  /** 断点续跑 */
  resumeFromCheckpoint: boolean
}

export type GoiConfig = {
  /** 是否启用 GOI 功能 */
  enabled: boolean
  /** 当前智能等级 */
  level: GoiLevel
  /** 各功能开关 */
  features: GoiFeatures
  /** 性能配置 */
  performance: {
    /** 计划生成超时时间 (ms) */
    planGenerationTimeout: number
    /** 暂停响应最大时间 (ms) */
    pauseResponseTimeout: number
    /** 模式切换最大时间 (ms) */
    modeSwitchTimeout: number
  }
  /** 检查点配置 */
  checkpoint: {
    /** 默认超时时间 (ms) */
    defaultTimeout: number
    /** 是否允许自动确认 */
    allowAutoApprove: boolean
  }
}

/**
 * 默认 GOI 配置
 */
export const DEFAULT_GOI_CONFIG: GoiConfig = {
  enabled: true,
  level: 'L2',
  features: {
    multiStepPlanning: true,
    operationVisualization: true,
    checkpointConfirmation: true,
    pauseAndTakeover: true,
    humanActionSensing: true,
    resumeFromCheckpoint: true,
  },
  performance: {
    planGenerationTimeout: 5000,
    pauseResponseTimeout: 500,
    modeSwitchTimeout: 500,
  },
  checkpoint: {
    defaultTimeout: 30000,
    allowAutoApprove: false,
  },
}

/**
 * L1 级别配置（基础对话）
 */
export const L1_GOI_CONFIG: GoiConfig = {
  ...DEFAULT_GOI_CONFIG,
  level: 'L1',
  features: {
    multiStepPlanning: false,
    operationVisualization: false,
    checkpointConfirmation: false,
    pauseAndTakeover: false,
    humanActionSensing: false,
    resumeFromCheckpoint: false,
  },
}

/**
 * L2 级别配置（完整功能）
 */
export const L2_GOI_CONFIG: GoiConfig = {
  ...DEFAULT_GOI_CONFIG,
  level: 'L2',
}

/**
 * 获取当前 GOI 配置
 */
export function getGoiConfig(): GoiConfig {
  // 从环境变量读取配置
  const enabled = process.env.NEXT_PUBLIC_GOI_ENABLED !== 'false'
  const level = (process.env.NEXT_PUBLIC_GOI_LEVEL as GoiLevel) || 'L2'

  if (!enabled) {
    return {
      ...DEFAULT_GOI_CONFIG,
      enabled: false,
    }
  }

  switch (level) {
    case 'L1':
      return L1_GOI_CONFIG
    case 'L2':
    default:
      return L2_GOI_CONFIG
  }
}

/**
 * 检查特定功能是否启用
 */
export function isFeatureEnabled(feature: keyof GoiFeatures): boolean {
  const config = getGoiConfig()
  return config.enabled && config.features[feature]
}

/**
 * 获取当前智能等级
 */
export function getCurrentLevel(): GoiLevel {
  return getGoiConfig().level
}
