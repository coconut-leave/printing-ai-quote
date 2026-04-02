import { createSuccessResponse, withErrorHandler } from '@/server/api/response'
import { getAllReflections, getApprovedReflections, getConsultationTrackingDataset } from '@/server/db/conversations'
import { buildMinimalDashboardStats } from '@/server/analytics/dashboard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    const [conversations, { records: reflections }, { records: approvedReflections }] = await Promise.all([
      getConsultationTrackingDataset(2000),
      getAllReflections(2000, 0),
      getApprovedReflections(2000, 0),
    ])

    const stats = buildMinimalDashboardStats({
      conversations,
      period: period === 'today' || period === '7d' || period === '30d' ? period : '30d',
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
  }, 'dashboard-stats')
}