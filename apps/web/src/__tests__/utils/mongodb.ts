/**
 * MongoDB 测试工具
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'

// 加载 .env.test 或 .env 环境变量
dotenv.config({ path: '.env.test' })
dotenv.config({ path: '.env' })

import { connectMongo } from '@/lib/mongodb'
import {
  MemberGroupModel,
  GroupMemberModel,
  OrgModel,
  OrgMemberModel,
  ResourcePermissionModel,
} from '@/lib/mongodb/schemas'

export async function setupTestDB() {
  await connectMongo()
}

/**
 * 清理测试数据
 * @param teamId 可选，如果提供则只删除该团队的数据
 */
export async function cleanupTestDB(teamId?: string) {
  const filter = teamId ? { teamId } : {}
  await MemberGroupModel.deleteMany(filter)
  await GroupMemberModel.deleteMany(filter)
  await OrgModel.deleteMany(filter)
  await OrgMemberModel.deleteMany(filter)
  await ResourcePermissionModel.deleteMany(filter)
}

export async function closeTestDB() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close()
  }
}
