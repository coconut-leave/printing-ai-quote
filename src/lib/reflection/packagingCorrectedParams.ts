import { formatParamValue, getFieldLabel } from '@/lib/catalog/helpers'
import {
  COMPLEX_PACKAGING_PRODUCT_TYPES,
  getProductSchema,
  isComplexPackagingProductType,
  type ProductType,
} from '@/lib/catalog/productSchemas'
import {
  getReflectionPackagingContext,
  type ReflectionPackagingContext,
} from '@/lib/reflection/context'
import {
  isPackagingReflectionIssueType,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'

type JsonRecord = Record<string, any>

export type PackagingDraftItem = Record<string, any> & {
  productType: ProductType
  title?: string
}

export type PackagingDraftReason = {
  code?: string
  label: string
  message: string
}

export type PackagingCorrectedParamsDraft = {
  productType: ProductType
  isBundle: boolean
  packagingContext: {
    flow: 'complex_packaging'
    mainItem: PackagingDraftItem
    subItems: PackagingDraftItem[]
    reviewReasons: PackagingDraftReason[]
    requiresHumanReview?: boolean
  }
}

export type PackagingFieldOption = {
  value: string
  label: string
}

const NUMERIC_FIELDS = new Set([
  'quantity',
  'weight',
  'length',
  'width',
  'height',
  'windowFilmThickness',
  'windowSizeLength',
  'windowSizeWidth',
  'paperWeight',
  'foldCount',
  'insertLength',
  'insertWidth',
  'stickerLength',
  'stickerWidth',
  'spotColorCount',
])

const BOOLEAN_FIELDS = new Set([
  'mounting',
  'dieCut',
  'gluing',
  'hasWindow',
])

const STRING_LIST_FIELDS = new Set(['notes', 'pantoneCodes'])

const ITEM_LEVEL_HIDDEN_FIELDS = new Set([
  'hasReferenceFile',
  'referenceFileCategory',
  'requiresHumanReview',
])

const DEFAULT_MAIN_PRODUCT_TYPE: ProductType = 'tuck_end_box'
const DEFAULT_SUB_ITEM_PRODUCT_TYPE: ProductType = 'leaflet_insert'

const PROCESS_OPTIONS: PackagingFieldOption[] = [
  { value: '裱', label: '裱' },
  { value: '啤', label: '啤' },
  { value: '粘', label: '粘' },
  { value: '过哑胶', label: '过哑胶' },
  { value: '过光胶', label: '过光胶' },
  { value: 'UV', label: 'UV' },
  { value: '开窗贴胶片', label: '开窗贴胶片' },
  { value: '烫金', label: '烫金' },
]

const FIELD_OPTIONS: Partial<Record<string, PackagingFieldOption[]>> = {
  productType: COMPLEX_PACKAGING_PRODUCT_TYPES.map((value) => ({
    value,
    label: formatParamValue('productType', value),
  })),
  sizeUnit: [
    { value: 'mm', label: 'mm' },
    { value: 'cm', label: 'cm' },
  ],
  printColor: [
    { value: 'black', label: formatParamValue('printColor', 'black') },
    { value: 'four_color', label: formatParamValue('printColor', 'four_color') },
    { value: 'double_four_color', label: formatParamValue('printColor', 'double_four_color') },
    { value: 'four_color_spot', label: formatParamValue('printColor', 'four_color_spot') },
    { value: 'spot', label: formatParamValue('printColor', 'spot') },
  ],
  surfaceFinish: [
    { value: 'none', label: formatParamValue('surfaceFinish', 'none') },
    { value: 'matte_lamination', label: formatParamValue('surfaceFinish', 'matte_lamination') },
    { value: 'glossy_lamination', label: formatParamValue('surfaceFinish', 'glossy_lamination') },
    { value: 'uv', label: formatParamValue('surfaceFinish', 'uv') },
  ],
  laminationType: [
    { value: 'none', label: formatParamValue('laminationType', 'none') },
    { value: 'matte', label: formatParamValue('laminationType', 'matte') },
    { value: 'glossy', label: formatParamValue('laminationType', 'glossy') },
  ],
  paperType: [
    { value: 'coated', label: formatParamValue('paperType', 'coated') },
    { value: 'matte', label: formatParamValue('paperType', 'matte') },
    { value: 'art', label: formatParamValue('paperType', 'art') },
    { value: 'standard', label: formatParamValue('paperType', 'standard') },
    { value: 'kraft', label: formatParamValue('paperType', 'kraft') },
    { value: 'white_card', label: formatParamValue('paperType', 'white_card') },
    { value: 'single_coated', label: formatParamValue('paperType', 'single_coated') },
    { value: 'double_coated', label: formatParamValue('paperType', 'double_coated') },
    { value: 'specialty_board', label: formatParamValue('paperType', 'specialty_board') },
    { value: 'clear_sticker', label: formatParamValue('paperType', 'clear_sticker') },
  ],
  printSides: [
    { value: 'single', label: formatParamValue('printSides', 'single') },
    { value: 'double', label: formatParamValue('printSides', 'double') },
  ],
  foldType: [
    { value: 'tri_fold', label: formatParamValue('foldType', 'tri_fold') },
    { value: 'bi_fold', label: formatParamValue('foldType', 'bi_fold') },
    { value: 'z_fold', label: formatParamValue('foldType', 'z_fold') },
    { value: 'none', label: formatParamValue('foldType', 'none') },
  ],
  insertType: [
    { value: 'paper_board', label: '纸板内托' },
    { value: 'blister', label: '吸塑内托' },
    { value: 'eva', label: 'EVA 内托' },
    { value: 'sponge', label: '海绵内托' },
  ],
  stickerType: [
    { value: 'seal_sticker', label: '封口贴' },
    { value: 'round_label', label: '圆形贴纸' },
    { value: 'tamper_label', label: '防拆贴' },
  ],
  referenceFileCategory: [
    { value: 'knowledge_reference', label: formatParamValue('referenceFileCategory', 'knowledge_reference') },
    { value: 'design_file', label: formatParamValue('referenceFileCategory', 'design_file') },
    { value: 'dieline_pdf', label: formatParamValue('referenceFileCategory', 'dieline_pdf') },
  ],
}

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeQuoteParameters(parameters: unknown): Record<string, any> | undefined {
  if (!isObject(parameters)) return undefined
  const sanitized = { ...parameters }
  delete sanitized.mainItem
  delete sanitized.subItems
  delete sanitized.referenceFiles
  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

function splitStringList(value: string): string[] {
  return value
    .split(/[\n,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item))
  }

  if (typeof value === 'string') {
    return splitStringList(value)
  }

  return []
}

function getDefaultItemTitle(productType: ProductType): string {
  return formatParamValue('productType', productType)
}

function sanitizeReason(value: unknown): PackagingDraftReason | null {
  if (!isObject(value)) return null
  const label = normalizeString(value.label)
  const message = normalizeString(value.message)
  if (!label && !message) return null

  return {
    code: normalizeString(value.code),
    label: label || message || '复核原因',
    message: message || label || '复核原因',
  }
}

function sanitizeDraftItem(value: unknown, fallbackProductType: ProductType): PackagingDraftItem {
  const source = isObject(value) ? value : {}
  const productType = isComplexPackagingProductType(source.productType)
    ? source.productType
    : fallbackProductType
  const schema = getProductSchema(productType)
  const item: PackagingDraftItem = {
    productType,
    title: normalizeString(source.title) || getDefaultItemTitle(productType),
  }

  for (const field of schema.fieldDisplayOrder) {
    if (field === 'productType' || ITEM_LEVEL_HIDDEN_FIELDS.has(field)) {
      continue
    }

    const fieldValue = source[field]

    if (field === 'processes') {
      item.processes = normalizeStringList(fieldValue)
      continue
    }

    if (STRING_LIST_FIELDS.has(field)) {
      item[field] = normalizeStringList(fieldValue)
      continue
    }

    if (NUMERIC_FIELDS.has(field)) {
      const numericValue = normalizeNumber(fieldValue)
      if (numericValue !== undefined) {
        item[field] = numericValue
      }
      continue
    }

    if (BOOLEAN_FIELDS.has(field)) {
      if (typeof fieldValue === 'boolean') {
        item[field] = fieldValue
      }
      continue
    }

    const stringValue = normalizeString(fieldValue)
    if (stringValue !== undefined) {
      item[field] = stringValue
    }
  }

  return item
}

function sanitizeReviewReasons(value: unknown): PackagingDraftReason[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => sanitizeReason(item))
    .filter((item): item is PackagingDraftReason => Boolean(item))
}

