import { getFieldLabel } from '@/lib/catalog/helpers'
import { formatParamValue } from '@/lib/catalog/helpers'
import type { SampleFileMetadata } from '@/lib/sampleFiles'
import type {
  ComplexPackagingDecision,
  ComplexPackagingItem,
  ComplexPackagingLineQuote,
  ComplexPackagingMissingDetail,
  ComplexPackagingProductType,
  ComplexPackagingQuoteResult,
  ComplexPackagingRequest,
  ComplexPackagingReviewReason,
  ComplexPackagingRouteStatus,
  PricingTrialBundleGateStatus,
  PricingTrialGateStatus,
} from '@/server/packaging/types'

type PackagingReviewInput = {
  status: ComplexPackagingRouteStatus
  decision?: Pick<ComplexPackagingDecision, 'reason' | 'reasonText' | 'trialGateStatus' | 'trialBundleGateStatus' | 'missingDetails' | 'missingFields'>
  request?: ComplexPackagingRequest | null
  quoteResult?: ComplexPackagingQuoteResult | null
  referenceFiles?: SampleFileMetadata[]
  requiresHumanReview?: boolean
}

export type PackagingReviewLineItemView = {
  itemType: ComplexPackagingProductType
  itemTypeLabel: string
  title: string
  pricingModel?: string
  quantity: number
  chargeQuantity?: number
  normalizedSpecSummary: string
  materialWeightSummary: string
  printColorSummary: string
  processSummary: string
  costSubtotal?: number
  setupCost: number
  runCost: number
  unitPrice: number
  lineTotal: number
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
  requiresHumanReview: boolean
}

export type PackagingMissingDetailView = {
  itemIndex: number
  itemLabel: string
  productType: ComplexPackagingProductType
  productTypeLabel: string
  fields: string[]
  fieldsText: string
}

export type PackagingReviewSummaryView = {
  status: ComplexPackagingRouteStatus
  statusLabel: string
  statusReasonCode?: string
  statusReasonText: string
  trialGateStatus?: PricingTrialGateStatus
  trialBundleGateStatus?: PricingTrialBundleGateStatus
  conciseExplanation: string
  requiresHumanReview: boolean
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
  includedComponents: string[]
  mainItem?: PackagingReviewLineItemView
  subItems: PackagingReviewLineItemView[]
  lineItems: PackagingReviewLineItemView[]
  missingDetails: PackagingMissingDetailView[]
  costSubtotal?: number
  subtotal?: number
  quotedAmount?: number
  shippingFee?: number
  finalPrice?: number
  totalUnitPrice?: number
  referenceFiles: SampleFileMetadata[]
}

type QuoteRecordInput = {
  status?: string
  parameters?: Record<string, any>
  pricingDetails?: Record<string, any>
}

type JsonRecord = Record<string, any>

const PRODUCT_TYPE_LABELS: Record<ComplexPackagingProductType, string> = {
  mailer_box: '飞机盒',
  tuck_end_box: '双插盒',
  window_box: '开窗彩盒',
  leaflet_insert: '说明书',
  box_insert: '内托',
  seal_sticker: '封口贴',
  foil_bag: '铝箔袋',
  carton_packaging: '纸箱包装',
}

const STATUS_LABELS: Record<ComplexPackagingRouteStatus, string> = {
  quoted: '正式报价',
  estimated: '预报价',
  handoff_required: '人工复核',
  missing_fields: '待补充参数',
}

