// 团队管理相关类型

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export type Team = {
  id: string
  name: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export type TeamWithOwner = Team & {
  owner: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

export type TeamWithMemberCount = Team & {
  _count: {
    members: number
  }
}

export type TeamMember = {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  invitedById: string | null
  createdAt: Date
  updatedAt: Date
}

export type TeamMemberWithUser = TeamMember & {
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

export type CreateTeamInput = {
  name: string
  description?: string
  avatar?: string
}

export type UpdateTeamInput = Partial<CreateTeamInput>

export type InviteMemberInput = {
  email: string
  role: TeamRole
}

export type UpdateMemberRoleInput = {
  role: TeamRole
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
  | 'team'
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
  teamId: string | null
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
  teamId?: string
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
  | 'team'
  | 'settings'

export type PermissionMatrix = {
  [role in TeamRole]: {
    [resource in PermissionResource]: PermissionAction[]
  }
}