function sanitizeCorrectedDraft(draft: PackagingCorrectedParamsDraft): PackagingCorrectedParamsDraft {
  const mainItem = sanitizeDraftItem(draft.packagingContext.mainItem, draft.productType)
  const subItems = draft.packagingContext.subItems.map((item) => sanitizeDraftItem(item, DEFAULT_SUB_ITEM_PRODUCT_TYPE))
  const reviewReasons = sanitizeReviewReasons(draft.packagingContext.reviewReasons)
  const productType = mainItem.productType

  return {
    productType,
    isBundle: subItems.length > 0,
    packagingContext: {
      flow: 'complex_packaging',
      mainItem,
      subItems,
      reviewReasons,
      requiresHumanReview: typeof draft.packagingContext.requiresHumanReview === 'boolean'
        ? draft.packagingContext.requiresHumanReview
        : undefined,
    },
  }
}

function shouldForceHumanReview(issueType: ReflectionIssueType, context: ReflectionPackagingContext | null): boolean | undefined {
  if (issueType === 'SHOULD_HANDOFF_BUT_NOT') return true
  if (issueType === 'SHOULD_QUOTED_BUT_ESTIMATED') return false
  if (typeof context?.requiresHumanReview === 'boolean') return context.requiresHumanReview
  return undefined
}

