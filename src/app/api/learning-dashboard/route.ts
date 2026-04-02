import { createSuccessResponse, withErrorHandler } from '@/server/api/response'
import { getAllReflections, getApprovedReflections } from '@/server/db/conversations'
import { buildLearningDashboardStats } from '@/server/learning/learningDashboard'

export const dynamic = 'force-dynamic'

export async function GET() {
  return withErrorHandler(async () => {
    const [{ records: reflections }, { records: approvedReflections }] = await Promise.all([
      getAllReflections(2000, 0),
      getApprovedReflections(2000, 0),
    ])

    const stats = buildLearningDashboardStats({
      reflections: reflections.map((item) => ({
        id: item.id,
        conversationId: item.conversationId,
        issueType: item.issueType,
        suggestionDraft: item.suggestionDraft,
        originalExtractedParams: item.originalExtractedParams as Record<string, any> | null,
        correctedParams: item.correctedParams as Record<string, any> | null,
        createdAt: item.createdAt,
      })),
      approvedReflections: approvedReflections.map((item) => ({
        id: item.id,
        conversationId: item.conversationId,
        issueType: item.issueType,
        suggestionDraft: item.suggestionDraft,
        originalExtractedParams: item.originalExtractedParams as Record<string, any> | null,
        correctedParams: item.correctedParams as Record<string, any> | null,
        createdAt: item.createdAt,
      })),
    })

    return createSuccessResponse(stats)
  }, 'learning-dashboard-stats')
}