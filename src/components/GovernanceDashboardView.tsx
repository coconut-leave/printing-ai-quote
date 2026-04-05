'use client'

import React from 'react'
import { formatGovernanceActorLabel } from '@/lib/actorIdentity'
import { GovernanceThemeQualitySummaryList } from '@/components/GovernanceThemeQualitySummaryList'
import {
  GOVERNANCE_THEME_QUALITY_FILTER_OPTIONS,
  GOVERNANCE_THEME_QUALITY_SORT_OPTIONS,
  applyThemeQualityWorkbenchView,
  formatThemeQualityLabel,
  getThemeQualityBadgeClass,
  type GovernanceThemeQualityFilterId,
  type GovernanceThemeQualitySortDirection,
  type GovernanceThemeQualitySortField,
} from '@/lib/governanceThemeQuality'
import type {
  GovernanceBatchNote,
  GovernanceCampaignCandidate,
  GovernanceCampaignStatus,
} from '@/server/learning/governanceCampaign'
import type { GovernanceAssignmentSource, GovernanceRecommendationRole } from '@/server/learning/governanceAssignment'
import type {
  GovernanceActionDraftItem,
} from '@/server/learning/governanceDashboard'
import type { GovernanceThemeRecommendationSummary } from '@/server/learning/governancePlanAdoption'
import type { GovernancePlanDecisionType } from '@/server/learning/governancePlanning'
import type {
  GovernanceWorkbenchCampaignDetail,
  GovernanceWorkbenchData,
  GovernanceWorkbenchPlanView,
} from '@/server/learning/governanceWorkbench'

type GovernancePlanActorRecommendationView = NonNullable<GovernanceWorkbenchPlanView['actorRecommendations']>['approval']
type GovernanceAvailableActorView = NonNullable<GovernanceWorkbenchData['actorRecommendations']>['availableActors']

function formatRecommendationConfidence(value?: string) {
  const map: Record<string, string> = {
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
    NONE: '无',
  }
  return value ? (map[value] || value) : '无'
}

