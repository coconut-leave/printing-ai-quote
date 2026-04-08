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

import { looksLikeAbnormalNoiseInput } from '@/server/intent/inputStability'

const FILE_EXTENSION_KEYWORDS = ['pdf', 'cdr', 'psd', 'zip']
const FILE_CONTEXT_KEYWORDS = ['附件', '设计稿', '源文件', '稿件', '文件', '审稿', '看稿', '排版文件']
const FILE_ACTION_KEYWORDS = ['上传', '发你', '发给你', '帮我看', '看看', '核对', '按文件报价', '按稿报价', '文件报价', '文件核价']
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
  '预算不要太高',
  '预算别太高',
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
const PRODUCT_KEYWORDS = ['画册', '册子', 'brochure', 'album', '传单', 'flyer', '名片', '海报', 'poster', '飞机盒', '双插盒', '开窗彩盒', '彩盒', '说明书', '内托', '封口贴', '透明贴纸', '包装盒']
const PACKAGING_PRODUCT_KEYWORDS = ['飞机盒', '双插盒', '开窗彩盒', '开窗盒', '彩盒', '说明书', '内托', '封口贴', '透明贴纸', '包装盒']
const GENERAL_PACKAGING_KEYWORDS = ['纸盒', '纸箱', '盒子', '箱子', '盒型', '包装', '包装盒', '彩盒', '外包装']
const NEW_QUOTE_STARTER_KEYWORDS = ['我想印', '想印', '要印', '帮我报价', '给我报个价', '报个价', '重新报价', '重新核价']
const MATERIAL_KEYWORDS = ['铜版纸', '哑粉', '哑粉纸', '哑光纸', '艺术纸', '双胶纸', '白卡', '纸张', '克重', '材质']
const PROCESS_KEYWORDS = ['骑马钉', '胶装', '锁线', '精装', '装订', '覆膜', '烫金', 'uv', '工艺']
const SPEC_KEYWORDS = ['a3', 'a4', 'a5', '尺寸', '规格', '多少页', '页数', '90x54', '名片尺寸']
const SOLUTION_KEYWORDS = ['方案', '配置', '搭配', '推荐一个', '常见方案', '标准方案']
const CONSULTATION_QUESTION_KEYWORDS = ['区别', '介绍', '推荐', '怎么选', '哪个好', '适合', '一般', '合适', '优缺点', '建议', '什么意思']
const CONSULTATIVE_PACKAGING_PHRASES = [
  '怎么卖',
  '怎么报价',
  '一般怎么报价',
  '怎么收费',
  '一般多少钱',
  '一般什么价',
  '这种包装一般多少钱',
  '一般怎么做',
  '怎么做',
  '有哪些能做',
  '有什么方案',
  '有哪些方案',
  '有什么推荐',
  '有哪些推荐',
  '推荐什么',
  '一般推荐什么',
  '有哪些常见方案',
  '推荐一下',
  '外包装推荐',
  '外包装怎么选',
  '盒子怎么选',
  '怎么选',
  '盒型能做',
  '能做什么盒型',
  '做什么盒型',
  '用什么盒型',
  '适合什么盒型',
  '什么盒型合适',
  '想做个包装',
  '想做个盒子',
  '做个包装',
  '做个盒子',
  '做外包装',
  '想做外包装',
]
const PACKAGING_USE_CASE_KEYWORDS = ['装', '用途', '场景', '护肤品', '化妆品', '美妆', '赠品', '礼品', '卡片', '小卡片']
const RECOMMENDATION_CONFIRM_REFERENCE_KEYWORDS = [
  '按这个方案', '按这个来', '那就按这个', '那就这个', '就这个方案', '就这个', '按此方案', '照这个',
  '按这个报价', '按这个方案估价', '就按这个方案估价', '按这个估个参考价', '现在算一下', '现在估一下',
  '按你推荐的来', '按你推荐的那个方案', '按你说的那个方案', '就这个规格', '那就按这个做', '按这个做', '行那你算吧',
]
const RECOMMENDATION_AFFIRMATION_KEYWORDS = ['可以', '行', '那就', '就按', '按这个', '按此', '照这个']
const RECOMMENDATION_ADJUSTMENT_KEYWORDS = ['改成', '改为', '改一下', '页数改', '数量改', '尺寸改', '封面', '内页', '胶装', '骑马钉', '还是']
const RECOMMENDATION_ACTION_KEYWORDS = ['报价', '估一下', '估个价', '估个参考价', '参考价', '报个价', '算一下', '再算', '先估', '再报', '核价', '算吧']
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

function hasStandaloneLatinToken(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text)
}

export function hasStrongFileReviewSignal(message: string): boolean {
  const text = message.trim().toLowerCase()
  const hasContext = includesAny(text, FILE_CONTEXT_KEYWORDS)
  const hasAction = includesAny(text, FILE_ACTION_KEYWORDS)
  const hasExplicitFileQuote = includesAny(text, ['按文件报价', '按稿报价', '文件报价', '文件核价'])
  const hasFileExtension = FILE_EXTENSION_KEYWORDS.some((keyword) => hasStandaloneLatinToken(text, keyword))
  const hasAiFileExtension = hasStandaloneLatinToken(text, 'ai')

  if (hasExplicitFileQuote) {
    return true
  }

  if ((hasFileExtension || hasAiFileExtension) && (hasContext || hasAction || text.includes('报价') || text.includes('核价'))) {
    return true
  }

  if ((text.includes('设计稿') || text.includes('审稿') || text.includes('看稿')) && (hasAction || text.includes('报价') || text.includes('核价'))) {
    return true
  }

  return false
}

