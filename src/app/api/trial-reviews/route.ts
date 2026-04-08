import { NextResponse } from 'next/server'
import { TrialReviewSourceKind, TrialReviewStatus } from '@prisma/client'
import { listTrialReviewQueue } from '@/server/trialReviews/queue'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set<TrialReviewStatus>([
  TrialReviewStatus.PENDING_REVIEW,
  TrialReviewStatus.MANUAL_CONFIRMED,
  TrialReviewStatus.RETURNED_AS_ESTIMATE,
  TrialReviewStatus.HANDOFF_TO_HUMAN,
  TrialReviewStatus.CLOSED,
])

const VALID_SOURCE_KINDS = new Set<TrialReviewSourceKind>([
  TrialReviewSourceKind.REFERENCE_QUOTE,
  TrialReviewSourceKind.MANUAL_REVIEW,
  TrialReviewSourceKind.HUMAN_FOLLOWUP,
  TrialReviewSourceKind.QUOTED_FEEDBACK,
])

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'ALL'
    const sourceKind = url.searchParams.get('sourceKind') || 'ALL'

    if (status !== 'ALL' && !VALID_STATUSES.has(status as TrialReviewStatus)) {
      return NextResponse.json({ ok: false, error: '无效的复核状态筛选值' }, { status: 400 })
    }

    if (sourceKind !== 'ALL' && !VALID_SOURCE_KINDS.has(sourceKind as TrialReviewSourceKind)) {
      return NextResponse.json({ ok: false, error: '无效的复核来源筛选值' }, { status: 400 })
    }

    const data = await listTrialReviewQueue({
      status: status as TrialReviewStatus | 'ALL',
      sourceKind: sourceKind as TrialReviewSourceKind | 'ALL',
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Error fetching trial review queue:', error)
    return NextResponse.json({ ok: false, error: '加载试运行复核队列失败' }, { status: 500 })
  }
}