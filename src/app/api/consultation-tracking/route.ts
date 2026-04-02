import { createSuccessResponse, withErrorHandler } from '@/server/api/response'
import { getConsultationTrackingDataset } from '@/server/db/conversations'
import { buildConsultationTrackingStats } from '@/server/analytics/consultationTracking'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit') || 200)
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 200

    const conversations = await getConsultationTrackingDataset(limit)
    const stats = buildConsultationTrackingStats(conversations)

    return createSuccessResponse({
      ...stats,
      sampledConversationCount: conversations.length,
    })
  }, 'consultation-tracking-stats')
}