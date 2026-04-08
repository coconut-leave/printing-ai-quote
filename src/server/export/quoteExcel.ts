import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import {
  buildConversationPresentation,
  getProductTypeDisplayName,
  getTrialReviewActionLabel,
  getTrialReviewCalibrationSignalLabel,
  getTrialReviewDriftDirectionLabel,
  getTrialReviewRejectionCategoryLabel,
  getTrialReviewSourceKindLabel,
  getTrialReviewStatusLabel,
  getTrialReviewTargetAreaLabel,
} from '@/lib/admin/presentation'
import { getDisplayParamEntries } from '@/lib/catalog/helpers'
import {
  buildPackagingReviewSummaryFromQuoteRecord,
  normalizePackagingReviewSummaryView,
  type PackagingReviewLineItemView,
  type PackagingReviewSummaryView,
} from '@/lib/packaging/reviewSummary'

type JsonRecord = Record<string, any>

type QuoteLikeRecord = {
  id: number
  status: string
  parameters?: unknown
  pricingDetails?: unknown
  subtotalCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
  createdAt: Date | string
}

type ConversationMessageLike = {
  id?: number
  sender?: string
  content?: string | null
  metadata?: unknown
  createdAt?: Date | string
}

type TrialReviewAuditLike = {
  id?: number
  actionType?: string
  operatorName?: string | null
  note?: string | null
  createdAt?: Date | string
}

type TrialReviewCaseLike = {
  id?: number
  status?: string
  sourceKind?: string
  operatorName?: string | null
  lastActionNote?: string | null
  manualConfirmationResult?: string | null
  rejectionReason?: string | null
  rejectionCategory?: string | null
  rejectionTargetArea?: string | null
  calibrationSignal?: string | null
  driftSourceCandidate?: string | null
  driftDirection?: string | null
  contextSnapshot?: unknown
  updatedAt?: Date | string
  auditLogs?: TrialReviewAuditLike[]
}

export type ConversationExportSource = {
  id: number
  status: string
  customerName?: string | null
  topic?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  messages?: ConversationMessageLike[]
  quotes?: QuoteLikeRecord[]
  trialReviewCase?: TrialReviewCaseLike | null
}

export type ExportQuoteLineItem = {
  roleLabel: '单项' | '主件' | '子项'
  productName: string
  spec: string
  materialColorProcess: string
  quantity: number
  unitPrice: number
  subtotal: number
  note: string
}

export type ExportQuoteDocumentKind = 'formal_quote' | 'reference_quote' | 'manual_review'

export type ExportableQuoteSnapshot = {
  documentKind: ExportQuoteDocumentKind
  documentTitle: '正式报价单' | '参考报价单' | '人工处理提示'
  exportId: string
  quoteRecordId?: number
  conversationId: number
  conversationTitle: string
  customerName: string
  quotedAt: Date
  quoteStatusLabel: '正式报价' | '参考报价' | '转人工'
  deliveryScopeLabel: string
  deliveryScopeNote: string
  productName: string
  spec: string
  materialColorProcess: string
  quantity: number
  unitPrice: number
  subtotal: number
  shippingFee: number
  tax: number
  finalPrice: number
  remark: string
  requiresHumanReview: boolean
  trialReviewStatusLabel?: string | null
  trialReviewSourceLabel?: string | null
  trialReviewLatestActionLabel?: string | null
  trialReviewOperatorName?: string | null
  trialReviewUpdatedAt?: string | null
  lineItems: ExportQuoteLineItem[]
  sourceType: 'quote_record' | 'conversation_message'
}

type QuoteBreakdownRow = {
  project: string
  detail: string
  quantity: string
  unitPrice: string
  amount: string
  note: string
}

const QUOTE_COMPANY_PROFILE = {
  name: '东莞市彩嘉印刷有限公司',
  address: '地址:广东省东莞市樟木头镇古坑金河管理区金岭路80号',
  phone: '电话:0769-87713462 87705921 87191887',
  fax: '传真:0769-87701135',
  email: '邮箱:xjdggd@163.com',
  contact: '联系人：黄娟',
  mobile: '手机号：13925870501',
  wechat: '微信同号',
}

const EXCEL_THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF111111' } },
  left: { style: 'thin', color: { argb: 'FF111111' } },
  bottom: { style: 'thin', color: { argb: 'FF111111' } },
  right: { style: 'thin', color: { argb: 'FF111111' } },
}

const EXCEL_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF3EEE1' },
}

const EXCEL_ACCENT_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE3EEDF' },
}

const EXCEL_TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDBE8D5' },
}

const SPEC_FIELD_SET = new Set([
  'finishedSize',
  'length',
  'width',
  'height',
  'sizeUnit',
  'pageCount',
  'foldType',
  'foldCount',
  'insertLength',
  'insertWidth',
  'stickerLength',
  'stickerWidth',
  'windowSizeLength',
  'windowSizeWidth',
  'bindingType',
])

const MATERIAL_PROCESS_FIELD_SET = new Set([
  'coverPaper',
  'coverWeight',
  'innerPaper',
  'innerWeight',
  'paperType',
  'paperWeight',
  'paperSides',
  'printSides',
  'paperMaterial',
  'material',
  'weight',
  'printColor',
  'surfaceFinish',
  'finishType',
  'lamination',
  'laminationType',
  'insertMaterial',
  'stickerMaterial',
  'spotColorCount',
  'pantoneCodes',
  'processes',
])

