import { isReflectionIssueType, type ReflectionIssueType } from '@/lib/reflection/issueTypes'
import { normalizePackagingReviewSummaryView } from '@/lib/packaging/reviewSummary'

type JsonRecord = Record<string, any>

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function normalizeDateString(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return new Date(0).toISOString()
}

function normalizeMessageMetadata(value: unknown): JsonRecord | undefined {
  const record = asRecord(value)
  if (!record) {
    return undefined
  }

  const nextRecord: JsonRecord = { ...record }

  if ('packagingReview' in nextRecord) {
    nextRecord.packagingReview = normalizePackagingReviewSummaryView(nextRecord.packagingReview)
  }

  return nextRecord
}

export type ConversationDetailPayload = {
  id: number
  status: string
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: number
    sender: string
    content: string
    metadata?: any
    createdAt: string
  }>
  quotes: Array<{
    id: number
    parameters: any
    pricingDetails?: any
    subtotalCents: number
    shippingCents: number
    taxCents: number
    totalCents: number
    status: string
    createdAt: string
  }>
  handoffs: Array<{
    id: number
    reason: string
    assignedTo: string | null
    resolved: boolean
    createdAt: string
  }>
  reflections: Array<{
    id: number
    issueType: ReflectionIssueType
    originalExtractedParams?: Record<string, any> | null
    correctedParams?: Record<string, any> | null
    reflectionText: string
    suggestionDraft: string
    status: 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
    createdAt: string
  }>
  trialReviewCase: {
    id: number
    status: string
    sourceKind: string
    queueReason: string
    queueReasonCode: string | null
    deliveryScopeLabel: string | null
    deliveryScopeNote: string | null
    currentQuoteStatusLabel: string | null
    requiresHumanReview: boolean
    operatorName: string | null
    lastActionNote: string | null
    manualConfirmationResult: string | null
    rejectionReason: string | null
    rejectionCategory: string | null
    rejectionTargetArea: string | null
    calibrationSignal: string | null
    driftSourceCandidate: string | null
    driftDirection: string | null
    contextSnapshot: Record<string, any> | null
    manualConfirmedAt: string | null
    closedAt: string | null
    createdAt: string
    updatedAt: string
    auditLogs: Array<{
      id: number
      fromStatus: string | null
      toStatus: string
      actionType: string
      operatorName: string | null
      note: string | null
      createdAt: string
    }>
  } | null
}

