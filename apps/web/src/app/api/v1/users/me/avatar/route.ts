import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

// 上传头像
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(badRequest('请选择文件'), { status: 400 })
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        badRequest('只支持 JPEG、PNG、GIF、WebP 格式'),
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        badRequest('文件大小不能超过 2MB'),
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${session.id}-${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    const filePath = path.join(uploadDir, fileName)

    // 确保目录存在
    await mkdir(uploadDir, { recursive: true })

    // 获取旧头像路径以便删除
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { avatar: true },
    })

    // 写入文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 更新用户头像
    const avatarUrl = `/uploads/avatars/${fileName}`
    await prisma.user.update({
      where: { id: session.id },
      data: { avatar: avatarUrl },
    })

    // 删除旧头像文件（如果存在且是本地文件）
    if (user?.avatar?.startsWith('/uploads/avatars/')) {
      const oldFilePath = path.join(process.cwd(), 'public', user.avatar)
      try {
        await unlink(oldFilePath)
      } catch {
        // 忽略删除失败
      }
    }

    return NextResponse.json(success({ avatar: avatarUrl }))
  } catch (err) {
    console.error('Upload avatar error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '上传失败'),
      { status: 500 }
    )
  }
}

// 删除头像
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 获取当前头像
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { avatar: true },
    })

    // 删除文件
    if (user?.avatar?.startsWith('/uploads/avatars/')) {
      const filePath = path.join(process.cwd(), 'public', user.avatar)
      try {
        await unlink(filePath)
      } catch {
        // 忽略删除失败
      }
    }

    // 清空头像字段
    await prisma.user.update({
      where: { id: session.id },
      data: { avatar: null },
    })

    return NextResponse.json(success(null, '头像已删除'))
  } catch (err) {
    console.error('Delete avatar error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除失败'),
      { status: 500 }
    )
  }
}
