'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatParamsByProduct, getMissingFieldsChineseText } from '@/lib/catalog/helpers'
import { AdminPageNav } from '@/components/AdminPageNav'
import { HandoffRequestPanel } from '@/components/HandoffRequestPanel'
import { REFLECTION_ISSUE_TYPE_OPTIONS, getReflectionIssueTypeLabel, type ReflectionIssueType } from '@/lib/reflection/issueTypes'

type ConversationDetails = {
  id: number
  status: string
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: number
    sender: string
    content: string
    metadata?: any
    createdAt: string
  }>
  quotes: Array<{
    id: number
    parameters: any
    subtotalCents: number
    shippingCents: number
    taxCents: number
    totalCents: number
    status: string
    createdAt: string
  }>
  handoffs: Array<{
    id: number
    reason: string
    assignedTo: string | null
    resolved: boolean
    createdAt: string
  }>
  reflections: Array<{
    id: number
    issueType: ReflectionIssueType
    reflectionText: string
    suggestionDraft: string
    status: 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
    createdAt: string
  }>
}

function formatParams(params: any, productType?: string): string {
  if (!params) return ''
  return formatParamsByProduct(productType, params)
}

function ParameterInfo({ message }: { message: any }) {
  const metadata = message.metadata as any
  if (!metadata) return null

  const { extractedParams, mergedParams, quoteParams, missingFields } = metadata
  const productType = quoteParams?.productType || mergedParams?.productType || extractedParams?.productType

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
    </div>
  )
}

export default function ConversationDetailPage() {
  const [conversation, setConversation] = useState<ConversationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [reflectionIssueType, setReflectionIssueType] = useState<ReflectionIssueType>('PARAM_WRONG')
  const [correctedParamsText, setCorrectedParamsText] = useState('')
  const [correctedQuoteSummary, setCorrectedQuoteSummary] = useState('')

  const params = useParams<{ id: string | string[] }>()
  const rawConversationId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const conversationId = Number(rawConversationId)
  const latestHandoff = conversation?.handoffs?.[0]
  const latestCustomerMessage = conversation?.messages
    ?.filter((message) => message.sender === 'CUSTOMER')
    .slice(-1)[0]

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
        setConversation(data.data)
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

  const handleGenerateReflection = async () => {
    if (!conversation || reflectionLoading) return

    let correctedParams: Record<string, any> | undefined
    if (correctedParamsText.trim()) {
      try {
        correctedParams = JSON.parse(correctedParamsText)
      } catch {
        setError('修正参数 JSON 格式无效')
        return
      }
    }

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
          correctedParams,
          correctedQuoteSummary: correctedQuoteSummary.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.message || '生成反思记录失败')
        return
      }

      setCorrectedParamsText('')
      setCorrectedQuoteSummary('')
      setSuccessMessage(`Reflection #${data.data.id} 已创建，可前往 Reflections / Learning Dashboard 查看统计变化。`)
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
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>会话详情 #{conversation.id}</h1>
          <div className='flex gap-3 text-sm'>
            <Link href='/conversations' className='text-blue-600 hover:underline'>
              返回列表
            </Link>
            <Link href='/reflections' className='text-blue-600 hover:underline'>
              查看 Reflections
            </Link>
            <Link href='/learning-dashboard' className='text-blue-600 hover:underline'>
              查看 Learning Dashboard
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
                {conversation.status === 'OPEN' ? '🔵 进行中' :
                 conversation.status === 'MISSING_FIELDS' ? '⚠️ 缺参数' :
                 conversation.status === 'QUOTED' ? '✅ 已报价' :
                 conversation.status === 'PENDING_HUMAN' ? '👤 人工接管中' :
                 conversation.status}
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
                  statusLabel={conversation.status}
                  summary={latestCustomerMessage?.content || `会话 #${conversation.id} 当前暂无客户摘要。`}
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
                <div className='mb-3 flex items-center justify-between'>
                  <span className='font-medium'>报价 #{quote.id}</span>
                  <div className='flex items-center gap-2'>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${
                      quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.status}
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
              <p className='mt-1 text-sm text-slate-500'>在当前会话详情中可直接生成 Reflection，生成成功后可在 Reflections 与 Learning Dashboard 中继续查看。</p>
            </div>
            <button
              type='button'
              onClick={handleGenerateReflection}
              disabled={reflectionLoading}
              className='rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {reflectionLoading ? '生成中...' : '生成 Reflection'}
            </button>
          </div>

          <div className='mb-4 grid gap-3 rounded border p-3'>
            <label className='text-sm'>
              <span className='mb-1 block font-medium'>问题类型</span>
              <select
                value={reflectionIssueType}
                onChange={(e) => setReflectionIssueType(e.target.value as any)}
                className='w-full rounded border px-3 py-2 text-sm'
              >
                {REFLECTION_ISSUE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className='text-sm'>
              <span className='mb-1 block font-medium'>修正参数（JSON，可选）</span>
              <textarea
                value={correctedParamsText}
                onChange={(e) => setCorrectedParamsText(e.target.value)}
                rows={4}
                placeholder='例如：{"pageCount": 32, "innerWeight": 157}'
                className='w-full rounded border px-3 py-2 font-mono text-xs'
              />
            </label>

            <label className='text-sm'>
              <span className='mb-1 block font-medium'>修正后报价摘要（可选）</span>
              <input
                value={correctedQuoteSummary}
                onChange={(e) => setCorrectedQuoteSummary(e.target.value)}
                placeholder='例如：人工核价后总价 ¥1980.00'
                className='w-full rounded border px-3 py-2 text-sm'
              />
            </label>
          </div>

          <div className='space-y-3'>
            {(conversation.reflections || []).map((item) => (
              <div key={item.id} className='rounded border p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <div className='text-sm font-medium'>#{item.id} {getReflectionIssueTypeLabel(item.issueType)}</div>
                  <span className='rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700'>
                    {item.status}
                  </span>
                </div>
                <p className='mb-2 text-sm'><span className='font-medium'>反思：</span>{item.reflectionText}</p>
                <p className='text-sm'><span className='font-medium'>建议草案：</span>{item.suggestionDraft}</p>
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