'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type DashboardResponse = {
  period: {
    key: 'today' | '7d' | '30d'
    label: string
    startAt: string
    endAt: string
    previousStartAt: string
    previousEndAt: string
  }
  quotePathOverview: {
    quotedCount: number
    estimatedCount: number
    missingFieldsCount: number
    handoffRequiredCount: number
  }
  quotePathTrend: {
    quotedCountDelta: number
    estimatedCountDelta: number
    missingFieldsCountDelta: number
    handoffRequiredCountDelta: number
  }
  consultationOverview: {
    consultationIntentDistribution: Array<{
      intent: string
      count: number
    }>
    consultationWithRecommendedParamsCount: number
    consultationToRecommendationConfirmationCount: number
    consultationToEstimatedCount: number
    consultationToQuotedCount: number
  }
  consultationFunnel: {
    consultationReplyCount: number
    consultationWithRecommendedParamsCount: number
    recommendationConfirmationCount: number
    estimatedCount: number
    quotedCount: number
  }
  consultationFunnelTrend: {
    consultationReplyCountDelta: number
    consultationWithRecommendedParamsCountDelta: number
    recommendationConfirmationCountDelta: number
    estimatedCountDelta: number
    quotedCountDelta: number
  }
  productTypeBreakdown: Array<{
    productType: string
    quotedCount: number
    estimatedCount: number
    missingFieldsCount: number
    handoffRequiredCount: number
  }>
  learningOverview: {
    reflectionCount: number
    approvedReflectionCount: number
    acceptedImprovementCount: number
    implementedActionCount: number
    verifiedActionCount: number
  }
  learningTrend: {
    reflectionCountDelta: number
    approvedReflectionCountDelta: number
    acceptedImprovementCountDelta: number
    implementedActionCountDelta: number
    verifiedActionCountDelta: number
  }
  topIssues: {
    missingFields: Array<{
      field: string
      count: number
    }>
    consultationTopics: Array<{
      topic: string
      count: number
    }>
    handoffReasons: Array<{
      reason: string
      count: number
    }>
  }
  sampledConversationCount: number
}

function formatIntent(intent: string) {
  const map: Record<string, string> = {
    MATERIAL_CONSULTATION: '材料咨询',
    PROCESS_CONSULTATION: '工艺咨询',
    SPEC_RECOMMENDATION: '规格建议',
    SOLUTION_RECOMMENDATION: '方案推荐',
  }
  return map[intent] || intent
}

function formatField(field: string) {
  const map: Record<string, string> = {
    productType: '产品类型',
    finishedSize: '成品尺寸',
    quantity: '数量',
    pageCount: '页数',
    coverPaper: '封面纸张',
    coverWeight: '封面克重',
    innerPaper: '内页纸张',
    innerWeight: '内页克重',
    bindingType: '装订方式',
    paperType: '纸张类型',
    paperWeight: '纸张克重',
    printSides: '单双面',
    finishType: '表面工艺',
    lamination: '覆膜',
  }
  return map[field] || field
}

function formatProductType(productType: string) {
  const map: Record<string, string> = {
    album: '画册',
    flyer: '传单',
    business_card: '名片',
    poster: '海报',
    sticker: '贴纸',
    paper_bag: '纸袋',
    unknown: '未识别',
  }
  return map[productType] || productType
}

function formatDelta(delta: number) {
  if (delta > 0) return `较上期 +${delta}`
  if (delta < 0) return `较上期 ${delta}`
  return '较上期 0'
}

