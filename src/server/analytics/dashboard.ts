import { getProductTypeFromMetadata, inferResponseStatus, type TrackingConversation } from '@/server/analytics/consultationTracking'
import { ACTIVE_AUTO_QUOTE_PRODUCT_TYPES, isActiveAutoQuoteProductType } from '@/lib/catalog/productSchemas'
import { buildImprovementSuggestions, type ReflectionForImprovement } from '@/server/learning/improvementView'
import { collectReflectionMissingFields } from '@/lib/reflection/context'
import { isMissingFieldReflectionIssueType } from '@/lib/reflection/issueTypes'

export type DashboardPeriod = 'today' | '7d' | '30d'

type StatusOverview = {
  quotedCount: number
  estimatedCount: number
  missingFieldsCount: number
  handoffRequiredCount: number
}

type FunnelOverview = {
  consultationReplyCount: number
  consultationWithRecommendedParamsCount: number
  recommendationConfirmationCount: number
  estimatedCount: number
  quotedCount: number
}

type LearningOverview = {
  reflectionCount: number
  approvedReflectionCount: number
  acceptedImprovementCount: number
  implementedActionCount: number
  verifiedActionCount: number
}

type ProductTypeBreakdownRow = {
  productType: string
  quotedCount: number
  estimatedCount: number
  missingFieldsCount: number
  handoffRequiredCount: number
}

type TrendDelta<T extends Record<string, number>> = {
  [K in keyof T as `${Extract<K, string>}Delta`]: number
}

type BaseDashboardStats = {
  quotePathOverview: {
    quotedCount: number
    estimatedCount: number
    missingFieldsCount: number
    handoffRequiredCount: number
  }
  quotePathTrend: TrendDelta<StatusOverview>
  consultationOverview: {
    consultationIntentDistribution: Array<{
      intent: string
      count: number
    }>
    consultationWithRecommendedParamsCount: number
    consultationToRecommendationConfirmationCount: number
    consultationToEstimatedCount: number
    consultationToQuotedCount: number
  }
  consultationFunnel: FunnelOverview
  consultationFunnelTrend: TrendDelta<FunnelOverview>
  productTypeBreakdown: ProductTypeBreakdownRow[]
  nonActiveProductTypeBreakdown: ProductTypeBreakdownRow[]
  activeAutoQuoteProductTypes: string[]
  nonActiveProductRecordCount: number
  learningOverview: LearningOverview
  learningTrend: TrendDelta<LearningOverview>
  topIssues: {
    missingFields: Array<{
      field: string
      count: number
    }>
    consultationTopics: Array<{
      topic: string
      count: number
    }>
    handoffReasons: Array<{
      reason: string
      count: number
    }>
  }
}

export type MinimalDashboardStats = BaseDashboardStats & {
  period: {
    key: DashboardPeriod
    label: string
    startAt: string
    endAt: string
    previousStartAt: string
    previousEndAt: string
  }
  sampledConversationCount: number
}

const CONSULTATION_INTENTS = new Set([
  'MATERIAL_CONSULTATION',
  'PROCESS_CONSULTATION',
  'SPEC_RECOMMENDATION',
  'SOLUTION_RECOMMENDATION',
])

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

function getRange(period: DashboardPeriod, now: Date) {
  if (period === 'today') {
    const startAt = new Date(now)
    startAt.setHours(0, 0, 0, 0)
    const previousStartAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000)
    const previousEndAt = new Date(startAt.getTime() - 1)
    return {
      key: period,
      label: '今日',
      startAt,
      endAt: now,
      previousStartAt,
      previousEndAt,
    }
  }

  const dayCount = period === '7d' ? 7 : 30
  const startAt = new Date(now.getTime() - dayCount * 24 * 60 * 60 * 1000)
  const previousStartAt = new Date(startAt.getTime() - dayCount * 24 * 60 * 60 * 1000)
  const previousEndAt = new Date(startAt.getTime() - 1)

  return {
    key: period,
    label: period === '7d' ? '最近7天' : '最近30天',
    startAt,
    endAt: now,
    previousStartAt,
    previousEndAt,
  }
}

