import { NextResponse } from 'next/server'
import { extractQuoteParams } from '@/server/ai/extractQuoteParams'
import { calculateAlbumQuote } from '@/server/pricing/albumQuote'
import { calculateFlyerQuote } from '@/server/pricing/flyerQuote'
import { calculateBusinessCardQuote } from '@/server/pricing/businessCardQuote'
import { calculatePosterQuote } from '@/server/pricing/posterQuote'
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
import { detectIntent, extractExplicitProductType, getIntentPlaceholderReply, looksLikeFreshQuoteRequest } from '@/server/intent/detectIntent'
import { applyRecommendedPatch } from '@/server/intent/applyRecommendedPatch'
import { buildRecommendationRerequestMessage } from '@/server/intent/applyRecommendedPatch'
import { handleLightweightBusinessIntent } from '@/server/intent/handleIntent'
import { handleConsultationIntent } from '@/server/intent/handleConsultation'
import { buildRecommendationBaseParams, getLatestRecommendedParams } from '@/server/intent/recommendationContext'
import { canPatchRecommendation, isImmediateHandoffIntent, isNonQuoteFlowIntent } from '@/server/catalog/flowBoundaries'
import { decideQuotePath } from '@/server/quote/workflowPolicy'

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
  extractedParams: Record<string, any>,
  latestRecommendedParams: { productType?: string } | null
): Record<string, any> {
  if (!latestRecommendedParams?.productType || extractedParams.productType === undefined) {
    return extractedParams
  }

  const recommendationProductType = normalizeProductType(latestRecommendedParams.productType)
  const extractedProductType = normalizeProductType(extractedParams.productType)

  if (recommendationProductType === extractedProductType) {
    return extractedParams
  }

  const sanitizedParams = { ...extractedParams }
  delete sanitizedParams.productType
  return sanitizedParams
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
    return '请直接回复缺失参数，例如：页数 32 页。'
  }

  return `可直接回复：${samples.join('，')}。`
}

