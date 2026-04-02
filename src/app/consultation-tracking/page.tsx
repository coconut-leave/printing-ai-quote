'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type StatsResponse = {
  totals: {
    consultationMessageCount: number
    consultationConversationCount: number
    consultationWithRecommendedParamsCount: number
    consultationWithRecommendedConversationCount: number
    recommendationConfirmationConversationCount: number
    recommendationUpdatedCount: number
    estimatedConversionCount: number
    quotedConversionCount: number
    recommendationToEstimatedCount: number
    recommendationToQuotedCount: number
    recommendationToHandoffCount: number
    recommendationInterruptedCount: number
    recommendationMissingFieldsStalledCount: number
    recommendationUpdatedStalledCount: number
    knowledgeOnlyConversationCount: number
  }
  productTypeRecommendationConversion: Array<{
    productType: string
    flowCount: number
    recommendationConfirmationCount: number
    recommendationUpdatedCount: number
    estimatedCount: number
    quotedCount: number
    handoffCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
  }>
  recommendedSolutionConversion: Array<{
    cardId: string
    cardTitle: string
    productType?: string
    flowCount: number
    recommendationConfirmationCount: number
    recommendationUpdatedCount: number
    estimatedCount: number
    quotedCount: number
    handoffCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
    quotedRate: number
  }>
  recommendationStallDistribution: Array<{
    cardId: string
    cardTitle: string
    productType?: string
    recommendationUpdatedStalledCount: number
    missingFieldsStalledCount: number
    interruptedCount: number
  }>
  recentRecommendationFlows: Array<{
    conversationId: number
    productType?: string
    consultationIntent: string
    cardId?: string
    cardTitle?: string
    hasRecommendedParams: boolean
    latestStage:
      | 'consultation_reply'
      | 'recommendation_updated'
      | 'recommendation_confirmation'
      | 'missing_fields'
      | 'estimated'
      | 'quoted'
      | 'handoff_required'
      | 'interrupted'
    recommendationUpdatedCount: number
    recommendationConfirmationCount: number
  }>
  knowledgeCardHitDistribution: Array<{
    cardId: string
    cardTitle: string
    category: string
    hitCount: number
    recommendedCount: number
  }>
  recentKnowledgeHits: Array<{
    conversationId: number
    consultationIntent: string
    cardId: string
    cardTitle: string
    category: string
    hasRecommendedParams: boolean
    productType?: string
  }>
  consultationIntentDistribution: Array<{
    intent: string
    count: number
    recommendedCount: number
  }>
  consultationOutcomeByIntent: Array<{
    intent: string
    conversationCount: number
    withRecommendedParamsCount: number
    estimatedCount: number
    quotedCount: number
    knowledgeOnlyCount: number
  }>
  recentConversions: Array<{
    conversationId: number
    consultationIntent: string
    hasRecommendedParams: boolean
    finalOutcome: 'estimated' | 'quoted' | 'knowledge_only'
  }>
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

function formatOutcome(outcome: string) {
  if (outcome === 'quoted') return '进入正式报价'
  if (outcome === 'estimated') return '进入参考报价'
  return '停留在知识回复'
}

function formatCategory(category: string) {
  const map: Record<string, string> = {
    MATERIAL: '材料类',
    PROCESS: '工艺类',
    SPEC: '规格类',
    SOLUTION: '方案类',
  }
  return map[category] || category
}

function formatProductType(productType?: string) {
  const map: Record<string, string> = {
    album: '画册',
    flyer: '传单',
    business_card: '名片',
    poster: '海报',
    unknown: '未识别',
  }
  if (!productType) return '未识别'
  return map[productType] || productType
}

function formatFlowStage(stage: StatsResponse['recentRecommendationFlows'][number]['latestStage']) {
  const map: Record<StatsResponse['recentRecommendationFlows'][number]['latestStage'], string> = {
    consultation_reply: '停留在 consultation_reply',
    recommendation_updated: '停留在 recommendation_updated',
    recommendation_confirmation: '停留在 recommendation_confirmation',
    missing_fields: '停留在 missing_fields',
    estimated: '进入 estimated',
    quoted: '进入 quoted',
    handoff_required: '转人工',
    interrupted: '中断/未继续',
  }
  return map[stage]
}

