import {
  getReflectionRecordStatusLabel,
  getTrialReviewCalibrationSignalLabel,
  getTrialReviewDriftDirectionLabel,
  getTrialReviewManualConfirmationResultLabel,
  getTrialReviewRejectionCategoryLabel,
  getTrialReviewTargetAreaLabel,
} from '@/lib/admin/presentation'
import {
  buildReflectionBusinessFeedbackSummary,
  extractReflectionBusinessFeedback,
} from '@/lib/reflection/businessFeedback'
import { getReflectionIssueTypeLabel } from '@/lib/reflection/issueTypes'
import {
  buildPackagingReviewSummaryFromQuoteRecord,
  normalizePackagingReviewSummaryView,
  type PackagingReviewSummaryView,
} from '@/lib/packaging/reviewSummary'
import type {
  PricingTrialBundleGateStatus,
  PricingTrialGateStatus,
} from '@/server/packaging/types'
import {
  buildPricingAcceptanceGateEntries,
  type PricingAcceptanceGateEntry,
} from '@/server/pricing/pricingAcceptanceGateDraft'
import {
  PRICING_TRIAL_RELEASE_ENTRIES,
  type PricingTrialReleaseBucket,
  type PricingTrialReleaseScopeType,
} from '@/server/pricing/pricingTrialReleaseGateDraft'

type JsonRecord = Record<string, any>

type TrialReviewConversationQuote = {
  id: number
  status?: string
  parameters?: unknown
  pricingDetails?: unknown
  createdAt: Date | string
}

type TrialReviewConversationMessage = {
  id?: number
  sender?: string | null
  content?: string | null
  metadata?: unknown
  createdAt?: Date | string
}

type TrialReviewConversationReflection = {
  id: number
  issueType: string
  status: string
  correctedParams?: unknown
  correctedQuoteSummary?: string | null
  createdAt: Date | string
}

export type TrialReviewConversationLike = {
  quotes?: TrialReviewConversationQuote[]
  messages?: TrialReviewConversationMessage[]
  reflections?: TrialReviewConversationReflection[]
}

export type TrialReviewObservationCardTone = 'emerald' | 'sky' | 'orange' | 'amber' | 'slate'

export type TrialReviewObservationCard = {
  title: string
  value: string
  note: string | null
  tone: TrialReviewObservationCardTone
}

export type TrialReviewObservationLineItem = {
  roleLabel: '主件' | '子项' | '单项'
  title: string
  spec: string
  subtotalLabel: string | null
  reviewNote: string | null
  isBlocking: boolean
}

export type TrialReviewObservation = {
  overviewCards: TrialReviewObservationCard[]
  reasonSection: {
    title: string
    primaryReason: string
    secondaryReasons: string[]
    guardrails: string[]
  }
  componentSection: {
    summary: string
    mainItemTitle: string | null
    subItemTitles: string[]
    blockerComponents: string[]
    pricingFacts: Array<{ label: string; value: string }>
    lineItems: TrialReviewObservationLineItem[]
  }
  feedbackSection: {
    summary: string
    facts: Array<{ label: string; value: string }>
  }
  consistencySection: {
    bucketLabel: string
    acceptanceSummary: string
    note: string
    acceptanceAligned: boolean | null
  }
}

export type TrialReviewObservationInput = {
  isActiveScope: boolean
  packagingSummary: PackagingReviewSummaryView | null
  currentQuoteStatusLabel: string | null
  deliveryScopeLabel: string | null
  deliveryScopeNote: string | null
  queueReason: string | null
  recommendedAction: string | null
  requiresHumanReview: boolean
  reflections: TrialReviewConversationReflection[]
  reviewStatusLabel: string | null
  operatorName: string | null
  lastActionNote: string | null
  manualConfirmationResult: string | null
  rejectionReason: string | null
  rejectionCategory: string | null
  rejectionTargetArea: string | null
  calibrationSignal: string | null
  driftSourceCandidate: string | null
  driftDirection: string | null
  contextSnapshot: Record<string, any> | null
  manualConfirmedAt: string | null
}

let acceptanceGateCache: PricingAcceptanceGateEntry[] | null = null