const COMPLEX_PACKAGING_PRODUCT_TYPES = new Set([
  'mailer_box',
  'tuck_end_box',
  'window_box',
  'leaflet_insert',
  'box_insert',
  'seal_sticker',
  'foil_bag',
  'carton_packaging',
])

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function buildTrialReviewExportContext(conversation: ConversationExportSource) {
  const trialReviewCase = conversation.trialReviewCase
  if (!trialReviewCase?.status) {
    return null
  }

  const latestAudit = Array.isArray(trialReviewCase.auditLogs) ? trialReviewCase.auditLogs[0] : undefined
  const updatedAt = trialReviewCase.updatedAt ? formatDateTime(trialReviewCase.updatedAt) : ''

  return {
    statusLabel: getTrialReviewStatusLabel(trialReviewCase.status),
    sourceLabel: getTrialReviewSourceKindLabel(trialReviewCase.sourceKind || 'REFERENCE_QUOTE'),
    latestActionLabel: latestAudit?.actionType ? getTrialReviewActionLabel(latestAudit.actionType) : null,
    operatorName: trialReviewCase.operatorName || latestAudit?.operatorName || null,
    updatedAt: updatedAt || null,
    note: dedupeText([
      trialReviewCase.manualConfirmationResult ? `人工确认结论：${trialReviewCase.manualConfirmationResult}` : null,
      trialReviewCase.rejectionReason ? `打回原因：${trialReviewCase.rejectionReason}` : null,
      trialReviewCase.rejectionCategory ? `打回分类：${getTrialReviewRejectionCategoryLabel(trialReviewCase.rejectionCategory)}` : null,
      trialReviewCase.rejectionTargetArea ? `打回目标区段：${getTrialReviewTargetAreaLabel(trialReviewCase.rejectionTargetArea)}` : null,
      trialReviewCase.calibrationSignal ? `Calibration 信号：${getTrialReviewCalibrationSignalLabel(trialReviewCase.calibrationSignal)}` : null,
      trialReviewCase.driftSourceCandidate ? `疑似漂移源：${trialReviewCase.driftSourceCandidate}` : null,
      trialReviewCase.driftDirection ? `同向漂移方向：${getTrialReviewDriftDirectionLabel(trialReviewCase.driftDirection)}` : null,
      trialReviewCase.lastActionNote,
      latestAudit?.note,
    ]),
  }
}

function formatDateStamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '00000000'
  }

  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function formatBusinessDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function formatMoneyText(value: number): string {
  return `￥${formatMoney(value).toFixed(2)}`
}

function formatUnitPriceText(value: number): string {
  const rounded = formatMoney(value)
  return `￥${rounded.toFixed(rounded >= 10 ? 2 : 3)}`
}

function formatQuantityText(value: number): string {
  if (!Number.isFinite(value)) {
    return ''
  }

  if (Number.isInteger(value)) {
    return String(value)
  }

  return String(formatMoney(value))
}

function dedupeText(parts: Array<string | undefined | null>): string {
  return Array.from(new Set(parts.map((part) => (part || '').trim()).filter(Boolean))).join('；')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildConversationTitle(conversation: ConversationExportSource): string {
  const recentMessages = [...(conversation.messages || [])]
    .slice(-4)
    .map((message) => ({
      sender: message.sender,
      content: message.content || '',
      metadata: message.metadata,
    }))

  return buildConversationPresentation({
    conversationId: conversation.id,
    status: conversation.status,
    latestMessage: conversation.messages?.slice(-1)[0]?.content || null,
    recentMessages,
    latestQuoteParameters: asRecord(conversation.quotes?.[0]?.parameters) || null,
  }).title
}

function buildExportId(prefix: 'BJ' | 'CK' | 'RG', date: Date | string, identifier: number): string {
  return `${prefix}-${formatDateStamp(date)}-${String(identifier).padStart(6, '0')}`
}

function buildFlatParamSummaries(productType: string | undefined, params: JsonRecord | undefined) {
  if (!params) {
    return {
      spec: '',
      materialColorProcess: '',
    }
  }

  const entries = getDisplayParamEntries(productType, params)
    .filter((entry) => !['productType', 'quantity', 'summary', 'mainItem', 'subItems', 'referenceFiles', 'requiresHumanReview', 'isBundle'].includes(entry.field))

  const spec = entries
    .filter((entry) => SPEC_FIELD_SET.has(entry.field))
    .map((entry) => `${entry.label}：${entry.value}`)
    .join('；')

  const materialColorProcess = entries
    .filter((entry) => MATERIAL_PROCESS_FIELD_SET.has(entry.field))
    .map((entry) => `${entry.label}：${entry.value}`)
    .join('；')

  return { spec, materialColorProcess }
}

function buildLineItemNote(summary: PackagingReviewLineItemView): string {
  return dedupeText([
    ...summary.reviewReasons.map((reason) => reason.message),
    ...summary.reviewFlags,
  ])
}

function buildLineItemRoleLabel(index: number, total: number): '单项' | '主件' | '子项' {
  if (total <= 1) {
    return '单项'
  }

  return index === 0 ? '主件' : '子项'
}

function buildDisplayProductName(item: ExportQuoteLineItem): string {
  return item.roleLabel === '单项' ? item.productName : `${item.roleLabel}｜${item.productName}`
}

function isComplexPackagingProductType(productType?: string): boolean {
  return Boolean(productType && COMPLEX_PACKAGING_PRODUCT_TYPES.has(productType))
}

function getDocumentTitle(documentKind: ExportQuoteDocumentKind): ExportableQuoteSnapshot['documentTitle'] {
  if (documentKind === 'reference_quote') {
    return '参考报价单'
  }

  if (documentKind === 'manual_review') {
    return '人工处理提示'
  }

  return '正式报价单'
}

function getQuoteStatusLabel(documentKind: ExportQuoteDocumentKind): ExportableQuoteSnapshot['quoteStatusLabel'] {
  if (documentKind === 'reference_quote') {
    return '参考报价'
  }

  if (documentKind === 'manual_review') {
    return '转人工'
  }

  return '正式报价'
}

function getDeliveryScopeLabel(documentKind: ExportQuoteDocumentKind, isTrialScoped: boolean): string {
  if (documentKind === 'manual_review') {
    return '人工处理范围'
  }

  if (!isTrialScoped) {
    return documentKind === 'reference_quote' ? '参考报价交付' : '标准产品正式报价'
  }

  return documentKind === 'reference_quote' ? '试运行参考报价范围' : '试运行正式报价范围'
}

function getDocumentUsageLabel(documentKind: ExportQuoteDocumentKind): string {
  if (documentKind === 'reference_quote') {
    return '仅供方案沟通、试运行评估和人工确认前留档，不作为正式成交承诺。'
  }

  if (documentKind === 'manual_review') {
    return '仅供内部人工处理使用，不对外发送。'
  }

  return '可直接作为正式对客报价与业务归档依据。'
}

function getLedgerArchiveLabel(documentKind: ExportQuoteDocumentKind): string {
  if (documentKind === 'reference_quote') {
    return '参考报价归档'
  }

  if (documentKind === 'manual_review') {
    return '人工处理归档'
  }

  return '正式报价归档'
}

function buildDeliveryScopeNote(
  documentKind: ExportQuoteDocumentKind,
  packagingSummary: PackagingReviewSummaryView | null,
  isTrialScoped: boolean,
): string {
  const defaultNote = documentKind === 'manual_review'
    ? '当前路径属于人工处理范围，不生成正式或参考报价单，请转人工跟进。'
    : documentKind === 'reference_quote'
      ? '当前路径在试运行内仅提供参考报价，不作为正式成交承诺，请人工确认后再对外确认。'
      : isTrialScoped
        ? '当前路径属于试运行允许正式报价范围，可按正式报价单交付。'
        : '当前路径已按标准产品正式报价口径整理，可直接作为正式报价单使用。'

  return dedupeText([
    packagingSummary?.statusReasonText,
    defaultNote,
  ])
}

function resolveSnapshotDocumentKind(input: {
  sourceStatus: 'quoted' | 'estimated' | 'handoff_required'
  packagingSummary: PackagingReviewSummaryView | null
}): ExportQuoteDocumentKind {
  const summary = input.packagingSummary

  if (
    summary?.status === 'handoff_required'
    || summary?.trialGateStatus === 'handoff_only_in_trial'
    || summary?.trialBundleGateStatus === 'handoff_only_bundle_in_trial'
    || input.sourceStatus === 'handoff_required'
  ) {
    return 'manual_review'
  }

  if (
    summary?.status === 'estimated'
    || summary?.trialGateStatus === 'estimated_only_in_trial'
    || summary?.trialBundleGateStatus === 'estimated_only_bundle_in_trial'
    || input.sourceStatus === 'estimated'
  ) {
    return 'reference_quote'
  }

  return 'formal_quote'
}

function getDocumentPrefix(documentKind: ExportQuoteDocumentKind): 'BJ' | 'CK' | 'RG' {
  if (documentKind === 'reference_quote') {
    return 'CK'
  }

  if (documentKind === 'manual_review') {
    return 'RG'
  }

  return 'BJ'
}

function buildLineItemsFromPackagingSummary(summary: PackagingReviewSummaryView): ExportQuoteLineItem[] {
  const total = summary.lineItems.length

  return summary.lineItems.map((item, index) => ({
    roleLabel: buildLineItemRoleLabel(index, total),
    productName: item.title,
    spec: item.normalizedSpecSummary,
    materialColorProcess: [item.materialWeightSummary, item.printColorSummary, item.processSummary].filter(Boolean).join('；'),
    quantity: item.quantity,
    unitPrice: formatMoney(item.unitPrice),
    subtotal: formatMoney(item.lineTotal),
    note: buildLineItemNote(item),
  }))
}

function buildLineItemsFromRawPricingItems(items: unknown[]): ExportQuoteLineItem[] {
  const normalizedItems = items
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => Boolean(item))
  const total = normalizedItems.length

  return normalizedItems
    .map((item, index) => ({
      roleLabel: buildLineItemRoleLabel(index, total),
      productName: typeof item.title === 'string' && item.title.trim()
        ? item.title.trim()
        : getProductTypeDisplayName(typeof item.itemType === 'string' ? item.itemType : undefined),
      spec: typeof item.normalizedSpecSummary === 'string' ? item.normalizedSpecSummary : '',
      materialColorProcess: [item.materialWeightSummary, item.printColorSummary, item.processSummary]
        .map((value) => (typeof value === 'string' ? value : ''))
        .filter(Boolean)
        .join('；'),
      quantity: asNumber(item.quantity),
      unitPrice: formatMoney(asNumber(item.unitPrice)),
      subtotal: formatMoney(asNumber(item.lineTotal ?? item.totalPrice)),
      note: dedupeText([
        ...((Array.isArray(item.reviewReasons) ? item.reviewReasons : []) as Array<Record<string, any>>).map((reason) => String(reason?.message || '')),
        ...((Array.isArray(item.reviewFlags) ? item.reviewFlags : []) as Array<string>),
      ]),
    }))
}

