import {
  formatParamValue,
  getFieldDisplayOrder,
  getFieldLabel,
  isPackagingProductType,
} from '@/lib/catalog/helpers'
import {
  getReflectionPackagingContext,
  type ReflectionPackagingContext,
} from '@/lib/reflection/context'
import {
  isPackagingReflectionIssueType,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'

type JsonRecord = Record<string, any>

export type PackagingDiffFieldChange = {
  field: string
  label: string
  before: string
  after: string
}

export type PackagingDiffSubItemChange = {
  type: 'added' | 'removed' | 'modified'
  title: string
  productType?: string
  fieldChanges: PackagingDiffFieldChange[]
}

export type PackagingDiffReasonChange = {
  type: 'added' | 'removed' | 'retained'
  label: string
}

export type PackagingReflectionDiff = {
  issueType: ReflectionIssueType
  originalContext: ReflectionPackagingContext
  correctedContext: ReflectionPackagingContext
  originalStatus?: string
  correctedStatus?: string
  mainItemChanges: PackagingDiffFieldChange[]
  subItemChanges: PackagingDiffSubItemChange[]
  resultChanges: PackagingDiffFieldChange[]
  reviewReasonChanges: PackagingDiffReasonChange[]
  originalRaw: JsonRecord
  correctedRaw: JsonRecord
}

const HIDDEN_ITEM_FIELDS = new Set([
  'hasReferenceFile',
  'referenceFileCategory',
  'requiresHumanReview',
  'notes',
])

const INSERT_TYPE_LABELS: Record<string, string> = {
  paper_board: '纸板内托',
  blister: '吸塑内托',
  eva: 'EVA 内托',
  sponge: '海绵内托',
}

const STICKER_TYPE_LABELS: Record<string, string> = {
  seal_sticker: '封口贴',
  round_label: '圆形贴纸',
  tamper_label: '防拆贴',
}

const PACKAGING_STATUS_LABELS: Record<string, string> = {
  quoted: '正式报价',
  estimated: '预报价',
  handoff_required: '人工复核',
  missing_fields: '待补参数',
}

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }

  return value
}

function formatPackagingStatus(value?: string): string {
  if (!value) return '未记录'
  return PACKAGING_STATUS_LABELS[value] || value
}

function formatRequiresHumanReview(value: unknown): string {
  if (typeof value !== 'boolean') return '未记录'
  return value ? '需要' : '不需要'
}

function formatPackagingFieldValue(field: string, value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return '未填写'
  }

  if (field === 'processes') {
    return Array.isArray(value) ? value.join('、') : String(value)
  }

  if (field === 'insertType' && typeof value === 'string') {
    return INSERT_TYPE_LABELS[value] || value
  }

  if (field === 'stickerType' && typeof value === 'string') {
    return STICKER_TYPE_LABELS[value] || value
  }

  if (field === 'material' || field === 'paperType' || field === 'insertMaterial' || field === 'stickerMaterial') {
    return formatParamValue('paperType', value)
  }

  if (field === 'productType') {
    return formatParamValue('productType', value)
  }

  if (field === 'printColor' || field === 'surfaceFinish' || field === 'laminationType' || field === 'printSides' || field === 'foldType') {
    return formatParamValue(field, value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatPackagingFieldValue(field, item)).join('、')
  }

  const formatted = formatParamValue(field, value)
  return formatted || String(value)
}

function getPackagingItemFields(originalItem?: JsonRecord, correctedItem?: JsonRecord): string[] {
  const orderedFields: string[] = ['productType']
  const seen = new Set<string>(orderedFields)
  const productTypes = [originalItem?.productType, correctedItem?.productType]

  for (const productType of productTypes) {
    if (!isPackagingProductType(productType)) {
      continue
    }

    for (const field of getFieldDisplayOrder(productType)) {
      if (HIDDEN_ITEM_FIELDS.has(field) || seen.has(field)) {
        continue
      }
      seen.add(field)
      orderedFields.push(field)
    }
  }

  if (!seen.has('quantity')) {
    orderedFields.push('quantity')
  }

  return orderedFields
}

