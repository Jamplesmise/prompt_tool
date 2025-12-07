/**
 * 权限模块导出
 */

// 原有 RBAC 权限矩阵
export * from './permissions'
export * from './middleware'

// 新增：基于位运算的资源级协作者权限
export * from './constant'
export { Permission, type PermissionJSON } from './controller'
export * from './utils'

// FastGPT 兼容格式
export * from './fastgpt'