const PERIOD_OPTIONS: Array<{ key: 'today' | '7d' | '30d'; label: string }> = [
  { key: 'today', label: '今日' },
  { key: '7d', label: '最近7天' },
  { key: '30d', label: '最近30天' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('30d')

  useEffect(() => {
    fetchStats()
  }, [period])

  async function fetchStats() {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard?period=${period}`)
      const data = await response.json()
      if (data.ok) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              汇总报价主链路、咨询链路和 learning system 的关键指标，只复用现有 metadata 与统计逻辑，不引入新的业务判定。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setPeriod(option.key)}
                  className={period === option.key
                    ? 'rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50'}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/conversations" className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              查看会话
            </Link>
            <Link href="/learning-dashboard" className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Learning Dashboard
            </Link>
          </div>
        </div>

        {loading && <div className="rounded-lg bg-white p-6 shadow">加载中...</div>}

        {!loading && stats && (
          <>
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              当前窗口：{stats.period.label}。基于最近 {stats.sampledConversationCount} 个 conversation 样本和当前 reflection 数据聚合，同时对比上一等长周期，用于观察链路趋势，不替代详细后台页面。
            </div>

            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              learning 区域当前只有 reflection 记录是数据库持久化的；improvement / action 的状态和实施备注仍主要来自进程内存。
              因此 Dashboard 中 learning 指标更适合演示和人工研判，不应当作正式长期台账或跨重启精确统计口径。
            </div>

            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold text-amber-950">上线后优先看这 4 组指标</div>
              <div className="mt-2">1. `quoted` 和 `consultation → quoted`：确认系统是否真的把询价推进到成交前一步。</div>
              <div>2. `missing_fields`：如果持续偏高，优先看缺失字段 TOP，说明补参效率或参数抽取需要排查。</div>
              <div>3. `handoff_required` 和转人工原因 TOP：观察是否出现异常放量，避免标准询价大量流失到人工。</div>
              <div>4. `consultation → recommendation_confirmation`：判断推荐方案是否能把咨询流量继续推进到正式报价。</div>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">报价链路概览</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">quoted</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.quotedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.quotedCountDelta)}</div></div>
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">estimated</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.estimatedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.estimatedCountDelta)}</div></div>
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">missing_fields</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.missingFieldsCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.missingFieldsCountDelta)}</div></div>
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">handoff_required</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.handoffRequiredCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.handoffRequiredCountDelta)}</div></div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">咨询链路概览</h2>
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="rounded border border-gray-100 p-3">带 recommendedParams 的咨询<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationWithRecommendedParamsCount}</div></div>
                  <div className="rounded border border-gray-100 p-3">consultation → recommendation_confirmation<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationToRecommendationConfirmationCount}</div></div>
                  <div className="rounded border border-gray-100 p-3">consultation → estimated<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationToEstimatedCount}</div></div>
                  <div className="rounded border border-gray-100 p-3">consultation → quoted<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationToQuotedCount}</div></div>
                </div>
                <div className="space-y-3">
                  {stats.consultationOverview.consultationIntentDistribution.map((item) => (
                    <div key={item.intent} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div className="font-medium text-gray-900">{formatIntent(item.intent)}</div>
                      <div className="text-gray-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">咨询 → 推荐 → 报价漏斗</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">consultation_reply</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.consultationReplyCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.consultationReplyCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">recommended consultation</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.consultationWithRecommendedParamsCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.consultationWithRecommendedParamsCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">recommendation_confirmation</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.recommendationConfirmationCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.recommendationConfirmationCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">estimated</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.estimatedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.estimatedCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">quoted</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.quotedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.quotedCountDelta)}</div></div>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">按 productType 拆分的链路表现</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">productType</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">quoted</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">estimated</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">missing_fields</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">handoff_required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.productTypeBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-500">暂无数据</td>
                      </tr>
                    )}
                    {stats.productTypeBreakdown.map((item) => (
                      <tr key={item.productType} className="bg-white">
                        <td className="px-4 py-3 font-medium text-gray-900">{formatProductType(item.productType)}</td>
                        <td className="px-4 py-3 text-gray-700">{item.quotedCount}</td>
                        <td className="px-4 py-3 text-gray-700">{item.estimatedCount}</td>
                        <td className="px-4 py-3 text-gray-700">{item.missingFieldsCount}</td>
                        <td className="px-4 py-3 text-gray-700">{item.handoffRequiredCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-1">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">学习闭环概览</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">reflection 总数</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.reflectionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.reflectionCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">APPROVED reflection</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.approvedReflectionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.approvedReflectionCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">ACCEPTED improvement</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.acceptedImprovementCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.acceptedImprovementCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">IMPLEMENTED action</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.implementedActionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.implementedActionCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">VERIFIED action</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.verifiedActionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.verifiedActionCountDelta)}</div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最常缺失字段 TOP 5</h2>
                <div className="space-y-3">
                  {stats.topIssues.missingFields.length === 0 && <div className="text-sm text-gray-500">暂无数据</div>}
                  {stats.topIssues.missingFields.map((item) => (
                    <div key={item.field} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div className="font-medium text-gray-900">{formatField(item.field)}</div>
                      <div className="text-gray-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最常见咨询主题 TOP 5</h2>
                <div className="space-y-3">
                  {stats.topIssues.consultationTopics.length === 0 && <div className="text-sm text-gray-500">暂无数据</div>}
                  {stats.topIssues.consultationTopics.map((item) => (
                    <div key={item.topic} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div className="font-medium text-gray-900">{formatIntent(item.topic)}</div>
                      <div className="text-gray-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最常见转人工原因 TOP 5</h2>
                <div className="space-y-3">
                  {stats.topIssues.handoffReasons.length === 0 && <div className="text-sm text-gray-500">暂无数据</div>}
                  {stats.topIssues.handoffReasons.map((item) => (
                    <div key={item.reason} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div className="max-w-xs font-medium text-gray-900">{item.reason}</div>
                      <div className="ml-3 text-gray-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}