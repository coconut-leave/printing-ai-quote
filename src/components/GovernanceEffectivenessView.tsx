'use client'

import React from 'react'
import type {
  GovernanceActorBehaviorSummary,
  GovernanceActorThemeAnalysis,
} from '@/server/learning/governanceActorAnalytics'
import { GovernanceThemeQualitySummaryList } from '@/components/GovernanceThemeQualitySummaryList'
import { sortThemeSummaries } from '@/lib/governanceThemeQuality'
import type {
  GovernanceCampaignEffectiveness,
  GovernanceEffectivenessAggregate,
  GovernanceEffectivenessData,
} from '@/server/learning/governanceEffectiveness'
import type {
  GovernanceHighQualityPlanType,
  GovernancePlanAdoptionEffect,
} from '@/server/learning/governancePlanAdoption'

type GovernanceEffectivenessViewProps = {
  data: GovernanceEffectivenessData | null
  loading: boolean
}

function formatCampaignStatus(value: string) {
  const map: Record<string, string> = {
    NEW: 'NEW',
    IN_GOVERNANCE: 'IN_GOVERNANCE',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED',
  }
  return map[value] || value
}

function formatEffectivenessLabel(value: string) {
  const map: Record<string, string> = {
    IMPROVING: '明显改善',
    STABLE: '基本稳定',
    RECURRING: '仍在复发',
    LOW_SIGNAL: '样本不足',
    NEEDS_REVIEW: '需要复盘',
  }
  return map[value] || value
}

function formatTargetArea(value: string) {
  const map: Record<string, string> = {
    PROMPT: '提示词',
    REGEX: '正则/抽取',
    FIELD_MAPPING: '字段映射',
    ESTIMATE: '预报价边界',
    HANDOFF_POLICY: '转人工策略',
    OTHER: '其他',
  }
  return map[value] || value
}

function formatChangeType(value: string) {
  const map: Record<string, string> = {
    prompt_update: '提示词更新',
    mapping_update: '字段映射更新',
    extraction_rule_update: '抽取规则更新',
    threshold_update: '阈值调整',
    policy_update: '策略调整',
    pricing_rule_review: '价格规则前置复核',
    test_only_update: '仅补测试',
    other_update: '其他变更',
  }
  return map[value] || value
}

function formatPlanType(value: string) {
  const map: Record<string, string> = {
    NEW_CAMPAIGN: '新建专项',
    CONTINUE_CAMPAIGN: '继续治理',
    REVIEW_CAMPAIGN: '专项复盘',
  }
  return map[value] || value
}

function formatPlanDecisionStatus(value: string) {
  const map: Record<string, string> = {
    PROPOSED: '待审批',
    ACCEPTED: '已采纳',
    DISMISSED: '已忽略',
    MERGED: '已并入专项',
    BATCH_CREATED: '已创建批次',
  }
  return map[value] || value
}

function formatPlanAdoptionStatus(value: string) {
  const map: Record<string, string> = {
    PENDING: '待执行',
    ADOPTED: '已采纳',
    LINKED: '已关联专项',
    ENTERED_EXECUTION: '已进入执行',
    DISMISSED: '已忽略',
  }
  return map[value] || value
}

function formatRecommendationQualityLabel(value: string) {
  const map: Record<string, string> = {
    HIGH_VALUE: '高价值',
    PLAUSIBLE: '基本成立',
    MISSED_BUT_RECURRING: '被忽略但复发',
    LOW_VALUE: '低价值',
    UNCLEAR: '暂不明确',
  }
  return map[value] || value
}

function formatActorSource(value: string) {
  const map: Record<string, string> = {
    'admin-session': '页面 Session',
    'actor-header': '脚本 Header',
    'admin-session-fallback': 'Session Fallback',
    'legacy-placeholder': '兼容占位',
    'legacy-string': '兼容旧字符串',
  }

  return map[value] || value
}

function formatSignedPercent(value: number) {
  if (value > 0) return `+${value}%`
  return `${value}%`
}

function formatDays(value: number) {
  return value > 0 ? `${value} 天` : '暂无'
}

function formatDateTime(value?: string) {
  if (!value) return '暂无'
  return new Date(value).toLocaleString()
}

