import { NextResponse } from 'next/server'
import { getQuoteById } from '@/server/db/conversations'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'
import {
  buildQuoteSnapshotFromQuoteRecord,
  buildSingleQuoteWorkbook,
  getQuoteSnapshotDeliveryBlockMessage,
  isDeliverableQuoteSnapshot,
  renderSingleQuotePreviewHtml,
} from '@/server/export/quoteExcel'

function buildWorkbookResponse(buffer: Buffer, fileName: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request: Request, { params }: { params: { id?: string } }) {
  return withErrorHandler(async () => {
    const quoteId = Number(params.id)
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return createErrorResponse('报价ID无效', ErrorCode.VALIDATION_ERROR, 400)
    }

    const quote = await getQuoteById(quoteId)
    if (!quote) {
      return createErrorResponse('报价不存在', ErrorCode.NOT_FOUND, 404)
    }

    const snapshot = buildQuoteSnapshotFromQuoteRecord({
      conversation: {
        id: quote.conversationId,
        status: quote.conversation.status,
        customerName: quote.conversation.customerName,
        topic: quote.conversation.topic,
        createdAt: quote.conversation.createdAt,
        updatedAt: quote.conversation.updatedAt,
        messages: [],
        quotes: [quote],
      },
      quote,
    })

    if (!isDeliverableQuoteSnapshot(snapshot)) {
      return createErrorResponse(
        getQuoteSnapshotDeliveryBlockMessage(snapshot),
        ErrorCode.BAD_REQUEST,
        409
      )
    }

    const format = new URL(request.url).searchParams.get('format')
    if (format === 'xlsx') {
      return buildWorkbookResponse(
        await buildSingleQuoteWorkbook(snapshot),
        `报价单-${snapshot.exportId}.xlsx`
      )
    }

    return new NextResponse(renderSingleQuotePreviewHtml(snapshot), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
  }, 'quote-export')
}