function buildSingleLineItemFromParams(params: JsonRecord | undefined, pricingDetails: JsonRecord | undefined): ExportQuoteLineItem {
  const productType = typeof params?.productType === 'string' ? params.productType : undefined
  const { spec, materialColorProcess } = buildFlatParamSummaries(productType, params)
  const quantity = asNumber(params?.quantity)
  const subtotal = pricingDetails?.totalPrice != null
    ? asNumber(pricingDetails.totalPrice)
    : pricingDetails?.finalPrice != null
      ? asNumber(pricingDetails.finalPrice)
      : 0
  const unitPrice = pricingDetails?.unitPrice != null
    ? asNumber(pricingDetails.unitPrice)
    : quantity > 0 && subtotal > 0
      ? subtotal / quantity
      : 0

  return {
    roleLabel: '单项',
    productName: getProductTypeDisplayName(productType),
    spec,
    materialColorProcess,
    quantity,
    unitPrice: formatMoney(unitPrice),
    subtotal: formatMoney(subtotal),
    note: '',
  }
}

function resolvePackagingSummaryForQuoteRecord(
  quoteParameters: JsonRecord,
  pricingDetails: JsonRecord,
): PackagingReviewSummaryView | null {
  const explicitSummary = normalizePackagingReviewSummaryView(pricingDetails.packagingReview)
  if (explicitSummary) {
    return explicitSummary
  }

  try {
    return buildPackagingReviewSummaryFromQuoteRecord({
      parameters: quoteParameters,
      pricingDetails,
    })
  } catch {
    return null
  }
}