const STATUS_REASON_TEXT: Record<string, string> = {
  all_packaging_fields_present: '当前复杂包装参数已齐全，可按结构化规则生成报价。',
  allowed_packaging_estimated_missing_set: '当前缺失字段仍在允许预估范围内，系统先按预报价处理。',
  bundle_prequote: '当前为主件加配套件组合报价，默认先走预报价并建议人工复核。',
  trial_scope_allowed_quoted: '当前路径属于试运行允许正式报价范围。',
  trial_scope_estimated_only: '当前路径在试运行内只允许参考报价。',
  trial_scope_handoff_only: '当前路径在试运行内只允许人工兜底。',
  trial_standard_bundle_quoted: '当前组合属于试运行允许正式报价范围。',
  trial_bundle_estimated_only: '当前组合在试运行内只允许参考报价。',
  trial_bundle_handoff_only: '当前组合在试运行内只允许人工兜底。',
  requires_human_review: '当前案例已命中人工复核条件，结果保留为预报价。',
  pricing_uncertainty_requires_review: '当前价格假设存在不确定性，建议人工复核后确认。',
  line_item_template_incomplete: '当前已能套入真实报价模板，但仍有少量非关键类别项依赖保守假设，先按预报价处理。',
  blocking_workbook_line_item: '当前关键类别项或关键术语无法稳定落入真实报价表，建议转人工复核。',
  reference_file_with_missing_fields: '当前既有参考文件又缺少关键字段，默认转人工复核。',
  bundle_item_fields_missing: '组合件中仍有子项缺少关键参数，需要继续补充。',
  packaging_required_fields_missing: '当前复杂包装关键信息仍不足，需要继续补充。',
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
    .filter(Boolean)
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeReviewReasons(value: unknown): ComplexPackagingReviewReason[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asRecord(item))
    .filter(Boolean)
    .map((item) => item as ComplexPackagingReviewReason)
}

function normalizeReferenceFiles(value: unknown): SampleFileMetadata[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asRecord(item))
    .filter(Boolean)
    .map((item) => item as SampleFileMetadata)
}

function normalizeLineItemView(value: unknown): PackagingReviewLineItemView | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const itemType = typeof record.itemType === 'string' ? record.itemType as ComplexPackagingProductType : undefined
  const quantity = normalizeOptionalNumber(record.quantity) ?? 0
  const chargeQuantity = normalizeOptionalNumber(record.chargeQuantity)
  const costSubtotal = normalizeOptionalNumber(record.costSubtotal)
  const setupCost = normalizeOptionalNumber(record.setupCost) ?? 0
  const runCost = normalizeOptionalNumber(record.runCost) ?? 0
  const unitPrice = normalizeOptionalNumber(record.unitPrice) ?? 0
  const lineTotal = normalizeOptionalNumber(record.lineTotal) ?? 0
  const reviewReasons = normalizeReviewReasons(record.reviewReasons)
  const reviewFlags = normalizeStringArray(record.reviewFlags)

  return {
    itemType: itemType || 'tuck_end_box',
    itemTypeLabel: typeof record.itemTypeLabel === 'string' && record.itemTypeLabel.trim()
      ? record.itemTypeLabel.trim()
      : getProductTypeLabel(itemType),
    title: typeof record.title === 'string' && record.title.trim()
      ? record.title.trim()
      : getProductTypeLabel(itemType),
    pricingModel: typeof record.pricingModel === 'string' ? record.pricingModel : undefined,
    quantity,
    chargeQuantity,
    normalizedSpecSummary: typeof record.normalizedSpecSummary === 'string' ? record.normalizedSpecSummary : '暂无规格摘要',
    materialWeightSummary: typeof record.materialWeightSummary === 'string' ? record.materialWeightSummary : '暂无材质信息',
    printColorSummary: typeof record.printColorSummary === 'string' ? record.printColorSummary : '暂无印色信息',
    processSummary: typeof record.processSummary === 'string' ? record.processSummary : '暂无工艺信息',
    costSubtotal,
    setupCost,
    runCost,
    unitPrice,
    lineTotal,
    reviewFlags,
    reviewReasons,
    requiresHumanReview: Boolean(record.requiresHumanReview || reviewReasons.length > 0 || reviewFlags.length > 0),
  }
}

function normalizeMissingDetailView(value: unknown): PackagingMissingDetailView | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const productType = typeof record.productType === 'string' ? record.productType as ComplexPackagingProductType : undefined
  const fields = normalizeStringArray(record.fields)

  return {
    itemIndex: normalizeOptionalNumber(record.itemIndex) ?? 0,
    itemLabel: typeof record.itemLabel === 'string' && record.itemLabel.trim()
      ? record.itemLabel.trim()
      : getProductTypeLabel(productType),
    productType: productType || 'tuck_end_box',
    productTypeLabel: typeof record.productTypeLabel === 'string' && record.productTypeLabel.trim()
      ? record.productTypeLabel.trim()
      : getProductTypeLabel(productType),
    fields,
    fieldsText: typeof record.fieldsText === 'string' && record.fieldsText.trim()
      ? record.fieldsText.trim()
      : fields.join('、') || '暂无缺参说明',
  }
}

