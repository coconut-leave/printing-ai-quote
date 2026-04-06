'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type ConversationDetailPayload, normalizeConversationDetailPayload } from '@/lib/admin/conversationDetail'
import { ReflectionBusinessFeedbackForm } from '@/components/ReflectionBusinessFeedbackForm'
import {
  buildConversationPresentation,
  getConversationStatusLabel,
  getQuoteRecordStatusLabel,
  getReflectionRecordStatusLabel,
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
                <div>单价：¥{item.unitPrice}</div>
                <div>小计：¥{item.lineTotal}</div>
              </div>
            </div>
            <div className='mt-2 grid gap-2 md:grid-cols-2'>
              <div>材质 / 克重：{item.materialWeightSummary}</div>
              <div>印色：{item.printColorSummary}</div>
              <div>工艺：{item.processSummary}</div>
              <div>开机费：¥{item.setupCost} / 运行费：¥{item.runCost}</div>
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
  const [reflectionIssueType, setReflectionIssueType] = useState<ReflectionIssueType>('PARAM_WRONG')
  const [businessFeedback, setBusinessFeedback] = useState<ReflectionBusinessFeedback>({ shouldHandoff: 'unsure' })
  const [packagingDraft, setPackagingDraft] = useState<PackagingCorrectedParamsDraft | null>(null)

  const params = useParams<{ id: string | string[] }>()
  const rawConversationId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const conversationId = Number(rawConversationId)
  const latestHandoff = conversation?.handoffs?.[0]
  const latestCustomerMessage = conversation?.messages
    ?.filter((message) => message.sender === 'CUSTOMER')
    .slice(-1)[0]
  const latestAssistantMessage = conversation?.messages
    ?.filter((message) => message.sender === 'ASSISTANT')
    .slice(-1)[0]
  const latestQuote = conversation?.quotes?.[0]
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
        setError(data.message || '生成反思记录失败')
        return
      }

      setPackagingDraft(null)
  setBusinessFeedback({ shouldHandoff: 'unsure' })
      setSuccessMessage(`反思记录 #${data.data.id} 已创建，可前往反思记录页或学习看板继续查看。`)
      await loadConversation()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成反思记录失败')
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
            <p className='mt-2 text-sm text-slate-600'>{conversationPresentation?.topicSummary || '查看当前会话的消息、报价、人工接管和反思记录。'}</p>
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
              查看反思记录
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

        {/* 反思记录 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='text-lg font-semibold'>反思记录 ({conversation.reflections?.length || 0})</h2>
              <p className='mt-1 text-sm text-slate-500'>在当前会话详情中可直接生成反思记录，生成后可在反思记录页与学习看板继续查看。</p>
            </div>
            <button
              type='button'
              onClick={handleGenerateReflection}
              disabled={reflectionLoading}
              className='rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {reflectionLoading ? '生成中...' : '生成反思记录'}
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
                当前会话带有复杂包装结构，系统会在后台自动保留现有包装上下文，并把您填写的业务反馈一起写入反思记录，无需手动编辑 JSON。
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
                <p className='mb-2 text-sm'><span className='font-medium'>反思：</span>{item.reflectionText}</p>
                <p className='text-sm'><span className='font-medium'>建议草案：</span>{item.suggestionDraft}</p>
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
              <p className='text-gray-500'>暂无反思记录</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}