export function buildQuoteSnapshotFromQuoteRecord(params: {
  conversation: ConversationExportSource
  quote: QuoteLikeRecord
}): ExportableQuoteSnapshot {
  const quoteParameters = asRecord(params.quote.parameters) || {}
  const pricingDetails = asRecord(params.quote.pricingDetails) || {}
  const productType = typeof quoteParameters.productType === 'string' ? quoteParameters.productType : undefined
  const packagingSummary = resolvePackagingSummaryForQuoteRecord(quoteParameters, pricingDetails)
  const documentKind = resolveSnapshotDocumentKind({
    sourceStatus: 'quoted',
    packagingSummary,
  })
  const isTrialScoped = isComplexPackagingProductType(productType) || Boolean(packagingSummary?.trialGateStatus || packagingSummary?.trialBundleGateStatus)

  const lineItems = packagingSummary?.lineItems.length
    ? buildLineItemsFromPackagingSummary(packagingSummary)
    : Array.isArray(pricingDetails.items) && pricingDetails.items.length > 0
      ? buildLineItemsFromRawPricingItems(pricingDetails.items)
      : [buildSingleLineItemFromParams(quoteParameters, pricingDetails)]
  const primaryLine = lineItems[0]
  const quotedAt = new Date(params.quote.createdAt)
  const trialReviewContext = buildTrialReviewExportContext(params.conversation)

  return {
    documentKind,
    documentTitle: getDocumentTitle(documentKind),
    exportId: buildExportId(getDocumentPrefix(documentKind), quotedAt, params.quote.id),
    quoteRecordId: params.quote.id,
    conversationId: params.conversation.id,
    conversationTitle: buildConversationTitle(params.conversation),
    customerName: params.conversation.customerName || '',
    quotedAt,
    quoteStatusLabel: getQuoteStatusLabel(documentKind),
    deliveryScopeLabel: getDeliveryScopeLabel(documentKind, isTrialScoped),
    deliveryScopeNote: buildDeliveryScopeNote(documentKind, packagingSummary, isTrialScoped),
    productName: lineItems.length > 1 ? `${primaryLine.productName}等${lineItems.length}项` : primaryLine.productName,
    spec: primaryLine.spec,
    materialColorProcess: primaryLine.materialColorProcess,
    quantity: primaryLine.quantity,
    unitPrice: primaryLine.unitPrice,
    subtotal: formatMoney(params.quote.subtotalCents / 100),
    shippingFee: formatMoney(params.quote.shippingCents / 100),
    tax: formatMoney(params.quote.taxCents / 100),
    finalPrice: formatMoney(params.quote.totalCents / 100),
    remark: dedupeText([
      trialReviewContext ? `试运行复核：${trialReviewContext.statusLabel}${trialReviewContext.latestActionLabel ? ` / ${trialReviewContext.latestActionLabel}` : ''}` : '',
      trialReviewContext?.operatorName ? `处理人：${trialReviewContext.operatorName}` : '',
      trialReviewContext?.note,
      packagingSummary?.conciseExplanation,
      ...(packagingSummary?.reviewReasons || []).map((reason) => reason.message),
      ...(Array.isArray(pricingDetails.notes) ? pricingDetails.notes.map((note) => String(note)) : []),
    ]),
    requiresHumanReview: Boolean(quoteParameters.requiresHumanReview || packagingSummary?.requiresHumanReview),
    trialReviewStatusLabel: trialReviewContext?.statusLabel || null,
    trialReviewSourceLabel: trialReviewContext?.sourceLabel || null,
    trialReviewLatestActionLabel: trialReviewContext?.latestActionLabel || null,
    trialReviewOperatorName: trialReviewContext?.operatorName || null,
    trialReviewUpdatedAt: trialReviewContext?.updatedAt || null,
    lineItems,
    sourceType: 'quote_record',
  }
}

export function buildQuoteSnapshotFromConversationMessage(params: {
  conversation: ConversationExportSource
  message: ConversationMessageLike
}): ExportableQuoteSnapshot | null {
  const metadata = asRecord(params.message.metadata)
  if (!metadata) {
    return null
  }

  const responseStatus = typeof metadata.responseStatus === 'string' ? metadata.responseStatus : ''
  if (!['estimated', 'quoted', 'handoff_required'].includes(responseStatus)) {
    return null
  }

  const pricingPayload = asRecord(metadata.estimatedData)
    || asRecord(metadata.data)
    || asRecord(metadata.quoteData)
    || undefined
  const quoteParams = asRecord(metadata.quoteParams)
    || asRecord(metadata.mergedParams)
    || asRecord(pricingPayload?.normalizedParams)
    || undefined
  const packagingSummary = normalizePackagingReviewSummaryView(metadata.packagingReview)
  const productType = typeof quoteParams?.productType === 'string' ? quoteParams.productType : undefined
  const documentKind = resolveSnapshotDocumentKind({
    sourceStatus: responseStatus as 'quoted' | 'estimated' | 'handoff_required',
    packagingSummary,
  })
  const isTrialScoped = isComplexPackagingProductType(productType) || Boolean(packagingSummary?.trialGateStatus || packagingSummary?.trialBundleGateStatus)
  const lineItems = packagingSummary?.lineItems.length
    ? buildLineItemsFromPackagingSummary(packagingSummary)
    : quoteParams
      ? [buildSingleLineItemFromParams(quoteParams, pricingPayload)]
      : []

  if (lineItems.length === 0) {
    return null
  }

  const primaryLine = lineItems[0]
  const createdAt = new Date(params.message.createdAt || params.conversation.updatedAt)
  const trialReviewContext = buildTrialReviewExportContext(params.conversation)

  return {
    documentKind,
    documentTitle: getDocumentTitle(documentKind),
    exportId: buildExportId(getDocumentPrefix(documentKind), createdAt, params.conversation.id),
    conversationId: params.conversation.id,
    conversationTitle: buildConversationTitle(params.conversation),
    customerName: params.conversation.customerName || '',
    quotedAt: createdAt,
    quoteStatusLabel: getQuoteStatusLabel(documentKind),
    deliveryScopeLabel: getDeliveryScopeLabel(documentKind, isTrialScoped),
    deliveryScopeNote: buildDeliveryScopeNote(documentKind, packagingSummary, isTrialScoped),
    productName: lineItems.length > 1 ? `${primaryLine.productName}等${lineItems.length}项` : primaryLine.productName,
    spec: primaryLine.spec,
    materialColorProcess: primaryLine.materialColorProcess,
    quantity: primaryLine.quantity,
    unitPrice: primaryLine.unitPrice,
    subtotal: formatMoney(asNumber(pricingPayload?.totalPrice ?? packagingSummary?.subtotal)),
    shippingFee: formatMoney(asNumber(pricingPayload?.shippingFee ?? packagingSummary?.shippingFee)),
    tax: formatMoney(asNumber(pricingPayload?.tax)),
    finalPrice: formatMoney(asNumber(pricingPayload?.finalPrice ?? packagingSummary?.finalPrice)),
    remark: dedupeText([
      trialReviewContext ? `试运行复核：${trialReviewContext.statusLabel}${trialReviewContext.latestActionLabel ? ` / ${trialReviewContext.latestActionLabel}` : ''}` : '',
      trialReviewContext?.operatorName ? `处理人：${trialReviewContext.operatorName}` : '',
      trialReviewContext?.note,
      packagingSummary?.conciseExplanation,
      ...(packagingSummary?.reviewReasons || []).map((reason) => reason.message),
      typeof params.message.content === 'string' ? params.message.content : '',
    ]),
    requiresHumanReview: Boolean(metadata.requiresHumanReview || packagingSummary?.requiresHumanReview),
    trialReviewStatusLabel: trialReviewContext?.statusLabel || null,
    trialReviewSourceLabel: trialReviewContext?.sourceLabel || null,
    trialReviewLatestActionLabel: trialReviewContext?.latestActionLabel || null,
    trialReviewOperatorName: trialReviewContext?.operatorName || null,
    trialReviewUpdatedAt: trialReviewContext?.updatedAt || null,
    lineItems,
    sourceType: 'conversation_message',
  }
}

