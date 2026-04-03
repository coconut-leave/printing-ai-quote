'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminPageNav } from '@/components/AdminPageNav'
import { REFLECTION_ISSUE_TYPE_OPTIONS, getReflectionIssueTypeLabel } from '@/lib/reflection/issueTypes'

interface ReflectionRecord {
  id: number
  conversationId: number
  quoteId?: number
  issueType: string
  reflectionText: string
  suggestionDraft: string
  status: string
  createdAt: string
  conversation: {
    id: number
    customerName?: string
    status: string
    createdAt: string
  }
  quote?: {
    id: number
    totalCents: number
  }
}

interface Stats {
  issueTypeDistribution: Array<{
    issueType: string
    _count: number
  }>
  topMissingFields: Array<{
    field: string
    count: number
  }>
  recentHandoffReasons: string[]
  statusBreakdown: Array<{
    status: string
    count: number
  }>
  period: string
}

export default function ReflectionsPage() {
  const [records, setRecords] = useState<ReflectionRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('ALL')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const limit = 20

  useEffect(() => {
    fetchRecords()
    fetchStats()
  }, [page, statusFilter, issueTypeFilter])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, issueTypeFilter])

  async function fetchRecords() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (issueTypeFilter !== 'ALL') params.set('issueType', issueTypeFilter)
      const res = await fetch(`/api/reflections?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data.ok) {
        setRecords(data.data.records)
        setTotal(data.data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch reflections:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/reflections/stats', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data.ok) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function updateStatus(reflectionId: number, newStatus: string) {
    try {
      setUpdatingId(reflectionId)
      const res = await fetch(`/api/reflections/${reflectionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        // Update local state
        setRecords((prev) =>
          prev.map((r) =>
            r.id === reflectionId ? { ...r, status: newStatus } : r
          )
        )
        // Refresh stats
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to update reflection status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium'
    switch (status) {
      case 'NEW':
        return `${baseClass} bg-yellow-100 text-yellow-800`
      case 'REVIEWED':
        return `${baseClass} bg-blue-100 text-blue-800`
      case 'APPROVED':
        return `${baseClass} bg-green-100 text-green-800`
      case 'REJECTED':
        return `${baseClass} bg-red-100 text-red-800`
      default:
        return `${baseClass} bg-gray-100 text-gray-800`
    }
  }

  const getIssueTypeBadgeClass = (type: string) => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium'
    switch (type) {
      case 'PARAM_MISSING':
        return `${baseClass} bg-orange-100 text-orange-800`
      case 'PARAM_WRONG':
        return `${baseClass} bg-red-100 text-red-800`
      case 'QUOTE_INACCURATE':
        return `${baseClass} bg-purple-100 text-purple-800`
      case 'SHOULD_HANDOFF':
        return `${baseClass} bg-pink-100 text-pink-800`
      default:
        return `${baseClass} bg-gray-100 text-gray-800`
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminPageNav current='reflections' />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reflection 审核
          </h1>
          <p className="text-gray-600">
            管理 AI 反思记录、审核建议、聚合优化信息
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">按状态筛选</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="ALL">全部</option>
              <option value="NEW">NEW</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">按问题类型筛选</span>
            <select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="ALL">全部</option>
              {REFLECTION_ISSUE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Stats Panel */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">
                审核状态分布
              </h3>
              <div className="space-y-2">
                {stats.statusBreakdown.map((item) => (
                  <div key={item.status} className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {item.status === 'NEW'
                        ? '未审核'
                        : item.status === 'REVIEWED'
                        ? '已审核'
                        : item.status === 'APPROVED'
                        ? '已批准'
                        : '已拒绝'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issue Type Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">
                问题类型分布 ({stats.period})
              </h3>
              <div className="space-y-2">
                {stats.issueTypeDistribution.map((item) => (
                  <div key={item.issueType} className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {getReflectionIssueTypeLabel(item.issueType)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item._count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Missing Fields */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">
                最常缺失字段
              </h3>
              <div className="space-y-2">
                {stats.topMissingFields.length > 0 ? (
                  stats.topMissingFields.map((item) => (
                    <div key={item.field} className="flex justify-between">
                      <span className="text-sm text-gray-600 truncate">
                        {item.field}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 ml-2">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">无数据</p>
                )}
              </div>
            </div>

            {/* Recent Handoff Reasons */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">
                最近转人工原因
              </h3>
              <div className="space-y-2">
                {stats.recentHandoffReasons.length > 0 ? (
                  stats.recentHandoffReasons.map((reason, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-gray-600 line-clamp-2"
                    >
                      {reason}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">无数据</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reflections List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                     会话
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    问题类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    反思内容
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    建议
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    当前状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/conversations/${record.conversationId}`}
                          className="text-blue-600 hover:underline"
                        >
                          #{record.conversationId}
                        </Link>
                        {record.conversation.customerName && (
                          <p className="text-xs text-gray-500">
                            {record.conversation.customerName}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getIssueTypeBadgeClass(record.issueType)}>
                          {getReflectionIssueTypeLabel(record.issueType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {record.reflectionText}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {record.suggestionDraft}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getStatusBadgeClass(record.status)}>
                          {record.status === 'NEW'
                            ? '未审核'
                            : record.status === 'REVIEWED'
                            ? '已审核'
                            : record.status === 'APPROVED'
                            ? '已批准'
                            : '已拒绝'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.status === 'NEW' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(record.id, 'REVIEWED')}
                              disabled={updatingId === record.id}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
                            >
                              审核
                            </button>
                            <button
                              onClick={() => updateStatus(record.id, 'APPROVED')}
                              disabled={updatingId === record.id}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                            >
                              批准
                            </button>
                          </div>
                        )}
                        {record.status === 'REVIEWED' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(record.id, 'APPROVED')}
                              disabled={updatingId === record.id}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                            >
                              批准
                            </button>
                            <button
                              onClick={() => updateStatus(record.id, 'REJECTED')}
                              disabled={updatingId === record.id}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
                            >
                              拒绝
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-600">
                共 {total} 条记录，第 {page}/{totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
