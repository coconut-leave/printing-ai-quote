import { NextResponse } from 'next/server'
import { getApprovedReflections } from '@/server/db/conversations'
import {
  type ImprovementSuggestionStatus,
  type ImprovementSuggestionType,
} from '@/server/learning/improvementSuggestion'
import { buildImprovementSuggestions } from '@/server/learning/improvementView'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { records } = await getApprovedReflections(1000, 0)

    const statusCounts: Record<ImprovementSuggestionStatus, number> = {
      NEW: 0,
      REVIEWED: 0,
      ACCEPTED: 0,
      IMPLEMENTED: 0,
      VERIFIED: 0,
      REJECTED: 0,
    }

    const verifiedTypeCounts: Record<ImprovementSuggestionType, number> = {
      PROMPT_IMPROVEMENT: 0,
      REGEX_IMPROVEMENT: 0,
      FIELD_MAPPING_IMPROVEMENT: 0,
      ESTIMATE_DEFAULT_IMPROVEMENT: 0,
      HANDOFF_POLICY_IMPROVEMENT: 0,
      OTHER: 0,
    }

    const improvements = buildImprovementSuggestions(records.map((reflection) => ({
      id: reflection.id,
      conversationId: reflection.conversationId,
      issueType: reflection.issueType,
      suggestionDraft: reflection.suggestionDraft,
      originalExtractedParams: reflection.originalExtractedParams as Record<string, any> | null,
      correctedParams: reflection.correctedParams as Record<string, any> | null,
      createdAt: reflection.createdAt,
    })))

    improvements.forEach((improvement) => {
      const suggestionType = improvement.suggestionType
      const status = improvement.status

      statusCounts[status] += 1
      if (status === 'VERIFIED') {
        verifiedTypeCounts[suggestionType] += 1
      }
    })

    const easiestToVerified = Object.entries(verifiedTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([suggestionType, count]) => ({ suggestionType, count }))
      .filter((item) => item.count > 0)

    return NextResponse.json({
      ok: true,
      data: {
        acceptedCount: statusCounts.ACCEPTED,
        implementedCount: statusCounts.IMPLEMENTED,
        verifiedCount: statusCounts.VERIFIED,
        easiestToVerified,
      },
    })
  } catch (error) {
    console.error('Error fetching improvement stats:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
