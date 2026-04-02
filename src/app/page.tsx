'use client'

import { useState } from 'react'
import { FIELD_LABELS } from '@/lib/catalog/productSchemas'
import { getDisplayParamEntries, getMissingFieldsChineseText } from '@/lib/catalog/helpers'
import { buildHomeDemoViewModel } from '@/app/homeDemoView'

export default function Home() {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)

  const handleSend = async () => {
    if (!message.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId }),
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
            <span>单价</span>
            <span>¥{quoteData.unitPrice}</span>
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

  const viewModel = buildHomeDemoViewModel(result)
  const recommendedParams = result?.recommendedParams?.recommendedParams
  const recommendedProductType = result?.recommendedParams?.productType || result?.mergedRecommendedParams?.productType
  const examplePrompts = [
    '企业宣传册常见方案怎么配？',
    '开业活动传单预算有限，推荐一个经济方案',
    '商务名片用什么材质更合适？',
    '我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉',
  ]

  return (
    <main className='min-h-screen bg-slate-100 p-4'>
      <div className='mx-auto max-w-3xl space-y-6'>
        <div className='rounded-2xl bg-white p-6 shadow'>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-slate-500'>Printing AI Quote Assistant</p>
          <h1 className='mt-2 text-3xl font-bold text-slate-900'>印刷报价与方案建议 Demo</h1>
          <p className='mt-2 text-slate-600'>
            面向标准印刷咨询场景，支持画册、传单、名片、海报等常见需求。可先咨询材料和规格，再自然进入推荐方案、参考报价或正式报价。
          </p>
        </div>

        <div className='rounded-2xl bg-white p-6 shadow'>
          <div className='mb-4 flex items-center justify-between gap-4'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>开始咨询或报价</h2>
              <p className='mt-1 text-sm text-slate-600'>先输入用途、品类、数量、规格或预算倾向，系统会尽量先回答问题，再给出常见配置和报价路径。</p>
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
              placeholder='例如：企业宣传册预算有限，推荐一个常见方案；或者：我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉'
              className='w-full rounded border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none'
              rows={3}
            />
          </div>
          <div className='mb-4 flex flex-wrap gap-2'>
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type='button'
                onClick={() => setMessage(prompt)}
                className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100'
              >
                {prompt}
              </button>
            ))}
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
                <div>
                  <p className='mb-2 text-sm font-semibold text-gray-700'>当前仍待确认的信息</p>
                  {renderMissingFieldTags(result.missingFields || [])}
                </div>
                {renderParamSection('当前用于估价的配置', result.estimatedData?.normalizedParams?.productType || result.mergedParams?.productType, result.estimatedData?.normalizedParams || result.mergedParams, 'slate')}
                {renderEstimatedHighlights(result.estimatedData)}
              </div>
            )}

            {result.status === 'quoted' && (
              <div className='space-y-3'>
                <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
                  <p className='font-semibold text-green-900'>系统已经按当前配置生成正式报价，您可以直接核对价格和规格。</p>
                </div>
                {renderQuoteSummaryCard('当前报价结果', result.data, 'green')}
                {renderParamSection('当前确认配置', result.data?.normalizedParams?.productType, result.data?.normalizedParams, 'slate')}
              </div>
            )}

            {result.status === 'handoff_required' && (
              <div className='space-y-3'>
                <div className='rounded-lg border border-orange-200 bg-orange-50 p-4'>
                  <p className='font-semibold text-orange-900'>当前询价已经转入人工处理，后续会由人工团队继续核价和跟进。</p>
                </div>
                {renderParamSection('当前已整理的信息', result.mergedParams?.productType, result.mergedParams || result.mergedRecommendedParams, 'slate')}
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
                {renderKeyValueBlock('推荐方案 recommendedParams', result.recommendedParams)}
                {renderKeyValueBlock('本轮 patch 参数 patchParams', result.patchParams)}
                {renderKeyValueBlock('当前方案 mergedRecommendedParams', result.mergedRecommendedParams)}
                {renderKeyValueBlock('本轮抽取参数 extractedParams', result.extractedParams)}
                {renderKeyValueBlock('合并后参数 mergedParams', result.mergedParams)}
                {renderKeyValueBlock('参考报价数据 estimatedData', result.estimatedData, 'text-amber-900')}
                {renderKeyValueBlock('正式报价数据 data', result.data, 'text-green-700')}
              </div>
            </details>
          </div>
        )}

        <div className='rounded-2xl bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>快速入口</h2>
          <div className='grid grid-cols-2 gap-4'>
            <a
              href='/dashboard'
              className='rounded bg-slate-800 px-4 py-3 text-center font-semibold text-white hover:bg-slate-900 transition-colors'
            >
              📊 Dashboard 总览
            </a>
            <a
              href='/conversations'
              className='rounded bg-blue-500 px-4 py-3 text-center font-semibold text-white hover:bg-blue-600 transition-colors'
            >
              📋 会话列表
            </a>
            {conversationId && (
              <a
                href={`/conversations/${conversationId}`}
                className='rounded bg-green-500 px-4 py-3 text-center font-semibold text-white hover:bg-green-600 transition-colors'
              >
                📄 当前会话详情
              </a>
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