export default function ConsultationTrackingPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)
      const res = await fetch('/api/consultation-tracking')
      const data = await res.json()
      if (data.ok) setStats(data.data)
    } catch (error) {
      console.error('Failed to fetch consultation tracking stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">咨询命中与推荐转化追踪</h1>
            <p className="mt-2 text-gray-600">
              基于现有 conversation / message metadata 的轻量统计，用于观察咨询命中质量、recommendedParams 覆盖率，以及推荐进入 estimated / quoted 的转化情况。
            </p>
          </div>
          <Link href="/conversations" className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            查看会话列表
          </Link>
        </div>

        {loading && <div className="rounded-lg bg-white p-6 shadow">加载中...</div>}

        {!loading && stats && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">consultation_reply 数量</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.consultationMessageCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">带 recommendedParams 的咨询</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.consultationWithRecommendedParamsCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">recommendation_confirmation 数量</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationConfirmationConversationCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">recommendation_updated 数量</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationUpdatedCount}</div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">recommendation → estimated</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationToEstimatedCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">recommendation → quoted</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationToQuotedCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">recommendation → handoff</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationToHandoffCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">停留在 recommendation_updated</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationUpdatedStalledCount}</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-sm text-gray-600">停留在 missing_fields / 中断</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totals.recommendationMissingFieldsStalledCount} / {stats.totals.recommendationInterruptedCount}</div>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              当前基于最近 {stats.sampledConversationCount} 个会话样本统计，按 conversation 维度轻量推导 recommendation flow，不依赖新增表结构。
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">按 productType 看 recommendation 转化</h2>
                <div className="space-y-3">
                  {stats.productTypeRecommendationConversion.map((item) => (
                    <div key={item.productType} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="mb-2 font-medium text-gray-900">{formatProductType(item.productType)}</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>flow 数: {item.flowCount}</div>
                        <div>confirmation: {item.recommendationConfirmationCount}</div>
                        <div>updated: {item.recommendationUpdatedCount}</div>
                        <div>estimated: {item.estimatedCount}</div>
                        <div>quoted: {item.quotedCount}</div>
                        <div>handoff: {item.handoffCount}</div>
                        <div>missing_fields 停留: {item.missingFieldsStalledCount}</div>
                        <div>中断: {item.interruptedCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最容易进入 quoted 的推荐方案</h2>
                <div className="space-y-3">
                  {stats.recommendedSolutionConversion.length === 0 && <div className="text-sm text-gray-500">暂无 recommendation flow 数据。</div>}
                  {stats.recommendedSolutionConversion.slice(0, 8).map((item) => (
                    <div key={item.cardId} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div>
                        <div className="font-medium text-gray-900">{item.cardTitle}</div>
                        <div className="text-gray-500">{formatProductType(item.productType)} / flow {item.flowCount} / quoted {item.quotedCount}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{item.quotedRate}%</div>
                        <div className="text-gray-500">quoted rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">经常停留在 recommendation_updated / missing_fields 的方案</h2>
                <div className="space-y-3">
                  {stats.recommendationStallDistribution.length === 0 && <div className="text-sm text-gray-500">暂无停留数据。</div>}
                  {stats.recommendationStallDistribution.slice(0, 8).map((item) => (
                    <div key={item.cardId} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{item.cardTitle}</div>
                      <div className="mt-1 text-gray-600">{formatProductType(item.productType)}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-gray-500">
                        <div>updated 停留: {item.recommendationUpdatedStalledCount}</div>
                        <div>missing_fields 停留: {item.missingFieldsStalledCount}</div>
                        <div>中断: {item.interruptedCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最近 recommendation flows</h2>
                <div className="space-y-3">
                  {stats.recentRecommendationFlows.length === 0 && <div className="text-sm text-gray-500">暂无 flow 数据。</div>}
                  {stats.recentRecommendationFlows.map((item) => (
                    <div key={`${item.conversationId}-${item.cardId || item.productType || 'flow'}`} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{item.cardTitle || formatProductType(item.productType)}</div>
                      <div className="mt-1 text-gray-600">{formatIntent(item.consultationIntent)} / {formatProductType(item.productType)}</div>
                      <div className="mt-1 text-gray-500">{formatFlowStage(item.latestStage)} / updated {item.recommendationUpdatedCount} / confirmation {item.recommendationConfirmationCount}</div>
                      <div className="mt-2">
                        <Link href={`/conversations/${item.conversationId}`} className="text-blue-600 hover:underline">查看会话 #{item.conversationId}</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">咨询 intent 分布</h2>
                <div className="space-y-3">
                  {stats.consultationIntentDistribution.map((item) => (
                    <div key={item.intent} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div>
                        <div className="font-medium text-gray-900">{formatIntent(item.intent)}</div>
                        <div className="text-gray-500">带 recommendedParams: {item.recommendedCount}</div>
                      </div>
                      <div className="text-right text-gray-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">按咨询类型看结果</h2>
                <div className="space-y-3">
                  {stats.consultationOutcomeByIntent.map((item) => (
                    <div key={item.intent} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="mb-2 font-medium text-gray-900">{formatIntent(item.intent)}</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>会话数: {item.conversationCount}</div>
                        <div>带推荐: {item.withRecommendedParamsCount}</div>
                        <div>estimated: {item.estimatedCount}</div>
                        <div>quoted: {item.quotedCount}</div>
                        <div>仅知识回复: {item.knowledgeOnlyCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">最近转化样例</h2>
              <div className="space-y-3">
                {stats.recentConversions.length === 0 && <div className="text-sm text-gray-500">暂无样例。</div>}
                {stats.recentConversions.map((item) => (
                  <div key={`${item.conversationId}-${item.finalOutcome}`} className="flex items-center justify-between rounded border border-gray-100 p-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">会话 #{item.conversationId}</div>
                      <div className="text-gray-600">{formatIntent(item.consultationIntent)} / {item.hasRecommendedParams ? '有推荐方案' : '无推荐方案'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">{formatOutcome(item.finalOutcome)}</span>
                      <Link href={`/conversations/${item.conversationId}`} className="text-blue-600 hover:underline">查看会话</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Knowledge Card 命中次数</h2>
                <div className="space-y-3">
                  {stats.knowledgeCardHitDistribution.length === 0 && <div className="text-sm text-gray-500">暂无命中数据。</div>}
                  {stats.knowledgeCardHitDistribution.map((item) => (
                    <div key={item.cardId} className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0">
                      <div>
                        <div className="font-medium text-gray-900">{item.cardTitle}</div>
                        <div className="text-gray-500">{item.cardId} / {formatCategory(item.category)} / 带推荐 {item.recommendedCount}</div>
                      </div>
                      <div className="text-right text-gray-900">{item.hitCount}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">最近 Knowledge Card 命中</h2>
                <div className="space-y-3">
                  {stats.recentKnowledgeHits.length === 0 && <div className="text-sm text-gray-500">暂无命中数据。</div>}
                  {stats.recentKnowledgeHits.map((item) => (
                    <div key={`${item.conversationId}-${item.cardId}`} className="rounded border border-gray-100 p-3 text-sm">
                      <div className="font-medium text-gray-900">{item.cardTitle}</div>
                      <div className="mt-1 text-gray-600">{formatIntent(item.consultationIntent)} / {formatCategory(item.category)} / {item.hasRecommendedParams ? '带 recommendedParams' : '无 recommendedParams'}</div>
                      <div className="mt-1 text-gray-500">{item.cardId}{item.productType ? ` / ${item.productType}` : ''}</div>
                      <div className="mt-2">
                        <Link href={`/conversations/${item.conversationId}`} className="text-blue-600 hover:underline">查看会话 #{item.conversationId}</Link>
                      </div>
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