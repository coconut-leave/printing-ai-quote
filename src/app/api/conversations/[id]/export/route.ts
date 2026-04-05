import { NextResponse } from 'next/server'
import { getConversationWithDetails } from '@/server/db/conversations'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'
import { buildSingleQuoteWorkbook, getLatestExportableQuoteSnapshot } from '@/server/export/quoteExcel'

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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const conversationId = Number(params.id)
    if (Number.isNaN(conversationId)) {
      return createErrorResponse('会话ID无效', ErrorCode.VALIDATION_ERROR, 400)
    }

    const conversation = await getConversationWithDetails(conversationId)
    if (!conversation) {
      return createErrorResponse('会话不存在', ErrorCode.NOT_FOUND, 404)
    }

    const snapshot = getLatestExportableQuoteSnapshot(conversation)
    if (!snapshot) {
      return createErrorResponse('当前会话暂无可导出的报价结果', ErrorCode.NOT_FOUND, 404)
    }

    return buildWorkbookResponse(
      await buildSingleQuoteWorkbook(snapshot),
      `报价单-${snapshot.exportId}.xlsx`
    )
  }, 'conversation-export-xlsx')
}