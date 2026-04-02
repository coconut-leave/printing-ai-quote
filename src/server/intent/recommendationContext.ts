type ConversationRecommendationSnapshot = {
  messages?: Array<{
    sender?: string
    metadata?: any
  }>
}

export type RecommendedParamsPayload = {
  productType?: string
  recommendedParams: Record<string, any>
  note?: string
}

export function getLatestRecommendedParams(
  conversation?: ConversationRecommendationSnapshot | null
): RecommendedParamsPayload | null {
  if (!conversation?.messages || conversation.messages.length === 0) {
    return null
  }

  const assistantMessages = [...conversation.messages]
    .reverse()
    .filter((message) => message.sender === 'ASSISTANT' && message.metadata && typeof message.metadata === 'object')

  for (const message of assistantMessages) {
    const metadata = message.metadata as Record<string, any>
    const candidate = metadata.recommendedParams || (
      metadata.mergedRecommendedParams
        ? {
            productType: metadata.mergedRecommendedParams.productType,
            recommendedParams: metadata.mergedRecommendedParams,
          }
        : null
    )
    if (!candidate || typeof candidate !== 'object') {
      continue
    }

    const recommendedParams = candidate as Record<string, any>
    if (!recommendedParams.recommendedParams || typeof recommendedParams.recommendedParams !== 'object') {
      continue
    }

    return {
      productType: typeof recommendedParams.productType === 'string' ? recommendedParams.productType : undefined,
      recommendedParams: recommendedParams.recommendedParams as Record<string, any>,
      note: typeof recommendedParams.note === 'string' ? recommendedParams.note : undefined,
    }
  }

  return null
}

export function buildRecommendationBaseParams(
  recommendation: RecommendedParamsPayload | null,
  historicalParams?: Record<string, any> | null
): Record<string, any> | null {
  if (!recommendation && !historicalParams) {
    return null
  }

  const baseParams: Record<string, any> = historicalParams ? { ...historicalParams } : {}

  if (recommendation?.productType) {
    baseParams.productType = recommendation.productType
  }

  if (recommendation?.recommendedParams) {
    Object.assign(baseParams, recommendation.recommendedParams)
  }

  delete baseParams.mergedParams
  delete baseParams.missingFields

  return Object.keys(baseParams).length > 0 ? baseParams : null
}