import { NextResponse } from 'next/server'
import { listConversations } from '@/server/db/conversations'

export async function GET() {
  try {
    const conversations = await listConversations()

    const normalized = conversations.map((c) => ({
      id: c.id,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      latestMessage: c.messages?.[0]?.content ?? null,
      quoteExists: (c.quotes?.length ?? 0) > 0,
    }))

    return NextResponse.json({ ok: true, data: normalized })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
