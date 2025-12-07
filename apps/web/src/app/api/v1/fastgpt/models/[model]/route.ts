import { NextResponse } from 'next/server'
import { getFastGPTModelByName } from '@/services/fastgptModelService'
import { isFastGPTEnabled } from '@/lib/mongodbCompat'

type Params = {
  params: Promise<{ model: string }>
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { model } = await params

    if (!isFastGPTEnabled()) {
      return NextResponse.json(
        {
          code: 400001,
          message: 'FastGPT models not enabled',
          data: null,
        },
        { status: 400 }
      )
    }

    const modelData = await getFastGPTModelByName(model)

    if (!modelData) {
      return NextResponse.json(
        {
          code: 404001,
          message: 'Model not found',
          data: null,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: modelData,
    })
  } catch (error) {
    console.error('[API] FastGPT model detail error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: 'Failed to fetch model',
        data: null,
      },
      { status: 500 }
    )
  }
}