function getProductTypeLabel(productType?: ComplexPackagingProductType): string {
  if (!productType) return '复杂包装项'
  return PRODUCT_TYPE_LABELS[productType] || productType
}

function getItemDimensionsText(item: ComplexPackagingItem): string {
  switch (item.productType) {
    case 'mailer_box':
    case 'tuck_end_box':
    case 'window_box': {
      if (!item.length || !item.width || !item.height) return '尺寸待补充'
      return `${item.length}×${item.width}×${item.height}${item.sizeUnit || 'mm'}`
    }
    case 'leaflet_insert': {
      if (!item.length || !item.width) return '展开尺寸待补充'
      return `${item.length}×${item.width}${item.sizeUnit || 'mm'}`
    }
    case 'box_insert': {
      if (!item.insertLength || !item.insertWidth) return '内托尺寸待补充'
      return `${item.insertLength}×${item.insertWidth}${item.sizeUnit || 'mm'}`
    }
    case 'seal_sticker': {
      if (!item.stickerLength || !item.stickerWidth) return '贴纸尺寸待补充'
      return `${item.stickerLength}×${item.stickerWidth}${item.sizeUnit || 'mm'}`
    }
    case 'foil_bag': {
      if (!item.length || !item.width) return '袋型尺寸待补充'
      return `${item.length}×${item.width}${item.sizeUnit || 'mm'}`
    }
    case 'carton_packaging': {
      if (!item.length || !item.width || !item.height) return '纸箱尺寸待补充'
      return `${item.length}×${item.width}×${item.height}${item.sizeUnit || 'mm'}`
    }
    default:
      return '规格待补充'
  }
}

function getMaterialWeightSummary(item: ComplexPackagingItem): string {
  const material = item.productType === 'leaflet_insert'
    ? item.paperType || item.material
    : item.productType === 'box_insert'
      ? item.insertMaterial || item.material
      : item.productType === 'seal_sticker'
        ? item.stickerMaterial || item.material
        : item.material

  const weight = item.productType === 'leaflet_insert' ? item.paperWeight || item.weight : item.weight
  const materialText = material ? formatParamValue('paperType', material) : '材质待补充'

  if (!weight) {
    return materialText
  }

  return `${materialText} / ${weight}g`
}

function getPrintColorSummary(item: ComplexPackagingItem): string {
  const parts: string[] = []

  if (item.printColor) {
    parts.push(formatParamValue('printColor', item.printColor))
  }

  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)
  if (spotCount > 0) {
    parts.push(`${spotCount} 个专色`)
  }

  if (item.printSides) {
    parts.push(formatParamValue('printSides', item.printSides))
  }

  return parts.length > 0 ? parts.join(' / ') : '印色待补充'
}

function getProcessSummary(item: ComplexPackagingItem): string {
  const parts: string[] = []

  if (item.surfaceFinish) {
    parts.push(formatParamValue('surfaceFinish', item.surfaceFinish))
  }

  if (item.laminationType && item.laminationType !== 'none') {
    parts.push(formatParamValue('laminationType', item.laminationType))
  }

  if (item.mounting) parts.push('裱')
  if (item.dieCut) parts.push('啤')
  if (item.gluing) parts.push('粘合')

  for (const process of item.processes || []) {
    if (!parts.includes(process)) {
      parts.push(process)
    }
  }

  if (item.foldCount && item.foldCount > 0) {
    parts.push(`${item.foldCount} 折`)
  }

  if ((item.windowFilmThickness || 0) > 0) {
    parts.push(`胶片 ${item.windowFilmThickness}mm`)
  }

  const notes = item.notes || []
  if (notes.length > 0) {
    parts.push(...notes)
  }

  return parts.length > 0 ? Array.from(new Set(parts)).join('、') : '基础工序'
}