function renderCampaignRow(item: GovernanceCampaignEffectiveness) {
  return (
    <tr key={item.campaignId} className='align-top'>
      <td className='px-3 py-3 text-sm text-gray-900'>
        <div className='font-medium'>{item.campaignTitle}</div>
        <div className='mt-1 text-xs text-gray-500'>{item.governanceTheme}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>{formatCampaignStatus(item.status)}</td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{item.relatedActionCount} / 已解决 {item.resolvedActionCount}</div>
        <div className='mt-1 text-xs text-gray-500'>剩余 {item.remainingActionCount}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{item.beforeCount} / {item.afterCount}</div>
        <div className='mt-1 text-xs text-gray-500'>{formatSignedPercent(item.changeRate)}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>{item.recurrenceCount}</td>
      <td className='px-3 py-3 text-sm text-gray-700'>{formatDays(item.avgProcessingTime)}</td>
      <td className='px-3 py-3 text-sm text-gray-700'>{formatEffectivenessLabel(item.effectivenessLabel)}</td>
    </tr>
  )
}

function renderPlanAdoptionRow(item: GovernancePlanAdoptionEffect) {
  return (
    <tr key={item.planId} className='align-top'>
      <td className='px-3 py-3 text-sm text-gray-900'>
        <div className='font-medium'>{item.planTitle}</div>
        <div className='mt-1 text-xs text-gray-500'>{formatPlanType(item.planType)}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{formatPlanDecisionStatus(item.decisionStatus)}</div>
        <div className='mt-1 text-xs text-gray-500'>{formatPlanAdoptionStatus(item.adoptionStatus)}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{item.linkedCampaignId || '暂无'}</div>
        <div className='mt-1 text-xs text-gray-500'>批次 {item.linkedBatchId || '暂无'}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{item.enteredExecution ? '已进入' : '未进入'}</div>
        <div className='mt-1 text-xs text-gray-500'>{item.beforeCount} / {item.afterCount} / {formatSignedPercent(item.changeRate)}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{formatEffectivenessLabel(item.effectivenessLabel)}</div>
        <div className='mt-1 text-xs text-gray-500'>复发 {item.recurrenceCount}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>{formatRecommendationQualityLabel(item.recommendationQualityLabel)}</td>
    </tr>
  )
}