function generateMissingFieldsReply(missingFields: string[]): string {
  const missingLabels = getMissingFieldsChineseText(undefined, missingFields)
  const guideText = buildDirectReplyGuide(missingFields)
  return `当前信息还不足以生成报价。还缺少：${missingLabels}。${guideText}补齐后可为您生成更准确报价。`
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
  return `已为您生成正式报价：单价 ¥${result.unitPrice}/${unit}，${qty}${unit}共 ¥${result.totalPrice}，加上运费 ¥${result.shippingFee}、税费 ¥${result.tax}，最终价格 ¥${result.finalPrice}。`
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
  const missingHintText = missingHint ? `当前缺少${missingLabels}，已按${missingHint}估算。` : `当前缺少${missingLabels}，已按常见值估算。`
  const alternativeText = alternatives
    ? ` 参考：${Object.entries(alternatives)
      .map(([name, v]) => `${name} ¥${(v as any).finalPrice}`)
      .join('；')}。`
    : ''
  const schema = getProductSchema(productType)
  const estimatedHint = schema.statusHints?.estimated ? ` ${schema.statusHints.estimated}` : ''
  return `已为您生成参考报价${assumptionsText}：单价 ¥${result.unitPrice}，数量 ${qty}，预估总价 ¥${result.finalPrice}。${missingHintText}${alternativeText}${estimatedHint}补齐后可生成更准确报价，最终价格以补齐参数或人工复核为准。`
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

function generateHandoffReply(): string {
  return '您的询价涉及设计文件或专业审稿需求，已为您转接专业人工服务团队进行核价。请稍候，我们的专业人员将尽快联系您。'
}

function generateComplaintHandoffReply(): string {
  return '已识别为投诉或异常反馈，当前为保证处理质量，已为您转接人工团队继续跟进。'
}

function generateRecommendationUpdatedReply(patchSummary?: string): string {
  const summaryText = patchSummary ? `已按您的要求更新当前推荐方案：${patchSummary}。` : '当前推荐方案已更新。'
  return `${summaryText} 如需报价，可直接说“按这个方案报价”或“现在算一下”。`
}

function generateRerecommendedReply(reply: string): string {
  const normalized = reply.replace('如果您需要，我也可以按这个方案给您估个价。', '').trim()
  return `已为您调整推荐方案。${normalized} 如果您认可，可直接说“按这个方案报价”或“现在算一下”。`
}

type ChatRouteDeps = {
  extractQuoteParams: typeof extractQuoteParams
}

export function createChatPostHandler(deps: ChatRouteDeps = { extractQuoteParams }) {
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

      const latestRecommendedParams = getLatestRecommendedParams(conversationDetails)
      const messageProductType = extractExplicitProductType(payload.message)
      const activeContextProductType = getActiveContextProductType(historicalParams, latestRecommendedParams)
      const resetQuoteContext = shouldResetQuoteContext(payload.message, messageProductType, activeContextProductType)
      const activeHistoricalParams = resetQuoteContext ? null : historicalParams
      const activeRecommendedParams = resetQuoteContext ? null : latestRecommendedParams

      const intentResult = detectIntent({
        message: payload.message,
        conversationStatus: existingConversation?.status,
        hasHistoricalParams: Boolean(activeHistoricalParams),
        hasRecommendedParams: Boolean(activeRecommendedParams),
      })
      timing.mark('intent_detected')

      if (isImmediateHandoffIntent(intentResult.intent) && intentResult.intent !== 'COMPLAINT') {
        const reply = generateHandoffReply()

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, `intent:${intentResult.intent}`, 'sales_team')
        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
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

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, 'intent:COMPLAINT', 'service_team')
        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
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

        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus,
        })

        return respond({
          ok: true,
          status: responseStatus,
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          conversationId,
          reply,
        })
      }

      const recommendationRerequest = activeRecommendedParams
        ? buildRecommendationRerequestMessage(activeRecommendedParams, payload.message)
        : null

      if (
        activeRecommendedParams &&
        recommendationRerequest &&
        (intentResult.intent === 'SOLUTION_RECOMMENDATION' || intentResult.intent === 'BARGAIN_REQUEST')
      ) {
        const rerecommended = handleConsultationIntent('SOLUTION_RECOMMENDATION', recommendationRerequest.query)

        if (rerecommended?.recommendedParams) {
          const reply = generateRerecommendedReply(rerecommended.reply)

          await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
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

      if (isNonQuoteFlowIntent(intentResult.intent)) {
        const consultationResult = handleConsultationIntent(intentResult.intent, payload.message)
        const lightweightBusinessResult = handleLightweightBusinessIntent(intentResult.intent, conversationDetails, payload.message)
        const reply = consultationResult?.reply || lightweightBusinessResult?.reply || getIntentPlaceholderReply(intentResult.intent)
        const responseStatus = consultationResult?.status || lightweightBusinessResult?.status || 'intent_only'
        const recommendedParams = consultationResult?.recommendedParams || lightweightBusinessResult?.recommendedParams
        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
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
        })
      }

      const earlyDecision = decideQuotePath({
        message: payload.message,
        productType: undefined,
        missingFields: ['productType'],
      })

      if (earlyDecision.status === 'handoff_required') {
        const reply = generateHandoffReply()

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, '涉及设计文件或专业审稿需求', 'design_team')
        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
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

      let currentExtracted = await deps.extractQuoteParams(payload.message)
      timing.mark('params_extracted')

      if (!currentExtracted.productType && messageProductType) {
        currentExtracted = {
          ...currentExtracted,
          productType: messageProductType,
        }
      }

      currentExtracted = activeRecommendedParams
        ? sanitizeExtractedParamsForRecommendation(currentExtracted, activeRecommendedParams)
        : currentExtracted

      const recommendationPatchResult = activeRecommendedParams && (intentResult.intent === 'RECOMMENDATION_CONFIRMATION' || canPatchRecommendation(intentResult.intent))
        ? applyRecommendedPatch(activeRecommendedParams, payload.message)
        : null
      timing.mark('recommendation_patch_evaluated')

      const hasRecommendationPatch = Boolean(
        recommendationPatchResult && Object.keys(recommendationPatchResult.patchParams).length > 0
      )

      if (intentResult.intent === 'PARAM_SUPPLEMENT' && activeRecommendedParams && hasRecommendationPatch) {
        const updatedRecommendationPayload = {
          productType: activeRecommendedParams.productType,
          recommendedParams: recommendationPatchResult!.mergedRecommendedParams,
          note: activeRecommendedParams.note,
        }
        const reply = generateRecommendationUpdatedReply(recommendationPatchResult?.patchSummary)

        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
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

      const recommendationBaseParams = activeRecommendedParams && (intentResult.intent === 'RECOMMENDATION_CONFIRMATION' || canPatchRecommendation(intentResult.intent))
        ? sanitizeQuoteParams(buildRecommendationBaseParams(
            recommendationPatchResult
              ? {
                  productType: activeRecommendedParams.productType,
                  recommendedParams: recommendationPatchResult.mergedRecommendedParams,
                  note: activeRecommendedParams.note,
                }
              : activeRecommendedParams,
            activeHistoricalParams
          ) || {})
        : null

      let mergedParams: Record<string, any> = sanitizeQuoteParams({ ...currentExtracted })
      if (recommendationBaseParams) {
        mergedParams = sanitizeQuoteParams(mergeParameters(recommendationBaseParams, currentExtracted))
      } else if (activeHistoricalParams) {
        mergedParams = sanitizeQuoteParams(mergeParameters(activeHistoricalParams, currentExtracted))
      }

      const missingFields = checkMissingFields(mergedParams)

      const routeDecision = decideQuotePath({
        message: payload.message,
        productType: mergedParams.productType,
        missingFields,
      })
      timing.mark('route_decided')

      if (routeDecision.status === 'handoff_required') {
        const reply = generateHandoffReply()

        await updateConversationStatus(conversationId, 'PENDING_HUMAN')
        await createHandoffRecord(conversationId, '非标准或高风险询价，需人工接管', 'sales_team')
        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'handoff_required',
          extractedParams: currentExtracted,
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
          extractedParams: currentExtracted,
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

          await updateConversationStatus(conversationId, 'MISSING_FIELDS')
          await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
            intent: intentResult.intent,
            intentReason: intentResult.reason,
            responseStatus: 'estimated',
            extractedParams: currentExtracted,
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
            extractedParams: currentExtracted,
            mergedParams,
            recommendationBaseParams,
            patchParams: recommendationPatchResult?.patchParams,
            mergedRecommendedParams: recommendationPatchResult?.mergedRecommendedParams,
            patchSummary: recommendationPatchResult?.patchSummary,
          })
        }

        const reply = generateMissingFieldsReplyByProduct(mergedParams.productType, missingFields)

        await updateConversationStatus(conversationId, 'MISSING_FIELDS')
        await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
          intent: intentResult.intent,
          intentReason: intentResult.reason,
          responseStatus: 'missing_fields',
          extractedParams: currentExtracted,
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
          extractedParams: currentExtracted,
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

      await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
        intent: intentResult.intent,
        intentReason: intentResult.reason,
        responseStatus: 'quoted',
        extractedParams: currentExtracted,
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
        extractedParams: currentExtracted,
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