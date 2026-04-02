'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type DashboardResponse = {
  totals: {
    reflectionCount: number
    approvedImprovementCount: number
    acceptedImprovementCount: number
    implementedActionCount: number
    verifiedActionCount: number
  }
  issueTypeDistribution: Array<{
    issueType: string
    count: number
  }>
  suggestionTypeAcceptance: Array<{
    suggestionType: string
    totalCount: number
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
    acceptanceRate: number
  }>
  targetAreaActionDistribution: Array<{
    targetArea: string
    actionCount: number
    implementedCount: number
    verifiedCount: number
  }>
  impactAreaDistribution: Array<{
    impactArea: string
    improvementCount: number
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
  }>
  actionConversion: {
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
    implementedRateFromAccepted: number
    verifiedRateFromImplemented: number
    verifiedRateFromAccepted: number
  }
  recentActivityOverview: {
    sevenDays: {
      reflectionCount: number
      approvedImprovementCount: number
      acceptedActionCount: number
      implementedActionCount: number
      verifiedActionCount: number
    }
    thirtyDays: {
      reflectionCount: number
      approvedImprovementCount: number
      acceptedActionCount: number
      implementedActionCount: number
      verifiedActionCount: number
    }
    recentActivities: Array<{
      type: 'REFLECTION' | 'ACCEPTED' | 'IMPLEMENTED' | 'VERIFIED'
      title: string
      impactArea?: string
      at: string
    }>
  }
  improvementObservations: Array<{
    improvementId: string
    title: string
    issueType: string
    impactArea: string
    verifiedAt?: string
    beforeCount?: number
    afterCount?: number
    delta?: number
    status: 'observed' | 'insufficient_data'
    note: string
  }>
  prioritySignals: {
    issueTypeTop: Array<{
      issueType: string
      reflectionCount: number
      approvedCount: number
      acceptedCount: number
      verifiedCount: number
      priorityScore: number
    }>
    suggestionTypeTop: Array<{
      suggestionType: string
      totalCount: number
      acceptedCount: number
      implementedCount: number
      verifiedCount: number
      priorityScore: number
    }>
    impactAreaTop: Array<{
      impactArea: string
      improvementCount: number
      acceptedCount: number
      implementedCount: number
      verifiedCount: number
      priorityScore: number
    }>
    nextEngineeringCandidates: Array<{
      improvementId: string
      title: string
      suggestionType: string
      impactArea: string
      targetArea: string
      reason: string
    }>
    lowSignalVerifiedActions: Array<{
      improvementId: string
      title: string
      impactArea: string
      status: 'insufficient_data' | 'no_clear_improvement'
      note: string
    }>
  }
  chainImpactSignals: Array<{
    impactArea: string
    positiveCount: number
    flatOrNegativeCount: number
    insufficientDataCount: number
    note: string
  }>
}

function formatIssueType(value: string) {
  const map: Record<string, string> = {
    PARAM_MISSING: '缺失参数',
    PARAM_WRONG: '参数错误',
    QUOTE_INACCURATE: '报价不准',
    SHOULD_HANDOFF: '应转人工',
  }
  return map[value] || value
}

function formatSuggestionType(value: string) {
  const map: Record<string, string> = {
    PROMPT_IMPROVEMENT: '提示词',
    REGEX_IMPROVEMENT: '正则提取',
    FIELD_MAPPING_IMPROVEMENT: '字段映射',
    ESTIMATE_DEFAULT_IMPROVEMENT: '估算默认值',
    HANDOFF_POLICY_IMPROVEMENT: '转人工策略',
    OTHER: '其他',
  }
  return map[value] || value
}

function formatImpactArea(value: string) {
  const map: Record<string, string> = {
    CONSULTATION: '咨询链路',
    RECOMMENDATION: '推荐链路',
    PATCH: 'patch 链路',
    PRICING: '报价链路',
    HANDOFF: '人工接管',
    OTHER: '其他',
  }
  return map[value] || value
}

function formatTargetArea(value: string) {
  const map: Record<string, string> = {
    PROMPT: 'PROMPT',
    REGEX: 'REGEX',
    FIELD_MAPPING: 'FIELD_MAPPING',
    ESTIMATE: 'ESTIMATE',
    HANDOFF_POLICY: 'HANDOFF_POLICY',
    OTHER: 'OTHER',
  }
  return map[value] || value
}

