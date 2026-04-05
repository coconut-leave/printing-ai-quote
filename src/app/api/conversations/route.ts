import { NextResponse } from 'next/server'
import { listConversations } from '@/server/db/conversations'
import { withErrorHandler } from '@/server/api/response'
import { buildConversationPresentation, getConversationStatusLabel } from '@/lib/admin/presentation'
import { buildConversationUpdatedAtWhere, resolveConversationTimeFilter } from '@/lib/admin/conversationTimeFilters'
import { getLatestExportableQuoteSnapshot } from '@/server/export/quoteExcel'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const timeFilter = resolveConversationTimeFilter({
      timePreset: url.searchParams.get('timePreset'),
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
    })

    const conversations = await listConversations({
      status: status && status !== 'ALL'
        ? status as 'OPEN' | 'MISSING_FIELDS' | 'QUOTED' | 'PENDING_HUMAN' | 'CLOSED'
        : undefined,
      updatedAt: buildConversationUpdatedAtWhere(timeFilter),
    })

    const normalized = conversations.map((c) => {
      const presentation = buildConversationPresentation({
        conversationId: c.id,
        status: c.status,
        latestMessage: c.messages?.[0]?.content ?? null,
        recentMessages: c.messages?.map((message) => ({
          sender: message.sender,
          content: message.content,
          metadata: message.metadata,
        })),
        latestQuoteParameters: c.quotes?.[0]?.parameters as Record<string, any> | null | undefined,
      })
      const exportableSnapshot = getLatestExportableQuoteSnapshot({
        id: c.id,
        status: c.status,
        customerName: c.customerName,
        topic: c.topic,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages,
        quotes: c.quotes,
      })

      return {
        id: c.id,
        status: c.status,
        statusLabel: getConversationStatusLabel(c.status),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        latestMessage: c.messages?.[0]?.content ?? null,
        quoteExists: (c.quotes?.length ?? 0) > 0,
        title: presentation.title,
        topicSummary: presentation.topicSummary,
        scopeLabel: presentation.scopeLabel,
        isActiveScope: presentation.isActiveScope,
        hasExportableResult: Boolean(exportableSnapshot),
        exportableResultStatus: exportableSnapshot?.quoteStatusLabel || null,
      }
    })

    return NextResponse.json({
      ok: true,
      data: normalized,
      filters: {
        status: status || 'ALL',
        timePreset: timeFilter.timePreset,
        startDate: timeFilter.startDate || null,
        endDate: timeFilter.endDate || null,
      },
    })
  }, 'conversations-list')
}
