import { ChatIntent } from '@/server/intent/detectIntent'

export type FlowLayer = 'knowledge' | 'recommendation' | 'pricing_routing' | 'handoff'

export type IntentBoundary = {
  intent: ChatIntent
  primaryLayer: FlowLayer
  summary: string
  crossesTo?: FlowLayer[]
  handoffPriority?: 'immediate' | 'conditional'
}

export const KNOWLEDGE_LAYER_INTENTS: ChatIntent[] = [
  'MATERIAL_CONSULTATION',
  'PROCESS_CONSULTATION',
  'SPEC_RECOMMENDATION',
]

export const RECOMMENDATION_LAYER_INTENTS: ChatIntent[] = [
  'SOLUTION_RECOMMENDATION',
  'RECOMMENDATION_CONFIRMATION',
  'BARGAIN_REQUEST',
]

export const PRICING_ROUTING_LAYER_INTENTS: ChatIntent[] = [
  'QUOTE_REQUEST',
  'PARAM_SUPPLEMENT',
  'PROGRESS_INQUIRY',
]

export const HANDOFF_PRIORITY_INTENTS: ChatIntent[] = [
  'FILE_REVIEW_REQUEST',
  'HUMAN_REQUEST',
  'COMPLAINT',
]

export const KNOWLEDGE_TO_RECOMMENDATION_INTENTS: ChatIntent[] = [
  'MATERIAL_CONSULTATION',
  'PROCESS_CONSULTATION',
  'SPEC_RECOMMENDATION',
]

export const RECOMMENDATION_TO_QUOTE_INTENTS: ChatIntent[] = [
  'RECOMMENDATION_CONFIRMATION',
]

export const RECOMMENDATION_PATCH_INTENTS: ChatIntent[] = [
  'PARAM_SUPPLEMENT',
]

const INTENT_BOUNDARIES: Record<ChatIntent, IntentBoundary> = {
  MATERIAL_CONSULTATION: {
    intent: 'MATERIAL_CONSULTATION',
    primaryLayer: 'knowledge',
    summary: '解释材料差异和适用场景，可顺带附一个常见推荐方案。',
    crossesTo: ['recommendation'],
  },
  PROCESS_CONSULTATION: {
    intent: 'PROCESS_CONSULTATION',
    primaryLayer: 'knowledge',
    summary: '解释装订、印刷或后道工艺差异，可顺带附一个常见推荐方案。',
    crossesTo: ['recommendation'],
  },
  SPEC_RECOMMENDATION: {
    intent: 'SPEC_RECOMMENDATION',
    primaryLayer: 'knowledge',
    summary: '回答常见尺寸、页数、克重等标准规格问题，可自然过渡到推荐方案。',
    crossesTo: ['recommendation'],
  },
  SOLUTION_RECOMMENDATION: {
    intent: 'SOLUTION_RECOMMENDATION',
    primaryLayer: 'recommendation',
    summary: '提供标准方案或常见配置，产出 recommendedParams 作为后续报价基础。',
    crossesTo: ['pricing_routing'],
  },
  RECOMMENDATION_CONFIRMATION: {
    intent: 'RECOMMENDATION_CONFIRMATION',
    primaryLayer: 'recommendation',
    summary: '用户确认采用上一轮推荐方案，允许正式进入报价规则层。',
    crossesTo: ['pricing_routing'],
  },
  QUOTE_REQUEST: {
    intent: 'QUOTE_REQUEST',
    primaryLayer: 'pricing_routing',
    summary: '进入参数提取、缺参判断、estimated/quoted/handoff 的报价主链路。',
  },
  PARAM_SUPPLEMENT: {
    intent: 'PARAM_SUPPLEMENT',
    primaryLayer: 'pricing_routing',
    summary: '默认是报价补参；如果存在 recommendedParams，则也可作为推荐方案 patch。',
    crossesTo: ['recommendation'],
  },
  FILE_REVIEW_REQUEST: {
    intent: 'FILE_REVIEW_REQUEST',
    primaryLayer: 'handoff',
    summary: '设计文件、审稿、复杂附件相关请求，MVP 默认直接转人工。',
    handoffPriority: 'immediate',
  },
  HUMAN_REQUEST: {
    intent: 'HUMAN_REQUEST',
    primaryLayer: 'handoff',
    summary: '用户明确要求人工，优先满足人工接管。',
    handoffPriority: 'immediate',
  },
  COMPLAINT: {
    intent: 'COMPLAINT',
    primaryLayer: 'handoff',
    summary: '投诉、情绪化、风险会话默认进入人工处理。',
    handoffPriority: 'immediate',
  },
  BARGAIN_REQUEST: {
    intent: 'BARGAIN_REQUEST',
    primaryLayer: 'recommendation',
    summary: '不直接改正式报价，主要引导到更经济的推荐方案或参考价路径。',
    crossesTo: ['pricing_routing'],
  },
  PROGRESS_INQUIRY: {
    intent: 'PROGRESS_INQUIRY',
    primaryLayer: 'pricing_routing',
    summary: '查询当前会话状态、缺参状态、是否已报价或是否已转人工。',
  },
  SAMPLE_REQUEST: {
    intent: 'SAMPLE_REQUEST',
    primaryLayer: 'handoff',
    summary: '当前 MVP 只做轻量回复记录样品需求，更完整处理仍建议人工跟进。',
    handoffPriority: 'conditional',
  },
  UNKNOWN: {
    intent: 'UNKNOWN',
    primaryLayer: 'knowledge',
    summary: '兜底澄清，不直接进入报价或人工，优先继续收集意图。',
  },
}

export function getIntentBoundary(intent: ChatIntent): IntentBoundary {
  return INTENT_BOUNDARIES[intent]
}

export function getIntentPrimaryLayer(intent: ChatIntent): FlowLayer {
  return getIntentBoundary(intent).primaryLayer
}

export function isKnowledgeLayerIntent(intent: ChatIntent): boolean {
  return KNOWLEDGE_LAYER_INTENTS.includes(intent)
}

export function isRecommendationLayerIntent(intent: ChatIntent): boolean {
  return RECOMMENDATION_LAYER_INTENTS.includes(intent)
}

export function isPricingRoutingIntent(intent: ChatIntent): boolean {
  return PRICING_ROUTING_LAYER_INTENTS.includes(intent)
}

export function isImmediateHandoffIntent(intent: ChatIntent): boolean {
  return HANDOFF_PRIORITY_INTENTS.includes(intent)
}

export function isNonQuoteFlowIntent(intent: ChatIntent): boolean {
  return !isPricingRoutingIntent(intent) && intent !== 'RECOMMENDATION_CONFIRMATION'
}

export function canKnowledgeIntentOfferRecommendation(intent: ChatIntent): boolean {
  return KNOWLEDGE_TO_RECOMMENDATION_INTENTS.includes(intent)
}

export function canRecommendationEnterQuote(intent: ChatIntent): boolean {
  return RECOMMENDATION_TO_QUOTE_INTENTS.includes(intent)
}

export function canPatchRecommendation(intent: ChatIntent): boolean {
  return RECOMMENDATION_PATCH_INTENTS.includes(intent)
}

export function getFlowBoundarySnapshot(): IntentBoundary[] {
  return Object.values(INTENT_BOUNDARIES)
}