'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminPageNav } from '@/components/AdminPageNav'
import { HandoffRequestPanel } from '@/components/HandoffRequestPanel'

type ConversationItem = {
  id: number
  status: string
  createdAt: string
  updatedAt: string
  latestMessage: string | null
  quoteExists: boolean
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const fetchConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/conversations', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data.ok) {
        setConversations(data.data)
      } else {
        setError(data.message || '获取会话失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // 筛选会话
  const filteredConversations = conversations.filter(c => {
    if (statusFilter === 'ALL') return true
    return c.status === statusFilter
  })

  useEffect(() => {
    fetchConversations()
  }, [])

  return (
    <main className='min-h-screen bg-slate-50 p-4'>
      <div className='mx-auto max-w-4xl space-y-4'>
        <AdminPageNav current='conversations' />
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-2xl font-bold'>
            会话列表（最小版） - {filteredConversations.length} 个会话
          </h1>
          <div className='flex gap-2'>
            <Link href='/reflections' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              查看 Reflections
            </Link>
            <Link href='/learning-dashboard' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              查看 Learning Dashboard
            </Link>
          </div>
        </div>

        {/* 状态筛选 */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <div className='flex items-center gap-4'>
            <span className='font-medium'>状态筛选：</span>
            <div className='flex gap-2'>
              {[
                { value: 'ALL', label: '全部' },
                { value: 'OPEN', label: '🔵 进行中' },
                { value: 'MISSING_FIELDS', label: '⚠️ 缺参数' },
                { value: 'QUOTED', label: '✅ 已报价' },
                { value: 'PENDING_HUMAN', label: '👤 人工接管中' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    statusFilter === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className='rounded bg-red-100 p-3 text-red-800'>{error}</div>}

        {loading && <div className='text-gray-600'>加载中...</div>}

        {!loading && filteredConversations.length === 0 && (
          <div className='text-gray-600'>
            {statusFilter === 'ALL' ? '暂无会话' : `暂无 ${statusFilter} 状态的会话`}
          </div>
        )}

        <div className='space-y-2'>
          {filteredConversations.map((c) => (
            <div key={c.id} className='rounded border bg-white p-4 shadow transition-shadow hover:shadow-md'>
              <div className='mb-2 flex items-center justify-between gap-3'>
                <div>
                  <Link href={`/conversations/${c.id}`} className='text-base font-semibold text-blue-700 hover:underline'>
                    会话 #{c.id}
                  </Link>
                  <div className='mt-1 text-xs text-slate-500'>点击标题或下方按钮进入详情并生成 Reflection</div>
                </div>
                <div className='flex gap-2'>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    c.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                    c.status === 'MISSING_FIELDS' ? 'bg-yellow-100 text-yellow-800' :
                    c.status === 'QUOTED' ? 'bg-green-100 text-green-800' :
                    c.status === 'PENDING_HUMAN' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {c.status === 'OPEN' ? '🔵 进行中' :
                     c.status === 'MISSING_FIELDS' ? '⚠️ 缺参数' :
                     c.status === 'QUOTED' ? '✅ 已报价' :
                     c.status === 'PENDING_HUMAN' ? '👤 人工接管中' :
                     c.status}
                  </span>
                  <span className='rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800'>
                    {c.quoteExists ? '💰 有报价' : '无报价'}
                  </span>
                </div>
              </div>
              <p className='text-sm text-gray-500'>创建: {new Date(c.createdAt).toLocaleString()}</p>
              <p className='text-sm text-gray-500'>更新时间: {new Date(c.updatedAt).toLocaleString()}</p>
              <p className='mt-2 text-sm'>最新消息: {c.latestMessage || '暂无'}</p>
              <div className='mt-3 flex flex-wrap gap-2'>
                <Link
                  href={`/conversations/${c.id}`}
                  className='rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600'
                >
                  查看详情 / 生成 Reflection
                </Link>
                <HandoffRequestPanel
                  conversationId={c.id}
                  statusLabel={c.status}
                  summary={c.latestMessage || `会话 #${c.id} 当前暂无最新消息摘要。`}
                  reason={c.status === 'PENDING_HUMAN' ? '当前会话已经处于人工处理状态。' : '需要人工客服继续跟进当前会话。'}
                  existingHandoffCount={c.status === 'PENDING_HUMAN' ? 1 : 0}
                  alreadyPending={c.status === 'PENDING_HUMAN'}
                  triggerLabel={c.status === 'PENDING_HUMAN' ? '查看人工处理说明' : '提交给人工客服'}
                  onSubmitted={fetchConversations}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
