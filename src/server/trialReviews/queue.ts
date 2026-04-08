import {
  TrialReviewActionType,
  TrialReviewSourceKind,
  TrialReviewStatus,
} from '@prisma/client'
import {
  buildConversationPresentation,
  getTrialReviewCalibrationSignalLabel,
  getTrialReviewDriftDirectionLabel,
  getConversationStatusLabel,
  getTrialReviewActionLabel,
  getTrialReviewSourceKindLabel,
  getTrialReviewStatusTransitionLabel,
  getTrialReviewStatusLabel,
} from '@/lib/admin/presentation'
import {
  getTrialEnvGovernanceSummary,
  type TrialEnvGovernanceSummary,
} from '@/server/config/env'
import {
  getLatestExportableQuoteSnapshot,
  type ConversationExportSource,
} from '@/server/export/quoteExcel'
import {
  buildTrialReviewObservationFromConversation,
  type TrialReviewObservation,
} from '@/server/trialReviews/observation'
import {
  buildQuotedFeedbackContextSnapshot,
  type TrialReviewQuickEntryContextSnapshot,
} from '@/lib/trialReviews/quotedFeedbackQuickEntry'
import {
  buildWeeklyTrialDriftReview,
  type WeeklyTrialDriftReview,
} from '@/server/trialReviews/weeklyDriftReview'
import { prisma } from '@/server/db/prisma'

type TrialReviewConversation = Awaited<ReturnType<typeof listReviewConversations>>[number]
type TrialReviewCaseRecord = Awaited<ReturnType<typeof listPersistedReviewCases>>[number]

export type TrialReviewQueueFilters = {
  status?: TrialReviewStatus | 'ALL'
  sourceKind?: TrialReviewSourceKind | 'ALL'
}

export type TrialReviewAuditLogView = {
  id: number
  fromStatus: TrialReviewStatus | null
  fromStatusLabel: string | null
  toStatus: TrialReviewStatus
  toStatusLabel: string
  actionType: TrialReviewActionType
  actionLabel: string
  transitionLabel: string
  operatorName: string | null
  note: string | null
  createdAt: string
}

export type TrialReviewQueueItem = {
  reviewCaseId: number | null
  conversationId: number
  quoteId: number | null
  title: string
  topicSummary: string
  conversationStatus: string
  conversationStatusLabel: string
  reviewStatus: TrialReviewStatus
  reviewStatusLabel: string
  sourceKind: TrialReviewSourceKind
  sourceKindLabel: string
  currentQuoteStatusLabel: string | null
  deliveryScopeLabel: string | null
  deliveryScopeNote: string | null
  queueReason: string
  queueReasonCode: string | null
  recommendedAction: string
  requiresHumanReview: boolean
  hasFreshSignal: boolean
  operatorName: string | null
  lastActionNote: string | null
  manualConfirmationResult: string | null
  rejectionReason: string | null
  rejectionCategory: string | null
  rejectionTargetArea: string | null
  calibrationSignal: string | null
  driftSourceCandidate: string | null
  driftDirection: string | null
  contextSnapshot: TrialReviewQuickEntryContextSnapshot | null
  manualConfirmedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  latestAudit: TrialReviewAuditLogView | null
  auditLogs: TrialReviewAuditLogView[]
  observation: TrialReviewObservation
}

export type TrialReviewCalibrationReopenSummary = {
  threshold: number
  totalQuotedFeedbackCount: number
  consecutiveSameSourceDirectionCount: number
  driftSourceCandidate: string | null
  driftDirection: string | null
  driftDirectionLabel: string | null
  calibrationSignal: string | null
  calibrationSignalLabel: string | null
  triggered: boolean
  summary: string
}

export type TrialReviewQueueResponse = {
  records: TrialReviewQueueItem[]
  summary: {
    total: number
    pendingCount: number
    statusBreakdown: Array<{ status: TrialReviewStatus; label: string; count: number }>
    sourceBreakdown: Array<{ sourceKind: TrialReviewSourceKind; label: string; count: number }>
  }
  calibrationReopen: TrialReviewCalibrationReopenSummary
  weeklyDriftReview: WeeklyTrialDriftReview
  envGovernance: TrialEnvGovernanceSummary
}

const CALIBRATION_REOPEN_THRESHOLD = 10

type DerivedTrialReviewCandidate = {
  conversationId: number
  quoteId: number | null
  title: string
  topicSummary: string
  conversationStatus: string
  conversationStatusLabel: string
  sourceKind: TrialReviewSourceKind
  sourceFingerprint: string
  currentQuoteStatusLabel: string | null
  deliveryScopeLabel: string | null
  deliveryScopeNote: string | null
  queueReason: string
  queueReasonCode: string | null
  recommendedAction: string
  requiresHumanReview: boolean
  createdAt: string
  updatedAt: string
}

function normalizeDate(value: Date | string | null | undefined): string {
  if (!value) {
    return new Date(0).toISOString()
  }

  const nextValue = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(nextValue.getTime())) {
    return new Date(0).toISOString()
  }

  return nextValue.toISOString()
}

function normalizeNullableDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return normalizeDate(value)
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeContextSnapshot(value: unknown): TrialReviewQuickEntryContextSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  return {
    feedbackType: 'quoted_rejection',
    conversationId: Number(record.conversationId || 0),
    quoteId: typeof record.quoteId === 'number' ? record.quoteId : Number(record.quoteId || 0) || null,
    currentPathLabel: typeof record.currentPathLabel === 'string' ? record.currentPathLabel : '当前报价路径',
    bundleTypeLabel: typeof record.bundleTypeLabel === 'string' ? record.bundleTypeLabel : '单项',
    currentQuoteStatusLabel: typeof record.currentQuoteStatusLabel === 'string' ? record.currentQuoteStatusLabel : '正式报价',
    deliveryScopeLabel: typeof record.deliveryScopeLabel === 'string' ? record.deliveryScopeLabel : '未知交付口径',
    isActiveScope: Boolean(record.isActiveScope),
    mainItemTitle: typeof record.mainItemTitle === 'string' ? record.mainItemTitle : null,
    subItemTitles: Array.isArray(record.subItemTitles)
      ? record.subItemTitles.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function inferManualConfirmationResult(input: {
  explicitResult?: string | null
  status: TrialReviewStatus
  sourceKind: TrialReviewSourceKind
  currentQuoteStatusLabel: string | null
  rejectionReason: string | null
}): string | null {
  const explicitResult = normalizeOptionalText(input.explicitResult)
  if (explicitResult) {
    return explicitResult
  }

  if (input.rejectionReason && input.sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK) {
    return 'REJECTED_QUOTED_RESULT'
  }

  switch (input.status) {
    case TrialReviewStatus.MANUAL_CONFIRMED:
      return input.currentQuoteStatusLabel === '正式报价' ? 'CONFIRMED_AS_QUOTED' : 'CONFIRMED_AS_ESTIMATE'
    case TrialReviewStatus.RETURNED_AS_ESTIMATE:
      return 'CONFIRMED_AS_ESTIMATE'
    case TrialReviewStatus.HANDOFF_TO_HUMAN:
      return 'HANDOFF_REQUIRED'
    case TrialReviewStatus.CLOSED:
      return input.sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK ? 'REJECTED_QUOTED_RESULT' : 'CLOSED_AFTER_REVIEW'
    default:
      return null
  }
}

function inferDriftDirection(explicitDirection?: string | null, calibrationSignal?: string | null): string | null {
  const normalizedDirection = normalizeOptionalText(explicitDirection)
  if (normalizedDirection) {
    return normalizedDirection
  }

  if (calibrationSignal === 'QUOTE_TOO_HIGH') {
    return 'HIGH'
  }

  if (calibrationSignal === 'QUOTE_TOO_LOW') {
    return 'LOW'
  }

  return null
}

function buildCalibrationReopenSummary(persistedCases: TrialReviewCaseRecord[]): TrialReviewCalibrationReopenSummary {
  const quotedFeedbackCases = persistedCases
    .filter((item) => item.sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime()
      const rightTime = new Date(right.createdAt).getTime()
      if (leftTime !== rightTime) {
        return leftTime - rightTime
      }

      return left.id - right.id
    })

  let consecutiveSameSourceDirectionCount = 0
  let driftSourceCandidate: string | null = null
  let driftDirection: string | null = null
  let calibrationSignal: string | null = null

  for (const item of quotedFeedbackCases) {
    const nextSourceCandidate = normalizeOptionalText(item.driftSourceCandidate)
      || normalizeOptionalText(item.rejectionTargetArea)
    const nextDriftDirection = inferDriftDirection(item.driftDirection, item.calibrationSignal)
    const nextCalibrationSignal = normalizeOptionalText(item.calibrationSignal)

    if (!nextSourceCandidate || !nextDriftDirection || !nextCalibrationSignal) {
      consecutiveSameSourceDirectionCount = 0
      driftSourceCandidate = null
      driftDirection = null
      calibrationSignal = null
      continue
    }

    if (nextSourceCandidate === driftSourceCandidate && nextDriftDirection === driftDirection) {
      consecutiveSameSourceDirectionCount += 1
    } else {
      consecutiveSameSourceDirectionCount = 1
      driftSourceCandidate = nextSourceCandidate
      driftDirection = nextDriftDirection
    }

    calibrationSignal = nextCalibrationSignal
  }

  const triggered = consecutiveSameSourceDirectionCount >= CALIBRATION_REOPEN_THRESHOLD
  const driftDirectionLabel = driftDirection ? getTrialReviewDriftDirectionLabel(driftDirection) : null
  const calibrationSignalLabel = calibrationSignal ? getTrialReviewCalibrationSignalLabel(calibrationSignal) : null

  return {
    threshold: CALIBRATION_REOPEN_THRESHOLD,
    totalQuotedFeedbackCount: quotedFeedbackCases.length,
    consecutiveSameSourceDirectionCount,
    driftSourceCandidate,
    driftDirection,
    driftDirectionLabel,
    calibrationSignal,
    calibrationSignalLabel,
    triggered,
    summary: triggered
      ? `已累计 ${consecutiveSameSourceDirectionCount} 单正式报价反馈，且同一漂移源 ${driftSourceCandidate} 持续 ${driftDirectionLabel || driftDirection}，满足重开 calibration 条件。`
      : driftSourceCandidate && driftDirectionLabel
        ? `当前连续 ${consecutiveSameSourceDirectionCount} 单正式报价反馈指向 ${driftSourceCandidate} ${driftDirectionLabel}，尚未达到 ${CALIBRATION_REOPEN_THRESHOLD} 单重开阈值。`
        : `当前已记录 ${quotedFeedbackCases.length} 条正式报价反馈，但还没有形成可重开 calibration 的连续同源同向证据。`,
  }
}

