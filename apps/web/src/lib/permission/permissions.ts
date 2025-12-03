// 权限矩阵定义
import type { ProjectRole, PermissionAction, PermissionResource } from '@platform/shared'

// 权限矩阵
const PERMISSION_MATRIX: Record<
  ProjectRole,
  Record<PermissionResource, PermissionAction[]>
> = {
  OWNER: {
    prompt: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    dataset: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    model: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    evaluator: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    task: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    member: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    project: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
    settings: ['view', 'create', 'edit', 'delete', 'execute', 'manage'],
  },
  ADMIN: {
    prompt: ['view', 'create', 'edit', 'delete', 'execute'],
    dataset: ['view', 'create', 'edit', 'delete', 'execute'],
    model: ['view', 'create', 'edit', 'delete', 'execute'],
    evaluator: ['view', 'create', 'edit', 'delete', 'execute'],
    task: ['view', 'create', 'edit', 'delete', 'execute'],
    member: ['view', 'create', 'edit', 'delete', 'manage'],
    project: ['view', 'edit'],
    settings: ['view', 'edit'],
  },
  MEMBER: {
    prompt: ['view', 'create', 'edit', 'execute'],
    dataset: ['view', 'create', 'edit', 'execute'],
    model: ['view', 'create', 'edit', 'execute'],
    evaluator: ['view', 'create', 'edit', 'execute'],
    task: ['view', 'create', 'edit', 'execute'],
    member: ['view'],
    project: ['view'],
    settings: ['view'],
  },
  VIEWER: {
    prompt: ['view'],
    dataset: ['view'],
    model: ['view'],
    evaluator: ['view'],
    task: ['view'],
    member: ['view'],
    project: ['view'],
    settings: ['view'],
  },
}

// 检查权限
export function hasPermission(
  role: ProjectRole,
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
  role: ProjectRole
): Record<PermissionResource, PermissionAction[]> {
  return PERMISSION_MATRIX[role] || {}
}

// 获取角色优先级（用于比较）
export function getRolePriority(role: ProjectRole): number {
  const priorities: Record<ProjectRole, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    VIEWER: 3,
  }
  return priorities[role] ?? 999
}

// 检查是否可以修改目标用户
export function canModifyMember(
  operatorRole: ProjectRole,
  targetRole: ProjectRole
): boolean {
  // 只有优先级更高的角色才能修改目标角色
  return getRolePriority(operatorRole) < getRolePriority(targetRole)
}