export function isDeliverableQuoteSnapshot(snapshot: ExportableQuoteSnapshot): boolean {
  return snapshot.documentKind !== 'manual_review'
}

export function getQuoteSnapshotDeliveryBlockMessage(snapshot: ExportableQuoteSnapshot): string {
  return snapshot.deliveryScopeNote || '当前路径属于人工处理范围，不生成正式或参考报价单，请转人工跟进。'
}

function getLatestExportableMessage(conversation: ConversationExportSource): ConversationMessageLike | null {
  const messages = [...(conversation.messages || [])]
    .filter((message) => message.sender === 'ASSISTANT' && asRecord(message.metadata))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())

  for (const message of messages) {
    const snapshot = buildQuoteSnapshotFromConversationMessage({ conversation, message })
    if (snapshot) {
      return message
    }
  }

  return null
}

export function getLatestExportableQuoteSnapshot(conversation: ConversationExportSource): ExportableQuoteSnapshot | null {
  const latestQuote = [...(conversation.quotes || [])]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
  const latestMessage = getLatestExportableMessage(conversation)

  const quoteSnapshot = latestQuote
    ? buildQuoteSnapshotFromQuoteRecord({ conversation, quote: latestQuote })
    : null
  const messageSnapshot = latestMessage
    ? buildQuoteSnapshotFromConversationMessage({ conversation, message: latestMessage })
    : null

  if (!quoteSnapshot) {
    return messageSnapshot
  }

  if (!messageSnapshot) {
    return quoteSnapshot
  }

  return messageSnapshot.quotedAt.getTime() > quoteSnapshot.quotedAt.getTime()
    ? messageSnapshot
    : quoteSnapshot
}

export function buildLedgerRows(snapshots: ExportableQuoteSnapshot[]) {
  return snapshots.flatMap((snapshot) => snapshot.lineItems.map((item) => ({
    '报价日期': formatDateTime(snapshot.quotedAt),
    '会话编号': snapshot.conversationId,
    '报价单号': snapshot.exportId,
    '单据类型': snapshot.documentTitle,
    '业务归档分类': getLedgerArchiveLabel(snapshot.documentKind),
    '客户名称': snapshot.customerName,
    '品名': buildDisplayProductName(item),
    '规格': item.spec,
    '材质+颜色+工艺': item.materialColorProcess,
    '数量': item.quantity,
    '单价': item.unitPrice,
    '金额': item.subtotal,
    '报价状态': snapshot.quoteStatusLabel,
    '试运行口径': snapshot.deliveryScopeLabel,
    '对外使用建议': getDocumentUsageLabel(snapshot.documentKind),
    '复核状态': snapshot.trialReviewStatusLabel || '暂无复核留痕',
    '复核流转': dedupeText([
      snapshot.trialReviewStatusLabel,
      snapshot.trialReviewLatestActionLabel,
    ]),
    '复核来源': snapshot.trialReviewSourceLabel || '',
    '复核人': snapshot.trialReviewOperatorName || '',
    '复核更新时间': snapshot.trialReviewUpdatedAt || '',
    '是否人工复核': snapshot.requiresHumanReview ? '是' : '否',
    '来源会话主题': snapshot.conversationTitle,
    '备注': dedupeText([snapshot.deliveryScopeNote, snapshot.remark, item.note]),
  })))
}

function buildQuoteBreakdownRows(snapshot: ExportableQuoteSnapshot): QuoteBreakdownRow[] {
  const rows = snapshot.lineItems.map((item) => ({
    project: buildDisplayProductName(item),
    detail: dedupeText([item.spec, item.materialColorProcess]),
    quantity: formatQuantityText(item.quantity),
    unitPrice: formatUnitPriceText(item.unitPrice),
    amount: formatMoneyText(item.subtotal),
    note: dedupeText([
      item.roleLabel === '主件' ? '组合主件' : item.roleLabel === '子项' ? '组合子项' : '',
      item.note,
    ]),
  }))

  rows.push({
    project: '产品小计',
    detail: snapshot.lineItems.length > 1 ? '主件与子项金额合计' : '当前产品金额',
    quantity: '',
    unitPrice: '',
    amount: formatMoneyText(snapshot.subtotal),
    note: '订单级产品小计',
  })

  if (snapshot.shippingFee > 0) {
    rows.push({
      project: '运费',
      detail: '单独列示',
      quantity: '',
      unitPrice: '',
      amount: formatMoneyText(snapshot.shippingFee),
      note: '',
    })
  }

  if (snapshot.tax > 0) {
    rows.push({
      project: '税费',
      detail: '按当前报价口径计入',
      quantity: '',
      unitPrice: '',
      amount: formatMoneyText(snapshot.tax),
      note: '',
    })
  }

  rows.push({
    project: '报价金额',
    detail: '当前确认口径',
    quantity: '',
    unitPrice: '',
    amount: formatMoneyText(snapshot.finalPrice),
    note: snapshot.quoteStatusLabel,
  })

  return rows
}

function buildQuoteRemark(snapshot: ExportableQuoteSnapshot): string {
  return dedupeText([
    snapshot.deliveryScopeNote,
    `对外使用：${getDocumentUsageLabel(snapshot.documentKind)}`,
    snapshot.trialReviewStatusLabel ? `试运行复核：${snapshot.trialReviewStatusLabel}` : '',
    snapshot.trialReviewLatestActionLabel ? `最近复核动作：${snapshot.trialReviewLatestActionLabel}` : '',
    snapshot.trialReviewOperatorName ? `处理人：${snapshot.trialReviewOperatorName}` : '',
    snapshot.remark,
    snapshot.documentKind === 'reference_quote'
      ? '当前单据为参考报价单，仅供方案沟通、试运行评估和人工确认前留档使用。'
      : snapshot.requiresHumanReview
        ? '当前报价含需人工复核项，请结合业务确认。'
        : '以上报价基于当前确认参数整理。',
  ]) || '以上报价基于当前确认参数整理，如尺寸、材质、工艺或交期调整，请重新核价。'
}

function applyRegionBorder(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      worksheet.getCell(row, col).border = EXCEL_THIN_BORDER
    }
  }
}

function mergeAndStyle(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  value: string,
  style: Partial<ExcelJS.Style>
) {
  worksheet.mergeCells(startRow, startCol, endRow, endCol)
  applyRegionBorder(worksheet, startRow, startCol, endRow, endCol)

  const cell = worksheet.getCell(startRow, startCol)
  cell.value = value
  if (style.font) {
    cell.font = style.font
  }
  if (style.alignment) {
    cell.alignment = style.alignment
  }
  if (style.fill) {
    cell.fill = style.fill
  }
}