export function normalizeConversationDetailPayload(input: unknown): ConversationDetailPayload | null {
  const record = asRecord(input)
  if (!record) {
    return null
  }

  return {
    id: Number(record.id || 0),
    status: typeof record.status === 'string' ? record.status : 'OPEN',
    createdAt: normalizeDateString(record.createdAt),
    updatedAt: normalizeDateString(record.updatedAt),
    messages: Array.isArray(record.messages)
      ? record.messages.map((message) => {
          const messageRecord = asRecord(message) || {}
          return {
            id: Number(messageRecord.id || 0),
            sender: typeof messageRecord.sender === 'string' ? messageRecord.sender : 'ASSISTANT',
            content: typeof messageRecord.content === 'string' ? messageRecord.content : '',
            metadata: normalizeMessageMetadata(messageRecord.metadata),
            createdAt: normalizeDateString(messageRecord.createdAt),
          }
        })
      : [],
    quotes: Array.isArray(record.quotes)
      ? record.quotes.map((quote) => {
          const quoteRecord = asRecord(quote) || {}
          return {
            id: Number(quoteRecord.id || 0),
            parameters: asRecord(quoteRecord.parameters) || {},
            pricingDetails: asRecord(quoteRecord.pricingDetails) || {},
            subtotalCents: Number(quoteRecord.subtotalCents || 0),
            shippingCents: Number(quoteRecord.shippingCents || 0),
            taxCents: Number(quoteRecord.taxCents || 0),
            totalCents: Number(quoteRecord.totalCents || 0),
            status: typeof quoteRecord.status === 'string' ? quoteRecord.status : 'PENDING',
            createdAt: normalizeDateString(quoteRecord.createdAt),
          }
        })
      : [],
    handoffs: Array.isArray(record.handoffs)
      ? record.handoffs.map((handoff) => {
          const handoffRecord = asRecord(handoff) || {}
          return {
            id: Number(handoffRecord.id || 0),
            reason: typeof handoffRecord.reason === 'string' ? handoffRecord.reason : '暂无人工接管说明',
            assignedTo: typeof handoffRecord.assignedTo === 'string' ? handoffRecord.assignedTo : null,
            resolved: Boolean(handoffRecord.resolved),
            createdAt: normalizeDateString(handoffRecord.createdAt),
          }
        })
      : [],
    reflections: Array.isArray(record.reflections)
      ? record.reflections.map((reflection) => {
          const reflectionRecord = asRecord(reflection) || {}
          const rawIssueType = typeof reflectionRecord.issueType === 'string' ? reflectionRecord.issueType : 'PARAM_WRONG'
          return {
            id: Number(reflectionRecord.id || 0),
            issueType: isReflectionIssueType(rawIssueType) ? rawIssueType : 'PARAM_WRONG',
            originalExtractedParams: asRecord(reflectionRecord.originalExtractedParams) || null,
            correctedParams: asRecord(reflectionRecord.correctedParams) || null,
            reflectionText: typeof reflectionRecord.reflectionText === 'string' ? reflectionRecord.reflectionText : '',
            suggestionDraft: typeof reflectionRecord.suggestionDraft === 'string' ? reflectionRecord.suggestionDraft : '',
            status: ['NEW', 'REVIEWED', 'APPROVED', 'REJECTED'].includes(String(reflectionRecord.status))
              ? reflectionRecord.status as 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
              : 'NEW',
            createdAt: normalizeDateString(reflectionRecord.createdAt),
          }
        })
      : [],
    trialReviewCase: (() => {
      const trialReviewRecord = asRecord(record.trialReviewCase)
      if (!trialReviewRecord) {
        return null
      }

      return {
        id: Number(trialReviewRecord.id || 0),
        status: typeof trialReviewRecord.status === 'string' ? trialReviewRecord.status : 'PENDING_REVIEW',
        sourceKind: typeof trialReviewRecord.sourceKind === 'string' ? trialReviewRecord.sourceKind : 'REFERENCE_QUOTE',
        queueReason: typeof trialReviewRecord.queueReason === 'string' ? trialReviewRecord.queueReason : '',
        queueReasonCode: typeof trialReviewRecord.queueReasonCode === 'string' ? trialReviewRecord.queueReasonCode : null,
        deliveryScopeLabel: typeof trialReviewRecord.deliveryScopeLabel === 'string' ? trialReviewRecord.deliveryScopeLabel : null,
        deliveryScopeNote: typeof trialReviewRecord.deliveryScopeNote === 'string' ? trialReviewRecord.deliveryScopeNote : null,
        currentQuoteStatusLabel: typeof trialReviewRecord.currentQuoteStatusLabel === 'string' ? trialReviewRecord.currentQuoteStatusLabel : null,
        requiresHumanReview: Boolean(trialReviewRecord.requiresHumanReview),
        operatorName: typeof trialReviewRecord.operatorName === 'string' ? trialReviewRecord.operatorName : null,
        lastActionNote: typeof trialReviewRecord.lastActionNote === 'string' ? trialReviewRecord.lastActionNote : null,
        manualConfirmationResult: typeof trialReviewRecord.manualConfirmationResult === 'string' ? trialReviewRecord.manualConfirmationResult : null,
        rejectionReason: typeof trialReviewRecord.rejectionReason === 'string' ? trialReviewRecord.rejectionReason : null,
        rejectionCategory: typeof trialReviewRecord.rejectionCategory === 'string' ? trialReviewRecord.rejectionCategory : null,
        rejectionTargetArea: typeof trialReviewRecord.rejectionTargetArea === 'string' ? trialReviewRecord.rejectionTargetArea : null,
        calibrationSignal: typeof trialReviewRecord.calibrationSignal === 'string' ? trialReviewRecord.calibrationSignal : null,
        driftSourceCandidate: typeof trialReviewRecord.driftSourceCandidate === 'string' ? trialReviewRecord.driftSourceCandidate : null,
        driftDirection: typeof trialReviewRecord.driftDirection === 'string' ? trialReviewRecord.driftDirection : null,
        contextSnapshot: asRecord(trialReviewRecord.contextSnapshot) || null,
        manualConfirmedAt: trialReviewRecord.manualConfirmedAt ? normalizeDateString(trialReviewRecord.manualConfirmedAt) : null,
        closedAt: trialReviewRecord.closedAt ? normalizeDateString(trialReviewRecord.closedAt) : null,
        createdAt: normalizeDateString(trialReviewRecord.createdAt),
        updatedAt: normalizeDateString(trialReviewRecord.updatedAt),
        auditLogs: Array.isArray(trialReviewRecord.auditLogs)
          ? trialReviewRecord.auditLogs.map((audit) => {
              const auditRecord = asRecord(audit) || {}
              return {
                id: Number(auditRecord.id || 0),
                fromStatus: typeof auditRecord.fromStatus === 'string' ? auditRecord.fromStatus : null,
                toStatus: typeof auditRecord.toStatus === 'string' ? auditRecord.toStatus : 'PENDING_REVIEW',
                actionType: typeof auditRecord.actionType === 'string' ? auditRecord.actionType : 'QUEUED',
                operatorName: typeof auditRecord.operatorName === 'string' ? auditRecord.operatorName : null,
                note: typeof auditRecord.note === 'string' ? auditRecord.note : null,
                createdAt: normalizeDateString(auditRecord.createdAt),
              }
            })
          : [],
      }
    })(),
  }
}