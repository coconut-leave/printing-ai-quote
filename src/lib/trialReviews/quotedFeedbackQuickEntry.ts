import type { PackagingReviewSummaryView } from '@/lib/packaging/reviewSummary'

export type TrialReviewFeedbackType = 'quoted_rejection'

export type TrialReviewRejectionCategory =
  | 'price_too_high'
  | 'price_too_low'
  | 'should_have_been_estimated'
  | 'should_have_been_handoff'
  | 'bundle_boundary_issue'
  | 'business_wording_issue'
  | 'other'

export type TrialReviewTargetArea =
  | 'main_box'
  | 'leaflet'
  | 'box_insert'
  | 'seal_sticker'
  | 'carton_packaging'
  | 'bundle_main_box_path'
  | 'markup'
  | 'shipping'
  | 'tax'
  | 'unknown'

export type TrialReviewQuickEntryStatus = 'CLOSED' | 'HANDOFF_TO_HUMAN'

export type TrialReviewQuickEntryContextSnapshot = {
  feedbackType: TrialReviewFeedbackType
  conversationId: number
  quoteId: number | null
  currentPathLabel: string
  bundleTypeLabel: string
  currentQuoteStatusLabel: string
  deliveryScopeLabel: string
  isActiveScope: boolean
  mainItemTitle: string | null
  subItemTitles: string[]
}

export type TrialReviewQuickEntryStructuredFields = {
  sourceKind: 'QUOTED_FEEDBACK'
  status: TrialReviewQuickEntryStatus
  manualConfirmationResult: 'REJECTED_QUOTED_RESULT'
  calibrationSignal: 'QUOTE_TOO_HIGH' | 'QUOTE_TOO_LOW' | 'NO_SYSTEM_DRIFT' | 'NEEDS_MORE_EVIDENCE'
  driftDirection: 'HIGH' | 'LOW' | null
  driftSourceCandidate: string | null
  rejectionCategory: TrialReviewRejectionCategory
  rejectionTargetArea: TrialReviewTargetArea
  requiresHumanReview: boolean
  contextSnapshot: TrialReviewQuickEntryContextSnapshot
}

export const TRIAL_REJECTION_CATEGORY_OPTIONS: Array<{
  value: TrialReviewRejectionCategory
  label: string
}> = [
  { value: 'price_too_high', label: '价格偏高' },
  { value: 'price_too_low', label: '价格偏低' },
  { value: 'should_have_been_estimated', label: '本应走参考报价' },
  { value: 'should_have_been_handoff', label: '本应转人工' },
  { value: 'bundle_boundary_issue', label: '组合边界错误' },
  { value: 'business_wording_issue', label: '业务表达问题' },
  { value: 'other', label: '其他' },
] as const

export const TRIAL_TARGET_AREA_OPTIONS: Array<{
  value: TrialReviewTargetArea
  label: string
}> = [
  { value: 'main_box', label: '主盒' },
  { value: 'leaflet', label: '说明书' },
  { value: 'box_insert', label: '内托' },
  { value: 'seal_sticker', label: '封口贴' },
  { value: 'carton_packaging', label: '外箱包装' },
  { value: 'bundle_main_box_path', label: '组合主盒路径' },
  { value: 'markup', label: '加价层' },
  { value: 'shipping', label: '运费' },
  { value: 'tax', label: '税费' },
  { value: 'unknown', label: '暂不确定' },
] as const

export function getTrialReviewRejectionCategoryLabel(category: TrialReviewRejectionCategory | string | null | undefined): string {
  const option = TRIAL_REJECTION_CATEGORY_OPTIONS.find((item) => item.value === category)
  return option?.label || (category || '未归类')
}

export function getTrialReviewTargetAreaLabel(targetArea: TrialReviewTargetArea | string | null | undefined): string {
  const option = TRIAL_TARGET_AREA_OPTIONS.find((item) => item.value === targetArea)
  return option?.label || (targetArea || '暂不确定')
}

function deriveCurrentPathLabel(summary: PackagingReviewSummaryView | null | undefined, fallbackTitle?: string | null): string {
  const mainTitle = summary?.mainItem?.title || summary?.lineItems[0]?.title
  return mainTitle || fallbackTitle || '当前报价路径'
}

