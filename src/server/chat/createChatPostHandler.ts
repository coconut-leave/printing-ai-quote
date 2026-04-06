import { NextResponse } from 'next/server'
import { extractQuoteParams, type ExtractedQuoteParams } from '@/server/ai/extractQuoteParams'
import { routeMessage, type AgentRouteDecision } from '@/server/ai/routeMessage'
import { calculateAlbumQuote } from '@/server/pricing/albumQuote'
import { calculateFlyerQuote } from '@/server/pricing/flyerQuote'
import { calculateBusinessCardQuote } from '@/server/pricing/businessCardQuote'
import { calculatePosterQuote } from '@/server/pricing/posterQuote'
import { calculateBundleQuote } from '@/server/pricing/complexPackagingQuote'
import {
  createConversation,
  getConversationById,
  getConversationWithDetails,
  addMessageToConversation,
  createQuoteRecord,
  getLatestParametersForConversation,
  updateConversationStatus,
  createHandoffRecord,
} from '@/server/db/conversations'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'
import { getProductSchema, normalizeProductType } from '@/lib/catalog/productSchemas'
import {
  getEstimatedAllowedMissingSets,
  getEstimatedDefaults,
  getMissingFieldsChineseText,
  getProductUnit,
  getReplyExample,
  getRequiredFields,
  isEstimatedAllowed,
} from '@/lib/catalog/helpers'
import { detectIntent, extractExplicitProductType, getIntentPlaceholderReply, looksLikeFreshQuoteRequest, type ChatIntent, type DetectIntentResult } from '@/server/intent/detectIntent'
import { assessAnswerability, buildStableHandoffReply } from '@/server/intent/answerability'
import {
  assessStableBusinessInput,
  buildUnstableBusinessInputReply,
  looksLikeAbnormalNoiseInput,
} from '@/server/intent/inputStability'
import {
  buildClarificationResolutionMetadata,
  buildClarificationTriggerMetadata,
  isClarificationTriggeredMetadata,
} from '@/lib/chat/clarification'
import { applyRecommendedPatch } from '@/server/intent/applyRecommendedPatch'
import { buildRecommendationRerequestMessage } from '@/server/intent/applyRecommendedPatch'
import { handleLightweightBusinessIntent } from '@/server/intent/handleIntent'
import { handleConsultationIntent } from '@/server/intent/handleConsultation'
import { buildRecommendationBaseParams, getLatestRecommendedParams } from '@/server/intent/recommendationContext'
import { canPatchRecommendation, isImmediateHandoffIntent, isNonQuoteFlowIntent } from '@/server/catalog/flowBoundaries'
import { decideQuotePath } from '@/server/quote/workflowPolicy'
import {
  decideComplexPackagingQuotePath,
  formatComplexPackagingMissingReply,
  getLatestComplexPackagingState,
  resolveComplexPackagingConversationTurn,
} from '@/server/packaging/extractComplexPackagingQuote'
import { buildComplexPackagingSecondPhaseShadow } from '@/server/packaging/complexPackagingSecondPhaseShadow'
import { buildPackagingReviewSummary } from '@/lib/packaging/reviewSummary'
import { answerKnowledgeQuestion } from '@/server/rag/answerKnowledgeQuestion'
import { getRequestTraceId, logRouterDispatch } from '@/server/logging/routerRagTrace'

const KNOWN_QUOTE_PARAM_FIELDS = [
  'productType',
  'finishedSize',
  'quantity',
  'coverPaper',
  'coverWeight',
  'innerPaper',
  'innerWeight',
  'bindingType',
  'pageCount',
  'paperType',
  'paperWeight',
  'printSides',
  'finishType',
  'lamination',
  'taxRate',
  'shippingRegion',
]

function hasExplicitProductSwitch(text: string): boolean {
  const normalizedText = text.trim().toLowerCase()
  const messageProductType = extractExplicitProductType(normalizedText)
  if (!messageProductType) {
    return false
  }

  return ['改成', '改为', '换成', '换做', '改做', '做成'].some((keyword) => normalizedText.includes(keyword))
}

function sanitizeQuoteParams(params: Record<string, any>): Record<string, any> {
  const normalizedProductType = typeof params.productType === 'string'
    ? normalizeProductType(params.productType)
    : undefined

  const allowedFields = normalizedProductType
    ? new Set(['productType', ...getProductSchema(normalizedProductType).supportedFields])
    : new Set(KNOWN_QUOTE_PARAM_FIELDS)

  const sanitizedParams: Record<string, any> = {}
  for (const field of allowedFields) {
    if (params[field] !== undefined && params[field] !== null) {
      sanitizedParams[field] = params[field]
    }
  }

  return sanitizedParams
}

function getActiveContextProductType(
  historicalParams: Record<string, any> | null,
  latestRecommendedParams: { productType?: string } | null
): string | undefined {
  if (typeof latestRecommendedParams?.productType === 'string') {
    return normalizeProductType(latestRecommendedParams.productType)
  }

  if (typeof historicalParams?.productType === 'string') {
    return normalizeProductType(historicalParams.productType)
  }

  return undefined
}

function shouldResetQuoteContext(
  message: string,
  messageProductType: string | undefined,
  contextProductType: string | undefined
): boolean {
  const normalizedText = message.trim().toLowerCase()
  const hasFreshQuoteSignal = looksLikeFreshQuoteRequest(normalizedText)
  const hasProductMismatch = Boolean(messageProductType && contextProductType && messageProductType !== contextProductType)

  return hasFreshQuoteSignal || hasProductMismatch || hasExplicitProductSwitch(normalizedText)
}

function sanitizeExtractedParamsForRecommendation(
  extractedParams: ExtractedQuoteParams,
  latestRecommendedParams: { productType?: string } | null
) : ExtractedQuoteParams {
  if (!latestRecommendedParams?.productType || extractedParams.productType === undefined) {
    return extractedParams
  }

  const recommendationProductType = normalizeProductType(latestRecommendedParams.productType)
  const extractedProductType = normalizeProductType(extractedParams.productType)

  if (recommendationProductType === extractedProductType) {
    return extractedParams
  }

  const { productType: _discardedProductType, ...sanitizedParams } = extractedParams
  return sanitizedParams
}

function buildDebugExtractedParams(
  extractedParams: ExtractedQuoteParams,
  contextProductType?: string
): Record<string, any> {
  const normalizedProductType = normalizeProductType(extractedParams.productType || contextProductType)
  return sanitizeQuoteParams({
    ...(normalizedProductType ? { productType: normalizedProductType } : {}),
    ...extractedParams,
  })
}

function createTimingTracker(scope: string) {
  const startedAt = Date.now()
  const stages: Record<string, number> = {}

  return {
    mark(stage: string) {
      stages[stage] = Date.now() - startedAt
    },
    flush(summary: { conversationId?: number; intent?: string; status?: string }) {
      if (process.env.NODE_ENV === 'test') {
        return
      }

      console.info(`[${scope}] timing ${JSON.stringify({ ...summary, totalMs: Date.now() - startedAt, stages })}`)
    },
  }
}

function buildDirectReplyGuide(missingFields: string[]): string {
  const samples = missingFields
    .map((f) => getReplyExample(f))
    .filter(Boolean)
    .slice(0, 3)

  if (samples.length === 0) {
    return '您可以直接回复缺的参数，例如：页数 32 页。'
  }

  return `您可以直接这样回我：${samples.join('，')}。`
}

function generateMissingFieldsReply(missingFields: string[]): string {
  const missingLabels = getMissingFieldsChineseText(undefined, missingFields)
  const guideText = buildDirectReplyGuide(missingFields)
  return `这边先帮您看了一下，按现在的信息还没法直接算价，还差：${missingLabels}。${guideText}补齐后我就可以继续给您算；如果有些参数暂时没定，也可以先告诉我用途或预算，我先按常见做法帮您估一版。`
}

function generateMissingFieldsReplyByProduct(productType: string | undefined, missingFields: string[]): string {
  const schema = getProductSchema(productType)
  const base = generateMissingFieldsReply(missingFields)
  if (schema.statusHints?.missingFields) {
    return `${base} ${schema.statusHints.missingFields}`
  }
  return base
}

function generateQuoteReply(result: any, productType?: string): string {
  const qty = result.normalizedParams?.quantity ?? result.quantity ?? 0
  const unit = getProductUnit(productType)
  return `这边先按您这版参数算好了：单价 ¥${result.unitPrice}/${unit}，${qty}${unit}共 ¥${result.totalPrice}；运费 ¥${result.shippingFee}，税费 ¥${result.tax}，合计 ¥${result.finalPrice}。如果数量、材质或工艺还想微调，您直接接着说，我可以继续帮您重算。`
}

