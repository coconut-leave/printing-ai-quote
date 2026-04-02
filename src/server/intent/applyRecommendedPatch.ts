import { normalizeProductType } from '@/lib/catalog/productSchemas'
import { RecommendedParamsPayload } from '@/server/intent/recommendationContext'

export type RecommendedPatchResult = {
  patchParams: Record<string, any>
  mergedRecommendedParams: Record<string, any>
  patchReason?: string[]
  patchSummary?: string
}

export type RecommendationRerequestMode = 'economy' | 'common' | 'contextual'

const WEIGHT_LEVELS = [80, 105, 128, 157, 200, 250, 300, 350]

const PRODUCT_QUERY_LABELS: Record<string, string> = {
  album: '画册',
  flyer: '传单',
  business_card: '名片',
  poster: '海报',
}

const ECONOMY_REREQUEST_KEYWORDS = [
  '更便宜一点',
  '便宜一点',
  '更经济一点',
  '更经济的',
  '经济一点',
  '经济方案',
  '来个更经济的版本',
  '换个便宜一点的',
  '再推荐一个更便宜的',
]

const COMMON_REREQUEST_KEYWORDS = [
  '更常见一点',
  '更常见的',
  '更常规一点',
  '更标准一点',
  '更通用一点',
  '给我一个更常见的方案',
]

const REREQUEST_TRIGGER_KEYWORDS = [
  '不要这个方案',
  '不要这个',
  '换个',
  '换一个',
  '再推荐一个',
  '再来一个',
  '给我一个',
  '来个',
  '版本',
  '方案',
]

const DIRECT_PATCH_FIELD_KEYWORDS = [
  '页数',
  '数量',
  '尺寸',
  '封面',
  '内页',
  '纸张',
  '克重',
  '骑马钉',
  '胶装',
  '单面',
  '双面',
  'uv',
  '哑膜',
  '光膜',
  '覆膜',
  '厚一点',
  '薄一点',
]

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function extractFirstNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return Number(match[1])
    }
  }

  return undefined
}

function extractSizePatch(text: string): string | undefined {
  const mmMatch = text.match(/(?:尺寸|改成|改为)?\s*(\d{2,3}\s*[xX×]\s*\d{2,3}\s*mm)\b/i)
  if (mmMatch?.[1]) {
    return mmMatch[1].replace(/\s+/g, '').replace('×', 'x').toLowerCase()
  }

  const aSizeMatch = text.match(/(?:尺寸|改成|改为)?\s*(a[3-6])\b/i)
  if (aSizeMatch?.[1]) {
    return aSizeMatch[1].toUpperCase()
  }

  return undefined
}

function buildPatchSummary(reasons: string[]): string | undefined {
  if (reasons.length === 0) {
    return undefined
  }

  return reasons.join('；')
}

function getNextWeight(currentWeight: number | undefined, direction: 'thinner' | 'thicker'): number | undefined {
  if (currentWeight == null || Number.isNaN(currentWeight)) {
    return undefined
  }

  if (direction === 'thinner') {
    const candidate = [...WEIGHT_LEVELS].reverse().find((weight) => weight < currentWeight)
    return candidate ?? currentWeight
  }

  const candidate = WEIGHT_LEVELS.find((weight) => weight > currentWeight)
  return candidate ?? currentWeight
}

function extractRelativeDirection(text: string): 'thinner' | 'thicker' | undefined {
  if (text.includes('薄一点') || text.includes('薄些') || text.includes('轻一点')) {
    return 'thinner'
  }

  if (text.includes('厚一点') || text.includes('厚些') || text.includes('重一点')) {
    return 'thicker'
  }

  return undefined
}

function collectPreservedSummaries(text: string, params: Record<string, any>): string[] {
  const summaries: string[] = []

  if (text.includes('页数不变') && params.pageCount != null) {
    summaries.push(`页数保持 ${params.pageCount}`)
  }

  if ((text.includes('保持a4') || text.includes('保持 a4') || text.includes('还是a4') || text.includes('还是 a4')) && params.finishedSize) {
    summaries.push(`尺寸保持 ${params.finishedSize}`)
  }

  if ((text.includes('还是双面') || text.includes('保持双面')) && params.printSides === 'double') {
    summaries.push('单双面保持 双面')
  }

  if ((text.includes('还是单面') || text.includes('保持单面')) && params.printSides === 'single') {
    summaries.push('单双面保持 单面')
  }

  return summaries
}

