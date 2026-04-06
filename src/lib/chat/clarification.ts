export type ClarificationReason = 'noisy_input' | 'unstable_intent' | 'blocked_context_reuse' | 'other'

export type ClarificationResolvedTo =
  | 'recommendation'
  | 'missing_fields'
  | 'estimated'
  | 'quoted'
  | 'handoff_required'
  | 'no_followup'
  | 'other'

type NormalizeClarificationReasonInput = {
  clarificationReason?: string | null
  blockedContextReuse?: boolean
  fallbackMode?: string | null
}

const KNOWN_CLARIFICATION_REASONS: ClarificationReason[] = [
  'noisy_input',
  'unstable_intent',
  'blocked_context_reuse',
  'other',
]

export function isClarificationReason(value: string | null | undefined): value is ClarificationReason {
  return Boolean(value && KNOWN_CLARIFICATION_REASONS.includes(value as ClarificationReason))
}

export function normalizeClarificationReason(input: NormalizeClarificationReasonInput): ClarificationReason {
  if (isClarificationReason(input.clarificationReason)) {
    return input.clarificationReason
  }

  if (
    input.blockedContextReuse
    || input.fallbackMode === 'clarify_current_quote_relation'
    || input.clarificationReason === 'context_reuse_not_stable'
    || input.clarificationReason === 'complex_packaging_context_not_stably_matched'
  ) {
    return 'blocked_context_reuse'
  }

  if (
    input.clarificationReason === 'unstable_or_noise_input'
    || input.clarificationReason === 'unstable_noise_input'
  ) {
    return 'noisy_input'
  }

  if (
    input.clarificationReason === 'cannot_stably_answer_input'
    || input.clarificationReason === 'weak_business_input'
    || input.clarificationReason === 'unstable_reference_input'
    || input.clarificationReason === 'empty_message'
  ) {
    return 'unstable_intent'
  }

  return 'other'
}

export function mapResponseStatusToClarificationResolvedTo(responseStatus?: string | null): ClarificationResolvedTo | null {
  if (!responseStatus || responseStatus === 'intent_only') {
    return null
  }

  if (
    responseStatus === 'consultation_reply'
    || responseStatus === 'recommendation_updated'
    || responseStatus === 'recommendation_confirmation'
  ) {
    return 'recommendation'
  }

  if (responseStatus === 'missing_fields') return 'missing_fields'
  if (responseStatus === 'estimated') return 'estimated'
  if (responseStatus === 'quoted') return 'quoted'
  if (responseStatus === 'handoff_required') return 'handoff_required'

  return 'other'
}

export function isRecoveredClarificationResult(resolvedTo?: ClarificationResolvedTo | null): boolean {
  return resolvedTo === 'recommendation'
    || resolvedTo === 'missing_fields'
    || resolvedTo === 'estimated'
    || resolvedTo === 'quoted'
}

export function isClarificationTriggeredMetadata(metadata: Record<string, any> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false
  }

  return metadata.clarificationTriggered === true
    && typeof metadata.responseStatus === 'string'
    && metadata.responseStatus === 'intent_only'
}

export function buildClarificationTriggerMetadata(input: {
  clarificationReason?: string | null
  blockedContextReuse?: boolean
  fallbackMode?: string | null
}) {
  return {
    clarificationTriggered: true,
    clarificationReason: normalizeClarificationReason(input),
    clarificationReasonDetail: input.clarificationReason || 'other',
    blockedContextReuse: Boolean(input.blockedContextReuse),
    clarificationRecovered: false,
    clarificationResolvedTo: null,
    clarificationFallbackMode: input.fallbackMode || null,
  }
}

export function buildClarificationResolutionMetadata(input: {
  clarificationMetadata?: Record<string, any> | null
  responseStatus?: string | null
}) {
  if (!isClarificationTriggeredMetadata(input.clarificationMetadata)) {
    return {}
  }

  const clarificationReason = normalizeClarificationReason({
    clarificationReason: typeof input.clarificationMetadata?.clarificationReason === 'string'
      ? input.clarificationMetadata.clarificationReason
      : typeof input.clarificationMetadata?.clarificationReasonDetail === 'string'
      ? input.clarificationMetadata.clarificationReasonDetail
      : undefined,
    blockedContextReuse: Boolean(input.clarificationMetadata?.blockedContextReuse),
    fallbackMode: typeof input.clarificationMetadata?.clarificationFallbackMode === 'string'
      ? input.clarificationMetadata.clarificationFallbackMode
      : typeof input.clarificationMetadata?.fallbackMode === 'string'
      ? input.clarificationMetadata.fallbackMode
      : undefined,
  })
  const resolvedTo = mapResponseStatusToClarificationResolvedTo(input.responseStatus)

  if (!resolvedTo) {
    return {}
  }

  return {
    clarificationRecovered: isRecoveredClarificationResult(resolvedTo),
    clarificationResolvedTo: resolvedTo,
    clarificationSourceReason: clarificationReason,
    clarificationSourceReasonDetail: typeof input.clarificationMetadata?.clarificationReasonDetail === 'string'
      ? input.clarificationMetadata.clarificationReasonDetail
      : null,
  }
}