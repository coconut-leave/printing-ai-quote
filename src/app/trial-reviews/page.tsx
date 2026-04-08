'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminPageNav } from '@/components/AdminPageNav'
import {
  buildQuotedFeedbackStructuredFields,
  getTrialReviewRejectionCategoryLabel,
  getTrialReviewTargetAreaLabel,
  TRIAL_REJECTION_CATEGORY_OPTIONS,
  TRIAL_TARGET_AREA_OPTIONS,
  type TrialReviewQuickEntryContextSnapshot,
  type TrialReviewRejectionCategory,
  type TrialReviewTargetArea,
} from '@/lib/trialReviews/quotedFeedbackQuickEntry'

type TrialReviewStatus = 'ALL' | 'PENDING_REVIEW' | 'MANUAL_CONFIRMED' | 'RETURNED_AS_ESTIMATE' | 'HANDOFF_TO_HUMAN' | 'CLOSED'
type TrialReviewSourceKind = 'ALL' | 'REFERENCE_QUOTE' | 'MANUAL_REVIEW' | 'HUMAN_FOLLOWUP' | 'QUOTED_FEEDBACK'
type TrialReviewManualConfirmationResult = '' | 'CONFIRMED_AS_QUOTED' | 'CONFIRMED_AS_ESTIMATE' | 'REJECTED_QUOTED_RESULT' | 'HANDOFF_REQUIRED' | 'CLOSED_AFTER_REVIEW'
type TrialReviewCalibrationSignal = '' | 'QUOTE_TOO_HIGH' | 'QUOTE_TOO_LOW' | 'NO_SYSTEM_DRIFT' | 'NEEDS_MORE_EVIDENCE'
type TrialReviewDriftDirection = '' | 'HIGH' | 'LOW'

type TrialReviewAuditLogView = {
  id: number
  fromStatusLabel: string | null
  toStatusLabel: string
  actionLabel: string
  transitionLabel: string
  operatorName: string | null
  note: string | null
  createdAt: string
}

type TrialReviewWeeklyDriftReview = {
  threshold: number
  generatedAt: string
  totalQuotedFeedbackCount: number
  weeklyArchives: Array<{
    weekKey: string
    weekLabel: string
    quotedFeedbackCount: number
    targetAreaBreakdown: Array<{ targetArea: string; label: string; count: number }>
    driftDirectionBreakdown: Array<{ direction: string; label: string; count: number }>
    rejectionCategoryBreakdown: Array<{ category: string; label: string; count: number }>
  }>
  currentSignal: {
    driftSourceCandidate: string
    driftDirection: string | null
    driftDirectionLabel: string | null
    consecutiveCount: number
    threshold: number
    remainingToThreshold: number
    status: 'far_from_threshold' | 'near_threshold' | 'triggered'
    latestCalibrationSignal: string | null
    latestCalibrationSignalLabel: string | null
  } | null
  note: string
}