function applyRelativeWeightPatch(
  text: string,
  productType: string,
  currentParams: Record<string, any>,
  patchParams: Record<string, any>,
  patchReason: string[]
) {
  const direction = extractRelativeDirection(text)
  if (!direction) {
    return
  }

  if (text.includes('封面')) {
    const nextWeight = getNextWeight(Number(currentParams.coverWeight), direction)
    if (nextWeight != null && nextWeight !== currentParams.coverWeight) {
      patchParams.coverWeight = nextWeight
      patchReason.push(`封面克重${direction === 'thinner' ? '下调' : '上调'}为 ${nextWeight}g`)
    }
    return
  }

  if (text.includes('内页')) {
    const nextWeight = getNextWeight(Number(currentParams.innerWeight), direction)
    if (nextWeight != null && nextWeight !== currentParams.innerWeight) {
      patchParams.innerWeight = nextWeight
      patchReason.push(`内页克重${direction === 'thinner' ? '下调' : '上调'}为 ${nextWeight}g`)
    }
    return
  }

  if (text.includes('纸张') || text.includes('纸') || text.includes('克重')) {
    if (productType === 'album') {
      const nextWeight = getNextWeight(Number(currentParams.innerWeight), direction)
      if (nextWeight != null && nextWeight !== currentParams.innerWeight) {
        patchParams.innerWeight = nextWeight
        patchReason.push(`内页克重${direction === 'thinner' ? '下调' : '上调'}为 ${nextWeight}g`)
      }
      return
    }

    const nextWeight = getNextWeight(Number(currentParams.paperWeight), direction)
    if (nextWeight != null && nextWeight !== currentParams.paperWeight) {
      patchParams.paperWeight = nextWeight
      patchReason.push(`纸张克重${direction === 'thinner' ? '下调' : '上调'}为 ${nextWeight}g`)
    }
  }
}

export function buildRecommendationRerequestMessage(
  recommendation: RecommendedParamsPayload | null,
  message: string
): { query: string; mode: RecommendationRerequestMode } | null {
  if (!recommendation?.recommendedParams || typeof recommendation.recommendedParams !== 'object') {
    return null
  }

  const text = message.trim().toLowerCase()
  const hasEconomyIntent = includesAny(text, ECONOMY_REREQUEST_KEYWORDS)
  const hasCommonIntent = includesAny(text, COMMON_REREQUEST_KEYWORDS)
  const hasContextualIntent = text.includes('适合') && (text.includes('版本') || text.includes('方案'))
  const hasRerequestTrigger = includesAny(text, REREQUEST_TRIGGER_KEYWORDS)
  const hasDirectPatchSignal = includesAny(text, DIRECT_PATCH_FIELD_KEYWORDS)

  if (!hasEconomyIntent && !hasCommonIntent && !hasContextualIntent) {
    return null
  }

  if (hasDirectPatchSignal && !hasRerequestTrigger && !text.includes('不要这个方案')) {
    return null
  }

  const productType = normalizeProductType(recommendation.productType)
  const productLabel = PRODUCT_QUERY_LABELS[productType]
  let query = message.trim()

  if (productLabel && !query.includes(productLabel)) {
    query = `${productLabel} ${query}`
  }

  if (hasEconomyIntent) {
    if (!query.includes('经济方案') && !query.includes('预算有限')) {
      query = `${query} 经济方案`
    }
    return { query, mode: 'economy' }
  }

  if (hasCommonIntent) {
    if (!query.includes('常见方案') && !query.includes('标准方案')) {
      query = `${query} 常见方案`
    }
    return { query, mode: 'common' }
  }

  return { query, mode: 'contextual' }
}

function extractBusinessCardFinishType(text: string): 'uv' | 'glossy' | 'matte' | 'embossed' | 'none' | undefined {
  if (text.includes('不做工艺') || text.includes('不要工艺') || text.includes('无工艺')) {
    return 'none'
  }

  if (text.includes('uv上光') || text.includes('改uv') || text.includes('改成uv') || text.includes('改为uv')) {
    return 'uv'
  }

  if (text.includes('击凸') || text.includes('压凸') || text.includes('压凹凸')) {
    return 'embossed'
  }

  if (text.includes('光膜') || text.includes('亮膜') || text.includes('光面')) {
    return 'glossy'
  }

  if (text.includes('哑膜') || text.includes('磨砂') || text.includes('哑光')) {
    return 'matte'
  }

  return undefined
}

function extractPosterLamination(text: string): 'none' | 'glossy' | 'matte' | undefined {
  if (text.includes('不覆膜') || text.includes('无覆膜') || text.includes('不要覆膜')) {
    return 'none'
  }

  if (text.includes('光膜') || text.includes('亮膜')) {
    return 'glossy'
  }

  if (text.includes('哑膜') || text.includes('磨砂膜')) {
    return 'matte'
  }

  return undefined
}