function renderHighQualityPlanTypeCards(items: GovernanceHighQualityPlanType[]) {
  return (
    <div className='rounded-lg bg-white p-6 shadow'>
      <h2 className='mb-4 text-lg font-semibold text-gray-900'>高质量推荐类型</h2>
      <div className='space-y-3'>
        {items.length === 0 ? (
          <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无可总结的推荐类型。</div>
        ) : items.map((item) => (
          <div key={item.planType} className='rounded border border-gray-100 p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='font-medium text-gray-900'>{formatPlanType(item.planType)}</div>
                <div className='mt-1 text-xs text-gray-500'>总计 {item.totalCount} 条 / 高价值 {item.highValueCount} 条</div>
              </div>
              <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{item.keepRecommend ? '继续推荐' : '需要收紧'}</div>
            </div>
            <div className='mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700'>
              <div>基本成立: {item.plausibleCount}</div>
              <div>低价值: {item.lowValueCount}</div>
              <div>忽略后复发: {item.recurringDismissedCount}</div>
              <div>高价值: {item.highValueCount}</div>
            </div>
            <div className='mt-2 text-xs text-gray-600'>{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatRecommendationQualityDistribution(item: {
  recommendationQualityDistribution: Record<string, number>
}) {
  return [
    `高价值 ${item.recommendationQualityDistribution.HIGH_VALUE || 0}`,
    `基本成立 ${item.recommendationQualityDistribution.PLAUSIBLE || 0}`,
    `忽略后复发 ${item.recommendationQualityDistribution.MISSED_BUT_RECURRING || 0}`,
    `低价值 ${item.recommendationQualityDistribution.LOW_VALUE || 0}`,
  ].join(' / ')
}

function renderActorIdentity(item: GovernanceActorBehaviorSummary | GovernanceActorThemeAnalysis) {
  return (
    <div>
      <div className='font-medium text-gray-900'>{item.actor.actorLabel}</div>
      <div className='mt-1 text-xs text-gray-500'>
        {formatActorSource(item.actor.actorSource)}
        {item.actor.isFallbackActor ? ' / fallback actor' : ''}
      </div>
    </div>
  )
}

function renderActorRankingCard(params: {
  title: string
  items: GovernanceActorBehaviorSummary[]
  metricText: (item: GovernanceActorBehaviorSummary) => string
  emptyText: string
}) {
  return (
    <div className='rounded-lg bg-white p-6 shadow'>
      <h3 className='mb-4 text-base font-semibold text-gray-900'>{params.title}</h3>
      <div className='space-y-3'>
        {params.items.length === 0 ? (
          <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>{params.emptyText}</div>
        ) : params.items.map((item) => (
          <div key={`${params.title}:${item.actor.actorId}`} className='rounded border border-gray-100 p-4'>
            <div className='flex items-start justify-between gap-3'>
              {renderActorIdentity(item)}
              <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{params.metricText(item)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderActorThemeTable(items: GovernanceActorThemeAnalysis[]) {
  return (
    <div className='overflow-x-auto'>
      <table className='min-w-full divide-y divide-gray-200'>
        <thead className='bg-gray-50'>
          <tr>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>操作者</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>治理主题</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>计划数</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>接受率</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>进入执行率</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>改善率</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>复发率</th>
            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>推荐质量分布</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200'>
          {items.map((item) => (
            <tr key={`${item.actor.actorId}:${item.governanceTheme}`} className='align-top'>
              <td className='px-3 py-3 text-sm text-gray-900'>{renderActorIdentity(item)}</td>
              <td className='px-3 py-3 text-sm text-gray-700'>{item.governanceTheme}</td>
              <td className='px-3 py-3 text-sm text-gray-700'>
                <div>{item.planCount}</div>
                <div className='mt-1 text-xs text-gray-500'>审批动作 {item.decisionCount}</div>
              </td>
              <td className='px-3 py-3 text-sm text-gray-700'>{item.acceptRate}%</td>
              <td className='px-3 py-3 text-sm text-gray-700'>{item.enteredExecutionRate}%</td>
              <td className='px-3 py-3 text-sm text-gray-700'>{item.improvingRate}%</td>
              <td className='px-3 py-3 text-sm text-gray-700'>{item.recurrenceRate}%</td>
              <td className='px-3 py-3 text-sm text-gray-700'>{formatRecommendationQualityDistribution(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderAggregateCards(title: string, items: GovernanceEffectivenessAggregate[]) {
  return (
    <div className='rounded-lg bg-white p-6 shadow'>
      <h2 className='mb-4 text-lg font-semibold text-gray-900'>{title}</h2>
      <div className='space-y-3'>
        {items.length === 0 ? (
          <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无可展示数据。</div>
        ) : items.map((item) => (
          <div key={`${item.dimension}:${item.key}`} className='rounded border border-gray-100 p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='font-medium text-gray-900'>{item.label}</div>
                <div className='mt-1 text-xs text-gray-500'>{item.campaignCount} 个专项 / {item.relatedActionCount} 条 action</div>
              </div>
              <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{formatEffectivenessLabel(item.effectivenessLabel)}</div>
            </div>
            <div className='mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700'>
              <div>前后数量: {item.beforeCount} / {item.afterCount}</div>
              <div>变化率: {formatSignedPercent(item.changeRate)}</div>
              <div>复发次数: {item.recurrenceCount}</div>
              <div>平均处理时长: {formatDays(item.avgProcessingTime)}</div>
            </div>
            <div className='mt-2 text-xs text-gray-600'>{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GovernanceEffectivenessView({ data, loading }: GovernanceEffectivenessViewProps) {
  const [showFallbackActors, setShowFallbackActors] = React.useState(false)
  const hasPlanAdoptionData = Boolean(data && data.planAdoption.overview.totalPlanCount > 0)
  const hasCampaignData = Boolean(data && data.emptyState.hasCampaigns)
  const themeSummaries = data ? sortThemeSummaries(data.planAdoption.themeSummaries) : []
  const visibleActorSummaries = React.useMemo(() => {
    if (!data) return []
    return showFallbackActors ? data.actorAnalysis.actors : data.actorAnalysis.realActors
  }, [data, showFallbackActors])
  const visibleThemeActorRows = React.useMemo(() => {
    if (!data) return []
    return (showFallbackActors
      ? data.actorAnalysis.themeActorRows
      : data.actorAnalysis.themeActorRows.filter((item) => !item.actor.isFallbackActor)
    ).slice(0, 12)
  }, [data, showFallbackActors])
  const topAcceptedActors = React.useMemo(() => [...visibleActorSummaries]
    .sort((a, b) => (b.acceptedCount - a.acceptedCount) || (b.acceptRate - a.acceptRate))
    .slice(0, 5), [visibleActorSummaries])
  const topDismissedActors = React.useMemo(() => [...visibleActorSummaries]
    .sort((a, b) => (b.dismissedCount - a.dismissedCount) || (b.dismissRate - a.dismissRate))
    .slice(0, 5), [visibleActorSummaries])
  const topMergedActors = React.useMemo(() => [...visibleActorSummaries]
    .sort((a, b) => (b.mergedCount - a.mergedCount) || (b.mergeRate - a.mergeRate))
    .slice(0, 5), [visibleActorSummaries])
  const topBatchCreatedActors = React.useMemo(() => [...visibleActorSummaries]
    .sort((a, b) => (b.batchCreatedCount - a.batchCreatedCount) || (b.batchCreatedRate - a.batchCreatedRate))
    .slice(0, 5), [visibleActorSummaries])
  const topImprovingActors = React.useMemo(() => visibleActorSummaries
    .filter((item) => item.outcomePlanCount > 0)
    .sort((a, b) => (b.improvingRate - a.improvingRate) || (b.improvingCount - a.improvingCount))
    .slice(0, 5), [visibleActorSummaries])
  const lowRecurringActors = React.useMemo(() => visibleActorSummaries
    .filter((item) => item.enteredExecutionCount > 0)
    .sort((a, b) => (a.recurringAfterAdoptionRate - b.recurringAfterAdoptionRate) || (b.improvingRate - a.improvingRate))
    .slice(0, 5), [visibleActorSummaries])
  const topHighRiskActors = React.useMemo(() => visibleActorSummaries
    .filter((item) => item.highRiskHandledCount > 0)
    .sort((a, b) => (b.highRiskImprovingRate - a.highRiskImprovingRate) || (b.highRiskImprovingCount - a.highRiskImprovingCount))
    .slice(0, 5), [visibleActorSummaries])

  return (
    <>
      <div className='mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
        当前效果评估基于已批准 reflection 派生的 action draft、治理专项状态和进程内时间字段做规则化观察，不引入新的 BI 基础设施，也不自动执行任何代码修改。
      </div>

      {loading && <div className='rounded-lg bg-white p-6 shadow'>加载中...</div>}

      {!loading && data && (
        <>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>已完成专项</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.completedCampaignCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>进行中专项</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.inProgressCampaignCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>平均处理时长</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{formatDays(data.summary.avgProcessingTime)}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>明显改善专项</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.improvingCampaignCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>高风险未改善专项</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.highRiskUnimprovedCampaignCount}</div>
            </div>
          </div>

          {!hasPlanAdoptionData && !hasCampaignData ? (
            <div className='rounded-lg bg-white p-8 text-center shadow'>
              <h2 className='text-lg font-semibold text-gray-900'>暂无治理成效数据</h2>
              <p className='mt-2 text-sm text-gray-600'>当前还没有已创建的治理专项或可追踪的治理计划，暂时无法评估治理成效。</p>
            </div>
          ) : (
            <>
              <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>计划采用概览</h2>
                    <p className='mt-1 text-sm text-gray-600'>看计划是否被采纳、是否真的进入执行，以及这些推荐值不值得继续推荐。</p>
                  </div>
                </div>
                {!hasPlanAdoptionData ? (
                  <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无可追踪的治理计划。</div>
                ) : (
                  <>
                    <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6'>
                      <div className='rounded-lg bg-slate-50 p-4'>
                        <div className='text-sm text-gray-600'>计划总数</div>
                        <div className='mt-1 text-2xl font-bold text-gray-900'>{data.planAdoption.overview.totalPlanCount}</div>
                      </div>
                      <div className='rounded-lg bg-slate-50 p-4'>
                        <div className='text-sm text-gray-600'>已采纳</div>
                        <div className='mt-1 text-2xl font-bold text-gray-900'>{data.planAdoption.overview.adoptedPlanCount}</div>
                      </div>
                      <div className='rounded-lg bg-slate-50 p-4'>
                        <div className='text-sm text-gray-600'>已忽略</div>
                        <div className='mt-1 text-2xl font-bold text-gray-900'>{data.planAdoption.overview.dismissedPlanCount}</div>
                      </div>
                      <div className='rounded-lg bg-slate-50 p-4'>
                        <div className='text-sm text-gray-600'>进入执行</div>
                        <div className='mt-1 text-2xl font-bold text-gray-900'>{data.planAdoption.overview.enteredExecutionCount}</div>
                      </div>
                      <div className='rounded-lg bg-slate-50 p-4'>
                        <div className='text-sm text-gray-600'>高价值推荐</div>
                        <div className='mt-1 text-2xl font-bold text-gray-900'>{data.planAdoption.overview.highValueCount}</div>
                      </div>
                      <div className='rounded-lg bg-slate-50 p-4'>
                        <div className='text-sm text-gray-600'>忽略后复发</div>
                        <div className='mt-1 text-2xl font-bold text-gray-900'>{data.planAdoption.overview.missedButRecurringCount}</div>
                      </div>
                    </div>

                    <div className='overflow-x-auto'>
                      <table className='min-w-full divide-y divide-gray-200'>
                        <thead className='bg-gray-50'>
                          <tr>
                            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>计划</th>
                            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>决策/采用</th>
                            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>关联对象</th>
                            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>执行与变化</th>
                            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>效果</th>
                            <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>推荐质量</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200'>
                          {data.planAdoption.items.map((item) => renderPlanAdoptionRow(item))}
                        </tbody>
                      </table>
                    </div>

                    <div className='mt-4 space-y-3'>
                      {data.planAdoption.items.map((item) => (
                        <div key={`${item.planId}-note`} className='rounded border border-gray-100 p-4 text-sm'>
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <div className='font-medium text-gray-900'>{item.planTitle}</div>
                              <div className='mt-1 text-xs text-gray-500'>
                                {formatPlanType(item.planType)} / {formatPlanDecisionStatus(item.decisionStatus)} / 最近处理 {formatDateTime(item.decisionAt)}
                              </div>
                            </div>
                            <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{formatRecommendationQualityLabel(item.recommendationQualityLabel)}</div>
                          </div>
                          <div className='mt-3 text-gray-700'>{item.note}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>被忽略但后续复发的计划</h2>
                  <div className='space-y-3'>
                    {data.planAdoption.dismissedButRecurringPlans.length === 0 ? (
                      <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无此类计划。</div>
                    ) : data.planAdoption.dismissedButRecurringPlans.map((item) => (
                      <div key={item.planId} className='rounded border border-gray-100 p-4'>
                        <div className='font-medium text-gray-900'>{item.planTitle}</div>
                        <div className='mt-1 text-sm text-gray-700'>复发 {item.recurrenceCount} 次 / 当前效果 {formatEffectivenessLabel(item.effectivenessLabel)}</div>
                        <div className='mt-2 text-xs text-gray-600'>{item.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {renderHighQualityPlanTypeCards(data.planAdoption.highQualityPlanTypes)}
              </div>

              <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>审批人与采用行为分析</h2>
                    <p className='mt-1 text-sm text-gray-600'>审批行为统计按操作者实际做出的计划决策计算；进入执行率、改善率、复发率按其最终处理结果回看。</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setShowFallbackActors((prev) => !prev)}
                    className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50'
                  >
                    {showFallbackActors ? '隐藏 fallback actor' : '显示 fallback actor'}
                  </button>
                </div>

                <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
                  <div className='rounded border border-gray-100 p-4'>
                    <div className='text-sm text-gray-600'>纳入分析的操作者</div>
                    <div className='mt-1 text-2xl font-bold text-gray-900'>{visibleActorSummaries.length}</div>
                  </div>
                  <div className='rounded border border-gray-100 p-4'>
                    <div className='text-sm text-gray-600'>真实操作者</div>
                    <div className='mt-1 text-2xl font-bold text-gray-900'>{data.actorAnalysis.summary.realActorCount}</div>
                  </div>
                  <div className='rounded border border-gray-100 p-4'>
                    <div className='text-sm text-gray-600'>fallback actor</div>
                    <div className='mt-1 text-2xl font-bold text-gray-900'>{data.actorAnalysis.summary.fallbackActorCount}</div>
                  </div>
                  <div className='rounded border border-gray-100 p-4'>
                    <div className='text-sm text-gray-600'>已处理计划</div>
                    <div className='mt-1 text-2xl font-bold text-gray-900'>{data.actorAnalysis.summary.handledPlanCount}</div>
                  </div>
                </div>

                {!data.actorAnalysis.emptyState.hasActorData ? (
                  <div className='mt-4 rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无可分析的审批人与采用行为数据。</div>
                ) : (
                  <>
                    <div className='mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-4'>
                      {renderActorRankingCard({
                        title: '审批行为总览: 接受最多',
                        items: topAcceptedActors,
                        metricText: (item) => `${item.acceptedCount} 次 / 接受率 ${item.acceptRate}%`,
                        emptyText: '暂无接受记录。',
                      })}
                      {renderActorRankingCard({
                        title: '审批行为总览: 忽略最多',
                        items: topDismissedActors,
                        metricText: (item) => `${item.dismissedCount} 次 / 忽略率 ${item.dismissRate}%`,
                        emptyText: '暂无忽略记录。',
                      })}
                      {renderActorRankingCard({
                        title: '审批行为总览: Merge 最多',
                        items: topMergedActors,
                        metricText: (item) => `${item.mergedCount} 次 / Merge 率 ${item.mergeRate}%`,
                        emptyText: '暂无 merge 记录。',
                      })}
                      {renderActorRankingCard({
                        title: '审批行为总览: Batch 创建最多',
                        items: topBatchCreatedActors,
                        metricText: (item) => `${item.batchCreatedCount} 次 / Batch 创建率 ${item.batchCreatedRate}%`,
                        emptyText: '暂无 batch 创建记录。',
                      })}
                    </div>

                    <div className='mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3'>
                      {renderActorRankingCard({
                        title: '采用效果排行: 改善率更高',
                        items: topImprovingActors,
                        metricText: (item) => `${item.improvingRate}% / 改善 ${item.improvingCount} 条`,
                        emptyText: '暂无进入效果回看窗口的操作者。',
                      })}
                      {renderActorRankingCard({
                        title: '采用效果排行: 复发率更低',
                        items: lowRecurringActors,
                        metricText: (item) => `${item.recurringAfterAdoptionRate}% / 复发 ${item.recurringAfterAdoptionCount} 条`,
                        emptyText: '暂无进入执行后的计划。',
                      })}
                      {renderActorRankingCard({
                        title: '采用效果排行: 高风险计划处理更好',
                        items: topHighRiskActors,
                        metricText: (item) => `${item.highRiskImprovingRate}% / 高风险改善 ${item.highRiskImprovingCount} 条`,
                        emptyText: '暂无高风险计划处理记录。',
                      })}
                    </div>

                    <div className='mt-6 rounded border border-gray-100 p-4'>
                      <div className='mb-3 text-base font-semibold text-gray-900'>按主题差异视图</div>
                      {visibleThemeActorRows.length === 0 ? (
                        <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>当前筛选条件下暂无 governanceTheme × actor 数据。</div>
                      ) : renderActorThemeTable(visibleThemeActorRows)}
                    </div>

                    <div className='mt-6 rounded border border-gray-100 p-4'>
                      <div className='mb-3 text-base font-semibold text-gray-900'>异常信号</div>
                      {data.actorAnalysis.anomalySignals.length === 0 ? (
                        <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>当前还没有明显的审批异常信号。</div>
                      ) : (
                        <div className='space-y-3'>
                          {data.actorAnalysis.anomalySignals
                            .filter((item) => showFallbackActors || !item.actor.isFallbackActor)
                            .map((item) => (
                              <div key={`${item.signalType}:${item.actor.actorId}`} className='rounded border border-gray-100 p-4'>
                                <div className='flex items-start justify-between gap-3'>
                                  {renderActorIdentity({ actor: item.actor } as GovernanceActorThemeAnalysis)}
                                  <div className='rounded bg-amber-50 px-3 py-1 text-xs text-amber-700'>{item.signalType}</div>
                                </div>
                                <div className='mt-3 font-medium text-gray-900'>{item.headline}</div>
                                <div className='mt-1 text-sm text-gray-600'>{item.detail}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className='mb-8'>
                <GovernanceThemeQualitySummaryList
                  title='governanceTheme quality 透视视图'
                  description='与审批页复用同一套主题质量聚合，直接看主题采纳率、改善证据、复发情况和后续优先建议。'
                  items={themeSummaries}
                  emptyText='暂无可复盘的 governanceTheme quality 数据。'
                />
              </div>

              {hasCampaignData ? (
                <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>专项治理效果列表</h2>
                    <p className='mt-1 text-sm text-gray-600'>按专项查看前后数量变化、处理效率、复发情况和效果标签。</p>
                  </div>
                  <div className='text-xs text-gray-500'>观察窗: {data.observationWindowDays} 天</div>
                </div>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>专项</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>状态</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>动作进度</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>前后数量</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>复发</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>处理时长</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>标签</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {data.campaigns.map((item) => renderCampaignRow(item))}
                    </tbody>
                  </table>
                </div>
                <div className='mt-4 space-y-3'>
                  {data.campaigns.map((item) => (
                    <div key={`${item.campaignId}-note`} className='rounded border border-gray-100 p-4 text-sm'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <div className='font-medium text-gray-900'>{item.campaignTitle}</div>
                          <div className='mt-1 text-xs text-gray-500'>
                            {formatTargetArea(item.targetArea)} / {formatChangeType(item.changeType)} / 完成时间 {formatDateTime(item.completedAt)}
                          </div>
                        </div>
                        <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{formatEffectivenessLabel(item.effectivenessLabel)}</div>
                      </div>
                      <div className='mt-3 text-gray-700'>{item.note}</div>
                      <div className='mt-2 text-xs text-gray-500'>
                        高风险占比: {item.highRiskBeforeShare}% {'->'} {item.highRiskAfterShare}% | 最近复发: {formatDateTime(item.lastRecurrenceAt)}
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              ) : (
                <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                  <h2 className='text-lg font-semibold text-gray-900'>专项治理效果列表</h2>
                  <p className='mt-2 text-sm text-gray-600'>当前还没有可用于前后对比的治理专项，但计划采用与推荐质量已经可以先行跟踪。</p>
                </div>
              )}

              {hasCampaignData && (
              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>高频复发主题</h2>
                  <div className='space-y-3'>
                    {data.recurringThemes.length === 0 ? (
                      <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无明显复发主题。</div>
                    ) : data.recurringThemes.map((item) => (
                      <div key={item.governanceTheme} className='rounded border border-gray-100 p-4'>
                        <div className='font-medium text-gray-900'>{item.governanceTheme}</div>
                        <div className='mt-1 text-sm text-gray-700'>复发 {item.recurrenceCount} 次 / 关联专项 {item.campaignCount}</div>
                        <div className='mt-1 text-xs text-gray-500'>最近命中 {formatDateTime(item.lastHitAt)}</div>
                        <div className='mt-2 text-xs text-gray-600'>{item.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>高频复发文件</h2>
                  <div className='space-y-3'>
                    {data.recurringTargetFiles.length === 0 ? (
                      <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无明显复发文件。</div>
                    ) : data.recurringTargetFiles.map((item) => (
                      <div key={item.targetFileHint} className='rounded border border-gray-100 p-4'>
                        <div className='font-medium text-gray-900 break-all'>{item.targetFileHint}</div>
                        <div className='mt-1 text-sm text-gray-700'>复发 {item.recurrenceCount} 次 / 关联专项 {item.campaignCount}</div>
                        <div className='mt-1 text-xs text-gray-500'>最近命中 {formatDateTime(item.lastHitAt)}</div>
                        <div className='mt-2 text-xs text-gray-600'>{item.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {hasCampaignData && (
              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3'>
                {renderAggregateCards('改善更明显的 TargetArea', data.benefitInsights.topImprovedTargetAreas)}
                {renderAggregateCards('接受率高但效果一般的 ChangeType', data.benefitInsights.acceptedButWeakChangeTypes)}
                {renderAggregateCards('量不大但收益高的 ChangeType', data.benefitInsights.highReturnChangeTypes)}
              </div>
              )}

              {hasCampaignData && (
              <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                {renderAggregateCards('按治理主题聚合', data.aggregates.governanceTheme.slice(0, 6))}
                {renderAggregateCards('按目标文件聚合', data.aggregates.targetFileHint.slice(0, 6))}
                {renderAggregateCards('按 TargetArea 聚合', data.aggregates.targetArea.slice(0, 6))}
                {renderAggregateCards('按 ChangeType 聚合', data.aggregates.changeType.slice(0, 6))}
                {renderAggregateCards('按 RiskLevel 聚合', data.aggregates.riskLevel.slice(0, 6))}
              </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}