function getAcceptanceGateEntries() {
  if (!acceptanceGateCache) {
    acceptanceGateCache = buildPricingAcceptanceGateEntries()
  }

  return acceptanceGateCache
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatMoney(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return `¥${value.toFixed(2)}`
}

function normalizeText(value: string | null | undefined): string | null {
  const nextValue = value?.trim()
  return nextValue ? nextValue : null
}

function dedupeTextList(values: Array<string | null | undefined>): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  values.forEach((value) => {
    const normalized = normalizeText(value)
    if (!normalized || seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    result.push(normalized)
  })

  return result
}

function normalizeDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const nextValue = value instanceof Date ? value : new Date(value)
  return Number.isNaN(nextValue.getTime()) ? null : nextValue
}

function formatDate(value: string | Date | null | undefined): string | null {
  const nextValue = normalizeDate(value)
  return nextValue ? nextValue.toLocaleString() : null
}

function resolveLatestPackagingSummary(conversation: TrialReviewConversationLike): PackagingReviewSummaryView | null {
  const latestQuote = [...(conversation.quotes || [])]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
  const latestAssistantMessage = [...(conversation.messages || [])]
    .filter((message) => message.sender === 'ASSISTANT' && asRecord(message.metadata))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())[0]

  const quoteSummary = (() => {
    if (!latestQuote) {
      return null
    }

    const quoteParameters = asRecord(latestQuote.parameters) || {}
    const pricingDetails = asRecord(latestQuote.pricingDetails) || {}
    const explicitSummary = normalizePackagingReviewSummaryView(pricingDetails.packagingReview)
    if (explicitSummary) {
      return explicitSummary
    }

    try {
      return buildPackagingReviewSummaryFromQuoteRecord({
        status: latestQuote.status,
        parameters: quoteParameters,
        pricingDetails,
      })
    } catch {
      return null
    }
  })()

  const messageSummary = (() => {
    const metadata = asRecord(latestAssistantMessage?.metadata)
    return metadata ? normalizePackagingReviewSummaryView(metadata.packagingReview) : null
  })()

  if (!quoteSummary) {
    return messageSummary
  }

  if (!messageSummary) {
    return quoteSummary
  }

  const latestQuoteAt = normalizeDate(latestQuote?.createdAt)
  const latestMessageAt = normalizeDate(latestAssistantMessage?.createdAt)
  return (latestMessageAt?.getTime() || 0) > (latestQuoteAt?.getTime() || 0)
    ? messageSummary
    : quoteSummary
}

function getCurrentDecisionStatus(
  packagingSummary: PackagingReviewSummaryView | null,
  currentQuoteStatusLabel: string | null,
) {
  if (packagingSummary?.status) {
    return packagingSummary.status
  }

  if (currentQuoteStatusLabel === '正式报价') return 'quoted'
  if (currentQuoteStatusLabel === '参考报价') return 'estimated'
  if (currentQuoteStatusLabel === '转人工') return 'handoff_required'
  return 'missing_fields'
}

function getReleaseBucket(
  packagingSummary: PackagingReviewSummaryView | null,
): PricingTrialReleaseBucket | null {
  const bundleGateStatus = packagingSummary?.trialBundleGateStatus
  if (bundleGateStatus === 'standard_quoted_bundle_in_trial') return 'allowed_quoted_in_trial'
  if (bundleGateStatus === 'estimated_only_bundle_in_trial') return 'estimated_only_in_trial'
  if (bundleGateStatus === 'handoff_only_bundle_in_trial') return 'handoff_only_in_trial'

  const trialGateStatus = packagingSummary?.trialGateStatus
  if (trialGateStatus === 'allowed_quoted_in_trial') return 'allowed_quoted_in_trial'
  if (trialGateStatus === 'estimated_only_in_trial') return 'estimated_only_in_trial'
  if (trialGateStatus === 'handoff_only_in_trial') return 'handoff_only_in_trial'

  return null
}

function getScopeType(packagingSummary: PackagingReviewSummaryView | null): PricingTrialReleaseScopeType {
  const lineItemCount = packagingSummary?.lineItems.length || 0
  const subItemCount = packagingSummary?.subItems.length || 0
  return subItemCount > 0 || lineItemCount > 1 ? 'bundle' : 'item'
}

