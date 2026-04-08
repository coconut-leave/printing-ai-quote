'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminPageNav } from '@/components/AdminPageNav'
import { HandoffRequestPanel } from '@/components/HandoffRequestPanel'

type ConversationItem = {
  id: number
  status: string
  statusLabel: string
  createdAt: string
  updatedAt: string
  latestMessage: string | null
  quoteExists: boolean
  hasExportableResult: boolean
  exportableResultStatus: string | null
  title: string
  topicSummary: string
  scopeLabel: string
  isActiveScope: boolean
  trialReviewStatus: string | null
  trialReviewStatusLabel: string | null
  trialReviewLatestActionLabel: string | null
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [timePreset, setTimePreset] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const buildFilterQueryString = (overrides?: Partial<{
    status: string
    timePreset: 'all' | 'today' | 'month' | 'year' | 'custom'
    startDate: string
    endDate: string
  }>) => {
    const params = new URLSearchParams()
    const nextStatus = overrides?.status ?? statusFilter
    const nextTimePreset = overrides?.timePreset ?? timePreset
    const nextStartDate = overrides?.startDate ?? startDate
    const nextEndDate = overrides?.endDate ?? endDate

    if (nextStatus && nextStatus !== 'ALL') {
      params.set('status', nextStatus)
    }

    if (nextTimePreset && nextTimePreset !== 'all') {
      params.set('timePreset', nextTimePreset)
    }

    if (nextTimePreset === 'custom') {
      if (nextStartDate) {
        params.set('startDate', nextStartDate)
      }
      if (nextEndDate) {
        params.set('endDate', nextEndDate)
      }
    }

    const query = params.toString()
    return query ? `?${query}` : ''
  }

  const isCustomRangeReady = timePreset !== 'custom' || Boolean(startDate && endDate)

  const fetchConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/conversations${buildFilterQueryString()}`, {
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
      setError(err instanceof Error ? err.message : '加载会话列表失败')
    } finally {
      setLoading(false)
    }
  }

  const filteredConversations = conversations

  const handleLedgerExport = (preset?: 'today' | 'month' | 'year' | 'custom' | 'all') => {
    const query = buildFilterQueryString(preset ? { timePreset: preset } : undefined)
    window.location.href = `/api/conversations/export${query}`
  }

  useEffect(() => {
    if (!isCustomRangeReady) {
      setConversations([])
      return
    }

    void fetchConversations()
  }, [statusFilter, timePreset, startDate, endDate])

  return (
    <main className='min-h-screen bg-slate-50 p-4'>
      <div className='mx-auto max-w-4xl space-y-4'>
        <AdminPageNav current='conversations' />
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-2xl font-bold'>
            会话列表 - {filteredConversations.length} 个会话
          </h1>
          <div className='flex gap-2'>
            <Link href='/reflections' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              查看学习记录
            </Link>
            <Link href='/learning-dashboard' className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
              查看学习看板
            </Link>
          </div>
        </div>

        {/* 状态与时间筛选 */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <span className='font-medium'>状态筛选：</span>
              <div className='flex flex-wrap gap-2'>
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

            <div className='flex flex-wrap items-center gap-4'>
              <span className='font-medium'>时间筛选：</span>
              <div className='flex flex-wrap gap-2'>
                {[
                  { value: 'all', label: '全部时间' },
                  { value: 'today', label: '今日' },
                  { value: 'month', label: '本月' },
                  { value: 'year', label: '本年' },
                  { value: 'custom', label: '自定义范围' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setTimePreset(value as 'all' | 'today' | 'month' | 'year' | 'custom')}
                    className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                      timePreset === value
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {timePreset === 'custom' && (
              <div className='flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
                <label className='text-sm text-slate-700'>
                  开始日期
                  <input
                    type='date'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className='mt-1 block rounded border border-slate-300 px-3 py-2 text-sm'
                  />
                </label>
                <label className='text-sm text-slate-700'>
                  结束日期
                  <input
                    type='date'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className='mt-1 block rounded border border-slate-300 px-3 py-2 text-sm'
                  />
                </label>
                {!isCustomRangeReady && (
                  <p className='pb-2 text-sm text-amber-700'>请选择完整的开始和结束日期后再筛选或导出。</p>
                )}
              </div>
            )}

            <div className='flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4'>
              <span className='font-medium text-slate-700'>批量导出：</span>
              {[
                { key: 'today', label: '导出今日报价单' },
                { key: 'month', label: '导出本月报价单' },
                { key: 'current', label: '导出当前筛选结果' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleLedgerExport(key === 'current' ? undefined : key as 'today' | 'month')}
                  disabled={!isCustomRangeReady}
                  className='rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
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
            {statusFilter === 'ALL' ? '暂无会话' : '当前筛选条件下暂无会话'}
          </div>
        )}

        <div className='space-y-2'>
          {filteredConversations.map((c) => (
            <div key={c.id} className='rounded border bg-white p-4 shadow transition-shadow hover:shadow-md'>
              <div className='mb-2 flex items-center justify-between gap-3'>
                <div>
                  <Link href={`/conversations/${c.id}`} className='text-base font-semibold text-blue-700 hover:underline'>
                    {c.title}
                  </Link>
                  <div className='mt-1 text-sm text-slate-600'>{c.topicSummary}</div>
                  <div className='mt-1 text-xs text-slate-500'>点击进入详情，可继续查看参数、报价、当前订单打回留痕和学习记录。</div>
                </div>
                <div className='flex gap-2'>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    c.isActiveScope ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {c.scopeLabel}
                  </span>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    c.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                    c.status === 'MISSING_FIELDS' ? 'bg-yellow-100 text-yellow-800' :
                    c.status === 'QUOTED' ? 'bg-green-100 text-green-800' :
                    c.status === 'PENDING_HUMAN' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {c.statusLabel}
                  </span>
                  <span className='rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800'>
                    {c.quoteExists ? '已有报价记录' : '暂无报价记录'}
                  </span>
                  {c.hasExportableResult && c.exportableResultStatus && (
                    <span className='rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800'>
                      当前可导出：{c.exportableResultStatus}
                    </span>
                  )}
                  {c.trialReviewStatusLabel && (
                    <span className='rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900'>
                      试运行复核：{c.trialReviewStatusLabel}
                    </span>
                  )}
                </div>
              </div>
              <p className='text-sm text-gray-500'>创建: {new Date(c.createdAt).toLocaleString()}</p>
              <p className='text-sm text-gray-500'>更新时间: {new Date(c.updatedAt).toLocaleString()}</p>
              <p className='mt-2 text-sm'>最近一条消息：{c.latestMessage || '暂无'}</p>
              {c.trialReviewLatestActionLabel && (
                <p className='mt-1 text-sm text-slate-600'>最近复核动作：{c.trialReviewLatestActionLabel}</p>
              )}
              <div className='mt-3 flex flex-wrap gap-2'>
                <Link
                  href={`/conversations/${c.id}`}
                  className='rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600'
                >
                  查看详情 / 补学习记录
                </Link>
                <Link
                  href='/trial-reviews'
                  className='rounded border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100'
                >
                  查看试运行复核队列
                </Link>
                {c.hasExportableResult && (
                  <a
                    href={`/api/conversations/${c.id}/export`}
                    className='rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-100'
                  >
                    导出当前报价 Excel
                  </a>
                )}
                <HandoffRequestPanel
                  conversationId={c.id}
                  statusLabel={c.statusLabel}
                  summary={c.topicSummary}
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
