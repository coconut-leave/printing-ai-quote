'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  ImprovementSuggestion,
  ImprovementSuggestionStatus,
  ImprovementSuggestionType,
} from '@/server/learning/improvementSuggestion'

export default function ImprovementsPage() {
  const [improvements, setImprovements] = useState<ImprovementSuggestion[]>([])
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [suggestionTypeFilter, setSuggestionTypeFilter] = useState<string>('ALL')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const limit = 20

  useEffect(() => {
    fetchImprovements()
  }, [page, statusFilter, suggestionTypeFilter])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, suggestionTypeFilter])

  async function fetchImprovements() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (suggestionTypeFilter !== 'ALL') params.set('suggestionType', suggestionTypeFilter)

      const res = await fetch(`/api/improvements?${params.toString()}`)
      const data = await res.json()
      if (data.ok) {
        setImprovements(data.data.improvements)
        setTotal(data.data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch improvements:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(improvementId: string, newStatus: ImprovementSuggestionStatus) {
    try {
      setUpdatingId(improvementId)
      const res = await fetch(`/api/improvements/${improvementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        // Update local state
        setImprovements((prev) =>
          prev.map((imp) => (imp.id === improvementId ? { ...imp, status: newStatus } : imp))
        )
      }
    } catch (error) {
      console.error('Failed to update improvement status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  async function saveActionFields(improvementId: string, payload: { targetFileHint?: string; implementationNote?: string }) {
    try {
      setUpdatingId(improvementId)
      const res = await fetch(`/api/improvements/${improvementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) return

      setImprovements((prev) =>
        prev.map((item) =>
          item.id === improvementId
            ? {
                ...item,
                targetFileHint: data.data.targetFileHint ?? item.targetFileHint,
                implementationNote: data.data.implementationNote ?? item.implementationNote,
                lastActionAt: data.data.lastActionAt ?? item.lastActionAt,
              }
            : item
        )
      )
    } catch (error) {
      console.error('Failed to save action fields:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadgeClass = (status: ImprovementSuggestionStatus) => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium'
    switch (status) {
      case 'NEW':
        return `${baseClass} bg-yellow-100 text-yellow-800`
      case 'REVIEWED':
        return `${baseClass} bg-blue-100 text-blue-800`
      case 'ACCEPTED':
        return `${baseClass} bg-green-100 text-green-800`
      case 'IMPLEMENTED':
        return `${baseClass} bg-emerald-100 text-emerald-800`
      case 'VERIFIED':
        return `${baseClass} bg-teal-100 text-teal-800`
      case 'REJECTED':
        return `${baseClass} bg-red-100 text-red-800`
      default:
        return `${baseClass} bg-gray-100 text-gray-800`
    }
  }

  const getTypeLabel = (type: ImprovementSuggestionType) => {
    const labels: Record<ImprovementSuggestionType, string> = {
      PROMPT_IMPROVEMENT: '改进提示词',
      REGEX_IMPROVEMENT: '改进正则提取',
      FIELD_MAPPING_IMPROVEMENT: '字段映射调整',
      ESTIMATE_DEFAULT_IMPROVEMENT: '估算默认值',
      HANDOFF_POLICY_IMPROVEMENT: '转人工规则优化',
      OTHER: '其他改进',
    }
    return labels[type] || type
  }

  const getTypeBadgeClass = (type: ImprovementSuggestionType) => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium'
    switch (type) {
      case 'PROMPT_IMPROVEMENT':
        return `${baseClass} bg-purple-100 text-purple-800`
      case 'REGEX_IMPROVEMENT':
        return `${baseClass} bg-cyan-100 text-cyan-800`
      case 'FIELD_MAPPING_IMPROVEMENT':
        return `${baseClass} bg-orange-100 text-orange-800`
      case 'ESTIMATE_DEFAULT_IMPROVEMENT':
        return `${baseClass} bg-pink-100 text-pink-800`
      case 'HANDOFF_POLICY_IMPROVEMENT':
        return `${baseClass} bg-indigo-100 text-indigo-800`
      case 'OTHER':
        return `${baseClass} bg-gray-100 text-gray-800`
      default:
        return `${baseClass} bg-gray-100 text-gray-800`
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">改进建议池</h1>
          <p className="text-gray-600">
            从已批准的反思中提炼的改进建议，供人工评估是否后续落地
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
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="IMPLEMENTED">IMPLEMENTED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">按建议类型筛选</span>
            <select
              value={suggestionTypeFilter}
              onChange={(e) => setSuggestionTypeFilter(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="ALL">全部</option>
              <option value="PROMPT_IMPROVEMENT">PROMPT_IMPROVEMENT</option>
              <option value="REGEX_IMPROVEMENT">REGEX_IMPROVEMENT</option>
              <option value="FIELD_MAPPING_IMPROVEMENT">FIELD_MAPPING_IMPROVEMENT</option>
              <option value="ESTIMATE_DEFAULT_IMPROVEMENT">ESTIMATE_DEFAULT_IMPROVEMENT</option>
              <option value="HANDOFF_POLICY_IMPROVEMENT">HANDOFF_POLICY_IMPROVEMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            💡 <strong>当前状态：</strong> 这些是来自人工批准的 APPROVED reflections
            的改进建议。不会自动修改任何生产规则。您可以评估并决定是否接受这些建议。
          </p>
          <p className='mt-2 text-sm text-blue-800'>
            当前 MVP 中 improvement 的状态、implementationNote、verificationNote 等仍主要保存在进程内存中，服务重启后不会完整保留，请不要把这里当成正式持久化工单系统。
          </p>
        </div>

        {/* Improvements List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                    来源反思
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    改进建议
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    来源
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    影响区域
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    详情
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    当前状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : improvements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      暂无已批准的改进建议
                    </td>
                  </tr>
                ) : (
                  improvements.map((improvement) => (
                    <tr key={improvement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{improvement.sourceReflectionId}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{improvement.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {improvement.summary}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/conversations/${improvement.conversationId}`}
                          className="text-blue-600 hover:underline"
                        >
                          会话#{improvement.conversationId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getTypeBadgeClass(improvement.suggestionType)}>
                          {getTypeLabel(improvement.suggestionType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {improvement.impactArea}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:underline text-xs">
                            查看建议
                          </summary>
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap max-w-xs">
                            {improvement.suggestionDraft}
                          </div>
                          {improvement.correctedParams && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700">
                              <strong>修正参数：</strong>
                              <pre className="overflow-auto max-w-xs">
                                {JSON.stringify(improvement.correctedParams, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="mt-2 space-y-2">
                            <label className="block text-xs text-gray-700">
                              <span className="mb-1 block font-medium">targetFileHint</span>
                              <input
                                defaultValue={improvement.targetFileHint || ''}
                                className="w-full rounded border border-gray-300 px-2 py-1"
                                onBlur={(e) => {
                                  if (e.target.value !== (improvement.targetFileHint || '')) {
                                    saveActionFields(improvement.id, { targetFileHint: e.target.value })
                                  }
                                }}
                              />
                            </label>
                            <label className="block text-xs text-gray-700">
                              <span className="mb-1 block font-medium">implementationNote</span>
                              <textarea
                                defaultValue={improvement.implementationNote || ''}
                                rows={3}
                                className="w-full rounded border border-gray-300 px-2 py-1"
                                onBlur={(e) => {
                                  if (e.target.value !== (improvement.implementationNote || '')) {
                                    saveActionFields(improvement.id, { implementationNote: e.target.value })
                                  }
                                }}
                              />
                            </label>
                            <div className="text-xs text-gray-600">
                              {'implementationSummary' in improvement && (improvement as any).implementationSummary && (
                                <p>实施说明：{(improvement as any).implementationSummary}</p>
                              )}
                              {'verificationNote' in improvement && (improvement as any).verificationNote && (
                                <p className="mt-1">验证说明：{(improvement as any).verificationNote}</p>
                              )}
                              {'implementedAt' in improvement && (improvement as any).implementedAt && (
                                <p className="mt-1">implementedAt: {new Date((improvement as any).implementedAt).toLocaleString()}</p>
                              )}
                              {'verifiedAt' in improvement && (improvement as any).verifiedAt && (
                                <p className="mt-1">verifiedAt: {new Date((improvement as any).verifiedAt).toLocaleString()}</p>
                              )}
                            </div>
                            {updatingId === improvement.id && (
                              <p className="text-xs text-blue-600">保存中...</p>
                            )}
                          </div>
                        </details>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getStatusBadgeClass(improvement.status)}>
                          {improvement.status === 'NEW'
                            ? '未审核'
                            : improvement.status === 'REVIEWED'
                            ? '已审核'
                            : improvement.status === 'ACCEPTED'
                            ? '已接受'
                            : improvement.status === 'IMPLEMENTED'
                            ? '已实施'
                            : improvement.status === 'VERIFIED'
                            ? '已验证'
                            : '已拒绝'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{new Date(improvement.createdAt).toLocaleString()}</div>
                        {'lastActionAt' in improvement && (improvement as any).lastActionAt && (
                          <div className="mt-1 text-xs text-gray-500">
                            最近处理：{new Date((improvement as any).lastActionAt).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {improvement.status === 'NEW' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateStatus(improvement.id, 'REVIEWED')}
                              disabled={updatingId === improvement.id}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
                            >
                              审核
                            </button>
                            <button
                              onClick={() => updateStatus(improvement.id, 'ACCEPTED')}
                              disabled={updatingId === improvement.id}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                            >
                              接受
                            </button>
                          </div>
                        )}
                        {improvement.status === 'REVIEWED' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateStatus(improvement.id, 'ACCEPTED')}
                              disabled={updatingId === improvement.id}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                            >
                              接受
                            </button>
                            <button
                              onClick={() => updateStatus(improvement.id, 'REJECTED')}
                              disabled={updatingId === improvement.id}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
                            >
                              拒绝
                            </button>
                          </div>
                        )}
                        {improvement.status === 'ACCEPTED' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateStatus(improvement.id, 'IMPLEMENTED')}
                              disabled={updatingId === improvement.id}
                              className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 disabled:opacity-50"
                            >
                              标记已实施
                            </button>
                          </div>
                        )}
                        {improvement.status === 'IMPLEMENTED' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateStatus(improvement.id, 'VERIFIED')}
                              disabled={updatingId === improvement.id}
                              className="px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded hover:bg-teal-100 disabled:opacity-50"
                            >
                              标记已验证
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
                共 {total} 条建议，第 {page}/{totalPages} 页
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