function getBucketLabel(bucket: PricingTrialReleaseBucket | null): string {
  if (bucket === 'allowed_quoted_in_trial') return '试运行正式报价口径'
  if (bucket === 'estimated_only_in_trial') return '试运行参考报价口径'
  if (bucket === 'handoff_only_in_trial') return '试运行人工处理口径'
  return '未识别试运行口径'
}

function getOutcomeCard(
  currentDecisionStatus: ReturnType<typeof getCurrentDecisionStatus>,
  currentQuoteStatusLabel: string | null,
): TrialReviewObservationCard {
  if (currentDecisionStatus === 'quoted') {
    return {
      title: '当前状态',
      value: '当前可正式报价',
      note: currentQuoteStatusLabel || '系统当前落在正式报价路径。',
      tone: 'emerald',
    }
  }

  if (currentDecisionStatus === 'estimated') {
    return {
      title: '当前状态',
      value: '当前仅参考报价',
      note: currentQuoteStatusLabel || '系统当前只保留参考报价。',
      tone: 'sky',
    }
  }

  if (currentDecisionStatus === 'handoff_required') {
    return {
      title: '当前状态',
      value: '当前需人工确认',
      note: currentQuoteStatusLabel || '系统当前要求人工继续处理。',
      tone: 'orange',
    }
  }

  return {
    title: '当前状态',
    value: '当前待补关键参数',
    note: '当前还不能稳定形成正式或参考报价。',
    tone: 'amber',
  }
}

function getScopeCard(
  isActiveScope: boolean,
  bucket: PricingTrialReleaseBucket | null,
  deliveryScopeLabel: string | null,
): TrialReviewObservationCard {
  if (!isActiveScope) {
    return {
      title: '试运行范围',
      value: '当前不在试运行范围内',
      note: deliveryScopeLabel || '该路径不属于当前试运行自动报价观察范围。',
      tone: 'slate',
    }
  }

  if (bucket === 'allowed_quoted_in_trial') {
    return {
      title: '试运行范围',
      value: '当前在试运行自动报价范围内',
      note: deliveryScopeLabel || '当前路径允许自动正式报价。',
      tone: 'emerald',
    }
  }

  return {
    title: '试运行范围',
    value: '当前不在试运行自动正式报价范围内',
    note: deliveryScopeLabel || '当前仍在 trial 观察范围，但只能参考报价或人工处理。',
    tone: 'amber',
  }
}

function getPathCard(
  currentDecisionStatus: ReturnType<typeof getCurrentDecisionStatus>,
  packagingSummary: PackagingReviewSummaryView | null,
): TrialReviewObservationCard {
  const bundleGateStatus = packagingSummary?.trialBundleGateStatus
  const trialGateStatus = packagingSummary?.trialGateStatus

  if (currentDecisionStatus === 'missing_fields') {
    return {
      title: '当前路径',
      value: '缺关键参数待补路径',
      note: '需先补齐关键参数，再决定正式报价、参考报价或转人工。',
      tone: 'amber',
    }
  }

  if (bundleGateStatus === 'standard_quoted_bundle_in_trial') {
    return {
      title: '当前路径',
      value: '组合正式报价路径',
      note: '当前组合已进入试运行允许正式报价的组合范围。',
      tone: 'emerald',
    }
  }

  if (bundleGateStatus === 'estimated_only_bundle_in_trial') {
    return {
      title: '当前路径',
      value: '组合参考报价路径',
      note: '当前组合仍只允许参考报价。',
      tone: 'sky',
    }
  }

  if (bundleGateStatus === 'handoff_only_bundle_in_trial') {
    return {
      title: '当前路径',
      value: '组合人工处理路径',
      note: '当前组合只允许人工兜底。',
      tone: 'orange',
    }
  }

  if (trialGateStatus === 'allowed_quoted_in_trial') {
    return {
      title: '当前路径',
      value: '单项正式报价路径',
      note: '当前单项路径在试运行口径内允许正式报价。',
      tone: 'emerald',
    }
  }

  if (trialGateStatus === 'estimated_only_in_trial') {
    return {
      title: '当前路径',
      value: '单项参考报价路径',
      note: '当前单项路径在试运行口径内只允许参考报价。',
      tone: 'sky',
    }
  }

  if (trialGateStatus === 'handoff_only_in_trial') {
    return {
      title: '当前路径',
      value: '单项人工处理路径',
      note: '当前单项路径在试运行口径内只允许人工兜底。',
      tone: 'orange',
    }
  }

  return {
    title: '当前路径',
    value: currentDecisionStatus === 'quoted' ? '正式报价路径' : currentDecisionStatus === 'estimated' ? '参考报价路径' : '人工处理路径',
    note: packagingSummary?.statusReasonText || '当前路径未带出更细粒度的 gate 信息。',
    tone: currentDecisionStatus === 'quoted' ? 'emerald' : currentDecisionStatus === 'estimated' ? 'sky' : 'orange',
  }
}

