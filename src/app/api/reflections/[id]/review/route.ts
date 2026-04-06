import { NextResponse } from 'next/server'
import {
  buildReflectionBusinessCorrectedParams,
  buildReflectionBusinessFeedbackSummary,
  normalizeReflectionBusinessFeedback,
} from '@/lib/reflection/businessFeedback'
import { updateReflectionRecord } from '@/server/db/conversations'
import { prisma } from '@/server/db/prisma'
import { isReflectionIssueType } from '@/lib/reflection/issueTypes'

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const reflectionId = Number(params.id)
    if (Number.isNaN(reflectionId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid reflection ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, issueType, correctedParams, correctedQuoteSummary, businessFeedback } = body

    const validStatuses = ['NEW', 'REVIEWED', 'APPROVED', 'REJECTED']
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid status. Must be NEW, REVIEWED, APPROVED, or REJECTED' },
        { status: 400 }
      )
    }

    if (issueType !== undefined && (!isReflectionIssueType(issueType))) {
      return NextResponse.json(
        { ok: false, error: 'Invalid issueType' },
        { status: 400 }
      )
    }

    if (correctedParams !== undefined && correctedParams !== null && !isObject(correctedParams)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid correctedParams. Must be an object or null' },
        { status: 400 }
      )
    }

    if (correctedQuoteSummary !== undefined && correctedQuoteSummary !== null && typeof correctedQuoteSummary !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Invalid correctedQuoteSummary. Must be a string or null' },
        { status: 400 }
      )
    }

    const normalizedBusinessFeedback = normalizeReflectionBusinessFeedback(businessFeedback)

    if (
      status === undefined
      && issueType === undefined
      && correctedParams === undefined
      && correctedQuoteSummary === undefined
      && businessFeedback === undefined
    ) {
      return NextResponse.json(
        { ok: false, error: 'No editable fields provided' },
        { status: 400 }
      )
    }

    // Check if reflection exists
    const reflection = await prisma.reflectionRecord.findUnique({
      where: { id: reflectionId },
    })

    if (!reflection) {
      return NextResponse.json(
        { ok: false, error: 'Reflection not found' },
        { status: 404 }
      )
    }

    const updated = await updateReflectionRecord(reflectionId, {
      status: status as 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | undefined,
      issueType,
      correctedParams: buildReflectionBusinessCorrectedParams({
        correctedParams: isObject(correctedParams) ? correctedParams : reflection.correctedParams as Record<string, any> | null,
        businessFeedback: normalizedBusinessFeedback,
      }),
      correctedQuoteSummary: correctedQuoteSummary === undefined
        ? (normalizedBusinessFeedback?.correctResult || buildReflectionBusinessFeedbackSummary(normalizedBusinessFeedback) || undefined)
        : correctedQuoteSummary,
    })

    return NextResponse.json({
      ok: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating reflection status:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