async function listReviewConversations() {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
      },
      handoffs: {
        orderBy: { createdAt: 'desc' },
      },
      reflections: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

async function listPersistedReviewCases() {
  return prisma.trialReviewCase.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      auditLogs: {
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      },
    },
  })
}

function buildReviewPresentation(conversation: TrialReviewConversation) {
  return buildConversationPresentation({
    conversationId: conversation.id,
    status: conversation.status,
    latestMessage: conversation.messages?.slice(-1)[0]?.content || null,
    recentMessages: (conversation.messages || []).slice(-4).map((message) => ({
      sender: message.sender,
      content: message.content,
      metadata: message.metadata,
    })),
    latestQuoteParameters: (conversation.quotes?.[0]?.parameters as Record<string, any> | null | undefined) || null,
  })
}

function buildHumanFollowupFingerprint(conversation: TrialReviewConversation, handoffId?: number | null) {
  const latestHandoff = conversation.handoffs.find((item) => !item.resolved) || conversation.handoffs[0]

  return [
    'handoff',
    handoffId || latestHandoff?.id || 'pending',
    normalizeDate(latestHandoff?.createdAt || conversation.updatedAt),
  ].join(':')
}

function buildSnapshotFingerprint(sourceKind: TrialReviewSourceKind, conversation: ConversationExportSource) {
  const snapshot = getLatestExportableQuoteSnapshot(conversation)
  if (!snapshot) {
    return `${sourceKind}:no-snapshot:${conversation.id}`
  }

  return [
    sourceKind,
    snapshot.sourceType,
    snapshot.quoteRecordId || 'message',
    snapshot.quotedAt.toISOString(),
    snapshot.finalPrice.toFixed(2),
    snapshot.quoteStatusLabel,
  ].join(':')
}

function deriveTrialReviewCandidate(conversation: TrialReviewConversation): DerivedTrialReviewCandidate | null {
  const presentation = buildReviewPresentation(conversation)
  if (!presentation.isActiveScope) {
    return null
  }

  const latestSnapshot = getLatestExportableQuoteSnapshot(conversation)
  const latestOpenHandoff = conversation.handoffs.find((item) => !item.resolved) || null
  const createdAt = normalizeDate(conversation.createdAt)
  const updatedAt = normalizeDate(conversation.updatedAt)
  const baseCandidate = {
    conversationId: conversation.id,
    title: presentation.title,
    topicSummary: presentation.topicSummary,
    conversationStatus: conversation.status,
    conversationStatusLabel: getConversationStatusLabel(conversation.status),
    createdAt,
    updatedAt,
  }

  if (latestOpenHandoff || conversation.status === 'PENDING_HUMAN') {
    return {
      ...baseCandidate,
      quoteId: latestSnapshot?.quoteRecordId ?? conversation.quotes?.[0]?.id ?? null,
      sourceKind: TrialReviewSourceKind.HUMAN_FOLLOWUP,
      sourceFingerprint: buildHumanFollowupFingerprint(conversation, latestOpenHandoff?.id),
      currentQuoteStatusLabel: latestSnapshot?.quoteStatusLabel ?? null,
      deliveryScopeLabel: latestSnapshot?.deliveryScopeLabel ?? '人工跟进中',
      deliveryScopeNote: latestSnapshot?.deliveryScopeNote ?? null,
      queueReason: latestOpenHandoff?.reason || latestSnapshot?.deliveryScopeNote || '当前会话已进入人工跟进，请人工处理后再补充结果。',
      queueReasonCode: latestOpenHandoff ? 'handoff_record_open' : 'conversation_pending_human',
      recommendedAction: '补充处理结论后关闭当前复核项。',
      requiresHumanReview: true,
    }
  }

  if (!latestSnapshot) {
    return null
  }

  if (latestSnapshot.documentKind === 'manual_review') {
    return {
      ...baseCandidate,
      quoteId: latestSnapshot.quoteRecordId ?? null,
      sourceKind: TrialReviewSourceKind.MANUAL_REVIEW,
      sourceFingerprint: buildSnapshotFingerprint(TrialReviewSourceKind.MANUAL_REVIEW, conversation),
      currentQuoteStatusLabel: latestSnapshot.quoteStatusLabel,
      deliveryScopeLabel: latestSnapshot.deliveryScopeLabel,
      deliveryScopeNote: latestSnapshot.deliveryScopeNote,
      queueReason: latestSnapshot.deliveryScopeNote,
      queueReasonCode: 'manual_review_only',
      recommendedAction: '当前路径不应继续自动交付，请直接转人工处理。',
      requiresHumanReview: true,
    }
  }

  if (latestSnapshot.documentKind === 'reference_quote') {
    return {
      ...baseCandidate,
      quoteId: latestSnapshot.quoteRecordId ?? null,
      sourceKind: TrialReviewSourceKind.REFERENCE_QUOTE,
      sourceFingerprint: buildSnapshotFingerprint(TrialReviewSourceKind.REFERENCE_QUOTE, conversation),
      currentQuoteStatusLabel: latestSnapshot.quoteStatusLabel,
      deliveryScopeLabel: latestSnapshot.deliveryScopeLabel,
      deliveryScopeNote: latestSnapshot.deliveryScopeNote,
      queueReason: latestSnapshot.deliveryScopeNote,
      queueReasonCode: 'reference_quote_confirmation',
      recommendedAction: '请确认保留参考报价，或改为人工继续处理。',
      requiresHumanReview: Boolean(latestSnapshot.requiresHumanReview),
    }
  }

  return null
}

