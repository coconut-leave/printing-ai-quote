import { NextResponse } from 'next/server'
import { TrialReviewSourceKind, TrialReviewStatus } from '@prisma/client'
import { applyTrialReviewDecision } from '@/server/trialReviews/queue'

const EDITABLE_STATUSES = new Set<TrialReviewStatus>([
  TrialReviewStatus.MANUAL_CONFIRMED,
  TrialReviewStatus.RETURNED_AS_ESTIMATE,
  TrialReviewStatus.HANDOFF_TO_HUMAN,
  TrialReviewStatus.CLOSED,
])

const EDITABLE_SOURCE_KINDS = new Set<TrialReviewSourceKind>([
  TrialReviewSourceKind.QUOTED_FEEDBACK,
])

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

export async function PATCH(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const conversationId = Number(params.conversationId)
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return NextResponse.json({ ok: false, error: '会话 ID 无效' }, { status: 400 })
    }

    const body = await request.json()
    const status = body?.status
    const sourceKind = typeof body?.sourceKind === 'string' ? body.sourceKind : null

    if (!EDITABLE_STATUSES.has(status)) {
      return NextResponse.json({ ok: false, error: '无效的复核流转状态' }, { status: 400 })
    }

    if (sourceKind && !EDITABLE_SOURCE_KINDS.has(sourceKind as TrialReviewSourceKind)) {
      return NextResponse.json({ ok: false, error: '无效的复核来源' }, { status: 400 })
    }

    const operatorName = normalizeOptionalString(body?.operatorName)
    if (!operatorName) {
      return NextResponse.json({ ok: false, error: '请先填写处理人，再提交复核动作' }, { status: 400 })
    }

    const data = await applyTrialReviewDecision({
      conversationId,
      status,
      operatorName,
      sourceKind: sourceKind as TrialReviewSourceKind | null,
      note: normalizeOptionalString(body?.note),
      manualConfirmationResult: normalizeOptionalString(body?.manualConfirmationResult),
      rejectionReason: normalizeOptionalString(body?.rejectionReason),
      rejectionCategory: normalizeOptionalString(body?.rejectionCategory),
      rejectionTargetArea: normalizeOptionalString(body?.rejectionTargetArea),
      calibrationSignal: normalizeOptionalString(body?.calibrationSignal),
      driftSourceCandidate: normalizeOptionalString(body?.driftSourceCandidate),
      driftDirection: normalizeOptionalString(body?.driftDirection),
      requiresHumanReview: typeof body?.requiresHumanReview === 'boolean' ? body.requiresHumanReview : null,
      contextSnapshot: body?.contextSnapshot && typeof body.contextSnapshot === 'object' && !Array.isArray(body.contextSnapshot)
        ? body.contextSnapshot
        : null,
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Error applying trial review decision:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '试运行复核流转失败' },
      { status: 500 }
    )
  }
}