import { NextResponse } from 'next/server'
import {
  getImprovementImplementedAt,
  getImprovementLastActionAt,
  getImprovementNote,
  getImprovementStatus,
  getImprovementSummary,
  getImprovementTargetFileHint,
  getImprovementVerificationNote,
  getImprovementVerifiedAt,
  setImprovementNote,
  setImprovementSummary,
  setImprovementStatus,
  setImprovementTargetFileHint,
  setImprovementVerificationNote,
} from '@/server/learning/improvementStore'
import type { ImprovementSuggestionStatus } from '@/server/learning/improvementSuggestion'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const improvementId = params.id
    if (!improvementId) {
      return NextResponse.json(
        { ok: false, error: 'Invalid improvement ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, implementationNote, targetFileHint, implementationSummary, verificationNote } = body

    const validStatuses: ImprovementSuggestionStatus[] = ['NEW', 'REVIEWED', 'ACCEPTED', 'IMPLEMENTED', 'VERIFIED', 'REJECTED']
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid status. Must be NEW, REVIEWED, ACCEPTED, or REJECTED' },
        { status: 400 }
      )
    }

    if (implementationNote !== undefined && typeof implementationNote !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'implementationNote must be a string' },
        { status: 400 }
      )
    }

    if (targetFileHint !== undefined && typeof targetFileHint !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'targetFileHint must be a string' },
        { status: 400 }
      )
    }

    if (implementationSummary !== undefined && typeof implementationSummary !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'implementationSummary must be a string' },
        { status: 400 }
      )
    }

    if (verificationNote !== undefined && typeof verificationNote !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'verificationNote must be a string' },
        { status: 400 }
      )
    }

    if (status !== undefined) {
      setImprovementStatus(improvementId, status as ImprovementSuggestionStatus)
    }

    if (implementationNote !== undefined) {
      setImprovementNote(improvementId, implementationNote)
    }

    if (targetFileHint !== undefined) {
      setImprovementTargetFileHint(improvementId, targetFileHint)
    }

    if (implementationSummary !== undefined) {
      setImprovementSummary(improvementId, implementationSummary)
    }

    if (verificationNote !== undefined) {
      setImprovementVerificationNote(improvementId, verificationNote)
    }

    // Return updated improvement
    const updatedStatus = getImprovementStatus(improvementId)

    return NextResponse.json({
      ok: true,
      data: {
        id: improvementId,
        status: updatedStatus,
        targetFileHint: getImprovementTargetFileHint(improvementId) ?? null,
        implementationNote: getImprovementNote(improvementId) ?? null,
        implementationSummary: getImprovementSummary(improvementId) ?? null,
        verificationNote: getImprovementVerificationNote(improvementId) ?? null,
        lastActionAt: getImprovementLastActionAt(improvementId) ?? null,
        implementedAt: getImprovementImplementedAt(improvementId) ?? null,
        verifiedAt: getImprovementVerifiedAt(improvementId) ?? null,
        message: 'Improvement suggestion updated',
      },
    })
  } catch (error) {
    console.error('Error updating improvement status:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