function serializeAuditLog(log: TrialReviewCaseRecord['auditLogs'][number]): TrialReviewAuditLogView {
  return {
    id: log.id,
    fromStatus: log.fromStatus,
    fromStatusLabel: log.fromStatus ? getTrialReviewStatusLabel(log.fromStatus) : null,
    toStatus: log.toStatus,
    toStatusLabel: getTrialReviewStatusLabel(log.toStatus),
    actionType: log.actionType,
    actionLabel: getTrialReviewActionLabel(log.actionType),
    transitionLabel: getTrialReviewStatusTransitionLabel(log.fromStatus, log.toStatus),
    operatorName: normalizeOptionalText(log.operatorName),
    note: normalizeOptionalText(log.note),
    createdAt: normalizeDate(log.createdAt),
  }
}

function getFallbackRecommendedAction(sourceKind: TrialReviewSourceKind): string {
  if (sourceKind === TrialReviewSourceKind.MANUAL_REVIEW) {
    return '当前路径应由人工直接处理。'
  }

  if (sourceKind === TrialReviewSourceKind.HUMAN_FOLLOWUP) {
    return '人工处理完成后请更新结论并关闭。'
  }

  if (sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK) {
    return '请补齐打回原因、目标区段、calibration signal 与漂移源；只有连续同源同向 10 单后才重开 calibration。'
  }

  return '请人工确认是否保留参考报价。'
}

function buildQueueItemFromCandidate(
  candidate: DerivedTrialReviewCandidate,
  conversation?: TrialReviewConversation,
  persistedCase?: TrialReviewCaseRecord,
): TrialReviewQueueItem {
  const hasFreshSignal = Boolean(
    persistedCase
    && persistedCase.sourceFingerprint !== candidate.sourceFingerprint
  )
  const reviewStatus = persistedCase && !hasFreshSignal
    ? persistedCase.status
    : TrialReviewStatus.PENDING_REVIEW
  const auditLogs = persistedCase ? persistedCase.auditLogs.map(serializeAuditLog) : []

  return {
    observation: buildTrialReviewObservationFromConversation({
      conversation: conversation || { reflections: [] },
      isActiveScope: true,
      currentQuoteStatusLabel: candidate.currentQuoteStatusLabel,
      deliveryScopeLabel: candidate.deliveryScopeLabel,
      deliveryScopeNote: candidate.deliveryScopeNote,
      queueReason: candidate.queueReason,
      recommendedAction: candidate.recommendedAction,
      requiresHumanReview: candidate.requiresHumanReview,
      reviewStatusLabel: getTrialReviewStatusLabel(reviewStatus),
      operatorName: normalizeOptionalText(persistedCase?.operatorName),
      lastActionNote: normalizeOptionalText(persistedCase?.lastActionNote),
      manualConfirmationResult: normalizeOptionalText(persistedCase?.manualConfirmationResult),
      rejectionReason: normalizeOptionalText(persistedCase?.rejectionReason),
      rejectionCategory: normalizeOptionalText((persistedCase as { rejectionCategory?: string | null })?.rejectionCategory),
      rejectionTargetArea: normalizeOptionalText(persistedCase?.rejectionTargetArea),
      calibrationSignal: normalizeOptionalText(persistedCase?.calibrationSignal),
      driftSourceCandidate: normalizeOptionalText(persistedCase?.driftSourceCandidate),
      driftDirection: normalizeOptionalText(persistedCase?.driftDirection),
      contextSnapshot: normalizeContextSnapshot((persistedCase as { contextSnapshot?: unknown })?.contextSnapshot),
      manualConfirmedAt: normalizeNullableDate(persistedCase?.manualConfirmedAt),
    }),
    reviewCaseId: persistedCase?.id ?? null,
    conversationId: candidate.conversationId,
    quoteId: candidate.quoteId,
    title: candidate.title,
    topicSummary: candidate.topicSummary,
    conversationStatus: candidate.conversationStatus,
    conversationStatusLabel: candidate.conversationStatusLabel,
    reviewStatus,
    reviewStatusLabel: getTrialReviewStatusLabel(reviewStatus),
    sourceKind: candidate.sourceKind,
    sourceKindLabel: getTrialReviewSourceKindLabel(candidate.sourceKind),
    currentQuoteStatusLabel: candidate.currentQuoteStatusLabel,
    deliveryScopeLabel: candidate.deliveryScopeLabel,
    deliveryScopeNote: candidate.deliveryScopeNote,
    queueReason: candidate.queueReason,
    queueReasonCode: candidate.queueReasonCode,
    recommendedAction: candidate.recommendedAction,
    requiresHumanReview: candidate.requiresHumanReview,
    hasFreshSignal,
    operatorName: normalizeOptionalText(persistedCase?.operatorName),
    lastActionNote: normalizeOptionalText(persistedCase?.lastActionNote),
    manualConfirmationResult: normalizeOptionalText(persistedCase?.manualConfirmationResult),
    rejectionReason: normalizeOptionalText(persistedCase?.rejectionReason),
    rejectionCategory: normalizeOptionalText((persistedCase as { rejectionCategory?: string | null })?.rejectionCategory),
    rejectionTargetArea: normalizeOptionalText(persistedCase?.rejectionTargetArea),
    calibrationSignal: normalizeOptionalText(persistedCase?.calibrationSignal),
    driftSourceCandidate: normalizeOptionalText(persistedCase?.driftSourceCandidate),
    driftDirection: normalizeOptionalText(persistedCase?.driftDirection),
    contextSnapshot: normalizeContextSnapshot((persistedCase as { contextSnapshot?: unknown })?.contextSnapshot),
    manualConfirmedAt: normalizeNullableDate(persistedCase?.manualConfirmedAt),
    closedAt: normalizeNullableDate(persistedCase?.closedAt),
    createdAt: persistedCase ? normalizeDate(persistedCase.createdAt) : candidate.createdAt,
    updatedAt: persistedCase ? normalizeDate(persistedCase.updatedAt) : candidate.updatedAt,
    latestAudit: auditLogs[0] || null,
    auditLogs,
  }
}

