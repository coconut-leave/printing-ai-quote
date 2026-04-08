import type { ChatIntent } from './detectIntent'
import { isOutOfScopeInquiry } from '@/server/quote/workflowPolicy'

export type AnswerabilityDecision = {
  canAnswer: boolean
  shouldHandoff: boolean
  reason: string
  reply?: string
}

export type AnswerabilityInput = {
  message: string
  intent: ChatIntent
  consultationResolved?: boolean
  hasContextProductType?: boolean
  hasComplexPackagingState?: boolean
  hasComplexPackagingRequest?: boolean
  insufficientKnowledge?: boolean
}

type HandoffReplyReason = 'out_of_scope_or_complex' | 'insufficient_safe_context' | 'unsupported_or_unstable_answer'

const BLOCKING_COMPLEXITY_KEYWORDS = ['磁吸', '异形', '吸塑', 'eva', '木盒', '金属', '皮革', '亚克力']
const SUPPORTED_SUBJECT_KEYWORDS = [
  '画册', '传单', '名片', '海报',
  '飞机盒', '双插盒', '开窗彩盒', '开窗盒', '说明书', '内托', '封口贴', '透明贴纸',
  '包装', '外包装', '包装盒', '纸盒', '纸箱', '盒子', '箱子', '盒型', '彩盒',
]
const CONSULTATION_OR_QUOTE_CUES = ['推荐', '方案', '怎么做', '怎么选', '怎么卖', '报价', '价格', '多少钱', '适合什么']
const WEAK_STANDALONE_QUERIES = ['报价', '价格', '多少钱', '怎么卖', '怎么做', '怎么选', '推荐', '方案', '能做吗', '这个呢', '这种呢']
const REFERENTIAL_AMBIGUOUS_CUES = ['这种', '这个', '那种', '那个', '这类', '那类', '这种结构', '这个结构']

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function normalizeText(message: string): string {
  return message.trim().toLowerCase()
}

function hasSupportedSubject(text: string): boolean {
  return includesAny(text, SUPPORTED_SUBJECT_KEYWORDS)
}

function looksLikeWeakStandaloneQuery(text: string): boolean {
  if (WEAK_STANDALONE_QUERIES.includes(text)) {
    return true
  }

  return text.length <= 10 && includesAny(text, WEAK_STANDALONE_QUERIES)
}

function looksLikeReferentiallyAmbiguousQuery(text: string): boolean {
  return includesAny(text, REFERENTIAL_AMBIGUOUS_CUES) && includesAny(text, CONSULTATION_OR_QUOTE_CUES)
}

function looksLikeGuidanceSeekingQuery(text: string, intent: ChatIntent): boolean {
  if (['MATERIAL_CONSULTATION', 'PROCESS_CONSULTATION', 'SPEC_RECOMMENDATION', 'SOLUTION_RECOMMENDATION', 'BARGAIN_REQUEST'].includes(intent)) {
    return true
  }

  if (['QUOTE_REQUEST', 'PARAM_SUPPLEMENT', 'RECOMMENDATION_CONFIRMATION'].includes(intent)) {
    return includesAny(text, CONSULTATION_OR_QUOTE_CUES)
  }

  return includesAny(text, CONSULTATION_OR_QUOTE_CUES)
}

export function buildStableHandoffReply(reason: HandoffReplyReason): string {
  switch (reason) {
    case 'out_of_scope_or_complex':
      return '抱歉，这类问题我这边暂时还不能稳定处理，先为您转接人工服务。'
    case 'insufficient_safe_context':
      return '抱歉，当前信息还不足以让我安全给出建议，先帮您转人工进一步确认。'
    case 'unsupported_or_unstable_answer':
    default:
      return '抱歉，这类需求我这边暂时没法稳妥判断，先转给人工客服协助您处理。'
  }
}

export function assessAnswerability(input: AnswerabilityInput): AnswerabilityDecision {
  const text = normalizeText(input.message)
  const hasStableContext = Boolean(input.hasContextProductType || input.hasComplexPackagingState || input.hasComplexPackagingRequest)
  const hasStableSubject = hasSupportedSubject(text)
  const isConsultationLayerIntent = ['MATERIAL_CONSULTATION', 'PROCESS_CONSULTATION', 'SPEC_RECOMMENDATION', 'SOLUTION_RECOMMENDATION', 'BARGAIN_REQUEST'].includes(input.intent)
  const isQuoteLayerIntent = ['QUOTE_REQUEST', 'PARAM_SUPPLEMENT', 'RECOMMENDATION_CONFIRMATION'].includes(input.intent)

  if (!input.hasComplexPackagingRequest && (isOutOfScopeInquiry(text) || includesAny(text, BLOCKING_COMPLEXITY_KEYWORDS))) {
    return {
      canAnswer: false,
      shouldHandoff: true,
      reason: 'out_of_scope_or_complex',
      reply: buildStableHandoffReply('out_of_scope_or_complex'),
    }
  }

  if (input.consultationResolved) {
    return {
      canAnswer: true,
      shouldHandoff: false,
      reason: 'stable_consultation_available',
    }
  }

  if (input.insufficientKnowledge && looksLikeGuidanceSeekingQuery(text, input.intent)) {
    return {
      canAnswer: false,
      shouldHandoff: true,
      reason: 'unsupported_or_unstable_answer',
      reply: buildStableHandoffReply('unsupported_or_unstable_answer'),
    }
  }

  if (!hasStableContext && !hasStableSubject && looksLikeReferentiallyAmbiguousQuery(text)) {
    return {
      canAnswer: false,
      shouldHandoff: true,
      reason: 'insufficient_safe_context',
      reply: buildStableHandoffReply('insufficient_safe_context'),
    }
  }

  if (!hasStableContext && !hasStableSubject && looksLikeWeakStandaloneQuery(text)) {
    return {
      canAnswer: false,
      shouldHandoff: true,
      reason: 'insufficient_safe_context',
      reply: buildStableHandoffReply('insufficient_safe_context'),
    }
  }

  if (isConsultationLayerIntent && !input.consultationResolved && !hasStableContext && hasStableSubject && looksLikeGuidanceSeekingQuery(text, input.intent)) {
    return {
      canAnswer: false,
      shouldHandoff: true,
      reason: 'unsupported_or_unstable_answer',
      reply: buildStableHandoffReply('unsupported_or_unstable_answer'),
    }
  }

  if (isQuoteLayerIntent && !hasStableContext && !hasStableSubject && looksLikeWeakStandaloneQuery(text)) {
    return {
      canAnswer: false,
      shouldHandoff: true,
      reason: 'insufficient_safe_context',
      reply: buildStableHandoffReply('insufficient_safe_context'),
    }
  }

  return {
    canAnswer: true,
    shouldHandoff: false,
    reason: 'stable_or_low_risk_to_continue',
  }
}