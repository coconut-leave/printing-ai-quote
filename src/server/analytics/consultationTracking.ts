type AssistantMessage = {
  id: number
  sender: string
  metadata?: any
  createdAt?: string | Date
}

export type TrackingConversation = {
  id: number
  status: string
  updatedAt?: string | Date
  messages: AssistantMessage[]
  quotes?: Array<{ id: number }>
  handoffs?: Array<{ reason: string; createdAt?: string | Date }>
}

const CONSULTATION_INTENTS = [
  'MATERIAL_CONSULTATION',
  'PROCESS_CONSULTATION',
  'SPEC_RECOMMENDATION',
  'SOLUTION_RECOMMENDATION',
] as const

type ConsultationIntent = (typeof CONSULTATION_INTENTS)[number]

export type ResponseStatus =
  | 'consultation_reply'
  | 'recommendation_updated'
  | 'recommendation_confirmation'
  | 'estimated'
  | 'quoted'
  | 'missing_fields'
  | 'handoff_required'
  | 'intent_only'
  | 'progress_inquiry'
  | 'sample_request'
  | 'bargain_request'

export type ConsultationTrackingStats = {
  totals: {
    consultationMessageCount: number
    consultationConversationCount: number
    consultationWithRecommendedParamsCount: number
    consultationWithRecommendedConversationCount: number
    recommendationConfirmationConversationCount: number
    recommendationUpdatedCount: number
    estimatedConversionCount: number
    quotedConversionCount: number
    recommendationToEstimatedCount: number
    recommendationToQuotedCount: number
    recommendationToHandoffCount: number
    recommendationInterruptedCount: number
    recommendationMissingFieldsStalledCount: number
    recommendationUpdatedStalledCount: number
    knowledgeOnlyConversationCount: number
  }
  productTypeRecommendationConversion: Array<{
    productType: string
    flowCount: number
    recommendationConfirmationCount: number
    recommendationUpdatedCount: number
    estimatedCount: number
    quotedCount: number
    handoffCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
  }>
  recommendedSolutionConversion: Array<{
    cardId: string
    cardTitle: string
    productType?: string
    flowCount: number
    recommendationConfirmationCount: number
    recommendationUpdatedCount: number
    estimatedCount: number
    quotedCount: number
    handoffCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
    quotedRate: number
  }>
  recommendationStallDistribution: Array<{
    cardId: string
    cardTitle: string
    productType?: string
    recommendationUpdatedStalledCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
  }>
  recentRecommendationFlows: Array<{
    conversationId: number
    productType?: string
    consultationIntent: ConsultationIntent
    cardId?: string
    cardTitle?: string
    hasRecommendedParams: boolean
    latestStage:
      | 'consultation_reply'
      | 'recommendation_updated'
      | 'recommendation_confirmation'
      | 'missing_fields'
      | 'estimated'
      | 'quoted'
      | 'handoff_required'
      | 'interrupted'
    recommendationUpdatedCount: number
    recommendationConfirmationCount: number
  }>
  knowledgeCardHitDistribution: Array<{
    cardId: string
    cardTitle: string
    category: string
    hitCount: number
    recommendedCount: number
  }>
  recentKnowledgeHits: Array<{
    conversationId: number
    consultationIntent: ConsultationIntent
    cardId: string
    cardTitle: string
    category: string
    hasRecommendedParams: boolean
    productType?: string
  }>
  consultationIntentDistribution: Array<{
    intent: ConsultationIntent
    count: number
    recommendedCount: number
  }>
  consultationOutcomeByIntent: Array<{
    intent: ConsultationIntent
    conversationCount: number
    withRecommendedParamsCount: number
    estimatedCount: number
    quotedCount: number
    knowledgeOnlyCount: number
  }>
  recentConversions: Array<{
    conversationId: number
    consultationIntent: ConsultationIntent
    hasRecommendedParams: boolean
    finalOutcome: 'estimated' | 'quoted' | 'knowledge_only'
  }>
}

type ConsultationMessageMeta = {
  consultationIntent: ConsultationIntent
  matchedKnowledgeCardId?: string
  matchedKnowledgeCardTitle?: string
  consultationCategory?: string
  hasRecommendedParams: boolean
  productType?: string
}

function isConsultationIntent(intent: string): intent is ConsultationIntent {
  return CONSULTATION_INTENTS.includes(intent as ConsultationIntent)
}