function buildQueueItemFromPersistedCase(
  persistedCase: TrialReviewCaseRecord,
  conversation?: TrialReviewConversation,
): TrialReviewQueueItem {
  const presentation = conversation ? buildReviewPresentation(conversation) : null
  const auditLogs = persistedCase.auditLogs.map(serializeAuditLog)

  return {
    observation: buildTrialReviewObservationFromConversation({
      conversation: conversation || { reflections: [] },
      isActiveScope: Boolean(presentation?.isActiveScope),
      currentQuoteStatusLabel: normalizeOptionalText(persistedCase.currentQuoteStatusLabel),
      deliveryScopeLabel: normalizeOptionalText(persistedCase.deliveryScopeLabel),
      deliveryScopeNote: normalizeOptionalText(persistedCase.deliveryScopeNote),
      queueReason: persistedCase.queueReason,
      recommendedAction: getFallbackRecommendedAction(persistedCase.sourceKind),
      requiresHumanReview: persistedCase.requiresHumanReview,
      reviewStatusLabel: getTrialReviewStatusLabel(persistedCase.status),
      operatorName: normalizeOptionalText(persistedCase.operatorName),
      lastActionNote: normalizeOptionalText(persistedCase.lastActionNote),
      manualConfirmationResult: normalizeOptionalText(persistedCase.manualConfirmationResult),
      rejectionReason: normalizeOptionalText(persistedCase.rejectionReason),
      rejectionCategory: normalizeOptionalText((persistedCase as { rejectionCategory?: string | null })?.rejectionCategory),
      rejectionTargetArea: normalizeOptionalText(persistedCase.rejectionTargetArea),
      calibrationSignal: normalizeOptionalText(persistedCase.calibrationSignal),
      driftSourceCandidate: normalizeOptionalText(persistedCase.driftSourceCandidate),
      driftDirection: normalizeOptionalText(persistedCase.driftDirection),
      contextSnapshot: normalizeContextSnapshot((persistedCase as { contextSnapshot?: unknown })?.contextSnapshot),
      manualConfirmedAt: normalizeNullableDate(persistedCase.manualConfirmedAt),
    }),
    reviewCaseId: persistedCase.id,
    conversationId: persistedCase.conversationId,
    quoteId: persistedCase.quoteId,
    title: presentation?.title || `会话 ${persistedCase.conversationId}`,
    topicSummary: presentation?.topicSummary || persistedCase.queueReason,
    conversationStatus: conversation?.status || 'OPEN',
    conversationStatusLabel: getConversationStatusLabel(conversation?.status || 'OPEN'),
    reviewStatus: persistedCase.status,
    reviewStatusLabel: getTrialReviewStatusLabel(persistedCase.status),
    sourceKind: persistedCase.sourceKind,
    sourceKindLabel: getTrialReviewSourceKindLabel(persistedCase.sourceKind),
    currentQuoteStatusLabel: normalizeOptionalText(persistedCase.currentQuoteStatusLabel),
    deliveryScopeLabel: normalizeOptionalText(persistedCase.deliveryScopeLabel),
    deliveryScopeNote: normalizeOptionalText(persistedCase.deliveryScopeNote),
    queueReason: persistedCase.queueReason,
    queueReasonCode: normalizeOptionalText(persistedCase.queueReasonCode),
    recommendedAction: getFallbackRecommendedAction(persistedCase.sourceKind),
    requiresHumanReview: persistedCase.requiresHumanReview,
    hasFreshSignal: false,
    operatorName: normalizeOptionalText(persistedCase.operatorName),
    lastActionNote: normalizeOptionalText(persistedCase.lastActionNote),
    manualConfirmationResult: normalizeOptionalText(persistedCase.manualConfirmationResult),
    rejectionReason: normalizeOptionalText(persistedCase.rejectionReason),
    rejectionCategory: normalizeOptionalText((persistedCase as { rejectionCategory?: string | null })?.rejectionCategory),
    rejectionTargetArea: normalizeOptionalText(persistedCase.rejectionTargetArea),
    calibrationSignal: normalizeOptionalText(persistedCase.calibrationSignal),
    driftSourceCandidate: normalizeOptionalText(persistedCase.driftSourceCandidate),
    driftDirection: normalizeOptionalText(persistedCase.driftDirection),
    contextSnapshot: normalizeContextSnapshot((persistedCase as { contextSnapshot?: unknown })?.contextSnapshot),
    manualConfirmedAt: normalizeNullableDate(persistedCase.manualConfirmedAt),
    closedAt: normalizeNullableDate(persistedCase.closedAt),
    createdAt: normalizeDate(persistedCase.createdAt),
    updatedAt: normalizeDate(persistedCase.updatedAt),
    latestAudit: auditLogs[0] || null,
    auditLogs,
  }
}

