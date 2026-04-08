'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type ConversationDetailPayload, normalizeConversationDetailPayload } from '@/lib/admin/conversationDetail'
import { ReflectionBusinessFeedbackForm } from '@/components/ReflectionBusinessFeedbackForm'
import {
  buildQuotedFeedbackContextSnapshot,
  buildQuotedFeedbackStructuredFields,
  TRIAL_REJECTION_CATEGORY_OPTIONS,
  TRIAL_TARGET_AREA_OPTIONS,
  type TrialReviewRejectionCategory,
  type TrialReviewTargetArea,
} from '@/lib/trialReviews/quotedFeedbackQuickEntry'
import {
  buildConversationPresentation,
  getConversationStatusLabel,
  getQuoteRecordStatusLabel,
  getTrialReviewCalibrationSignalLabel,
  getTrialReviewDriftDirectionLabel,
  getReflectionRecordStatusLabel,
  getTrialReviewActionLabel,
  getTrialReviewManualConfirmationResultLabel,
  getTrialReviewRejectionCategoryLabel,
  getTrialReviewSourceKindLabel,
  getTrialReviewStatusLabel,
  getTrialReviewTargetAreaLabel,
} from '@/lib/admin/presentation'
import { formatParamsByProduct, getMissingFieldsChineseText } from '@/lib/catalog/helpers'
import { AdminPageNav } from '@/components/AdminPageNav'
import { HandoffRequestPanel } from '@/components/HandoffRequestPanel'
import { PackagingReflectionDiff } from '@/components/PackagingReflectionDiff'
import {
  buildReflectionBusinessCorrectedParams,
  buildReflectionBusinessFeedbackSummary,
  extractReflectionBusinessFeedback,
  type ReflectionBusinessFeedback,
} from '@/lib/reflection/businessFeedback'
import { buildReflectionContextSummary } from '@/lib/reflection/context'
import {
  buildPackagingDraftSeed,
  resolvePackagingDraftOnIssueTypeChange,
} from '@/lib/reflection/packagingEditorState'
import {
  buildPackagingCorrectedParamsPayload,
  type PackagingCorrectedParamsDraft,
} from '@/lib/reflection/packagingCorrectedParams'
import {
  isPackagingReflectionIssueType,
  REFLECTION_ISSUE_TYPE_OPTIONS,
  getReflectionIssueTypeLabel,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'
import {
  buildPackagingReviewSummaryFromQuoteRecord,
  normalizePackagingReviewSummaryView,
  type PackagingReviewSummaryView,
} from '@/lib/packaging/reviewSummary'

function formatParams(params: any, productType?: string): string {
  if (!params) return ''
  return formatParamsByProduct(productType, params)
}

function ParameterInfo({ message }: { message: any }) {
  const metadata = message.metadata as any
  if (!metadata) return null

  const { extractedParams, mergedParams, quoteParams, missingFields } = metadata
  const productType = quoteParams?.productType || mergedParams?.productType || extractedParams?.productType
  const packagingReview = normalizePackagingReviewSummaryView(metadata.packagingReview)

  return (
    <div className='mt-3 space-y-2 rounded bg-slate-100 p-3 text-xs'>
      {extractedParams && Object.keys(extractedParams).length > 0 && (
        <div>
          <div className='font-semibold text-slate-700'>本轮抽取参数：</div>
          <div className='text-slate-600'>{formatParams(extractedParams, productType)}</div>
        </div>
      )}
      {missingFields && missingFields.length > 0 && (
        <div>
          <div className='font-semibold text-red-600'>缺失字段：</div>
          <div className='text-red-600'>{getMissingFieldsChineseText(productType, missingFields)}</div>
        </div>
      )}
      {mergedParams && Object.keys(mergedParams).length > 0 && (
        <div>
          <div className='font-semibold text-slate-700'>合并后参数：</div>
          <div className='text-slate-600'>{formatParams(mergedParams, productType)}</div>
        </div>
      )}
      {quoteParams && Object.keys(quoteParams).length > 0 && (
        <div>
          <div className='font-semibold text-green-700'>报价用参数：</div>
          <div className='text-green-600'>{formatParams(quoteParams, productType)}</div>
        </div>
      )}
      {packagingReview && <PackagingReviewCard summary={packagingReview} compact />}
      {metadata.packagingReview && !packagingReview && (
        <div className='rounded border border-slate-200 bg-white px-3 py-2 text-slate-500'>暂无结构化包装说明</div>
      )}
    </div>
  )
}

function PackagingReviewCard({
  summary,
  compact = false,
}: {
  summary: PackagingReviewSummaryView
  compact?: boolean
}) {
  return (
    <div className={`rounded border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-900'>包装报价说明</p>
          <p className='mt-1 text-sm text-slate-700'>{summary.statusLabel}：{summary.statusReasonText}</p>
          {summary.conciseExplanation && (
            <p className='mt-1 text-sm text-slate-600'>{summary.conciseExplanation}</p>
          )}
        </div>
        <div className='rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white'>
          {summary.statusLabel}
        </div>
      </div>

      {!compact && (
        <div className='mt-3 grid gap-3 md:grid-cols-2'>
          <div className='rounded bg-slate-50 p-3 text-sm text-slate-700'>
            {summary.mainItem && <div>主件：{summary.mainItem.title}</div>}
            {summary.subItems.length > 0 && <div>配套件：{summary.subItems.map((item) => item.title).join('、')}</div>}
            {typeof summary.subtotal === 'number' && <div>产品小计：¥{summary.subtotal}</div>}
            {typeof summary.shippingFee === 'number' && <div>运费：¥{summary.shippingFee}</div>}
            {typeof summary.finalPrice === 'number' && <div>最终价格：¥{summary.finalPrice}</div>}
            {typeof summary.totalUnitPrice === 'number' && <div>{summary.lineItems.length > 1 ? '组合单套价' : '总单价'}：¥{summary.totalUnitPrice}</div>}
          </div>
          {(summary.reviewReasons.length > 0 || summary.reviewFlags.length > 0) && (
            <div className='rounded bg-amber-50 p-3 text-sm text-amber-900'>
              <p className='font-semibold'>复核原因</p>
              <div className='mt-2 space-y-1'>
                {summary.reviewReasons.map((reason) => (
                  <div key={`${reason.code}-${reason.itemTitle || 'overall'}`}>{reason.message}</div>
                ))}
                {summary.reviewReasons.length === 0 && summary.reviewFlags.map((flag) => (
                  <div key={flag}>{flag}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className='mt-3 space-y-2'>
        {summary.missingDetails.map((detail) => (
          <div key={`${detail.itemIndex}-${detail.productType}`} className='rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-900'>
            {detail.itemLabel} 仍缺少：{detail.fieldsText}
          </div>
        ))}
        {summary.lineItems.map((item, index) => (
          <div key={`${item.itemType}-${index}`} className='rounded bg-slate-50 p-3 text-sm text-slate-700'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='font-semibold text-slate-900'>{item.title}</div>
                <div className='text-slate-600'>{item.normalizedSpecSummary}</div>
              </div>
              <div className='text-right'>
                <div>数量：{item.quantity}</div>
                {item.chargeQuantity && item.chargeQuantity !== item.quantity && <div>计费数：{item.chargeQuantity}</div>}
                <div>单价：¥{item.unitPrice}</div>
                <div>小计：¥{item.lineTotal}</div>
              </div>
            </div>
            <div className='mt-2 grid gap-2 md:grid-cols-2'>
              <div>材质 / 克重：{item.materialWeightSummary}</div>
              <div>印色：{item.printColorSummary}</div>
              <div>工艺：{item.processSummary}</div>
              <div>开机费：¥{item.setupCost} / 运行费：¥{item.runCost}{typeof item.costSubtotal === 'number' ? ` / 成本小计：¥${item.costSubtotal}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ConversationDetailPage() {
  const [conversation, setConversation] = useState<ConversationDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [quotedFeedbackSubmitting, setQuotedFeedbackSubmitting] = useState(false)
  const [trialOperatorName, setTrialOperatorName] = useState('')
  const [quotedFeedbackReason, setQuotedFeedbackReason] = useState('')
  const [quotedFeedbackNote, setQuotedFeedbackNote] = useState('')
  const [quotedFeedbackCategory, setQuotedFeedbackCategory] = useState<TrialReviewRejectionCategory>('other')
  const [quotedFeedbackTargetArea, setQuotedFeedbackTargetArea] = useState<TrialReviewTargetArea>('unknown')
  const [quotedFeedbackManualFollowup, setQuotedFeedbackManualFollowup] = useState(false)
  const [reflectionIssueType, setReflectionIssueType] = useState<ReflectionIssueType>('PARAM_WRONG')
  const [businessFeedback, setBusinessFeedback] = useState<ReflectionBusinessFeedback>({ shouldHandoff: 'unsure' })
  const [packagingDraft, setPackagingDraft] = useState<PackagingCorrectedParamsDraft | null>(null)

  const params = useParams<{ id: string | string[] }>()
  const rawConversationId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const conversationId = Number(rawConversationId)
  const latestHandoff = conversation?.handoffs?.[0]
  const trialReviewCase = conversation?.trialReviewCase
  const latestTrialReviewAudit = trialReviewCase?.auditLogs?.[0]
  const latestCustomerMessage = conversation?.messages
    ?.filter((message) => message.sender === 'CUSTOMER')
    .slice(-1)[0]
  const latestAssistantMessage = conversation?.messages
    ?.filter((message) => message.sender === 'ASSISTANT')
    .slice(-1)[0]
  const latestQuote = conversation?.quotes?.[0]
  const latestQuotePackagingReview = latestQuote ? buildPackagingReviewSummaryFromQuoteRecord({
    status: latestQuote.status,
    parameters: latestQuote.parameters,
    pricingDetails: latestQuote.pricingDetails,
  }) : null
  const hasCurrentExportableResult = Boolean(
    latestQuote
    || conversation?.messages?.some((message) => {
      const metadata = message.metadata && typeof message.metadata === 'object'
        ? message.metadata as Record<string, any>
        : undefined

      return message.sender === 'ASSISTANT'
        && ['estimated', 'quoted'].includes(String(metadata?.responseStatus || ''))
    })
  )
  const latestAssistantMetadata = latestAssistantMessage?.metadata && typeof latestAssistantMessage.metadata === 'object'
    ? latestAssistantMessage.metadata as Record<string, any>
    : undefined
  const conversationPresentation = conversation ? buildConversationPresentation({
    conversationId: conversation.id,
    status: conversation.status,
    latestMessage: latestCustomerMessage?.content || latestAssistantMessage?.content || null,
    recentMessages: [...(conversation.messages || [])]
      .slice()
      .reverse()
      .slice(0, 4)
      .map((message) => ({
        sender: message.sender,
        content: message.content,
        metadata: message.metadata,
      })),
    latestQuoteParameters: latestQuote?.parameters,
  }) : null
  const quotedFeedbackContextSnapshot = buildQuotedFeedbackContextSnapshot({
    conversationId: Number.isNaN(conversationId) ? 0 : conversationId,
    quoteId: latestQuote?.id || null,
    currentQuoteStatusLabel: latestQuote ? getQuoteRecordStatusLabel(latestQuote.status) : trialReviewCase?.currentQuoteStatusLabel,
    deliveryScopeLabel: trialReviewCase?.deliveryScopeLabel || conversationPresentation?.scopeLabel || null,
    isActiveScope: trialReviewCase?.contextSnapshot?.isActiveScope ?? true,
    packagingSummary: latestQuotePackagingReview || undefined,
    fallbackTitle: conversationPresentation?.title || `会话 ${conversationId}`,
  })
  const packagingCorrectedParams = packagingDraft
    ? buildPackagingCorrectedParamsPayload(packagingDraft)
    : undefined
  const showPackagingTemplate = isPackagingReflectionIssueType(reflectionIssueType) && Boolean(packagingCorrectedParams)

  const updateBusinessFeedbackField = (field: keyof ReflectionBusinessFeedback, value: string) => {
    setBusinessFeedback((current) => ({ ...current, [field]: value || undefined }))
  }

  const loadConversation = async () => {
    if (Number.isNaN(conversationId)) {
      setError('无效的会话 ID')
      setLoading(false)
      return
    }

    try {
      setError(null)
      const res = await fetch(`/api/conversations/${conversationId}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data.ok) {
        const normalizedConversation = normalizeConversationDetailPayload(data.data)
        if (!normalizedConversation) {
          setError('会话详情数据格式无效')
          return
        }

        setConversation(normalizedConversation)
      } else {
        setError(data.message || '获取会话详情失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (Number.isNaN(conversationId)) {
      setError('无效的会话 ID')
      setLoading(false)
      return
    }

    setLoading(true)
    void loadConversation()
  }, [conversationId])

  useEffect(() => {
    if (!conversation) {
      setPackagingDraft(null)
      return
    }

    setPackagingDraft(buildPackagingDraftSeed({
      issueType: isPackagingReflectionIssueType(reflectionIssueType)
        ? reflectionIssueType
        : 'PACKAGING_PARAM_WRONG',
      metadata: latestAssistantMetadata,
      latestQuote,
    }))
  }, [conversation?.id, conversation?.updatedAt, latestAssistantMessage?.id, latestQuote?.id])

  useEffect(() => {
    setPackagingDraft((current) => resolvePackagingDraftOnIssueTypeChange({
      nextIssueType: reflectionIssueType,
      currentDraft: current,
      seedDraft: buildPackagingDraftSeed({
        issueType: reflectionIssueType,
        metadata: latestAssistantMetadata,
        latestQuote,
      }),
    }))
  }, [reflectionIssueType, latestAssistantMessage?.id, latestQuote?.id])

  useEffect(() => {
    setQuotedFeedbackReason(trialReviewCase?.rejectionReason || '')
    setQuotedFeedbackNote(trialReviewCase?.lastActionNote || '')
    setQuotedFeedbackCategory((trialReviewCase?.rejectionCategory as TrialReviewRejectionCategory | null) || 'other')
    setQuotedFeedbackTargetArea((trialReviewCase?.rejectionTargetArea as TrialReviewTargetArea | null) || 'unknown')
    setQuotedFeedbackManualFollowup(trialReviewCase?.requiresHumanReview || false)
    setTrialOperatorName(trialReviewCase?.operatorName || '')
  }, [conversation?.id, trialReviewCase?.updatedAt])

  const handleQuotedFeedbackQuickEntry = async () => {
    if (!conversation || Number.isNaN(conversationId) || quotedFeedbackSubmitting) {
      return
    }

    if (!trialOperatorName.trim()) {
      setError('请先填写处理人，再登记 quoted 打回。')
      return
    }

    if (!quotedFeedbackReason.trim()) {
      setError('请先填写打回原因，再登记 quoted 打回。')
      return
    }

    const structuredFields = buildQuotedFeedbackStructuredFields({
      contextSnapshot: quotedFeedbackContextSnapshot,
      rejectionCategory: quotedFeedbackCategory,
      targetArea: quotedFeedbackTargetArea,
      manualFollowupRequired: quotedFeedbackManualFollowup,
    })

    try {
      setQuotedFeedbackSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      const res = await fetch(`/api/trial-reviews/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          status: structuredFields.status,
          sourceKind: structuredFields.sourceKind,
          operatorName: trialOperatorName.trim(),
          note: quotedFeedbackNote,
          manualConfirmationResult: structuredFields.manualConfirmationResult,
          rejectionReason: quotedFeedbackReason,
          rejectionCategory: structuredFields.rejectionCategory,
          rejectionTargetArea: structuredFields.rejectionTargetArea,
          calibrationSignal: structuredFields.calibrationSignal,
          driftSourceCandidate: structuredFields.driftSourceCandidate,
          driftDirection: structuredFields.driftDirection || '',
          requiresHumanReview: structuredFields.requiresHumanReview,
          contextSnapshot: structuredFields.contextSnapshot,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || '登记 quoted 打回失败')
        return
      }

      setSuccessMessage('当前订单已登记 quoted 打回，并写入复核留痕。')
      await loadConversation()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登记 quoted 打回失败')
    } finally {
      setQuotedFeedbackSubmitting(false)
    }
  }

  const handleGenerateReflection = async () => {
    if (!conversation || reflectionLoading) return

    let correctedParams: Record<string, any> | undefined
    correctedParams = buildReflectionBusinessCorrectedParams({
      correctedParams: showPackagingTemplate && packagingCorrectedParams ? packagingCorrectedParams : undefined,
      businessFeedback,
    })

    setReflectionLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`/api/conversations/${conversationId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          issueType: reflectionIssueType,
          businessFeedback,
          correctedParams,
          correctedQuoteSummary: businessFeedback.correctResult || buildReflectionBusinessFeedbackSummary(businessFeedback) || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.message || '生成学习记录失败')
        return
      }

      setPackagingDraft(null)
        setBusinessFeedback({ shouldHandoff: 'unsure' })
      setSuccessMessage(`学习记录 #${data.data.id} 已创建，可前往学习记录页或学习看板继续查看。`)
      await loadConversation()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成学习记录失败')
    } finally {
      setReflectionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className='min-h-screen bg-slate-50 p-4'>
        <div className='mx-auto max-w-4xl'>
          <p>加载中...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className='min-h-screen bg-slate-50 p-4'>
        <div className='mx-auto max-w-4xl'>
          <div className='rounded bg-red-100 p-4 text-red-800'>
            <p>错误：{error}</p>
          </div>
          <Link href='/conversations' className='mt-4 inline-block text-blue-600 hover:underline'>
            返回会话列表
          </Link>
        </div>
      </main>
    )
  }

  if (!conversation) {
    return (
      <main className='min-h-screen bg-slate-50 p-4'>
        <div className='mx-auto max-w-4xl'>
          <div className='rounded bg-yellow-100 p-4 text-yellow-800'>
            <p>会话不存在</p>
          </div>
          <Link href='/conversations' className='mt-4 inline-block text-blue-600 hover:underline'>
            返回会话列表
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className='min-h-screen bg-slate-50 p-4'>
      <div className='mx-auto max-w-4xl space-y-6'>
        <AdminPageNav current='conversations' />
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold'>{conversationPresentation?.title || `会话详情 ${conversation.id}`}</h1>
            <p className='mt-2 text-sm text-slate-600'>{conversationPresentation?.topicSummary || '查看当前会话的消息、报价、人工接管、当前订单打回留痕和学习记录。'}</p>
          </div>
          <div className='flex gap-3 text-sm'>
            <Link href='/conversations' className='text-blue-600 hover:underline'>
              返回列表
            </Link>
            {hasCurrentExportableResult && (
              <a
                href={`/api/conversations/${conversation.id}/export`}
                className='rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-800 hover:bg-emerald-100'
              >
                导出当前结果 Excel
              </a>
            )}
            <Link href='/reflections' className='text-blue-600 hover:underline'>
              查看学习记录
            </Link>
            <Link href='/learning-dashboard' className='text-blue-600 hover:underline'>
              查看学习看板
            </Link>
          </div>
        </div>

        {successMessage && (
          <div className='rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800'>
            {successMessage}
          </div>
        )}

        {/* 会话基本信息 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>基本信息</h2>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='font-medium'>状态：</span>
              <span className={`ml-2 rounded px-3 py-1 font-medium ${
                conversation.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                conversation.status === 'MISSING_FIELDS' ? 'bg-yellow-100 text-yellow-800' :
                conversation.status === 'QUOTED' ? 'bg-green-100 text-green-800' :
                conversation.status === 'PENDING_HUMAN' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {getConversationStatusLabel(conversation.status)}
              </span>
            </div>
            <div>
              <span className='font-medium'>当前归类：</span>
              <span className='ml-2 rounded bg-slate-100 px-3 py-1 font-medium text-slate-700'>
                {conversationPresentation?.scopeLabel || '待人工归类'}
              </span>
            </div>
            <div>
              <span className='font-medium'>创建时间：</span>
              {new Date(conversation.createdAt).toLocaleString()}
            </div>
            <div>
              <span className='font-medium'>更新时间：</span>
              {new Date(conversation.updatedAt).toLocaleString()}
            </div>
            <div>
              <span className='font-medium'>试运行复核：</span>
              <span className='ml-2 rounded bg-amber-100 px-3 py-1 font-medium text-amber-900'>
                {trialReviewCase ? getTrialReviewStatusLabel(trialReviewCase.status) : '暂无复核留痕'}
              </span>
            </div>
            <div>
              <span className='font-medium'>最近复核动作：</span>
              {latestTrialReviewAudit ? getTrialReviewActionLabel(latestTrialReviewAudit.actionType) : '暂无'}
            </div>
          </div>

          <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4'>
            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
              <div>
                <p className='text-sm font-semibold text-amber-950'>试运行复核状态</p>
                {trialReviewCase ? (
                  <div className='mt-2 space-y-1 text-sm text-amber-900'>
                    <div>当前状态：{getTrialReviewStatusLabel(trialReviewCase.status)}</div>
                    <div>复核来源：{getTrialReviewSourceKindLabel(trialReviewCase.sourceKind)}</div>
                    {trialReviewCase.currentQuoteStatusLabel && <div>当前口径：{trialReviewCase.currentQuoteStatusLabel}</div>}
                    {trialReviewCase.deliveryScopeLabel && <div>交付口径：{trialReviewCase.deliveryScopeLabel}</div>}
                    {trialReviewCase.operatorName && <div>处理人：{trialReviewCase.operatorName}</div>}
                    {latestTrialReviewAudit && <div>最近动作：{getTrialReviewActionLabel(latestTrialReviewAudit.actionType)}</div>}
                    {trialReviewCase.manualConfirmationResult && <div>人工确认结论：{getTrialReviewManualConfirmationResultLabel(trialReviewCase.manualConfirmationResult)}</div>}
                    {trialReviewCase.lastActionNote && <div>处理备注：{trialReviewCase.lastActionNote}</div>}
                    {trialReviewCase.rejectionReason && <div>打回原因：{trialReviewCase.rejectionReason}</div>}
                    {trialReviewCase.rejectionCategory && <div>打回分类：{getTrialReviewRejectionCategoryLabel(trialReviewCase.rejectionCategory)}</div>}
                    {trialReviewCase.rejectionTargetArea && <div>打回目标区段：{getTrialReviewTargetAreaLabel(trialReviewCase.rejectionTargetArea)}</div>}
                    {trialReviewCase.calibrationSignal && <div>Calibration 信号：{getTrialReviewCalibrationSignalLabel(trialReviewCase.calibrationSignal)}</div>}
                    {trialReviewCase.driftSourceCandidate && <div>疑似漂移源：{trialReviewCase.driftSourceCandidate}</div>}
                    {trialReviewCase.driftDirection && <div>同向漂移方向：{getTrialReviewDriftDirectionLabel(trialReviewCase.driftDirection)}</div>}
                    {trialReviewCase.contextSnapshot?.currentPathLabel && <div>当前主路径：{String(trialReviewCase.contextSnapshot.currentPathLabel)}</div>}
                    {trialReviewCase.contextSnapshot?.bundleTypeLabel && <div>组合类型：{String(trialReviewCase.contextSnapshot.bundleTypeLabel)}</div>}
                    {'isActiveScope' in (trialReviewCase.contextSnapshot || {}) && <div>试运行范围：{trialReviewCase.contextSnapshot?.isActiveScope ? '当前范围内' : '当前范围外'}</div>}
                    {trialReviewCase.queueReason && <div>入队原因：{trialReviewCase.queueReason}</div>}
                    {trialReviewCase.manualConfirmedAt && <div>人工确认时间：{new Date(trialReviewCase.manualConfirmedAt).toLocaleString()}</div>}
                    {trialReviewCase.closedAt && <div>关闭时间：{new Date(trialReviewCase.closedAt).toLocaleString()}</div>}
                  </div>
                ) : (
                  <div className='mt-2 space-y-1 text-sm text-amber-900'>
                    <div>当前详情页还没有复核留痕。</div>
                    <div>如该会话属于参考报价、人工处理或人工跟进路径，请到试运行复核队列确认状态。</div>
                  </div>
                )}
              </div>
              <div className='flex gap-2'>
                <Link href='/trial-reviews' className='rounded border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 hover:bg-amber-100'>
                  打开复核队列
                </Link>
              </div>
            </div>
          </div>

          <div className='mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4'>
            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
              <div>
                <p className='text-sm font-semibold text-slate-900'>当前订单 quoted 打回快捷登记</p>
                <p className='mt-1 text-sm text-slate-600'>这里只处理当前订单的打回动作。系统会自动带入会话、报价、主路径、组合类型、当前口径和试运行范围。</p>
              </div>
              <Link href='/trial-reviews' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100'>
                查看周度归档
              </Link>
            </div>

            <div className='mt-4 flex flex-wrap gap-2 text-xs text-slate-600'>
              <span className='rounded-full bg-white px-3 py-1'>会话 #{conversation.id}</span>
              {quotedFeedbackContextSnapshot.quoteId && <span className='rounded-full bg-white px-3 py-1'>报价 #{quotedFeedbackContextSnapshot.quoteId}</span>}
              <span className='rounded-full bg-white px-3 py-1'>{quotedFeedbackContextSnapshot.currentPathLabel}</span>
              <span className='rounded-full bg-white px-3 py-1'>{quotedFeedbackContextSnapshot.bundleTypeLabel}</span>
              <span className='rounded-full bg-white px-3 py-1'>{quotedFeedbackContextSnapshot.currentQuoteStatusLabel}</span>
              <span className='rounded-full bg-white px-3 py-1'>{quotedFeedbackContextSnapshot.deliveryScopeLabel}</span>
              <span className='rounded-full bg-white px-3 py-1'>{quotedFeedbackContextSnapshot.isActiveScope ? 'trial 范围内' : 'trial 范围外'}</span>
            </div>

            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <label className='text-sm text-slate-700'>
                处理人
                <input
                  value={trialOperatorName}
                  onChange={(event) => setTrialOperatorName(event.target.value)}
                  placeholder='如 张三 / sales-01'
                  className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                />
              </label>
              <label className='text-sm text-slate-700'>
                打回分类
                <select
                  value={quotedFeedbackCategory}
                  onChange={(event) => setQuotedFeedbackCategory(event.target.value as TrialReviewRejectionCategory)}
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
                  value={quotedFeedbackTargetArea}
                  onChange={(event) => setQuotedFeedbackTargetArea(event.target.value as TrialReviewTargetArea)}
                  className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                >
                  {TRIAL_TARGET_AREA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className='text-sm text-slate-700'>
                打回原因
                <input
                  value={quotedFeedbackReason}
                  onChange={(event) => setQuotedFeedbackReason(event.target.value)}
                  placeholder='如：客户反馈当前正式报价偏高，需要回退或人工确认。'
                  className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                />
              </label>
              <label className='text-sm text-slate-700 md:col-span-2'>
                处理备注
                <textarea
                  value={quotedFeedbackNote}
                  onChange={(event) => setQuotedFeedbackNote(event.target.value)}
                  placeholder='记录客户反馈、业务判断和后续跟进动作。'
                  className='mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
                />
              </label>
              <label className='flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 md:col-span-2'>
                <input
                  type='checkbox'
                  checked={quotedFeedbackManualFollowup}
                  onChange={(event) => setQuotedFeedbackManualFollowup(event.target.checked)}
                  className='h-4 w-4 rounded border-slate-300'
                />
                打回后需要人工继续跟进
              </label>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-3'>
              <button
                type='button'
                onClick={handleQuotedFeedbackQuickEntry}
                disabled={quotedFeedbackSubmitting || !trialOperatorName.trim() || !quotedFeedbackReason.trim()}
                className='rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {quotedFeedbackSubmitting ? '登记中...' : '登记当前订单打回'}
              </button>
              <div className='text-xs text-slate-500'>登记后会同步写入 review observation、audit trail 和周度 drift 归档；不会替代学习记录。</div>
            </div>
          </div>

          {(conversation.status === 'PENDING_HUMAN' || conversation.handoffs.length > 0) && (
            <div className='mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div>
                  <p className='text-sm font-semibold text-orange-900'>人工处理入口</p>
                  <p className='mt-1 text-sm text-orange-800'>
                    当前会话已经存在人工处理状态或人工接管记录，可直接查看说明，必要时补充一条人工备注。
                  </p>
                </div>
                <HandoffRequestPanel
                  conversationId={conversation.id}
                  statusLabel={getConversationStatusLabel(conversation.status)}
                  summary={conversationPresentation?.topicSummary || latestCustomerMessage?.content || `会话 ${conversation.id} 当前暂无客户摘要。`}
                  reason={latestHandoff?.reason || '当前会话需要人工客服继续跟进。'}
                  assignedTo={latestHandoff?.assignedTo || undefined}
                  existingHandoffCount={conversation.handoffs.length}
                  alreadyPending={conversation.status === 'PENDING_HUMAN'}
                  triggerLabel='查看人工处理说明'
                  onSubmitted={loadConversation}
                />
              </div>
            </div>
          )}
        </div>

        {/* 消息历史 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>消息历史 ({conversation.messages.length})</h2>
          <div className='space-y-3'>
            {conversation.messages.map((message) => (
              <div key={message.id} className='rounded border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    message.sender === 'CUSTOMER' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {message.sender === 'CUSTOMER' ? '客户' : '助手'}
                  </span>
                  <span className='text-xs text-gray-500'>
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className='text-sm whitespace-pre-wrap'>{message.content}</p>
                <ParameterInfo message={message} />
              </div>
            ))}
          </div>
        </div>

        {/* 报价记录 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>报价记录 ({conversation.quotes.length})</h2>
          <div className='space-y-3'>
            {conversation.quotes.map((quote) => (
              <div key={quote.id} className='rounded border p-4'>
                {(() => {
                  const packagingReview = buildPackagingReviewSummaryFromQuoteRecord({
                    status: quote.status,
                    parameters: quote.parameters,
                    pricingDetails: quote.pricingDetails,
                  })

                  return (
                    <>
                <div className='mb-3 flex items-center justify-between'>
                  <span className='font-medium'>报价 #{quote.id}</span>
                  <div className='flex items-center gap-2'>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${
                      quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getQuoteRecordStatusLabel(quote.status)}
                    </span>
                    <a
                      href={`/api/quotes/${quote.id}/export`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-block rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 transition-colors'
                      title='在新窗口中打开报价单'
                    >
                      📄 查看报价单
                    </a>
                    <a
                      href={`/api/quotes/${quote.id}/export?format=xlsx`}
                      className='inline-block rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-100 transition-colors'
                      title='导出 Excel 报价单'
                    >
                      导出 Excel
                    </a>
                  </div>
                </div>
                <div className='grid grid-cols-4 gap-4 text-sm'>
                  <div>
                    <span className='font-medium'>产品小计：</span>
                    ¥{(quote.subtotalCents / 100).toFixed(2)}
                  </div>
                  <div>
                    <span className='font-medium'>运费：</span>
                    ¥{(quote.shippingCents / 100).toFixed(2)}
                  </div>
                  <div>
                    <span className='font-medium'>税费：</span>
                    ¥{(quote.taxCents / 100).toFixed(2)}
                  </div>
                  <div>
                    <span className='font-medium'>总计：</span>
                    ¥{(quote.totalCents / 100).toFixed(2)}
                  </div>
                </div>
                <div className='mt-2 text-xs text-gray-500'>
                  创建时间：{new Date(quote.createdAt).toLocaleString()}
                </div>
                      {packagingReview && (
                        <div className='mt-4'>
                          <PackagingReviewCard summary={packagingReview} />
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            ))}
            {conversation.quotes.length === 0 && (
              <p className='text-gray-500'>暂无报价记录</p>
            )}
          </div>
        </div>

        {/* 人工接管记录 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>人工接管记录 ({conversation.handoffs.length})</h2>
          <div className='space-y-3'>
            {conversation.handoffs.map((handoff) => (
              <div key={handoff.id} className='rounded border p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='font-medium'>接管 #{handoff.id}</span>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    handoff.resolved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {handoff.resolved ? '已解决' : '进行中'}
                  </span>
                </div>
                <p className='mb-2 text-sm'><span className='font-medium'>原因：</span>{handoff.reason}</p>
                {handoff.assignedTo && (
                  <p className='mb-2 text-sm'><span className='font-medium'>分配给：</span>{handoff.assignedTo}</p>
                )}
                <div className='text-xs text-gray-500'>
                  创建时间：{new Date(handoff.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {conversation.handoffs.length === 0 && (
              <p className='text-gray-500'>暂无人工接管记录</p>
            )}
          </div>
        </div>

        {trialReviewCase && trialReviewCase.auditLogs.length > 0 && (
          <div className='rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-lg font-semibold'>试运行复核留痕 ({trialReviewCase.auditLogs.length})</h2>
            <div className='space-y-3'>
              {trialReviewCase.auditLogs.map((audit) => (
                <div key={audit.id} className='rounded border p-4'>
                  <div className='mb-2 flex items-center justify-between'>
                    <span className='font-medium'>{getTrialReviewActionLabel(audit.actionType)}</span>
                    <span className='rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700'>
                      {getTrialReviewStatusLabel(audit.toStatus)}
                    </span>
                  </div>
                  {audit.operatorName && <p className='mb-2 text-sm'><span className='font-medium'>处理人：</span>{audit.operatorName}</p>}
                  {audit.note && <p className='mb-2 text-sm'><span className='font-medium'>备注：</span>{audit.note}</p>}
                  <div className='text-xs text-gray-500'>
                    创建时间：{new Date(audit.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 学习记录 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='text-lg font-semibold'>学习记录 ({conversation.reflections?.length || 0})</h2>
              <p className='mt-1 text-sm text-slate-500'>这里是可选的学习/复盘记录，不会直接改动当前订单处理结果；当前订单打回请使用上面的快捷登记。</p>
            </div>
            <button
              type='button'
              onClick={handleGenerateReflection}
              disabled={reflectionLoading}
              className='rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {reflectionLoading ? '生成中...' : '补一条学习记录'}
            </button>
          </div>

          <div className='mb-4 grid gap-3 rounded border p-3'>
            <ReflectionBusinessFeedbackForm
              issueType={reflectionIssueType}
              feedback={businessFeedback}
              onIssueTypeChange={(value) => setReflectionIssueType(value)}
              onFeedbackChange={updateBusinessFeedbackField}
            />

            {showPackagingTemplate && packagingDraft && (
              <div className='rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800'>
                当前会话带有复杂包装结构，系统会在后台自动保留现有包装上下文，并把您填写的业务反馈一起写入学习记录，无需手动编辑 JSON。
              </div>
            )}
          </div>

          <div className='space-y-3'>
            {(conversation.reflections || []).map((item) => (
              <div key={item.id} className='rounded border p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <div className='text-sm font-medium'>#{item.id} {getReflectionIssueTypeLabel(item.issueType)}</div>
                  <span className='rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700'>
                    {getReflectionRecordStatusLabel(item.status)}
                  </span>
                </div>
                <p className='mb-2 text-sm'><span className='font-medium'>学习内容：</span>{item.reflectionText}</p>
                <p className='text-sm'><span className='font-medium'>处理建议：</span>{item.suggestionDraft}</p>
                {extractReflectionBusinessFeedback(item.correctedParams) && (
                  <p className='mt-2 text-sm text-slate-700 whitespace-pre-wrap'>
                    <span className='font-medium'>业务反馈：</span>
                    {buildReflectionBusinessFeedbackSummary(extractReflectionBusinessFeedback(item.correctedParams))}
                  </p>
                )}
                {buildReflectionContextSummary(item.originalExtractedParams, item.correctedParams) && (
                  <p className='mt-2 text-xs text-slate-500'>
                    <span className='font-medium'>包装上下文：</span>
                    {buildReflectionContextSummary(item.originalExtractedParams, item.correctedParams)}
                  </p>
                )}
                <PackagingReflectionDiff
                  issueType={item.issueType}
                  originalExtractedParams={item.originalExtractedParams}
                  correctedParams={item.correctedParams}
                />
                <div className='mt-2 text-xs text-gray-500'>
                  创建时间：{new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {(conversation.reflections?.length || 0) === 0 && (
              <p className='text-gray-500'>暂无学习记录</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}