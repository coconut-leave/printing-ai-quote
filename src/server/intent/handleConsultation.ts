import { ChatIntent, extractExplicitProductType } from './detectIntent'
import { resolveKnowledgeCard } from '@/server/knowledge/registry'
import { getDisplayParamEntries, getFieldLabel, getRequiredFields } from '@/lib/catalog/helpers'
import { isComplexPackagingProductType } from '@/lib/catalog/productSchemas'

type ConsultationReply = {
  status: 'consultation_reply'
  reply: string
  consultationIntent: ChatIntent
  matchedKnowledgeCardId: string
  matchedKnowledgeCardTitle: string
  consultationCategory: string
  hasRecommendedParams: boolean
  productType?: string
  candidateProductTypes?: string[]
  recommendedParams?: {
    productType?: string
    recommendedParams: Record<string, any>
    note: string
  }
}

const GENERIC_PACKAGING_CANDIDATE_TYPES = ['mailer_box', 'tuck_end_box', 'window_box'] as const

function formatProductType(productType?: string): string {
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
    foil_bag: '铝箔袋',
    carton_packaging: '纸箱包装',
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

function humanizeRecommendationNote(note?: string): string | undefined {
  if (!note) {
    return undefined
  }

  return note.trim()
    .replace(/这是一版常见起步配置，正式价格仍以系统报价或人工复核为准。?/g, '这版我先给您做起步参考，真正核价还要看完整参数。')
    .replace(/这是基于预算倾向的常见参考方案，不是正式报价。?/g, '这版先按更控成本的方向给您做参考，真正价格还要看完整参数。')
    .replace(/不是正式报价。?/g, '先给您做方向参考，真正价格还要看完整参数。')
    .replace(/正式价格仍以系统报价或人工复核为准。?/g, '真正价格还要看完整参数，复杂情况我会提醒您转人工复核。')
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function buildPackagingPriceFactors(productType: string): string[] {
  const requiredFields = getRequiredFields(productType)
  const factors: string[] = []

  if (requiredFields.includes('length') && requiredFields.includes('width') && requiredFields.includes('height')) {
    factors.push('尺寸（长宽高）')
  }

  if (requiredFields.includes('quantity')) {
    factors.push(getFieldLabel(productType, 'quantity'))
  }

  if (requiredFields.includes('material')) {
    factors.push(getFieldLabel(productType, 'material'))
  }

  if (requiredFields.includes('weight')) {
    factors.push(getFieldLabel(productType, 'weight'))
  }

  if (requiredFields.includes('printColor')) {
    factors.push(getFieldLabel(productType, 'printColor'))
  }

  factors.push(getFieldLabel(productType, 'surfaceFinish'))

  if (requiredFields.includes('windowSizeLength') || requiredFields.includes('windowSizeWidth')) {
    factors.push('开窗尺寸')
  }

  if (requiredFields.includes('windowFilmThickness')) {
    factors.push(getFieldLabel(productType, 'windowFilmThickness'))
  }

  return [...new Set(factors)]
}

function formatJoinedFactors(factors: string[]): string {
  if (factors.length <= 1) {
    return factors[0] || '尺寸和数量'
  }

  if (factors.length === 2) {
    return `${factors[0]}和${factors[1]}`
  }

  return `${factors.slice(0, -1).join('、')}和${factors[factors.length - 1]}`
}

function buildGenericPackagingPriceFactors(): string {
  const mergedFactors = [
    ...buildPackagingPriceFactors('mailer_box'),
    ...buildPackagingPriceFactors('tuck_end_box'),
    ...buildPackagingPriceFactors('window_box'),
  ]

  return formatJoinedFactors([...new Set(mergedFactors)])
}

function buildSpecificPackagingConsultationReply(productType: string): string {
  const factorsText = formatJoinedFactors(buildPackagingPriceFactors(productType))

  switch (productType) {
    case 'mailer_box':
      return `飞机盒一般更适合发货、快递和对承重更敏感的场景。常见做法会先按运输保护和结构强度来定，基础工艺通常从裱、啤这类方向起步；如果要做品牌外包装，再一起看表面处理。价格通常主要受${factorsText}影响，其中数量和尺寸变化对单价影响会更明显。您如果要我按飞机盒方向继续往下收，先告诉我装什么产品、尺寸大概多大、做多少个，以及材质、克重和印色，我就能继续帮您估。`
    case 'tuck_end_box':
      return `双插盒更常见于常规零售彩盒和货架展示这类场景，结构成熟，也比较适合作为首轮方案参考。常见做法会先按啤、粘这类基础工艺来核，再看要不要加表面处理。价格通常主要受${factorsText}影响，如果是零售包装，数量、尺寸和材质克重往往最先拉开差异。您先把装什么产品、长宽高、数量和材质印色发我，我就能按双插盒方向继续帮您收。`
    case 'window_box':
      return `开窗彩盒更适合需要展示内容物的场景，常见做法会先确认盒型，再一起看开窗位置、开窗尺寸和胶片方向。除了基础彩盒的尺寸、数量、材质和印色，这类盒子的价格还会明显受${factorsText}影响。您如果偏展示效果，可以继续把产品用途、盒子尺寸、数量和是否需要开窗露出告诉我，我再按这个方向帮您往下估。`
    case 'leaflet_insert':
      return `如果您现在是在问盒内说明书，常见会先分单页还是折页，再看展开尺寸、纸张克重、印色和数量。您把大概尺寸、纸张和印刷要求发我，我就能按说明书方向继续帮您收。`
    case 'box_insert':
      return `如果您现在是在问内托，常见会先看是固定产品、抗震还是做组合分隔，再定材质和结构。价格主要还是看尺寸、材质、结构复杂度和数量，您把装什么产品和大概尺寸发我，我再按内托方向帮您细化。`
    case 'seal_sticker':
      return `如果您现在是在问封口贴，常见会先看是做防拆、封口还是品牌展示，再定材质、尺寸和印刷内容。您把贴在哪里、尺寸大概多大、数量多少告诉我，我就能按封口贴方向继续帮您收。`
    case 'foil_bag':
      return `如果您现在是在问铝箔袋，常见会先确认袋型尺寸、袋材厚度是不是空白袋，以及数量大概多少。像空白铝箔袋这类可以先按常见模板起步；如果涉及定制印刷、拉链、自立嘴或特殊复合结构，就要更保守一些。您把袋子尺寸、数量和大概材质发我，我就能按铝箔袋方向继续帮您收。`
    case 'carton_packaging':
      return `如果您现在是在问纸箱包装，常见会先分是单纯外箱/纸箱+包装费，还是还带印刷、刀模和成型要求。价格通常先看纸箱尺寸、数量、是否空白箱，再看有没有包装费或印刷要求。您把外箱长宽高、数量和是不是空白箱发我，我就能按纸箱包装方向继续帮您收。`
    default:
      return '这类包装我可以先按常见做法帮您理方向，再根据尺寸、数量、材质和工艺往下细化。'
  }
}

function buildGenericPackagingConsultationReply(message: string): string {
  const factorsText = buildGenericPackagingPriceFactors()

  if (includesAny(message, ['预算', '预算不要太高', '预算有限', '控成本', '便宜一些', '更经济'])) {
    return `如果您这轮更在意预算不要太高，通常会先优先看两类方向：结构相对成熟、比较容易控成本的，先看双插盒；如果还要兼顾发货保护，再看飞机盒。只有在展示感要求比较强、确实需要露出内容物时，才建议再考虑开窗彩盒，因为这类通常会比常规彩盒多一些开窗和胶片成本。真正影响后续价格的，通常还是${factorsText}。您先告诉我装什么产品、尺寸大概多大、数量和预算区间，我再帮您把方向收窄到更稳妥的一版。`
  }

  if (includesAny(message, ['护肤品', '化妆品', '美妆', '礼品'])) {
    return `如果是护肤品这类更看展示感和零售陈列的包装，常见会先从 2 到 3 个方向里选：想先走常规零售外盒的，通常先看双插盒；如果希望把内容物露出来、展示感更强，可以看开窗彩盒；如果还要兼顾发货保护和结构强度，再看飞机盒。真正影响后续价格的，通常还是${factorsText}；如果做到开窗，还要再一起看开窗尺寸和胶片厚度。您先告诉我产品尺寸、计划数量、预算区间，以及您更偏展示效果还是发货保护，我再帮您把方向收窄。`
  }

  if (includesAny(message, ['卡片', '小卡片', '赠品'])) {
    return `如果是装小卡片和赠品这类组合内容，通常会先看 3 个方向：偏发货保护和承重的，可以先看飞机盒；偏常规零售外包装、结构简单好落地的，可以先看双插盒；如果希望把里面的内容展示出来，可以看开窗彩盒。真正影响后续价格的，通常还是${factorsText}；如果内容物比较零散，后面还要再一起看是否要加说明书、内托或封口贴。您先告诉我装的东西大概多大、打算做多少、预算大概在哪个区间，我再帮您把盒型方向收窄。`
  }

  return `如果现在还没锁定盒型，通常会先从 3 个常见方向看：发货和承重优先的，可以先看飞机盒；常规零售内包装、上架展示比较多的，可以先看双插盒；如果希望把内容物露出来、展示感更强，可以看开窗彩盒。真正影响价格的，通常还是${factorsText}；如果做到开窗，还要再一起看开窗尺寸和胶片厚度。您先告诉我装什么产品、尺寸大概多大、计划做多少，我再帮您把方向收窄到更合适的盒型。`
}

function inferPackagingConsultationProductType(message: string): string | undefined {
  const explicit = extractExplicitProductType(message)
  if (explicit && isComplexPackagingProductType(explicit)) {
    return explicit
  }

  if (includesAny(message, ['说明书', '折页'])) return 'leaflet_insert'
  if (includesAny(message, ['内托'])) return 'box_insert'
  if (includesAny(message, ['封口贴', '透明贴纸', '贴纸'])) return 'seal_sticker'
  if (includesAny(message, ['铝箔袋', '铝铂袋'])) return 'foil_bag'
  if (includesAny(message, ['纸箱+包装费', '大外箱', '外箱', '空白箱'])) return 'carton_packaging'
  if (includesAny(message, ['快递', '运输', '发货', '抗压'])) return 'mailer_box'
  if (includesAny(message, ['零售', '上架', '货架', '彩盒'])) return 'tuck_end_box'
  if (includesAny(message, ['展示', '露出', '看得到', '开窗', '陈列'])) return 'window_box'
  return undefined
}

function buildPackagingConsultationShortAnswer(productType: string | undefined, message: string): string | null {
  if (!productType) {
    if (includesAny(message, ['盒子', '纸盒', '纸箱', '箱子', '盒型', '包装', '包装盒', '彩盒', '适合什么盒型', '推荐盒型'])) {
      return buildGenericPackagingConsultationReply(message)
    }

    return null
  }

  return buildSpecificPackagingConsultationReply(productType)
}

function buildPackagingConsultationFallback(intent: ChatIntent, message: string): ConsultationReply | null {
  if (!['MATERIAL_CONSULTATION', 'PROCESS_CONSULTATION', 'SPEC_RECOMMENDATION', 'SOLUTION_RECOMMENDATION'].includes(intent)) {
    return null
  }

  const normalizedMessage = message.trim().toLowerCase()
  const inferredProductType = inferPackagingConsultationProductType(normalizedMessage)
  const shortAnswer = buildPackagingConsultationShortAnswer(inferredProductType, normalizedMessage)

  if (!shortAnswer) {
    return null
  }

  return {
    status: 'consultation_reply',
    consultationIntent: intent,
    matchedKnowledgeCardId: inferredProductType
      ? `packaging-fallback-${inferredProductType}`
      : 'packaging-fallback-generic-box-options',
    matchedKnowledgeCardTitle: inferredProductType
      ? `${formatProductType(inferredProductType)}咨询建议`
      : '包装盒型方向建议',
    consultationCategory: 'PACKAGING',
    hasRecommendedParams: false,
    productType: inferredProductType,
    candidateProductTypes: inferredProductType ? [inferredProductType] : [...GENERIC_PACKAGING_CANDIDATE_TYPES],
    reply: shortAnswer,
  }
}

function buildConsultationReplyText(params: {
  intent: ChatIntent
  shortAnswer: string
  productType?: string
  recommendedParams?: Record<string, any>
  note?: string
}): string {
  const parts = [params.shortAnswer.trim()]
  const isPackaging = isComplexPackagingProductType(params.productType)
  const note = humanizeRecommendationNote(params.note)

  if (params.recommendedParams) {
    const productLabel = formatProductType(params.productType)
    const summary = buildRecommendedSummary(params.productType, params.recommendedParams)

    if (summary) {
      const suggestionLead = params.intent === 'SOLUTION_RECOMMENDATION'
        ? `如果您想先做一版更稳妥的 ${productLabel}，我会先建议按`
        : `如果要先落成一版可执行的 ${productLabel} 配置，我会先建议按`
      parts.push(`${suggestionLead}${summary}来起步。`)
    } else {
      parts.push(`如果先从常见方向往下收，我先按${productLabel}这条线继续帮您看。`)
    }

    if (note) {
      parts.push(note)
    }

    parts.push(
      isPackaging
        ? '如果这个方向对了，直接把尺寸、材质、印色、数量和工艺发我，我就按这条线继续预估。'
        : '如果这版方向合适，您可以直接说“按这个方案报价”，或者把数量、尺寸等细节补给我，我继续往下收。'
    )
    return parts.join(' ')
  }

  parts.push('如果您愿意，可以继续告诉我用途、数量或预算，我再帮您收一版更贴近实际场景的常见配置。')
  return parts.join(' ')
}

export function handleConsultationIntent(intent: ChatIntent, message: string): ConsultationReply | null {
  const packagingFallback = buildPackagingConsultationFallback(intent, message)
  if (packagingFallback) {
    return packagingFallback
  }

  const knowledgeCard = resolveKnowledgeCard(intent, message)
  if (!knowledgeCard) {
    return null
  }

  const productType = knowledgeCard.applicableProductTypes?.[0]
  const recommendedParams = knowledgeCard.recommendedParams
    ? {
        productType,
        recommendedParams: knowledgeCard.recommendedParams,
        note: humanizeRecommendationNote(knowledgeCard.note) || '这版我先给您做起步参考，真正核价还要看完整参数。',
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