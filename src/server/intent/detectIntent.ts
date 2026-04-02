export type ChatIntent =
  | 'QUOTE_REQUEST'
  | 'PARAM_SUPPLEMENT'
  | 'RECOMMENDATION_CONFIRMATION'
  | 'FILE_REVIEW_REQUEST'
  | 'PROGRESS_INQUIRY'
  | 'SAMPLE_REQUEST'
  | 'COMPLAINT'
  | 'HUMAN_REQUEST'
  | 'BARGAIN_REQUEST'
  | 'MATERIAL_CONSULTATION'
  | 'PROCESS_CONSULTATION'
  | 'SPEC_RECOMMENDATION'
  | 'SOLUTION_RECOMMENDATION'
  | 'UNKNOWN'

export type DetectIntentInput = {
  message: string
  conversationStatus?: string | null
  hasHistoricalParams?: boolean
  hasRecommendedParams?: boolean
}

export type DetectIntentResult = {
  intent: ChatIntent
  reason: string
}

const FILE_KEYWORDS = ['pdf', 'ai', 'cdr', 'psd', 'zip', '附件', '设计稿', '文件', '审稿', '看稿']
const HUMAN_KEYWORDS = ['人工', '客服', '销售', '业务员', '经理', '专员', '找人', '转人工', '人工处理', '电话沟通']
const PROGRESS_KEYWORDS = ['进度', '到哪了', '什么时候', '多久', '好了没', '报价好了没', '有结果吗', '还要多久', '什么时候出']
const SAMPLE_KEYWORDS = ['打样', '样品', '样册', '样张', 'sample']
const COMPLAINT_KEYWORDS = ['投诉', '不满意', '太慢', '太贵了', '坑人', '有问题', '差评', '生气', '不合理', '离谱']
const BARGAIN_KEYWORDS = [
  '便宜点',
  '优惠',
  '折扣',
  '最低价',
  '再少点',
  '能不能便宜',
  '降价',
  '再优惠',
  '便宜一些',
  '更便宜一点',
  '更便宜的',
  '预算有限',
  '预算不高',
  '经济方案',
  '经济一点',
  '更经济一点',
  '更经济的',
  '更经济的版本',
  '控成本',
  '低成本',
  '实惠一点',
  '省一点',
  '性价比',
]
const QUOTE_KEYWORDS = ['报价', '价格', '多少钱', '怎么卖', '什么价', '询价', '核价']
const PRODUCT_KEYWORDS = ['画册', '册子', 'brochure', 'album', '传单', 'flyer', '名片', '海报', 'poster']
const NEW_QUOTE_STARTER_KEYWORDS = ['我想印', '想印', '要印', '帮我报价', '给我报个价', '报个价', '重新报价', '重新核价']
const MATERIAL_KEYWORDS = ['铜版纸', '哑粉', '哑粉纸', '哑光纸', '艺术纸', '双胶纸', '白卡', '纸张', '克重']
const PROCESS_KEYWORDS = ['骑马钉', '胶装', '锁线', '精装', '装订', '覆膜', '烫金', 'uv', '工艺']
const SPEC_KEYWORDS = ['a3', 'a4', 'a5', '尺寸', '规格', '多少页', '页数', '90x54', '名片尺寸']
const SOLUTION_KEYWORDS = ['方案', '配置', '搭配', '推荐一个', '常见方案', '标准方案']
const CONSULTATION_QUESTION_KEYWORDS = ['区别', '介绍', '推荐', '怎么选', '哪个好', '适合', '一般', '合适', '优缺点', '建议', '什么意思']
const RECOMMENDATION_CONFIRM_REFERENCE_KEYWORDS = [
  '按这个方案', '按这个来', '那就按这个', '那就这个', '就这个方案', '就这个', '按此方案', '照这个',
  '按这个报价', '按这个方案估价', '就按这个方案估价', '按这个估个参考价', '现在算一下', '现在估一下',
]
const RECOMMENDATION_AFFIRMATION_KEYWORDS = ['可以', '行', '那就', '就按', '按这个', '按此', '照这个']
const RECOMMENDATION_ADJUSTMENT_KEYWORDS = ['改成', '改为', '改一下', '页数改', '数量改', '尺寸改', '封面', '内页', '胶装', '骑马钉', '还是']
const RECOMMENDATION_ACTION_KEYWORDS = ['报价', '估一下', '估个价', '估个参考价', '参考价', '报个价', '算一下', '再算', '先估', '再报', '核价']
const RECOMMENDATION_EXCLUSION_KEYWORDS = [
  '还有别的推荐', '还有别的方案', '还有其他方案', '再推荐一个', '再给我推荐', '重新推荐',
  '更便宜的吗', '便宜一点的', '还有更便宜', '区别', '再说一下', '差多少', '哪个好', '怎么选',
]
const RECOMMENDATION_WEAK_REPLY_KEYWORDS = ['嗯可以', '好的', '明白了', '知道了', '收到', '了解了']
const RECOMMENDATION_REREQUEST_KEYWORDS = [
  '不要这个方案',
  '不要这个',
  '再推荐一个',
  '换个',
  '换一个',
  '再来一个',
  '给我一个更常见的方案',
  '更常见一点',
  '更常见的',
  '更标准一点',
  '更常规一点',
  '更通用一点',
  '适合企业宣传册的版本',
  '适合',
  '来个适合',
  '版本',
]
const PARAM_HINT_KEYWORDS = [
  'a3', 'a4', 'a5', 'mm', 'cm', 'g', '克', '铜版纸', '哑粉', '艺术纸', '骑马钉', '胶装', '锁线',
  '单面', '双面', '覆膜', '哑膜', '光膜', 'uv', '上光', '击凸', '压凸', '页', '张', '本', '份', '数量', '尺寸', '内页', '封面',
]