function buildFieldChanges(originalItem?: JsonRecord, correctedItem?: JsonRecord): PackagingDiffFieldChange[] {
  const productType = typeof correctedItem?.productType === 'string'
    ? correctedItem.productType
    : typeof originalItem?.productType === 'string'
      ? originalItem.productType
      : undefined

  return getPackagingItemFields(originalItem, correctedItem)
    .flatMap((field) => {
      const beforeValue = normalizeValue(originalItem?.[field])
      const afterValue = normalizeValue(correctedItem?.[field])

      if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
        return []
      }

      return [{
        field,
        label: getFieldLabel(productType, field),
        before: formatPackagingFieldValue(field, originalItem?.[field]),
        after: formatPackagingFieldValue(field, correctedItem?.[field]),
      }]
    })
}

function getItemTitle(item?: JsonRecord): string {
  if (!item) return '未命名子组件'
  if (typeof item.title === 'string' && item.title.trim()) return item.title.trim()
  if (typeof item.productType === 'string') return formatParamValue('productType', item.productType)
  return '未命名子组件'
}

function getStatusFromContext(context: ReflectionPackagingContext): string | undefined {
  const status = context.packagingReview?.status
  return typeof status === 'string' ? status : undefined
}

function deriveCorrectedStatus(
  issueType: ReflectionIssueType,
  correctedContext: ReflectionPackagingContext,
  originalStatus?: string,
): string | undefined {
  const explicitStatus = getStatusFromContext(correctedContext)
  if (explicitStatus) {
    return explicitStatus
  }

  if (issueType === 'SHOULD_ESTIMATE_BUT_QUOTED') {
    return 'estimated'
  }

  if (issueType === 'SHOULD_HANDOFF_BUT_NOT') {
    return 'handoff_required'
  }

  if (issueType === 'SHOULD_QUOTED_BUT_ESTIMATED') {
    return 'quoted'
  }

  return originalStatus
}

function buildSubItemChanges(
  originalItems: JsonRecord[],
  correctedItems: JsonRecord[],
): PackagingDiffSubItemChange[] {
  const changes: PackagingDiffSubItemChange[] = []
  const maxLength = Math.max(originalItems.length, correctedItems.length)

  for (let index = 0; index < maxLength; index += 1) {
    const originalItem = originalItems[index]
    const correctedItem = correctedItems[index]

    if (!originalItem && correctedItem) {
      changes.push({
        type: 'added',
        title: getItemTitle(correctedItem),
        productType: correctedItem.productType,
        fieldChanges: [],
      })
      continue
    }

    if (originalItem && !correctedItem) {
      changes.push({
        type: 'removed',
        title: getItemTitle(originalItem),
        productType: originalItem.productType,
        fieldChanges: [],
      })
      continue
    }

    if (!originalItem || !correctedItem) {
      continue
    }

    if (originalItem.productType !== correctedItem.productType) {
      changes.push({
        type: 'removed',
        title: getItemTitle(originalItem),
        productType: originalItem.productType,
        fieldChanges: [],
      })
      changes.push({
        type: 'added',
        title: getItemTitle(correctedItem),
        productType: correctedItem.productType,
        fieldChanges: [],
      })
      continue
    }

    const fieldChanges = buildFieldChanges(originalItem, correctedItem)
    if (fieldChanges.length > 0) {
      changes.push({
        type: 'modified',
        title: getItemTitle(correctedItem),
        productType: correctedItem.productType,
        fieldChanges,
      })
    }
  }

  return changes
}

function getReasonKey(reason: JsonRecord): string {
  return [reason.code, reason.label, reason.message].filter(Boolean).join('|')
}

function getReasonLabel(reason: JsonRecord): string {
  if (typeof reason.label === 'string' && reason.label.trim()) return reason.label.trim()
  if (typeof reason.code === 'string' && reason.code.trim()) return reason.code.trim()
  if (typeof reason.message === 'string' && reason.message.trim()) return reason.message.trim()
  return '未命名复核原因'
}