export default function LearningDashboardPage() {
  const [stats, setStats] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)
      const response = await fetch('/api/learning-dashboard')
      const data = await response.json()
      if (data.ok) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch learning dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Learning Dashboard</h1>
            <p className="mt-2 text-gray-600">
              基于现有 reflection、improvement、action 状态的轻量学习效果总览，只做观察性统计，不自动修改任何主链路规则。
            </p>
            <p className='mt-2 text-sm text-amber-700'>
              当前 MVP 中：reflection 记录存数据库；improvement/action 的状态、备注与验证信息仍主要保存在进程内存中，服务重启后会丢失，因此该页当前更适合作为演示与人工研判辅助，不应当作正式审计台账。
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/reflections" className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              查看 Reflections
            </Link>
            <Link href="/actions" className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              查看 Actions
            </Link>
          </div>
        </div>

        {loading && <div className="rounded-lg bg-white p-6 shadow">加载中...</div>}

        {!loading && stats && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">Reflection 总数</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.reflectionCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">Approved Improvements</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.approvedImprovementCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">Accepted Improvements</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.acceptedImprovementCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">Implemented Actions</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.implementedActionCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">Verified Actions</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.verifiedActionCount}</div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">IssueType TOP 列表</h2>
                <div className="space-y-3">
                  {stats.issueTypeDistribution.map((item) => (
                    <div key={item.issueType} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div className="font-medium text-gray-900">{formatIssueType(item.issueType)}</div>
                      <div className="text-gray-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">SuggestionType 接受情况</h2>
                <div className="space-y-3">
                  {stats.suggestionTypeAcceptance.map((item) => (
                    <div key={item.suggestionType} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="mb-2 font-medium text-gray-900">{formatSuggestionType(item.suggestionType)}</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>总数: {item.totalCount}</div>
                        <div>接受率: {item.acceptanceRate}%</div>
                        <div>已接受: {item.acceptedCount}</div>
                        <div>已实施: {item.implementedCount}</div>
                        <div>已验证: {item.verifiedCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Action 实施 / 验证比例</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>ACCEPTED</span>
                    <span>{stats.actionConversion.acceptedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>IMPLEMENTED</span>
                    <span>{stats.actionConversion.implementedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VERIFIED</span>
                    <span>{stats.actionConversion.verifiedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>从 ACCEPTED 到 IMPLEMENTED</span>
                    <span>{stats.actionConversion.implementedRateFromAccepted}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>从 IMPLEMENTED 到 VERIFIED</span>
                    <span>{stats.actionConversion.verifiedRateFromImplemented}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>从 ACCEPTED 到 VERIFIED</span>
                    <span>{stats.actionConversion.verifiedRateFromAccepted}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">ImpactArea 分布</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {stats.impactAreaDistribution.map((item) => (
                    <div key={item.impactArea} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="mb-2 font-medium text-gray-900">{formatImpactArea(item.impactArea)}</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>improvement: {item.improvementCount}</div>
                        <div>accepted: {item.acceptedCount}</div>
                        <div>implemented: {item.implementedCount}</div>
                        <div>verified: {item.verifiedCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">各 TargetArea 的 Action 数量</h2>
                <div className="space-y-3">
                  {stats.targetAreaActionDistribution.map((item) => (
                    <div key={item.targetArea} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div>
                        <div className="font-medium text-gray-900">{formatTargetArea(item.targetArea)}</div>
                        <div className="text-gray-500">implemented {item.implementedCount} / verified {item.verifiedCount}</div>
                      </div>
                      <div className="text-gray-900">{item.actionCount}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最近 7 天 / 30 天 Learning 活动</h2>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                  <div className="rounded border border-gray-100 p-3">
                    <div className="mb-2 font-medium text-gray-900">7 天</div>
                    <div>reflection: {stats.recentActivityOverview.sevenDays.reflectionCount}</div>
                    <div>approved improvement: {stats.recentActivityOverview.sevenDays.approvedImprovementCount}</div>
                    <div>accepted action: {stats.recentActivityOverview.sevenDays.acceptedActionCount}</div>
                    <div>implemented: {stats.recentActivityOverview.sevenDays.implementedActionCount}</div>
                    <div>verified: {stats.recentActivityOverview.sevenDays.verifiedActionCount}</div>
                  </div>
                  <div className="rounded border border-gray-100 p-3">
                    <div className="mb-2 font-medium text-gray-900">30 天</div>
                    <div>reflection: {stats.recentActivityOverview.thirtyDays.reflectionCount}</div>
                    <div>approved improvement: {stats.recentActivityOverview.thirtyDays.approvedImprovementCount}</div>
                    <div>accepted action: {stats.recentActivityOverview.thirtyDays.acceptedActionCount}</div>
                    <div>implemented: {stats.recentActivityOverview.thirtyDays.implementedActionCount}</div>
                    <div>verified: {stats.recentActivityOverview.thirtyDays.verifiedActionCount}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {stats.recentActivityOverview.recentActivities.map((item, index) => (
                    <div key={`${item.type}-${item.at}-${index}`} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="mt-1 text-gray-600">{item.type}{item.impactArea ? ` / ${formatImpactArea(item.impactArea)}` : ''}</div>
                      <div className="mt-1 text-gray-500">{new Date(item.at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">最小改善观察</h2>
              <p className="mb-4 text-sm text-gray-600">
                这里只做 VERIFIED 后前后窗口的观察性对比，不做严格因果分析。如果样本不足，会明确提示“可观察但暂无法严格验证”。
              </p>
              <div className="space-y-3">
                {stats.improvementObservations.length === 0 && <div className="text-sm text-gray-500">暂无 VERIFIED action 可观察。</div>}
                {stats.improvementObservations.map((item) => (
                  <div key={item.improvementId} className="rounded border border-gray-100 p-3 text-sm">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="mt-1 text-gray-600">{formatIssueType(item.issueType)} / {formatImpactArea(item.impactArea)}</div>
                    {item.verifiedAt && <div className="mt-1 text-gray-500">verifiedAt: {new Date(item.verifiedAt).toLocaleString()}</div>}
                    {item.status === 'observed' && (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-gray-600">
                        <div>before: {item.beforeCount}</div>
                        <div>after: {item.afterCount}</div>
                        <div>delta: {item.delta}</div>
                      </div>
                    )}
                    <div className="mt-2 text-gray-700">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">当前优先问题类型</h2>
                <div className="space-y-3">
                  {stats.prioritySignals.issueTypeTop.map((item) => (
                    <div key={item.issueType} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{formatIssueType(item.issueType)}</div>
                      <div className="mt-1 text-gray-600">reflection {item.reflectionCount} / accepted {item.acceptedCount} / verified {item.verifiedCount}</div>
                      <div className="mt-1 text-gray-500">priority score {item.priorityScore}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">当前优先建议类型</h2>
                <div className="space-y-3">
                  {stats.prioritySignals.suggestionTypeTop.map((item) => (
                    <div key={item.suggestionType} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{formatSuggestionType(item.suggestionType)}</div>
                      <div className="mt-1 text-gray-600">accepted {item.acceptedCount} / implemented {item.implementedCount} / verified {item.verifiedCount}</div>
                      <div className="mt-1 text-gray-500">priority score {item.priorityScore}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最值得关注的影响区域</h2>
                <div className="space-y-3">
                  {stats.prioritySignals.impactAreaTop.map((item) => (
                    <div key={item.impactArea} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{formatImpactArea(item.impactArea)}</div>
                      <div className="mt-1 text-gray-600">improvement {item.improvementCount} / accepted {item.acceptedCount} / verified {item.verifiedCount}</div>
                      <div className="mt-1 text-gray-500">priority score {item.priorityScore}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">下一轮工程任务候选</h2>
                <p className="mb-4 text-sm text-gray-600">这里只列出已经 ACCEPTED、但还没有真正进入实施的改进建议，方便下一轮工程排期。</p>
                <div className="space-y-3">
                  {stats.prioritySignals.nextEngineeringCandidates.length === 0 && <div className="text-sm text-gray-500">暂无 ACCEPTED 但未实施的候选项。</div>}
                  {stats.prioritySignals.nextEngineeringCandidates.map((item) => (
                    <div key={item.improvementId} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="mt-1 text-gray-600">{formatSuggestionType(item.suggestionType)} / {formatImpactArea(item.impactArea)} / {formatTargetArea(item.targetArea)}</div>
                      <div className="mt-2 text-gray-700">{item.reason}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">已验证但暂未见明显效果</h2>
                <p className="mb-4 text-sm text-gray-600">包括两类：一类是 VERIFIED 后观察窗口样本不足；另一类是已有样本但暂时没看到明显下降迹象。</p>
                <div className="space-y-3">
                  {stats.prioritySignals.lowSignalVerifiedActions.length === 0 && <div className="text-sm text-gray-500">当前没有低信号 VERIFIED action。</div>}
                  {stats.prioritySignals.lowSignalVerifiedActions.map((item) => (
                    <div key={item.improvementId} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="mt-1 text-gray-600">{formatImpactArea(item.impactArea)} / {item.status === 'insufficient_data' ? '样本不足' : '未见明确改善'}</div>
                      <div className="mt-2 text-gray-700">{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">按 impactArea 看改善迹象</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {stats.chainImpactSignals.length === 0 && <div className="text-sm text-gray-500">暂无可归纳的 impactArea 观察数据。</div>}
                {stats.chainImpactSignals.map((item) => (
                  <div key={item.impactArea} className="rounded border border-gray-100 p-3 text-sm">
                    <div className="font-medium text-gray-900">{formatImpactArea(item.impactArea)}</div>
                    <div className="mt-2 text-gray-600">正向迹象 {item.positiveCount}</div>
                    <div className="text-gray-600">无明显改善 {item.flatOrNegativeCount}</div>
                    <div className="text-gray-600">样本不足 {item.insufficientDataCount}</div>
                    <div className="mt-2 text-gray-700">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}