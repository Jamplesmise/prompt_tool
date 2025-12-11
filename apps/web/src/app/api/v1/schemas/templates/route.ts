import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, unauthorized } from '@/lib/api'
import { getTemplateList, getTemplatesByCategory, templateCategoryLabels } from '@platform/shared'

export const dynamic = 'force-dynamic'

// GET /api/v1/schemas/templates - 获取模板列表
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const templates = getTemplateList()
    const byCategory = getTemplatesByCategory()

    // 构建分类结构
    const categories = Object.entries(byCategory).map(([category, items]) => ({
      key: category,
      label: templateCategoryLabels[category] || category,
      templates: items.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        inputVariableCount: t.inputSchema.variables.length,
        outputFieldCount: t.outputSchema.fields.length,
      })),
    }))

    return NextResponse.json(
      success({
        templates,
        categories,
        total: templates.length,
      })
    )
  } catch (err) {
    console.error('Get schema templates error:', err)
    return NextResponse.json(
      { code: 500001, message: '获取模板列表失败', data: null },
      { status: 500 }
    )
  }
}