export function getPackagingFieldOptions(field: string): PackagingFieldOption[] {
  return FIELD_OPTIONS[field] || []
}

export function getPackagingProcessOptions(): PackagingFieldOption[] {
  return PROCESS_OPTIONS
}

export function isPackagingNumericField(field: string): boolean {
  return NUMERIC_FIELDS.has(field)
}

export function isPackagingBooleanField(field: string): boolean {
  return BOOLEAN_FIELDS.has(field)
}

export function isPackagingStringListField(field: string): boolean {
  return STRING_LIST_FIELDS.has(field)
}

export function getPackagingItemFields(productType?: string): string[] {
  const normalizedProductType = isComplexPackagingProductType(productType)
    ? productType
    : DEFAULT_MAIN_PRODUCT_TYPE
  const schema = getProductSchema(normalizedProductType)

  return ['title', 'productType', ...schema.fieldDisplayOrder.filter((field) => (
    field !== 'productType' && !ITEM_LEVEL_HIDDEN_FIELDS.has(field)
  ))]
}

export function createEmptyPackagingSubItem(productType: ProductType = DEFAULT_SUB_ITEM_PRODUCT_TYPE): PackagingDraftItem {
  return sanitizeDraftItem({ productType }, productType)
}

export function updatePackagingDraftItemField(
  item: PackagingDraftItem,
  field: string,
  value: unknown
): PackagingDraftItem {
  if (field === 'productType') {
    const nextProductType = isComplexPackagingProductType(value as string)
      ? value as ProductType
      : DEFAULT_SUB_ITEM_PRODUCT_TYPE

    return sanitizeDraftItem({ ...item, productType: nextProductType }, nextProductType)
  }

  if (field === 'processes') {
    return sanitizeDraftItem({ ...item, processes: Array.isArray(value) ? value : [] }, item.productType)
  }

  if (field === 'title') {
    const nextTitle = normalizeString(value)
    return sanitizeDraftItem({ ...item, title: nextTitle || getDefaultItemTitle(item.productType) }, item.productType)
  }

  return sanitizeDraftItem({ ...item, [field]: value }, item.productType)
}

export function updatePackagingDraftMainItem(
  draft: PackagingCorrectedParamsDraft,
  field: string,
  value: unknown
): PackagingCorrectedParamsDraft {
  const mainItem = updatePackagingDraftItemField(draft.packagingContext.mainItem, field, value)

  return sanitizeCorrectedDraft({
    ...draft,
    productType: mainItem.productType,
    packagingContext: {
      ...draft.packagingContext,
      mainItem,
    },
  })
}

