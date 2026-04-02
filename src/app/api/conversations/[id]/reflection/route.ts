import { NextResponse } from 'next/server'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'
import { createReflectionRecord, getConversationWithDetails } from '@/server/db/conversations'
import { generateReflection, ReflectionIssueType } from '@/server/learning/generateReflection'

const ISSUE_TYPES: ReflectionIssueType[] = ['PARAM_MISSING', 'PARAM_WRONG', 'QUOTE_INACCURATE', 'SHOULD_HANDOFF']

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function buildQuoteSummary(quote: any): string {
  if (!quote) return ''
  const total = typeof quote.totalCents === 'number' ? (quote.totalCents / 100).toFixed(2) : '0.00'
  return `报价#${quote.id} 总价¥${total}`
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const conversationId = Number(params.id)
    if (Number.isNaN(conversationId)) {
      return createErrorResponse('会话ID无效', ErrorCode.VALIDATION_ERROR, 400)
    }

    let payload: any
    try {
      payload = await request.json()
    } catch {
      payload = {}
    }

    const conversation = await getConversationWithDetails(conversationId)
    if (!conversation) {
      return createErrorResponse('会话不存在', ErrorCode.NOT_FOUND, 404)
    }

    const issueType = ISSUE_TYPES.includes(payload.issueType) ? payload.issueType : 'PARAM_WRONG'
    const latestAssistantMessage = [...conversation.messages].reverse().find((m) => m.sender === 'ASSISTANT')
    const latestQuote = conversation.quotes?.[0]

    const metadata = isObject(latestAssistantMessage?.metadata)
      ? (latestAssistantMessage.metadata as Record<string, any>)
      : undefined
    const originalExtractedParams = isObject(payload.originalExtractedParams)
      ? payload.originalExtractedParams
      : (isObject(metadata?.extractedParams) ? metadata?.extractedParams : undefined)

    const correctedParams = isObject(payload.correctedParams) ? payload.correctedParams : undefined
    const originalQuoteSummary = typeof payload.originalQuoteSummary === 'string'
      ? payload.originalQuoteSummary
      : buildQuoteSummary(latestQuote)
    const correctedQuoteSummary = typeof payload.correctedQuoteSummary === 'string'
      ? payload.correctedQuoteSummary
      : undefined
    const quoteId = typeof payload.quoteId === 'number' ? payload.quoteId : latestQuote?.id

    const generated = await generateReflection({
      conversationId,
      issueType,
      originalExtractedParams,
      correctedParams,
      originalQuoteSummary,
      correctedQuoteSummary,
    })

    const reflection = await createReflectionRecord({
      conversationId,
      quoteId,
      originalExtractedParams,
      correctedParams,
      originalQuoteSummary,
      correctedQuoteSummary,
      issueType,
      reflectionText: generated.reflectionText,
      suggestionDraft: generated.suggestionDraft,
    })

    return NextResponse.json({ ok: true, data: reflection })
  }, 'conversation-reflection-generate')
}
