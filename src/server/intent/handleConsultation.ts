import { ChatIntent } from './detectIntent'
import { resolveKnowledgeCard } from '@/server/knowledge/registry'
import { getDisplayParamEntries } from '@/lib/catalog/helpers'

type ConsultationReply = {
  status: 'consultation_reply'
  reply: string
  consultationIntent: ChatIntent
  matchedKnowledgeCardId: string
  matchedKnowledgeCardTitle: string
  consultationCategory: string
  hasRecommendedParams: boolean
  productType?: string
  recommendedParams?: {
    productType?: string
    recommendedParams: Record<string, any>
    note: string
  }
}

function formatProductType(productType?: string): string {
  const map: Record<string, string> = {
    album: '画册',
    flyer: '传单',
    business_card: '名片',
    poster: '海报',
  }
  return map[productType || ''] || '这类印品'
}

function buildRecommendedSummary(productType: string | undefined, recommendedParams: Record<string, any>): string | null {
  const entries = getDisplayParamEntries(productType, recommendedParams)
    .filter((entry) => entry.field !== 'productType')
    .slice(0, 5)

  if (entries.length === 0) {
    return null
  }

  return entries.map((entry) => `${entry.label}${entry.value}`).join('、')
}

function buildConsultationReplyText(params: {
  intent: ChatIntent
  shortAnswer: string
  productType?: string
  recommendedParams?: Record<string, any>
  note?: string
}): string {
  const parts = [params.shortAnswer.trim()]

  if (params.recommendedParams) {
    const productLabel = formatProductType(params.productType)
    const summary = buildRecommendedSummary(params.productType, params.recommendedParams)

    if (summary) {
      const suggestionLead = params.intent === 'SOLUTION_RECOMMENDATION'
        ? `如果您按这个场景先做第一版 ${productLabel}，常见会先按`
        : `如果继续往下收敛成一版可落地的 ${productLabel} 配置，常见会先按`
      parts.push(`${suggestionLead}${summary}来起步。`)
    }

    if (params.note) {
      parts.push(params.note.trim())
    }

    parts.push('如果您认可这套建议，可以直接说“按这个方案报价”；如果想再省一点或更正式一点，也可以继续告诉我。')
    return parts.join(' ')
  }

  parts.push('如果您愿意，可以继续告诉我用途、数量或预算，我再帮您收敛成一版更贴近业务场景的常见配置。')
  return parts.join(' ')
}

export function handleConsultationIntent(intent: ChatIntent, message: string): ConsultationReply | null {
  const knowledgeCard = resolveKnowledgeCard(intent, message)
  if (!knowledgeCard) {
    return null
  }

  const productType = knowledgeCard.applicableProductTypes?.[0]
  const recommendedParams = knowledgeCard.recommendedParams
    ? {
        productType,
        recommendedParams: knowledgeCard.recommendedParams,
        note: knowledgeCard.note || '这是一版常见起步配置，正式价格仍以系统报价或人工复核为准。',
      }
    : undefined

  return {
    status: 'consultation_reply',
    consultationIntent: intent,
    matchedKnowledgeCardId: knowledgeCard.id,
    matchedKnowledgeCardTitle: knowledgeCard.title,
    consultationCategory: knowledgeCard.category,
    hasRecommendedParams: Boolean(recommendedParams),
    productType,
    reply: buildConsultationReplyText({
      intent,
      shortAnswer: knowledgeCard.shortAnswer,
      productType,
      recommendedParams: recommendedParams?.recommendedParams,
      note: recommendedParams?.note,
    }),
    recommendedParams,
  }
}