export function addPackagingDraftSubItem(
  draft: PackagingCorrectedParamsDraft,
  productType: ProductType = DEFAULT_SUB_ITEM_PRODUCT_TYPE
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      subItems: [...draft.packagingContext.subItems, createEmptyPackagingSubItem(productType)],
    },
  })
}

export function updatePackagingDraftSubItem(
  draft: PackagingCorrectedParamsDraft,
  index: number,
  field: string,
  value: unknown
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      subItems: draft.packagingContext.subItems.map((item, itemIndex) => (
        itemIndex === index ? updatePackagingDraftItemField(item, field, value) : item
      )),
    },
  })
}

export function removePackagingDraftSubItem(
  draft: PackagingCorrectedParamsDraft,
  index: number
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      subItems: draft.packagingContext.subItems.filter((_, itemIndex) => itemIndex !== index),
    },
  })
}

export function updatePackagingDraftReviewReason(
  draft: PackagingCorrectedParamsDraft,
  index: number,
  field: 'label' | 'message',
  value: string
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      reviewReasons: draft.packagingContext.reviewReasons.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    },
  })
}

export function addPackagingDraftReviewReason(draft: PackagingCorrectedParamsDraft): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      reviewReasons: [
        ...draft.packagingContext.reviewReasons,
        { label: '新增复核原因', message: '请补充复核说明' },
      ],
    },
  })
}

export function removePackagingDraftReviewReason(
  draft: PackagingCorrectedParamsDraft,
  index: number
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      reviewReasons: draft.packagingContext.reviewReasons.filter((_, itemIndex) => itemIndex !== index),
    },
  })
}

export function updatePackagingDraftRequiresHumanReview(
  draft: PackagingCorrectedParamsDraft,
  value: boolean
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft({
    ...draft,
    packagingContext: {
      ...draft.packagingContext,
      requiresHumanReview: value,
    },
  })
}

export function buildPackagingCorrectedParamsPayload(
  draft: PackagingCorrectedParamsDraft
): PackagingCorrectedParamsDraft {
  return sanitizeCorrectedDraft(draft)
}

export function buildPackagingContext(metadata?: Record<string, any>, latestQuote?: any): Record<string, any> | undefined {
  const quoteParameters = isObject(latestQuote?.parameters) ? latestQuote.parameters as Record<string, any> : undefined
  const pricingDetails = isObject(latestQuote?.pricingDetails) ? latestQuote.pricingDetails as Record<string, any> : undefined
  const complexPackagingState = isObject(metadata?.complexPackagingState)
    ? metadata.complexPackagingState as Record<string, any>
    : undefined
  const packagingReview = isObject(metadata?.packagingReview)
    ? metadata.packagingReview as Record<string, any>
    : isObject(pricingDetails?.packagingReview)
      ? pricingDetails.packagingReview as Record<string, any>
      : undefined
  const mainItem = isObject(complexPackagingState?.mainItem)
    ? complexPackagingState.mainItem
    : isObject(quoteParameters?.mainItem)
      ? quoteParameters.mainItem
      : undefined
  const subItems = Array.isArray(complexPackagingState?.subItems)
    ? complexPackagingState.subItems
    : Array.isArray(quoteParameters?.subItems)
      ? quoteParameters.subItems
      : []
  const lineItems = Array.isArray(packagingReview?.lineItems)
    ? packagingReview.lineItems
    : Array.isArray(metadata?.quoteItems)
      ? metadata?.quoteItems
      : Array.isArray(pricingDetails?.items)
        ? pricingDetails?.items
        : []
  const reviewReasons = Array.isArray(packagingReview?.reviewReasons)
    ? packagingReview.reviewReasons
    : []
  const missingDetails = Array.isArray(packagingReview?.missingDetails)
    ? packagingReview.missingDetails
    : Array.isArray(metadata?.missingDetails)
      ? metadata?.missingDetails
      : Array.isArray(metadata?.complexPackagingDecision?.missingDetails)
        ? metadata?.complexPackagingDecision?.missingDetails
        : []
  const referenceFiles = Array.isArray(metadata?.referenceFiles)
    ? metadata.referenceFiles
    : Array.isArray(complexPackagingState?.referenceFiles)
      ? complexPackagingState.referenceFiles
      : Array.isArray(packagingReview?.referenceFiles)
        ? packagingReview.referenceFiles
        : Array.isArray(quoteParameters?.referenceFiles)
          ? quoteParameters.referenceFiles
          : []
  const requiresHumanReview = typeof metadata?.requiresHumanReview === 'boolean'
    ? metadata.requiresHumanReview
    : typeof complexPackagingState?.requiresHumanReview === 'boolean'
      ? complexPackagingState.requiresHumanReview
      : typeof packagingReview?.requiresHumanReview === 'boolean'
        ? packagingReview.requiresHumanReview
        : typeof quoteParameters?.requiresHumanReview === 'boolean'
          ? quoteParameters.requiresHumanReview
          : undefined

  if (!mainItem && subItems.length === 0 && !packagingReview && lineItems.length === 0 && reviewReasons.length === 0 && missingDetails.length === 0 && referenceFiles.length === 0) {
    return undefined
  }

  return {
    flow: 'complex_packaging',
    mainItem,
    subItems,
    packagingReview,
    reviewReasons,
    requiresHumanReview,
    missingDetails,
    lineItems,
    referenceFiles,
  }
}

