import { createSuccessResponse, withErrorHandler } from '@/server/api/response'
import { getApprovedReflections } from '@/server/db/conversations'
import { buildGovernanceEffectivenessData } from '@/server/learning/governanceEffectiveness'

export const dynamic = 'force-dynamic'

export async function GET() {
  return withErrorHandler(async () => {
    const { records } = await getApprovedReflections(2000, 0)

    const data = buildGovernanceEffectivenessData({
      approvedReflections: records.map((item) => ({
        id: item.id,
        conversationId: item.conversationId,
        issueType: item.issueType,
        suggestionDraft: item.suggestionDraft,
        originalExtractedParams: item.originalExtractedParams as Record<string, any> | null,
        correctedParams: item.correctedParams as Record<string, any> | null,
        createdAt: item.createdAt,
      })),
    })

    return createSuccessResponse(data)
  }, 'governance-effectiveness')
}