function deriveBundleTypeLabel(summary: PackagingReviewSummaryView | null | undefined): string {
  const subItemTitles = summary?.subItems.map((item) => item.title).filter(Boolean) || []

  if (subItemTitles.length === 0) {
    return '单项'
  }

  return `主件 + ${subItemTitles.join(' + ')}`
}

function getDefaultDriftSourceCandidate(targetArea: TrialReviewTargetArea): string | null {
  switch (targetArea) {
    case 'carton_packaging':
      return 'carton_outer_carton_rate'
    case 'seal_sticker':
      return 'sticker_processing'
    case 'bundle_main_box_path':
      return 'bundle_main_box_path'
    case 'main_box':
      return 'bundle_main_box_path'
    case 'leaflet':
      return 'leaflet_setup_fee'
    case 'box_insert':
      return 'insert_weight_assumption'
    case 'markup':
      return 'markup'
    case 'shipping':
      return 'shipping'
    case 'tax':
      return 'tax'
    default:
      return null
  }
}

function getDefaultCalibrationSignal(category: TrialReviewRejectionCategory): TrialReviewQuickEntryStructuredFields['calibrationSignal'] {
  switch (category) {
    case 'price_too_high':
      return 'QUOTE_TOO_HIGH'
    case 'price_too_low':
      return 'QUOTE_TOO_LOW'
    case 'business_wording_issue':
      return 'NO_SYSTEM_DRIFT'
    default:
      return 'NEEDS_MORE_EVIDENCE'
  }
}

function getDefaultDriftDirection(category: TrialReviewRejectionCategory): TrialReviewQuickEntryStructuredFields['driftDirection'] {
  if (category === 'price_too_high') {
    return 'HIGH'
  }

  if (category === 'price_too_low') {
    return 'LOW'
  }

  return null
}

export function buildQuotedFeedbackContextSnapshot(input: {
  conversationId: number
  quoteId: number | null
  currentQuoteStatusLabel: string | null | undefined
  deliveryScopeLabel: string | null | undefined
  isActiveScope: boolean
  packagingSummary?: PackagingReviewSummaryView | null
  fallbackTitle?: string | null
}): TrialReviewQuickEntryContextSnapshot {
  const summary = input.packagingSummary || null

  return {
    feedbackType: 'quoted_rejection',
    conversationId: input.conversationId,
    quoteId: input.quoteId,
    currentPathLabel: deriveCurrentPathLabel(summary, input.fallbackTitle),
    bundleTypeLabel: deriveBundleTypeLabel(summary),
    currentQuoteStatusLabel: input.currentQuoteStatusLabel || '正式报价',
    deliveryScopeLabel: input.deliveryScopeLabel || '未知交付口径',
    isActiveScope: input.isActiveScope,
    mainItemTitle: summary?.mainItem?.title || null,
    subItemTitles: summary?.subItems.map((item) => item.title).filter(Boolean) || [],
  }
}

export function buildQuotedFeedbackStructuredFields(input: {
  contextSnapshot: TrialReviewQuickEntryContextSnapshot
  rejectionCategory: TrialReviewRejectionCategory
  targetArea: TrialReviewTargetArea
  manualFollowupRequired: boolean
}): TrialReviewQuickEntryStructuredFields {
  return {
    sourceKind: 'QUOTED_FEEDBACK',
    status: input.manualFollowupRequired ? 'HANDOFF_TO_HUMAN' : 'CLOSED',
    manualConfirmationResult: 'REJECTED_QUOTED_RESULT',
    calibrationSignal: getDefaultCalibrationSignal(input.rejectionCategory),
    driftDirection: getDefaultDriftDirection(input.rejectionCategory),
    driftSourceCandidate: getDefaultDriftSourceCandidate(input.targetArea),
    rejectionCategory: input.rejectionCategory,
    rejectionTargetArea: input.targetArea,
    requiresHumanReview: input.manualFollowupRequired,
    contextSnapshot: input.contextSnapshot,
  }
}