function getBundleCard(packagingSummary: PackagingReviewSummaryView | null): TrialReviewObservationCard {
  const isBundle = getScopeType(packagingSummary) === 'bundle'
  if (!isBundle) {
    return {
      title: '组合状态',
      value: '当前为单项报价',
      note: '当前没有主件加子项的组合报价。',
      tone: 'slate',
    }
  }

  if (packagingSummary?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial') {
    return {
      title: '组合状态',
      value: '当前组合已进入正式报价范围',
      note: '当前组合已进入试运行允许正式报价的组合范围。',
      tone: 'emerald',
    }
  }

  if (packagingSummary?.trialBundleGateStatus === 'estimated_only_bundle_in_trial') {
    return {
      title: '组合状态',
      value: '当前组合仅可参考报价',
      note: '当前组合仍只允许参考报价。',
      tone: 'sky',
    }
  }

  if (packagingSummary?.trialBundleGateStatus === 'handoff_only_bundle_in_trial') {
    return {
      title: '组合状态',
      value: '当前组合需人工处理',
      note: '当前组合需要人工确认后再继续。',
      tone: 'orange',
    }
  }

  return {
    title: '组合状态',
    value: '当前组合尚未进入正式报价范围',
    note: '当前组合没有命中试运行允许正式报价的组合范围。',
    tone: 'amber',
  }
}

function deriveGuardrails(input: {
  packagingSummary: PackagingReviewSummaryView | null
  primaryReason: string
  secondaryReasons: string[]
  requiresHumanReview: boolean
}): string[] {
  const haystack = [input.primaryReason, ...input.secondaryReasons].join('；').toLowerCase()
  const guardrails: string[] = []

  if ((input.packagingSummary?.missingDetails.length || 0) > 0) {
    guardrails.push('缺关键参数')
  }

  if ((input.packagingSummary?.referenceFiles.length || 0) > 0 || haystack.includes('参考文件') || haystack.includes('刀版') || haystack.includes('文件')) {
    guardrails.push('命中文件驱动路径')
  }

  if (haystack.includes('proxy') || haystack.includes('默认克重')) {
    guardrails.push('命中保守代理口径')
  }

  if (haystack.includes('generic')) {
    guardrails.push('命中高频通用路径')
  }

  if (haystack.includes('no-film') || haystack.includes('不贴胶片') || haystack.includes('无胶片')) {
    guardrails.push('命中无胶片边界')
  }

  if (haystack.includes('custom') || haystack.includes('定制') || haystack.includes('复杂') || haystack.includes('高复杂')) {
    guardrails.push('命中高复杂结构路径')
  }

  if (input.requiresHumanReview || input.packagingSummary?.requiresHumanReview) {
    guardrails.push('已触发人工复核信号')
  }

  return dedupeTextList(guardrails)
}

function buildLineItemRows(packagingSummary: PackagingReviewSummaryView | null): TrialReviewObservationLineItem[] {
  if (!packagingSummary) {
    return []
  }

  return packagingSummary.lineItems.map((item, index) => {
    const reviewNote = dedupeTextList([
      ...(item.reviewReasons || []).map((reason) => reason.message),
      ...(item.reviewFlags || []),
    ])[0] || null
    const roleLabel: TrialReviewObservationLineItem['roleLabel'] = packagingSummary.mainItem && item.title === packagingSummary.mainItem.title
      ? '主件'
      : index > 0 || packagingSummary.subItems.some((subItem) => subItem.title === item.title)
        ? '子项'
        : '单项'

    return {
      roleLabel,
      title: item.title,
      spec: item.normalizedSpecSummary,
      subtotalLabel: formatMoney(item.lineTotal),
      reviewNote,
      isBlocking: Boolean(item.requiresHumanReview || reviewNote),
    }
  })
}