function generateEstimatedReply(
  productType: string | undefined,
  result: any,
  assumptions: string[],
  missingFields: string[],
  missingHint?: string,
  alternatives?: Record<string, any>
): string {
  const qty = result.normalizedParams?.quantity ?? result.quantity ?? 0
  const assumptionsText = assumptions.length > 0 ? `（按${assumptions.join('、')}）` : ''
  const missingLabels = getMissingFieldsChineseText(undefined, missingFields)
  const missingHintText = missingHint ? `目前还差${missingLabels}，这版先按${missingHint}帮您估的。` : `目前还差${missingLabels}，这版先按常见做法帮您估的。`
  const alternativeText = alternatives
    ? ` 另外我顺手给您放了几个对比：${Object.entries(alternatives)
      .map(([name, v]) => `${name} ¥${(v as any).finalPrice}`)
      .join('；')}。`
    : ''
  const schema = getProductSchema(productType)
  const estimatedHint = schema.statusHints?.estimated ? ` ${schema.statusHints.estimated}` : ''
  return `按您现在给到的信息，这边先给您一个参考价${assumptionsText}：单价约 ¥${result.unitPrice}，数量 ${qty}，预估总价约 ¥${result.finalPrice}。${missingHintText}${alternativeText}${estimatedHint}您把缺的参数补给我后，我再帮您收成更准的一版。`
}

function generateComplexPackagingQuoteReply(result: any): string {
  const isBundle = Boolean(result?.isBundle)
  const reviewHint = result?.requiresHumanReview ? ' 这类结构我还是建议您再结合人工复核确认一下，会更稳。' : ''

  if (isBundle) {
    return `这边先按您这版一期复杂包装方案核了一下：组合单套价 ¥${result.totalUnitPrice}，合计 ¥${result.finalPrice}。主件和配套件明细我已经一起拆出来了。${reviewHint}`
  }

  return `这边先按您这版复杂包装参数核了一下：单价 ¥${result.unitPrice}，合计 ¥${result.finalPrice}。${reviewHint}`
}

function generateComplexPackagingEstimatedReply(result: any): string {
  const isBundle = Boolean(result?.isBundle)
  if (isBundle) {
    return `按您现在这版一期复杂包装信息，我先给您一个组合预估：组合单套价约 ¥${result.totalUnitPrice}，预估合计约 ¥${result.finalPrice}。这类组合件我还是建议您再结合人工复核确认一下。`
  }

  return `按您现在这版一期复杂包装信息，我先给您一个预估：参考单价约 ¥${result.unitPrice}，预估合计约 ¥${result.finalPrice}。后面如果尺寸、材质或工艺还有调整，我可以继续帮您往下收。`
}

function buildComplexPackagingActionLead(action?: string | null, targetItemTitle?: string): string {
  switch (action) {
    case 'supplement_params':
      return '这边先把您刚补的参数并进系统重算了一版。'
    case 'modify_existing_item':
      return targetItemTitle
        ? `这边已经按您刚调整的${targetItemTitle}重算了一版。`
        : '这边已经按您刚调整的参数重算了一版。'
    case 'add_sub_item':
      return targetItemTitle
        ? `这边已经把${targetItemTitle}并进当前组合，按最新结构重算了一版。`
        : '这边已经把新增子项并进当前组合，按最新结构重算了一版。'
    case 'remove_sub_item':
      return targetItemTitle
        ? `这边已经把${targetItemTitle}从当前组合里去掉，并按最新结构重算了一版。`
        : '这边已经把对应子项从当前组合里去掉，并按最新结构重算了一版。'
    default:
      return ''
  }
}

function prependActionLead(reply: string, action?: string | null, targetItemTitle?: string): string {
  const lead = buildComplexPackagingActionLead(action, targetItemTitle)
  return lead ? `${lead}${reply}` : reply
}

function generateComplexPackagingHandoffReply(referenceFileCategory?: string): string {
  const fileHint = referenceFileCategory === 'dieline_pdf'
    ? '这次还带了刀模 PDF 参考信息。'
    : referenceFileCategory === 'design_file'
    ? '这次还带了设计文件参考信息。'
    : ''

  return `${fileHint}这类情况我先转给人工同事复核会更稳一些。您也可以继续把尺寸、材质、印色、数量和工艺补在当前会话里，人工会接着看。`
}

function matchMissing(missingFields: string[], expected: string[]): boolean {
  return missingFields.length === expected.length && expected.every((f) => missingFields.includes(f))
}

function isMissingSetAllowed(productType: string, missingFields: string[]): boolean {
  const sets = getEstimatedAllowedMissingSets(productType)
  return sets.some((expected) => matchMissing(missingFields, expected))
}

function pickAlbumEstimatedDefaults(mergedParams: Record<string, any>) {
  const defaults = getEstimatedDefaults('album')
  const hasRichSpecs = Boolean(
    mergedParams.coverWeight &&
    mergedParams.innerPaper &&
    mergedParams.bindingType
  )

  const pageCount = hasRichSpecs
    ? defaults.pageCount.common
    : defaults.pageCount.minimal

  const innerWeight =
    mergedParams.pageCount && Number(mergedParams.pageCount) >= 48
      ? defaults.innerWeight.light
      : defaults.innerWeight.common

  return { pageCount, innerWeight, hasRichSpecs }
}

function pickFlyerPrintSidesDefault(mergedParams: Record<string, any>) {
  const defaults = getEstimatedDefaults('flyer')
  const quantity = Number(mergedParams.quantity || 0)
  return quantity > 3000
    ? defaults.printSides.common
    : defaults.printSides.lowQuantity
}

function pickBusinessCardPaperWeight(mergedParams: Record<string, any>) {
  const defaults = getEstimatedDefaults('business_card')
  const paperType = mergedParams.paperType
  if (paperType === 'art') return defaults.paperWeight.premium
  if (paperType === 'standard') return defaults.paperWeight.standard
  return defaults.paperWeight.common
}

function pickPosterEstimatedDefaults() {
  const defaults = getEstimatedDefaults('poster')
  return {
    paperWeight: defaults.paperWeight || 157,
    lamination: defaults.lamination || 'none',
  }
}