export function buildOriginalExtractedParams(
  payloadOriginal: unknown,
  metadata?: Record<string, any>,
  latestQuote?: any
): Record<string, any> | undefined {
  const payloadOriginalObject = isObject(payloadOriginal) ? payloadOriginal : undefined
  const metadataBase = isObject(metadata?.extractedParams)
    ? metadata.extractedParams
    : isObject(metadata?.mergedParams)
      ? metadata.mergedParams
      : isObject(metadata?.quoteParams)
        ? metadata.quoteParams
        : sanitizeQuoteParameters(latestQuote?.parameters)
  const packagingContext = buildPackagingContext(metadata, latestQuote)
  const merged = {
    ...(metadataBase || {}),
    ...(payloadOriginalObject || {}),
  }

  if (packagingContext) {
    merged.packagingContext = packagingContext
    if (!merged.productType && typeof packagingContext.mainItem?.productType === 'string') {
      merged.productType = packagingContext.mainItem.productType
    }
    if (!merged.isBundle && Array.isArray(packagingContext.subItems) && packagingContext.subItems.length > 0) {
      merged.isBundle = true
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

export function buildPackagingCorrectedParamsDraft(input: {
  issueType: ReflectionIssueType
  originalExtractedParams?: Record<string, any>
  metadata?: Record<string, any>
  latestQuote?: any
}): PackagingCorrectedParamsDraft | null {
  if (!isPackagingReflectionIssueType(input.issueType)) {
    return null
  }

  const originalExtractedParams = input.originalExtractedParams
    || buildOriginalExtractedParams(undefined, input.metadata, input.latestQuote)
  const context = getReflectionPackagingContext(originalExtractedParams)

  if (!context?.mainItem) {
    return null
  }

  const mainProductType = isComplexPackagingProductType(context.mainItem.productType)
    ? context.mainItem.productType
    : DEFAULT_MAIN_PRODUCT_TYPE
  const mainItem = sanitizeDraftItem(context.mainItem, mainProductType)
  const subItems = (context.subItems || []).map((item) => {
    const subItemProductType = isComplexPackagingProductType(item.productType)
      ? item.productType
      : DEFAULT_SUB_ITEM_PRODUCT_TYPE

    return sanitizeDraftItem(item, subItemProductType)
  })

  return sanitizeCorrectedDraft({
    productType: mainItem.productType,
    isBundle: subItems.length > 0,
    packagingContext: {
      flow: 'complex_packaging',
      mainItem,
      subItems,
      reviewReasons: sanitizeReviewReasons(context.reviewReasons || []),
      requiresHumanReview: shouldForceHumanReview(input.issueType, context),
    },
  })
}

export function getPackagingFieldDisplayLabel(productType: string | undefined, field: string): string {
  if (field === 'title') return '包装项名称'
  return getFieldLabel(productType, field)
}