export function inferResponseStatus(metadata: Record<string, any> | null | undefined): ResponseStatus | null {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  if (typeof metadata.responseStatus === 'string') {
    return metadata.responseStatus as ResponseStatus
  }

  if (metadata.intent === 'RECOMMENDATION_CONFIRMATION') return 'recommendation_confirmation'
  if (metadata.estimatedData) return 'estimated'
  if (metadata.quoteParams && Array.isArray(metadata.missingFields) && metadata.missingFields.length === 0) return 'quoted'
  if (metadata.patchSummary && metadata.mergedRecommendedParams) return 'recommendation_updated'
  if (Array.isArray(metadata.missingFields) && metadata.missingFields.length > 0) return 'missing_fields'
  if (metadata.intent && ['FILE_REVIEW_REQUEST', 'HUMAN_REQUEST', 'COMPLAINT'].includes(metadata.intent)) return 'handoff_required'
  if (metadata.intent && isConsultationIntent(metadata.intent) && metadata.recommendedParams) return 'consultation_reply'
  return null
}

function getConsultationMessageMeta(metadata: Record<string, any> | null | undefined): ConsultationMessageMeta | null {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  const consultationIntent = typeof metadata.consultationIntent === 'string'
    ? metadata.consultationIntent
    : metadata.intent

  if (!consultationIntent || !isConsultationIntent(consultationIntent)) {
    return null
  }

  return {
    consultationIntent,
    matchedKnowledgeCardId: typeof metadata.matchedKnowledgeCardId === 'string' ? metadata.matchedKnowledgeCardId : undefined,
    matchedKnowledgeCardTitle: typeof metadata.matchedKnowledgeCardTitle === 'string' ? metadata.matchedKnowledgeCardTitle : undefined,
    consultationCategory: typeof metadata.consultationCategory === 'string' ? metadata.consultationCategory : undefined,
    hasRecommendedParams: typeof metadata.hasRecommendedParams === 'boolean'
      ? metadata.hasRecommendedParams
      : Boolean(metadata.recommendedParams),
    productType: typeof metadata.productType === 'string'
      ? metadata.productType
      : typeof metadata.recommendedParams?.productType === 'string'
      ? metadata.recommendedParams.productType
      : undefined,
  }
}

export function getProductTypeFromMetadata(metadata: Record<string, any> | null | undefined): string | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined
  }

  if (typeof metadata.productType === 'string') return metadata.productType
  if (typeof metadata.mergedParams?.productType === 'string') return metadata.mergedParams.productType
  if (typeof metadata.quoteParams?.productType === 'string') return metadata.quoteParams.productType
  if (typeof metadata.recommendedParams?.productType === 'string') return metadata.recommendedParams.productType
  if (typeof metadata.mergedRecommendedParams?.productType === 'string') return metadata.mergedRecommendedParams.productType
  if (typeof metadata.estimatedData?.normalizedParams?.productType === 'string') return metadata.estimatedData.normalizedParams.productType
  return undefined
}

function getLatestStage(statuses: ResponseStatus[]): ConsultationTrackingStats['recentRecommendationFlows'][number]['latestStage'] {
  if (statuses.includes('quoted')) return 'quoted'
  if (statuses.includes('handoff_required')) return 'handoff_required'
  if (statuses.includes('estimated')) return 'estimated'
  if (statuses.includes('missing_fields')) return 'missing_fields'
  if (statuses.includes('recommendation_updated')) return 'recommendation_updated'
  if (statuses.includes('recommendation_confirmation')) return 'recommendation_confirmation'
  if (statuses.includes('consultation_reply')) return 'consultation_reply'
  return 'interrupted'
}

function isRecommendationConfirmationMessage(metadata: Record<string, any> | null | undefined): boolean {
  return Boolean(metadata && typeof metadata === 'object' && metadata.intent === 'RECOMMENDATION_CONFIRMATION')
}