function matchesFilters(item: TrialReviewQueueItem, filters: TrialReviewQueueFilters): boolean {
  if (filters.status && filters.status !== 'ALL' && item.reviewStatus !== filters.status) {
    return false
  }

  if (filters.sourceKind && filters.sourceKind !== 'ALL' && item.sourceKind !== filters.sourceKind) {
    return false
  }

  return true
}

function compareQueueItems(left: TrialReviewQueueItem, right: TrialReviewQueueItem): number {
  if (left.reviewStatus === TrialReviewStatus.PENDING_REVIEW && right.reviewStatus !== TrialReviewStatus.PENDING_REVIEW) {
    return -1
  }

  if (right.reviewStatus === TrialReviewStatus.PENDING_REVIEW && left.reviewStatus !== TrialReviewStatus.PENDING_REVIEW) {
    return 1
  }

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
}

export async function listTrialReviewQueue(filters: TrialReviewQueueFilters = {}): Promise<TrialReviewQueueResponse> {
  const [conversations, persistedCases] = await Promise.all([
    listReviewConversations(),
    listPersistedReviewCases(),
  ])

  const conversationMap = new Map(conversations.map((conversation) => [conversation.id, conversation]))
  const caseMap = new Map(persistedCases.map((item) => [item.conversationId, item]))
  const candidateMap = new Map<number, DerivedTrialReviewCandidate>()

  for (const conversation of conversations) {
    const candidate = deriveTrialReviewCandidate(conversation)
    if (candidate) {
      candidateMap.set(conversation.id, candidate)
    }
  }

  const records: TrialReviewQueueItem[] = []

  for (const [conversationId, candidate] of candidateMap.entries()) {
    if (caseMap.get(conversationId)?.sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK) {
      continue
    }

    records.push(buildQueueItemFromCandidate(candidate, conversationMap.get(conversationId), caseMap.get(conversationId)))
  }

  for (const persistedCase of persistedCases) {
    if (candidateMap.has(persistedCase.conversationId) && persistedCase.sourceKind !== TrialReviewSourceKind.QUOTED_FEEDBACK) {
      continue
    }

    records.push(buildQueueItemFromPersistedCase(
      persistedCase,
      conversationMap.get(persistedCase.conversationId),
    ))
  }

  const filtered = records
    .filter((item) => matchesFilters(item, filters))
    .sort(compareQueueItems)

  const statusCounts = new Map<TrialReviewStatus, number>()
  const sourceCounts = new Map<TrialReviewSourceKind, number>()

  for (const item of filtered) {
    statusCounts.set(item.reviewStatus, (statusCounts.get(item.reviewStatus) || 0) + 1)
    sourceCounts.set(item.sourceKind, (sourceCounts.get(item.sourceKind) || 0) + 1)
  }

  return {
    records: filtered,
    summary: {
      total: filtered.length,
      pendingCount: filtered.filter((item) => item.reviewStatus === TrialReviewStatus.PENDING_REVIEW).length,
      statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        label: getTrialReviewStatusLabel(status),
        count,
      })),
      sourceBreakdown: Array.from(sourceCounts.entries()).map(([sourceKind, count]) => ({
        sourceKind,
        label: getTrialReviewSourceKindLabel(sourceKind),
        count,
      })),
    },
    calibrationReopen: buildCalibrationReopenSummary(persistedCases),
    weeklyDriftReview: buildWeeklyTrialDriftReview(
      persistedCases.map((item) => ({
        createdAt: item.createdAt,
        sourceKind: item.sourceKind,
        rejectionCategory: (item as { rejectionCategory?: string | null }).rejectionCategory || null,
        rejectionTargetArea: item.rejectionTargetArea,
        calibrationSignal: item.calibrationSignal,
        driftSourceCandidate: item.driftSourceCandidate,
        driftDirection: item.driftDirection,
      })),
      CALIBRATION_REOPEN_THRESHOLD,
    ),
    envGovernance: getTrialEnvGovernanceSummary({ enforceForDeploy: process.env.NODE_ENV === 'production' }),
  }
}

async function getReviewConversationById(conversationId: number) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
      },
      handoffs: {
        orderBy: { createdAt: 'desc' },
      },
      reflections: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

function getActionTypeForStatus(status: TrialReviewStatus): TrialReviewActionType {
  switch (status) {
    case TrialReviewStatus.MANUAL_CONFIRMED:
      return TrialReviewActionType.MANUAL_CONFIRMED
    case TrialReviewStatus.RETURNED_AS_ESTIMATE:
      return TrialReviewActionType.RETURNED_AS_ESTIMATE
    case TrialReviewStatus.HANDOFF_TO_HUMAN:
      return TrialReviewActionType.HANDOFF_TO_HUMAN
    case TrialReviewStatus.CLOSED:
      return TrialReviewActionType.CLOSED
    default:
      return TrialReviewActionType.QUEUED
  }
}

