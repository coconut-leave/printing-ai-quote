import {
  type ClarificationReason,
  type ClarificationResolvedTo,
  buildClarificationTriggerMetadata,
  isClarificationTriggeredMetadata,
  mapResponseStatusToClarificationResolvedTo,
  normalizeClarificationReason,
} from '@/lib/chat/clarification'
import { inferResponseStatus, type TrackingConversation } from '@/server/analytics/consultationTracking'

type ClarificationMessage = {
  id: number
  sender: string
  metadata?: any
  createdAt?: string | Date
}

export type ClarificationReasonBreakdownRow = {
  reason: ClarificationReason
  triggerCount: number
  recoveredCount: number
  handoffCount: number
  noFollowupCount: number
  recoveryRate: number
}

export type ClarificationResolvedBreakdownRow = {
  resolvedTo: ClarificationResolvedTo
  count: number
}

export type ClarificationOverview = {
  clarificationTriggerCount: number
  clarificationConversationCount: number
  recoveredConversationCount: number
  handoffConversationCount: number
  noFollowupConversationCount: number
  recoveryRate: number
  handoffRate: number
}

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function isWithinRange(value: Date | string | undefined, startAt: Date, endAt: Date): boolean {
  const date = toDate(value)
  if (!date) return false
  const time = date.getTime()
  return time >= startAt.getTime() && time <= endAt.getTime()
}

function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 10000) / 100
}

function getClarificationReason(metadata: Record<string, any> | null | undefined): ClarificationReason {
  const normalized = buildClarificationTriggerMetadata({
    clarificationReason: typeof metadata?.clarificationReason === 'string'
      ? metadata.clarificationReason
      : typeof metadata?.clarificationReasonDetail === 'string'
      ? metadata.clarificationReasonDetail
      : undefined,
    blockedContextReuse: Boolean(metadata?.blockedContextReuse),
    fallbackMode: typeof metadata?.clarificationFallbackMode === 'string'
      ? metadata.clarificationFallbackMode
      : typeof metadata?.fallbackMode === 'string'
      ? metadata.fallbackMode
      : undefined,
  })

  return normalizeClarificationReason({
    clarificationReason: normalized.clarificationReason,
    blockedContextReuse: normalized.blockedContextReuse,
    fallbackMode: normalized.clarificationFallbackMode,
  })
}

function getClarificationResolution(messages: ClarificationMessage[], clarificationIndex: number): ClarificationResolvedTo {
  for (let index = clarificationIndex + 1; index < messages.length; index += 1) {
    const message = messages[index]

    if (message.sender !== 'ASSISTANT') {
      continue
    }

    const status = inferResponseStatus(message.metadata as Record<string, any> | undefined)
    const resolvedTo = mapResponseStatusToClarificationResolvedTo(status)
    if (resolvedTo) {
      return resolvedTo
    }
  }

  const hasLaterMessage = clarificationIndex < messages.length - 1
  return hasLaterMessage ? 'other' : 'no_followup'
}

export function buildClarificationTrackingStats(params: {
  conversations: TrackingConversation[]
  startAt: Date
  endAt: Date
}): {
  clarificationOverview: ClarificationOverview
  clarificationReasonBreakdown: ClarificationReasonBreakdownRow[]
  clarificationResolvedBreakdown: ClarificationResolvedBreakdownRow[]
} {
  const reasonBreakdownMap = new Map<ClarificationReason, ClarificationReasonBreakdownRow>()
  const resolvedBreakdownMap = new Map<ClarificationResolvedTo, number>()
  const clarificationConversationIds = new Set<number>()
  const recoveredConversationIds = new Set<number>()
  const handoffConversationIds = new Set<number>()
  const noFollowupConversationIds = new Set<number>()
  let clarificationTriggerCount = 0

  for (const conversation of params.conversations) {
    const messages = (conversation.messages || []) as ClarificationMessage[]

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index]
      const metadata = message.metadata && typeof message.metadata === 'object'
        ? message.metadata as Record<string, any>
        : undefined

      if (!isClarificationTriggeredMetadata(metadata)) {
        continue
      }

      const createdAt = toDate(message.createdAt) || toDate(conversation.updatedAt)
      if (!createdAt || !isWithinRange(createdAt, params.startAt, params.endAt)) {
        continue
      }

      clarificationTriggerCount += 1
      clarificationConversationIds.add(conversation.id)

      const reason = getClarificationReason(metadata)
      const resolvedTo = getClarificationResolution(messages, index)

      if (resolvedTo === 'recommendation' || resolvedTo === 'missing_fields' || resolvedTo === 'estimated' || resolvedTo === 'quoted') {
        recoveredConversationIds.add(conversation.id)
      }
      if (resolvedTo === 'handoff_required') {
        handoffConversationIds.add(conversation.id)
      }
      if (resolvedTo === 'no_followup') {
        noFollowupConversationIds.add(conversation.id)
      }

      const currentReason = reasonBreakdownMap.get(reason) || {
        reason,
        triggerCount: 0,
        recoveredCount: 0,
        handoffCount: 0,
        noFollowupCount: 0,
        recoveryRate: 0,
      }

      currentReason.triggerCount += 1
      if (resolvedTo === 'recommendation' || resolvedTo === 'missing_fields' || resolvedTo === 'estimated' || resolvedTo === 'quoted') {
        currentReason.recoveredCount += 1
      }
      if (resolvedTo === 'handoff_required') {
        currentReason.handoffCount += 1
      }
      if (resolvedTo === 'no_followup') {
        currentReason.noFollowupCount += 1
      }
      currentReason.recoveryRate = roundPercent(currentReason.recoveredCount, currentReason.triggerCount)
      reasonBreakdownMap.set(reason, currentReason)

      resolvedBreakdownMap.set(resolvedTo, (resolvedBreakdownMap.get(resolvedTo) || 0) + 1)
    }
  }

  const clarificationReasonBreakdown = Array.from(reasonBreakdownMap.values())
    .sort((a, b) => b.triggerCount - a.triggerCount)
  const clarificationResolvedBreakdown = Array.from(resolvedBreakdownMap.entries())
    .map(([resolvedTo, count]) => ({ resolvedTo, count }))
    .sort((a, b) => b.count - a.count)

  return {
    clarificationOverview: {
      clarificationTriggerCount,
      clarificationConversationCount: clarificationConversationIds.size,
      recoveredConversationCount: recoveredConversationIds.size,
      handoffConversationCount: handoffConversationIds.size,
      noFollowupConversationCount: noFollowupConversationIds.size,
      recoveryRate: roundPercent(recoveredConversationIds.size, clarificationConversationIds.size),
      handoffRate: roundPercent(handoffConversationIds.size, clarificationConversationIds.size),
    },
    clarificationReasonBreakdown,
    clarificationResolvedBreakdown,
  }
}