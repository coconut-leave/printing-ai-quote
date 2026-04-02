import { NextResponse } from 'next/server'
import { getReflectionStats } from '@/server/db/conversations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const stats = await getReflectionStats()

    return NextResponse.json({
      ok: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching reflection stats:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