function buildEstimatedQuote(
  productType: string,
  mergedParams: Record<string, any>,
  missingFields: string[]
): { quoteResult: any; assumptions: string[]; missingHint?: string; alternatives?: Record<string, any> } | null {
  if (!isEstimatedAllowed(productType) || !isMissingSetAllowed(productType, missingFields)) {
    return null
  }

  if (productType === 'album' && matchMissing(missingFields, ['pageCount'])) {
    const defaults = pickAlbumEstimatedDefaults(mergedParams)
    const assumptions = [
      `默认页数 ${defaults.pageCount} 页`,
      defaults.hasRichSpecs ? '基于已识别封面/内页/装订参数估算' : '按常见规格估算',
    ]
    const quoteResult = calculateAlbumQuote({
      finishedSize: mergedParams.finishedSize!,
      pageCount: defaults.pageCount,
      coverPaper: (mergedParams.coverPaper as any) || 'standard',
      coverWeight: mergedParams.coverWeight!,
      innerPaper: (mergedParams.innerPaper as any) || 'standard',
      innerWeight: mergedParams.innerWeight!,
      bindingType: (mergedParams.bindingType as any) || 'saddle_stitch',
      quantity: mergedParams.quantity!,
      taxRate: mergedParams.taxRate ?? 0,
      shippingRegion: mergedParams.shippingRegion ?? 'domestic',
    })
    return { quoteResult, assumptions, missingHint: `默认页数 ${defaults.pageCount} 页` }
  }

  if (productType === 'album' && matchMissing(missingFields, ['innerWeight'])) {
    const defaults = pickAlbumEstimatedDefaults(mergedParams)
    const assumptions = [`默认内页克重 ${defaults.innerWeight}g`]
    const quoteResult = calculateAlbumQuote({
      finishedSize: mergedParams.finishedSize!,
      pageCount: mergedParams.pageCount ?? defaults.pageCount,
      coverPaper: (mergedParams.coverPaper as any) || 'standard',
      coverWeight: mergedParams.coverWeight!,
      innerPaper: (mergedParams.innerPaper as any) || 'standard',
      innerWeight: defaults.innerWeight,
      bindingType: (mergedParams.bindingType as any) || 'saddle_stitch',
      quantity: mergedParams.quantity!,
      taxRate: mergedParams.taxRate ?? 0,
      shippingRegion: mergedParams.shippingRegion ?? 'domestic',
    })
    return { quoteResult, assumptions, missingHint: `默认内页克重 ${defaults.innerWeight}g` }
  }

  if (productType === 'flyer' && matchMissing(missingFields, ['printSides'])) {
    const printSides = pickFlyerPrintSidesDefault(mergedParams)
    const assumptions = [
      printSides === 'double'
        ? '默认双面印刷（大批量常见）'
        : '默认单面印刷（小批量常见）',
    ]
    const quoteResult = calculateFlyerQuote({
      finishedSize: mergedParams.finishedSize!,
      quantity: mergedParams.quantity!,
      paperType: (mergedParams.paperType as any) || 'coated',
      paperWeight: mergedParams.paperWeight!,
      printSides,
      taxRate: mergedParams.taxRate ?? 0,
      shippingRegion: mergedParams.shippingRegion ?? 'domestic',
    })
    const singleSideQuote = calculateFlyerQuote({
      finishedSize: mergedParams.finishedSize!,
      quantity: mergedParams.quantity!,
      paperType: (mergedParams.paperType as any) || 'coated',
      paperWeight: mergedParams.paperWeight!,
      printSides: 'single',
      taxRate: mergedParams.taxRate ?? 0,
      shippingRegion: mergedParams.shippingRegion ?? 'domestic',
    })
    const doubleSideQuote = calculateFlyerQuote({
      finishedSize: mergedParams.finishedSize!,
      quantity: mergedParams.quantity!,
      paperType: (mergedParams.paperType as any) || 'coated',
      paperWeight: mergedParams.paperWeight!,
      printSides: 'double',
      taxRate: mergedParams.taxRate ?? 0,
      shippingRegion: mergedParams.shippingRegion ?? 'domestic',
    })

    return {
      quoteResult,
      assumptions,
      missingHint: printSides === 'double' ? '默认双面印刷' : '默认单面印刷',
      alternatives: {
        单面参考价: singleSideQuote,
        双面参考价: doubleSideQuote,
      },
    }
  }

  if (productType === 'business_card') {
    const defaults = getEstimatedDefaults('business_card')
    const isEstimatable = isMissingSetAllowed('business_card', missingFields)

    if (isEstimatable && mergedParams.finishedSize && mergedParams.quantity && mergedParams.printSides) {
      const assumptions: string[] = []
      const paperType = (mergedParams.paperType as any) || defaults.paperType
      const paperWeight = mergedParams.paperWeight ?? pickBusinessCardPaperWeight({ ...mergedParams, paperType })

      if (!mergedParams.paperType) assumptions.push('默认材质铜版纸')
      if (!mergedParams.paperWeight) assumptions.push(`默认克重 ${paperWeight}g`)

      const quoteResult = calculateBusinessCardQuote({
        finishedSize: mergedParams.finishedSize!,
        quantity: mergedParams.quantity!,
        paperType,
        paperWeight,
        printSides: (mergedParams.printSides as any) || 'double',
        finishType: (mergedParams.finishType as any) || 'none',
        taxRate: mergedParams.taxRate ?? 0,
        shippingRegion: mergedParams.shippingRegion ?? 'domestic',
      })
      return {
        quoteResult,
        assumptions,
        missingHint: `默认材质 ${paperType === 'coated' ? '铜版纸' : paperType}，默认克重 ${paperWeight}g`,
      }
    }
  }

  if (productType === 'poster' && matchMissing(missingFields, ['paperWeight'])) {
    const defaults = pickPosterEstimatedDefaults()
    const assumptions = [`默认克重 ${defaults.paperWeight}g`]
    const quoteResult = calculatePosterQuote({
      finishedSize: mergedParams.finishedSize!,
      quantity: mergedParams.quantity!,
      paperType: (mergedParams.paperType as any) || 'coated',
      paperWeight: defaults.paperWeight,
      lamination: (mergedParams.lamination as any) || defaults.lamination,
      taxRate: mergedParams.taxRate ?? 0,
      shippingRegion: mergedParams.shippingRegion ?? 'domestic',
    })
    return {
      quoteResult,
      assumptions,
      missingHint: `默认克重 ${defaults.paperWeight}g`,
    }
  }

  return null
}

function mergeParameters(historical: Record<string, any> | null, current: Record<string, any>): Record<string, any> {
  const merged = { ...historical }

  const validFields = [
    'productType',
    'finishedSize',
    'quantity',
    'coverPaper',
    'coverWeight',
    'innerPaper',
    'innerWeight',
    'bindingType',
    'pageCount',
    'paperType',
    'paperWeight',
    'printSides',
    'finishType',
    'lamination',
  ]

  validFields.forEach((key) => {
    if (current[key] !== undefined && current[key] !== null) {
      if (
        key === 'productType' &&
        historical?.productType &&
        historical.productType !== 'album' &&
        current.productType === 'album'
      ) {
        return
      }
      merged[key] = current[key]
    }
  })

  if (merged.productType === 'poster') {
    if (!merged.paperType && merged.coverPaper) {
      merged.paperType = merged.coverPaper
    }
    if (!merged.paperWeight && merged.coverWeight) {
      merged.paperWeight = merged.coverWeight
    }
  }

  delete merged.mergedParams
  delete merged.missingFields

  return merged
}

function checkMissingFields(params: Record<string, any>): string[] {
  const requiredFields = getRequiredFields(params.productType)

  return requiredFields.filter((key) => {
    const value = params[key]
    if (value === undefined || value === null) {
      return true
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true
    }
    return false
  })
}

function generateHandoffReply(reason: 'out_of_scope_or_complex' | 'insufficient_safe_context' | 'unsupported_or_unstable_answer' = 'unsupported_or_unstable_answer'): string {
  return buildStableHandoffReply(reason)
}

function generateSimpleProductDeactivatedReply(productType?: string): string {
  const productLabel = getProductSchema(productType).nameZh
  return `这边先跟您说明一下，目前自动报价主要支持一期复杂包装，${productLabel} 这类先走人工核价会更稳。您如果方便，可以继续把数量、尺寸、纸张和工艺发我，我帮您整理给人工；如果您要做飞机盒、双插盒、开窗彩盒、说明书、内托或封口贴，也可以直接在这里继续自动预报价。`
}

function generateComplaintHandoffReply(): string {
  return '这个问题我先帮您转给人工同事优先跟进，避免耽误处理。您也可以把具体情况、订单信息或截图继续发在当前会话里。'
}

function isReusableComplexPackagingContextAction(action?: string | null): boolean {
  return action === 'supplement_params'
    || action === 'modify_existing_item'
    || action === 'add_sub_item'
    || action === 'remove_sub_item'
    || action === 'view_existing_quote'
}

function buildComplexPackagingClarificationReply(message: string): string {
  if (looksLikeAbnormalNoiseInput(message)) {
    return buildUnstableBusinessInputReply(message, true)
  }

  if (message.trim().length <= 12) {
    return '抱歉，我这边没法确认您这条是在补充当前报价信息。您可以直接告诉我想改哪一项，或者我帮您转人工处理。'
  }

  return '抱歉，这条内容我暂时没法和当前报价对应上。您可以再说一下是想改参数、加配件、删子项，还是查看当前结果。'
}

function shouldClarifyComplexPackagingFollowUp(params: {
  message: string
  intent: ChatIntent
  hasPreviousPackagingState: boolean
  complexPackagingRequest: boolean
  complexPackagingAction?: string | null
  messageProductType?: string
}): boolean {
  if (!params.hasPreviousPackagingState || params.complexPackagingRequest || isReusableComplexPackagingContextAction(params.complexPackagingAction)) {
    return false
  }

  if (params.messageProductType || looksLikeFreshQuoteRequest(params.message)) {
    return false
  }

  return params.intent === 'UNKNOWN'
    || params.intent === 'PARAM_SUPPLEMENT'
    || params.intent === 'QUOTE_REQUEST'
}

function generateRecommendationUpdatedReply(patchSummary?: string, productType?: string): string {
  const summaryText = patchSummary ? `好的，这版我已经按您的意思改成：${patchSummary}。` : '好的，这版方案我已经帮您更新了。'
  if (productType && ['mailer_box', 'tuck_end_box', 'window_box', 'leaflet_insert', 'box_insert', 'seal_sticker'].includes(productType)) {
    return `${summaryText} 如果这版可以，您继续把还没定的尺寸、材质、印色、数量或工艺发我，我就按这条线往下算。`
  }

  return `${summaryText} 如果这版方向合适，您可以直接说“按这个方案报价”，或者把数量、尺寸这些细节继续补给我。`
}