function getNormalizedSpecSummary(item: ComplexPackagingItem): string {
  const parts = [getProductTypeLabel(item.productType), getItemDimensionsText(item)]

  if (item.productType === 'window_box' && item.windowSizeLength && item.windowSizeWidth) {
    parts.push(`窗位 ${item.windowSizeLength}×${item.windowSizeWidth}${item.sizeUnit || 'mm'}`)
  }

  return parts.filter(Boolean).join(' / ')
}

function mapLineItem(item: ComplexPackagingLineQuote): PackagingReviewLineItemView {
  return {
    itemType: item.itemType,
    itemTypeLabel: getProductTypeLabel(item.itemType),
    title: item.title,
    pricingModel: item.pricingModel,
    quantity: item.quantity,
    chargeQuantity: item.chargeQuantity,
    normalizedSpecSummary: getNormalizedSpecSummary(item.normalizedParams),
    materialWeightSummary: getMaterialWeightSummary(item.normalizedParams),
    printColorSummary: getPrintColorSummary(item.normalizedParams),
    processSummary: getProcessSummary(item.normalizedParams),
    costSubtotal: item.costSubtotal,
    setupCost: item.setupCost,
    runCost: item.runCost,
    unitPrice: item.unitPrice,
    lineTotal: item.totalPrice,
    reviewFlags: item.reviewFlags || [],
    reviewReasons: item.reviewReasons || [],
    requiresHumanReview: (item.reviewReasons || []).length > 0 || (item.reviewFlags || []).length > 0,
  }
}

function mapMissingDetails(details: ComplexPackagingMissingDetail[] = []): PackagingMissingDetailView[] {
  return details.map((detail) => ({
    itemIndex: detail.itemIndex,
    itemLabel: detail.itemLabel,
    productType: detail.productType,
    productTypeLabel: getProductTypeLabel(detail.productType),
    fields: detail.fields,
    fieldsText: detail.fields.map((field) => getFieldLabel(detail.productType, field)).join('、'),
  }))
}

