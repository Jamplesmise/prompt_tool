// 项目管理相关类型

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export type Project = {
  id: string
  name: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export type ProjectWithOwner = Project & {
  owner: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

export type ProjectWithMemberCount = Project & {
  _count: {
    members: number
  }
}

export type ProjectMember = {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  invitedById: string | null
  createdAt: Date
  updatedAt: Date
}

export type ProjectMemberWithUser = ProjectMember & {
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  invitedBy?: {
    id: string
    name: string
  } | null
}

export type CreateProjectInput = {
  name: string
  description?: string
  avatar?: string
}

export type UpdateProjectInput = Partial<CreateProjectInput>

export type InviteMemberInput = {
  email: string
  role: ProjectRole
}

export type UpdateMemberRoleInput = {
  role: ProjectRole
}

export type TransferOwnershipInput = {
  newOwnerId: string
}

// API Token 相关类型
export type ApiTokenScope = 'read' | 'write' | 'execute' | 'admin'

export type ApiToken = {
  id: string
  name: string
  tokenPrefix: string
  scopes: ApiTokenScope[]
  expiresAt: Date | null
  lastUsedAt: Date | null
  userId: string
  createdAt: Date
}

export type ApiTokenWithFullToken = ApiToken & {
  token: string
}

export type CreateApiTokenInput = {
  name: string
  scopes: ApiTokenScope[]
  expiresAt?: Date | null
}

// 审计日志相关类型
export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'invite'
  | 'remove'
  | 'transfer'

export type AuditResource =
  | 'user'
  | 'project'
  | 'member'
  | 'prompt'
  | 'dataset'
  | 'model'
  | 'provider'
  | 'evaluator'
  | 'task'
  | 'api_token'
  | 'scheduled_task'
  | 'alert_rule'
  | 'notify_channel'

export type AuditLog = {
  id: string
  action: AuditAction
  resource: AuditResource
  resourceId: string | null
  details: Record<string, unknown> | null
  userId: string
  projectId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export type AuditLogWithUser = AuditLog & {
  user: {
    id: string
    name: string
    email: string
  }
}

export type AuditLogFilter = {
  action?: AuditAction
  resource?: AuditResource
  userId?: string
  projectId?: string
  startDate?: Date
  endDate?: Date
}

// 权限相关类型
export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'execute'
  | 'manage'

export type PermissionResource =
  | 'prompt'
  | 'dataset'
  | 'model'
  | 'evaluator'
  | 'task'
  | 'member'
  | 'project'
  | 'settings'

export type PermissionMatrix = {
  [role in ProjectRole]: {
    [resource in PermissionResource]: PermissionAction[]
  }
}
