'use client'

import React from 'react'
import type {
  ActionDraftDashboardStats,
  ActionDraftDashboardTimeRange,
} from '@/server/learning/actionDraftDashboard'
import type {
  ImprovementActionChangeType,
  ImprovementActionRiskLevel,
  ImprovementSuggestionStatus,
  ImprovementTargetArea,
} from '@/server/learning/improvementSuggestion'

type DashboardFilters = {
  timeRangeDays: ActionDraftDashboardTimeRange
  status: ImprovementSuggestionStatus | 'ALL'
  targetArea: ImprovementTargetArea | 'ALL'
  changeType: ImprovementActionChangeType | 'ALL'
  riskLevel: ImprovementActionRiskLevel | 'ALL'
}

type ActionDraftDashboardViewProps = {
  stats: ActionDraftDashboardStats | null
  loading: boolean
  filters: DashboardFilters
  onFilterChange: (field: keyof DashboardFilters, value: string) => void
}

const STATUS_OPTIONS: Array<DashboardFilters['status']> = ['ALL', 'NEW', 'REVIEWED', 'ACCEPTED', 'IMPLEMENTED', 'VERIFIED', 'REJECTED']
const TARGET_AREA_OPTIONS: Array<DashboardFilters['targetArea']> = ['ALL', 'PROMPT', 'REGEX', 'FIELD_MAPPING', 'ESTIMATE', 'HANDOFF_POLICY', 'OTHER']
const CHANGE_TYPE_OPTIONS: Array<DashboardFilters['changeType']> = ['ALL', 'prompt_update', 'mapping_update', 'extraction_rule_update', 'threshold_update', 'policy_update', 'pricing_rule_review', 'test_only_update', 'other_update']
const RISK_LEVEL_OPTIONS: Array<DashboardFilters['riskLevel']> = ['ALL', 'LOW', 'MEDIUM', 'HIGH']
const TIME_RANGE_OPTIONS: Array<ActionDraftDashboardTimeRange> = ['ALL', 7, 30, 90]

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

function formatRiskLevel(value: string) {
  const map: Record<string, string> = {
    LOW: '低风险',
    MEDIUM: '中风险',
    HIGH: '高风险',
  }
  return map[value] || value
}

function formatStatus(value: string) {
  const map: Record<string, string> = {
    NEW: 'NEW',
    REVIEWED: 'REVIEWED',
    ACCEPTED: 'ACCEPTED',
    IMPLEMENTED: 'IMPLEMENTED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
  }
  return map[value] || value
}

function formatPriorityLevel(value: string) {
  const map: Record<string, string> = {
    HIGH: '高优先级',
    MEDIUM: '中优先级',
    LOW: '低优先级',
  }
  return map[value] || value
}

function formatGovernanceBucket(value: string) {
  const map: Record<string, string> = {
    IMMEDIATE_FIX: '立即治理',
    HIGH_RISK_REVIEW: '高风险人工审核',
    BATCH_CLEANUP: '批量清理',
    WATCHLIST: '持续观察',
    LOW_PRIORITY: '低优先级',
  }
  return map[value] || value
}

function formatTimeRange(value: ActionDraftDashboardTimeRange) {
  return value === 'ALL' ? '全部时间' : `最近 ${value} 天`
}

function formatDateTime(value?: string) {
  if (!value) return '暂无'
  return new Date(value).toLocaleString()
}

