import { NextResponse } from 'next/server'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'
import { createReflectionRecord, getConversationWithDetails } from '@/server/db/conversations'
import {
  buildReflectionBusinessCorrectedParams,
  buildReflectionBusinessFeedbackSummary,
  normalizeReflectionBusinessFeedback,
} from '@/lib/reflection/businessFeedback'
import { buildReflectionContextSummary } from '@/lib/reflection/context'
import { buildOriginalExtractedParams } from '@/lib/reflection/packagingCorrectedParams'
import {
  isReflectionIssueType,
  REFLECTION_ISSUE_TYPES,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'
import { generateReflection } from '@/server/learning/generateReflection'

export const dynamic = 'force-dynamic'

const ISSUE_TYPES: ReflectionIssueType[] = [...REFLECTION_ISSUE_TYPES]

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function buildQuoteSummary(quote: any): string {
  if (!quote) return ''
  const total = typeof quote.totalCents === 'number' ? (quote.totalCents / 100).toFixed(2) : '0.00'
  const parameters = isObject(quote.parameters) ? quote.parameters : undefined
  const pricingDetails = isObject(quote.pricingDetails) ? quote.pricingDetails : undefined
  const packagingReview = isObject(pricingDetails?.packagingReview) ? pricingDetails.packagingReview : undefined
  const baseSummary = `报价#${quote.id} 总价¥${total}`

  if (!packagingReview) {
    return baseSummary
  }

  const packagingSummary = buildReflectionContextSummary(
    parameters ? { packagingContext: parameters } : undefined,
    pricingDetails ? { packagingContext: pricingDetails } : undefined
  )

  const status = typeof packagingReview.statusLabel === 'string'
    ? packagingReview.statusLabel
    : typeof packagingReview.status === 'string'
      ? packagingReview.status
      : '复杂包装'

  return [baseSummary, `${status}`, packagingSummary].filter(Boolean).join('；')
}

function sanitizeQuoteParameters(parameters: unknown): Record<string, any> | undefined {
  if (!isObject(parameters)) return undefined
  const sanitized = { ...parameters }
  delete sanitized.mainItem
  delete sanitized.subItems
  delete sanitized.referenceFiles
  return Object.keys(sanitized).length > 0 ? sanitized : undefined
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

    const issueType = isReflectionIssueType(payload.issueType) && ISSUE_TYPES.includes(payload.issueType)
      ? payload.issueType
      : 'PARAM_WRONG'
    const latestAssistantMessage = [...conversation.messages].reverse().find((m) => m.sender === 'ASSISTANT')
    const latestQuote = conversation.quotes?.[0]

    const metadata = isObject(latestAssistantMessage?.metadata)
      ? (latestAssistantMessage.metadata as Record<string, any>)
      : undefined
    const originalExtractedParams = buildOriginalExtractedParams(payload.originalExtractedParams, metadata, latestQuote)

    const businessFeedback = normalizeReflectionBusinessFeedback(payload.businessFeedback)
    const correctedParams = buildReflectionBusinessCorrectedParams({
      correctedParams: isObject(payload.correctedParams) ? payload.correctedParams : undefined,
      businessFeedback,
    })
    const originalQuoteSummary = typeof payload.originalQuoteSummary === 'string'
      ? payload.originalQuoteSummary
      : buildQuoteSummary(latestQuote)
    const correctedQuoteSummary = typeof payload.correctedQuoteSummary === 'string'
      ? payload.correctedQuoteSummary
      : businessFeedback?.correctResult
        || buildReflectionBusinessFeedbackSummary(businessFeedback)
        || undefined
    const quoteId = typeof payload.quoteId === 'number' ? payload.quoteId : latestQuote?.id

    const generated = await generateReflection({
      conversationId,
      issueType,
      originalExtractedParams,
      correctedParams,
      originalQuoteSummary,
      correctedQuoteSummary,
      businessFeedback,
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
