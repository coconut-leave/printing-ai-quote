import { getMissingFieldsChineseText, isSimpleProductType } from '@/lib/catalog/helpers'
import { isActiveAutoQuoteProductType } from '@/lib/catalog/productSchemas'

type JsonRecord = Record<string, any>

type ConversationPresentationInput = {
  conversationId: number
  status: string
  latestMessage?: string | null
  recentMessages?: Array<{
    sender?: string | null
    content?: string | null
    metadata?: unknown
  }>
  latestQuoteParameters?: JsonRecord | null
}

type ConversationPresentationResult = {
  title: string
  topicSummary: string
  productType?: string
  scopeLabel: string
  isActiveScope: boolean
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function compactText(value: string | null | undefined, maxLength: number): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}...`
}

function extractProductType(candidate?: JsonRecord): string | undefined {
  if (!candidate) return undefined

  if (typeof candidate.productType === 'string' && candidate.productType.trim()) {
    return candidate.productType.trim()
  }

  return extractProductType(asRecord(candidate.normalizedParams))
    || extractProductType(asRecord(candidate.extractedParams))
    || extractProductType(asRecord(candidate.mergedParams))
    || extractProductType(asRecord(candidate.quoteParams))
    || extractProductType(asRecord(candidate.recommendedParams))
    || extractProductType(asRecord(candidate.mergedRecommendedParams))
    || extractProductType(asRecord(candidate.estimatedData))
    || extractProductType(asRecord(candidate.packagingContext))
    || extractProductType(asRecord(candidate.mainItem))
}

function extractMissingFields(candidate?: JsonRecord): string[] {
  if (!candidate) return []

  if (Array.isArray(candidate.missingFields)) {
    return candidate.missingFields.map(String).filter(Boolean)
  }

  return extractMissingFields(asRecord(candidate.estimatedData))
}

function extractQuantity(candidate?: JsonRecord): string | undefined {
  if (!candidate) return undefined

  const quantity = candidate.quantity
  if (typeof quantity === 'number' && Number.isFinite(quantity)) {
    return String(quantity)
  }

  if (typeof quantity === 'string' && quantity.trim()) {
    return quantity.trim()
  }

  return extractQuantity(asRecord(candidate.normalizedParams))
    || extractQuantity(asRecord(candidate.extractedParams))
    || extractQuantity(asRecord(candidate.mergedParams))
    || extractQuantity(asRecord(candidate.quoteParams))
    || extractQuantity(asRecord(candidate.recommendedParams))
    || extractQuantity(asRecord(candidate.mergedRecommendedParams))
    || extractQuantity(asRecord(candidate.estimatedData))
    || extractQuantity(asRecord(candidate.mainItem))
}

function extractReferenceFileFlag(candidate?: JsonRecord): boolean {
  if (!candidate) return false

  if (candidate.hasReferenceFile === true) return true
  if (Array.isArray(candidate.referenceFiles) && candidate.referenceFiles.length > 0) return true

  return extractReferenceFileFlag(asRecord(candidate.packagingContext))
    || extractReferenceFileFlag(asRecord(candidate.packagingReview))
    || extractReferenceFileFlag(asRecord(candidate.normalizedParams))
    || extractReferenceFileFlag(asRecord(candidate.mergedParams))
    || extractReferenceFileFlag(asRecord(candidate.quoteParams))
    || extractReferenceFileFlag(asRecord(candidate.estimatedData))
}

function extractPackagingReason(candidate?: JsonRecord): string | undefined {
  if (!candidate) return undefined

  const packagingReview = asRecord(candidate.packagingReview)
  const directReason = typeof packagingReview?.statusReasonText === 'string' && packagingReview.statusReasonText.trim()
    ? packagingReview.statusReasonText.trim()
    : typeof packagingReview?.conciseExplanation === 'string' && packagingReview.conciseExplanation.trim()
    ? packagingReview.conciseExplanation.trim()
    : undefined

  if (directReason) {
    return directReason
  }

  return extractPackagingReason(asRecord(candidate.packagingContext))
    || extractPackagingReason(asRecord(candidate.normalizedParams))
    || extractPackagingReason(asRecord(candidate.mergedParams))
    || extractPackagingReason(asRecord(candidate.quoteParams))
    || extractPackagingReason(asRecord(candidate.estimatedData))
}

function getSignal(input: ConversationPresentationInput) {
  const candidates = [
    asRecord(input.latestQuoteParameters),
    ...(input.recentMessages || []).map((message) => asRecord(message.metadata)),
  ].filter(Boolean) as JsonRecord[]

  const productType = candidates.map((candidate) => extractProductType(candidate)).find(Boolean)
  const missingFields = candidates.map((candidate) => extractMissingFields(candidate)).find((fields) => fields.length > 0) || []
  const quantity = candidates.map((candidate) => extractQuantity(candidate)).find(Boolean)
  const hasReferenceFile = candidates.some((candidate) => extractReferenceFileFlag(candidate))
  const packagingReason = candidates.map((candidate) => extractPackagingReason(candidate)).find(Boolean)

  return {
    productType,
    missingFields,
    quantity,
    hasReferenceFile,
    packagingReason,
  }
}

export function getProductTypeDisplayName(productType?: string): string {
  if (!productType) return '未识别品类'
  const map: Record<string, string> = {
    album: '画册',
    flyer: '传单',
    business_card: '名片',
    poster: '海报',
    mailer_box: '飞机盒',
    tuck_end_box: '双插盒',
    window_box: '开窗彩盒',
    leaflet_insert: '说明书',
    box_insert: '内托',
    seal_sticker: '封口贴',
    unknown: '未识别品类',
  }

  return map[productType] || productType
}

export function getConversationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: '进行中',
    MISSING_FIELDS: '待补参数',
    QUOTED: '已出报价',
    PENDING_HUMAN: '待人工跟进',
    CLOSED: '已关闭',
    quoted: '正式报价',
    estimated: '参考报价',
    missing_fields: '待补参数',
    handoff_required: '人工复核',
  }

  return map[status] || status
}

export function getReflectionRecordStatusLabel(status: string): string {
  const map: Record<string, string> = {
    NEW: '待处理',
    REVIEWED: '已复核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
  }

  return map[status] || status
}

export function getConversationScopeLabel(productType?: string): string {
  if (productType && isActiveAutoQuoteProductType(productType)) {
    return '当前活跃复杂包装'
  }

  if (productType && isSimpleProductType(productType)) {
    return '历史简单品类'
  }

  return '待人工归类'
}

export function buildConversationPresentation(input: ConversationPresentationInput): ConversationPresentationResult {
  const statusLabel = getConversationStatusLabel(input.status)
  const latestSnippet = compactText(input.latestMessage, 36)
  const signal = getSignal(input)
  const productLabel = getProductTypeDisplayName(signal.productType)
  const scopeLabel = getConversationScopeLabel(signal.productType)
  const isActiveScope = Boolean(signal.productType && isActiveAutoQuoteProductType(signal.productType))
  const quantityText = signal.quantity ? `${signal.quantity} 件` : ''
  const missingText = signal.missingFields.length > 0
    ? getMissingFieldsChineseText(signal.productType, signal.missingFields.slice(0, 2))
    : ''

  if (signal.productType && isActiveScope) {
    if (input.status === 'QUOTED') {
      return {
        title: `${productLabel}${quantityText ? `${quantityText}正式报价` : '正式报价确认'}`,
        topicSummary: latestSnippet ? `${statusLabel} · ${latestSnippet}` : `${statusLabel} · 当前复杂包装已进入报价结果查看阶段。`,
        productType: signal.productType,
        scopeLabel,
        isActiveScope,
      }
    }

    if (input.status === 'MISSING_FIELDS') {
      return {
        title: `${productLabel}${missingText ? `待补${missingText}` : '待补关键信息'}`,
        topicSummary: `${statusLabel} · ${missingText ? `当前仍缺少 ${missingText}` : latestSnippet || '需要继续追问关键参数。'}`,
        productType: signal.productType,
        scopeLabel,
        isActiveScope,
      }
    }

    if (input.status === 'PENDING_HUMAN') {
      const reasonText = signal.hasReferenceFile ? '已带文件，需人工复核' : signal.packagingReason || latestSnippet || '需要人工继续跟进'
      return {
        title: `${productLabel}${signal.hasReferenceFile ? '文件待人工复核' : '待人工跟进'}`,
        topicSummary: `${statusLabel} · ${compactText(reasonText, 32)}`,
        productType: signal.productType,
        scopeLabel,
        isActiveScope,
      }
    }

    return {
      title: `${productLabel}${quantityText ? `${quantityText}询价跟进` : '询价跟进'}`,
      topicSummary: latestSnippet ? `${statusLabel} · ${latestSnippet}` : `${statusLabel} · 当前复杂包装会话仍在推进中。`,
      productType: signal.productType,
      scopeLabel,
      isActiveScope,
    }
  }

  if (signal.productType && isSimpleProductType(signal.productType)) {
    return {
      title: `${productLabel}历史询价记录`,
      topicSummary: `${scopeLabel} · ${statusLabel}${latestSnippet ? ` · ${latestSnippet}` : ' · 当前仅保留历史观察，不纳入主自动报价看板。'}`,
      productType: signal.productType,
      scopeLabel,
      isActiveScope: false,
    }
  }

  if (latestSnippet) {
    return {
      title: `${input.status === 'PENDING_HUMAN' ? '待人工判断的询价' : '询价主题'}：${compactText(latestSnippet, 24)}`,
      topicSummary: `${statusLabel} · ${scopeLabel}`,
      scopeLabel,
      isActiveScope: false,
    }
  }

  return {
    title: `会话 ${input.conversationId}`,
    topicSummary: `${statusLabel} · ${scopeLabel}`,
    scopeLabel,
    isActiveScope: false,
  }
}

export function getQuoteRecordStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待确认',
    APPROVED: '已确认',
    REJECTED: '已作废',
  }

  return map[status] || status
}