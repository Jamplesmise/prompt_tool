/**
 * 测试数据 fixtures
 */

// 使用函数生成唯一 ID，避免并发测试冲突
let counter = 0
export function generateTestTeamId(prefix: string) {
  return `test-team-${prefix}-${Date.now()}-${++counter}`
}

// 保留向后兼容的静态 ID（用于单个测试文件）
export const testTeamId = 'test-team-001'

export const testMembers = [
  { id: 'tmb-001', name: '管理员', role: 'OWNER' },
  { id: 'tmb-002', name: '开发者', role: 'ADMIN' },
  { id: 'tmb-003', name: '查看者', role: 'MEMBER' },
]

export const testApps = [
  { id: 'app-001', name: '测试应用1' },
  { id: 'app-002', name: '测试应用2' },
]

export const testDatasets = [
  { id: 'dataset-001', name: '测试数据集1' },
  { id: 'dataset-002', name: '测试数据集2' },
]

export const testModels = [
  { id: 'model-001', name: '测试模型1' },
]
