// 权限矩阵定义
import type { TeamRole, PermissionAction, PermissionResource } from '@platform/shared'

// 权限矩阵
const PERMISSION_MATRIX: Record<
  TeamRole,
  Record<PermissionResource, PermissionAction[]>
> = {
  OWNER: {
    prompt: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    dataset: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    model: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    evaluator: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    task: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    member: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    team: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    settings: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
  },
  ADMIN: {
    prompt: ['view', 'create', 'edit', 'delete', 'execute'],
    dataset: ['view', 'create', 'edit', 'delete', 'execute'],
    model: ['view', 'create', 'edit', 'delete', 'execute'],
    evaluator: ['view', 'create', 'edit', 'delete', 'execute'],
    task: ['view', 'create', 'edit', 'delete', 'execute'],
    member: ['view', 'create', 'edit', 'delete', 'manage'],
    team: ['view', 'edit'],
    settings: ['view', 'edit'],
  },
  MEMBER: {
    prompt: ['view', 'create', 'edit', 'execute'],
    dataset: ['view', 'create', 'edit', 'execute'],
    model: ['view', 'create', 'edit', 'execute'],
    evaluator: ['view', 'create', 'edit', 'execute'],
    task: ['view', 'create', 'edit', 'execute'],
    member: ['view'],
    team: ['view'],
    settings: ['view'],
  },
  VIEWER: {
    prompt: ['view'],
    dataset: ['view'],
    model: ['view'],
    evaluator: ['view'],
    task: ['view'],
    member: ['view'],
    team: ['view'],
    settings: ['view'],
  },
}

// 检查权限
export function hasPermission(
  role: TeamRole,
  action: PermissionAction,
  resource: PermissionResource
): boolean {
  const rolePermissions = PERMISSION_MATRIX[role]
  if (!rolePermissions) return false

  const resourcePermissions = rolePermissions[resource]
  if (!resourcePermissions) return false

  return resourcePermissions.includes(action)
}

// 获取角色的所有权限
export function getRolePermissions(
  role: TeamRole
): Record<PermissionResource, PermissionAction[]> {
  return PERMISSION_MATRIX[role] || {}
}

// 获取角色优先级（用于比较）
export function getRolePriority(role: TeamRole): number {
  const priorities: Record<TeamRole, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    VIEWER: 3,
  }
  return priorities[role] ?? 999
}

// 检查是否可以修改目标用户
export function canModifyMember(
  operatorRole: TeamRole,
  targetRole: TeamRole
): boolean {
  // 只有优先级更高的角色才能修改目标角色
  return getRolePriority(operatorRole) < getRolePriority(targetRole)
}