type TrialReviewObservation = {
  overviewCards: Array<{
    title: string
    value: string
    note: string | null
    tone: 'emerald' | 'sky' | 'orange' | 'amber' | 'slate'
  }>
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
    lineItems: Array<{
      roleLabel: '主件' | '子项' | '单项'
      title: string
      spec: string
      subtotalLabel: string | null
      reviewNote: string | null
      isBlocking: boolean
    }>
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

type TrialReviewQueueItem = {
  reviewCaseId: number | null
  conversationId: number
  quoteId: number | null
  title: string
  topicSummary: string
  conversationStatusLabel: string
  reviewStatus: Exclude<TrialReviewStatus, 'ALL'>
  reviewStatusLabel: string
  sourceKind: Exclude<TrialReviewSourceKind, 'ALL'>
  sourceKindLabel: string
  currentQuoteStatusLabel: string | null
  deliveryScopeLabel: string | null
  deliveryScopeNote: string | null
  queueReason: string
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
  updatedAt: string
  latestAudit: TrialReviewAuditLogView | null
  auditLogs: TrialReviewAuditLogView[]
  observation: TrialReviewObservation
}

type TrialReviewSummary = {
  total: number
  pendingCount: number
  statusBreakdown: Array<{ status: string; label: string; count: number }>
  sourceBreakdown: Array<{ sourceKind: string; label: string; count: number }>
}

type TrialReviewCalibrationReopenSummary = {
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

type EnvGovernanceSummary = {
  status: 'ready' | 'warning' | 'blocked'
  blockingIssues: string[]
  warnings: string[]
}

const STATUS_OPTIONS: Array<{ value: TrialReviewStatus; label: string }> = [
  { value: 'ALL', label: '全部状态' },
  { value: 'PENDING_REVIEW', label: '待复核' },
  { value: 'MANUAL_CONFIRMED', label: '已人工确认' },
  { value: 'RETURNED_AS_ESTIMATE', label: '保留参考报价' },
  { value: 'HANDOFF_TO_HUMAN', label: '已转人工' },
  { value: 'CLOSED', label: '已关闭' },
]

const SOURCE_OPTIONS: Array<{ value: TrialReviewSourceKind; label: string }> = [
  { value: 'ALL', label: '全部来源' },
  { value: 'REFERENCE_QUOTE', label: '参考报价复核' },
  { value: 'MANUAL_REVIEW', label: '人工处理判断' },
  { value: 'HUMAN_FOLLOWUP', label: '人工跟进中' },
  { value: 'QUOTED_FEEDBACK', label: '正式报价反馈' },
]

const MANUAL_CONFIRMATION_RESULT_OPTIONS: Array<{ value: TrialReviewManualConfirmationResult; label: string }> = [
  { value: '', label: '自动推断本次结论' },
  { value: 'CONFIRMED_AS_QUOTED', label: '确认沿用正式报价' },
  { value: 'CONFIRMED_AS_ESTIMATE', label: '确认改走参考报价' },
  { value: 'REJECTED_QUOTED_RESULT', label: '正式报价已被打回' },
  { value: 'HANDOFF_REQUIRED', label: '需要人工继续处理' },
  { value: 'CLOSED_AFTER_REVIEW', label: '复核后关闭' },
]

const CALIBRATION_SIGNAL_OPTIONS: Array<{ value: TrialReviewCalibrationSignal; label: string }> = [
  { value: '', label: '不额外标记 calibration 信号' },
  { value: 'QUOTE_TOO_HIGH', label: '系统正式报价连续偏高' },
  { value: 'QUOTE_TOO_LOW', label: '系统正式报价连续偏低' },
  { value: 'NO_SYSTEM_DRIFT', label: '暂未观察到系统性漂移' },
  { value: 'NEEDS_MORE_EVIDENCE', label: '已有波动，但证据还不足' },
]

const DRIFT_DIRECTION_OPTIONS: Array<{ value: TrialReviewDriftDirection; label: string }> = [
  { value: '', label: '自动跟随 calibration signal' },
  { value: 'HIGH', label: '同向偏高' },
  { value: 'LOW', label: '同向偏低' },
]

const OBSERVATION_CARD_CLASS: Record<TrialReviewObservation['overviewCards'][number]['tone'], string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  sky: 'border-sky-200 bg-sky-50 text-sky-950',
  orange: 'border-orange-200 bg-orange-50 text-orange-950',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  slate: 'border-slate-200 bg-slate-50 text-slate-900',
}

export default function TrialReviewsPage() {
  const [records, setRecords] = useState<TrialReviewQueueItem[]>([])
  const [summary, setSummary] = useState<TrialReviewSummary | null>(null)
  const [calibrationReopen, setCalibrationReopen] = useState<TrialReviewCalibrationReopenSummary | null>(null)
  const [weeklyDriftReview, setWeeklyDriftReview] = useState<TrialReviewWeeklyDriftReview | null>(null)
  const [envGovernance, setEnvGovernance] = useState<EnvGovernanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TrialReviewStatus>('PENDING_REVIEW')
  const [sourceFilter, setSourceFilter] = useState<TrialReviewSourceKind>('ALL')
  const [operatorName, setOperatorName] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({})
  const [rejectionCategories, setRejectionCategories] = useState<Record<number, TrialReviewRejectionCategory>>({})
  const [targetAreas, setTargetAreas] = useState<Record<number, TrialReviewTargetArea>>({})
  const [manualFollowups, setManualFollowups] = useState<Record<number, boolean>>({})
  const [updatingConversationId, setUpdatingConversationId] = useState<number | null>(null)
  const operatorMissing = operatorName.trim().length === 0

  const fetchQueue = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (sourceFilter !== 'ALL') params.set('sourceKind', sourceFilter)

      const res = await fetch(`/api/trial-reviews?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || '加载试运行复核队列失败')
        return
      }

      setRecords(data.data.records)
      setSummary(data.data.summary)
      setCalibrationReopen(data.data.calibrationReopen)
      setWeeklyDriftReview(data.data.weeklyDriftReview)
      setEnvGovernance(data.data.envGovernance)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '加载试运行复核队列失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchQueue()
  }, [statusFilter, sourceFilter])

  const handleAction = async (
    conversationId: number,
    status: Exclude<TrialReviewStatus, 'ALL' | 'PENDING_REVIEW'>,
    sourceKind?: Exclude<TrialReviewSourceKind, 'ALL'>,
    overrides?: {
      note?: string
      manualConfirmationResult?: TrialReviewManualConfirmationResult
      rejectionReason?: string
      rejectionCategory?: TrialReviewRejectionCategory
      rejectionTargetArea?: TrialReviewTargetArea
      calibrationSignal?: TrialReviewCalibrationSignal
      driftSourceCandidate?: string | null
      driftDirection?: TrialReviewDriftDirection
      requiresHumanReview?: boolean
      contextSnapshot?: TrialReviewQuickEntryContextSnapshot
    },
  ) => {
    try {
      if (operatorMissing) {
        setError('请先填写处理人，再提交复核动作。')
        return
      }

      setUpdatingConversationId(conversationId)
      setError(null)

      const res = await fetch(`/api/trial-reviews/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          status,
          operatorName,
          sourceKind: sourceKind || null,
          note: overrides?.note ?? notes[conversationId] ?? '',
          manualConfirmationResult: overrides?.manualConfirmationResult ?? '',
          rejectionReason: overrides?.rejectionReason ?? rejectionReasons[conversationId] ?? '',
          rejectionCategory: overrides?.rejectionCategory ?? '',
          rejectionTargetArea: overrides?.rejectionTargetArea ?? '',
          calibrationSignal: overrides?.calibrationSignal ?? '',
          driftSourceCandidate: overrides?.driftSourceCandidate ?? '',
          driftDirection: overrides?.driftDirection ?? '',
          requiresHumanReview: overrides?.requiresHumanReview ?? null,
          contextSnapshot: overrides?.contextSnapshot ?? null,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || '更新复核状态失败')
        return
      }

      await fetchQueue()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '更新复核状态失败')
    } finally {
      setUpdatingConversationId(null)
    }
  }

  const buildRecordContextSnapshot = (record: TrialReviewQueueItem): TrialReviewQuickEntryContextSnapshot => {
    if (record.contextSnapshot) {
      return record.contextSnapshot
    }

    return {
      feedbackType: 'quoted_rejection',
      conversationId: record.conversationId,
      quoteId: record.quoteId,
      currentPathLabel: record.observation.componentSection.mainItemTitle || record.title,
      bundleTypeLabel: record.observation.componentSection.subItemTitles.length > 0
        ? `主件 + ${record.observation.componentSection.subItemTitles.join(' + ')}`
        : '单项',
      currentQuoteStatusLabel: record.currentQuoteStatusLabel || '正式报价',
      deliveryScopeLabel: record.deliveryScopeLabel || '未知交付口径',
      isActiveScope: true,
      mainItemTitle: record.observation.componentSection.mainItemTitle,
      subItemTitles: record.observation.componentSection.subItemTitles,
    }
  }

  const handleQuickQuotedFeedback = async (record: TrialReviewQueueItem) => {
    const contextSnapshot = buildRecordContextSnapshot(record)
    const rejectionCategory = rejectionCategories[record.conversationId] || 'other'
    const targetArea = targetAreas[record.conversationId] || 'unknown'
    const structuredFields = buildQuotedFeedbackStructuredFields({
      contextSnapshot,
      rejectionCategory,
      targetArea,
      manualFollowupRequired: manualFollowups[record.conversationId] || false,
    })

    await handleAction(record.conversationId, structuredFields.status, 'QUOTED_FEEDBACK', {
      note: notes[record.conversationId] || '',
      manualConfirmationResult: structuredFields.manualConfirmationResult,
      rejectionReason: rejectionReasons[record.conversationId] || '',
      rejectionCategory: structuredFields.rejectionCategory,
      rejectionTargetArea: structuredFields.rejectionTargetArea,
      calibrationSignal: structuredFields.calibrationSignal,
      driftSourceCandidate: structuredFields.driftSourceCandidate,
      driftDirection: structuredFields.driftDirection || '',
      requiresHumanReview: structuredFields.requiresHumanReview,
      contextSnapshot: structuredFields.contextSnapshot,
    })
  }

  const getStatusBadgeClass = (status: TrialReviewQueueItem['reviewStatus']) => {
    if (status === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-900'
    if (status === 'MANUAL_CONFIRMED') return 'bg-emerald-100 text-emerald-900'
    if (status === 'RETURNED_AS_ESTIMATE') return 'bg-sky-100 text-sky-900'
    if (status === 'HANDOFF_TO_HUMAN') return 'bg-orange-100 text-orange-900'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <main className='min-h-screen bg-slate-50 p-4'>
      <div className='mx-auto max-w-6xl space-y-6'>
        <AdminPageNav current='trial-reviews' />

        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900'>试运行复核队列</h1>
            <p className='mt-2 text-sm text-slate-600'>这里只承接当前订单的试运行复核、quoted 打回和人工跟进，避免和可选学习记录混用。</p>
          </div>
          <div className='flex gap-2'>
            <Link href='/conversations' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              查看会话列表
            </Link>
            <Link href='/reflections' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              查看学习记录
            </Link>
          </div>
        </div>

        {envGovernance && envGovernance.status !== 'ready' && (
          <div className={`rounded-xl border p-4 text-sm ${envGovernance.status === 'blocked' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <div className='font-semibold'>环境治理提醒</div>
            <div className='mt-2 space-y-1'>
              {envGovernance.blockingIssues.map((item) => (
                <div key={item}>- {item}</div>
              ))}
              {envGovernance.warnings.map((item) => (
                <div key={item}>- {item}</div>
              ))}
            </div>
          </div>
        )}

        <div className='grid gap-4 md:grid-cols-4'>
          <div className='rounded-xl bg-white p-4 shadow-sm'>
            <div className='text-sm text-slate-500'>当前队列</div>
            <div className='mt-2 text-3xl font-bold text-slate-900'>{summary?.total || 0}</div>
          </div>
          <div className='rounded-xl bg-white p-4 shadow-sm'>
            <div className='text-sm text-slate-500'>待复核</div>
            <div className='mt-2 text-3xl font-bold text-amber-700'>{summary?.pendingCount || 0}</div>
          </div>
          <div className='rounded-xl bg-white p-4 shadow-sm md:col-span-2'>
            <div className='text-sm text-slate-500'>操作人</div>
            <input
              value={operatorName}
              onChange={(event) => setOperatorName(event.target.value)}
              placeholder='填写当前复核人，如 张三 / sales-01'
              className='mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
            />
            <div className='mt-2 text-xs text-slate-500'>复核动作会强制记录处理人，用于后续台账和人工复核留痕。</div>
          </div>
        </div>

        {summary && (
          <div className='grid gap-4 lg:grid-cols-2'>
            <div className='rounded-xl bg-white p-4 shadow-sm'>
              <div className='text-sm font-semibold text-slate-900'>状态分布</div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {summary.statusBreakdown.length > 0 ? summary.statusBreakdown.map((item) => (
                  <span key={item.status} className='rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700'>
                    {item.label} {item.count}
                  </span>
                )) : (
                  <span className='text-sm text-slate-500'>当前筛选下暂无状态分布。</span>
                )}
              </div>
            </div>

            <div className='rounded-xl bg-white p-4 shadow-sm'>
              <div className='text-sm font-semibold text-slate-900'>来源分布</div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {summary.sourceBreakdown.length > 0 ? summary.sourceBreakdown.map((item) => (
                  <span key={item.sourceKind} className='rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700'>
                    {item.label} {item.count}
                  </span>
                )) : (
                  <span className='text-sm text-slate-500'>当前筛选下暂无来源分布。</span>
                )}
              </div>
            </div>
          </div>
        )}

        {calibrationReopen && (
          <div className={`rounded-xl border p-4 text-sm ${calibrationReopen.triggered ? 'border-red-200 bg-red-50 text-red-950' : 'border-slate-200 bg-white text-slate-800'}`}>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='font-semibold'>Calibration 重开观察</div>
                <div className='mt-2'>{calibrationReopen.summary}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${calibrationReopen.triggered ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-700'}`}>
                {calibrationReopen.triggered ? '达到重开阈值' : '仍保持 pricing freeze'}
              </div>
            </div>
            <div className='mt-3 flex flex-wrap gap-2 text-xs'>
              <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>正式报价反馈 {calibrationReopen.totalQuotedFeedbackCount}</span>
              <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>连续同源同向 {calibrationReopen.consecutiveSameSourceDirectionCount}</span>
              <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>重开阈值 {calibrationReopen.threshold}</span>
              {calibrationReopen.driftSourceCandidate && <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>疑似漂移源：{calibrationReopen.driftSourceCandidate}</span>}
              {calibrationReopen.driftDirectionLabel && <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>方向：{calibrationReopen.driftDirectionLabel}</span>}
              {calibrationReopen.calibrationSignalLabel && <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>最新信号：{calibrationReopen.calibrationSignalLabel}</span>}
            </div>
          </div>
        )}

        <div className='rounded-xl bg-white p-4 shadow-sm'>
          <div className='grid gap-4 md:grid-cols-2'>
            <label className='text-sm text-slate-700'>
              复核状态
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as TrialReviewStatus)}
                className='mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2'
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className='text-sm text-slate-700'>
              复核来源
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as TrialReviewSourceKind)}
                className='mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2'
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className='rounded-xl bg-white p-4 shadow-sm'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <div className='text-sm font-semibold text-slate-900'>quoted 打回快捷入口</div>
              <div className='mt-1 text-sm text-slate-600'>现在从当前卡片或会话详情直接登记，自动带入会话、报价、主路径、组合类型和试运行口径，不再手填 conversation id。</div>
            </div>
            <Link href='/conversations' className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200'>
              去会话详情登记
            </Link>
          </div>
        </div>

        {weeklyDriftReview && (
          <div className='rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-slate-900'>周度 drift 归档</div>
                <div className='mt-1 text-sm text-slate-600'>{weeklyDriftReview.note}</div>
              </div>
              <div className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                已归档正式报价反馈 {weeklyDriftReview.totalQuotedFeedbackCount}
              </div>
            </div>

            {weeklyDriftReview.currentSignal && (
              <div className={`mt-4 rounded-xl border p-4 text-sm ${weeklyDriftReview.currentSignal.status === 'triggered' ? 'border-red-200 bg-red-50 text-red-950' : weeklyDriftReview.currentSignal.status === 'near_threshold' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                <div className='font-semibold'>当前连续漂移观察</div>
                <div className='mt-2'>
                  {weeklyDriftReview.currentSignal.driftSourceCandidate}
                  {weeklyDriftReview.currentSignal.driftDirectionLabel ? ` / ${weeklyDriftReview.currentSignal.driftDirectionLabel}` : ''}
                </div>
                <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                  <span className='rounded-full bg-white px-3 py-1 text-slate-700'>连续 {weeklyDriftReview.currentSignal.consecutiveCount}</span>
                  <span className='rounded-full bg-white px-3 py-1 text-slate-700'>阈值 {weeklyDriftReview.currentSignal.threshold}</span>
                  <span className='rounded-full bg-white px-3 py-1 text-slate-700'>距离阈值 {weeklyDriftReview.currentSignal.remainingToThreshold}</span>
                  {weeklyDriftReview.currentSignal.latestCalibrationSignalLabel && (
                    <span className='rounded-full bg-white px-3 py-1 text-slate-700'>最新信号：{weeklyDriftReview.currentSignal.latestCalibrationSignalLabel}</span>
                  )}
                </div>
              </div>
            )}

            <div className='mt-4 space-y-3'>
              {weeklyDriftReview.weeklyArchives.slice(0, 6).map((archive) => (
                <div key={archive.weekKey} className='rounded-xl border border-slate-200 p-4'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-semibold text-slate-900'>{archive.weekLabel}</div>
                      <div className='mt-1 text-sm text-slate-600'>本周 quoted 打回 {archive.quotedFeedbackCount} 单</div>
                    </div>
                    <div className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>按周归档</div>
                  </div>
                  <div className='mt-3 grid gap-3 lg:grid-cols-3'>
                    <div>
                      <div className='text-xs font-semibold text-slate-500'>目标区段</div>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {archive.targetAreaBreakdown.length > 0 ? archive.targetAreaBreakdown.map((item) => (
                          <span key={`${archive.weekKey}-${item.targetArea}`} className='rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700'>
                            {item.label} {item.count}
                          </span>
                        )) : <span className='text-xs text-slate-400'>暂无</span>}
                      </div>
                    </div>
                    <div>
                      <div className='text-xs font-semibold text-slate-500'>漂移方向</div>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {archive.driftDirectionBreakdown.length > 0 ? archive.driftDirectionBreakdown.map((item) => (
                          <span key={`${archive.weekKey}-${item.direction}`} className='rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700'>
                            {item.label} {item.count}
                          </span>
                        )) : <span className='text-xs text-slate-400'>暂无</span>}
                      </div>
                    </div>
                    <div>
                      <div className='text-xs font-semibold text-slate-500'>打回分类</div>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {archive.rejectionCategoryBreakdown.length > 0 ? archive.rejectionCategoryBreakdown.map((item) => (
                          <span key={`${archive.weekKey}-${item.category}`} className='rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700'>
                            {item.label} {item.count}
                          </span>
                        )) : <span className='text-xs text-slate-400'>暂无</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900'>{error}</div>}

        {loading && <div className='text-sm text-slate-600'>加载中...</div>}

        {!loading && records.length === 0 && (
          <div className='rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
            当前筛选条件下没有复核项。
          </div>
        )}

        <div className='space-y-4'>
          {records.map((record) => (
            <section key={`${record.conversationId}-${record.reviewCaseId || 'new'}`} className='rounded-2xl bg-white p-5 shadow-sm'>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                  <Link href={`/conversations/${record.conversationId}`} className='text-lg font-semibold text-slate-900 hover:text-blue-700'>
                    {record.title}
                  </Link>
                  <p className='mt-1 text-sm text-slate-600'>{record.topicSummary}</p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(record.reviewStatus)}`}>
                    {record.reviewStatusLabel}
                  </span>
                  <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                    {record.sourceKindLabel}
                  </span>
                  <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                    会话状态：{record.conversationStatusLabel}
                  </span>
                  {record.currentQuoteStatusLabel && (
                    <span className='rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900'>
                      当前口径：{record.currentQuoteStatusLabel}
                    </span>
                  )}
                  {record.hasFreshSignal && (
                    <span className='rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-900'>
                      有新结果待重新复核
                    </span>
                  )}
                </div>
              </div>

              <div className='mt-4 grid gap-4 lg:grid-cols-3'>
                <div className='rounded-xl border border-slate-200 p-4 lg:col-span-3'>
                  <div className='mb-3 text-sm font-semibold text-slate-900'>试运行观察面板</div>
                  <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                    {record.observation.overviewCards.map((card) => (
                      <div key={card.title} className={`rounded-xl border p-4 ${OBSERVATION_CARD_CLASS[card.tone]}`}>
                        <div className='text-xs font-semibold opacity-80'>{card.title}</div>
                        <div className='mt-2 text-base font-semibold'>{card.value}</div>
                        {card.note && <div className='mt-2 text-sm opacity-80'>{card.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className='rounded-xl bg-slate-50 p-4 text-sm text-slate-700'>
                  <div className='font-semibold text-slate-900'>入队原因</div>
                  <div className='mt-2'>{record.queueReason}</div>
                  {record.deliveryScopeLabel && <div className='mt-2 text-slate-500'>交付口径：{record.deliveryScopeLabel}</div>}
                  {record.deliveryScopeNote && <div className='mt-2 text-slate-500'>说明：{record.deliveryScopeNote}</div>}
                </div>

                <div className='rounded-xl bg-slate-50 p-4 text-sm text-slate-700'>
                  <div className='font-semibold text-slate-900'>建议动作</div>
                  <div className='mt-2'>{record.recommendedAction}</div>
                  <div className='mt-2 text-slate-500'>需要人工复核：{record.requiresHumanReview ? '是' : '否'}</div>
                  {record.manualConfirmationResult && <div className='mt-2 text-slate-500'>人工确认结论：{record.manualConfirmationResult}</div>}
                  {record.rejectionReason && <div className='mt-2 text-slate-500'>打回原因：{record.rejectionReason}</div>}
                  {record.rejectionCategory && <div className='mt-2 text-slate-500'>打回分类：{getTrialReviewRejectionCategoryLabel(record.rejectionCategory)}</div>}
                  {record.rejectionTargetArea && <div className='mt-2 text-slate-500'>目标区段：{getTrialReviewTargetAreaLabel(record.rejectionTargetArea)}</div>}
                  {record.calibrationSignal && <div className='mt-2 text-slate-500'>Calibration 信号：{record.calibrationSignal}</div>}
                  {record.driftSourceCandidate && <div className='mt-2 text-slate-500'>疑似漂移源：{record.driftSourceCandidate}</div>}
                  {record.driftDirection && <div className='mt-2 text-slate-500'>同向漂移：{record.driftDirection}</div>}
                  {record.contextSnapshot?.currentPathLabel && <div className='mt-2 text-slate-500'>当前主路径：{record.contextSnapshot.currentPathLabel}</div>}
                  {record.contextSnapshot?.bundleTypeLabel && <div className='mt-2 text-slate-500'>组合类型：{record.contextSnapshot.bundleTypeLabel}</div>}
                  {record.contextSnapshot?.deliveryScopeLabel && <div className='mt-2 text-slate-500'>试运行口径：{record.contextSnapshot.deliveryScopeLabel}</div>}
                  {record.manualConfirmedAt && <div className='mt-2 text-slate-500'>人工确认时间：{new Date(record.manualConfirmedAt).toLocaleString()}</div>}
                  {record.closedAt && <div className='mt-2 text-slate-500'>关闭时间：{new Date(record.closedAt).toLocaleString()}</div>}
                </div>

                <div className='rounded-xl bg-slate-50 p-4 text-sm text-slate-700'>
                  <div className='font-semibold text-slate-900'>最新留痕</div>
                  {record.latestAudit ? (
                    <>
                      <div className='mt-2'>{record.latestAudit.actionLabel}</div>
                      <div className='mt-1 text-slate-500'>流转：{record.latestAudit.transitionLabel}</div>
                      <div className='mt-1 text-slate-500'>时间：{new Date(record.latestAudit.createdAt).toLocaleString()}</div>
                      {record.latestAudit.operatorName && <div className='mt-1 text-slate-500'>处理人：{record.latestAudit.operatorName}</div>}
                      {record.latestAudit.note && <div className='mt-1 text-slate-500'>备注：{record.latestAudit.note}</div>}
                    </>
                  ) : (
                    <div className='mt-2 text-slate-500'>还没有人工处理留痕。</div>
                  )}
                </div>
              </div>

              <div className='mt-4 grid gap-4 xl:grid-cols-3'>
                <div className='rounded-xl border border-slate-200 p-4 xl:col-span-1'>
                  <div className='text-sm font-semibold text-slate-900'>{record.observation.reasonSection.title}</div>
                  <div className='mt-3 text-sm text-slate-800'>{record.observation.reasonSection.primaryReason}</div>
                  {record.observation.reasonSection.secondaryReasons.length > 0 && (
                    <div className='mt-3 space-y-2 text-sm text-slate-600'>
                      {record.observation.reasonSection.secondaryReasons.map((item) => (
                        <div key={item}>- {item}</div>
                      ))}
                    </div>
                  )}
                  {record.observation.reasonSection.guardrails.length > 0 && (
                    <div className='mt-4 flex flex-wrap gap-2'>
                      {record.observation.reasonSection.guardrails.map((item) => (
                        <span key={item} className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900'>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className='rounded-xl border border-slate-200 p-4 xl:col-span-1'>
                  <div className='text-sm font-semibold text-slate-900'>组件 / 订单视图</div>
                  <div className='mt-2 text-sm text-slate-600'>{record.observation.componentSection.summary}</div>
                  {record.observation.componentSection.mainItemTitle && (
                    <div className='mt-3 text-sm text-slate-800'>主件：{record.observation.componentSection.mainItemTitle}</div>
                  )}
                  {record.observation.componentSection.subItemTitles.length > 0 && (
                    <div className='mt-2 text-sm text-slate-800'>子项：{record.observation.componentSection.subItemTitles.join('、')}</div>
                  )}
                  <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                    {record.observation.componentSection.pricingFacts.map((fact) => (
                      <div key={fact.label} className='rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700'>
                        <div className='text-xs text-slate-500'>{fact.label}</div>
                        <div className='mt-1 font-medium text-slate-900'>{fact.value}</div>
                      </div>
                    ))}
                  </div>
                  {record.observation.componentSection.blockerComponents.length > 0 && (
                    <div className='mt-4'>
                      <div className='text-sm font-medium text-slate-900'>阻止正式报价的主要原因</div>
                      <div className='mt-2 space-y-2 text-sm text-slate-700'>
                        {record.observation.componentSection.blockerComponents.map((item) => (
                          <div key={item}>- {item}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className='rounded-xl border border-slate-200 p-4 xl:col-span-1'>
                  <div className='text-sm font-semibold text-slate-900'>复核与反馈</div>
                  <div className='mt-2 text-sm text-slate-600'>{record.observation.feedbackSection.summary}</div>
                  <div className='mt-4 space-y-2 text-sm text-slate-700'>
                    {record.observation.feedbackSection.facts.map((fact) => (
                      <div key={fact.label}>
                        <span className='font-medium text-slate-900'>{fact.label}：</span>
                        {fact.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {record.observation.componentSection.lineItems.length > 0 && (
                <div className='mt-4 rounded-xl border border-slate-200 p-4'>
                  <div className='text-sm font-semibold text-slate-900'>组件明细</div>
                  <div className='mt-3 space-y-3'>
                    {record.observation.componentSection.lineItems.map((item, index) => (
                      <div key={`${item.title}-${index}`} className={`rounded-lg border p-3 ${item.isBlocking ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div>
                            <div className='text-sm font-medium text-slate-900'>{item.roleLabel}：{item.title}</div>
                            <div className='mt-1 text-sm text-slate-600'>{item.spec}</div>
                          </div>
                          {item.subtotalLabel && <div className='text-sm font-medium text-slate-900'>{item.subtotalLabel}</div>}
                        </div>
                        {item.reviewNote && <div className='mt-2 text-sm text-amber-900'>{item.reviewNote}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`mt-4 rounded-xl border p-4 text-sm ${record.observation.consistencySection.acceptanceAligned === false ? 'border-orange-200 bg-orange-50 text-orange-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}>
                <div className='font-semibold'>口径一致性</div>
                <div className='mt-2'>当前试运行口径：{record.observation.consistencySection.bucketLabel}</div>
                <div className='mt-1'>{record.observation.consistencySection.acceptanceSummary}</div>
                <div className='mt-1'>{record.observation.consistencySection.note}</div>
              </div>

              <div className='mt-4 rounded-xl border border-slate-200 p-4'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-semibold text-slate-900'>quoted 打回快捷登记</div>
                      <div className='mt-1 text-xs text-slate-500'>自动带入会话、报价、主路径、组合类型和试运行口径；业务只补打回分类、目标区段、原因、备注和是否转人工。</div>
                    </div>
                    <div className='flex flex-wrap gap-2 text-xs text-slate-600'>
                      <span className='rounded-full bg-white px-3 py-1'>会话 #{record.conversationId}</span>
                      {record.quoteId && <span className='rounded-full bg-white px-3 py-1'>报价 #{record.quoteId}</span>}
                      <span className='rounded-full bg-white px-3 py-1'>{buildRecordContextSnapshot(record).currentPathLabel}</span>
                      <span className='rounded-full bg-white px-3 py-1'>{buildRecordContextSnapshot(record).bundleTypeLabel}</span>
                    </div>
                  </div>
                  <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                    <label className='text-sm text-slate-700'>
                      打回分类
                      <select
                        value={rejectionCategories[record.conversationId] ?? (record.rejectionCategory as TrialReviewRejectionCategory | null) ?? 'other'}
                        onChange={(event) => setRejectionCategories((current) => ({ ...current, [record.conversationId]: event.target.value as TrialReviewRejectionCategory }))}
                        className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                      >
                        {TRIAL_REJECTION_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className='text-sm text-slate-700'>
                      打回目标区段
                      <select
                        value={targetAreas[record.conversationId] ?? (record.rejectionTargetArea as TrialReviewTargetArea | null) ?? 'unknown'}
                        onChange={(event) => setTargetAreas((current) => ({ ...current, [record.conversationId]: event.target.value as TrialReviewTargetArea }))}
                        className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                      >
                        {TRIAL_TARGET_AREA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className='text-sm text-slate-700 lg:col-span-2'>
                      打回原因
                      <input
                        value={rejectionReasons[record.conversationId] ?? record.rejectionReason ?? ''}
                        onChange={(event) => setRejectionReasons((current) => ({ ...current, [record.conversationId]: event.target.value }))}
                        placeholder='如：客户反馈当前正式报价偏高，要求回到参考报价或人工复核。'
                        className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                      />
                    </label>
                    <label className='flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 lg:col-span-2'>
                      <input
                        type='checkbox'
                        checked={manualFollowups[record.conversationId] ?? record.requiresHumanReview}
                        onChange={(event) => setManualFollowups((current) => ({ ...current, [record.conversationId]: event.target.checked }))}
                        className='h-4 w-4 rounded border-slate-300'
                      />
                      打回后仍需人工继续跟进
                    </label>
                  </div>
                </div>
                <label className='mt-4 block text-sm text-slate-700'>
                  处理备注
                  <textarea
                    value={notes[record.conversationId] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [record.conversationId]: event.target.value }))}
                    placeholder='填写这次复核的处理说明，例如“已电话确认，先按参考报价继续跟进”。'
                    className='mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  />
                </label>
                <div className='mt-2 text-xs text-slate-500'>建议写清楚处理结论和原因，便于后续回放、交接和台账复盘。</div>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <button
                    onClick={() => handleQuickQuotedFeedback(record)}
                    disabled={updatingConversationId === record.conversationId || operatorMissing || !(rejectionReasons[record.conversationId] ?? record.rejectionReason ?? '').trim()}
                    className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300'
                  >
                    记为 quoted 反馈
                  </button>
                  <button
                    onClick={() => handleAction(record.conversationId, 'MANUAL_CONFIRMED')}
                    disabled={updatingConversationId === record.conversationId || operatorMissing}
                    className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300'
                  >
                    人工确认
                  </button>
                  <button
                    onClick={() => handleAction(record.conversationId, 'RETURNED_AS_ESTIMATE')}
                    disabled={updatingConversationId === record.conversationId || operatorMissing}
                    className='rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300'
                  >
                    保留参考报价
                  </button>
                  <button
                    onClick={() => handleAction(record.conversationId, 'HANDOFF_TO_HUMAN')}
                    disabled={updatingConversationId === record.conversationId || operatorMissing}
                    className='rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300'
                  >
                    转人工处理
                  </button>
                  <button
                    onClick={() => handleAction(record.conversationId, 'CLOSED')}
                    disabled={updatingConversationId === record.conversationId || operatorMissing}
                    className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
                  >
                    关闭
                  </button>
                </div>
                {operatorMissing && <div className='mt-3 text-xs text-amber-700'>请先填写处理人，按钮才会解锁并写入留痕。</div>}
                {!operatorMissing && !(rejectionReasons[record.conversationId] ?? record.rejectionReason ?? '').trim() && (
                  <div className='mt-3 text-xs text-slate-500'>quoted 打回快捷登记至少需要填写打回原因。</div>
                )}
              </div>

              {record.auditLogs.length > 0 && (
                <div className='mt-4 rounded-xl bg-slate-50 p-4'>
                  <div className='text-sm font-semibold text-slate-900'>流转留痕</div>
                  <div className='mt-3 space-y-2'>
                    {record.auditLogs.map((log) => (
                      <div key={log.id} className='rounded-lg bg-white px-3 py-2 text-sm text-slate-700'>
                        <div className='font-medium text-slate-900'>{log.actionLabel}</div>
                        <div className='mt-1 text-slate-500'>流转：{log.transitionLabel}</div>
                        <div className='mt-1 text-slate-500'>{new Date(log.createdAt).toLocaleString()}</div>
                        {log.operatorName && <div className='mt-1 text-slate-500'>处理人：{log.operatorName}</div>}
                        {log.note && <div className='mt-1 text-slate-500'>备注：{log.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}