function buildBlockerComponents(packagingSummary: PackagingReviewSummaryView | null): string[] {
  if (!packagingSummary) {
    return []
  }

  const lineItemBlockers = packagingSummary.lineItems.flatMap((item) => {
    const firstReason = dedupeTextList([
      ...(item.reviewReasons || []).map((reason) => reason.message),
      ...(item.reviewFlags || []),
    ])[0]

    if (!item.requiresHumanReview && !firstReason) {
      return []
    }

    return [`${item.title}${firstReason ? `：${firstReason}` : '：当前组件触发人工复核信号'}`]
  })

  const missingDetailBlockers = (packagingSummary.missingDetails || []).map((detail) => `${detail.itemLabel}：缺少 ${detail.fieldsText}`)

  const blockers = dedupeTextList([...lineItemBlockers, ...missingDetailBlockers])
  if (blockers.length > 0) {
    return blockers
  }

  if (packagingSummary.trialBundleGateStatus === 'estimated_only_bundle_in_trial') {
    return ['当前组合未进入试运行正式报价组合范围，整体只保留参考报价。']
  }

  if (packagingSummary.trialBundleGateStatus === 'handoff_only_bundle_in_trial') {
    return ['当前组合未进入试运行正式报价组合范围，整体必须人工处理。']
  }

  return []
}

function buildPricingFacts(packagingSummary: PackagingReviewSummaryView | null): Array<{ label: string; value: string }> {
  if (!packagingSummary) {
    return []
  }

  return [
    { label: '组件小计', value: formatMoney(packagingSummary.subtotal) || '暂无' },
    { label: '报价金额', value: formatMoney(packagingSummary.quotedAmount) || '暂无' },
    { label: '运费', value: formatMoney(packagingSummary.shippingFee) || '暂无' },
    { label: '最终报价', value: formatMoney(packagingSummary.finalPrice) || '暂无' },
  ]
}

function buildFeedbackSection(input: TrialReviewObservationInput) {
  const latestReflection = [...(input.reflections || [])]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
  const businessFeedback = extractReflectionBusinessFeedback(asRecord(latestReflection?.correctedParams))
  const businessFeedbackSummary = buildReflectionBusinessFeedbackSummary(businessFeedback)
  const hasManualCorrection = Boolean(
    latestReflection?.correctedQuoteSummary
    || latestReflection?.correctedParams
    || input.manualConfirmedAt
    || input.operatorName
    || input.lastActionNote
  )

  const facts = [
    { label: 'Reflection 记录', value: input.reflections.length > 0 ? `已有 ${input.reflections.length} 条` : '暂无' },
    {
      label: '最新 Reflection',
      value: latestReflection
        ? `${getReflectionIssueTypeLabel(latestReflection.issueType)} / ${getReflectionRecordStatusLabel(latestReflection.status)}`
        : '暂无',
    },
    { label: '人为修正', value: hasManualCorrection ? '已有人工修正或确认' : '暂无' },
    { label: '业务反馈', value: businessFeedbackSummary || '暂无' },
    { label: '当前复核状态', value: input.reviewStatusLabel || '待复核' },
  ]

  if (input.operatorName) {
    facts.push({ label: '当前处理人', value: input.operatorName })
  }

  if (input.manualConfirmedAt) {
    facts.push({ label: '人工确认时间', value: formatDate(input.manualConfirmedAt) || input.manualConfirmedAt })
  }

  if (input.lastActionNote) {
    facts.push({ label: '最近处理备注', value: input.lastActionNote })
  }

  if (input.manualConfirmationResult) {
    facts.push({ label: '人工确认结论', value: getTrialReviewManualConfirmationResultLabel(input.manualConfirmationResult) })
  }

  if (input.rejectionReason) {
    facts.push({ label: '打回原因', value: input.rejectionReason })
  }

  if (input.rejectionCategory) {
    facts.push({ label: '打回分类', value: getTrialReviewRejectionCategoryLabel(input.rejectionCategory) })
  }

  if (input.rejectionTargetArea) {
    facts.push({ label: '打回目标区段', value: getTrialReviewTargetAreaLabel(input.rejectionTargetArea) })
  }

  if (input.calibrationSignal) {
    facts.push({ label: 'Calibration 信号', value: getTrialReviewCalibrationSignalLabel(input.calibrationSignal) })
  }

  if (input.driftSourceCandidate) {
    facts.push({ label: '疑似漂移源', value: input.driftSourceCandidate })
  }

  if (input.driftDirection) {
    facts.push({ label: '同向漂移方向', value: getTrialReviewDriftDirectionLabel(input.driftDirection) })
  }

  if (input.contextSnapshot) {
    const currentPathLabel = typeof input.contextSnapshot.currentPathLabel === 'string' ? input.contextSnapshot.currentPathLabel : null
    const bundleTypeLabel = typeof input.contextSnapshot.bundleTypeLabel === 'string' ? input.contextSnapshot.bundleTypeLabel : null
    const deliveryScopeLabel = typeof input.contextSnapshot.deliveryScopeLabel === 'string' ? input.contextSnapshot.deliveryScopeLabel : null

    if (currentPathLabel) {
      facts.push({ label: '当前主路径', value: currentPathLabel })
    }

    if (bundleTypeLabel) {
      facts.push({ label: '组合类型', value: bundleTypeLabel })
    }

    if (deliveryScopeLabel) {
      facts.push({ label: '试运行口径', value: deliveryScopeLabel })
    }
  }

  return {
    summary: input.reflections.length > 0 || businessFeedbackSummary || hasManualCorrection
      ? '当前会话已有复核或反馈留痕，可结合人工结论继续判断。'
      : '当前还没有 reflection、业务反馈或人工修正留痕。',
    facts,
  }
}