function generateRerecommendedReply(reply: string, productType?: string): string {
  const normalized = reply
    .replace('如果您需要，我也可以按这个方案给您估个价。', '')
    .replace('如果这版方向合适，您可以直接说“按这个方案报价”，或者把数量、尺寸等细节补给我，我继续往下收。', '')
    .replace('如果这个方向对了，直接把尺寸、材质、印色、数量和工艺发我，我就按这条线继续预估。', '')
    .trim()

  if (productType && ['mailer_box', 'tuck_end_box', 'window_box', 'leaflet_insert', 'box_insert', 'seal_sticker'].includes(productType)) {
    return `可以，这边给您换一版更贴近需求的方向。${normalized} 如果这版更合适，您继续把尺寸、材质、印色、数量和工艺发我，我就接着往下估。`
  }

  return `可以，这边给您换一版更贴近需求的方向。${normalized} 如果这版更合适，您可以直接说“按这个方案报价”，或者把还没定的参数继续发我。`
}

type ChatRouteDeps = {
  extractQuoteParams: typeof extractQuoteParams
  routeMessage: typeof routeMessage
  answerKnowledgeQuestion: typeof answerKnowledgeQuestion
}

function mapAgentRouteToIntentResult(routeDecision: AgentRouteDecision): DetectIntentResult | null {
  switch (routeDecision.intent) {
    case 'FILE_BASED_INQUIRY':
      return { intent: 'FILE_REVIEW_REQUEST', reason: routeDecision.reason }
    case 'ASK_HUMAN':
      return { intent: 'HUMAN_REQUEST', reason: routeDecision.reason }
    case 'COMPLAINT_OR_RISK':
      return { intent: 'COMPLAINT', reason: routeDecision.reason }
    case 'ORDER_PROGRESS':
      return { intent: 'PROGRESS_INQUIRY', reason: routeDecision.reason }
    case 'PRICE_NEGOTIATION':
      return { intent: 'BARGAIN_REQUEST', reason: routeDecision.reason }
    default:
      return null
  }
}

