'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FIELD_LABELS } from '@/lib/catalog/productSchemas'
import { getDisplayParamEntries, getMissingFieldsChineseText } from '@/lib/catalog/helpers'
import { buildHomeDemoViewModel } from '@/app/homeDemoView'
import { HOME_EXAMPLE_GROUPS } from '@/app/homeExamplePrompts'
import { HandoffRequestPanel } from '@/components/HandoffRequestPanel'
import type { PackagingReviewSummaryView } from '@/lib/packaging/reviewSummary'

export default function Home() {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [lastCustomerMessage, setLastCustomerMessage] = useState('')

  const handleSend = async () => {
    if (!message.trim()) return

    const currentMessage = message.trim()

    setLoading(true)
    setResult(null)
    setLastCustomerMessage(currentMessage)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentMessage, conversationId }),
      })

      const data = await response.json()

      // Normalize API-level failures so UI can show consistent error details.
      if (!response.ok || data?.ok === false) {
        setResult({
          ok: false,
          status: data?.status || 'error',
          error: data?.error || data?.message || `请求失败（HTTP ${response.status}）`,
          code: data?.code,
          requestId: data?.requestId,
          raw: data,
        })
        return
      }

      setResult(data)
      setMessage('')
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }
    } catch (err) {
      setResult({
        ok: false,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderKeyValueBlock = (title: string, value: any, className = 'text-slate-700') => {
    if (!value) return null
    return (
      <div className='rounded-lg bg-slate-50 p-3'>
        <p className='mb-2 text-sm font-semibold text-slate-700'>{title}</p>
        <pre className={`overflow-x-auto whitespace-pre-wrap break-all text-xs font-mono ${className}`}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    )
  }

  const renderParamSection = (title: string, productType: string | undefined, params: Record<string, any> | null | undefined, tone: 'sky' | 'violet' | 'slate' = 'slate') => {
    if (!params || Object.keys(params).length === 0) return null

    const entries = getDisplayParamEntries(productType, params)
    if (entries.length === 0) return null

    const toneMap = {
      sky: {
        border: 'border-sky-200 bg-sky-50',
        label: 'text-sky-900',
        value: 'text-sky-800',
      },
      violet: {
        border: 'border-violet-200 bg-violet-50',
        label: 'text-violet-900',
        value: 'text-violet-800',
      },
      slate: {
        border: 'border-slate-200 bg-slate-50',
        label: 'text-slate-900',
        value: 'text-slate-700',
      },
    }

    const currentTone = toneMap[tone]

    return (
      <div className={`rounded-lg border p-4 ${currentTone.border}`}>
        <p className={`mb-3 text-sm font-semibold ${currentTone.label}`}>{title}</p>
        <div className='space-y-2'>
          {entries.map((entry) => (
            <div key={`${title}-${entry.field}`} className='flex items-start justify-between gap-4 text-sm'>
              <span className={`font-medium ${currentTone.label}`}>{entry.label}</span>
              <span className={`text-right ${currentTone.value}`}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMissingFieldTags = (fields: string[] = [], colorClass = 'bg-yellow-100 text-yellow-800') => (
    <div className='flex flex-wrap gap-2'>
      {fields.map((field) => (
        <span key={field} className={`rounded px-2 py-1 text-sm font-medium ${colorClass}`}>
          {FIELD_LABELS[field] || field}
        </span>
      ))}
    </div>
  )

  const getStatusGuidance = (status: string) => {
    if (status === 'quoted') {
      return {
        title: '当前状态：正式报价已生成',
        nextStep: '下一步：请确认报价参数与金额，必要时导出报价单并进入人工确认流程。',
      }
    }

    if (status === 'estimated') {
      return {
        title: '当前状态：参考报价',
        nextStep: '下一步：补齐缺失参数后，系统将生成正式报价。',
      }
    }

    if (status === 'missing_fields') {
      return {
        title: '当前状态：缺少关键参数',
        nextStep: '下一步：按缺失字段补充参数，系统将继续报价流程。',
      }
    }

    if (status === 'handoff_required') {
      return {
        title: '当前状态：人工接管',
        nextStep: '下一步：等待人工团队核价与跟进处理。',
      }
    }

    if (status === 'progress_inquiry') {
      return {
        title: '当前状态：进度答复',
        nextStep: '下一步：根据当前会话状态继续补参、查看报价，或等待人工跟进。',
      }
    }

    if (status === 'sample_request') {
      return {
        title: '当前状态：样品咨询',
        nextStep: '下一步：继续补充打样需求，或联系人工继续确认。',
      }
    }

    if (status === 'bargain_request') {
      return {
        title: '当前状态：成本优化咨询',
        nextStep: '下一步：可继续说明想调整的纸张、克重、单双面或工艺，以获取更经济的参考方案。',
      }
    }

    if (status === 'consultation_reply') {
      return {
        title: '当前状态：咨询答复',
        nextStep: '下一步：如果您认可这个建议，可以继续让我按这个方案为您估价。',
      }
    }

    if (status === 'recommendation_updated') {
      return {
        title: '当前状态：推荐方案已更新',
        nextStep: '下一步：如果需要正式或参考报价，可直接说“按这个方案报价”或“现在算一下”。',
      }
    }

    return {
      title: '当前状态：未识别',
      nextStep: '下一步：请检查输入内容或重试。',
    }
  }

  const renderEstimatedHighlights = (estimatedData: any) => {
    if (!estimatedData) return null

    const assumptions = Array.isArray(estimatedData.assumptions) ? estimatedData.assumptions : []
    const alternatives = estimatedData.alternatives && typeof estimatedData.alternatives === 'object'
      ? Object.entries(estimatedData.alternatives)
      : []

    return (
      <div className='space-y-3'>
        {estimatedData.missingHint && (
          <div className='rounded-lg bg-amber-100 p-3 text-sm text-amber-900'>
            <span className='font-semibold'>估算依据：</span>
            {estimatedData.missingHint}
          </div>
        )}

        {assumptions.length > 0 && (
          <div className='rounded-lg bg-amber-100 p-3'>
            <p className='mb-2 text-sm font-semibold text-amber-900'>默认假设</p>
            <ul className='list-disc pl-5 text-sm text-amber-900'>
              {assumptions.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {alternatives.length > 0 && (
          <div className='rounded-lg bg-amber-100 p-3'>
            <p className='mb-2 text-sm font-semibold text-amber-900'>补齐参数后的参考区间</p>
            <div className='space-y-1 text-sm text-amber-900'>
              {alternatives.map(([name, value]) => (
                <div key={name} className='flex justify-between'>
                  <span>{name}</span>
                  <span className='font-semibold'>¥{(value as any)?.finalPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderQuoteSummaryCard = (title: string, quoteData: any, tone: 'green' | 'amber') => {
    if (!quoteData) return null

    const toneMap = {
      green: {
        border: 'border-green-200 bg-green-50',
        title: 'text-green-900',
        text: 'text-green-800',
      },
      amber: {
        border: 'border-amber-200 bg-amber-50',
        title: 'text-amber-900',
        text: 'text-amber-800',
      },
    }

    const currentTone = toneMap[tone]

    return (
      <div className={`rounded-lg border p-4 ${currentTone.border}`}>
        <h3 className={`mb-3 text-base font-bold ${currentTone.title}`}>{title}</h3>
        <div className={`space-y-2 font-mono text-sm ${currentTone.text}`}>
          <div className='flex justify-between'>
            <span>{quoteData.isBundle ? '组合单套价' : '单价'}</span>
            <span>¥{quoteData.totalUnitPrice ?? quoteData.unitPrice}</span>
          </div>
          <div className='flex justify-between'>
            <span>产品小计</span>
            <span>¥{quoteData.totalPrice}</span>
          </div>
          <div className='flex justify-between'>
            <span>运费</span>
            <span>¥{quoteData.shippingFee}</span>
          </div>
          <div className='flex justify-between'>
            <span>税费</span>
            <span>¥{quoteData.tax}</span>
          </div>
          <div className='border-t border-current/20 pt-2'>
            <div className='flex justify-between text-lg font-bold'>
              <span>合计</span>
              <span>¥{quoteData.finalPrice}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBundleItems = (quoteData: any) => {
    if (!Array.isArray(quoteData?.items) || quoteData.items.length === 0) return null

    return (
      <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
        <h3 className='mb-3 text-base font-bold text-slate-900'>组合报价明细</h3>
        <div className='space-y-3'>
          {quoteData.items.map((item: any, index: number) => (
            <div key={`${item.itemType}-${index}`} className='rounded-lg bg-white p-3'>
              <div className='mb-2 flex items-center justify-between gap-3'>
                <p className='font-semibold text-slate-900'>{item.title}</p>
                <p className='text-sm font-mono text-slate-700'>¥{item.unitPrice} / 件</p>
              </div>
              <p className='text-sm text-slate-600'>小计：¥{item.totalPrice}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderReferenceFiles = (files: Array<{ fileName: string; fileUrl: string; fileCategory: string }> | undefined) => {
    if (!Array.isArray(files) || files.length === 0) return null

    return (
      <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
        <h3 className='mb-3 text-base font-bold text-slate-900'>参考文件</h3>
        <div className='space-y-2'>
          {files.map((file) => (
            <a
              key={file.fileUrl}
              href={file.fileUrl}
              target='_blank'
              rel='noreferrer'
              className='flex items-center justify-between rounded bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100'
            >
              <span>{file.fileName}</span>
              <span className='text-xs uppercase tracking-wide text-slate-500'>{file.fileCategory}</span>
            </a>
          ))}
        </div>
      </div>
    )
  }

  const renderPackagingReview = (summary: PackagingReviewSummaryView | null | undefined) => {
    if (!summary) return null

    return (
      <div className='rounded-lg border border-slate-200 bg-white p-4'>
        <div className='flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3'>
          <div>
            <h3 className='text-base font-bold text-slate-900'>包装报价说明</h3>
            <p className='mt-1 text-sm text-slate-700'>{summary.statusReasonText}</p>
            {summary.conciseExplanation && (
              <p className='mt-1 text-sm text-slate-600'>{summary.conciseExplanation}</p>
            )}
          </div>
          <div className='rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white'>
            {summary.statusLabel}
          </div>
        </div>

        <div className='mt-4 grid gap-3 md:grid-cols-2'>
          <div className='rounded-lg bg-slate-50 p-3 text-sm text-slate-700'>
            <p className='font-semibold text-slate-900'>整体结果</p>
            <div className='mt-2 space-y-1'>
              {summary.mainItem && <div>主件：{summary.mainItem.title}</div>}
              {summary.subItems.length > 0 && <div>配套件：{summary.subItems.map((item) => item.title).join('、')}</div>}
              {typeof summary.subtotal === 'number' && <div>产品小计：¥{summary.subtotal}</div>}
              {typeof summary.shippingFee === 'number' && <div>运费：¥{summary.shippingFee}</div>}
              {typeof summary.finalPrice === 'number' && <div>最终价格：¥{summary.finalPrice}</div>}
              {typeof summary.totalUnitPrice === 'number' && <div>{summary.lineItems.length > 1 ? '组合单套价' : '总单价'}：¥{summary.totalUnitPrice}</div>}
            </div>
          </div>

          {(summary.reviewReasons.length > 0 || summary.reviewFlags.length > 0) && (
            <div className='rounded-lg bg-amber-50 p-3 text-sm text-amber-900'>
              <p className='font-semibold'>复核原因</p>
              <div className='mt-2 space-y-1'>
                {summary.reviewReasons.map((reason) => (
                  <div key={`${reason.code}-${reason.itemTitle || 'overall'}`}>{reason.label}：{reason.message}</div>
                ))}
                {summary.reviewReasons.length === 0 && summary.reviewFlags.map((flag) => (
                  <div key={flag}>{flag}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {summary.missingDetails.length > 0 && (
          <div className='mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900'>
            <p className='font-semibold'>仍待补充</p>
            <div className='mt-2 space-y-1'>
              {summary.missingDetails.map((detail) => (
                <div key={`${detail.itemIndex}-${detail.productType}`}>{detail.itemLabel}：{detail.fieldsText}</div>
              ))}
            </div>
          </div>
        )}

        <div className='mt-4 space-y-3'>
          {summary.lineItems.map((item, index) => (
            <div key={`${item.itemType}-${index}`} className='rounded-lg bg-slate-50 p-3'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='font-semibold text-slate-900'>{item.title}</p>
                  <p className='text-sm text-slate-600'>{item.normalizedSpecSummary}</p>
                </div>
                <div className='text-right text-sm text-slate-700'>
                  <div>数量：{item.quantity}</div>
                  {item.chargeQuantity && item.chargeQuantity !== item.quantity && <div>计费数：{item.chargeQuantity}</div>}
                  <div>单价：¥{item.unitPrice}</div>
                  <div>小计：¥{item.lineTotal}</div>
                </div>
              </div>
              <div className='mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2'>
                <div>材质 / 克重：{item.materialWeightSummary}</div>
                <div>印色：{item.printColorSummary}</div>
                <div>工艺：{item.processSummary}</div>
                <div>开机费：¥{item.setupCost} / 运行费：¥{item.runCost}{typeof item.costSubtotal === 'number' ? ` / 成本小计：¥${item.costSubtotal}` : ''}</div>
              </div>
              {(item.reviewReasons.length > 0 || item.reviewFlags.length > 0) && (
                <div className='mt-3 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900'>
                  {(item.reviewReasons.length > 0 ? item.reviewReasons.map((reason) => reason.message) : item.reviewFlags).join('；')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const viewModel = buildHomeDemoViewModel(result)
  const recommendedParams = result?.recommendedParams?.recommendedParams
  const recommendedProductType = result?.recommendedParams?.productType || result?.mergedRecommendedParams?.productType
  const handoffSummary = lastCustomerMessage || result?.reply || '当前会话已进入人工处理流程。'
  const exampleGroupToneMap = {
    recommendation: {
      card: 'border-sky-200 bg-sky-50',
      badge: 'bg-sky-900 text-white',
      title: 'text-sky-950',
      text: 'text-sky-800',
      button: 'border-sky-200 bg-white text-sky-900 hover:bg-sky-100',
    },
    quoted: {
      card: 'border-emerald-200 bg-emerald-50',
      badge: 'bg-emerald-900 text-white',
      title: 'text-emerald-950',
      text: 'text-emerald-800',
      button: 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-100',
    },
    estimated: {
      card: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-900 text-white',
      title: 'text-amber-950',
      text: 'text-amber-800',
      button: 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100',
    },
    handoff: {
      card: 'border-rose-200 bg-rose-50',
      badge: 'bg-rose-900 text-white',
      title: 'text-rose-950',
      text: 'text-rose-800',
      button: 'border-rose-200 bg-white text-rose-900 hover:bg-rose-100',
    },
  } as const

  return (
    <main className='min-h-screen bg-slate-100 p-4'>
      <div className='mx-auto max-w-3xl space-y-6'>
        <div className='rounded-2xl bg-white p-6 shadow'>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-slate-500'>Printing AI Quote Assistant</p>
          <h1 className='mt-2 text-3xl font-bold text-slate-900'>复杂包装一期报价 Demo</h1>
          <p className='mt-2 text-slate-600'>
            当前活跃自动报价范围聚焦一期复杂包装，支持飞机盒、双插盒、开窗彩盒、说明书、内托、封口贴等需求；简单印刷品默认转人工核价。
          </p>
          <p className='mt-3 text-sm text-slate-500'>
            下方示例已按推荐案例、正式报价、参考报价、转人工四类整理，方便直接验证不同会话入口和边界场景。
          </p>
        </div>

        <div className='rounded-2xl bg-white p-6 shadow'>
          <div className='mb-4 flex items-center justify-between gap-4'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>开始咨询或报价</h2>
              <p className='mt-1 text-sm text-slate-600'>可直接输入需求，或从下方四类测试入口一键填入。系统会分别落到推荐、正式报价、参考报价或人工接管链路。</p>
            </div>
            <p className='text-xs text-slate-500'>会话编号：{conversationId ?? '未创建'}</p>
          </div>
          <div className='mb-4'>
            <label className='mb-2 block font-semibold text-slate-900'>输入需求</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSend()
                }
              }}
              placeholder='例如：我想做个外包装，预算不要太高；或：飞机盒，20*12*6cm，300克白卡，四色印刷，5000个；也可以直接点下方分组示例'
              className='w-full rounded border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none'
              rows={3}
            />
          </div>
          <div className='mb-4 space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <p className='text-sm font-semibold text-slate-900'>测试入口示例</p>
              <p className='text-xs text-slate-500'>点击任一示例即可填入输入框</p>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              {HOME_EXAMPLE_GROUPS.map((group) => {
                const tone = exampleGroupToneMap[group.key]

                return (
                  <div key={group.key} className={`rounded-2xl border p-4 ${tone.card}`}>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <h3 className={`text-base font-semibold ${tone.title}`}>{group.title}</h3>
                        <p className={`mt-1 text-sm ${tone.text}`}>{group.description}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                        {group.badge}
                      </span>
                    </div>
                    <div className='mt-4 space-y-2'>
                      {group.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          type='button'
                          onClick={() => setMessage(prompt)}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${tone.button}`}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className='w-full rounded bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:bg-gray-400'
          >
            {loading ? '处理中...' : '发送需求'}
          </button>
        </div>

        {result && (
          <div className='rounded-2xl bg-white p-6 shadow'>
            <div className='mb-4 flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-medium text-slate-500'>当前阶段</p>
                <h2 className='mt-1 text-2xl font-bold text-slate-900'>{result.ok ? viewModel.statusText : '请求失败'}</h2>
                {result.ok && result.status && (
                  <p className='mt-2 text-sm text-slate-600'>{getStatusGuidance(result.status).nextStep}</p>
                )}
              </div>
              {viewModel.quoteKindText && (
                <span className='rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white'>
                  {viewModel.quoteKindText}
                </span>
              )}
            </div>

            {result.ok && result.status && (
              <div className='mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4'>
                <p className='font-semibold text-slate-900'>{getStatusGuidance(result.status).title}</p>
                <p className='mt-1 text-sm text-slate-700'>{getStatusGuidance(result.status).nextStep}</p>
              </div>
            )}

            {result.reply && (
              <div className='mb-4 rounded-xl bg-slate-900 p-4 text-white'>
                <p className='text-sm font-medium uppercase tracking-[0.18em] text-slate-300'>系统回复</p>
                <p className='mt-2 text-base leading-7'>{result.reply}</p>
              </div>
            )}

            {viewModel.statusGuideLines.length > 0 && (
              <div className='mb-4 rounded-lg border border-slate-200 bg-white p-4'>
                <p className='mb-2 text-sm font-semibold text-slate-900'>下一步建议</p>
                <ul className='list-disc pl-5 text-sm text-slate-700'>
                  {viewModel.statusGuideLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendedParams && (
              <div className='mb-4 space-y-3'>
                {renderParamSection('建议配置', recommendedProductType, recommendedParams, 'sky')}
                {result.recommendedParams.note && (
                  <div className='rounded-lg bg-sky-50 p-4 text-sm text-sky-900'>
                    <span className='font-semibold'>补充说明：</span>
                    {result.recommendedParams.note}
                  </div>
                )}
              </div>
            )}

            {(viewModel.patchEntries.length > 0 || viewModel.patchSummaryItems.length > 0) && (
              <div className='mb-4 space-y-3'>
                {renderParamSection('本次调整', recommendedProductType, result.patchParams, 'violet')}
                {viewModel.patchSummaryItems.length > 0 && (
                  <div className='rounded-lg border border-violet-200 bg-violet-50 p-4'>
                    <p className='mb-2 text-sm font-semibold text-violet-900'>调整摘要</p>
                    <ul className='list-disc pl-5 text-sm text-violet-800'>
                      {viewModel.patchSummaryItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {viewModel.latestEntries.length > 0 && (
              <div className='mb-4'>
                {renderParamSection('当前方案', recommendedProductType, result.mergedRecommendedParams, 'slate')}
              </div>
            )}

            {result.status === 'missing_fields' && (
              <div className='space-y-3'>
                <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
                  <p className='text-sm font-semibold text-yellow-900'>还需要补充这些信息后，系统才能继续完成报价：</p>
                  <div className='mt-3'>
                    {renderMissingFieldTags(result.missingFields || [])}
                  </div>
                  <p className='mt-3 text-sm text-yellow-900'>
                    您可以直接继续回复这些规格，例如：{getMissingFieldsChineseText(result.mergedParams?.productType, result.missingFields || []) || '页数、材质、尺寸'}。
                  </p>
                </div>
                {renderParamSection('当前已识别的信息', result.mergedParams?.productType, result.mergedParams, 'slate')}
              </div>
            )}

            {result.status === 'estimated' && (
              <div className='space-y-3'>
                <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
                  <p className='font-semibold text-amber-900'>当前先给您一版参考报价，后续补齐关键信息后可以继续生成更准确的正式报价。</p>
                </div>
                {renderQuoteSummaryCard('当前参考报价', result.estimatedData, 'amber')}
                {renderPackagingReview(result.packagingReview)}
                {renderBundleItems(result.estimatedData)}
                <div>
                  <p className='mb-2 text-sm font-semibold text-gray-700'>当前仍待确认的信息</p>
                  {renderMissingFieldTags(result.missingFields || [])}
                </div>
                {renderParamSection('当前用于估价的配置', result.estimatedData?.normalizedParams?.productType || result.mergedParams?.productType, result.estimatedData?.normalizedParams || result.mergedParams, 'slate')}
                {renderReferenceFiles(result.referenceFiles || result.estimatedData?.referenceFiles)}
                {renderEstimatedHighlights(result.estimatedData)}
              </div>
            )}

            {result.status === 'quoted' && (
              <div className='space-y-3'>
                <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
                  <p className='font-semibold text-green-900'>系统已经按当前配置生成正式报价，您可以直接核对价格和规格。</p>
                </div>
                {renderQuoteSummaryCard('当前报价结果', result.data, 'green')}
                {renderPackagingReview(result.packagingReview)}
                {renderBundleItems(result.data)}
                {renderParamSection('当前确认配置', result.data?.normalizedParams?.productType, result.data?.normalizedParams, 'slate')}
                {renderReferenceFiles(result.referenceFiles || result.data?.referenceFiles)}
              </div>
            )}

            {result.status === 'handoff_required' && (
              <div className='space-y-3'>
                <div className='rounded-lg border border-orange-200 bg-orange-50 p-4'>
                  <p className='font-semibold text-orange-900'>当前询价已经转入人工处理，后续会由人工团队继续核价和跟进。</p>
                </div>
                {renderPackagingReview(result.packagingReview)}
                <HandoffRequestPanel
                  conversationId={conversationId}
                  statusLabel='待人工接管'
                  summary={handoffSummary}
                  reason={result.intentReason || result.reply}
                  alreadyPending={true}
                  triggerLabel='查看人工处理说明'
                />
                {renderParamSection('当前已整理的信息', result.mergedParams?.productType, result.mergedParams || result.mergedRecommendedParams, 'slate')}
              </div>
            )}

            {result.status === 'missing_fields' && result.packagingReview && (
              <div className='mt-3'>
                {renderPackagingReview(result.packagingReview)}
              </div>
            )}

            {result.ok && !['quoted', 'estimated', 'missing_fields', 'handoff_required', 'recommendation_updated'].includes(result.status) && (
              <div className='space-y-3'>
                {renderParamSection('当前已整理的信息', result.mergedParams?.productType || recommendedProductType, result.mergedParams || result.mergedRecommendedParams || recommendedParams, 'slate')}
              </div>
            )}

            {!result.ok && (
              <div className='rounded-lg bg-red-50 p-4'>
                <p className='font-semibold text-red-800'>{result.error || result.message || '请求失败'}</p>
                {result.code && (
                  <p className='mt-2 text-xs text-red-700'>code: {result.code}</p>
                )}
                {result.requestId && (
                  <p className='mt-1 text-xs text-red-700'>requestId: {result.requestId}</p>
                )}
              </div>
            )}

            <details className='mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <summary className='cursor-pointer text-sm font-semibold text-slate-800'>查看调试信息</summary>
              <div className='mt-4 space-y-3'>
                <div className='text-xs text-slate-500'>conversationId: {conversationId ?? '未创建'} / intent: {result.intent || '未识别'} / status: {result.status || 'unknown'}</div>
                {renderKeyValueBlock('路由决策 routeDecision', result.routeDecision)}
                {renderKeyValueBlock('推荐方案 recommendedParams', result.recommendedParams)}
                {renderKeyValueBlock('本轮 patch 参数 patchParams', result.patchParams)}
                {renderKeyValueBlock('当前方案 mergedRecommendedParams', result.mergedRecommendedParams)}
                {renderKeyValueBlock('本轮抽取参数 extractedParams', result.extractedParams)}
                {renderKeyValueBlock('合并后参数 mergedParams', result.mergedParams)}
                {renderKeyValueBlock('最终缺失字段 missingFields', result.missingFields)}
                {renderKeyValueBlock('包装解释 packagingReview', result.packagingReview)}
                {renderKeyValueBlock('知识问答 RAG 调试', (result.ragQuery || result.retrievedKnowledge || result.ragFallbackUsed !== undefined)
                  ? {
                      ragQuery: result.ragQuery,
                      retrievedKnowledge: result.retrievedKnowledge,
                      conservativeRag: result.conservativeRag,
                      ragFallbackUsed: result.ragFallbackUsed,
                      ragFallbackReason: result.ragFallbackReason,
                      ragAnswerType: result.ragAnswerType,
                      ragRewriteStrategy: result.ragRewriteStrategy,
                      insufficientKnowledge: result.insufficientKnowledge,
                    }
                  : null)}
                {renderKeyValueBlock('参考报价数据 estimatedData', result.estimatedData, 'text-amber-900')}
                {renderKeyValueBlock('正式报价数据 data', result.data, 'text-green-700')}
              </div>
            </details>
          </div>
        )}

        <div className='rounded-2xl bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>快速入口</h2>
          <div className='grid grid-cols-2 gap-4'>
            <Link
              href='/dashboard'
              className='rounded bg-slate-800 px-4 py-3 text-center font-semibold text-white hover:bg-slate-900 transition-colors'
            >
              📊 Dashboard 总览
            </Link>
            <Link
              href='/conversations'
              className='rounded bg-blue-500 px-4 py-3 text-center font-semibold text-white hover:bg-blue-600 transition-colors'
            >
              📋 会话列表
            </Link>
            {conversationId && (
              <Link
                href={`/conversations/${conversationId}`}
                className='rounded bg-green-500 px-4 py-3 text-center font-semibold text-white hover:bg-green-600 transition-colors'
              >
                📄 当前会话详情
              </Link>
            )}
            {result?.status === 'quoted' && conversationId && (
              <div className='col-span-2 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                报价单导出已收口为后台能力。请先进入当前会话详情页，再通过后台受保护入口查看或导出报价单。
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

