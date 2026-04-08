import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/server/api/response'
import { listConversationsForExport } from '@/server/db/conversations'
import {
  buildLedgerWorkbook,
  type ExportableQuoteSnapshot,
  getLatestExportableQuoteSnapshot,
  isDeliverableQuoteSnapshot,
} from '@/server/export/quoteExcel'
import {
  buildConversationUpdatedAtWhere,
  getConversationTimeFilterLabel,
  resolveConversationTimeFilter,
} from '@/lib/admin/conversationTimeFilters'

function buildWorkbookResponse(buffer: Buffer, fileName: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    },
  })
}

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

    const conversations = await listConversationsForExport({
      status: status && status !== 'ALL'
        ? status as 'OPEN' | 'MISSING_FIELDS' | 'QUOTED' | 'PENDING_HUMAN' | 'CLOSED'
        : undefined,
      updatedAt: buildConversationUpdatedAtWhere(timeFilter),
    })

    const snapshots = conversations
      .map((conversation) => getLatestExportableQuoteSnapshot(conversation))
      .filter((snapshot): snapshot is ExportableQuoteSnapshot => snapshot !== null)
      .filter((snapshot) => isDeliverableQuoteSnapshot(snapshot))

    if (snapshots.length === 0) {
      return NextResponse.json({
        ok: false,
        message: '当前筛选条件下暂无可导出的报价台账记录。',
      }, { status: 404 })
    }

    const fileName = `报价台账-${getConversationTimeFilterLabel(timeFilter)}-${new Date().toISOString().slice(0, 10)}.xlsx`
    return buildWorkbookResponse(buildLedgerWorkbook(snapshots), fileName)
  }, 'conversation-ledger-export')
}