function buildConsistencySection(packagingSummary: PackagingReviewSummaryView | null) {
  const bucket = getReleaseBucket(packagingSummary)
  const scopeType = getScopeType(packagingSummary)
  const matchingEntries = PRICING_TRIAL_RELEASE_ENTRIES.filter((entry) => entry.bucket === bucket && entry.scopeType === scopeType)
  const gateIds = Array.from(new Set(matchingEntries.flatMap((entry) => entry.acceptanceGateIds)))
  const acceptanceMap = new Map(getAcceptanceGateEntries().map((entry) => [entry.gate_id, entry]))
  const relevantAcceptanceGates = gateIds
    .map((gateId) => acceptanceMap.get(gateId))
    .filter(Boolean) as PricingAcceptanceGateEntry[]

  if (!bucket) {
    return {
      bucketLabel: '未识别试运行口径',
      acceptanceSummary: '当前没有足够的试运行口径信息，面板不额外推断。',
      note: '该面板只解释现有运行口径和验收口径，不在页面重新计算路径。',
      acceptanceAligned: null,
    }
  }

  if (relevantAcceptanceGates.length === 0) {
    return {
      bucketLabel: getBucketLabel(bucket),
      acceptanceSummary: '当前试运行口径暂无直接验收样本可对照。',
      note: '面板直接复用当前运行口径，不额外再造一套新规则。',
      acceptanceAligned: null,
    }
  }

  const acceptanceAligned = relevantAcceptanceGates.every((entry) => entry.acceptance_status === 'accepted')
  return {
    bucketLabel: getBucketLabel(bucket),
    acceptanceSummary: acceptanceAligned
      ? `对应 ${relevantAcceptanceGates.length} 个验收口径当前保持通过。`
      : `对应 ${relevantAcceptanceGates.length} 个验收口径中仍有未通过项，需要继续观察。`,
    note: scopeType === 'bundle'
      ? '当前组合是否可正式报价，直接复用运行中的组合放行口径；正式报价组合仍受验收口径约束。'
      : '当前单项是否可正式报价，直接复用运行中的放行口径；页面只做中文解释，不额外重算路径。',
    acceptanceAligned,
  }
}

