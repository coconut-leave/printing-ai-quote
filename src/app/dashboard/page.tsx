'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminPageNav } from '@/components/AdminPageNav'
import {
  getClarificationReasonLabel,
  getClarificationResolvedToLabel,
  getProductTypeDisplayName,
} from '@/lib/admin/presentation'

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
  clarificationOverview: {
    clarificationTriggerCount: number
    clarificationConversationCount: number
    recoveredConversationCount: number
    handoffConversationCount: number
    noFollowupConversationCount: number
    recoveryRate: number
    handoffRate: number
  }
  clarificationReasonBreakdown: Array<{
    reason: 'noisy_input' | 'unstable_intent' | 'blocked_context_reuse' | 'other'
    triggerCount: number
    recoveredCount: number
    handoffCount: number
    noFollowupCount: number
    recoveryRate: number
  }>
  clarificationResolvedBreakdown: Array<{
    resolvedTo: 'recommendation' | 'missing_fields' | 'estimated' | 'quoted' | 'handoff_required' | 'no_followup' | 'other'
    count: number
  }>
  productTypeBreakdown: Array<{
    productType: string
    quotedCount: number
    estimatedCount: number
    missingFieldsCount: number
    handoffRequiredCount: number
  }>
  nonActiveProductTypeBreakdown: Array<{
    productType: string
    quotedCount: number
    estimatedCount: number
    missingFieldsCount: number
    handoffRequiredCount: number
  }>
  activeAutoQuoteProductTypes: string[]
  nonActiveProductRecordCount: number
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
  return getProductTypeDisplayName(productType)
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
        <AdminPageNav current='dashboard' />
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">运营看板</h1>
            <p className="mt-2 text-gray-600">
              汇总当前活跃复杂包装主链路、咨询链路和学习闭环的关键指标，只复用现有 metadata 与统计逻辑，不引入新的业务判定。
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
              学习看板
            </Link>
          </div>
        </div>

        {loading && <div className="rounded-lg bg-white p-6 shadow">加载中...</div>}

        {!loading && stats && (
          <>
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              当前窗口：{stats.period.label}。基于最近 {stats.sampledConversationCount} 个会话样本和当前学习记录聚合，同时对比上一等长周期，用于观察链路趋势，不替代详细后台页面。
            </div>

            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              主统计当前只展示活跃复杂包装自动报价范围：{stats.activeAutoQuoteProductTypes.map(formatProductType).join('、')}。
              {stats.nonActiveProductRecordCount > 0 && ` 已将 ${stats.nonActiveProductRecordCount} 条非当前活跃品类链路记录移出主统计，避免干扰运营判断。`}
            </div>

            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              学习区当前只有学习记录是数据库持久化的；改进建议和执行动作的状态、实施备注仍主要来自进程内存。
              因此看板中的学习指标更适合演示和人工研判，不应当作正式长期台账或跨重启精确统计口径。
            </div>

            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold text-amber-950">上线后优先看这 4 组指标</div>
              <div className="mt-2">1. 正式报价 和 咨询进入正式报价：确认系统是否真的把询价推进到成交前一步。</div>
              <div>2. 待补参数：如果持续偏高，优先看缺失字段 TOP，说明补参效率或参数抽取需要排查。</div>
              <div>3. 人工复核 和转人工原因 TOP：观察是否出现异常放量，避免标准询价大量流失到人工。</div>
              <div>4. 咨询进入推荐确认：判断推荐方案是否能把咨询流量继续推进到正式报价。</div>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">当前活跃复杂包装报价链路</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">正式报价</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.quotedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.quotedCountDelta)}</div></div>
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">参考报价</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.estimatedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.estimatedCountDelta)}</div></div>
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">待补参数</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.missingFieldsCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.missingFieldsCountDelta)}</div></div>
                <div className="rounded-lg bg-white p-4 shadow"><div className="text-sm text-gray-600">人工复核</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.quotePathOverview.handoffRequiredCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.quotePathTrend.handoffRequiredCountDelta)}</div></div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">澄清与恢复</h2>
                    <p className="mt-1 text-sm text-gray-500">观察异常输入被拦住之后，用户是否继续补成有效业务路径。</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    触发 {stats.clarificationOverview.clarificationTriggerCount} 次
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded border border-gray-100 p-4 text-sm">
                    <div className="text-gray-600">澄清触发会话</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{stats.clarificationOverview.clarificationConversationCount}</div>
                  </div>
                  <div className="rounded border border-gray-100 p-4 text-sm">
                    <div className="text-gray-600">澄清后恢复成功</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{stats.clarificationOverview.recoveredConversationCount}</div>
                    <div className="mt-1 text-xs text-gray-500">恢复率 {stats.clarificationOverview.recoveryRate}%</div>
                  </div>
                  <div className="rounded border border-gray-100 p-4 text-sm">
                    <div className="text-gray-600">澄清后转人工</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{stats.clarificationOverview.handoffConversationCount}</div>
                    <div className="mt-1 text-xs text-gray-500">转人工率 {stats.clarificationOverview.handoffRate}%</div>
                  </div>
                  <div className="rounded border border-gray-100 p-4 text-sm">
                    <div className="text-gray-600">澄清后无后续消息</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{stats.clarificationOverview.noFollowupConversationCount}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">按触发原因看恢复率</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">触发原因</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">触发次数</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">恢复成功</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">转人工</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">无后续</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">恢复率</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {stats.clarificationReasonBreakdown.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-3 text-center text-gray-500">当前窗口内暂无澄清触发</td>
                            </tr>
                          )}
                          {stats.clarificationReasonBreakdown.map((item) => (
                            <tr key={item.reason}>
                              <td className="px-3 py-3 font-medium text-gray-900">{getClarificationReasonLabel(item.reason)}</td>
                              <td className="px-3 py-3 text-gray-700">{item.triggerCount}</td>
                              <td className="px-3 py-3 text-gray-700">{item.recoveredCount}</td>
                              <td className="px-3 py-3 text-gray-700">{item.handoffCount}</td>
                              <td className="px-3 py-3 text-gray-700">{item.noFollowupCount}</td>
                              <td className="px-3 py-3 text-gray-700">{item.recoveryRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">澄清后的去向</h3>
                    <div className="space-y-3">
                      {stats.clarificationResolvedBreakdown.length === 0 && (
                        <div className="rounded border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
                          当前窗口内还没有可展示的澄清恢复结果。
                        </div>
                      )}
                      {stats.clarificationResolvedBreakdown.map((item) => (
                        <div key={item.resolvedTo} className="flex items-center justify-between rounded border border-gray-100 px-4 py-3 text-sm">
                          <span className="font-medium text-gray-900">{getClarificationResolvedToLabel(item.resolvedTo)}</span>
                          <span className="text-gray-700">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-950">怎么看这组指标</h2>
                <div className="mt-3 space-y-2 text-sm text-amber-900">
                  <div>1. 澄清触发会话高，但恢复成功也高：说明 guardrail 在拦错路，同时没有明显打断成交推进。</div>
                  <div>2. 噪声输入触发多且无后续高：说明这批输入本身价值低，当前策略基本合理。</div>
                  <div>3. 阻止沿用旧报价的触发多，但恢复率低：说明上下文拦截可能偏严，需要回看补参和改单短句样本。</div>
                  <div>4. 意图不稳定触发后大量转人工：说明澄清文案或推荐承接可能还不够贴近业务话术。</div>
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">咨询链路概览</h2>
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="rounded border border-gray-100 p-3">带推荐参数的咨询<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationWithRecommendedParamsCount}</div></div>
                  <div className="rounded border border-gray-100 p-3">咨询进入推荐确认<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationToRecommendationConfirmationCount}</div></div>
                  <div className="rounded border border-gray-100 p-3">咨询进入参考报价<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationToEstimatedCount}</div></div>
                  <div className="rounded border border-gray-100 p-3">咨询进入正式报价<div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationOverview.consultationToQuotedCount}</div></div>
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
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">咨询回复</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.consultationReplyCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.consultationReplyCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">带推荐参数的咨询</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.consultationWithRecommendedParamsCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.consultationWithRecommendedParamsCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">推荐确认</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.recommendationConfirmationCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.recommendationConfirmationCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">参考报价</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.estimatedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.estimatedCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">正式报价</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.consultationFunnel.quotedCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.consultationFunnelTrend.quotedCountDelta)}</div></div>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">按当前活跃复杂包装品类拆分的链路表现</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">品类</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">正式报价</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">参考报价</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">待补参数</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">人工复核</th>
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

            {stats.nonActiveProductRecordCount > 0 && (
              <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">已移出主看板的历史品类记录</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      下表仅用于历史观察，包含简单品类或未归入当前活跃复杂包装自动报价范围的记录，不参与上方主统计口径。
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
                    共 {stats.nonActiveProductRecordCount} 条链路记录
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">品类</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">正式报价</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">参考报价</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">待补参数</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">人工复核</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {stats.nonActiveProductTypeBreakdown.map((item) => (
                        <tr key={item.productType} className="bg-white">
                          <td className="px-4 py-3 font-medium text-slate-900">{formatProductType(item.productType)}</td>
                          <td className="px-4 py-3 text-slate-700">{item.quotedCount}</td>
                          <td className="px-4 py-3 text-slate-700">{item.estimatedCount}</td>
                          <td className="px-4 py-3 text-slate-700">{item.missingFieldsCount}</td>
                          <td className="px-4 py-3 text-slate-700">{item.handoffRequiredCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-1">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">学习闭环概览</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">学习记录总数</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.reflectionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.reflectionCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">已通过学习记录</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.approvedReflectionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.approvedReflectionCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">已采纳改进建议</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.acceptedImprovementCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.acceptedImprovementCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">已落地执行动作</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.implementedActionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.implementedActionCountDelta)}</div></div>
                  <div className="rounded border border-gray-100 p-3 text-sm"><div className="text-gray-600">已验证执行动作</div><div className="mt-1 text-xl font-bold text-gray-900">{stats.learningOverview.verifiedActionCount}</div><div className="mt-1 text-xs text-gray-500">{formatDelta(stats.learningTrend.verifiedActionCountDelta)}</div></div>
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