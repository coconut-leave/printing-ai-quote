import { NextResponse } from 'next/server'
import { updateConversationStatus, createHandoffRecord, getConversationById } from '@/server/db/conversations'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'
import { parseHandoffRequestPayload } from '@/server/conversations/handoffRequest'

export async function POST(request: Request, { params }: { params: { id: string }}) {
  return withErrorHandler(async () => {
    const conversationId = Number(params.id)
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return createErrorResponse('会话ID无效', ErrorCode.VALIDATION_ERROR, 400)
    }

    let payload: any
    try {
      payload = await request.json()
    } catch {
      payload = {}
    }

    const parsedPayload = parseHandoffRequestPayload(payload)
    if (!parsedPayload.success) {
      return createErrorResponse(parsedPayload.error, ErrorCode.VALIDATION_ERROR, 400)
    }

    const conversation = await getConversationById(conversationId)
    if (!conversation) {
      return createErrorResponse('会话不存在', ErrorCode.NOT_FOUND, 404)
    }

    const updatedConversation = await updateConversationStatus(conversationId, 'PENDING_HUMAN')
    const handoff = await createHandoffRecord(
      conversationId,
      parsedPayload.data.reason,
      parsedPayload.data.assignedTo
    )

    return NextResponse.json({ ok: true, data: { conversation: updatedConversation, handoff } })
  }, 'conversation-handoff')
}
