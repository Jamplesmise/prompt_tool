import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES, getTemplateById, templateCategoryLabels } from '@platform/shared'

export const dynamic = 'force-dynamic'

type Params = {
  params: Promise<{ id: string }>
}

// GET /api/v1/schemas/templates/:id - 获取模板详情
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const template = getTemplateById(id)

    if (!template) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '模板不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      success({
        ...template,
        categoryLabel: templateCategoryLabels[template.category] || template.category,
      })
    )
  } catch (err) {
    console.error('Get schema template detail error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取模板详情失败'),
      { status: 500 }
    )
  }
}
