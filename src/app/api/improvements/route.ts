import { NextResponse } from 'next/server'
import { getApprovedReflections } from '@/server/db/conversations'
import {
  type ImprovementSuggestionType,
  type ImprovementTargetArea,
  type ImprovementSuggestionStatus,
  type ImprovementSuggestion,
} from '@/server/learning/improvementSuggestion'
import { buildImprovementSuggestions } from '@/server/learning/improvementView'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const limit = Number(url.searchParams.get('limit')) || 50
    const statusParam = url.searchParams.get('status')
    const suggestionTypeParam = url.searchParams.get('suggestionType')
    const targetAreaParam = url.searchParams.get('targetArea')
    const validStatuses: ImprovementSuggestionStatus[] = ['NEW', 'REVIEWED', 'ACCEPTED', 'IMPLEMENTED', 'VERIFIED', 'REJECTED']
    const validSuggestionTypes: ImprovementSuggestionType[] = [
      'PROMPT_IMPROVEMENT',
      'REGEX_IMPROVEMENT',
      'FIELD_MAPPING_IMPROVEMENT',
      'ESTIMATE_DEFAULT_IMPROVEMENT',
      'HANDOFF_POLICY_IMPROVEMENT',
      'OTHER',
    ]
    const validTargetAreas: ImprovementTargetArea[] = [
      'PROMPT',
      'REGEX',
      'FIELD_MAPPING',
      'ESTIMATE',
      'HANDOFF_POLICY',
      'OTHER',
    ]
    const statusFilter = statusParam && validStatuses.includes(statusParam as ImprovementSuggestionStatus)
      ? (statusParam as ImprovementSuggestionStatus)
      : null
    const suggestionTypeFilter = suggestionTypeParam && validSuggestionTypes.includes(suggestionTypeParam as ImprovementSuggestionType)
      ? (suggestionTypeParam as ImprovementSuggestionType)
      : null
    const targetAreaFilter = targetAreaParam && validTargetAreas.includes(targetAreaParam as ImprovementTargetArea)
      ? (targetAreaParam as ImprovementTargetArea)
      : null

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { ok: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const { records } = await getApprovedReflections(1000, 0)

    // Transform approved reflections into improvement suggestions
    const improvements: ImprovementSuggestion[] = buildImprovementSuggestions(records.map((reflection) => ({
      id: reflection.id,
      conversationId: reflection.conversationId,
      issueType: reflection.issueType,
      suggestionDraft: reflection.suggestionDraft,
      originalExtractedParams: reflection.originalExtractedParams as Record<string, any> | null,
      correctedParams: reflection.correctedParams as Record<string, any> | null,
      createdAt: reflection.createdAt,
    })))

    const filteredImprovements = improvements.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false
      if (suggestionTypeFilter && item.suggestionType !== suggestionTypeFilter) return false
      if (targetAreaFilter && item.targetArea !== targetAreaFilter) return false
      return true
    })

    const total = filteredImprovements.length
    const offset = (page - 1) * limit
    const pagedImprovements = filteredImprovements.slice(offset, offset + limit)

    return NextResponse.json({
      ok: true,
      data: {
        improvements: pagedImprovements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching improvement suggestions:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
