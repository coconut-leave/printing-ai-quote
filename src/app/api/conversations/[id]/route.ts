import { NextResponse } from 'next/server'
import { getConversationWithDetails } from '@/server/db/conversations'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const conversationId = Number(params.id)
    if (Number.isNaN(conversationId)) {
      return createErrorResponse('会话ID无效', ErrorCode.VALIDATION_ERROR, 400)
    }

    const conversation = await getConversationWithDetails(conversationId)
    if (!conversation) {
      return createErrorResponse('会话不存在', ErrorCode.NOT_FOUND, 404)
    }

    return NextResponse.json({ ok: true, data: conversation })
  }, 'conversation-detail')
}