function buildPreviewItemRows(snapshot: ExportableQuoteSnapshot) {
  return snapshot.lineItems.map((item) => ({
    productName: buildDisplayProductName(item),
    spec: item.spec || '-',
    process: item.materialColorProcess || '-',
    quantity: formatQuantityText(item.quantity),
    unitPrice: formatUnitPriceText(item.unitPrice),
    subtotal: formatMoneyText(item.subtotal),
  }))
}

export function renderSingleQuotePreviewHtml(snapshot: ExportableQuoteSnapshot): string {
  const itemRows = buildPreviewItemRows(snapshot)
  const breakdownRows = buildQuoteBreakdownRows(snapshot)
  const remark = buildQuoteRemark(snapshot)

  const leftRowsHtml = itemRows.map((item) => `
            <tr>
              <td>${escapeHtml(item.productName)}</td>
              <td>${escapeHtml(item.spec)}</td>
              <td>${escapeHtml(item.process)}</td>
              <td class="num">${escapeHtml(item.quantity)}</td>
              <td class="num">${escapeHtml(item.unitPrice)}</td>
              <td class="num">${escapeHtml(item.subtotal)}</td>
            </tr>`).join('')

  const breakdownRowsHtml = breakdownRows.map((row) => `
            <tr>
              <td>${escapeHtml(row.project)}</td>
              <td>${escapeHtml(row.detail || '-')}</td>
              <td class="num">${escapeHtml(row.quantity)}</td>
              <td class="num">${escapeHtml(row.unitPrice)}</td>
              <td class="num">${escapeHtml(row.amount)}</td>
              <td>${escapeHtml(row.note || '-')}</td>
            </tr>`).join('')

  return `<!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(snapshot.exportId)} ${escapeHtml(snapshot.documentTitle)}</title>
    <style>
      :root {
        --line: #161616;
        --muted: #6b7280;
        --paper: #f5f0e2;
        --accent: #dbe8d5;
        --bg: #e8ece8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(219, 232, 213, 0.65), transparent 32%),
          linear-gradient(180deg, #edf0ea 0%, #e4e7e1 100%);
        font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        color: #111827;
        padding: 28px;
      }
      .sheet {
        max-width: 1480px;
        margin: 0 auto;
        background: #fff;
        border: 1.5px solid var(--line);
        box-shadow: 0 16px 40px rgba(17, 24, 39, 0.12);
        padding: 18px 20px 24px;
      }
      .top {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.55fr) minmax(320px, 0.9fr);
        gap: 16px;
        align-items: stretch;
      }
      .company {
        border: 1.5px solid var(--line);
        padding: 12px 14px;
      }
      .company h1 {
        margin: 0 0 8px;
        font-size: 28px;
        letter-spacing: 1px;
      }
      .company p {
        margin: 5px 0;
        font-size: 13px;
        line-height: 1.45;
      }
      .title {
        border: 1.5px solid var(--line);
        background: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 34px;
        font-weight: 700;
        letter-spacing: 10px;
      }
      .meta {
        border: 1.5px solid var(--line);
        display: grid;
        grid-template-columns: 92px 1fr;
      }
      .meta dt,
      .meta dd {
        margin: 0;
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        font-size: 13px;
      }
      .meta dt {
        background: var(--paper);
        font-weight: 700;
      }
      .meta dd {
        border-left: 1px solid var(--line);
      }
      .meta dt:last-of-type,
      .meta dd:last-of-type {
        border-bottom: 0;
      }
      .tables {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) 22px minmax(0, 0.92fr);
        margin-top: 16px;
        align-items: start;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .quote-table th,
      .quote-table td,
      .breakdown-table th,
      .breakdown-table td,
      .summary-table th,
      .summary-table td {
        border: 1px solid var(--line);
        padding: 8px 9px;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        background: var(--paper);
        font-weight: 700;
      }
      .section-title {
        background: var(--accent);
        font-weight: 700;
        text-align: center;
        letter-spacing: 1px;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .summary {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
        gap: 18px;
        margin-top: 16px;
      }
      .note-box {
        border: 1.5px solid var(--line);
      }
      .note-box h2 {
        margin: 0;
        padding: 10px 12px;
        background: var(--paper);
        border-bottom: 1px solid var(--line);
        font-size: 14px;
      }
      .note-box p {
        margin: 0;
        padding: 12px;
        line-height: 1.7;
        font-size: 13px;
        white-space: pre-wrap;
      }
      .footer-note {
        margin-top: 14px;
        border: 1.5px solid var(--line);
        padding: 10px 12px;
        font-size: 12px;
        color: var(--muted);
        line-height: 1.6;
      }
      .actions {
        margin-top: 16px;
      }
      .actions button {
        appearance: none;
        border: 1px solid var(--line);
        background: #fff;
        padding: 8px 14px;
        font-size: 13px;
        cursor: pointer;
      }
      @media print {
        body { background: #fff; padding: 0; }
        .sheet { box-shadow: none; margin: 0; max-width: none; }
        .actions { display: none; }
      }
      @media (max-width: 1080px) {
        body { padding: 16px; }
        .top,
        .tables,
        .summary {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <section class="top">
        <div class="company">
          <h1>${escapeHtml(QUOTE_COMPANY_PROFILE.name)}</h1>
          <p>${escapeHtml(QUOTE_COMPANY_PROFILE.address)} ${escapeHtml(QUOTE_COMPANY_PROFILE.phone)} ${escapeHtml(QUOTE_COMPANY_PROFILE.fax)}</p>
          <p>${escapeHtml(QUOTE_COMPANY_PROFILE.email)} ${escapeHtml(QUOTE_COMPANY_PROFILE.contact)} ${escapeHtml(QUOTE_COMPANY_PROFILE.mobile)} ${escapeHtml(QUOTE_COMPANY_PROFILE.wechat)}</p>
        </div>
        <div class="title">${escapeHtml(snapshot.documentTitle)}</div>
        <dl class="meta">
          <dt>客户</dt><dd>${escapeHtml(snapshot.customerName || '待补充')}</dd>
          <dt>报价日期</dt><dd>${escapeHtml(formatBusinessDate(snapshot.quotedAt))}</dd>
          <dt>报价单号</dt><dd>${escapeHtml(snapshot.exportId)}</dd>
          <dt>报价状态</dt><dd>${escapeHtml(snapshot.quoteStatusLabel)}</dd>
          <dt>试运行口径</dt><dd>${escapeHtml(snapshot.deliveryScopeLabel)}</dd>
          <dt>对外使用</dt><dd>${escapeHtml(getDocumentUsageLabel(snapshot.documentKind))}</dd>
          <dt>试运行复核</dt><dd>${escapeHtml(snapshot.trialReviewStatusLabel || '暂无复核留痕')}</dd>
          <dt>人工复核</dt><dd>${snapshot.requiresHumanReview ? '需要' : '无需'}</dd>
          <dt>主报价项</dt><dd>${escapeHtml(snapshot.productName)}</dd>
        </dl>
      </section>

      <section class="tables">
        <table class="quote-table">
          <thead>
            <tr><th class="section-title" colspan="6">业务报价区</th></tr>
            <tr>
              <th style="width: 15%;">品名</th>
              <th style="width: 21%;">规格</th>
              <th>材质+颜色+工艺</th>
              <th style="width: 10%;">数量</th>
              <th style="width: 12%;">单价</th>
              <th style="width: 14%;">金额</th>
            </tr>
          </thead>
          <tbody>${leftRowsHtml}</tbody>
        </table>
        <div></div>
        <table class="breakdown-table">
          <thead>
            <tr><th class="section-title" colspan="6">报价拆解区</th></tr>
            <tr>
              <th style="width: 16%;">项目</th>
              <th>规格/说明</th>
              <th style="width: 12%;">数量</th>
              <th style="width: 14%;">单价</th>
              <th style="width: 14%;">金额</th>
              <th style="width: 18%;">备注</th>
            </tr>
          </thead>
          <tbody>${breakdownRowsHtml}</tbody>
        </table>
      </section>

      <section class="summary">
        <div class="note-box">
          <h2>报价说明</h2>
          <p>${escapeHtml(remark)}</p>
        </div>
        <table class="summary-table">
          <tbody>
            <tr><th colspan="2" class="section-title">报价汇总</th></tr>
            <tr><th>产品小计</th><td class="num">${escapeHtml(formatMoneyText(snapshot.subtotal))}</td></tr>
            <tr><th>运费</th><td class="num">${escapeHtml(formatMoneyText(snapshot.shippingFee))}</td></tr>
            <tr><th>税费</th><td class="num">${escapeHtml(formatMoneyText(snapshot.tax))}</td></tr>
            <tr><th>报价金额</th><td class="num">${escapeHtml(formatMoneyText(snapshot.finalPrice))}</td></tr>
          </tbody>
        </table>
      </section>

      <div class="footer-note">${escapeHtml(snapshot.deliveryScopeNote)} 若客户要求变更尺寸、材质、工艺、交期或交货地点，请重新核价后再确认。</div>

      <div class="actions">
        <button onclick="window.print()">打印此页</button>
      </div>
    </div>
  </body>
  </html>`
}

