import { NextResponse } from 'next/server'
import { updateConversationStatus, createHandoffRecord } from '@/server/db/conversations'

export async function POST(request: Request, { params }: { params: { id: string }}) {
  const conversationId = Number(params.id)
  if (Number.isNaN(conversationId)) {
    return NextResponse.json({ ok: false, message: 'Invalid conversation ID' }, { status: 400 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const reason = typeof payload.reason === 'string' ? payload.reason : '人工接管请求'
  const assignedTo = typeof payload.assignedTo === 'string' ? payload.assignedTo : undefined

  try {
    const conversation = await updateConversationStatus(conversationId, 'PENDING_HUMAN')
    const handoff = await createHandoffRecord(conversationId, reason, assignedTo)

    return NextResponse.json({ ok: true, data: { conversation, handoff } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
