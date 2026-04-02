import { NextResponse } from 'next/server'
import { listConversations } from '@/server/db/conversations'
import { withErrorHandler } from '@/server/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  return withErrorHandler(async () => {
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
  }, 'conversations-list')
}