export function applyRecommendedPatch(
  recommendation: RecommendedParamsPayload | null,
  message: string
): RecommendedPatchResult | null {
  if (!recommendation?.recommendedParams || typeof recommendation.recommendedParams !== 'object') {
    return null
  }

  const text = message.trim().toLowerCase()
  const productType = normalizeProductType(recommendation.productType)
  const patchParams: Record<string, any> = {}
  const patchReason: string[] = collectPreservedSummaries(text, recommendation.recommendedParams)

  const pageCount = extractFirstNumber(text, [
    /页数(?:改成|改为)?\s*(\d+)/,
    /改成\s*(\d+)\s*页/,
  ])
  if (pageCount !== undefined) {
    patchParams.pageCount = pageCount
    patchReason.push(`页数改为 ${pageCount}`)
  }

  const quantity = extractFirstNumber(text, [
    /数量(?:改成|改为)?\s*(\d+)/,
    /(\d+)\s*(本|份|张)/,
  ])
  if (quantity !== undefined) {
    patchParams.quantity = quantity
    patchReason.push(`数量改为 ${quantity}`)
  }

  const coverWeight = extractFirstNumber(text, [
    /封面(?:还是|改成|改为|改)?\s*(\d+)\s*[g克]?/,
  ])
  if (coverWeight !== undefined) {
    patchParams.coverWeight = coverWeight
    patchReason.push(`封面克重设为 ${coverWeight}g`)
  }

  const innerWeight = extractFirstNumber(text, [
    /内页(?:还是|改成|改为|改)?\s*(\d+)\s*[g克]?/,
  ])
  if (innerWeight !== undefined) {
    if (productType === 'album') {
      patchParams.innerWeight = innerWeight
      patchReason.push(`内页克重设为 ${innerWeight}g`)
    } else {
      patchParams.paperWeight = innerWeight
      patchReason.push(`纸张克重设为 ${innerWeight}g`)
    }
  }

  const genericWeight = extractFirstNumber(text, [
    /(?:纸张克重|纸张|克重)(?:改成|改为)?\s*(\d+)\s*[g克]?/,
  ])
  if (genericWeight !== undefined) {
    if (productType === 'album' && patchParams.innerWeight === undefined) {
      patchParams.innerWeight = genericWeight
      patchReason.push(`内页克重设为 ${genericWeight}g`)
    }

    if ((productType === 'flyer' || productType === 'business_card' || productType === 'poster') && patchParams.paperWeight === undefined) {
      patchParams.paperWeight = genericWeight
      patchReason.push(`纸张克重设为 ${genericWeight}g`)
    }
  }

  if (
    text.includes('改胶装') ||
    text.includes('改成胶装') ||
    text.includes('改为胶装') ||
    text.includes('换成胶装') ||
    text.includes('换胶装') ||
    (text.includes('不要骑马钉') && text.includes('胶装'))
  ) {
    patchParams.bindingType = 'perfect_bind'
    patchReason.push('装订方式改为 胶装')
  } else if (
    text.includes('改骑马钉') ||
    text.includes('改成骑马钉') ||
    text.includes('改为骑马钉') ||
    text.includes('换成骑马钉') ||
    (text.includes('不要胶装') && text.includes('骑马钉'))
  ) {
    patchParams.bindingType = 'saddle_stitch'
    patchReason.push('装订方式改为 骑马钉')
  }

  if (
    (productType === 'flyer' || productType === 'business_card') &&
    (
      text.includes('改单面') ||
      text.includes('改成单面') ||
      text.includes('改为单面') ||
      text.includes('换成单面') ||
      (text.includes('不要双面') && text.includes('单面'))
    )
  ) {
    patchParams.printSides = 'single'
    patchReason.push('单双面改为 单面')
  } else if (
    (productType === 'flyer' || productType === 'business_card') &&
    (
      text.includes('改双面') ||
      text.includes('改成双面') ||
      text.includes('改为双面') ||
      text.includes('换成双面') ||
      (text.includes('不要单面') && text.includes('双面'))
    )
  ) {
    patchParams.printSides = 'double'
    patchReason.push('单双面改为 双面')
  }

  applyRelativeWeightPatch(text, productType, recommendation.recommendedParams, patchParams, patchReason)

  if (productType === 'business_card') {
    const finishType = extractBusinessCardFinishType(text)
    if (finishType !== undefined) {
      patchParams.finishType = finishType
      patchReason.push(
        finishType === 'none'
          ? '表面工艺改为 无工艺'
          : finishType === 'uv'
          ? '表面工艺改为 UV'
          : finishType === 'glossy'
          ? '表面工艺改为 光膜'
          : finishType === 'matte'
          ? '表面工艺改为 哑膜'
          : '表面工艺改为 击凸'
      )
    }
  }

  if (productType === 'poster') {
    const lamination = extractPosterLamination(text)
    if (lamination !== undefined) {
      patchParams.lamination = lamination
      patchReason.push(
        lamination === 'none'
          ? '覆膜工艺改为 不覆膜'
          : lamination === 'glossy'
          ? '覆膜工艺改为 光膜'
          : '覆膜工艺改为 哑膜'
      )
    }
  }

  const finishedSize = extractSizePatch(text)
  if (finishedSize && (text.includes('尺寸') || text.includes('改成') || text.includes('改为'))) {
    patchParams.finishedSize = finishedSize
    patchReason.push(`尺寸改为 ${finishedSize}`)
  }

  const mergedRecommendedParams = {
    ...(recommendation.productType ? { productType: recommendation.productType } : {}),
    ...recommendation.recommendedParams,
    ...patchParams,
  }

  return {
    patchParams,
    mergedRecommendedParams,
    patchReason,
    patchSummary: buildPatchSummary(patchReason),
  }
}