function dedupeReviewReasons(reviewReasons: ComplexPackagingReviewReason[]): ComplexPackagingReviewReason[] {
  const seen = new Set<string>()
  const result: ComplexPackagingReviewReason[] = []

  for (const reason of reviewReasons) {
    const key = `${reason.code}:${reason.itemType || ''}:${reason.itemTitle || ''}:${reason.message}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(reason)
  }

  return result
}

function buildStatusReasonText(status: ComplexPackagingRouteStatus, reason?: string, reasonText?: string): string {
  if (reasonText && reasonText.trim()) {
    return reasonText.trim()
  }

  if (!reason) {
    return status === 'quoted'
      ? '当前包装报价结果可直接查看。'
      : status === 'estimated'
        ? '当前包装结果仍按预报价处理。'
        : status === 'handoff_required'
          ? '当前包装案例建议人工复核。'
          : '当前包装案例仍待继续补充。'
  }

  return STATUS_REASON_TEXT[reason] || reason
}

export function buildPackagingReplyExplanation(summary: PackagingReviewSummaryView | null | undefined): string {
  if (!summary) return ''

  const reasonMessages = summary.reviewReasons.slice(0, 2).map((reason) => reason.label)
  const reasonText = reasonMessages.length > 0 ? `主要原因：${reasonMessages.join('、')}。` : ''
  const bundleText = summary.includedComponents.length > 1 ? `包含：${summary.includedComponents.join('、')}。` : ''

  if (summary.status === 'quoted') {
    return bundleText
  }

  if (summary.status === 'estimated') {
    return `${summary.statusReasonText}${reasonText}${bundleText}`.trim()
  }

  if (summary.status === 'handoff_required') {
    return `${summary.statusReasonText}${reasonText}`.trim()
  }

  if (summary.status === 'missing_fields') {
    const missingText = summary.missingDetails.slice(0, 2).map((detail) => `${detail.itemLabel}缺少${detail.fieldsText}`).join('；')
    return missingText ? `${summary.statusReasonText}${missingText}。` : summary.statusReasonText
  }

  return ''
}

export function buildPackagingReviewSummary(input: PackagingReviewInput): PackagingReviewSummaryView | null {
  const lineItems = input.quoteResult?.items?.map(mapLineItem)
    || input.request?.allItems.map((item) => ({
      itemType: item.productType,
      itemTypeLabel: getProductTypeLabel(item.productType),
      title: item.title || getProductTypeLabel(item.productType),
      pricingModel: undefined,
      quantity: item.quantity || 0,
      chargeQuantity: item.chargeQuantity,
      normalizedSpecSummary: getNormalizedSpecSummary(item),
      materialWeightSummary: getMaterialWeightSummary(item),
      printColorSummary: getPrintColorSummary(item),
      processSummary: getProcessSummary(item),
      costSubtotal: undefined,
      setupCost: 0,
      runCost: 0,
      unitPrice: 0,
      lineTotal: 0,
      reviewFlags: [],
      reviewReasons: [],
      requiresHumanReview: false,
    }))

  if (!lineItems || lineItems.length === 0) {
    return null
  }

  const reviewReasons = dedupeReviewReasons([
    ...(input.quoteResult?.reviewReasons || []),
    ...lineItems.flatMap((item) => item.reviewReasons || []),
  ])
  const reviewFlags = Array.from(new Set([
    ...(input.quoteResult?.reviewFlags || []),
    ...lineItems.flatMap((item) => item.reviewFlags || []),
  ]))
  const missingDetails = mapMissingDetails(input.decision?.missingDetails || [])
  const statusReasonText = buildStatusReasonText(input.status, input.decision?.reason, input.decision?.reasonText)
  const includedComponents = lineItems.map((item) => item.title)

  const summary: PackagingReviewSummaryView = {
    status: input.status,
    statusLabel: STATUS_LABELS[input.status],
    statusReasonCode: input.decision?.reason,
    statusReasonText,
    trialGateStatus: input.decision?.trialGateStatus,
    trialBundleGateStatus: input.decision?.trialBundleGateStatus,
    conciseExplanation: '',
    requiresHumanReview: Boolean(input.requiresHumanReview || input.quoteResult?.requiresHumanReview || reviewReasons.length > 0),
    reviewFlags,
    reviewReasons,
    includedComponents,
    mainItem: lineItems[0],
    subItems: lineItems.slice(1),
    lineItems,
    missingDetails,
    costSubtotal: input.quoteResult?.costSubtotal,
    subtotal: input.quoteResult?.totalPrice,
    quotedAmount: input.quoteResult?.quotedAmount,
    shippingFee: input.quoteResult?.shippingFee,
    finalPrice: input.quoteResult?.finalPrice,
    totalUnitPrice: input.quoteResult?.totalUnitPrice,
    referenceFiles: input.referenceFiles || input.quoteResult?.referenceFiles || input.request?.referenceFiles || [],
  }

  summary.conciseExplanation = buildPackagingReplyExplanation(summary)
  return summary
}

export function buildPackagingReviewSummaryFromQuoteRecord(input: QuoteRecordInput): PackagingReviewSummaryView | null {
  const parameters = input.parameters || {}
  const pricingDetails = input.pricingDetails || {}
  const items = Array.isArray(pricingDetails.items) ? pricingDetails.items : []

  if (items.length === 0 && !parameters.mainItem) {
    return null
  }

  return buildPackagingReviewSummary({
    status: 'quoted',
    quoteResult: {
      normalizedParams: parameters,
      unitPrice: Number(pricingDetails.unitPrice ?? pricingDetails.totalUnitPrice ?? 0),
      totalUnitPrice: Number(pricingDetails.totalUnitPrice ?? pricingDetails.unitPrice ?? 0),
      costSubtotal: Number(pricingDetails.costSubtotal ?? pricingDetails.totalPrice ?? 0),
      quotedAmount: Number(pricingDetails.quotedAmount ?? pricingDetails.totalPrice ?? 0),
      quoteMarkup: Number(pricingDetails.quoteMarkup ?? 1),
      taxMultiplier: Number(pricingDetails.taxMultiplier ?? 1),
      totalPrice: Number(pricingDetails.totalPrice ?? 0),
      shippingFee: Number(pricingDetails.shippingFee ?? 0),
      tax: Number(pricingDetails.tax ?? 0),
      finalPrice: Number(pricingDetails.finalPrice ?? 0),
      reviewFlags: Array.isArray(pricingDetails.packagingReview?.reviewFlags) ? pricingDetails.packagingReview.reviewFlags : [],
      reviewReasons: Array.isArray(pricingDetails.packagingReview?.reviewReasons) ? pricingDetails.packagingReview.reviewReasons : [],
      notes: Array.isArray(pricingDetails.notes) ? pricingDetails.notes : [],
      mainItem: items[0],
      subItems: items.slice(1),
      items,
      isBundle: Boolean(parameters.isBundle),
      requiresHumanReview: Boolean(parameters.requiresHumanReview),
      referenceFiles: Array.isArray(pricingDetails.referenceFiles) ? pricingDetails.referenceFiles : [],
    },
    referenceFiles: Array.isArray(pricingDetails.referenceFiles) ? pricingDetails.referenceFiles : [],
    requiresHumanReview: Boolean(parameters.requiresHumanReview),
  })
}

export function normalizePackagingReviewSummaryView(value: unknown): PackagingReviewSummaryView | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const statusCandidate = typeof record.status === 'string' ? record.status : 'estimated'
  const status: ComplexPackagingRouteStatus = ['quoted', 'estimated', 'handoff_required', 'missing_fields'].includes(statusCandidate)
    ? statusCandidate as ComplexPackagingRouteStatus
    : 'estimated'

  const mainItem = normalizeLineItemView(record.mainItem)
  const subItems = Array.isArray(record.subItems)
    ? record.subItems.map((item) => normalizeLineItemView(item)).filter(Boolean) as PackagingReviewLineItemView[]
    : []
  const lineItems = Array.isArray(record.lineItems)
    ? record.lineItems.map((item) => normalizeLineItemView(item)).filter(Boolean) as PackagingReviewLineItemView[]
    : [mainItem, ...subItems].filter(Boolean) as PackagingReviewLineItemView[]
  const reviewReasons = normalizeReviewReasons(record.reviewReasons)
  const reviewFlags = normalizeStringArray(record.reviewFlags)
  const missingDetails = Array.isArray(record.missingDetails)
    ? record.missingDetails.map((detail) => normalizeMissingDetailView(detail)).filter(Boolean) as PackagingMissingDetailView[]
    : []

  const summary: PackagingReviewSummaryView = {
    status,
    statusLabel: typeof record.statusLabel === 'string' && record.statusLabel.trim()
      ? record.statusLabel.trim()
      : STATUS_LABELS[status],
    statusReasonCode: typeof record.statusReasonCode === 'string' ? record.statusReasonCode : undefined,
    trialGateStatus: typeof record.trialGateStatus === 'string' ? record.trialGateStatus as PricingTrialGateStatus : undefined,
    trialBundleGateStatus: typeof record.trialBundleGateStatus === 'string'
      ? record.trialBundleGateStatus as PricingTrialBundleGateStatus
      : undefined,
    statusReasonText: typeof record.statusReasonText === 'string' && record.statusReasonText.trim()
      ? record.statusReasonText.trim()
      : buildStatusReasonText(status, typeof record.statusReasonCode === 'string' ? record.statusReasonCode : undefined),
    conciseExplanation: typeof record.conciseExplanation === 'string' ? record.conciseExplanation : '',
    requiresHumanReview: Boolean(record.requiresHumanReview || reviewReasons.length > 0 || reviewFlags.length > 0),
    reviewFlags,
    reviewReasons,
    includedComponents: normalizeStringArray(record.includedComponents).length > 0
      ? normalizeStringArray(record.includedComponents)
      : lineItems.map((item) => item.title),
    mainItem: mainItem || lineItems[0],
    subItems: subItems.length > 0 ? subItems : lineItems.slice(1),
    lineItems,
    missingDetails,
    costSubtotal: normalizeOptionalNumber(record.costSubtotal),
    subtotal: normalizeOptionalNumber(record.subtotal),
    quotedAmount: normalizeOptionalNumber(record.quotedAmount),
    shippingFee: normalizeOptionalNumber(record.shippingFee),
    finalPrice: normalizeOptionalNumber(record.finalPrice),
    totalUnitPrice: normalizeOptionalNumber(record.totalUnitPrice),
    referenceFiles: normalizeReferenceFiles(record.referenceFiles),
  }

  summary.conciseExplanation = summary.conciseExplanation || buildPackagingReplyExplanation(summary)
  return summary
}