export function createChatPostHandler(
  deps: Partial<ChatRouteDeps> = {}
) {
  const resolvedDeps: ChatRouteDeps = {
    extractQuoteParams,
    routeMessage,
    answerKnowledgeQuestion,
    ...deps,
  }

  return async function POST(request: Request) {
    return withErrorHandler(async () => {
      const timing = createTimingTracker('chat-api')
      let payload: any

      try {
        payload = await request.json()
      } catch {
        return createErrorResponse('请求体格式无效', ErrorCode.VALIDATION_ERROR, 400)
      }

      if (!payload.message || typeof payload.message !== 'string' || payload.message.trim().length === 0) {
        return createErrorResponse('消息内容不能为空', ErrorCode.VALIDATION_ERROR, 400)
      }

      const requestId = getRequestTraceId(request)

      let conversationId: number
      let existingConversation: Awaited<ReturnType<typeof getConversationById>> | null = null
      if (payload.conversationId && typeof payload.conversationId === 'number') {
        const existing = await getConversationById(payload.conversationId)
        existingConversation = existing
        if (!existing) {
          const conv = await createConversation()
          conversationId = conv.id
        } else {
          conversationId = existing.id
        }
      } else {
        const conv = await createConversation()
        conversationId = conv.id
      }

      const respond = (body: Record<string, any>) => {
        timing.mark(`respond:${body.status ?? 'ok'}`)
        timing.flush({
          conversationId,
          intent: typeof body.intent === 'string' ? body.intent : undefined,
          status: typeof body.status === 'string' ? body.status : undefined,
        })
        return NextResponse.json(body)
      }

      await addMessageToConversation(conversationId, 'CUSTOMER', payload.message)

      const [conversationDetails, historicalParams] = await Promise.all([
        getConversationWithDetails(conversationId),
        payload.conversationId
          ? getLatestParametersForConversation(conversationId)
          : Promise.resolve(null),
      ])
      timing.mark('context_loaded')

      const latestAssistantMetadata = [...(conversationDetails?.messages || [])]
        .reverse()
        .find((message) => message.sender === 'ASSISTANT' && message.metadata && typeof message.metadata === 'object')
        ?.metadata as Record<string, any> | undefined
      const pendingClarificationMetadata = isClarificationTriggeredMetadata(latestAssistantMetadata)
        ? latestAssistantMetadata
        : null

      const withClarificationMetadata = (metadata: Record<string, any>) => {
        const responseStatus = typeof metadata.responseStatus === 'string' ? metadata.responseStatus : null

        if (responseStatus === 'intent_only') {
          return {
            ...metadata,
            ...buildClarificationTriggerMetadata({
              clarificationReason: typeof metadata.clarificationReason === 'string' ? metadata.clarificationReason : null,
              blockedContextReuse: Boolean(metadata.blockedContextReuse),
              fallbackMode: typeof metadata.fallbackMode === 'string' ? metadata.fallbackMode : null,
            }),
          }
        }

        const clarificationResolutionMetadata = buildClarificationResolutionMetadata({
          clarificationMetadata: pendingClarificationMetadata,
          responseStatus,
        })

        return Object.keys(clarificationResolutionMetadata).length > 0
          ? { ...metadata, ...clarificationResolutionMetadata }
          : metadata
      }

      const addAssistantMessage = (reply: string, metadata: Record<string, any>) => {
        return addMessageToConversation(conversationId, 'ASSISTANT', reply, withClarificationMetadata(metadata))
      }

      const latestRecommendedParams = getLatestRecommendedParams(conversationDetails)
      const messageProductType = extractExplicitProductType(payload.message)
      const activeContextProductType = getActiveContextProductType(historicalParams, latestRecommendedParams)
      const resetQuoteContext = shouldResetQuoteContext(payload.message, messageProductType, activeContextProductType)
      const activeHistoricalParams = resetQuoteContext ? null : historicalParams
      const activeRecommendedParams = resetQuoteContext ? null : latestRecommendedParams
      const existingPackagingState = getLatestComplexPackagingState(conversationDetails)

      const agentRoute = await resolvedDeps.routeMessage({
        message: payload.message,
        conversationStatus: existingConversation?.status,
        hasHistoricalParams: Boolean(activeHistoricalParams),
        hasRecommendedParams: Boolean(activeRecommendedParams),
      }, undefined, {
        conversationId,
        requestId,
      })
      timing.mark('agent_routed')

      if (agentRoute.intent === 'KNOWLEDGE_QA' && agentRoute.shouldUseRAG) {
        const knowledgeIntentResult = detectIntent({
          message: payload.message,
          conversationStatus: existingConversation?.status,
          hasHistoricalParams: Boolean(activeHistoricalParams),
          hasRecommendedParams: Boolean(activeRecommendedParams),
        })
        timing.mark('intent_detected')

        const knowledgeAnswer = await resolvedDeps.answerKnowledgeQuestion(payload.message, {}, {
          conversationId,
          requestId,
        })
        timing.mark('rag_completed')

        const consultationResult = isNonQuoteFlowIntent(knowledgeIntentResult.intent)
          ? handleConsultationIntent(knowledgeIntentResult.intent, payload.message)
          : null
        const lightweightBusinessResult = handleLightweightBusinessIntent(
          knowledgeIntentResult.intent,
          conversationDetails,
          payload.message
        )
        const recommendedParams = consultationResult?.recommendedParams || lightweightBusinessResult?.recommendedParams
        const responseStatus = consultationResult?.status || lightweightBusinessResult?.status || 'knowledge_reply'
        const responseIntent = consultationResult?.consultationIntent || knowledgeIntentResult.intent || 'KNOWLEDGE_QA'
        const answerabilityDecision = assessAnswerability({
          message: payload.message,
          intent: responseIntent,
          consultationResolved: Boolean(consultationResult || lightweightBusinessResult),
          hasContextProductType: Boolean(activeContextProductType),
          hasComplexPackagingState: Boolean(existingPackagingState),
          insufficientKnowledge: knowledgeAnswer.insufficientKnowledge,
        })

        if (answerabilityDecision.shouldHandoff) {
          const reply = answerabilityDecision.reply || generateHandoffReply('unsupported_or_unstable_answer')

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: responseIntent,
            branch: 'rag_consultation_handoff',
            responseStatus: 'handoff_required',
            usedRag: true,
            executedQuoteEngine: false,
            executedHandoff: true,
            note: answerabilityDecision.reason,
          })

          await updateConversationStatus(conversationId, 'PENDING_HUMAN')
          await createHandoffRecord(conversationId, `answerability:${answerabilityDecision.reason}`, 'sales_team')
          await addAssistantMessage(reply, {
            intent: responseIntent,
            intentReason: knowledgeIntentResult.reason,
            responseStatus: 'handoff_required',
            answerabilityReason: answerabilityDecision.reason,
            fallbackMode: 'fallback_to_human',
          })

          return respond({
            ok: true,
            status: 'handoff_required',
            intent: responseIntent,
            intentReason: knowledgeIntentResult.reason,
            conversationId,
            reply,
            answerabilityReason: answerabilityDecision.reason,
            fallbackMode: 'fallback_to_human',
          })
        }

        const reply = consultationResult?.reply || lightweightBusinessResult?.reply || knowledgeAnswer.reply

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: responseIntent,
          branch: 'rag_consultation',
          responseStatus,
          usedRag: true,
          executedQuoteEngine: false,
          executedHandoff: false,
          note: knowledgeAnswer.answerType,
        })

        await addAssistantMessage(reply, {
          intent: responseIntent,
          intentReason: knowledgeIntentResult.reason,
          responseStatus,
          agentRoute,
          ragQuery: knowledgeAnswer.rewrittenQuery,
          retrievedKnowledgeIds: knowledgeAnswer.snippets.map((snippet) => snippet.id),
          conservativeRag: knowledgeAnswer.conservative,
          recommendedParams,
          consultationIntent: consultationResult?.consultationIntent,
          matchedKnowledgeCardId: consultationResult?.matchedKnowledgeCardId,
          matchedKnowledgeCardTitle: consultationResult?.matchedKnowledgeCardTitle,
          consultationCategory: consultationResult?.consultationCategory,
          hasRecommendedParams: consultationResult?.hasRecommendedParams,
          productType: consultationResult?.productType || recommendedParams?.productType,
          candidateProductTypes: consultationResult?.candidateProductTypes,
          conversationAction: lightweightBusinessResult?.conversationAction,
          ragFallbackUsed: knowledgeAnswer.fallbackUsed,
          ragFallbackReason: knowledgeAnswer.fallbackReason,
          ragAnswerType: knowledgeAnswer.answerType,
          ragRewriteStrategy: knowledgeAnswer.rewriteStrategy,
          insufficientKnowledge: knowledgeAnswer.insufficientKnowledge,
        })

        return respond({
          ok: true,
          status: responseStatus,
          intent: responseIntent,
          intentReason: knowledgeIntentResult.reason,
          conversationId,
          reply,
          routeDecision: agentRoute,
          ragQuery: knowledgeAnswer.rewrittenQuery,
          retrievedKnowledge: knowledgeAnswer.snippets.map((snippet) => ({
            id: snippet.id,
            title: snippet.title,
            source: snippet.source,
          })),
          conservativeRag: knowledgeAnswer.conservative,
          recommendedParams,
          consultationIntent: consultationResult?.consultationIntent,
          matchedKnowledgeCardId: consultationResult?.matchedKnowledgeCardId,
          matchedKnowledgeCardTitle: consultationResult?.matchedKnowledgeCardTitle,
          consultationCategory: consultationResult?.consultationCategory,
          hasRecommendedParams: consultationResult?.hasRecommendedParams,
          productType: consultationResult?.productType || recommendedParams?.productType,
          candidateProductTypes: consultationResult?.candidateProductTypes,
          conversationAction: lightweightBusinessResult?.conversationAction,
          ragFallbackUsed: knowledgeAnswer.fallbackUsed,
          ragFallbackReason: knowledgeAnswer.fallbackReason,
          ragAnswerType: knowledgeAnswer.answerType,
          ragRewriteStrategy: knowledgeAnswer.rewriteStrategy,
          insufficientKnowledge: knowledgeAnswer.insufficientKnowledge,
        })
      }

      const detectedIntentResult = detectIntent({
        message: payload.message,
        conversationStatus: existingConversation?.status,
        hasHistoricalParams: Boolean(activeHistoricalParams),
        hasRecommendedParams: Boolean(activeRecommendedParams),
      })
      const forcedIntentResult = mapAgentRouteToIntentResult(agentRoute)
      const intentResult = forcedIntentResult || detectedIntentResult
      timing.mark('intent_detected')

      if (isImmediateHandoffIntent(intentResult.intent) && intentResult.intent !== 'COMPLAINT') {
        const reply = generateHandoffReply()

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'handoff_required',
          responseStatus: 'handoff_required',
          usedRag: false,
          executedHandoff: true,
          executedQuoteEngine: false,
        })

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, `intent:${intentResult.intent}`, 'sales_team')
        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'handoff_required',
        })

        return respond({
          ok: true,
          status: 'handoff_required',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
        })
      }

      if (intentResult.intent === 'COMPLAINT') {
        const reply = generateComplaintHandoffReply()

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'complaint_handoff',
          responseStatus: 'handoff_required',
          usedRag: false,
          executedHandoff: true,
          executedQuoteEngine: false,
        })

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, 'intent:COMPLAINT', 'service_team')
        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'handoff_required',
        })

        return respond({
          ok: true,
          status: 'handoff_required',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
        })
      }

      if (intentResult.intent === 'PROGRESS_INQUIRY') {
        const progressResult = handleLightweightBusinessIntent(intentResult.intent, conversationDetails, payload.message)
        const reply = progressResult?.reply || getIntentPlaceholderReply(intentResult.intent)
        const responseStatus = progressResult?.status || 'progress_inquiry'
        timing.mark('progress_short_circuit')

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'progress_short_circuit',
          responseStatus,
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: false,
        })

        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus,
          conversationAction: progressResult?.conversationAction,
        })

        return respond({
          ok: true,
          status: responseStatus,
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          conversationAction: progressResult?.conversationAction,
        })
      }

      const previousPackagingState = existingPackagingState
      const complexPackagingTurn = resolveComplexPackagingConversationTurn(payload.message, previousPackagingState)
      const complexPackagingRequest = complexPackagingTurn.request
      const hasReusablePackagingContext = Boolean(
        previousPackagingState && isReusableComplexPackagingContextAction(complexPackagingTurn.action)
      )
      const shouldBlockHistoricalQuoteReuse = Boolean(
        previousPackagingState && !complexPackagingRequest && !hasReusablePackagingContext
      )
      const scopedHistoricalParams = shouldBlockHistoricalQuoteReuse ? null : activeHistoricalParams
      const scopedRecommendedParams = shouldBlockHistoricalQuoteReuse ? null : activeRecommendedParams
      const scopedContextProductType = shouldBlockHistoricalQuoteReuse ? undefined : activeContextProductType
      const unstableInputDecision = assessStableBusinessInput({
        message: payload.message,
        hasContext: Boolean(scopedHistoricalParams || scopedRecommendedParams || previousPackagingState),
      })

      if (unstableInputDecision.shouldBlock) {
        const reply = unstableInputDecision.reply || buildUnstableBusinessInputReply(payload.message, Boolean(scopedHistoricalParams || scopedRecommendedParams || previousPackagingState))

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'unstable_input_clarification',
          responseStatus: 'intent_only',
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: false,
          note: unstableInputDecision.reason,
        })

        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'intent_only',
          clarificationReason: unstableInputDecision.reason,
          fallbackMode: 'clarify_restate_request',
          blockedContextReuse: Boolean(scopedHistoricalParams || scopedRecommendedParams || previousPackagingState),
        })

        return respond({
          ok: true,
          status: 'intent_only',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          clarificationReason: unstableInputDecision.reason,
          fallbackMode: 'clarify_restate_request',
          blockedContextReuse: Boolean(scopedHistoricalParams || scopedRecommendedParams || previousPackagingState),
        })
      }

      const recommendationRerequest = scopedRecommendedParams
        ? buildRecommendationRerequestMessage(scopedRecommendedParams, payload.message)
        : null

      if (
        scopedRecommendedParams &&
        recommendationRerequest &&
        (intentResult.intent === 'SOLUTION_RECOMMENDATION' || intentResult.intent === 'BARGAIN_REQUEST')
      ) {
        const rerecommended = handleConsultationIntent('SOLUTION_RECOMMENDATION', recommendationRerequest.query)

        if (rerecommended?.recommendedParams) {
          const reply = generateRerecommendedReply(rerecommended.reply, rerecommended.recommendedParams.productType)

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: intentResult.intent,
            branch: 'recommendation_rerequest',
            responseStatus: 'recommendation_updated',
            usedRag: false,
            executedHandoff: false,
            executedQuoteEngine: false,
          })

          await addAssistantMessage(reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'recommendation_updated',
            recommendedParams: rerecommended.recommendedParams,
            rerecommendationMode: recommendationRerequest.mode,
            rerecommendationQuery: recommendationRerequest.query,
          })

          return respond({
            ok: true,
            status: 'recommendation_updated',
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            conversationId,
            reply,
            recommendedParams: rerecommended.recommendedParams,
          })
        }
      }

      if (shouldClarifyComplexPackagingFollowUp({
        message: payload.message,
        intent: intentResult.intent,
        hasPreviousPackagingState: Boolean(previousPackagingState),
        complexPackagingRequest: Boolean(complexPackagingRequest),
        complexPackagingAction: complexPackagingTurn.action,
        messageProductType,
      })) {
        const reply = buildComplexPackagingClarificationReply(payload.message)

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'complex_packaging_context_clarification',
          responseStatus: 'intent_only',
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: false,
          note: 'blocked_unstable_complex_packaging_context_reuse',
        })

        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'intent_only',
          clarificationReason: 'complex_packaging_context_not_stably_matched',
          fallbackMode: 'clarify_current_quote_relation',
          blockedContextReuse: true,
          complexPackagingState: previousPackagingState,
        })

        return respond({
          ok: true,
          status: 'intent_only',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          clarificationReason: 'complex_packaging_context_not_stably_matched',
          fallbackMode: 'clarify_current_quote_relation',
          blockedContextReuse: true,
          complexPackagingState: previousPackagingState,
        })
      }

      if (isNonQuoteFlowIntent(intentResult.intent) && intentResult.intent !== 'UNKNOWN') {
        const consultationResult = handleConsultationIntent(intentResult.intent, payload.message)
        const lightweightBusinessResult = handleLightweightBusinessIntent(intentResult.intent, conversationDetails, payload.message)
        const answerabilityDecision = assessAnswerability({
          message: payload.message,
          intent: intentResult.intent,
          consultationResolved: Boolean(consultationResult || lightweightBusinessResult),
          hasContextProductType: Boolean(scopedContextProductType),
          hasComplexPackagingState: hasReusablePackagingContext,
        })

        if (answerabilityDecision.shouldHandoff) {
          const reply = answerabilityDecision.reply || generateHandoffReply('unsupported_or_unstable_answer')

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: intentResult.intent,
            branch: 'non_quote_fallback_handoff',
            responseStatus: 'handoff_required',
            usedRag: false,
            executedHandoff: true,
            executedQuoteEngine: false,
            note: answerabilityDecision.reason,
          })

          await updateConversationStatus(conversationId, 'PENDING_HUMAN')
          await createHandoffRecord(conversationId, `answerability:${answerabilityDecision.reason}`, 'sales_team')
          await addAssistantMessage(reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'handoff_required',
            answerabilityReason: answerabilityDecision.reason,
            fallbackMode: 'fallback_to_human',
          })

          return respond({
            ok: true,
            status: 'handoff_required',
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            conversationId,
            reply,
            answerabilityReason: answerabilityDecision.reason,
            fallbackMode: 'fallback_to_human',
          })
        }

        const reply = consultationResult?.reply || lightweightBusinessResult?.reply || getIntentPlaceholderReply(intentResult.intent)
        const responseStatus = consultationResult?.status || lightweightBusinessResult?.status || 'intent_only'
        const recommendedParams = consultationResult?.recommendedParams || lightweightBusinessResult?.recommendedParams

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'non_quote_flow',
          responseStatus,
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: false,
        })

        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus,
          recommendedParams,
          consultationIntent: consultationResult?.consultationIntent,
          matchedKnowledgeCardId: consultationResult?.matchedKnowledgeCardId,
          matchedKnowledgeCardTitle: consultationResult?.matchedKnowledgeCardTitle,
          consultationCategory: consultationResult?.consultationCategory,
          hasRecommendedParams: consultationResult?.hasRecommendedParams,
          productType: consultationResult?.productType || recommendedParams?.productType,
          candidateProductTypes: consultationResult?.candidateProductTypes,
          conversationAction: lightweightBusinessResult?.conversationAction,
        })

        return respond({
          ok: true,
          status: responseStatus,
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          recommendedParams,
          consultationIntent: consultationResult?.consultationIntent,
          matchedKnowledgeCardId: consultationResult?.matchedKnowledgeCardId,
          matchedKnowledgeCardTitle: consultationResult?.matchedKnowledgeCardTitle,
          consultationCategory: consultationResult?.consultationCategory,
          hasRecommendedParams: consultationResult?.hasRecommendedParams,
          productType: consultationResult?.productType || recommendedParams?.productType,
          candidateProductTypes: consultationResult?.candidateProductTypes,
          conversationAction: lightweightBusinessResult?.conversationAction,
        })
      }

      const answerabilityDecision = assessAnswerability({
        message: payload.message,
        intent: intentResult.intent,
        hasContextProductType: Boolean(scopedContextProductType),
        hasComplexPackagingState: hasReusablePackagingContext,
        hasComplexPackagingRequest: Boolean(complexPackagingRequest),
      })

      if (answerabilityDecision.shouldHandoff) {
        const reply = answerabilityDecision.reply || generateHandoffReply('unsupported_or_unstable_answer')

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'answerability_fallback_handoff',
          responseStatus: 'handoff_required',
          usedRag: false,
          executedHandoff: true,
          executedQuoteEngine: false,
          note: answerabilityDecision.reason,
        })

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, `answerability:${answerabilityDecision.reason}`, 'sales_team')
        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'handoff_required',
          answerabilityReason: answerabilityDecision.reason,
          fallbackMode: 'fallback_to_human',
        })

        return respond({
          ok: true,
          status: 'handoff_required',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          answerabilityReason: answerabilityDecision.reason,
          fallbackMode: 'fallback_to_human',
        })
      }

      if (complexPackagingRequest) {
        const decision = decideComplexPackagingQuotePath(complexPackagingRequest)
        const quoteResult = calculateBundleQuote(complexPackagingRequest)
        const complexPackagingShadow = buildComplexPackagingSecondPhaseShadow({
          message: payload.message,
          phaseOneProductType: complexPackagingRequest.mainItem.productType,
          phaseOneStatus: decision.status,
        })
        timing.mark('complex_packaging_decided')

        if (decision.status === 'handoff_required') {
          const packagingReview = buildPackagingReviewSummary({
            status: 'handoff_required',
            decision,
            request: complexPackagingRequest,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: true,
          })
          const reply = prependActionLead(
            generateComplexPackagingHandoffReply(complexPackagingRequest.referenceFileCategory),
            complexPackagingTurn.action,
            complexPackagingTurn.targetItemTitle,
          )

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: intentResult.intent,
            branch: 'complex_packaging_handoff',
            responseStatus: 'handoff_required',
            usedRag: false,
            executedHandoff: true,
            executedQuoteEngine: false,
          })

          await updateConversationStatus(conversationId, 'PENDING_HUMAN')
          await createHandoffRecord(conversationId, '复杂包装文件参考或缺参，需人工复核', 'sales_team')
          await addAssistantMessage(reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'handoff_required',
            complexPackagingDecision: decision,
            complexPackagingRequest,
            complexPackagingState: complexPackagingRequest,
            complexPackagingShadow,
            packagingReview,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: true,
            conversationAction: complexPackagingTurn.action,
            conversationActionTargetItemType: complexPackagingTurn.targetItemType,
            conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
          })

          return respond({
            ok: true,
            status: 'handoff_required',
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            conversationId,
            reply,
            missingFields: decision.missingFields,
            missingDetails: decision.missingDetails,
            complexPackagingState: complexPackagingRequest,
            packagingReview,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: true,
            conversationAction: complexPackagingTurn.action,
            conversationActionTargetItemType: complexPackagingTurn.targetItemType,
            conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
          })
        }

        if (decision.status === 'missing_fields') {
          const packagingReview = buildPackagingReviewSummary({
            status: 'missing_fields',
            decision,
            request: complexPackagingRequest,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: complexPackagingRequest.requiresHumanReview,
          })
          const reply = prependActionLead(
            formatComplexPackagingMissingReply(decision.missingDetails),
            complexPackagingTurn.action,
            complexPackagingTurn.targetItemTitle,
          )

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: intentResult.intent,
            branch: 'complex_packaging_missing_fields',
            responseStatus: 'missing_fields',
            usedRag: false,
            executedHandoff: false,
            executedQuoteEngine: false,
          })

          await updateConversationStatus(conversationId, 'MISSING_FIELDS')
          await addAssistantMessage(reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'missing_fields',
            complexPackagingDecision: decision,
            complexPackagingRequest,
            complexPackagingState: complexPackagingRequest,
            complexPackagingShadow,
            packagingReview,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: complexPackagingRequest.requiresHumanReview,
            conversationAction: complexPackagingTurn.action,
            conversationActionTargetItemType: complexPackagingTurn.targetItemType,
            conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
          })

          return respond({
            ok: true,
            status: 'missing_fields',
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            conversationId,
            reply,
            missingFields: decision.missingFields,
            missingDetails: decision.missingDetails,
            mergedParams: quoteResult.normalizedParams,
            complexPackagingState: complexPackagingRequest,
            packagingReview,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: complexPackagingRequest.requiresHumanReview,
            conversationAction: complexPackagingTurn.action,
            conversationActionTargetItemType: complexPackagingTurn.targetItemType,
            conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
          })
        }

        if (decision.status === 'estimated') {
          const packagingReview = buildPackagingReviewSummary({
            status: 'estimated',
            decision,
            request: complexPackagingRequest,
            quoteResult,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: true,
          })
          const reply = prependActionLead(
            generateComplexPackagingEstimatedReply(quoteResult),
            complexPackagingTurn.action,
            complexPackagingTurn.targetItemTitle,
          )

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: intentResult.intent,
            branch: 'complex_packaging_estimated',
            responseStatus: 'estimated',
            usedRag: false,
            executedHandoff: false,
            executedQuoteEngine: true,
          })

          await updateConversationStatus(conversationId, 'MISSING_FIELDS')
          await addAssistantMessage(reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'estimated',
            complexPackagingDecision: decision,
            complexPackagingRequest,
            complexPackagingState: complexPackagingRequest,
            complexPackagingShadow,
            estimatedData: quoteResult,
            packagingReview,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: true,
            conversationAction: complexPackagingTurn.action,
            conversationActionTargetItemType: complexPackagingTurn.targetItemType,
            conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
          })

          return respond({
            ok: true,
            status: 'estimated',
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            conversationId,
            reply,
            estimatedData: quoteResult,
            missingFields: decision.missingFields,
            missingDetails: decision.missingDetails,
            complexPackagingState: complexPackagingRequest,
            packagingReview,
            referenceFiles: complexPackagingRequest.referenceFiles,
            requiresHumanReview: true,
            conversationAction: complexPackagingTurn.action,
            conversationActionTargetItemType: complexPackagingTurn.targetItemType,
            conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
          })
        }

        const packagingReview = buildPackagingReviewSummary({
          status: 'quoted',
          decision,
          request: complexPackagingRequest,
          quoteResult,
          referenceFiles: quoteResult.referenceFiles,
          requiresHumanReview: quoteResult.requiresHumanReview,
        })
        const reply = prependActionLead(
          generateComplexPackagingQuoteReply(quoteResult),
          complexPackagingTurn.action,
          complexPackagingTurn.targetItemTitle,
        )
        const packagingProductType = quoteResult.normalizedParams?.productType || complexPackagingRequest.mainItem.productType
        const productSchema = getProductSchema(packagingProductType)
        const unit = getProductUnit(packagingProductType)

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'complex_packaging_quoted',
          responseStatus: 'quoted',
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: true,
        })

        await createQuoteRecord({
          conversationId,
          productType: packagingProductType,
          summary: `${productSchema.nameZh}询价 ${complexPackagingRequest.mainItem.quantity || 0}${unit}`,
          unitPrice: quoteResult.unitPrice,
          totalPrice: quoteResult.totalPrice,
          shippingFee: quoteResult.shippingFee,
          tax: quoteResult.tax,
          finalPrice: quoteResult.finalPrice,
          normalizedParams: {
            ...quoteResult.normalizedParams,
            mainItem: quoteResult.mainItem.normalizedParams,
            subItems: quoteResult.subItems.map((item) => item.normalizedParams),
            isBundle: quoteResult.isBundle,
            requiresHumanReview: quoteResult.requiresHumanReview,
            referenceFiles: quoteResult.referenceFiles,
          },
          pricingDetails: {
            unitPrice: quoteResult.unitPrice,
            totalUnitPrice: quoteResult.totalUnitPrice,
            totalPrice: quoteResult.totalPrice,
            shippingFee: quoteResult.shippingFee,
            tax: quoteResult.tax,
            finalPrice: quoteResult.finalPrice,
            notes: quoteResult.notes,
            items: quoteResult.items,
            packagingReview,
            referenceFiles: quoteResult.referenceFiles,
          },
        })

        await updateConversationStatus(conversationId, 'QUOTED')
        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'quoted',
          complexPackagingDecision: decision,
          complexPackagingState: complexPackagingRequest,
          complexPackagingShadow,
          quoteParams: quoteResult.normalizedParams,
          quoteItems: quoteResult.items,
          packagingReview,
          referenceFiles: quoteResult.referenceFiles,
          requiresHumanReview: quoteResult.requiresHumanReview,
          conversationAction: complexPackagingTurn.action,
          conversationActionTargetItemType: complexPackagingTurn.targetItemType,
          conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
        })

        return respond({
          ok: true,
          status: 'quoted',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          data: quoteResult,
          reply,
          complexPackagingState: complexPackagingRequest,
          packagingReview,
          referenceFiles: quoteResult.referenceFiles,
          requiresHumanReview: quoteResult.requiresHumanReview,
          conversationAction: complexPackagingTurn.action,
          conversationActionTargetItemType: complexPackagingTurn.targetItemType,
          conversationActionTargetItemTitle: complexPackagingTurn.targetItemTitle,
        })
      }

      const earlyDecision = decideQuotePath({
        message: payload.message,
        productType: undefined,
        missingFields: ['productType'],
      })

      if (earlyDecision.status === 'handoff_required') {
        const reply = generateHandoffReply()

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'quote_policy_handoff',
          responseStatus: 'handoff_required',
          usedRag: false,
          executedHandoff: true,
          executedQuoteEngine: false,
        })

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, '涉及设计文件或专业审稿需求', 'design_team')
        await addAssistantMessage(reply, {
          responseStatus: 'handoff_required',
        })

        return respond({
          ok: true,
          status: 'handoff_required',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
        })
      }

      let currentExtracted: ExtractedQuoteParams = await resolvedDeps.extractQuoteParams(payload.message)
      timing.mark('params_extracted')

      if (!currentExtracted.productType && messageProductType) {
        currentExtracted = {
          ...currentExtracted,
          productType: messageProductType,
        }
      }

      currentExtracted = scopedRecommendedParams
        ? sanitizeExtractedParamsForRecommendation(currentExtracted, scopedRecommendedParams)
        : currentExtracted

      const recommendationPatchResult = scopedRecommendedParams && (intentResult.intent === 'RECOMMENDATION_CONFIRMATION' || canPatchRecommendation(intentResult.intent))
        ? applyRecommendedPatch(scopedRecommendedParams, payload.message)
        : null
      timing.mark('recommendation_patch_evaluated')

      const hasRecommendationPatch = Boolean(
        recommendationPatchResult && Object.keys(recommendationPatchResult.patchParams).length > 0
      )

      if (intentResult.intent === 'PARAM_SUPPLEMENT' && scopedRecommendedParams && hasRecommendationPatch) {
        const updatedRecommendationPayload = {
          productType: scopedRecommendedParams.productType,
          recommendedParams: recommendationPatchResult!.mergedRecommendedParams,
          note: scopedRecommendedParams.note,
        }
        const reply = generateRecommendationUpdatedReply(recommendationPatchResult?.patchSummary, scopedRecommendedParams.productType)

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'recommendation_patch_update',
          responseStatus: 'recommendation_updated',
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: false,
        })

        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'recommendation_updated',
          recommendedParams: updatedRecommendationPayload,
          patchParams: recommendationPatchResult?.patchParams,
          mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
          patchSummary: recommendationPatchResult?.patchSummary,
        })

        return respond({
          ok: true,
          status: 'recommendation_updated',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          recommendedParams: updatedRecommendationPayload,
          patchParams: recommendationPatchResult?.patchParams,
          mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
          patchSummary: recommendationPatchResult?.patchSummary,
        })
      }

      const recommendationBaseParams = scopedRecommendedParams && (intentResult.intent === 'RECOMMENDATION_CONFIRMATION' || canPatchRecommendation(intentResult.intent))
        ? sanitizeQuoteParams(buildRecommendationBaseParams(
            recommendationPatchResult
              ? {
                  productType: scopedRecommendedParams.productType,
                  recommendedParams: recommendationPatchResult.mergedRecommendedParams,
                  note: scopedRecommendedParams.note,
                }
              : scopedRecommendedParams,
            scopedHistoricalParams
          ) || {})
        : null

      const debugExtractedParams = buildDebugExtractedParams(
        currentExtracted,
        recommendationBaseParams?.productType || scopedRecommendedParams?.productType || scopedHistoricalParams?.productType
      )

      let mergedParams: Record<string, any> = sanitizeQuoteParams({ ...currentExtracted })
      if (recommendationBaseParams) {
        mergedParams = sanitizeQuoteParams(mergeParameters(recommendationBaseParams, currentExtracted))
      } else if (scopedHistoricalParams) {
        mergedParams = sanitizeQuoteParams(mergeParameters(scopedHistoricalParams, currentExtracted))
      }

      const missingFields = checkMissingFields(mergedParams)

      const routeDecision = decideQuotePath({
        message: payload.message,
        productType: mergedParams.productType,
        missingFields,
      })
      timing.mark('route_decided')

      if (routeDecision.status === 'handoff_required') {
        const isSimpleProductDeactivated = routeDecision.reason === 'simple_product_auto_quote_deactivated'
        const reply = isSimpleProductDeactivated
          ? generateSimpleProductDeactivatedReply(mergedParams.productType)
          : generateHandoffReply()

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'route_decision_handoff',
          responseStatus: 'handoff_required',
          usedRag: false,
          executedHandoff: true,
          executedQuoteEngine: false,
        })

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(
          conversationId,
          isSimpleProductDeactivated
            ? '简单印刷品自动报价已停用，需人工接管'
            : '非标准或高风险询价，需人工接管',
          'sales_team'
        )
        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'handoff_required',
          extractedParams: debugExtractedParams,
          mergedParams,
          recommendationBaseParams,
          patchParams: recommendationPatchResult?.patchParams,
          mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
          patchSummary: recommendationPatchResult?.patchSummary,
          decision: routeDecision,
        })

        return respond({
          ok: true,
          status: 'handoff_required',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
          extractedParams: debugExtractedParams,
          mergedParams,
          recommendationBaseParams,
          patchParams: recommendationPatchResult?.patchParams,
          mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
          patchSummary: recommendationPatchResult?.patchSummary,
        })
      }

      if (routeDecision.status === 'estimated' || routeDecision.status === 'missing_fields') {
        const estimated = buildEstimatedQuote(normalizeProductType(mergedParams.productType), mergedParams, missingFields)
        if (routeDecision.status === 'estimated' && estimated) {
          const reply = generateEstimatedReply(
            mergedParams.productType,
            estimated.quoteResult,
            estimated.assumptions,
            missingFields,
            estimated.missingHint,
            estimated.alternatives
          )

          logRouterDispatch({
            conversationId,
            requestId,
            message: payload.message,
            routerIntent: agentRoute.intent,
            finalIntent: intentResult.intent,
            branch: 'estimated_quote',
            responseStatus: 'estimated',
            usedRag: false,
            executedHandoff: false,
            executedQuoteEngine: false,
          })

          await updateConversationStatus(conversationId, 'MISSING_FIELDS')
          await addAssistantMessage(reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'estimated',
            extractedParams: debugExtractedParams,
            mergedParams,
            recommendationBaseParams,
            patchParams: recommendationPatchResult?.patchParams,
            mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
            patchSummary: recommendationPatchResult?.patchSummary,
            missingFields,
            estimatedData: {
              ...estimated.quoteResult,
              assumptions: estimated.assumptions,
              missingHint: estimated.missingHint,
              alternatives: estimated.alternatives,
            },
          })

          return respond({
            ok: true,
            status: 'estimated',
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            conversationId,
            reply,
            estimatedData: {
              ...estimated.quoteResult,
              assumptions: estimated.assumptions,
              missingHint: estimated.missingHint,
              alternatives: estimated.alternatives,
            },
            missingFields,
            extractedParams: debugExtractedParams,
            mergedParams,
            recommendationBaseParams,
            patchParams: recommendationPatchResult?.patchParams,
            mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
            patchSummary: recommendationPatchResult?.patchSummary,
          })
        }

        const reply = generateMissingFieldsReplyByProduct(mergedParams.productType, missingFields)

        logRouterDispatch({
          conversationId,
          requestId,
          message: payload.message,
          routerIntent: agentRoute.intent,
          finalIntent: intentResult.intent,
          branch: 'missing_fields',
          responseStatus: 'missing_fields',
          usedRag: false,
          executedHandoff: false,
          executedQuoteEngine: false,
        })

        await updateConversationStatus(conversationId, 'MISSING_FIELDS')
        await addAssistantMessage(reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'missing_fields',
          extractedParams: debugExtractedParams,
          mergedParams,
          recommendationBaseParams,
          patchParams: recommendationPatchResult?.patchParams,
          mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
          patchSummary: recommendationPatchResult?.patchSummary,
          missingFields,
        })

        return respond({
          ok: true,
          status: 'missing_fields',
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          missingFields,
          reply,
          extractedParams: debugExtractedParams,
          mergedParams,
          recommendationBaseParams,
          patchParams: recommendationPatchResult?.patchParams,
          mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
          patchSummary: recommendationPatchResult?.patchSummary,
        })
      }

      let quoteResult: any
      let productType = (mergedParams.productType || 'album').toLowerCase()

      if (productType === 'flyer') {
        quoteResult = calculateFlyerQuote({
          finishedSize: mergedParams.finishedSize!,
          quantity: mergedParams.quantity!,
          paperType: (mergedParams.paperType as any) || 'coated',
          paperWeight: mergedParams.paperWeight!,
          printSides: (mergedParams.printSides as any) || 'double',
          taxRate: mergedParams.taxRate ?? 0,
          shippingRegion: mergedParams.shippingRegion ?? 'domestic',
        })
      } else if (productType === 'business_card') {
        quoteResult = calculateBusinessCardQuote({
          finishedSize: mergedParams.finishedSize!,
          quantity: mergedParams.quantity!,
          paperType: (mergedParams.paperType as any) || 'coated',
          paperWeight: mergedParams.paperWeight!,
          printSides: (mergedParams.printSides as any) || 'double',
          finishType: (mergedParams.finishType as any) || 'none',
          taxRate: mergedParams.taxRate ?? 0,
          shippingRegion: mergedParams.shippingRegion ?? 'domestic',
        })
      } else if (productType === 'poster') {
        quoteResult = calculatePosterQuote({
          finishedSize: mergedParams.finishedSize!,
          quantity: mergedParams.quantity!,
          paperType: (mergedParams.paperType as any) || 'coated',
          paperWeight: mergedParams.paperWeight!,
          lamination: (mergedParams.lamination as any) || 'none',
          taxRate: mergedParams.taxRate ?? 0,
          shippingRegion: mergedParams.shippingRegion ?? 'domestic',
        })
      } else {
        productType = 'album'
        quoteResult = calculateAlbumQuote({
          finishedSize: mergedParams.finishedSize!,
          pageCount: mergedParams.pageCount ?? 24,
          coverPaper: (mergedParams.coverPaper as any) || 'standard',
          coverWeight: mergedParams.coverWeight!,
          innerPaper: (mergedParams.innerPaper as any) || 'standard',
          innerWeight: mergedParams.innerWeight!,
          bindingType: (mergedParams.bindingType as any) || 'saddle_stitch',
          quantity: mergedParams.quantity!,
          taxRate: mergedParams.taxRate ?? 0,
          shippingRegion: mergedParams.shippingRegion ?? 'domestic',
        })
      }
      timing.mark('pricing_completed')

      logRouterDispatch({
        conversationId,
        requestId,
        message: payload.message,
        routerIntent: agentRoute.intent,
        finalIntent: intentResult.intent,
        branch: 'quoted',
        responseStatus: 'quoted',
        usedRag: false,
        executedHandoff: false,
        executedQuoteEngine: true,
      })

      const reply = generateQuoteReply(quoteResult, productType)

      const productSchema = getProductSchema(productType)
      const unit = getProductUnit(productType)
      await createQuoteRecord({
        conversationId,
        productType,
        summary: productType === 'flyer'
          ? `${productSchema.nameZh}询价 ${mergedParams.quantity}${unit} ${mergedParams.finishedSize}`
          : productType === 'business_card'
          ? `${productSchema.nameZh}询价 ${mergedParams.quantity}${unit} ${mergedParams.finishedSize}`
          : `${productSchema.nameZh}询价 ${mergedParams.quantity}${unit} ${mergedParams.finishedSize}`,
        unitPrice: quoteResult.unitPrice,
        totalPrice: quoteResult.totalPrice,
        shippingFee: quoteResult.shippingFee,
        tax: quoteResult.tax,
        finalPrice: quoteResult.finalPrice,
        normalizedParams: quoteResult.normalizedParams,
        pricingDetails: {
          notes: quoteResult.notes,
        },
      })

      await updateConversationStatus(conversationId, 'QUOTED')

      await addAssistantMessage(reply, {
        intent: intentResult.intent,
        intentReason: intentResult.reason,
        responseStatus: 'quoted',
        extractedParams: debugExtractedParams,
        mergedParams,
        recommendationBaseParams,
        patchParams: recommendationPatchResult?.patchParams,
        mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
        patchSummary: recommendationPatchResult?.patchSummary,
        quoteParams: quoteResult.normalizedParams,
        missingFields: [],
      })

      return respond({
        ok: true,
        status: 'quoted',
        intent: intentResult.intent,
        intentReason: intentResult.reason,
        conversationId,
        data: quoteResult,
        reply,
        extractedParams: debugExtractedParams,
        mergedParams,
        recommendationBaseParams,
        patchParams: recommendationPatchResult?.patchParams,
        mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
        patchSummary: recommendationPatchResult?.patchSummary,
      })
    }, 'chat-api')
  }
}

export const POST = createChatPostHandler()