export function extractExplicitProductType(text: string):
  | 'album'
  | 'flyer'
  | 'business_card'
  | 'poster'
  | 'mailer_box'
  | 'tuck_end_box'
  | 'window_box'
  | 'leaflet_insert'
  | 'box_insert'
  | 'seal_sticker'
  | 'foil_bag'
  | 'carton_packaging'
  | undefined {
  const normalizedText = text.trim().toLowerCase()

  if (normalizedText.includes('飞机盒') || normalizedText.includes('mailer box')) return 'mailer_box'
  if (normalizedText.includes('双插盒') || normalizedText.includes('tuck end')) return 'tuck_end_box'
  if (normalizedText.includes('开窗彩盒') || normalizedText.includes('window box')) return 'window_box'
  if (normalizedText.includes('说明书') || normalizedText.includes('leaflet')) return 'leaflet_insert'
  if (normalizedText.includes('内托') || normalizedText.includes('insert')) return 'box_insert'
  if (normalizedText.includes('封口贴') || normalizedText.includes('透明贴纸')) return 'seal_sticker'
  if (normalizedText.includes('铝箔袋') || normalizedText.includes('铝铂袋') || normalizedText.includes('foil bag')) return 'foil_bag'
  if (normalizedText.includes('纸箱+包装费') || normalizedText.includes('大外箱') || normalizedText.includes('外箱') || normalizedText.includes('carton packaging')) return 'carton_packaging'
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
  const hasStructuredNumericSignal = hasQuantityOrSpecSignal(text)
  return (hasParamWords || hasStructuredNumericSignal || (hasDigits && includesAny(text, PRODUCT_KEYWORDS))) && isShortMessage
}

function hasQuantityOrSpecSignal(text: string): boolean {
  return /\d+\s*(本|张|份|页|个|套|mm|cm|g|克)/.test(text) || includesAny(text, ['数量', '尺寸', '成品'])
}

function hasCompleteQuoteSignal(text: string): boolean {
  const hasProduct = includesAny(text, PRODUCT_KEYWORDS)
  const hasQuantityOrSpec = hasQuantityOrSpecSignal(text)
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

export function looksLikeConsultativePackagingInquiry(text: string): boolean {
  const normalizedText = text.trim().toLowerCase()
  const hasPackagingSubject = includesAny(normalizedText, PACKAGING_PRODUCT_KEYWORDS) || includesAny(normalizedText, GENERAL_PACKAGING_KEYWORDS)
  const hasGenericPackagingRecommendation = includesAny(normalizedText, GENERAL_PACKAGING_KEYWORDS)
    && includesAny(normalizedText, ['推荐', '怎么选', '适合', '方案'])
  const hasUseCaseRecommendation = includesAny(normalizedText, PACKAGING_USE_CASE_KEYWORDS)
    && includesAny(normalizedText, ['推荐', '怎么选', '适合'])
  const hasBudgetPackagingConsultation = hasPackagingSubject && includesAny(normalizedText, BARGAIN_KEYWORDS)
  const hasConsultativePhrase = includesAny(normalizedText, CONSULTATIVE_PACKAGING_PHRASES)
    || includesAny(normalizedText, CONSULTATION_QUESTION_KEYWORDS)
    || (includesAny(normalizedText, SOLUTION_KEYWORDS) && !hasQuantityOrSpecSignal(normalizedText))
    || hasGenericPackagingRecommendation
    || hasUseCaseRecommendation
    || hasBudgetPackagingConsultation

  return hasPackagingSubject && hasConsultativePhrase && !hasQuantityOrSpecSignal(normalizedText)
}

function shouldExcludeRecommendationConfirmation(text: string): boolean {
  if (includesAny(text, RECOMMENDATION_CONFIRM_REFERENCE_KEYWORDS)) {
    return false
  }

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

  if (looksLikeAbnormalNoiseInput(text)) {
    return { intent: 'UNKNOWN', reason: 'unstable_noise_input' }
  }

  if (hasStrongFileReviewSignal(text)) {
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

  if (looksLikeConsultativePackagingInquiry(text)) {
    return { intent: 'SOLUTION_RECOMMENDATION', reason: 'consultative_packaging_inquiry_detected' }
  }

  if (!hasCompleteQuoteSignal(text) && includesAny(text, BARGAIN_KEYWORDS) && includesAny(text, ['推荐', '方案', '怎么选'])) {
    return { intent: 'SOLUTION_RECOMMENDATION', reason: 'budget_recommendation_detected' }
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
      return '好的，我按上一轮说好的方案继续往报价方向走。'
    case 'PROGRESS_INQUIRY':
      return '我先帮您看这单进度；如果当前还没有结果，我会直接告诉您下一步该补什么。'
    case 'SAMPLE_REQUEST':
      return '可以，我先按打样或样品需求帮您记下来，您继续发产品信息就行。'
    case 'BARGAIN_REQUEST':
      return '可以，我按控成本的方向先帮您收一版更合适的方案。'
    case 'UNKNOWN':
    default:
      return '收到。您可以直接告诉我产品、尺寸和数量；如果需要人工协助，也可以直接说“转人工”。'
  }
}
