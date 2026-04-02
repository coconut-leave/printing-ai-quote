import { NextResponse } from 'next/server'
import { getAllReflections, getReflectionStats } from '@/server/db/conversations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const limit = Number(url.searchParams.get('limit')) || 50
    const status = url.searchParams.get('status') || undefined
    const issueType = url.searchParams.get('issueType') || undefined

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { ok: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const validStatuses = ['NEW', 'REVIEWED', 'APPROVED', 'REJECTED']
    const validIssueTypes = ['PARAM_MISSING', 'PARAM_WRONG', 'QUOTE_INACCURATE', 'SHOULD_HANDOFF']

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status filter' }, { status: 400 })
    }

    if (issueType && !validIssueTypes.includes(issueType)) {
      return NextResponse.json({ ok: false, error: 'Invalid issueType filter' }, { status: 400 })
    }

    const offset = (page - 1) * limit
    const { records, total } = await getAllReflections(limit, offset, {
      status: status as any,
      issueType: issueType as any,
    })

    return NextResponse.json({
      ok: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching reflections:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
