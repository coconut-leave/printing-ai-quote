export type TraceContext = {
  conversationId?: number
  requestId?: string
}

type TraceRecord = TraceContext & {
  stage: string
  [key: string]: unknown
}

const MAX_MESSAGE_LENGTH = 120
const MAX_QUERY_LENGTH = 120
const MAX_REASON_LENGTH = 160
const MAX_TITLE_LENGTH = 48

function shouldEmitTraceLogs(): boolean {
  return process.env.NODE_ENV !== 'test' || process.env.ENABLE_TRACE_TEST_LOGS === 'true'
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return value
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3)}...`
}

function sanitizeString(value: string): string {
  if (value.startsWith('sk-')) {
    return '[REDACTED_OPENAI_KEY]'
  }

  if (value.includes('postgres://') || value.includes('postgresql://')) {
    return '[REDACTED_DATABASE_URL]'
  }

  return value
}

function safeStringify(record: TraceRecord): string {
  return JSON.stringify(record, (_key, value) => {
    if (typeof value === 'string') {
      return sanitizeString(value)
    }

    return value
  })
}

function emitTrace(record: TraceRecord): void {
  if (!shouldEmitTraceLogs()) {
    return
  }

  console.info(`[trace] ${safeStringify(record)}`)
}

type RouterHitLogInput = TraceContext & {
  message: string
  intent: string
  confidence: number
  shouldUseRAG: boolean
  shouldExtractParams: boolean
  shouldRunQuoteEngine: boolean
  shouldHandoff: boolean
  shouldGenerateAlternativePlan: boolean
  reason: string
  decisionSource: 'model' | 'rule' | 'fallback_rule'
  fallbackReason?: string
}

export function logRouterHit(input: RouterHitLogInput): void {
  emitTrace({
    stage: 'router_hit',
    conversationId: input.conversationId,
    requestId: input.requestId,
    message: truncate(input.message, MAX_MESSAGE_LENGTH),
    intent: input.intent,
    confidence: input.confidence,
    shouldUseRAG: input.shouldUseRAG,
    shouldExtractParams: input.shouldExtractParams,
    shouldRunQuoteEngine: input.shouldRunQuoteEngine,
    shouldHandoff: input.shouldHandoff,
    shouldGenerateAlternativePlan: input.shouldGenerateAlternativePlan,
    reason: truncate(input.reason, MAX_REASON_LENGTH),
    decisionSource: input.decisionSource,
    fallbackReason: truncate(input.fallbackReason, MAX_REASON_LENGTH),
  })
}

type RouterDispatchLogInput = TraceContext & {
  message: string
  routerIntent: string
  finalIntent?: string
  branch: string
  responseStatus?: string
  usedRag?: boolean
  executedHandoff?: boolean
  executedQuoteEngine?: boolean
  note?: string
}

export function logRouterDispatch(input: RouterDispatchLogInput): void {
  emitTrace({
    stage: 'router_execute',
    conversationId: input.conversationId,
    requestId: input.requestId,
    message: truncate(input.message, MAX_MESSAGE_LENGTH),
    routerIntent: input.routerIntent,
    finalIntent: input.finalIntent,
    branch: input.branch,
    responseStatus: input.responseStatus,
    usedRag: input.usedRag,
    executedHandoff: input.executedHandoff,
    executedQuoteEngine: input.executedQuoteEngine,
    note: truncate(input.note, MAX_REASON_LENGTH),
  })
}

type RagHitLogInput = TraceContext & {
  question: string
  rewrittenQuery: string
  topK?: number
  hits: Array<{
    id: string
    title: string
    score?: number
  }>
  fallbackUsed: boolean
  fallbackReason?: string
  insufficientKnowledge: boolean
  answerType: string
  rewriteStrategy: string
}

export function logRagHit(input: RagHitLogInput): void {
  emitTrace({
    stage: 'rag_hit',
    conversationId: input.conversationId,
    requestId: input.requestId,
    question: truncate(input.question, MAX_MESSAGE_LENGTH),
    rewrittenQuery: truncate(input.rewrittenQuery, MAX_QUERY_LENGTH),
    topK: input.topK,
    hitIds: input.hits.map((hit) => hit.id),
    hitTitles: input.hits.map((hit) => truncate(hit.title, MAX_TITLE_LENGTH)),
    hitScores: input.hits.map((hit) => hit.score ?? null),
    fallbackUsed: input.fallbackUsed,
    fallbackReason: truncate(input.fallbackReason, MAX_REASON_LENGTH),
    insufficientKnowledge: input.insufficientKnowledge,
    answerType: input.answerType,
    rewriteStrategy: input.rewriteStrategy,
  })
}

export function getRequestTraceId(request: Request): string {
  return request.headers.get('x-request-id')
    || request.headers.get('x-vercel-id')
    || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}