export function buildConsultationTrackingStats(conversations: TrackingConversation[]): ConsultationTrackingStats {
  const intentDistributionMap = new Map<ConsultationIntent, { count: number; recommendedCount: number }>()
  const productTypeRecommendationMap = new Map<string, {
    productType: string
    flowCount: number
    recommendationConfirmationCount: number
    recommendationUpdatedCount: number
    estimatedCount: number
    quotedCount: number
    handoffCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
  }>()
  const recommendedSolutionMap = new Map<string, {
    cardId: string
    cardTitle: string
    productType?: string
    flowCount: number
    recommendationConfirmationCount: number
    recommendationUpdatedCount: number
    estimatedCount: number
    quotedCount: number
    handoffCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
  }>()
  const knowledgeCardDistributionMap = new Map<string, {
    cardId: string
    cardTitle: string
    category: string
    hitCount: number
    recommendedCount: number
  }>()
  const outcomeByIntentMap = new Map<ConsultationIntent, {
    conversationCount: number
    withRecommendedParamsCount: number
    estimatedCount: number
    quotedCount: number
    knowledgeOnlyCount: number
  }>()

  let consultationMessageCount = 0
  let consultationConversationCount = 0
  let consultationWithRecommendedParamsCount = 0
  let consultationWithRecommendedConversationCount = 0
  let recommendationConfirmationConversationCount = 0
  let recommendationUpdatedCount = 0
  let estimatedConversionCount = 0
  let quotedConversionCount = 0
  let recommendationToEstimatedCount = 0
  let recommendationToQuotedCount = 0
  let recommendationToHandoffCount = 0
  let recommendationInterruptedCount = 0
  let recommendationMissingFieldsStalledCount = 0
  let recommendationUpdatedStalledCount = 0
  let knowledgeOnlyConversationCount = 0

  const recentConversions: ConsultationTrackingStats['recentConversions'] = []
  const recentKnowledgeHits: ConsultationTrackingStats['recentKnowledgeHits'] = []
  const recentRecommendationFlows: ConsultationTrackingStats['recentRecommendationFlows'] = []

  for (const conversation of conversations) {
    const assistantMessages = (conversation.messages || []).filter((message) => message.sender === 'ASSISTANT')
    const consultationMessages = assistantMessages.filter((message) => {
      return Boolean(getConsultationMessageMeta(message.metadata))
    })

    consultationMessages.forEach((message) => {
      const consultationMeta = getConsultationMessageMeta(message.metadata)
      if (!consultationMeta) {
        return
      }

      const intent = consultationMeta.consultationIntent
      const hasRecommendedParams = consultationMeta.hasRecommendedParams
      consultationMessageCount += 1
      if (hasRecommendedParams) {
        consultationWithRecommendedParamsCount += 1
      }

      const current = intentDistributionMap.get(intent) || { count: 0, recommendedCount: 0 }
      current.count += 1
      if (hasRecommendedParams) {
        current.recommendedCount += 1
      }
      intentDistributionMap.set(intent, current)

      if (consultationMeta.matchedKnowledgeCardId) {
        const currentCard = knowledgeCardDistributionMap.get(consultationMeta.matchedKnowledgeCardId) || {
          cardId: consultationMeta.matchedKnowledgeCardId,
          cardTitle: consultationMeta.matchedKnowledgeCardTitle || consultationMeta.matchedKnowledgeCardId,
          category: consultationMeta.consultationCategory || 'UNKNOWN',
          hitCount: 0,
          recommendedCount: 0,
        }
        currentCard.hitCount += 1
        if (hasRecommendedParams) {
          currentCard.recommendedCount += 1
        }
        knowledgeCardDistributionMap.set(consultationMeta.matchedKnowledgeCardId, currentCard)

        recentKnowledgeHits.push({
          conversationId: conversation.id,
          consultationIntent: consultationMeta.consultationIntent,
          cardId: consultationMeta.matchedKnowledgeCardId,
          cardTitle: consultationMeta.matchedKnowledgeCardTitle || consultationMeta.matchedKnowledgeCardId,
          category: consultationMeta.consultationCategory || 'UNKNOWN',
          hasRecommendedParams,
          productType: consultationMeta.productType,
        })
      }
    })

    if (consultationMessages.length === 0) {
      continue
    }

    consultationConversationCount += 1
    const primaryConsultationMeta = getConsultationMessageMeta(consultationMessages[0]?.metadata)
    if (!primaryConsultationMeta) {
      continue
    }

    const primaryIntent = primaryConsultationMeta.consultationIntent
    const hasRecommendedParams = consultationMessages.some((message) => Boolean(getConsultationMessageMeta(message.metadata)?.hasRecommendedParams))
    const latestRecommendationConsultation = [...consultationMessages]
      .reverse()
      .map((message) => getConsultationMessageMeta(message.metadata))
      .find((meta): meta is ConsultationMessageMeta => Boolean(meta?.hasRecommendedParams))
    const recommendationStatuses = assistantMessages
      .map((message) => inferResponseStatus(message.metadata))
      .filter((status): status is ResponseStatus => Boolean(status))
    const recommendationConfirmationCountForConversation = assistantMessages.filter(
      (message) => isRecommendationConfirmationMessage(message.metadata)
    ).length
    const recommendationUpdatedCountForConversation = assistantMessages.filter(
      (message) => inferResponseStatus(message.metadata) === 'recommendation_updated'
    ).length
    recommendationUpdatedCount += recommendationUpdatedCountForConversation

    const hasRecommendationConfirmation = recommendationConfirmationCountForConversation > 0
    const hasEstimated = assistantMessages.some(
      (message) => inferResponseStatus(message.metadata) === 'estimated'
    )
    const hasQuoted = assistantMessages.some(
      (message) => inferResponseStatus(message.metadata) === 'quoted'
    ) || Boolean(conversation.quotes?.length)
    const hasHandoff = assistantMessages.some(
      (message) => inferResponseStatus(message.metadata) === 'handoff_required'
    ) || conversation.status === 'PENDING_HUMAN'
    const knowledgeOnly = !hasRecommendedParams && !hasRecommendationConfirmation && !hasEstimated && !hasQuoted && !hasHandoff && recommendationUpdatedCountForConversation === 0
    const latestStage = getLatestStage(recommendationStatuses)
    const recommendationProductType = latestRecommendationConsultation?.productType
      || assistantMessages.map((message) => getProductTypeFromMetadata(message.metadata)).find(Boolean)
      || primaryConsultationMeta.productType

    if (hasRecommendedParams) consultationWithRecommendedConversationCount += 1
    if (hasRecommendationConfirmation) recommendationConfirmationConversationCount += 1
    if (hasEstimated) estimatedConversionCount += 1
    if (hasQuoted) quotedConversionCount += 1
    if (knowledgeOnly) knowledgeOnlyConversationCount += 1

    const outcome = outcomeByIntentMap.get(primaryIntent) || {
      conversationCount: 0,
      withRecommendedParamsCount: 0,
      estimatedCount: 0,
      quotedCount: 0,
      knowledgeOnlyCount: 0,
    }
    outcome.conversationCount += 1
    if (hasRecommendedParams) outcome.withRecommendedParamsCount += 1
    if (hasEstimated) outcome.estimatedCount += 1
    if (hasQuoted) outcome.quotedCount += 1
    if (knowledgeOnly) outcome.knowledgeOnlyCount += 1
    outcomeByIntentMap.set(primaryIntent, outcome)

    if (latestRecommendationConsultation) {
      const productTypeKey = recommendationProductType || 'unknown'
      const currentProductType = productTypeRecommendationMap.get(productTypeKey) || {
        productType: productTypeKey,
        flowCount: 0,
        recommendationConfirmationCount: 0,
        recommendationUpdatedCount: 0,
        estimatedCount: 0,
        quotedCount: 0,
        handoffCount: 0,
        missingFieldsStalledCount: 0,
        interruptedCount: 0,
      }

      currentProductType.flowCount += 1
      if (hasRecommendationConfirmation) currentProductType.recommendationConfirmationCount += 1
      if (recommendationUpdatedCountForConversation > 0) currentProductType.recommendationUpdatedCount += 1
      if (hasEstimated) currentProductType.estimatedCount += 1
      if (hasQuoted) currentProductType.quotedCount += 1
      if (hasHandoff) currentProductType.handoffCount += 1
      if (latestStage === 'missing_fields') currentProductType.missingFieldsStalledCount += 1
      if (latestStage === 'consultation_reply' || latestStage === 'recommendation_confirmation' || latestStage === 'interrupted') {
        currentProductType.interruptedCount += 1
      }
      productTypeRecommendationMap.set(productTypeKey, currentProductType)

      const solutionKey = latestRecommendationConsultation.matchedKnowledgeCardId || `product:${productTypeKey}`
      const currentSolution = recommendedSolutionMap.get(solutionKey) || {
        cardId: latestRecommendationConsultation.matchedKnowledgeCardId || solutionKey,
        cardTitle: latestRecommendationConsultation.matchedKnowledgeCardTitle || latestRecommendationConsultation.matchedKnowledgeCardId || productTypeKey,
        productType: recommendationProductType,
        flowCount: 0,
        recommendationConfirmationCount: 0,
        recommendationUpdatedCount: 0,
        estimatedCount: 0,
        quotedCount: 0,
        handoffCount: 0,
        missingFieldsStalledCount: 0,
        interruptedCount: 0,
      }

      currentSolution.flowCount += 1
      if (hasRecommendationConfirmation) currentSolution.recommendationConfirmationCount += 1
      if (recommendationUpdatedCountForConversation > 0) currentSolution.recommendationUpdatedCount += 1
      if (hasEstimated) currentSolution.estimatedCount += 1
      if (hasQuoted) currentSolution.quotedCount += 1
      if (hasHandoff) currentSolution.handoffCount += 1
      if (latestStage === 'missing_fields') currentSolution.missingFieldsStalledCount += 1
      if (latestStage === 'consultation_reply' || latestStage === 'recommendation_confirmation' || latestStage === 'interrupted') {
        currentSolution.interruptedCount += 1
      }
      recommendedSolutionMap.set(solutionKey, currentSolution)

      if (hasEstimated) recommendationToEstimatedCount += 1
      if (hasQuoted) recommendationToQuotedCount += 1
      if (hasHandoff) recommendationToHandoffCount += 1
      if (latestStage === 'missing_fields') recommendationMissingFieldsStalledCount += 1
      if (latestStage === 'recommendation_updated') recommendationUpdatedStalledCount += 1
      if (latestStage === 'consultation_reply' || latestStage === 'recommendation_confirmation' || latestStage === 'interrupted') {
        recommendationInterruptedCount += 1
      }

      recentRecommendationFlows.push({
        conversationId: conversation.id,
        productType: recommendationProductType,
        consultationIntent: latestRecommendationConsultation.consultationIntent,
        cardId: latestRecommendationConsultation.matchedKnowledgeCardId,
        cardTitle: latestRecommendationConsultation.matchedKnowledgeCardTitle,
        hasRecommendedParams: true,
        latestStage,
        recommendationUpdatedCount: recommendationUpdatedCountForConversation,
        recommendationConfirmationCount: recommendationConfirmationCountForConversation,
      })
    }

    if (hasEstimated || hasQuoted || knowledgeOnly) {
      recentConversions.push({
        conversationId: conversation.id,
        consultationIntent: primaryIntent,
        hasRecommendedParams,
        finalOutcome: hasQuoted ? 'quoted' : hasEstimated ? 'estimated' : 'knowledge_only',
      })
    }
  }

  return {
    totals: {
      consultationMessageCount,
      consultationConversationCount,
      consultationWithRecommendedParamsCount,
      consultationWithRecommendedConversationCount,
      recommendationConfirmationConversationCount,
      recommendationUpdatedCount,
      estimatedConversionCount,
      quotedConversionCount,
      recommendationToEstimatedCount,
      recommendationToQuotedCount,
      recommendationToHandoffCount,
      recommendationInterruptedCount,
      recommendationMissingFieldsStalledCount,
      recommendationUpdatedStalledCount,
      knowledgeOnlyConversationCount,
    },
    productTypeRecommendationConversion: Array.from(productTypeRecommendationMap.values())
      .sort((a, b) => b.flowCount - a.flowCount),
    recommendedSolutionConversion: Array.from(recommendedSolutionMap.values())
      .map((item) => ({
        ...item,
        quotedRate: item.flowCount > 0 ? Math.round((item.quotedCount / item.flowCount) * 10000) / 100 : 0,
      }))
      .sort((a, b) => {
        if (b.quotedCount !== a.quotedCount) return b.quotedCount - a.quotedCount
        return b.quotedRate - a.quotedRate
      }),
    recommendationStallDistribution: Array.from(recommendedSolutionMap.values())
      .map((item) => ({
        cardId: item.cardId,
        cardTitle: item.cardTitle,
        productType: item.productType,
        recommendationUpdatedStalledCount: Math.max(0, item.recommendationUpdatedCount - item.recommendationConfirmationCount),
        missingFieldsStalledCount: item.missingFieldsStalledCount,
        interruptedCount: item.interruptedCount,
      }))
      .sort((a, b) => {
        const aScore = a.recommendationUpdatedStalledCount + a.missingFieldsStalledCount + a.interruptedCount
        const bScore = b.recommendationUpdatedStalledCount + b.missingFieldsStalledCount + b.interruptedCount
        return bScore - aScore
      }),
    recentRecommendationFlows: recentRecommendationFlows.slice(0, 12),
    knowledgeCardHitDistribution: Array.from(knowledgeCardDistributionMap.values())
      .sort((a, b) => b.hitCount - a.hitCount),
    recentKnowledgeHits: recentKnowledgeHits.slice(0, 12),
    consultationIntentDistribution: Array.from(intentDistributionMap.entries())
      .map(([intent, value]) => ({ intent, ...value }))
      .sort((a, b) => b.count - a.count),
    consultationOutcomeByIntent: Array.from(outcomeByIntentMap.entries())
      .map(([intent, value]) => ({ intent, ...value }))
      .sort((a, b) => b.conversationCount - a.conversationCount),
    recentConversions: recentConversions.slice(0, 10),
  }
}