type GovernanceDashboardViewProps = {
  data: GovernanceWorkbenchData | null
  loading: boolean
  selectedActionIds: string[]
  selectedCampaignId: string
  campaignTitle: string
  batchTitle: string
  batchNote: string
  changedWhat: string
  expectedImpact: string
  selectedDetailType: 'candidate' | 'campaign'
  selectedDetailId: string | null
  selectedCandidate: GovernanceCampaignCandidate | null
  selectedCampaign: GovernanceWorkbenchCampaignDetail | null
  onToggleAction: (actionDraftId: string) => void
  onToggleAll: () => void
  onSelectCampaign: (campaignId: string) => void
  onSelectCandidate: (candidateId: string) => void
  onSelectedCampaignIdChange: (campaignId: string) => void
  onCampaignTitleChange: (value: string) => void
  onBatchTitleChange: (value: string) => void
  onBatchNoteChange: (value: string) => void
  onChangedWhatChange: (value: string) => void
  onExpectedImpactChange: (value: string) => void
  onCreateCampaign: () => void
  onMergeIntoCampaign: () => void
  onBatchActionStatus: (status: 'IN_GOVERNANCE' | 'ARCHIVED') => void
  onCampaignStatusChange: (campaignId: string, status: GovernanceCampaignStatus) => void
  onSaveBatchNote: (campaignId: string) => void
  getPlanDecisionNote: (planId: string) => string
  getPlanTargetCampaignId: (planId: string) => string
  onPlanDecisionNoteChange: (planId: string, value: string) => void
  onPlanTargetCampaignIdChange: (planId: string, campaignId: string) => void
  onPlanDecision: (planId: string, decisionType: GovernancePlanDecisionType) => void
  getPlanAssignmentActorId: (planId: string, recommendationRole: GovernanceRecommendationRole) => string
  onPlanAssignmentActorIdChange: (planId: string, recommendationRole: GovernanceRecommendationRole, actorId: string) => void
  onPlanAssign: (params: {
    planId: string
    recommendationRole: GovernanceRecommendationRole
    assignmentSource: GovernanceAssignmentSource
    actorId?: string
    clearAssignment?: boolean
  }) => void
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

function formatCampaignStatus(value: string) {
  const map: Record<string, string> = {
    NEW: 'NEW',
    IN_GOVERNANCE: 'IN_GOVERNANCE',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED',
  }
  return map[value] || value
}

function formatActionGovernanceStatus(value: string) {
  const map: Record<string, string> = {
    UNASSIGNED: '未归并',
    MERGED_INTO_CAMPAIGN: '已归并',
    IN_GOVERNANCE: '治理中',
    ARCHIVED: '已归档',
  }
  return map[value] || value
}

function formatEffectivenessLabel(value?: string) {
  const map: Record<string, string> = {
    IMPROVING: '明显改善',
    STABLE: '基本稳定',
    RECURRING: '仍在复发',
    LOW_SIGNAL: '样本不足',
    NEEDS_REVIEW: '需要复盘',
  }
  return value ? (map[value] || value) : '待观察'
}

function formatRecommendationQualityLabel(value?: string) {
  const map: Record<string, string> = {
    HIGH_VALUE: '高价值推荐',
    PLAUSIBLE: '可继续观察',
    MISSED_BUT_RECURRING: '忽略后仍复发',
    LOW_VALUE: '推荐质量偏低',
    UNCLEAR: '暂不明确',
  }
  return value ? (map[value] || value) : '待观察'
}

function formatPlanType(value: string) {
  const map: Record<string, string> = {
    NEW_CAMPAIGN: '新建专项',
    CONTINUE_CAMPAIGN: '继续治理',
    REVIEW_CAMPAIGN: '专项复盘',
  }
  return map[value] || value
}

function formatPlanStatus(value: string) {
  const map: Record<string, string> = {
    PROPOSED: '待审批',
    ACCEPTED: '已采纳',
    DISMISSED: '已忽略',
    MERGED: '已并入专项',
    BATCH_CREATED: '已创建批次',
  }
  return map[value] || value
}

function formatPlanDecisionType(value?: string) {
  const map: Record<string, string> = {
    ACCEPT: '采纳计划',
    DISMISS: '忽略计划',
    MERGE: '并入专项',
    CREATE_BATCH: '创建治理批次',
  }
  return value ? (map[value] || value) : '暂无审批记录'
}

function formatSignedPercent(value?: number) {
  if (typeof value !== 'number') return '暂无'
  if (value > 0) return `+${value}%`
  return `${value}%`
}

function formatRiskLevel(value: string) {
  const map: Record<string, string> = {
    LOW: '低风险',
    MEDIUM: '中风险',
    HIGH: '高风险',
  }
  return map[value] || value
}

function formatDateTime(value?: string) {
  if (!value) return '暂无'
  return new Date(value).toLocaleString()
}

function formatExecutionFlag(value?: boolean) {
  if (typeof value !== 'boolean') return '待观察'
  return value ? '已进入执行' : '尚未进入执行'
}

function formatAssignmentSource(value?: string) {
  const map: Record<string, string> = {
    recommended: '采纳推荐',
    manual: '人工分配',
  }
  return value ? (map[value] || value) : '暂无'
}

function formatRecommendationRole(value?: string) {
  const map: Record<string, string> = {
    approval: '审批推荐',
    execution: '推进推荐',
  }
  return value ? (map[value] || value) : '暂无'
}

function renderPlanAssignmentSummary(item: GovernanceWorkbenchPlanView) {
  if (!item.assignment) {
    return (
      <div className='rounded bg-amber-50 p-3 text-xs text-amber-900'>
        当前未分配负责人，可直接采纳推荐或手动改派。
      </div>
    )
  }

  return (
    <div className='rounded bg-amber-50 p-3 text-xs text-amber-900'>
      <div className='font-medium text-amber-950'>当前分配</div>
      <div className='mt-1'>负责人: {item.assignment.assignedActorName || '当前未分配'}</div>
      <div className='mt-1'>来源: {formatAssignmentSource(item.assignment.assignmentSource)} / {formatRecommendationRole(item.assignment.recommendationRole)}</div>
      <div className='mt-1'>是否采纳推荐: {item.assignment.recommendationAccepted ? '是' : '否'}</div>
      <div className='mt-1'>是否手动覆盖: {item.assignment.manuallyOverridden ? '是' : '否'}</div>
      <div className='mt-1'>原始主推荐: {item.assignment.recommendedActorName || '暂无'}</div>
      <div className='mt-1'>最近操作: {item.assignment.assignedBy} / {formatDateTime(item.assignment.assignedAt)}</div>
    </div>
  )
}

function renderCandidateActors(item?: GovernancePlanActorRecommendationView) {
  const candidates = item?.candidateActors || []
  if (candidates.length === 0) {
    return <div className='mt-1 text-xs text-gray-500'>暂无明确候选</div>
  }

  return (
    <div className='mt-2 space-y-1'>
      {candidates.map((candidate, index) => (
        <div key={`${candidate.actor.actorId}_${index}`} className='rounded bg-white px-2 py-2 text-xs text-slate-700'>
          <div className='font-medium text-slate-900'>
            {index + 1}. {candidate.actor.actorLabel}
          </div>
          <div className='mt-1'>分数 {candidate.recommendationScore} / 置信度 {formatRecommendationConfidence(candidate.recommendationConfidence)}</div>
        </div>
      ))}
    </div>
  )
}

function renderPlanActorRecommendationCard(params: {
  title: string
  recommendation?: GovernancePlanActorRecommendationView
  emptyText: string
  planId?: string
  recommendationRole?: GovernanceRecommendationRole
  selectedActorId?: string
  availableActors?: GovernanceAvailableActorView
  onAssignmentActorChange?: (planId: string, recommendationRole: GovernanceRecommendationRole, actorId: string) => void
  onAssign?: (params: {
    planId: string
    recommendationRole: GovernanceRecommendationRole
    assignmentSource: GovernanceAssignmentSource
    actorId?: string
  }) => void
}) {
  const recommendation = params.recommendation
  const mainActor = recommendation?.hasClearRecommendation
    ? recommendation.recommendedActorName
    : '暂无明确主推荐'
  const secondaryCandidates = recommendation?.candidateActors.slice(1, 3) || []
  const canAssign = Boolean(params.planId && params.recommendationRole && params.onAssign)

  return (
    <div className='rounded bg-slate-50 p-3 text-xs text-gray-700'>
      <div className='font-medium text-gray-900'>{params.title}</div>
      <div className='mt-1'>主推荐: {mainActor}</div>
      <div className='mt-1'>置信度: {formatRecommendationConfidence(recommendation?.recommendationConfidence)}</div>
      <div className='mt-1'>推荐分数: {typeof recommendation?.recommendationScore === 'number' ? recommendation.recommendationScore : '暂无'}</div>
      <div className='mt-2 rounded bg-white p-2 text-slate-700'>
        {recommendation?.recommendationReason || recommendation?.noRecommendationReason || params.emptyText}
      </div>
      {renderCandidateActors(recommendation)}
      {canAssign && params.planId && params.recommendationRole && (
        <div className='mt-3 space-y-2'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              disabled={!recommendation?.candidateActors[0]}
              onClick={() => params.onAssign?.({
                planId: params.planId!,
                recommendationRole: params.recommendationRole!,
                assignmentSource: 'recommended',
              })}
              className='rounded bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-50'
            >
              一键采纳主推荐
            </button>
            {secondaryCandidates.map((candidate) => (
              <button
                key={candidate.actor.actorId}
                type='button'
                onClick={() => params.onAssign?.({
                  planId: params.planId!,
                  recommendationRole: params.recommendationRole!,
                  assignmentSource: 'manual',
                  actorId: candidate.actor.actorId,
                })}
                className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700'
              >
                改派给 {candidate.actor.actorName}
              </button>
            ))}
          </div>
          <div className='flex flex-col gap-2 lg:flex-row'>
            <select
              value={params.selectedActorId || ''}
              onChange={(e) => params.onAssignmentActorChange?.(params.planId!, params.recommendationRole!, e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-2'
            >
              <option value=''>手动选择其他操作者</option>
              {(params.availableActors || []).map((actor) => (
                <option key={actor.actorId} value={actor.actorId}>{actor.actorLabel}</option>
              ))}
            </select>
            <button
              type='button'
              disabled={!params.selectedActorId}
              onClick={() => params.onAssign?.({
                planId: params.planId!,
                recommendationRole: params.recommendationRole!,
                assignmentSource: 'manual',
                actorId: params.selectedActorId,
              })}
              className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-50'
            >
              手动分配
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function renderThemeActorRecommendations(data?: GovernanceWorkbenchData['actorRecommendations']) {
  if (!data || data.themeRecommendations.length === 0) {
    return <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>当前还没有足够的主题级操作者推荐数据。</div>
  }

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {data.themeRecommendations.slice(0, 6).map((item) => (
        <div key={item.governanceTheme} className='rounded border border-gray-100 p-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='font-medium text-gray-900'>{item.governanceTheme}</div>
              <div className='mt-1 text-xs text-gray-500'>长期负责推荐</div>
            </div>
            <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>
              置信度 {formatRecommendationConfidence(item.recommendation.recommendationConfidence)}
            </div>
          </div>
          <div className='mt-3 text-sm text-gray-700'>
            {item.recommendation.hasClearRecommendation
              ? `主推荐: ${item.recommendation.recommendedActorName}`
              : '主推荐: 暂无明确人选'}
          </div>
          <div className='mt-2 rounded bg-slate-50 p-3 text-xs text-slate-700'>
            {item.recommendation.recommendationReason || item.recommendation.noRecommendationReason || '当前仍缺少足够信号。'}
          </div>
          <div className='mt-3 text-xs text-gray-600'>
            备选: {item.recommendation.candidateActors.length > 0
              ? item.recommendation.candidateActors.map((candidate) => candidate.actor.actorLabel).join(' / ')
              : '暂无'}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderActionRows(
  actions: GovernanceActionDraftItem[],
  selectedActionIds: string[],
  onToggleAction: (actionDraftId: string) => void,
) {
  return actions.map((item) => (
    <tr key={item.id} className='align-top'>
      <td className='px-3 py-3'>
        <input
          type='checkbox'
          checked={selectedActionIds.includes(item.id)}
          onChange={() => onToggleAction(item.id)}
        />
      </td>
      <td className='px-3 py-3 text-sm text-gray-900'>#{item.sourceReflectionId}</td>
      <td className='px-3 py-3 text-sm text-gray-900'>
        <div className='font-medium'>{item.actionTitle}</div>
        <div className='mt-1 text-xs text-gray-500'>{item.governanceTheme}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{formatPriorityLevel(item.priorityLevel)} / #{item.priorityScore}</div>
        <div className='mt-1 text-xs text-gray-500'>{formatGovernanceBucket(item.governanceBucket)}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{formatActionGovernanceStatus(item.governanceStatus)}</div>
        <div className='mt-1 text-xs text-gray-500'>操作人: {formatGovernanceActorLabel(item.governanceUpdatedBy)}</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700'>{item.campaignTitle || '未归并'}</td>
      <td className='px-3 py-3 text-sm text-gray-700'>
        <div>{formatRiskLevel(item.riskLevel)}</div>
        <div className='mt-1 text-xs text-gray-500'>停留 {item.stagnantDays} 天</div>
      </td>
      <td className='px-3 py-3 text-sm text-gray-700 break-all'>{item.targetFileHint || '未指定目标文件'}</td>
    </tr>
  ))
}

function renderPlanCards(items: GovernanceWorkbenchPlanView[], emptyText = '暂无可推荐的治理计划。') {
  if (items.length === 0) {
    return <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>{emptyText}</div>
  }

  return (
    <div className='space-y-3'>
      {items.map((item) => (
        <div key={item.id} className='rounded border border-gray-100 p-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='font-medium text-gray-900'>{item.planTitle}</div>
              <div className='mt-1 text-xs text-gray-500'>{formatPlanType(item.planType)} / {formatPriorityLevel(item.priorityLevel)} / {item.governanceTheme}</div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {item.themeQualityLabel && (
                <div className={getThemeQualityBadgeClass(item.themeQualityLabel)}>{formatThemeQualityLabel(item.themeQualityLabel)}</div>
              )}
              <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{item.priorityLevel}</div>
            </div>
          </div>
          {item.themeSummary && (
            <div className='mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-3'>
              <div>主题质量 {formatThemeQualityLabel(item.themeQualityLabel)}</div>
              <div>主题采纳率 {item.themeSummary.acceptedRate}%</div>
              <div>主题进入执行 {item.themeSummary.enteredExecutionCount}</div>
              <div>主题改善计划 {item.themeSummary.improvingCount}</div>
              <div>主题复发累计 {item.themeSummary.recurringCount}</div>
              <div>主题已采纳 {item.themeSummary.acceptedCount}</div>
            </div>
          )}
          <div className='mt-3 text-sm text-gray-700'>{item.whyNow}</div>
          <div className='mt-3 text-xs text-gray-600'>
            <div>建议范围: {item.recommendedScope}</div>
            <div className='mt-1'>预期结果: {item.expectedOutcome}</div>
          </div>
          <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
            {renderPlanActorRecommendationCard({
              title: '审批推荐操作者',
              recommendation: item.actorRecommendations?.approval,
              emptyText: '当前还没有足够的审批推荐信号。',
            })}
            {renderPlanActorRecommendationCard({
              title: '推进推荐操作者',
              recommendation: item.actorRecommendations?.execution,
              emptyText: '当前还没有足够的推进推荐信号。',
            })}
          </div>
          {item.themePriorityHint && (
            <div className='mt-3 rounded bg-slate-50 p-3 text-xs text-slate-700'>{item.themePriorityHint}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function renderTrackedPlanCards(params: {
  items: GovernanceWorkbenchPlanView[]
  campaigns: GovernanceWorkbenchCampaignDetail[]
  availableActors: GovernanceAvailableActorView
  getPlanDecisionNote: (planId: string) => string
  getPlanTargetCampaignId: (planId: string) => string
  getPlanAssignmentActorId: (planId: string, recommendationRole: GovernanceRecommendationRole) => string
  onPlanDecisionNoteChange: (planId: string, value: string) => void
  onPlanTargetCampaignIdChange: (planId: string, campaignId: string) => void
  onPlanAssignmentActorIdChange: (planId: string, recommendationRole: GovernanceRecommendationRole, actorId: string) => void
  onPlanDecision: (planId: string, decisionType: GovernancePlanDecisionType) => void
  onPlanAssign: (params: {
    planId: string
    recommendationRole: GovernanceRecommendationRole
    assignmentSource: GovernanceAssignmentSource
    actorId?: string
    clearAssignment?: boolean
  }) => void
  emptyText?: string
}) {
  if (params.items.length === 0) {
    return <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>{params.emptyText || '暂无可跟踪的治理计划。'}</div>
  }

  return (
    <div className='space-y-3'>
      {params.items.map((item) => {
        const selectedCampaignId = params.getPlanTargetCampaignId(item.id)
        const note = params.getPlanDecisionNote(item.id)

        return (
          <div key={item.id} className='rounded border border-gray-100 p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='font-medium text-gray-900'>{item.planTitle}</div>
                <div className='mt-1 text-xs text-gray-500'>
                  {formatPlanType(item.planType)} / {formatPriorityLevel(item.priorityLevel)} / {formatPlanStatus(item.status)}
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                {item.themeQualityLabel && (
                  <div className={getThemeQualityBadgeClass(item.themeQualityLabel)}>{formatThemeQualityLabel(item.themeQualityLabel)}</div>
                )}
                <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{formatPlanStatus(item.status)}</div>
              </div>
            </div>

            <div className='mt-3 text-sm text-gray-700'>{item.whyNow}</div>
            <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
              <div className='rounded bg-slate-50 p-3 text-xs text-gray-700'>
                <div className='font-medium text-gray-900'>推荐质量信号</div>
                <div className='mt-1'>效果标签: {formatEffectivenessLabel(item.effectivenessLabel)}</div>
                <div className='mt-1'>推荐质量: {formatRecommendationQualityLabel(item.recommendationQualityLabel)}</div>
                <div className='mt-1'>执行状态: {formatExecutionFlag(item.enteredExecution)}</div>
                <div className='mt-1'>复发次数: {item.recurrenceCount ?? 0}</div>
                <div className='mt-1'>变化率: {formatSignedPercent(item.changeRate)}</div>
                <div className='mt-1'>当前优先级: {formatPriorityLevel(item.priorityLevel)}</div>
              </div>
              <div className='rounded bg-slate-50 p-3 text-xs text-gray-700'>
                <div className='font-medium text-gray-900'>主题历史质量</div>
                <div className='mt-1'>治理主题: {item.governanceTheme}</div>
                <div className='mt-1'>主题质量: {formatThemeQualityLabel(item.themeQualityLabel)}</div>
                <div className='mt-1'>主题采纳率: {typeof item.themeAcceptedRate === 'number' ? `${item.themeAcceptedRate}%` : '暂无'}</div>
                <div className='mt-1'>主题累计复发: {item.themeRecurringCount ?? 0}</div>
                <div className='mt-1'>主题计划数: {item.themePlanCount ?? 0}</div>
                <div className='mt-1'>主题内优先位次: {item.themePriorityRank ? `第 ${item.themePriorityRank} 位` : '暂无'}</div>
                <div className='mt-2 rounded bg-white p-2 text-slate-700'>{item.themePriorityHint || '当前主题还没有足够历史信号。'}</div>
              </div>
            </div>

            <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
              <div className='rounded bg-slate-50 p-3 text-xs text-gray-700'>
                <div className='font-medium text-gray-900'>建议范围</div>
                <div className='mt-1'>{item.recommendedScope}</div>
                <div className='mt-2 font-medium text-gray-900'>观察指标</div>
                <div className='mt-1'>{item.watchMetrics.join(' / ') || '暂无'}</div>
              </div>
              <div className='rounded bg-slate-50 p-3 text-xs text-gray-700'>
                <div className='font-medium text-gray-900'>最新审批记录</div>
                <div className='mt-1'>{formatPlanDecisionType(item.decisionType)}</div>
                <div className='mt-1'>处理人: {formatGovernanceActorLabel(item.decisionActor, item.decisionBy)}</div>
                <div className='mt-1'>处理时间: {formatDateTime(item.decisionAt)}</div>
                <div className='mt-1'>说明: {item.decisionNote || '暂无'}</div>
                <div className='mt-1'>关联专项: {item.mergedCampaignId || '暂无'}</div>
                <div className='mt-1'>创建批次: {item.createdBatchId || '暂无'}</div>
              </div>
            </div>

            <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
              {renderPlanActorRecommendationCard({
                title: '审批推荐操作者',
                recommendation: item.actorRecommendations?.approval,
                emptyText: '当前还没有足够的审批推荐信号。',
                planId: item.id,
                recommendationRole: 'approval',
                selectedActorId: params.getPlanAssignmentActorId(item.id, 'approval'),
                availableActors: params.availableActors,
                onAssignmentActorChange: params.onPlanAssignmentActorIdChange,
                onAssign: params.onPlanAssign,
              })}
              {renderPlanActorRecommendationCard({
                title: '推进推荐操作者',
                recommendation: item.actorRecommendations?.execution,
                emptyText: '当前还没有足够的推进推荐信号。',
                planId: item.id,
                recommendationRole: 'execution',
                selectedActorId: params.getPlanAssignmentActorId(item.id, 'execution'),
                availableActors: params.availableActors,
                onAssignmentActorChange: params.onPlanAssignmentActorIdChange,
                onAssign: params.onPlanAssign,
              })}
            </div>

            <div className='mt-3'>{renderPlanAssignmentSummary(item)}</div>

            <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
              <label className='text-sm'>
                <span className='mb-1 block text-gray-700'>审批说明</span>
                <textarea
                  value={note}
                  onChange={(e) => params.onPlanDecisionNoteChange(item.id, e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2'
                  rows={2}
                  placeholder='忽略计划时请填写原因；采纳/并入/建批次时可补充备注。'
                />
              </label>
              <label className='text-sm'>
                <span className='mb-1 block text-gray-700'>目标专项</span>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => params.onPlanTargetCampaignIdChange(item.id, e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2'
                >
                  <option value=''>自动选择或不指定</option>
                  {params.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.campaignTitle}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className='mt-3 flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={() => params.onPlanAssign({
                  planId: item.id,
                  recommendationRole: 'execution',
                  assignmentSource: 'manual',
                  clearAssignment: true,
                })}
                className='rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800'
              >
                清空当前分配
              </button>
              <button
                type='button'
                onClick={() => params.onPlanDecision(item.id, 'ACCEPT')}
                className='rounded bg-slate-900 px-3 py-2 text-xs text-white'
              >
                采纳计划
              </button>
              <button
                type='button'
                onClick={() => params.onPlanDecision(item.id, 'DISMISS')}
                className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700'
              >
                忽略计划
              </button>
              <button
                type='button'
                onClick={() => params.onPlanDecision(item.id, 'MERGE')}
                className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700'
              >
                并入已有专项
              </button>
              <button
                type='button'
                onClick={() => params.onPlanDecision(item.id, 'CREATE_BATCH')}
                className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700'
              >
                创建下一轮批次
              </button>
            </div>

            {item.decisionHistory.length > 0 && (
              <div className='mt-3 rounded border border-dashed border-gray-200 p-3 text-xs text-gray-600'>
                <div className='font-medium text-gray-900'>审批记录</div>
                <div className='mt-2 space-y-1'>
                  {[...item.decisionHistory].reverse().map((decision) => (
                    <div key={decision.id}>
                      {formatDateTime(decision.decisionAt)} / {formatPlanDecisionType(decision.decisionType)} / {formatGovernanceActorLabel(decision.decisionActor, decision.decisionBy)}
                      {decision.decisionNote ? ` / ${decision.decisionNote}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function renderBatchNote(note?: GovernanceBatchNote) {
  if (!note) {
    return <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无批次备注。</div>
  }

  return (
    <div className='rounded border border-gray-100 p-4 text-sm'>
      <div className='font-medium text-gray-900'>{note.batchTitle}</div>
      <div className='mt-1 text-xs text-gray-500'>{formatDateTime(note.createdAt)}</div>
      <div className='mt-1 text-xs text-gray-500'>记录人: {formatGovernanceActorLabel(note.createdBy)}</div>
      {note.assignment && (
        <div className='mt-1 text-xs text-slate-600'>
          负责人: {note.assignment.assignedActorName || '未分配'} / 来源: {formatAssignmentSource(note.assignment.assignmentSource)} / {formatRecommendationRole(note.assignment.recommendationRole)}
        </div>
      )}
      {note.sourcePlanTitle && (
        <div className='mt-1 text-xs text-slate-600'>来源计划: {note.sourcePlanTitle}</div>
      )}
      <div className='mt-3 text-gray-700'>{note.batchNote}</div>
      <div className='mt-2 text-xs text-gray-600'>本轮改动: {note.changedWhat}</div>
      <div className='mt-1 text-xs text-gray-600'>预期影响: {note.expectedImpact}</div>
    </div>
  )
}

export function GovernanceDashboardView(props: GovernanceDashboardViewProps) {
  const {
    data,
    loading,
    selectedActionIds,
    selectedCampaignId,
    campaignTitle,
    batchTitle,
    batchNote,
    changedWhat,
    expectedImpact,
    selectedDetailType,
    selectedDetailId,
    selectedCandidate,
    selectedCampaign,
    onToggleAction,
    onToggleAll,
    onSelectCampaign,
    onSelectCandidate,
    onSelectedCampaignIdChange,
    onCampaignTitleChange,
    onBatchTitleChange,
    onBatchNoteChange,
    onChangedWhatChange,
    onExpectedImpactChange,
    onCreateCampaign,
    onMergeIntoCampaign,
    onBatchActionStatus,
    onCampaignStatusChange,
    onSaveBatchNote,
    getPlanDecisionNote,
    getPlanTargetCampaignId,
    getPlanAssignmentActorId,
    onPlanDecisionNoteChange,
    onPlanTargetCampaignIdChange,
    onPlanDecision,
    onPlanAssignmentActorIdChange,
    onPlanAssign,
  } = props

  const planDrafts = data?.planDrafts || {
    trackedPlans: [],
    recommendedPlans: [],
    continueCandidates: [],
    newCampaignCandidates: [],
    reviewCandidates: [],
  }

  const [themeSortField, setThemeSortField] = React.useState<GovernanceThemeQualitySortField>('themeQualityLabel')
  const [themeSortDirection, setThemeSortDirection] = React.useState<GovernanceThemeQualitySortDirection>('desc')
  const [themeFilters, setThemeFilters] = React.useState<GovernanceThemeQualityFilterId[]>([])

  const themeQualityPlanView = React.useMemo(() => ({
    trackedPlans: applyThemeQualityWorkbenchView({
      items: planDrafts.trackedPlans,
      sortField: themeSortField,
      sortDirection: themeSortDirection,
      filters: themeFilters,
    }),
    recommendedPlans: applyThemeQualityWorkbenchView({
      items: planDrafts.recommendedPlans,
      sortField: themeSortField,
      sortDirection: themeSortDirection,
      filters: themeFilters,
    }),
    continueCandidates: applyThemeQualityWorkbenchView({
      items: planDrafts.continueCandidates,
      sortField: themeSortField,
      sortDirection: themeSortDirection,
      filters: themeFilters,
    }),
    newCampaignCandidates: applyThemeQualityWorkbenchView({
      items: planDrafts.newCampaignCandidates,
      sortField: themeSortField,
      sortDirection: themeSortDirection,
      filters: themeFilters,
    }),
    reviewCandidates: applyThemeQualityWorkbenchView({
      items: planDrafts.reviewCandidates,
      sortField: themeSortField,
      sortDirection: themeSortDirection,
      filters: themeFilters,
    }),
  }), [planDrafts, themeFilters, themeSortDirection, themeSortField])

  function toggleThemeFilter(filterId: GovernanceThemeQualityFilterId) {
    setThemeFilters((prev) => prev.includes(filterId)
      ? prev.filter((item) => item !== filterId)
      : [...prev, filterId])
  }

  return (
    <>
      <div className='mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
        当前工作台只做专项治理任务归并、批量流转与治理视角展示，不自动执行任何代码修改，也不引入新的持久化基础设施。
      </div>

      {loading && <div className='rounded-lg bg-white p-6 shadow'>加载中...</div>}

      {!loading && data && (
        <>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>Action Draft</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.actionDraftCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>专项候选</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.candidateCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>已创建专项</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.campaignCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>未归并</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.unassignedCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>治理中</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.inGovernanceCount}</div>
            </div>
            <div className='rounded-lg bg-white p-4 shadow'>
              <div className='text-sm text-gray-600'>推荐计划</div>
              <div className='mt-1 text-2xl font-bold text-gray-900'>{data.summary.recommendedPlanCount ?? 0}</div>
            </div>
          </div>

          <div className='mb-8 rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-lg font-semibold text-gray-900'>推荐质量信号卡片</h2>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'>
              <div className='rounded border border-gray-100 p-4'>
                <div className='text-sm text-gray-600'>进入执行</div>
                <div className='mt-1 text-2xl font-bold text-gray-900'>{data.recommendationQuality.overview.enteredExecutionCount}</div>
              </div>
              <div className='rounded border border-gray-100 p-4'>
                <div className='text-sm text-gray-600'>高价值推荐</div>
                <div className='mt-1 text-2xl font-bold text-gray-900'>{data.recommendationQuality.overview.highValueCount}</div>
              </div>
              <div className='rounded border border-gray-100 p-4'>
                <div className='text-sm text-gray-600'>忽略后复发</div>
                <div className='mt-1 text-2xl font-bold text-gray-900'>{data.recommendationQuality.overview.missedButRecurringCount}</div>
              </div>
              <div className='rounded border border-gray-100 p-4'>
                <div className='text-sm text-gray-600'>值得继续推荐主题</div>
                <div className='mt-1 text-2xl font-bold text-gray-900'>{data.recommendationQuality.continueRecommendThemes.length}</div>
              </div>
              <div className='rounded border border-gray-100 p-4'>
                <div className='text-sm text-gray-600'>谨慎推荐主题</div>
                <div className='mt-1 text-2xl font-bold text-gray-900'>{data.recommendationQuality.cautiousThemes.length}</div>
              </div>
            </div>
          </div>

          {data.actionDrafts.length === 0 ? (
            <div className='rounded-lg bg-white p-8 text-center shadow'>
              <h2 className='text-lg font-semibold text-gray-900'>暂无专项治理数据</h2>
              <p className='mt-2 text-sm text-gray-600'>当前还没有可治理的 action draft。</p>
            </div>
          ) : (
            <>
              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
                <GovernanceThemeQualitySummaryList
                  title='值得继续推荐的治理主题'
                  items={data.recommendationQuality.continueRecommendThemes}
                  emptyText='当前还没有可持续推荐的治理主题。'
                />
                <GovernanceThemeQualitySummaryList
                  title='需要谨慎推荐的治理主题'
                  items={data.recommendationQuality.cautiousThemes}
                  emptyText='当前还没有需要谨慎推荐的治理主题。'
                />
              </div>

              <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                <div className='flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>推荐给更合适的操作者</h2>
                    <p className='mt-1 text-sm text-gray-600'>基于治理主题经验、采纳行为、进入执行与改善效果做规则化推荐，只做辅助决策，不自动指派。</p>
                  </div>
                  <div className='text-xs text-gray-500'>
                    {data.actorRecommendations?.hasRealActorData ? '已过滤 fallback actor，仅展示真实操作者信号。' : '当前还没有足够的真实操作者信号。'}
                  </div>
                </div>
                <div className='mt-4'>
                  {renderThemeActorRecommendations(data.actorRecommendations)}
                </div>
              </div>

              <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>Theme Quality 排序与筛选</h2>
                    <p className='mt-1 text-sm text-gray-600'>按同一套主题质量口径，快速筛出高价值、高复发、高采纳率或样本不足的治理计划。</p>
                  </div>
                  <div className='text-xs text-gray-500'>
                    当前命中 跟踪计划 {themeQualityPlanView.trackedPlans.length} 条 / 推荐计划 {themeQualityPlanView.recommendedPlans.length} 条
                  </div>
                </div>
                <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <label className='text-sm'>
                    <span className='mb-1 block text-gray-700'>排序字段</span>
                    <select
                      value={themeSortField}
                      onChange={(e) => setThemeSortField(e.target.value as GovernanceThemeQualitySortField)}
                      className='w-full rounded border border-gray-300 px-3 py-2'
                    >
                      {GOVERNANCE_THEME_QUALITY_SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className='text-sm'>
                    <span className='mb-1 block text-gray-700'>排序方向</span>
                    <select
                      value={themeSortDirection}
                      onChange={(e) => setThemeSortDirection(e.target.value as GovernanceThemeQualitySortDirection)}
                      className='w-full rounded border border-gray-300 px-3 py-2'
                    >
                      <option value='desc'>高到低 / 优先</option>
                      <option value='asc'>低到高 / 字母顺序</option>
                    </select>
                  </label>
                </div>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {GOVERNANCE_THEME_QUALITY_FILTER_OPTIONS.map((option) => {
                    const active = themeFilters.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => toggleThemeFilter(option.value)}
                        className={active
                          ? 'rounded border border-slate-900 bg-slate-900 px-3 py-2 text-xs text-white'
                          : 'rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50'}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                  {themeFilters.length > 0 && (
                    <button
                      type='button'
                      onClick={() => setThemeFilters([])}
                      className='rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50'
                    >
                      清空筛选
                    </button>
                  )}
                </div>
              </div>

              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>治理计划跟踪列表</h2>
                  {renderTrackedPlanCards({
                    items: themeQualityPlanView.trackedPlans,
                    campaigns: data.campaigns,
                    availableActors: data.actorRecommendations?.availableActors || [],
                    getPlanDecisionNote,
                    getPlanTargetCampaignId,
                    getPlanAssignmentActorId,
                    onPlanDecisionNoteChange,
                    onPlanTargetCampaignIdChange,
                    onPlanAssignmentActorIdChange,
                    onPlanDecision,
                    onPlanAssign,
                    emptyText: '当前筛选条件下暂无可跟踪的治理计划。',
                  })}
                </div>
                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>下一轮推荐治理计划</h2>
                  {renderPlanCards(themeQualityPlanView.recommendedPlans, '当前筛选条件下暂无可推荐的治理计划。')}
                </div>
              </div>

              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-1'>
                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>计划分流</h2>
                  <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                    <div>
                      <div className='mb-2 text-sm font-medium text-gray-900'>继续治理候选</div>
                      {renderPlanCards(themeQualityPlanView.continueCandidates.slice(0, 2), '当前筛选条件下暂无继续治理候选。')}
                    </div>
                    <div>
                      <div className='mb-2 text-sm font-medium text-gray-900'>新建专项候选</div>
                      {renderPlanCards(themeQualityPlanView.newCampaignCandidates.slice(0, 2), '当前筛选条件下暂无新建专项候选。')}
                    </div>
                    <div>
                      <div className='mb-2 text-sm font-medium text-gray-900'>需要复盘的专项</div>
                      {renderPlanCards(themeQualityPlanView.reviewCandidates.slice(0, 2), '当前筛选条件下暂无复盘计划。')}
                    </div>
                  </div>
                </div>
              </div>

              <div className='mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2'>
                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>专项治理候选列表</h2>
                  <div className='space-y-3'>
                    {data.candidateCampaigns.length === 0 ? (
                      <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无可自动归并的专项候选。</div>
                    ) : data.candidateCampaigns.map((candidate) => (
                      <button
                        key={candidate.candidateId}
                        type='button'
                        onClick={() => onSelectCandidate(candidate.candidateId)}
                        className={selectedDetailType === 'candidate' && selectedDetailId === candidate.candidateId
                          ? 'w-full rounded border border-slate-900 bg-slate-50 p-4 text-left'
                          : 'w-full rounded border border-slate-200 bg-white p-4 text-left'}
                      >
                        <div className='mb-2 flex flex-wrap gap-2 text-xs'>
                          <span className='rounded bg-slate-900 px-2 py-1 text-white'>#{candidate.priorityScore}</span>
                          <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{formatPriorityLevel(candidate.priorityLevel)}</span>
                          <span className='rounded bg-emerald-50 px-2 py-1 text-emerald-700'>{formatGovernanceBucket(candidate.governanceBucket)}</span>
                        </div>
                        <div className='font-medium text-gray-900'>{candidate.campaignTitle}</div>
                        <div className='mt-1 text-sm text-gray-600'>{candidate.governanceTheme}</div>
                        <div className='mt-2 text-xs text-gray-500'>
                          {candidate.targetArea} / {candidate.changeType} / {candidate.relatedActionDraftIds.length} 条 action draft
                        </div>
                        <div className='mt-2 text-xs text-gray-600'>{candidate.priorityReason}</div>
                      </button>
                    ))}
                  </div>
                  <div className='mt-6 border-t border-gray-100 pt-6'>
                    <h3 className='mb-3 text-base font-semibold text-gray-900'>已有专项</h3>
                    <div className='space-y-3'>
                      {data.campaigns.length === 0 ? (
                        <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无已创建专项。</div>
                      ) : data.campaigns.map((campaign) => (
                        <button
                          key={campaign.id}
                          type='button'
                          onClick={() => onSelectCampaign(campaign.id)}
                          className={selectedDetailType === 'campaign' && selectedDetailId === campaign.id
                            ? 'w-full rounded border border-slate-900 bg-slate-50 p-4 text-left'
                            : 'w-full rounded border border-slate-200 bg-white p-4 text-left'}
                        >
                          <div className='mb-2 flex flex-wrap gap-2 text-xs'>
                            <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{formatCampaignStatus(campaign.status)}</span>
                            <span className='rounded bg-emerald-50 px-2 py-1 text-emerald-700'>{campaign.actionCount} 条 action</span>
                            <span className='rounded bg-sky-50 px-2 py-1 text-sky-700'>{formatEffectivenessLabel(campaign.effectivenessLabel)}</span>
                          </div>
                          <div className='font-medium text-gray-900'>{campaign.campaignTitle}</div>
                          <div className='mt-1 text-sm text-gray-600'>{campaign.summary}</div>
                          <div className='mt-2 text-xs text-gray-500'>
                            前后数量 {campaign.beforeCount ?? '-'} / {campaign.afterCount ?? '-'} | 变化 {formatSignedPercent(campaign.changeRate)}
                          </div>
                          {campaign.recurrenceWarning && (
                            <div className='mt-2 text-xs text-amber-700'>{campaign.recurrenceWarning}</div>
                          )}
                          <div className='mt-2 text-xs text-gray-500'>最近更新: {formatGovernanceActorLabel(campaign.updatedBy, campaign.createdBy?.actorName)}</div>
                          {campaign.lastBatchNote && (
                            <div className='mt-2 text-xs text-gray-500'>最近批次: {campaign.lastBatchNote.batchTitle} / {formatGovernanceActorLabel(campaign.lastBatchNote.createdBy)}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='rounded-lg bg-white p-6 shadow'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>专项详情视图</h2>
                  {selectedDetailType === 'candidate' && selectedCandidate ? (
                    <div className='space-y-3 text-sm'>
                      <div className='text-lg font-semibold text-gray-900'>{selectedCandidate.campaignTitle}</div>
                      <div className='text-gray-600'>{selectedCandidate.summary}</div>
                      <div className='text-gray-600'>{selectedCandidate.mergeReason}</div>
                      <div className='text-gray-600'>{selectedCandidate.recommendedNextAction}</div>
                      <div className='flex flex-wrap gap-2 text-xs'>
                        <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{selectedCandidate.targetArea}</span>
                        <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{selectedCandidate.changeType}</span>
                        <span className='rounded bg-slate-100 px-2 py-1 text-slate-700'>{formatPriorityLevel(selectedCandidate.priorityLevel)}</span>
                      </div>
                      <div>
                        <div className='font-medium text-gray-900'>涉及 action draft</div>
                        <div className='mt-2 space-y-2'>
                          {data.actionDrafts.filter((item) => selectedCandidate.relatedActionDraftIds.includes(item.id)).map((item) => (
                            <div key={item.id} className='rounded border border-gray-100 p-2 text-xs text-gray-700'>
                              <div className='font-medium text-gray-900'>{item.actionTitle}</div>
                              <div>{item.targetFileHint || '未指定目标文件'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedDetailType === 'campaign' && selectedCampaign ? (
                    <div className='space-y-3 text-sm'>
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <div className='text-lg font-semibold text-gray-900'>{selectedCampaign.campaignTitle}</div>
                          <div className='text-gray-600'>{selectedCampaign.governanceTheme}</div>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <div className='rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'>{formatCampaignStatus(selectedCampaign.status)}</div>
                          <div className='rounded bg-sky-50 px-3 py-1 text-xs text-sky-700'>{formatEffectivenessLabel(selectedCampaign.effectivenessLabel)}</div>
                        </div>
                      </div>
                      <div className='text-gray-600'>{selectedCampaign.summary}</div>
                      <div className='text-gray-600'>{selectedCampaign.recommendedNextAction}</div>
                      <div className='grid grid-cols-2 gap-2 text-xs text-gray-500'>
                        <div>高风险 {selectedCampaign.riskLevelDistribution.HIGH}</div>
                        <div>中风险 {selectedCampaign.riskLevelDistribution.MEDIUM}</div>
                        <div>低风险 {selectedCampaign.riskLevelDistribution.LOW}</div>
                        <div>action 数 {selectedCampaign.actionCount}</div>
                        <div>前后数量 {selectedCampaign.beforeCount ?? '-'} / {selectedCampaign.afterCount ?? '-'}</div>
                        <div>变化率 {formatSignedPercent(selectedCampaign.changeRate)}</div>
                        <div>复发次数 {selectedCampaign.recurrenceCount ?? 0}</div>
                        <div>最近批次 {selectedCampaign.lastBatchNote?.batchTitle || '暂无'}</div>
                        <div>创建人 {formatGovernanceActorLabel(selectedCampaign.createdBy)}</div>
                        <div>最近更新人 {formatGovernanceActorLabel(selectedCampaign.updatedBy, selectedCampaign.createdBy?.actorName)}</div>
                      </div>
                      {data.recommendationQuality.themeSummaries.find((item) => item.governanceTheme === selectedCampaign.governanceTheme) && (() => {
                        const themeSummary = data.recommendationQuality.themeSummaries.find((item) => item.governanceTheme === selectedCampaign.governanceTheme)
                        if (!themeSummary) return null

                        return (
                          <div className='rounded bg-slate-50 p-3 text-xs text-slate-700'>
                            <div className='font-medium text-gray-900'>主题历史质量</div>
                            <div className='mt-1'>采纳率: {themeSummary.acceptedRate}%</div>
                            <div className='mt-1'>进入执行: {themeSummary.enteredExecutionCount}</div>
                            <div className='mt-1'>改善计划: {themeSummary.improvingCount}</div>
                            <div className='mt-1'>累计复发: {themeSummary.recurringCount}</div>
                            <div className='mt-2'>{themeSummary.themePriorityHint}</div>
                          </div>
                        )
                      })()}
                      {data.actorRecommendations?.themeRecommendations.find((item) => item.governanceTheme === selectedCampaign.governanceTheme) && (() => {
                        const actorRecommendation = data.actorRecommendations?.themeRecommendations.find((item) => item.governanceTheme === selectedCampaign.governanceTheme)
                        if (!actorRecommendation) return null

                        return (
                          <div className='rounded bg-slate-50 p-3 text-xs text-slate-700'>
                            <div className='font-medium text-gray-900'>该主题更适合给谁负责</div>
                            <div className='mt-1'>主推荐: {actorRecommendation.recommendation.recommendedActorName || '暂无明确人选'}</div>
                            <div className='mt-1'>置信度: {formatRecommendationConfidence(actorRecommendation.recommendation.recommendationConfidence)}</div>
                            <div className='mt-2'>{actorRecommendation.recommendation.recommendationReason || actorRecommendation.recommendation.noRecommendationReason}</div>
                          </div>
                        )
                      })()}
                      {selectedCampaign.recurrenceWarning && (
                        <div className='rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900'>
                          {selectedCampaign.recurrenceWarning}
                        </div>
                      )}
                      <div className='flex flex-wrap gap-2'>
                        {(['NEW', 'IN_GOVERNANCE', 'COMPLETED', 'ARCHIVED'] as GovernanceCampaignStatus[]).map((status) => (
                          <button
                            key={status}
                            type='button'
                            onClick={() => onCampaignStatusChange(selectedCampaign.id, status)}
                            className='rounded border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50'
                          >
                            标记 {status}
                          </button>
                        ))}
                      </div>
                      <div>
                        <div className='mb-2 font-medium text-gray-900'>最近治理批次备注</div>
                        {renderBatchNote(selectedCampaign.lastBatchNote)}
                      </div>
                      <div>
                        <div className='mb-2 font-medium text-gray-900'>关联治理计划</div>
                        {selectedCampaign.relatedPlans.length === 0 ? (
                          <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>暂无关联计划。</div>
                        ) : (
                          <div className='space-y-2'>
                            {selectedCampaign.relatedPlans.map((plan) => (
                              <div key={plan.id} className='rounded border border-gray-100 p-3 text-xs text-gray-700'>
                                <div className='font-medium text-gray-900'>{plan.planTitle}</div>
                                <div className='mt-1'>{formatPlanType(plan.planType)} / {formatPlanStatus(plan.status)}</div>
                                <div className='mt-1'>推荐质量: {formatRecommendationQualityLabel(plan.recommendationQualityLabel)} / {formatEffectivenessLabel(plan.effectivenessLabel)}</div>
                                <div className='mt-1'>最新处理: {formatPlanDecisionType(plan.decisionType)} / {formatDateTime(plan.decisionAt)} / {formatGovernanceActorLabel(plan.decisionActor, plan.decisionBy)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className='rounded border border-gray-100 p-4'>
                        <div className='mb-3 font-medium text-gray-900'>新增治理批次备注</div>
                        <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
                          <label className='text-sm'>
                            <span className='mb-1 block text-gray-700'>批次标题</span>
                            <input
                              value={batchTitle || ''}
                              onChange={(e) => onBatchTitleChange(e.target.value)}
                              className='w-full rounded border border-gray-300 px-3 py-2'
                              placeholder='例如：材质映射第二轮'
                            />
                          </label>
                          <label className='text-sm'>
                            <span className='mb-1 block text-gray-700'>预期影响</span>
                            <input
                              value={expectedImpact || ''}
                              onChange={(e) => onExpectedImpactChange(e.target.value)}
                              className='w-full rounded border border-gray-300 px-3 py-2'
                              placeholder='例如：降低复发率'
                            />
                          </label>
                          <label className='text-sm lg:col-span-2'>
                            <span className='mb-1 block text-gray-700'>本轮说明</span>
                            <textarea
                              value={batchNote || ''}
                              onChange={(e) => onBatchNoteChange(e.target.value)}
                              className='w-full rounded border border-gray-300 px-3 py-2'
                              rows={3}
                              placeholder='记录本轮准备改什么，以及为什么这样改。'
                            />
                          </label>
                          <label className='text-sm lg:col-span-2'>
                            <span className='mb-1 block text-gray-700'>改了什么</span>
                            <textarea
                              value={changedWhat || ''}
                              onChange={(e) => onChangedWhatChange(e.target.value)}
                              className='w-full rounded border border-gray-300 px-3 py-2'
                              rows={2}
                              placeholder='例如：补了材质映射样例和目标文件回归。'
                            />
                          </label>
                        </div>
                        <button
                          type='button'
                          onClick={() => onSaveBatchNote(selectedCampaign.id)}
                          className='mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white'
                        >
                          保存批次备注
                        </button>
                      </div>
                      <div>
                        <div className='font-medium text-gray-900'>涉及 action draft</div>
                        <div className='mt-2 space-y-2'>
                          {selectedCampaign.relatedActions.map((item) => (
                            <div key={item.id} className='rounded border border-gray-100 p-2 text-xs text-gray-700'>
                              <div className='font-medium text-gray-900'>{item.actionTitle}</div>
                              <div>{item.targetFileHint || '未指定目标文件'}</div>
                              <div className='mt-1 text-gray-500'>{formatRiskLevel(item.riskLevel)} / {formatActionGovernanceStatus(item.governanceStatus)}</div>
                              <div className='mt-1 text-gray-500'>最近操作人: {formatGovernanceActorLabel(item.governanceUpdatedBy)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>
                      先从左侧选择一个专项候选或已创建专项。
                    </div>
                  )}
                </div>
              </div>

              <div className='mb-8 rounded-lg bg-white p-6 shadow'>
                <h2 className='mb-4 text-lg font-semibold text-gray-900'>批量归并入口</h2>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                  <label className='text-sm'>
                    <span className='mb-1 block font-medium text-gray-700'>新专项标题</span>
                    <input
                      value={campaignTitle}
                      onChange={(e) => onCampaignTitleChange(e.target.value)}
                      className='w-full rounded border border-gray-300 px-3 py-2'
                      placeholder='例如：材质映射专项'
                    />
                  </label>
                  <label className='text-sm'>
                    <span className='mb-1 block font-medium text-gray-700'>合并到已有专项</span>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => onSelectedCampaignIdChange(e.target.value)}
                      className='w-full rounded border border-gray-300 px-3 py-2'
                    >
                      <option value=''>请选择专项</option>
                      {data.campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.campaignTitle}</option>
                      ))}
                    </select>
                  </label>
                  <div className='text-sm text-gray-600'>
                    <div className='mb-1 font-medium text-gray-700'>已选择</div>
                    <div>{selectedActionIds.length} 条 action draft</div>
                  </div>
                </div>
                <div className='mt-4 flex flex-wrap gap-3'>
                  <button
                    type='button'
                    onClick={onCreateCampaign}
                    disabled={selectedActionIds.length === 0}
                    className='rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50'
                  >
                    创建专项
                  </button>
                  <button
                    type='button'
                    onClick={onMergeIntoCampaign}
                    disabled={selectedActionIds.length === 0 || !selectedCampaignId}
                    className='rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50'
                  >
                    合并到已有专项
                  </button>
                  <button
                    type='button'
                    onClick={() => onBatchActionStatus('IN_GOVERNANCE')}
                    disabled={selectedActionIds.length === 0}
                    className='rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50'
                  >
                    批量标记 IN_GOVERNANCE
                  </button>
                  <button
                    type='button'
                    onClick={() => onBatchActionStatus('ARCHIVED')}
                    disabled={selectedActionIds.length === 0}
                    className='rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50'
                  >
                    批量标记 ARCHIVED
                  </button>
                </div>
              </div>

              <div className='rounded-lg bg-white p-6 shadow'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <h2 className='text-lg font-semibold text-gray-900'>Action Draft 批量处理列表</h2>
                  <button
                    type='button'
                    onClick={onToggleAll}
                    className='rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50'
                  >
                    {data.actionDrafts.length > 0 && selectedActionIds.length === data.actionDrafts.length ? '取消全选' : '全选当前列表'}
                  </button>
                </div>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>选择</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>来源</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>Action</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>优先级</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>治理状态</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>专项</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>风险</th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700'>目标文件</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {renderActionRows(data.actionDrafts, selectedActionIds, onToggleAction)}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}