function buildReviewReasonChanges(
  originalReasons: JsonRecord[],
  correctedReasons: JsonRecord[],
): PackagingDiffReasonChange[] {
  const originalMap = new Map(originalReasons.map((reason) => [getReasonKey(reason), getReasonLabel(reason)]))
  const correctedMap = new Map(correctedReasons.map((reason) => [getReasonKey(reason), getReasonLabel(reason)]))
  const changes: PackagingDiffReasonChange[] = []

  for (const [key, label] of correctedMap) {
    changes.push({
      type: originalMap.has(key) ? 'retained' : 'added',
      label,
    })
  }

  for (const [key, label] of originalMap) {
    if (!correctedMap.has(key)) {
      changes.push({
        type: 'removed',
        label,
      })
    }
  }

  return changes
}

export function buildPackagingReflectionDiff(input: {
  issueType: ReflectionIssueType
  originalExtractedParams?: JsonRecord | null
  correctedParams?: JsonRecord | null
}): PackagingReflectionDiff | null {
  if (!isPackagingReflectionIssueType(input.issueType)) {
    return null
  }

  if (!isObject(input.originalExtractedParams) || !isObject(input.correctedParams)) {
    return null
  }

  const originalContext = getReflectionPackagingContext(input.originalExtractedParams)
  const correctedContext = getReflectionPackagingContext(input.correctedParams)

  if (!originalContext || !correctedContext) {
    return null
  }

  const originalStatus = getStatusFromContext(originalContext)
  const correctedStatus = deriveCorrectedStatus(input.issueType, correctedContext, originalStatus)
  const resultChanges: PackagingDiffFieldChange[] = []

  if (originalStatus !== correctedStatus) {
    resultChanges.push({
      field: 'status',
      label: '结果',
      before: formatPackagingStatus(originalStatus),
      after: formatPackagingStatus(correctedStatus),
    })
  }

  if (originalContext.requiresHumanReview !== correctedContext.requiresHumanReview) {
    resultChanges.push({
      field: 'requiresHumanReview',
      label: '人工复核',
      before: formatRequiresHumanReview(originalContext.requiresHumanReview),
      after: formatRequiresHumanReview(correctedContext.requiresHumanReview),
    })
  }

  const mainItemChanges = buildFieldChanges(originalContext.mainItem, correctedContext.mainItem)
  const subItemChanges = buildSubItemChanges(originalContext.subItems || [], correctedContext.subItems || [])
  const reviewReasonChanges = buildReviewReasonChanges(originalContext.reviewReasons || [], correctedContext.reviewReasons || [])

  if (mainItemChanges.length === 0 && subItemChanges.length === 0 && resultChanges.length === 0 && reviewReasonChanges.length === 0) {
    return null
  }

  return {
    issueType: input.issueType,
    originalContext,
    correctedContext,
    originalStatus,
    correctedStatus,
    mainItemChanges,
    subItemChanges,
    resultChanges,
    reviewReasonChanges,
    originalRaw: input.originalExtractedParams,
    correctedRaw: input.correctedParams,
  }
}

export function getPackagingDiffSideSummary(context: ReflectionPackagingContext, status?: string): string[] {
  const summary: string[] = []

  if (context.mainItem) {
    summary.push(`主件：${getItemTitle(context.mainItem)}`)
  }

  summary.push(`子组件：${context.subItems?.length || 0} 项`)
  summary.push(`结果：${formatPackagingStatus(status)}`)
  summary.push(`人工复核：${formatRequiresHumanReview(context.requiresHumanReview)}`)

  return summary
}

export function getPackagingSubItemChangeLabel(change: PackagingDiffSubItemChange): string {
  if (change.type === 'added') {
    return `新增子组件：${change.title}`
  }

  if (change.type === 'removed') {
    return `删除子组件：${change.title}`
  }

  return `修改子组件：${change.title}`
}

export function getPackagingReasonChangeLabel(change: PackagingDiffReasonChange): string {
  if (change.type === 'added') {
    return `新增复核原因：${change.label}`
  }

  if (change.type === 'removed') {
    return `删除复核原因：${change.label}`
  }

  return `保留复核原因：${change.label}`
}