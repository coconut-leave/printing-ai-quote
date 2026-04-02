import { NextResponse } from 'next/server'
import { getConversationWithDetails } from '@/server/db/conversations'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const conversationId = Number(params.id)
  if (Number.isNaN(conversationId)) {
    return NextResponse.json({ ok: false, message: 'Invalid conversation ID' }, { status: 400 })
  }

  try {
    const conversation = await getConversationWithDetails(conversationId)
    if (!conversation) {
      return NextResponse.json({ ok: false, message: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: conversation })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}