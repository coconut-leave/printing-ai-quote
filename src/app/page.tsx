'use client'

import { useState } from 'react'

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
      setResult(data)
      setMessage('')
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }
    } catch (err) {
      setResult({
        ok: false,
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 p-4'>
      <div className='mx-auto max-w-2xl space-y-6'>
        <div className='rounded-lg bg-white p-6 shadow'>
          <h1 className='mb-2 text-3xl font-bold'>printing-ai-quote MVP</h1>
          <p className='text-gray-600'>自然语言询价助手（仅支持画册）</p>
        </div>

        <div className='rounded-lg bg-white p-6 shadow'>
          <p className='mb-3 text-sm text-gray-600'>当前 conversationId: {conversationId ?? '（未创建）'}</p>
          <div className='mb-4'>
            <label className='mb-2 block font-semibold'>输入询价信息</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSend()
                }
              }}
              placeholder='例如：我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉'
              className='w-full rounded border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none'
              rows={3}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className='w-full rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:bg-gray-400'
          >
            {loading ? '处理中...' : '发送'}
          </button>
        </div>

        {result && (
          <div className='rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 font-bold text-lg'>
              {result.ok ? '✓ 成功' : '✗ 错误'}
            </h2>

            {result.status === 'missing_fields' && (
              <div className='space-y-3'>
                <div className='rounded-lg bg-yellow-50 p-4'>
                  <p className='font-semibold text-yellow-800'>{result.reply}</p>
                </div>
                <div>
                  <p className='mb-2 text-sm font-semibold text-gray-700'>缺失字段：</p>
                  <div className='flex flex-wrap gap-2'>
                    {result.missingFields.map((field: string) => (
                      <span
                        key={field}
                        className='rounded bg-yellow-100 px-2 py-1 text-sm font-medium text-yellow-800'
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
                {/* 参数信息展示 */}
                {result.extractedParams && (
                  <div className='rounded-lg bg-slate-50 p-3'>
                    <p className='mb-2 text-sm font-semibold text-slate-700'>本轮抽取参数：</p>
                    <div className='text-sm text-slate-600 font-mono'>
                      {Object.entries(result.extractedParams)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
                {result.mergedParams && (
                  <div className='rounded-lg bg-slate-50 p-3'>
                    <p className='mb-2 text-sm font-semibold text-slate-700'>合并后参数：</p>
                    <div className='text-sm text-slate-600 font-mono'>
                      {Object.entries(result.mergedParams)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.status === 'quoted' && (
              <div className='space-y-3'>
                <div className='rounded-lg bg-green-50 p-4'>
                  <p className='font-semibold text-green-800'>{result.reply}</p>
                </div>
                <div className='rounded-lg border-2 border-green-200 bg-green-50 p-4'>
                  <h3 className='mb-3 font-bold text-green-900'>报价详情</h3>
                  <div className='space-y-2 font-mono text-sm'>
                    <div className='flex justify-between'>
                      <span>单价：</span>
                      <span>¥{result.data.unitPrice}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>产品小计：</span>
                      <span>¥{result.data.totalPrice}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>运费：</span>
                      <span>¥{result.data.shippingFee}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>税费：</span>
                      <span>¥{result.data.tax}</span>
                    </div>
                    <div className='border-t-2 border-green-200 pt-2'>
                      <div className='flex justify-between text-lg font-bold'>
                        <span>最终报价：</span>
                        <span>¥{result.data.finalPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 参数信息展示 */}
                {result.extractedParams && (
                  <div className='rounded-lg bg-slate-50 p-3'>
                    <p className='mb-2 text-sm font-semibold text-slate-700'>本轮抽取参数：</p>
                    <div className='text-sm text-slate-600 font-mono'>
                      {Object.entries(result.extractedParams)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
                {result.mergedParams && (
                  <div className='rounded-lg bg-slate-50 p-3'>
                    <p className='mb-2 text-sm font-semibold text-slate-700'>合并后参数：</p>
                    <div className='text-sm text-slate-600 font-mono'>
                      {Object.entries(result.mergedParams)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
                {result.data?.normalizedParams && (
                  <div className='rounded-lg bg-slate-50 p-3'>
                    <p className='mb-2 text-sm font-semibold text-green-700'>报价用参数：</p>
                    <div className='text-sm text-green-600 font-mono'>
                      {Object.entries(result.data.normalizedParams)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.status === 'error' && (
              <div className='rounded-lg bg-red-50 p-4'>
                <p className='font-semibold text-red-800'>{result.message}</p>
              </div>
            )}
          </div>
        )}

        {/* 快速入口 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>快速入口</h2>
          <div className='grid grid-cols-2 gap-4'>
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
              <a
                href={`/api/quotes/${conversationId}/export`}
                target='_blank'
                rel='noopener noreferrer'
                className='rounded bg-purple-500 px-4 py-3 text-center font-semibold text-white hover:bg-purple-600 transition-colors'
              >
                📄 报价单导出
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