function looksLikeRecommendationReselection(text: string): boolean {
  const hasRerequestKeyword = includesAny(text, RECOMMENDATION_REREQUEST_KEYWORDS)
  const hasBudgetIntent = includesAny(text, BARGAIN_KEYWORDS)
  return hasRerequestKeyword || hasBudgetIntent
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

export function extractExplicitProductType(text: string): 'album' | 'flyer' | 'business_card' | 'poster' | undefined {
  const normalizedText = text.trim().toLowerCase()

  if (normalizedText.includes('名片')) return 'business_card'
  if (normalizedText.includes('海报') || normalizedText.includes('poster')) return 'poster'
  if (normalizedText.includes('传单') || normalizedText.includes('flyer')) return 'flyer'
  if (
    normalizedText.includes('画册') ||
    normalizedText.includes('册子') ||
    normalizedText.includes('brochure') ||
    normalizedText.includes('album')
  ) {
    return 'album'
  }

  return undefined
}

function looksLikeParameterSupplement(text: string): boolean {
  const hasDigits = /\d/.test(text)
  const hasParamWords = includesAny(text, PARAM_HINT_KEYWORDS)
  const isShortMessage = text.length <= 80
  return (hasDigits || hasParamWords) && isShortMessage
}

function hasCompleteQuoteSignal(text: string): boolean {
  const hasProduct = includesAny(text, PRODUCT_KEYWORDS)
  const hasQuantityOrSpec = /\d+\s*(本|张|份|页|mm|cm|g|克)/.test(text) || includesAny(text, ['数量', '尺寸', '成品'])
  const hasQuoteKeyword = includesAny(text, QUOTE_KEYWORDS)
  return (hasProduct && hasQuantityOrSpec) || (hasProduct && hasQuoteKeyword)
}

export function looksLikeFreshQuoteRequest(text: string): boolean {
  const normalizedText = text.trim().toLowerCase()
  const hasProduct = includesAny(normalizedText, PRODUCT_KEYWORDS)
  return hasCompleteQuoteSignal(normalizedText) || (hasProduct && includesAny(normalizedText, NEW_QUOTE_STARTER_KEYWORDS))
}

function looksLikeConsultation(text: string): boolean {
  return includesAny(text, CONSULTATION_QUESTION_KEYWORDS) || text.includes('？') || text.includes('?')
}

function shouldExcludeRecommendationConfirmation(text: string): boolean {
  if (includesAny(text, RECOMMENDATION_EXCLUSION_KEYWORDS)) {
    return true
  }

  if (includesAny(text, RECOMMENDATION_WEAK_REPLY_KEYWORDS)) {
    return true
  }

  if (looksLikeConsultation(text) && !includesAny(text, RECOMMENDATION_ACTION_KEYWORDS)) {
    return true
  }

  return false
}

function looksLikeRecommendationConfirmation(text: string): boolean {
  if (shouldExcludeRecommendationConfirmation(text)) {
    return false
  }

  const hasAction = includesAny(text, RECOMMENDATION_ACTION_KEYWORDS)
  const hasReference = includesAny(text, RECOMMENDATION_CONFIRM_REFERENCE_KEYWORDS)
  const hasAdjustment = includesAny(text, RECOMMENDATION_ADJUSTMENT_KEYWORDS)
  const hasAffirmation = includesAny(text, RECOMMENDATION_AFFIRMATION_KEYWORDS)

  if (hasReference && (hasAction || text.length <= 12)) {
    return true
  }

  if (hasAdjustment && hasAction) {
    return true
  }

  if (hasAction && hasAffirmation) {
    return true
  }

  if (hasAction && (text.includes('现在') || text.includes('就按这个') || text.includes('按这个报价'))) {
    return true
  }

  return false
}

export function detectIntent(input: DetectIntentInput): DetectIntentResult {
  const text = input.message.trim().toLowerCase()

  if (includesAny(text, FILE_KEYWORDS)) {
    return { intent: 'FILE_REVIEW_REQUEST', reason: 'file_keywords_detected' }
  }

  if (includesAny(text, HUMAN_KEYWORDS)) {
    return { intent: 'HUMAN_REQUEST', reason: 'human_keywords_detected' }
  }

  if (includesAny(text, COMPLAINT_KEYWORDS)) {
    return { intent: 'COMPLAINT', reason: 'complaint_keywords_detected' }
  }

  if (includesAny(text, PROGRESS_KEYWORDS)) {
    return { intent: 'PROGRESS_INQUIRY', reason: 'progress_keywords_detected' }
  }

  if (includesAny(text, SAMPLE_KEYWORDS)) {
    return { intent: 'SAMPLE_REQUEST', reason: 'sample_keywords_detected' }
  }

  if (input.hasRecommendedParams && looksLikeRecommendationReselection(text)) {
    if (includesAny(text, BARGAIN_KEYWORDS)) {
      return { intent: 'BARGAIN_REQUEST', reason: 'recommendation_reselection_budget_detected' }
    }

    return { intent: 'SOLUTION_RECOMMENDATION', reason: 'recommendation_reselection_detected' }
  }

  if (includesAny(text, BARGAIN_KEYWORDS)) {
    return { intent: 'BARGAIN_REQUEST', reason: 'bargain_keywords_detected' }
  }

  if (!hasCompleteQuoteSignal(text)) {
    if (includesAny(text, SOLUTION_KEYWORDS) && (looksLikeConsultation(text) || includesAny(text, PRODUCT_KEYWORDS))) {
      return { intent: 'SOLUTION_RECOMMENDATION', reason: 'solution_consultation_detected' }
    }

    if (includesAny(text, PROCESS_KEYWORDS) && looksLikeConsultation(text)) {
      return { intent: 'PROCESS_CONSULTATION', reason: 'process_consultation_detected' }
    }

    if (includesAny(text, MATERIAL_KEYWORDS) && (looksLikeConsultation(text) || text.includes('怎么卖'))) {
      return { intent: 'MATERIAL_CONSULTATION', reason: 'material_consultation_detected' }
    }

    if ((includesAny(text, SPEC_KEYWORDS) || includesAny(text, PRODUCT_KEYWORDS)) && looksLikeConsultation(text)) {
      return { intent: 'SPEC_RECOMMENDATION', reason: 'spec_recommendation_detected' }
    }
  }

  if (looksLikeFreshQuoteRequest(text)) {
    return { intent: 'QUOTE_REQUEST', reason: 'fresh_quote_request_detected' }
  }

  if (input.hasRecommendedParams && looksLikeRecommendationConfirmation(text)) {
    return { intent: 'RECOMMENDATION_CONFIRMATION', reason: 'recommendation_confirmation_detected' }
  }

  if (input.hasRecommendedParams && looksLikeParameterSupplement(text) && !looksLikeConsultation(text)) {
    return { intent: 'PARAM_SUPPLEMENT', reason: 'recommendation_patch_like_message' }
  }

  if (
    (input.conversationStatus === 'MISSING_FIELDS' || input.hasHistoricalParams) &&
    looksLikeParameterSupplement(text) &&
    !includesAny(text, QUOTE_KEYWORDS)
  ) {
    return { intent: 'PARAM_SUPPLEMENT', reason: 'conversation_context_plus_param_like_message' }
  }

  if (includesAny(text, QUOTE_KEYWORDS) || includesAny(text, PRODUCT_KEYWORDS) || looksLikeParameterSupplement(text)) {
    return { intent: 'QUOTE_REQUEST', reason: 'quote_or_product_keywords_detected' }
  }

  return { intent: 'UNKNOWN', reason: 'no_clear_intent_detected' }
}

export function getIntentPlaceholderReply(intent: ChatIntent): string {
  switch (intent) {
    case 'RECOMMENDATION_CONFIRMATION':
      return '已识别为推荐方案确认。系统将基于上一轮推荐方案继续进入报价流程。'
    case 'PROGRESS_INQUIRY':
      return '已识别为进度咨询。当前 MVP 暂不提供自动进度查询，请联系人工或查看会话最新状态。'
    case 'SAMPLE_REQUEST':
      return '已识别为打样/样品需求。当前 MVP 暂不自动处理打样流程，请由人工继续确认。'
    case 'BARGAIN_REQUEST':
      return '已识别为议价需求。当前 MVP 暂不自动议价，请由人工按标准规则继续跟进。'
    case 'UNKNOWN':
    default:
      return '已收到您的消息。您可以直接告诉我产品、尺寸和数量；如果需要人工协助，也可以直接说“转人工”。'
  }
}
