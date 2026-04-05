type JsonRecord = Record<string, any>

export type ReflectionPackagingContext = {
  flow?: 'complex_packaging'
  mainItem?: JsonRecord
  subItems?: JsonRecord[]
  packagingReview?: JsonRecord
  reviewReasons?: JsonRecord[]
  requiresHumanReview?: boolean
  missingDetails?: JsonRecord[]
  lineItems?: JsonRecord[]
  referenceFiles?: JsonRecord[]
}

const PACKAGING_PRODUCT_TYPE_LABELS: Record<string, string> = {
  mailer_box: '飞机盒',
  tuck_end_box: '双插盒',
  window_box: '开窗彩盒',
  leaflet_insert: '说明书',
  box_insert: '内托',
  seal_sticker: '封口贴',
}

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRecord(value: unknown): JsonRecord | undefined {
  return isObject(value) ? value : undefined
}

function normalizeRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isObject) : []
}

function hasOwnKey(value: unknown, key: string): boolean {
  return isObject(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function pickFirstRecord(...values: unknown[]): JsonRecord | undefined {
  return values.map(normalizeRecord).find(Boolean)
}

function pickFirstRecordArray(...values: unknown[]): JsonRecord[] {
  for (const value of values) {
    const records = normalizeRecordArray(value)
    if (records.length > 0) {
      return records
    }
  }
  return []
}

function getProductTypeLabel(productType?: string): string {
  if (!productType) return '包装项'
  return PACKAGING_PRODUCT_TYPE_LABELS[productType] || productType
}

function getItemLabel(item?: JsonRecord): string {
  if (!item) return '包装项'
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  if (title) return title
  const productType = typeof item.productType === 'string' ? item.productType : undefined
  return getProductTypeLabel(productType)
}

function normalizeContext(value: unknown): ReflectionPackagingContext | null {
  if (!isObject(value)) return null

  const packagingContext = normalizeRecord(value.packagingContext)
  const source = packagingContext || value
  const packagingReview = pickFirstRecord(source.packagingReview)
  const reviewReasons = pickFirstRecordArray(source.reviewReasons, packagingReview?.reviewReasons)
  const missingDetails = pickFirstRecordArray(source.missingDetails, packagingReview?.missingDetails)
  const lineItems = pickFirstRecordArray(source.lineItems, packagingReview?.lineItems, source.quoteItems)
  const referenceFiles = pickFirstRecordArray(source.referenceFiles, packagingReview?.referenceFiles)
  const subItems = pickFirstRecordArray(source.subItems)
  const mainItem = pickFirstRecord(source.mainItem)
  const requiresHumanReview = typeof source.requiresHumanReview === 'boolean'
    ? source.requiresHumanReview
    : typeof packagingReview?.requiresHumanReview === 'boolean'
      ? packagingReview.requiresHumanReview
      : undefined

  if (!mainItem && subItems.length === 0 && !packagingReview && reviewReasons.length === 0 && missingDetails.length === 0 && lineItems.length === 0 && referenceFiles.length === 0) {
    return null
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

export function getReflectionPackagingContext(params?: JsonRecord | null): ReflectionPackagingContext | null {
  if (!params) return null
  return normalizeContext(params)
}

export function mergeReflectionPackagingContext(
  originalParams?: JsonRecord | null,
  correctedParams?: JsonRecord | null
): ReflectionPackagingContext | null {
  const original = getReflectionPackagingContext(originalParams)
  const corrected = getReflectionPackagingContext(correctedParams)
  const correctedSource = normalizeRecord(correctedParams?.packagingContext) || normalizeRecord(correctedParams)
  const correctedPackagingReview = normalizeRecord(correctedSource?.packagingReview)
  const correctedHasSubItems = Array.isArray(correctedSource?.subItems)
  const correctedHasReviewReasons = Array.isArray(correctedSource?.reviewReasons) || Array.isArray(correctedPackagingReview?.reviewReasons)
  const correctedHasMissingDetails = Array.isArray(correctedSource?.missingDetails) || Array.isArray(correctedPackagingReview?.missingDetails)
  const correctedHasLineItems = Array.isArray(correctedSource?.lineItems) || Array.isArray(correctedPackagingReview?.lineItems) || Array.isArray(correctedSource?.quoteItems)
  const correctedHasReferenceFiles = Array.isArray(correctedSource?.referenceFiles) || Array.isArray(correctedPackagingReview?.referenceFiles)
  const correctedHasRequiresHumanReview = hasOwnKey(correctedSource, 'requiresHumanReview') || hasOwnKey(correctedPackagingReview, 'requiresHumanReview')

  if (!original && !corrected) return null

  return {
    flow: 'complex_packaging',
    mainItem: corrected?.mainItem || original?.mainItem,
    subItems: correctedHasSubItems ? corrected?.subItems || [] : original?.subItems || [],
    packagingReview: corrected?.packagingReview || original?.packagingReview,
    reviewReasons: correctedHasReviewReasons ? corrected?.reviewReasons || [] : original?.reviewReasons || [],
    requiresHumanReview: correctedHasRequiresHumanReview
      ? corrected?.requiresHumanReview
      : original?.requiresHumanReview,
    missingDetails: correctedHasMissingDetails ? corrected?.missingDetails || [] : original?.missingDetails || [],
    lineItems: correctedHasLineItems ? corrected?.lineItems || [] : original?.lineItems || [],
    referenceFiles: correctedHasReferenceFiles ? corrected?.referenceFiles || [] : original?.referenceFiles || [],
  }
}

function getMissingTexts(context: ReflectionPackagingContext): string[] {
  return (context.missingDetails || [])
    .map((detail) => {
      const itemLabel = typeof detail.itemLabel === 'string' && detail.itemLabel.trim()
        ? detail.itemLabel.trim()
        : getProductTypeLabel(typeof detail.productType === 'string' ? detail.productType : undefined)
      const fieldsText = typeof detail.fieldsText === 'string' && detail.fieldsText.trim()
        ? detail.fieldsText.trim()
        : Array.isArray(detail.fields)
          ? detail.fields.join('、')
          : ''
      return fieldsText ? `${itemLabel}缺少${fieldsText}` : ''
    })
    .filter(Boolean)
}

function getReviewReasonLabels(context: ReflectionPackagingContext): string[] {
  return (context.reviewReasons || [])
    .map((reason) => {
      if (typeof reason.label === 'string' && reason.label.trim()) return reason.label.trim()
      if (typeof reason.message === 'string' && reason.message.trim()) return reason.message.trim()
      return ''
    })
    .filter(Boolean)
}

export function collectReflectionMissingFields(
  originalParams?: JsonRecord | null,
  correctedParams?: JsonRecord | null
): string[] {
  const context = mergeReflectionPackagingContext(originalParams, correctedParams)
  if (context) {
    const missingFields = (context.missingDetails || []).flatMap((detail) => (
      Array.isArray(detail.fields) ? detail.fields.map(String) : []
    ))
    if (missingFields.length > 0) {
      return Array.from(new Set(missingFields))
    }
  }

  const corrected = normalizeRecord(correctedParams)
  if (!corrected) return []

  return Object.keys(corrected).filter((key) => key !== 'packagingContext')
}

export function buildReflectionContextSummary(
  originalParams?: JsonRecord | null,
  correctedParams?: JsonRecord | null
): string {
  const context = mergeReflectionPackagingContext(originalParams, correctedParams)
  if (!context) return ''

  const parts: string[] = []
  const mainItemLabel = getItemLabel(context.mainItem)
  parts.push(`主件：${mainItemLabel}`)

  const subItemCount = context.subItems?.length || 0
  if (subItemCount > 0) {
    parts.push(`配件：${subItemCount} 项`)
  }

  const missingTexts = getMissingTexts(context)
  if (missingTexts.length > 0) {
    parts.push(`缺参：${missingTexts.slice(0, 2).join('；')}`)
  }

  const reviewReasonLabels = getReviewReasonLabels(context)
  if (reviewReasonLabels.length > 0) {
    parts.push(`复核原因：${reviewReasonLabels.slice(0, 2).join('、')}`)
  }

  if (context.requiresHumanReview) {
    parts.push('当前命中人工复核')
  }

  const referenceFileCount = context.referenceFiles?.length || 0
  if (referenceFileCount > 0) {
    parts.push(`参考文件：${referenceFileCount} 个`)
  }

  const lineItemCount = context.lineItems?.length || 0
  if (lineItemCount > 1) {
    parts.push(`拆单：${lineItemCount} 个报价分项`)
  }

  return parts.join('；')
}