export async function buildSingleQuoteWorkbook(snapshot: ExportableQuoteSnapshot): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GitHub Copilot'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('报价单', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  })

  worksheet.columns = [
    { width: 14 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 3 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ]

  const detailRows = Math.max(snapshot.lineItems.length, buildQuoteBreakdownRows(snapshot).length, 3)
  const detailStartRow = 6
  const detailEndRow = detailStartRow + detailRows - 1
  const summaryTitleRow = detailEndRow + 1
  const summaryStartRow = summaryTitleRow + 1
  const summaryEndRow = summaryStartRow + 3
  const remark = buildQuoteRemark(snapshot)
  const breakdownRows = buildQuoteBreakdownRows(snapshot)

  mergeAndStyle(worksheet, 1, 1, 1, 6, QUOTE_COMPANY_PROFILE.name, {
    font: { name: 'Microsoft YaHei', size: 18, bold: true },
    alignment: { vertical: 'middle', horizontal: 'left' },
  })
  mergeAndStyle(worksheet, 1, 7, 1, 8, snapshot.documentTitle, {
    font: { name: 'Microsoft YaHei', size: 20, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_TITLE_FILL,
  })
  mergeAndStyle(worksheet, 1, 10, 1, 18, '报价拆解', {
    font: { name: 'Microsoft YaHei', size: 15, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_TITLE_FILL,
  })

  mergeAndStyle(
    worksheet,
    2,
    1,
    2,
    8,
    `${QUOTE_COMPANY_PROFILE.address}    ${QUOTE_COMPANY_PROFILE.phone}    ${QUOTE_COMPANY_PROFILE.fax}`,
    { font: { name: 'Microsoft YaHei', size: 10 }, alignment: { vertical: 'middle', horizontal: 'left' } }
  )
  mergeAndStyle(
    worksheet,
    3,
    1,
    3,
    8,
    `${QUOTE_COMPANY_PROFILE.email}    ${QUOTE_COMPANY_PROFILE.contact}    ${QUOTE_COMPANY_PROFILE.mobile}    ${QUOTE_COMPANY_PROFILE.wechat}`,
    { font: { name: 'Microsoft YaHei', size: 10 }, alignment: { vertical: 'middle', horizontal: 'left' } }
  )
  mergeAndStyle(
    worksheet,
    2,
    10,
    2,
    18,
    '本区仅展示当前报价可追溯的项目拆解，不展示内部成本口径。',
    { font: { name: 'Microsoft YaHei', size: 10, italic: true }, alignment: { vertical: 'middle', horizontal: 'left' } }
  )
  mergeAndStyle(worksheet, 3, 10, 3, 11, '报价单号', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_HEADER_FILL,
  })
  mergeAndStyle(worksheet, 3, 12, 3, 18, snapshot.exportId, {
    font: { name: 'Microsoft YaHei', size: 10 },
    alignment: { vertical: 'middle', horizontal: 'left' },
  })

  worksheet.getCell(4, 1).value = '客户：'
  worksheet.getCell(4, 1).font = { name: 'Microsoft YaHei', size: 10, bold: true }
  worksheet.getCell(4, 1).fill = EXCEL_HEADER_FILL
  worksheet.getCell(4, 1).alignment = { vertical: 'middle', horizontal: 'center' }
  applyRegionBorder(worksheet, 4, 1, 4, 1)
  mergeAndStyle(worksheet, 4, 2, 4, 5, snapshot.customerName || '待补充', {
    font: { name: 'Microsoft YaHei', size: 10 },
    alignment: { vertical: 'middle', horizontal: 'left' },
  })
  worksheet.getCell(4, 6).value = '报价日期：'
  worksheet.getCell(4, 6).font = { name: 'Microsoft YaHei', size: 10, bold: true }
  worksheet.getCell(4, 6).fill = EXCEL_HEADER_FILL
  worksheet.getCell(4, 6).alignment = { vertical: 'middle', horizontal: 'center' }
  applyRegionBorder(worksheet, 4, 6, 4, 6)
  mergeAndStyle(worksheet, 4, 7, 4, 8, formatBusinessDate(snapshot.quotedAt), {
    font: { name: 'Microsoft YaHei', size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  mergeAndStyle(worksheet, 4, 10, 4, 11, '报价状态', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_HEADER_FILL,
  })
  mergeAndStyle(worksheet, 4, 12, 4, 13, snapshot.quoteStatusLabel, {
    font: { name: 'Microsoft YaHei', size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  mergeAndStyle(worksheet, 4, 14, 4, 15, '试运行口径', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_HEADER_FILL,
  })
  mergeAndStyle(worksheet, 4, 16, 4, 18, snapshot.deliveryScopeLabel, {
    font: { name: 'Microsoft YaHei', size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })

  mergeAndStyle(worksheet, 5, 1, 5, 1, '品名', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 2, 5, 3, '规格', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 4, 5, 5, '材质+颜色+工艺', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 6, 5, 6, '数量', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 7, 5, 7, '单价', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 8, 5, 8, '金额', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })

  mergeAndStyle(worksheet, 5, 10, 5, 10, '项目', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 11, 5, 12, '规格/说明', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 13, 5, 13, '数量', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 14, 5, 14, '单价', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 15, 5, 15, '金额', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })
  mergeAndStyle(worksheet, 5, 16, 5, 18, '备注', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_ACCENT_FILL,
  })

  for (let index = 0; index < detailRows; index += 1) {
    const rowNumber = detailStartRow + index
    const item = snapshot.lineItems[index]
    const breakdown = breakdownRows[index]

    mergeAndStyle(worksheet, rowNumber, 1, rowNumber, 1, item?.productName || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    mergeAndStyle(worksheet, rowNumber, 2, rowNumber, 3, item?.spec || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    mergeAndStyle(worksheet, rowNumber, 4, rowNumber, 5, item?.materialColorProcess || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    mergeAndStyle(worksheet, rowNumber, 6, rowNumber, 6, item ? formatQuantityText(item.quantity) : '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'center' },
    })
    mergeAndStyle(worksheet, rowNumber, 7, rowNumber, 7, item ? formatUnitPriceText(item.unitPrice) : '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'right' },
    })
    mergeAndStyle(worksheet, rowNumber, 8, rowNumber, 8, item ? formatMoneyText(item.subtotal) : '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'right' },
    })

    mergeAndStyle(worksheet, rowNumber, 10, rowNumber, 10, breakdown?.project || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    mergeAndStyle(worksheet, rowNumber, 11, rowNumber, 12, breakdown?.detail || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    mergeAndStyle(worksheet, rowNumber, 13, rowNumber, 13, breakdown?.quantity || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'center' },
    })
    mergeAndStyle(worksheet, rowNumber, 14, rowNumber, 14, breakdown?.unitPrice || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'right' },
    })
    mergeAndStyle(worksheet, rowNumber, 15, rowNumber, 15, breakdown?.amount || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'right' },
    })
    mergeAndStyle(worksheet, rowNumber, 16, rowNumber, 18, breakdown?.note || '', {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
  }

  mergeAndStyle(worksheet, summaryTitleRow, 1, summaryTitleRow, 5, '报价说明', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_HEADER_FILL,
  })
  mergeAndStyle(worksheet, summaryTitleRow, 6, summaryTitleRow, 8, '报价汇总', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_HEADER_FILL,
  })
  mergeAndStyle(worksheet, summaryTitleRow, 10, summaryTitleRow, 18, '交付说明', {
    font: { name: 'Microsoft YaHei', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: EXCEL_HEADER_FILL,
  })

  mergeAndStyle(worksheet, summaryStartRow, 1, summaryEndRow, 5, remark, {
    font: { name: 'Microsoft YaHei', size: 10 },
    alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
  })

  const totals: Array<[string, string]> = [
    ['产品小计', formatMoneyText(snapshot.subtotal)],
    ['运费', formatMoneyText(snapshot.shippingFee)],
    ['税费', formatMoneyText(snapshot.tax)],
    ['报价金额', formatMoneyText(snapshot.finalPrice)],
  ]

  totals.forEach(([label, value], index) => {
    const rowNumber = summaryStartRow + index
    mergeAndStyle(worksheet, rowNumber, 6, rowNumber, 7, label, {
      font: { name: 'Microsoft YaHei', size: 10, bold: label === '报价金额' },
      alignment: { vertical: 'middle', horizontal: 'center' },
      fill: label === '报价金额' ? EXCEL_ACCENT_FILL : undefined,
    })
    mergeAndStyle(worksheet, rowNumber, 8, rowNumber, 8, value, {
      font: { name: 'Microsoft YaHei', size: 10, bold: label === '报价金额' },
      alignment: { vertical: 'middle', horizontal: 'right' },
      fill: label === '报价金额' ? EXCEL_ACCENT_FILL : undefined,
    })
  })

  mergeAndStyle(
    worksheet,
    summaryStartRow,
    10,
    summaryEndRow,
    18,
    `对外使用：${getDocumentUsageLabel(snapshot.documentKind)} ${snapshot.deliveryScopeNote} 若客户变更尺寸、材质、工艺、数量、交期或交货地点，请重新核价；如含人工复核项，请以业务最终确认版本为准。`,
    {
      font: { name: 'Microsoft YaHei', size: 10 },
      alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
    }
  )

  ;[1, 2, 3, 4, 5].forEach((row) => {
    worksheet.getRow(row).height = row === 1 ? 28 : 22
  })
  for (let row = detailStartRow; row <= detailEndRow; row += 1) {
    worksheet.getRow(row).height = 38
  }
  worksheet.getRow(summaryTitleRow).height = 22
  for (let row = summaryStartRow; row <= summaryEndRow; row += 1) {
    worksheet.getRow(row).height = 26
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export function buildLedgerWorkbook(snapshots: ExportableQuoteSnapshot[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(buildLedgerRows(snapshots))
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
    { wch: 32 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 32 },
    { wch: 12 },
    { wch: 18 },
    { wch: 26 },
    { wch: 16 },
    { wch: 18 },
    { wch: 32 },
    { wch: 12 },
    { wch: 26 },
    { wch: 32 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '报价台账')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}