export async function applyTrialReviewDecision(input: {
  conversationId: number
  status: TrialReviewStatus
  operatorName?: string | null
  note?: string | null
  sourceKind?: TrialReviewSourceKind | null
  manualConfirmationResult?: string | null
  rejectionReason?: string | null
  rejectionCategory?: string | null
  rejectionTargetArea?: string | null
  calibrationSignal?: string | null
  driftSourceCandidate?: string | null
  driftDirection?: string | null
  contextSnapshot?: TrialReviewQuickEntryContextSnapshot | null
  requiresHumanReview?: boolean | null
}): Promise<TrialReviewQueueItem> {
  const conversation = await getReviewConversationById(input.conversationId)
  if (!conversation) {
    throw new Error('会话不存在')
  }

  const candidate = deriveTrialReviewCandidate(conversation)
  const latestSnapshot = getLatestExportableQuoteSnapshot(conversation)
  const existingCase = await prisma.trialReviewCase.findUnique({
    where: { conversationId: input.conversationId },
    include: {
      auditLogs: {
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      },
    },
  })

  const requestedSourceKind = input.sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? TrialReviewSourceKind.QUOTED_FEEDBACK
    : null
  const isQuotedFeedbackFlow = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    || existingCase?.sourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK

  if (!candidate && !existingCase && !isQuotedFeedbackFlow) {
    throw new Error('当前会话不在试运行复核范围内')
  }

  if (isQuotedFeedbackFlow) {
    if (!latestSnapshot || latestSnapshot.documentKind !== 'formal_quote' || latestSnapshot.quoteStatusLabel !== '正式报价') {
      throw new Error('quoted 反馈只允许登记当前已形成正式报价的会话')
    }
  }

  const sourceKind = requestedSourceKind || candidate?.sourceKind || existingCase?.sourceKind || TrialReviewSourceKind.HUMAN_FOLLOWUP
  const sourceFingerprint = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? (latestSnapshot ? buildSnapshotFingerprint(TrialReviewSourceKind.QUOTED_FEEDBACK, conversation) : existingCase?.sourceFingerprint || buildHumanFollowupFingerprint(conversation))
    : candidate?.sourceFingerprint || existingCase?.sourceFingerprint || buildHumanFollowupFingerprint(conversation)
  const normalizedRejectionReason = normalizeOptionalText(input.rejectionReason)
  const normalizedRejectionCategory = normalizeOptionalText(input.rejectionCategory)
  const normalizedRejectionTargetArea = normalizeOptionalText(input.rejectionTargetArea)
  const normalizedCalibrationSignal = normalizeOptionalText(input.calibrationSignal)
  const normalizedDriftSourceCandidate = normalizeOptionalText(input.driftSourceCandidate)
  const normalizedDriftDirection = inferDriftDirection(input.driftDirection, normalizedCalibrationSignal)
  const currentQuoteStatusLabel = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? latestSnapshot?.quoteStatusLabel || existingCase?.currentQuoteStatusLabel || null
    : candidate?.currentQuoteStatusLabel || existingCase?.currentQuoteStatusLabel || null
  const queueReason = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? (normalizedRejectionReason || normalizeOptionalText(input.note) || existingCase?.queueReason || '正式报价反馈回传')
    : candidate?.queueReason || existingCase?.queueReason || '人工复核记录'
  const queueReasonCode = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? 'quoted_feedback'
    : candidate?.queueReasonCode || existingCase?.queueReasonCode || null
  const deliveryScopeLabel = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? latestSnapshot?.deliveryScopeLabel || existingCase?.deliveryScopeLabel || null
    : candidate?.deliveryScopeLabel || existingCase?.deliveryScopeLabel || null
  const deliveryScopeNote = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? latestSnapshot?.deliveryScopeNote || existingCase?.deliveryScopeNote || null
    : candidate?.deliveryScopeNote || existingCase?.deliveryScopeNote || null
  const fallbackContextSnapshot = buildQuotedFeedbackContextSnapshot({
    conversationId: input.conversationId,
    quoteId: latestSnapshot?.quoteRecordId ?? candidate?.quoteId ?? existingCase?.quoteId ?? null,
    currentQuoteStatusLabel,
    deliveryScopeLabel,
    isActiveScope: buildReviewPresentation(conversation).isActiveScope,
    fallbackTitle: candidate?.title || existingCase?.queueReason || `会话 ${input.conversationId}`,
  })
  const requiresHumanReview = requestedSourceKind === TrialReviewSourceKind.QUOTED_FEEDBACK
    ? (typeof input.requiresHumanReview === 'boolean' ? input.requiresHumanReview : input.status === TrialReviewStatus.HANDOFF_TO_HUMAN)
    : candidate?.requiresHumanReview ?? existingCase?.requiresHumanReview ?? true
  const normalizedOperatorName = normalizeOptionalText(input.operatorName)
  const normalizedNote = normalizeOptionalText(input.note)
  const contextSnapshot = input.contextSnapshot || existingCase && normalizeContextSnapshot((existingCase as { contextSnapshot?: unknown }).contextSnapshot) || fallbackContextSnapshot
  const manualConfirmationResult = inferManualConfirmationResult({
    explicitResult: input.manualConfirmationResult,
    status: input.status,
    sourceKind,
    currentQuoteStatusLabel,
    rejectionReason: normalizedRejectionReason,
  })
  const effectiveFromStatus = existingCase && existingCase.sourceFingerprint === sourceFingerprint
    ? existingCase.status
    : TrialReviewStatus.PENDING_REVIEW

  await prisma.$transaction(async (tx) => {
    let nextSourceKind = sourceKind
    let nextSourceFingerprint = sourceFingerprint
    let nextQueueReason = queueReason

    if (input.status === TrialReviewStatus.HANDOFF_TO_HUMAN) {
      const hasOpenHandoff = conversation.handoffs.some((item) => !item.resolved)
      let handoffId = conversation.handoffs.find((item) => !item.resolved)?.id || null
      let handoffCreatedAt = conversation.handoffs.find((item) => !item.resolved)?.createdAt || conversation.updatedAt

      if (!hasOpenHandoff) {
        const handoff = await tx.handoffRecord.create({
          data: {
            conversationId: input.conversationId,
            reason: normalizedNote || queueReason,
            assignedTo: normalizedOperatorName,
            resolved: false,
          },
        })

        handoffId = handoff.id
        handoffCreatedAt = handoff.createdAt
      }

      if (conversation.status !== 'PENDING_HUMAN') {
        await tx.conversation.update({
          where: { id: input.conversationId },
          data: { status: 'PENDING_HUMAN' },
        })
      }

      if (sourceKind !== TrialReviewSourceKind.QUOTED_FEEDBACK) {
        nextSourceKind = TrialReviewSourceKind.HUMAN_FOLLOWUP
        nextSourceFingerprint = [
          'handoff',
          handoffId || 'pending',
          normalizeDate(handoffCreatedAt),
        ].join(':')
      }

      nextQueueReason = normalizedNote || queueReason
    }

    const reviewCase = existingCase
      ? await tx.trialReviewCase.update({
          where: { conversationId: input.conversationId },
          data: {
            quoteId: latestSnapshot?.quoteRecordId ?? candidate?.quoteId ?? existingCase.quoteId ?? null,
            status: input.status,
            sourceKind: nextSourceKind,
            sourceFingerprint: nextSourceFingerprint,
            queueReason: nextQueueReason,
            queueReasonCode,
            deliveryScopeLabel,
            deliveryScopeNote,
            currentQuoteStatusLabel,
            requiresHumanReview,
            operatorName: normalizedOperatorName,
            lastActionNote: normalizedNote,
            manualConfirmationResult,
            rejectionReason: normalizedRejectionReason,
            rejectionCategory: normalizedRejectionCategory,
            rejectionTargetArea: normalizedRejectionTargetArea,
            calibrationSignal: normalizedCalibrationSignal,
            driftSourceCandidate: normalizedDriftSourceCandidate,
            driftDirection: normalizedDriftDirection,
            contextSnapshot,
            manualConfirmedAt: input.status === TrialReviewStatus.MANUAL_CONFIRMED
              ? new Date()
              : existingCase.manualConfirmedAt,
            closedAt: input.status === TrialReviewStatus.CLOSED
              ? new Date()
              : existingCase.closedAt,
          },
        })
      : await tx.trialReviewCase.create({
          data: {
            conversationId: input.conversationId,
            quoteId: latestSnapshot?.quoteRecordId ?? candidate?.quoteId ?? null,
            status: input.status,
            sourceKind: nextSourceKind,
            sourceFingerprint: nextSourceFingerprint,
            queueReason: nextQueueReason,
            queueReasonCode,
            deliveryScopeLabel,
            deliveryScopeNote,
            currentQuoteStatusLabel,
            requiresHumanReview,
            operatorName: normalizedOperatorName,
            lastActionNote: normalizedNote,
            manualConfirmationResult,
            rejectionReason: normalizedRejectionReason,
            rejectionCategory: normalizedRejectionCategory,
            rejectionTargetArea: normalizedRejectionTargetArea,
            calibrationSignal: normalizedCalibrationSignal,
            driftSourceCandidate: normalizedDriftSourceCandidate,
            driftDirection: normalizedDriftDirection,
            contextSnapshot,
            manualConfirmedAt: input.status === TrialReviewStatus.MANUAL_CONFIRMED ? new Date() : null,
            closedAt: input.status === TrialReviewStatus.CLOSED ? new Date() : null,
          },
        })

    if (!existingCase) {
      await tx.trialReviewAuditLog.create({
        data: {
          reviewCaseId: reviewCase.id,
          fromStatus: null,
          toStatus: TrialReviewStatus.PENDING_REVIEW,
          actionType: TrialReviewActionType.QUEUED,
          note: queueReason,
        },
      })
    }

    await tx.trialReviewAuditLog.create({
      data: {
        reviewCaseId: reviewCase.id,
        fromStatus: existingCase ? effectiveFromStatus : TrialReviewStatus.PENDING_REVIEW,
        toStatus: input.status,
        actionType: getActionTypeForStatus(input.status),
        operatorName: normalizedOperatorName,
        note: normalizedNote,
      },
    })
  })

  const queue = await listTrialReviewQueue({ status: 'ALL', sourceKind: 'ALL' })
  const updated = queue.records.find((item) => item.conversationId === input.conversationId)
  if (!updated) {
    throw new Error('复核记录更新后未能重新加载')
  }

  return updated
}