export function ActionDraftDashboardView({ stats, loading, filters, onFilterChange }: ActionDraftDashboardViewProps) {
  const topTargetAreas = stats?.targetAreaStats.slice(0, 5) || []
  const topChangeTypes = [...(stats?.changeTypeStats || [])]
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5)

  return (
    <>
      <div className='mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
        当前统计与优先级建议只复用已有 improvements、action draft 与进程内状态，不新增基础设施，也不会自动执行任何 action。服务重启后，状态相关时间字段仍可能丢失，因此该面板更适合作为内部优先级与治理辅助视图。
      </div>

      <div className='mb-6 rounded-lg bg-white p-4 shadow'>
        <div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'>
          <label className='text-sm'>
            <span className='mb-1 block font-medium text-gray-700'>时间范围</span>
            <select
              value={String(filters.timeRangeDays)}
              onChange={(e) => onFilterChange('timeRangeDays', e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-2'
            >
              {TIME_RANGE_OPTIONS.map((option) => (
                <option key={String(option)} value={String(option)}>{formatTimeRange(option)}</option>
              ))}
            </select>
          </label>
          <label className='text-sm'>
            <span className='mb-1 block font-medium text-gray-700'>状态</span>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-2'
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'ALL' ? '全部状态' : formatStatus(option)}</option>
              ))}
            </select>
          </label>
          <label className='text-sm'>
            <span className='mb-1 block font-medium text-gray-700'>targetArea</span>
            <select
              value={filters.targetArea}
              onChange={(e) => onFilterChange('targetArea', e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-2'
            >
              {TARGET_AREA_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'ALL' ? '全部 targetArea' : formatTargetArea(option)}</option>
              ))}
            </select>
          </label>
          <label className='text-sm'>
            <span className='mb-1 block font-medium text-gray-700'>changeType</span>
            <select
              value={filters.changeType}
              onChange={(e) => onFilterChange('changeType', e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-2'
            >
              {CHANGE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'ALL' ? '全部 changeType' : formatChangeType(option)}</option>
              ))}
            </select>
          </label>
          <label className='text-sm'>
            <span className='mb-1 block font-medium text-gray-700'>riskLevel</span>
            <select
              value={filters.riskLevel}
              onChange={(e) => onFilterChange('riskLevel', e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-2'
            >
              {RISK_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'ALL' ? '全部 riskLevel' : formatRiskLevel(option)}</option>
              ))}
            </select>
          </label>
        </div>
        {stats && (
          <div className='space-y-2'>
            <p className='text-xs text-gray-500'>
              当前筛选后共 {stats.summary.filteredActionDraftCount} 条 action draft；recent 统计窗口为 {stats.filters.recentWindowDays} 天。
            </p>
            <div className='flex flex-wrap gap-2 text-xs'>
              {stats.priorityInsights.governanceBucketCounts.map((item) => (
                <span key={item.governanceBucket} className='rounded-full bg-slate-100 px-3 py-1 text-slate-700'>
                  {formatGovernanceBucket(item.governanceBucket)} {item.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <div className='rounded-lg bg-white p-6 shadow'>加载中...</div>}

      {!loading && stats && !stats.emptyState.hasActionDrafts && (
        <div className='rounded-lg bg-white p-8 text-center shadow'>
          <h2 className='text-lg font-semibold text-gray-900'>暂无 action draft 数据</h2>
          <p className='mt-2 text-sm text-gray-600'>
            当前 approved improvements 里还没有可聚合的 action draft，面板会在后续包装学习样本进入闭环后自动显示统计与优先级建议。
          </p>
        </div>
      )}

      {!loading && stats && stats.emptyState.hasActionDrafts && !stats.emptyState.hasFilteredResults && (
        <div className='rounded-lg bg-white p-8 text-center shadow'>
          <h2 className='text-lg font-semibold text-gray-900'>当前筛选下没有命中</h2>
          <p className='mt-2 text-sm text-gray-600'>
            可以放宽时间范围或状态筛选，查看更完整的 action draft 聚合结果与优先级建议。
          </p>
        </div>
      )}

      {!loading && stats && stats.emptyState.hasFilteredResults && (
        <>
          <div className='mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6'>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>全部 Action Draft</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{stats.summary.totalActionDraftCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>当前筛选命中</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{stats.summary.filteredActionDraftCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>进入 ACCEPTED 及后续</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{stats.summary.acceptedOrLaterCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>未关闭</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{stats.summary.unresolvedCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>高风险未关闭</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{stats.summary.highRiskUnresolvedCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>重复命中文件</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{stats.summary.repeatedTargetFileHintCount}</div>
            </div>
          </div>

          <div className='mb-8 rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-lg font-semibold text-gray-900'>当前最值得优先治理的问题 Top N</h2>
            <div className='space-y-4'>
              {stats.priorityInsights.topActions.map((item) => (
                <div key={item.id} className='rounded border border-slate-200 p-4 text-sm'>
                  <div className='mb-3 flex flex-wrap items-center gap-2'>
                    <span className='rounded bg-slate-900 px-2 py-1 font-medium text-white'>#{item.priorityScore}</span>
                    <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{formatPriorityLevel(item.priorityLevel)}</span>
                    <span className='rounded bg-emerald-50 px-2 py-1 text-emerald-700'>{formatGovernanceBucket(item.governanceBucket)}</span>
                    <span className='rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200'>{formatChangeType(item.changeType)}</span>
                    <span className='rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200'>{formatRiskLevel(item.riskLevel)}</span>
                    <span className='rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200'>{formatStatus(item.status)}</span>
                  </div>
                  <div className='text-base font-semibold text-gray-900'>{item.actionTitle}</div>
                  <div className='mt-1 text-gray-600'>{item.governanceTheme}</div>
                  <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
                    <div>
                      <div className='font-medium text-gray-900'>为什么优先</div>
                      <div className='mt-1 text-gray-600'>{item.priorityReason}</div>
                      <div className='mt-2 text-xs text-gray-500'>{item.governanceReason}</div>
                    </div>
                    <div>
                      <div className='font-medium text-gray-900'>建议下一步</div>
                      <div className='mt-1 text-gray-600'>{item.recommendedNextAction}</div>
                      <div className='mt-2 text-xs text-gray-500'>{item.whyNow}</div>
                    </div>
                  </div>
                  <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500 md:grid-cols-4'>
                    <div>targetArea: {formatTargetArea(item.targetArea)}</div>
                    <div>同类接受率: {item.changeTypeAcceptedRate}%</div>
                    <div>目标文件命中: {item.targetFileHitCount}</div>
                    <div>停留天数: {item.stagnantDays}</div>
                  </div>
                  <div className='mt-2 text-xs text-gray-500 break-all'>targetFileHint: {item.targetFileHint || '未指定目标文件'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className='mb-8 rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-lg font-semibold text-gray-900'>高频 targetFileHint 专项治理候选</h2>
            <div className='space-y-4'>
              {stats.priorityInsights.targetFileCandidates.map((item) => (
                <div key={item.targetFileHint} className='rounded border border-slate-200 p-4 text-sm'>
                  <div className='mb-2 flex flex-wrap items-center gap-2'>
                    <span className='rounded bg-slate-900 px-2 py-1 font-medium text-white'>#{item.priorityScore}</span>
                    <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{formatPriorityLevel(item.priorityLevel)}</span>
                    <span className='rounded bg-amber-50 px-2 py-1 text-amber-700'>{formatGovernanceBucket(item.governanceBucket)}</span>
                    <span className='rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200'>专项治理 {item.isSpecialGovernanceCandidate ? '建议' : '观察'}</span>
                  </div>
                  <div className='font-semibold text-gray-900 break-all'>{item.targetFileHint}</div>
                  <div className='mt-2 grid grid-cols-1 gap-2 text-gray-600 md:grid-cols-4'>
                    <div>命中次数: {item.hitCount}</div>
                    <div>recent: {item.recentHitCount}</div>
                    <div>未关闭: {item.openCount}</div>
                    <div>最后命中: {formatDateTime(item.lastHitAt)}</div>
                  </div>
                  <div className='mt-2 text-gray-600'>
                    targetArea: {item.targetAreaDistribution.slice(0, 3).map((entry) => `${formatTargetArea(entry.targetArea)} ${entry.count}`).join(' / ')}
                  </div>
                  <div className='mt-1 text-gray-600'>
                    changeType: {item.changeTypeDistribution.slice(0, 3).map((entry) => `${formatChangeType(entry.changeType)} ${entry.count}`).join(' / ')}
                  </div>
                  <div className='mt-2 text-gray-600'>{item.governanceReason}</div>
                  <div className='mt-1 text-gray-600'>{item.recommendedNextAction}</div>
                </div>
              ))}
            </div>
          </div>

          <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
            <div className='rounded-lg bg-white p-6 shadow'>
              <h2 className='mb-4 text-lg font-semibold text-gray-900'>高风险积压项</h2>
              {stats.highRiskBacklog.length === 0 ? (
                <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>
                  当前筛选下没有高风险未闭环动作。
                </div>
              ) : (
                <div className='space-y-3'>
                  {stats.highRiskBacklog.map((item) => (
                    <div key={item.id} className='rounded border border-rose-100 bg-rose-50 p-3 text-sm'>
                      <div className='mb-2 flex flex-wrap items-center gap-2'>
                        <span className='rounded bg-white px-2 py-1 font-medium text-rose-700'>#{item.priorityScore}</span>
                        <span className='rounded bg-white px-2 py-1 text-rose-700'>{formatPriorityLevel(item.priorityLevel)}</span>
                        <span className='rounded bg-white px-2 py-1 text-rose-700'>{formatGovernanceBucket(item.governanceBucket)}</span>
                        <span className='rounded bg-white px-2 py-1 text-rose-700'>{formatStatus(item.status)}</span>
                      </div>
                      <div className='font-medium text-gray-900'>{item.actionTitle}</div>
                      <div className='mt-1 text-gray-600'>{item.priorityReason}</div>
                      <div className='mt-1 text-xs text-gray-500'>{item.governanceReason}</div>
                      <div className='mt-2 text-gray-600'>{item.recommendedNextAction}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='rounded-lg bg-white p-6 shadow'>
              <h2 className='mb-4 text-lg font-semibold text-gray-900'>高接受率治理类型</h2>
              <div className='space-y-6'>
                <div>
                  <div className='mb-2 text-sm font-medium text-gray-700'>changeType</div>
                  <div className='space-y-3'>
                    {stats.priorityInsights.highAcceptanceDirections.changeTypes.map((item) => (
                      <div key={item.changeType} className='rounded border border-gray-100 p-3 text-sm'>
                        <div className='flex items-center justify-between gap-3'>
                          <div className='font-medium text-gray-900'>{formatChangeType(item.changeType)}</div>
                          <div className='text-gray-900'>{item.acceptedRate}%</div>
                        </div>
                        <div className='mt-1 text-gray-600'>{item.recommendedFocus}</div>
                        <div className='mt-1 text-xs text-gray-500'>总数 {item.totalCount}。{item.whyNow}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className='mb-2 text-sm font-medium text-gray-700'>targetArea</div>
                  <div className='space-y-3'>
                    {stats.priorityInsights.highAcceptanceDirections.targetAreas.map((item) => (
                      <div key={item.targetArea} className='rounded border border-gray-100 p-3 text-sm'>
                        <div className='flex items-center justify-between gap-3'>
                          <div className='font-medium text-gray-900'>{formatTargetArea(item.targetArea)}</div>
                          <div className='text-gray-900'>{item.acceptedRate}%</div>
                        </div>
                        <div className='mt-1 text-gray-600'>{item.recommendedFocus}</div>
                        <div className='mt-1 text-xs text-gray-500'>总数 {item.totalCount}。{item.whyNow}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
            <div className='rounded-lg bg-white p-6 shadow'>
              <h2 className='mb-4 text-lg font-semibold text-gray-900'>最常见 Action Draft 类型</h2>
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <div>
                  <div className='mb-2 text-sm font-medium text-gray-700'>targetArea Top N</div>
                  <div className='space-y-3'>
                    {topTargetAreas.map((item) => (
                      <div key={item.targetArea} className='flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0'>
                        <div>
                          <div className='font-medium text-gray-900'>{formatTargetArea(item.targetArea)}</div>
                          <div className='text-xs text-gray-500'>recent {item.recentCount} / 接受率 {item.acceptedRate}%</div>
                        </div>
                        <div className='text-gray-900'>{item.totalCount}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className='mb-2 text-sm font-medium text-gray-700'>changeType Top N</div>
                  <div className='space-y-3'>
                    {topChangeTypes.map((item) => (
                      <div key={item.changeType} className='flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0'>
                        <div>
                          <div className='font-medium text-gray-900'>{formatChangeType(item.changeType)}</div>
                          <div className='text-xs text-gray-500'>接受率 {item.acceptedRate}%</div>
                        </div>
                        <div className='text-gray-900'>{item.totalCount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className='rounded-lg bg-white p-6 shadow'>
              <h2 className='mb-4 text-lg font-semibold text-gray-900'>riskLevel 分布与未处理情况</h2>
              <div className='space-y-3'>
                {stats.riskLevelStats.map((item) => (
                  <div key={item.riskLevel} className='rounded border border-gray-100 p-3 text-sm'>
                    <div className='mb-2 flex items-center justify-between'>
                      <div className='font-medium text-gray-900'>{formatRiskLevel(item.riskLevel)}</div>
                      <div className='text-gray-900'>{item.totalCount}</div>
                    </div>
                    <div className='grid grid-cols-2 gap-2 text-gray-600 md:grid-cols-4'>
                      <div>NEW: {item.statusCounts.NEW}</div>
                      <div>REVIEWED: {item.statusCounts.REVIEWED}</div>
                      <div>ACCEPTED: {item.statusCounts.ACCEPTED}</div>
                      <div>IMPLEMENTED: {item.statusCounts.IMPLEMENTED}</div>
                      <div>VERIFIED: {item.statusCounts.VERIFIED}</div>
                      <div>REJECTED: {item.statusCounts.REJECTED}</div>
                      <div>未关闭: {item.unresolvedCount}</div>
                      <div>待处理: {item.pendingReviewCount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