export function buildTrialReviewObservation(input: TrialReviewObservationInput): TrialReviewObservation {
  const currentDecisionStatus = getCurrentDecisionStatus(input.packagingSummary, input.currentQuoteStatusLabel)
  const primaryReason = normalizeText(input.packagingSummary?.statusReasonText)
    || normalizeText(input.deliveryScopeNote)
    || normalizeText(input.queueReason)
    || normalizeText(input.recommendedAction)
    || '当前未提供更细的试运行原因说明。'
  const secondaryReasons = dedupeTextList([
    input.deliveryScopeNote,
    input.queueReason,
    input.recommendedAction,
    ...(input.packagingSummary?.reviewReasons || []).map((reason) => reason.message),
    ...(input.packagingSummary?.missingDetails || []).map((detail) => `${detail.itemLabel} 缺少 ${detail.fieldsText}`),
  ]).filter((item) => item !== primaryReason)
  const lineItems = buildLineItemRows(input.packagingSummary)
  const blockerComponents = buildBlockerComponents(input.packagingSummary)

  return {
    overviewCards: [
      getOutcomeCard(currentDecisionStatus, input.currentQuoteStatusLabel),
      getScopeCard(input.isActiveScope, getReleaseBucket(input.packagingSummary), input.deliveryScopeLabel),
      getPathCard(currentDecisionStatus, input.packagingSummary),
      getBundleCard(input.packagingSummary),
    ],
    reasonSection: {
      title: '判定原因',
      primaryReason,
      secondaryReasons,
      guardrails: deriveGuardrails({
        packagingSummary: input.packagingSummary,
        primaryReason,
        secondaryReasons,
        requiresHumanReview: input.requiresHumanReview,
      }),
    },
    componentSection: {
      summary: getScopeType(input.packagingSummary) === 'bundle'
        ? '当前按 bundle 视图展示主件、子项与关键阻塞组件。'
        : '当前按单项视图展示规格、金额与阻塞信息。',
      mainItemTitle: input.packagingSummary?.mainItem?.title || input.packagingSummary?.lineItems[0]?.title || null,
      subItemTitles: (input.packagingSummary?.subItems || []).map((item) => item.title),
      blockerComponents,
      pricingFacts: buildPricingFacts(input.packagingSummary),
      lineItems,
    },
    feedbackSection: buildFeedbackSection(input),
    consistencySection: buildConsistencySection(input.packagingSummary),
  }
}

export function buildTrialReviewObservationFromConversation(input: {
  conversation: TrialReviewConversationLike
  isActiveScope: boolean
  currentQuoteStatusLabel: string | null
  deliveryScopeLabel: string | null
  deliveryScopeNote: string | null
  queueReason: string | null
  recommendedAction: string | null
  requiresHumanReview: boolean
  reviewStatusLabel: string | null
  operatorName: string | null
  lastActionNote: string | null
  manualConfirmationResult: string | null
  rejectionReason: string | null
  rejectionCategory: string | null
  rejectionTargetArea: string | null
  calibrationSignal: string | null
  driftSourceCandidate: string | null
  driftDirection: string | null
  contextSnapshot: Record<string, any> | null
  manualConfirmedAt: string | null
}): TrialReviewObservation {
  const packagingSummary = resolveLatestPackagingSummary(input.conversation)

  return buildTrialReviewObservation({
    isActiveScope: input.isActiveScope,
    packagingSummary,
    currentQuoteStatusLabel: input.currentQuoteStatusLabel,
    deliveryScopeLabel: input.deliveryScopeLabel,
    deliveryScopeNote: input.deliveryScopeNote,
    queueReason: input.queueReason,
    recommendedAction: input.recommendedAction,
    requiresHumanReview: input.requiresHumanReview,
    reflections: input.conversation.reflections || [],
    reviewStatusLabel: input.reviewStatusLabel,
    operatorName: input.operatorName,
    lastActionNote: input.lastActionNote,
    manualConfirmationResult: input.manualConfirmationResult,
    rejectionReason: input.rejectionReason,
    rejectionCategory: input.rejectionCategory,
    rejectionTargetArea: input.rejectionTargetArea,
    calibrationSignal: input.calibrationSignal,
    driftSourceCandidate: input.driftSourceCandidate,
    driftDirection: input.driftDirection,
    contextSnapshot: input.contextSnapshot,
    manualConfirmedAt: input.manualConfirmedAt,
  })
}

export function getTrialReviewBucketFromGate(input: {
  trialGateStatus?: PricingTrialGateStatus
  trialBundleGateStatus?: PricingTrialBundleGateStatus
}): PricingTrialReleaseBucket | null {
  return getReleaseBucket(input as PackagingReviewSummaryView)
}