function getConsultationIntent(metadata: Record<string, any> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  const intent = typeof metadata.consultationIntent === 'string'
    ? metadata.consultationIntent
    : typeof metadata.intent === 'string'
    ? metadata.intent
    : null

  return intent && CONSULTATION_INTENTS.has(intent) ? intent : null
}

function hasRecommendedConsultation(metadata: Record<string, any> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false
  }

  if (!getConsultationIntent(metadata)) {
    return false
  }

  if (typeof metadata.hasRecommendedParams === 'boolean') {
    return metadata.hasRecommendedParams
  }

  return Boolean(metadata.recommendedParams)
}

function buildTopMissingFields(reflections: ReflectionForImprovement[]) {
  const fieldCount = new Map<string, number>()

  reflections.forEach((item) => {
    if (!isMissingFieldReflectionIssueType(item.issueType)) return

    collectReflectionMissingFields(item.originalExtractedParams || undefined, item.correctedParams || undefined).forEach((field) => {
      fieldCount.set(field, (fieldCount.get(field) || 0) + 1)
    })
  })

  return Array.from(fieldCount.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function buildTopHandoffReasons(conversations: TrackingConversation[], startAt: Date, endAt: Date) {
  const reasonCount = new Map<string, number>()

  conversations.forEach((conversation) => {
    ;(conversation.handoffs || []).forEach((handoff) => {
      if (!isWithinRange(handoff.createdAt || conversation.updatedAt, startAt, endAt)) {
        return
      }

      const reason = handoff.reason?.trim()
      if (!reason) return
      reasonCount.set(reason, (reasonCount.get(reason) || 0) + 1)
    })
  })

  return Array.from(reasonCount.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function sortProductTypes<T extends { productType: string }>(rows: T[]): T[] {
  const order = [
    'tuck_end_box',
    'mailer_box',
    'window_box',
    'leaflet_insert',
    'box_insert',
    'seal_sticker',
    'album',
    'flyer',
    'business_card',
    'poster',
    'sticker',
    'paper_bag',
    'unknown',
  ]
  return rows.sort((a, b) => {
    const scoreA = (a as any).quotedCount + (a as any).estimatedCount + (a as any).missingFieldsCount + (a as any).handoffRequiredCount
    const scoreB = (b as any).quotedCount + (b as any).estimatedCount + (b as any).missingFieldsCount + (b as any).handoffRequiredCount
    if (scoreB !== scoreA) return scoreB - scoreA
    return order.indexOf(a.productType) - order.indexOf(b.productType)
  })
}

function buildTrendDelta<T extends Record<string, number>>(current: T, previous: T): TrendDelta<T> {
  const deltaEntries = Object.entries(current).map(([key, value]) => [`${key}Delta`, value - (previous[key as keyof T] || 0)])
  return Object.fromEntries(deltaEntries) as TrendDelta<T>
}

function buildBaseDashboardStats(params: {
  conversations: TrackingConversation[]
  reflections: ReflectionForImprovement[]
  approvedReflections: ReflectionForImprovement[]
  startAt: Date
  endAt: Date
}): BaseDashboardStats {
  const quotePathOverview: StatusOverview = {
    quotedCount: 0,
    estimatedCount: 0,
    missingFieldsCount: 0,
    handoffRequiredCount: 0,
  }

  const consultationFunnel: FunnelOverview = {
    consultationReplyCount: 0,
    consultationWithRecommendedParamsCount: 0,
    recommendationConfirmationCount: 0,
    estimatedCount: 0,
    quotedCount: 0,
  }

  const intentCount = new Map<string, number>()
  const topicCount = new Map<string, number>()
  const productTypeBreakdownMap = new Map<string, ProductTypeBreakdownRow>()

  for (const conversation of params.conversations) {
    const assistantMessages = (conversation.messages || []).filter((message) => message.sender === 'ASSISTANT')
    const statusHits = new Map<'quoted' | 'estimated' | 'missing_fields' | 'handoff_required', string>()

    let hasConsultationReply = false
    let hasRecommendedConsultationInPeriod = false
    let hasRecommendationConfirmation = false
    let hasEstimated = false
    let hasQuoted = false

    for (const message of assistantMessages) {
      const createdAt = toDate(message.createdAt) || toDate(conversation.updatedAt)
      if (!createdAt || !isWithinRange(createdAt, params.startAt, params.endAt)) {
        continue
      }

      const metadata = message.metadata as Record<string, any> | undefined
      const status = inferResponseStatus(metadata)
      const consultationIntent = getConsultationIntent(metadata)

      if (consultationIntent) {
        intentCount.set(consultationIntent, (intentCount.get(consultationIntent) || 0) + 1)
        const topic = typeof metadata?.matchedKnowledgeCardTitle === 'string' && metadata.matchedKnowledgeCardTitle.trim().length > 0
          ? metadata.matchedKnowledgeCardTitle
          : consultationIntent
        topicCount.set(topic, (topicCount.get(topic) || 0) + 1)
      }

      if (status === 'consultation_reply') {
        hasConsultationReply = true
      }

      if (hasRecommendedConsultation(metadata)) {
        hasRecommendedConsultationInPeriod = true
      }

      if (status === 'recommendation_confirmation') {
        hasRecommendationConfirmation = true
      }

      if (status === 'estimated') {
        hasEstimated = true
      }

      if (status === 'quoted') {
        hasQuoted = true
      }

      if (status && ['quoted', 'estimated', 'missing_fields', 'handoff_required'].includes(status)) {
        const productType = getProductTypeFromMetadata(metadata) || 'unknown'
        statusHits.set(status as 'quoted' | 'estimated' | 'missing_fields' | 'handoff_required', productType)
      }
    }

    if (hasConsultationReply) {
      consultationFunnel.consultationReplyCount += 1
      if (hasRecommendedConsultationInPeriod) {
        consultationFunnel.consultationWithRecommendedParamsCount += 1
      }
      if (hasRecommendationConfirmation) {
        consultationFunnel.recommendationConfirmationCount += 1
      }
      if (hasEstimated) {
        consultationFunnel.estimatedCount += 1
      }
      if (hasQuoted) {
        consultationFunnel.quotedCount += 1
      }
    }

    statusHits.forEach((productType, status) => {
      const isActiveProductType = isActiveAutoQuoteProductType(productType)
      const row = productTypeBreakdownMap.get(productType) || {
        productType,
        quotedCount: 0,
        estimatedCount: 0,
        missingFieldsCount: 0,
        handoffRequiredCount: 0,
      }

      if (status === 'quoted') {
        if (isActiveProductType) {
          quotePathOverview.quotedCount += 1
        }
        row.quotedCount += 1
      }

      if (status === 'estimated') {
        if (isActiveProductType) {
          quotePathOverview.estimatedCount += 1
        }
        row.estimatedCount += 1
      }

      if (status === 'missing_fields') {
        if (isActiveProductType) {
          quotePathOverview.missingFieldsCount += 1
        }
        row.missingFieldsCount += 1
      }

      if (status === 'handoff_required') {
        if (isActiveProductType) {
          quotePathOverview.handoffRequiredCount += 1
        }
        row.handoffRequiredCount += 1
      }

      productTypeBreakdownMap.set(productType, row)
    })
  }

  const filteredReflections = params.reflections.filter((item) => isWithinRange(item.createdAt, params.startAt, params.endAt))
  const filteredApprovedReflections = params.approvedReflections.filter((item) => isWithinRange(item.createdAt, params.startAt, params.endAt))
  const improvements = buildImprovementSuggestions(params.approvedReflections)

  const learningOverview: LearningOverview = {
    reflectionCount: filteredReflections.length,
    approvedReflectionCount: filteredApprovedReflections.length,
    acceptedImprovementCount: improvements.filter((item) => {
      if (!['ACCEPTED', 'IMPLEMENTED', 'VERIFIED'].includes(item.status)) return false
      return isWithinRange(item.lastActionAt || item.createdAt, params.startAt, params.endAt)
    }).length,
    implementedActionCount: improvements.filter((item) => isWithinRange(item.implementedAt, params.startAt, params.endAt)).length,
    verifiedActionCount: improvements.filter((item) => isWithinRange(item.verifiedAt, params.startAt, params.endAt)).length,
  }

  const consultationIntentDistribution = Array.from(intentCount.entries())
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)

  const consultationTopics = Array.from(topicCount.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const productTypeRows = sortProductTypes(Array.from(productTypeBreakdownMap.values()))
  const activeProductTypeBreakdown = productTypeRows.filter((row) => isActiveAutoQuoteProductType(row.productType))
  const nonActiveProductTypeBreakdown = productTypeRows.filter((row) => !isActiveAutoQuoteProductType(row.productType))
  const nonActiveProductRecordCount = nonActiveProductTypeBreakdown.reduce((sum, row) => (
    sum + row.quotedCount + row.estimatedCount + row.missingFieldsCount + row.handoffRequiredCount
  ), 0)

  return {
    quotePathOverview,
    quotePathTrend: buildTrendDelta(quotePathOverview, {
      quotedCount: 0,
      estimatedCount: 0,
      missingFieldsCount: 0,
      handoffRequiredCount: 0,
    }),
    consultationOverview: {
      consultationIntentDistribution,
      consultationWithRecommendedParamsCount: consultationFunnel.consultationWithRecommendedParamsCount,
      consultationToRecommendationConfirmationCount: consultationFunnel.recommendationConfirmationCount,
      consultationToEstimatedCount: consultationFunnel.estimatedCount,
      consultationToQuotedCount: consultationFunnel.quotedCount,
    },
    consultationFunnel,
    consultationFunnelTrend: buildTrendDelta(consultationFunnel, {
      consultationReplyCount: 0,
      consultationWithRecommendedParamsCount: 0,
      recommendationConfirmationCount: 0,
      estimatedCount: 0,
      quotedCount: 0,
    }),
    productTypeBreakdown: activeProductTypeBreakdown,
    nonActiveProductTypeBreakdown,
    activeAutoQuoteProductTypes: [...ACTIVE_AUTO_QUOTE_PRODUCT_TYPES],
    nonActiveProductRecordCount,
    learningOverview,
    learningTrend: buildTrendDelta(learningOverview, {
      reflectionCount: 0,
      approvedReflectionCount: 0,
      acceptedImprovementCount: 0,
      implementedActionCount: 0,
      verifiedActionCount: 0,
    }),
    topIssues: {
      missingFields: buildTopMissingFields(filteredReflections),
      consultationTopics,
      handoffReasons: buildTopHandoffReasons(params.conversations, params.startAt, params.endAt),
    },
  }
}

export function buildMinimalDashboardStats(params: {
  conversations: TrackingConversation[]
  reflections: ReflectionForImprovement[]
  approvedReflections: ReflectionForImprovement[]
  period?: DashboardPeriod
  now?: Date
}): MinimalDashboardStats {
  const now = params.now || new Date()
  const range = getRange(params.period || '30d', now)
  const previousStats = buildBaseDashboardStats({
    conversations: params.conversations,
    reflections: params.reflections,
    approvedReflections: params.approvedReflections,
    startAt: range.previousStartAt,
    endAt: range.previousEndAt,
  })
  const currentStats = buildBaseDashboardStats({
    conversations: params.conversations,
    reflections: params.reflections,
    approvedReflections: params.approvedReflections,
    startAt: range.startAt,
    endAt: range.endAt,
  })

  return {
    ...currentStats,
    quotePathTrend: buildTrendDelta(currentStats.quotePathOverview, previousStats.quotePathOverview),
    consultationFunnelTrend: buildTrendDelta(currentStats.consultationFunnel, previousStats.consultationFunnel),
    learningTrend: buildTrendDelta(currentStats.learningOverview, previousStats.learningOverview),
    period: {
      key: range.key,
      label: range.label,
      startAt: range.startAt.toISOString(),
      endAt: range.endAt.toISOString(),
      previousStartAt: range.previousStartAt.toISOString(),
      previousEndAt: range.previousEndAt.toISOString(),
    },
    sampledConversationCount: params.conversations.length,
  }
}