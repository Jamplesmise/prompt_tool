/**
 * MongoDB Schemas 导出入口
 */

// Phase 2: 成员分组
export {
  MemberGroupModel,
  type MemberGroupSchemaType,
  type MemberGroupListItemType,
} from './memberGroup'
export {
  GroupMemberModel,
  GroupMemberRole,
  type GroupMemberSchemaType,
  type GroupMemberItemType,
} from './groupMember'

// Phase 3: 组织架构
export {
  OrgModel,
  getOrgChildrenPath,
  type OrgSchemaType,
  type OrgListItemType,
} from './org'
export {
  OrgMemberModel,
  type OrgMemberSchemaType,
  type OrgMemberItemType,
} from './orgMember'

// Phase 4: 协作者权限
export {
  ResourcePermissionModel,
  type ResourcePermissionSchemaType,
  type CollaboratorDetailType,
} from './resourcePermission'
