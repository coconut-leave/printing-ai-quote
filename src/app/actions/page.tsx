'use client'

import { useEffect, useState } from 'react'

type ActionItem = {
  id: string
  sourceReflectionId: number
  suggestionType: string
  impactArea: string
  suggestionDraft: string
  targetArea: string
  targetFileHint?: string
  implementationNote: string
  implementationSummary?: string
  verificationNote?: string
  status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'IMPLEMENTED' | 'VERIFIED' | 'REJECTED'
  createdAt: string
  lastActionAt?: string
  implementedAt?: string
  verifiedAt?: string
}

type ActionStats = {
  acceptedCount: number
  implementedCount: number
  verifiedCount: number
  easiestToVerified: Array<{ suggestionType: string; count: number }>
}

export default function ActionsPage() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [targetAreaFilter, setTargetAreaFilter] = useState<string>('ALL')
  const [stats, setStats] = useState<ActionStats | null>(null)

  useEffect(() => {
    fetchActions()
    fetchStats()
  }, [targetAreaFilter])

  async function fetchActions() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
      })
      if (targetAreaFilter !== 'ALL') params.set('targetArea', targetAreaFilter)
      const res = await fetch(`/api/improvements?${params.toString()}`)
      const data = await res.json()
      if (data.ok) {
        setItems(
          data.data.improvements.filter((item: ActionItem) =>
            ['ACCEPTED', 'IMPLEMENTED', 'VERIFIED'].includes(item.status)
          )
        )
      }
    } catch (error) {
      console.error('Failed to load action items:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/improvements/stats')
      const data = await res.json()
      if (data.ok) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to load action stats:', error)
    }
  }

  async function saveImplementationNote(id: string, implementationNote: string) {
    try {
      setSavingId(id)
      const res = await fetch(`/api/improvements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ implementationNote }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) return

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, implementationNote: data.data.implementationNote || implementationNote }
            : item
        )
      )
    } catch (error) {
      console.error('Failed to save implementation note:', error)
    } finally {
      setSavingId(null)
    }
  }

  async function saveTargetFileHint(id: string, targetFileHint: string) {
    try {
      setSavingId(id)
      const res = await fetch(`/api/improvements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFileHint }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) return

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, targetFileHint: data.data.targetFileHint || targetFileHint }
            : item
        )
      )
    } catch (error) {
      console.error('Failed to save targetFileHint:', error)
    } finally {
      setSavingId(null)
    }
  }

  async function saveClosureFields(
    id: string,
    payload: { implementationSummary?: string; verificationNote?: string; status?: ActionItem['status'] }
  ) {
    try {
      setSavingId(id)
      const res = await fetch(`/api/improvements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) return

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: (data.data.status || item.status) as ActionItem['status'],
                implementationSummary: data.data.implementationSummary ?? item.implementationSummary,
                verificationNote: data.data.verificationNote ?? item.verificationNote,
                implementedAt: data.data.implementedAt ?? item.implementedAt,
                verifiedAt: data.data.verifiedAt ?? item.verifiedAt,
                lastActionAt: data.data.lastActionAt ?? item.lastActionAt,
              }
            : item
        )
      )
      await fetchStats()
    } catch (error) {
      console.error('Failed to save closure fields:', error)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">建议落地工作台</h1>
          <p className="mt-2 text-gray-600">
            仅展示 ACCEPTED 改进建议，整理为后续人工实施事项（不自动改任何生产逻辑）。
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          当前 MVP 中，action 的状态、implementationSummary、verificationNote、implementedAt、verifiedAt 仍主要保存在进程内存中。
          服务重启后，这些字段不会完整保留；这里适合作为演示和人工协作看板，不应当作正式持久化工单系统或审计台账。
        </div>

        {stats && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">ACCEPTED</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{stats.acceptedCount}</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">IMPLEMENTED</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{stats.implementedCount}</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">VERIFIED</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{stats.verifiedCount}</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">最易进入 VERIFIED 的类型</div>
              <div className="mt-1 text-sm text-gray-900">
                {stats.easiestToVerified[0]
                  ? `${stats.easiestToVerified[0].suggestionType} (${stats.easiestToVerified[0].count})`
                  : '暂无数据'}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 max-w-sm">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">按目标区域筛选</span>
            <select
              value={targetAreaFilter}
              onChange={(e) => setTargetAreaFilter(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="ALL">全部</option>
              <option value="PROMPT">PROMPT</option>
              <option value="REGEX">REGEX</option>
              <option value="FIELD_MAPPING">FIELD_MAPPING</option>
              <option value="ESTIMATE">ESTIMATE</option>
              <option value="HANDOFF_POLICY">HANDOFF_POLICY</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">来源反思</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">建议类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">影响区域</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">建议草案</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">目标区域</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">目标文件提示</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">落地说明</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">实施与验证</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={9}>加载中...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={9}>暂无闭环中的建议</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4 text-sm text-gray-900">#{item.sourceReflectionId}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{item.suggestionType}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{item.impactArea}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-xs whitespace-pre-wrap">{item.suggestionDraft}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{item.targetArea}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <input
                          defaultValue={item.targetFileHint || ''}
                          className="w-64 rounded border border-gray-300 p-2 text-xs"
                          onBlur={(e) => {
                            if (e.target.value !== (item.targetFileHint || '')) {
                              saveTargetFileHint(item.id, e.target.value)
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <textarea
                          defaultValue={item.implementationNote}
                          rows={4}
                          className="w-72 rounded border border-gray-300 p-2 text-xs"
                          onBlur={(e) => {
                            if (e.target.value !== item.implementationNote) {
                              saveImplementationNote(item.id, e.target.value)
                            }
                          }}
                        />
                        {savingId === item.id && (
                          <p className="mt-1 text-xs text-blue-600">保存中...</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="space-y-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-gray-700">implementationSummary</span>
                            <textarea
                              defaultValue={item.implementationSummary || ''}
                              rows={3}
                              className="w-72 rounded border border-gray-300 p-2 text-xs"
                              onBlur={(e) => {
                                if (e.target.value !== (item.implementationSummary || '')) {
                                  saveClosureFields(item.id, { implementationSummary: e.target.value })
                                }
                              }}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-gray-700">verificationNote</span>
                            <textarea
                              defaultValue={item.verificationNote || ''}
                              rows={3}
                              className="w-72 rounded border border-gray-300 p-2 text-xs"
                              onBlur={(e) => {
                                if (e.target.value !== (item.verificationNote || '')) {
                                  saveClosureFields(item.id, { verificationNote: e.target.value })
                                }
                              }}
                            />
                          </label>
                          {item.status === 'ACCEPTED' && (
                            <button
                              onClick={() => saveClosureFields(item.id, { status: 'IMPLEMENTED' })}
                              disabled={savingId === item.id}
                              className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              标记为 IMPLEMENTED
                            </button>
                          )}
                          {item.status === 'IMPLEMENTED' && (
                            <button
                              onClick={() => saveClosureFields(item.id, { status: 'VERIFIED' })}
                              disabled={savingId === item.id}
                              className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                            >
                              标记为 VERIFIED
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>{item.status}</div>
                        {item.implementedAt && (
                          <div className="mt-1 text-xs text-gray-500">implementedAt: {new Date(item.implementedAt).toLocaleString()}</div>
                        )}
                        {item.verifiedAt && (
                          <div className="mt-1 text-xs text-gray-500">verifiedAt: {new Date(item.verifiedAt).toLocaleString()}</div>
                        )}
                        {item.lastActionAt && (
                          <div className="mt-1 text-xs text-gray-500">lastActionAt: {new Date(item.lastActionAt).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div>{new Date(item.createdAt).toLocaleString()}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
