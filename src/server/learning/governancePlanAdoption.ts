import type { GovernanceCampaignRecord } from './governanceCampaign'
import {
  type GovernanceActorAnalyticsIdentity,
  toGovernanceActorAnalyticsIdentity,
} from '@/lib/actorIdentity'
import type {
  GovernanceCampaignEffectiveness,
  GovernanceEffectivenessLabel,
} from './governanceEffectiveness'
import type {
  GovernancePlanDecisionType,
  GovernancePlanPriorityLevel,
  GovernancePlanRecord,
  GovernancePlanStatus,
  GovernancePlanType,
} from './governancePlanning'

export type GovernancePlanAdoptionStatus =
  | 'PENDING'
  | 'ADOPTED'
  | 'LINKED'
  | 'ENTERED_EXECUTION'
  | 'DISMISSED'

export type GovernanceRecommendationQualityLabel =
  | 'HIGH_VALUE'
  | 'PLAUSIBLE'
  | 'MISSED_BUT_RECURRING'
  | 'LOW_VALUE'
  | 'UNCLEAR'

export type GovernancePlanAdoptionEffect = {
  planId: string
  planTitle: string
  planType: GovernancePlanType
  governanceTheme: string
  actor: GovernanceActorAnalyticsIdentity
  priorityLevel: GovernancePlanPriorityLevel
  whyNow: string
  decisionStatus: GovernancePlanStatus
  adoptionStatus: GovernancePlanAdoptionStatus
  linkedCampaignId?: string
  linkedBatchId?: string
  enteredExecution: boolean
  beforeCount: number
  afterCount: number
  changeRate: number
  recurrenceCount: number
  highRiskBeforeShare: number
  highRiskAfterShare: number
  effectivenessLabel: GovernanceEffectivenessLabel
  recommendationQualityLabel: GovernanceRecommendationQualityLabel
  decisionType?: GovernancePlanDecisionType
  decisionAt?: string
  note: string
}

export type GovernanceThemeRecommendationDisposition = 'KEEP_RECOMMENDING' | 'WATCH' | 'CAUTION'

export type GovernanceThemeQualityLabel = GovernanceThemeRecommendationDisposition

export type GovernanceThemeRecommendationSummary = {
  governanceTheme: string
  planCount: number
  acceptedCount: number
  acceptedRate: number
  enteredExecutionCount: number
  improvingCount: number
  recurringCount: number
  dismissedRecurringCount: number
  highValueCount: number
  plausibleCount: number
  lowValueCount: number
  unclearCount: number
  themeQualityLabel: GovernanceThemeQualityLabel
  recommendationQualitySummary: string
  themePriorityHint: string
  highestPriorityLevel: GovernancePlanPriorityLevel
  shouldKeepRecommend: boolean
  recommendationDisposition: GovernanceThemeRecommendationDisposition
}

export type GovernancePlanAdoptionOverview = {
  totalPlanCount: number
  adoptedPlanCount: number
  dismissedPlanCount: number
  enteredExecutionCount: number
  highValueCount: number
  missedButRecurringCount: number
}

export type GovernanceHighQualityPlanType = {
  planType: GovernancePlanType
  totalCount: number
  highValueCount: number
  plausibleCount: number
  lowValueCount: number
  recurringDismissedCount: number
  keepRecommend: boolean
  note: string
}

export type GovernancePlanAdoptionData = {
  overview: GovernancePlanAdoptionOverview
  items: GovernancePlanAdoptionEffect[]
  dismissedButRecurringPlans: GovernancePlanAdoptionEffect[]
  highQualityPlanTypes: GovernanceHighQualityPlanType[]
  themeSummaries: GovernanceThemeRecommendationSummary[]
  continueRecommendThemes: GovernanceThemeRecommendationSummary[]
  cautiousThemes: GovernanceThemeRecommendationSummary[]
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function acceptedRate(acceptedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0
  return roundToTwo((acceptedCount / totalCount) * 100)
}

function priorityWeight(level: GovernancePlanPriorityLevel): number {
  switch (level) {
    case 'HIGH':
      return 3
    case 'MEDIUM':
      return 2
    case 'LOW':
    default:
      return 1
  }
}

function isAcceptedPlan(status: GovernancePlanStatus): boolean {
  return status !== 'PROPOSED' && status !== 'DISMISSED'
}

function hasEnteredGovernanceFlow(campaign?: GovernanceCampaignRecord): boolean {
  if (!campaign) return false
  return campaign.status === 'IN_GOVERNANCE'
    || campaign.status === 'COMPLETED'
    || campaign.status === 'ARCHIVED'
}

function getLinkedCampaignId(record: GovernancePlanRecord): string | undefined {
  return record.mergedCampaignId || record.plan.basedOnCampaignIds[0]
}

function getAdoptionStatus(params: {
  decisionStatus: GovernancePlanStatus
  enteredExecution: boolean
  linkedCampaignId?: string
}): GovernancePlanAdoptionStatus {
  if (params.decisionStatus === 'DISMISSED') {
    return 'DISMISSED'
  }

  if (params.enteredExecution) {
    return 'ENTERED_EXECUTION'
  }

  if (params.decisionStatus === 'MERGED' || params.decisionStatus === 'BATCH_CREATED' || params.linkedCampaignId) {
    return 'LINKED'
  }

  if (params.decisionStatus === 'ACCEPTED') {
    return 'ADOPTED'
  }

  return 'PENDING'
}

function getFallbackEffectivenessLabel(params: {
  decisionStatus: GovernancePlanStatus
  candidateRecurrenceCount: number
}): GovernanceEffectivenessLabel {
  if (params.decisionStatus === 'DISMISSED' && params.candidateRecurrenceCount > 0) {
    return 'RECURRING'
  }

  return 'LOW_SIGNAL'
}

function getRecommendationQualityLabel(params: {
  decisionStatus: GovernancePlanStatus
  enteredExecution: boolean
  effectivenessLabel: GovernanceEffectivenessLabel
  recurrenceCount: number
}): GovernanceRecommendationQualityLabel {
  if (params.decisionStatus === 'DISMISSED' && params.recurrenceCount > 0) {
    return 'MISSED_BUT_RECURRING'
  }

  if (params.enteredExecution && params.effectivenessLabel === 'IMPROVING') {
    return 'HIGH_VALUE'
  }

  if (params.enteredExecution && (params.effectivenessLabel === 'RECURRING' || params.effectivenessLabel === 'NEEDS_REVIEW')) {
    return 'LOW_VALUE'
  }

  if (
    params.effectivenessLabel === 'STABLE'
    || (params.effectivenessLabel === 'LOW_SIGNAL' && params.decisionStatus !== 'PROPOSED' && params.decisionStatus !== 'DISMISSED')
  ) {
    return 'PLAUSIBLE'
  }

  return 'UNCLEAR'
}

function buildPlanAdoptionNote(item: GovernancePlanAdoptionEffect): string {
  if (item.recommendationQualityLabel === 'MISSED_BUT_RECURRING') {
    return `该计划已被忽略，但当前仍观察到 ${item.recurrenceCount} 次复发，说明类似建议值得重新纳入推荐。`
  }

  if (item.recommendationQualityLabel === 'HIGH_VALUE') {
    return `该计划已进入执行，相关问题从 ${item.beforeCount} 降到 ${item.afterCount}，当前属于高价值推荐。`
  }

  if (item.recommendationQualityLabel === 'LOW_VALUE') {
    return `该计划虽已进入执行，但当前效果标签为 ${item.effectivenessLabel}，建议复盘推荐范围和执行落地方式。`
  }

  if (item.recommendationQualityLabel === 'PLAUSIBLE') {
    return item.enteredExecution
      ? `该计划已经进入执行，当前信号为 ${item.effectivenessLabel}，可继续观察后续收益。`
      : '该计划已被采纳或挂到专项，但暂时还没有足够执行信号，先保留为可继续观察的推荐。'
  }

  return '当前还没有足够证据判断该计划是否值得继续推荐。'
}

function buildTypeNote(item: GovernanceHighQualityPlanType): string {
  if (item.highValueCount > 0) {
    return `该类型已出现 ${item.highValueCount} 条高价值推荐，可继续保留为优先推荐类型。`
  }

  if (item.recurringDismissedCount > 0) {
    return `该类型存在 ${item.recurringDismissedCount} 条“已忽略但复发”的计划，建议重新审视推荐策略。`
  }

  if (item.lowValueCount > item.plausibleCount) {
    return '该类型当前低价值信号更多，建议收紧推荐口径。'
  }

  return '该类型目前以可继续观察的推荐为主。'
}

function buildThemeQualitySummary(params: {
  acceptedCount: number
  planCount: number
  improvingCount: number
  enteredExecutionCount: number
  recurringCount: number
  dismissedRecurringCount: number
  highValueCount: number
  lowValueCount: number
}): string {
  const accepted = `${params.acceptedCount}/${params.planCount} 已采纳`
  const execution = `${params.enteredExecutionCount} 条已进入执行`
  const improving = `${params.improvingCount} 条带来改善`
  const recurring = params.recurringCount > 0 ? `累计复发 ${params.recurringCount} 次` : '暂无明显复发'

  if (params.dismissedRecurringCount > 0) {
    return `${accepted}，${execution}，${improving}，且有 ${params.dismissedRecurringCount} 条被忽略后仍复发；${recurring}。`
  }

  if (params.lowValueCount > params.highValueCount && params.improvingCount === 0) {
    return `${accepted}，${execution}，当前改善证据弱；${recurring}。`
  }

  return `${accepted}，${execution}，${improving}，${recurring}。`
}

function buildThemePriorityHint(params: {
  acceptedRate: number
  improvingCount: number
  dismissedRecurringCount: number
  highValueCount: number
  lowValueCount: number
  recurringCount: number
}): { shouldKeepRecommend: boolean; recommendationDisposition: GovernanceThemeRecommendationDisposition; themePriorityHint: string } {
  if (params.dismissedRecurringCount > 0) {
    return {
      shouldKeepRecommend: true,
      recommendationDisposition: 'KEEP_RECOMMENDING',
      themePriorityHint: '该主题曾被忽略，但后续仍反复出现，建议继续推荐并提高审批关注度。',
    }
  }

  if (params.highValueCount > 0 || params.improvingCount > 0) {
    return {
      shouldKeepRecommend: true,
      recommendationDisposition: 'KEEP_RECOMMENDING',
      themePriorityHint: '该主题已有改善收益，值得反复推荐，并优先进入下一轮治理讨论。',
    }
  }

  if (params.lowValueCount > 0 && params.acceptedRate >= 50) {
    return {
      shouldKeepRecommend: false,
      recommendationDisposition: 'CAUTION',
      themePriorityHint: '该主题虽常被采纳，但近期推荐质量偏低，建议谨慎继续推荐并先观察。',
    }
  }

  if (params.recurringCount > 0 || params.acceptedRate >= 50) {
    return {
      shouldKeepRecommend: true,
      recommendationDisposition: 'WATCH',
      themePriorityHint: '该主题仍值得保留在推荐池中，但应结合后续执行结果继续观察优先级。',
    }
  }

  return {
    shouldKeepRecommend: false,
    recommendationDisposition: 'CAUTION',
    themePriorityHint: '该主题当前推荐质量偏弱，建议继续观察或降低优先级。',
  }
}

function buildThemeSummaries(items: GovernancePlanAdoptionEffect[]): GovernanceThemeRecommendationSummary[] {
  const grouped = new Map<string, GovernancePlanAdoptionEffect[]>()

  items.forEach((item) => {
    const current = grouped.get(item.governanceTheme) || []
    current.push(item)
    grouped.set(item.governanceTheme, current)
  })

  return Array.from(grouped.entries())
    .map(([governanceTheme, groupedItems]) => {
      const planCount = groupedItems.length
      const acceptedCount = groupedItems.filter((item) => isAcceptedPlan(item.decisionStatus)).length
      const enteredExecutionCount = groupedItems.filter((item) => item.enteredExecution).length
      const improvingCount = groupedItems.filter((item) => item.effectivenessLabel === 'IMPROVING').length
      const recurringCount = groupedItems.reduce((sum, item) => sum + item.recurrenceCount, 0)
      const dismissedRecurringCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'MISSED_BUT_RECURRING').length
      const highValueCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'HIGH_VALUE').length
      const plausibleCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'PLAUSIBLE').length
      const lowValueCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'LOW_VALUE').length
      const unclearCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'UNCLEAR').length
      const highestPriorityLevel = [...groupedItems]
        .sort((a, b) => priorityWeight(b.priorityLevel) - priorityWeight(a.priorityLevel))[0]?.priorityLevel || 'LOW'
      const rate = acceptedRate(acceptedCount, planCount)
      const priorityDecision = buildThemePriorityHint({
        acceptedRate: rate,
        improvingCount,
        dismissedRecurringCount,
        highValueCount,
        lowValueCount,
        recurringCount,
      })

      return {
        governanceTheme,
        planCount,
        acceptedCount,
        acceptedRate: rate,
        enteredExecutionCount,
        improvingCount,
        recurringCount,
        dismissedRecurringCount,
        highValueCount,
        plausibleCount,
        lowValueCount,
        unclearCount,
        themeQualityLabel: priorityDecision.recommendationDisposition,
        recommendationQualitySummary: buildThemeQualitySummary({
          acceptedCount,
          planCount,
          improvingCount,
          enteredExecutionCount,
          recurringCount,
          dismissedRecurringCount,
          highValueCount,
          lowValueCount,
        }),
        themePriorityHint: priorityDecision.themePriorityHint,
        highestPriorityLevel,
        shouldKeepRecommend: priorityDecision.shouldKeepRecommend,
        recommendationDisposition: priorityDecision.recommendationDisposition,
      }
    })
    .sort((a, b) => {
      const dispositionWeight: Record<GovernanceThemeRecommendationDisposition, number> = {
        KEEP_RECOMMENDING: 3,
        WATCH: 2,
        CAUTION: 1,
      }

      if (dispositionWeight[b.recommendationDisposition] !== dispositionWeight[a.recommendationDisposition]) {
        return dispositionWeight[b.recommendationDisposition] - dispositionWeight[a.recommendationDisposition]
      }

      if (b.improvingCount !== a.improvingCount) {
        return b.improvingCount - a.improvingCount
      }

      if (b.recurringCount !== a.recurringCount) {
        return b.recurringCount - a.recurringCount
      }

      return b.acceptedRate - a.acceptedRate
    })
}

function buildHighQualityPlanTypes(items: GovernancePlanAdoptionEffect[]): GovernanceHighQualityPlanType[] {
  const grouped = new Map<GovernancePlanType, GovernancePlanAdoptionEffect[]>()

  items.forEach((item) => {
    const current = grouped.get(item.planType) || []
    current.push(item)
    grouped.set(item.planType, current)
  })

  return Array.from(grouped.entries())
    .map(([planType, groupedItems]) => {
      const highValueCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'HIGH_VALUE').length
      const plausibleCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'PLAUSIBLE').length
      const lowValueCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'LOW_VALUE').length
      const recurringDismissedCount = groupedItems.filter((item) => item.recommendationQualityLabel === 'MISSED_BUT_RECURRING').length

      const summary: GovernanceHighQualityPlanType = {
        planType,
        totalCount: groupedItems.length,
        highValueCount,
        plausibleCount,
        lowValueCount,
        recurringDismissedCount,
        keepRecommend: highValueCount > 0 || plausibleCount >= lowValueCount,
        note: '',
      }

      return {
        ...summary,
        note: buildTypeNote(summary),
      }
    })
    .sort((a, b) => {
      if (b.highValueCount !== a.highValueCount) {
        return b.highValueCount - a.highValueCount
      }

      if (b.recurringDismissedCount !== a.recurringDismissedCount) {
        return b.recurringDismissedCount - a.recurringDismissedCount
      }

      return b.totalCount - a.totalCount
    })
}

export function buildGovernancePlanAdoptionData(params: {
  planRecords: GovernancePlanRecord[]
  campaigns: GovernanceCampaignRecord[]
  effectivenessCampaigns: GovernanceCampaignEffectiveness[]
}): GovernancePlanAdoptionData {
  const campaignMap = new Map(params.campaigns.map((campaign) => [campaign.id, campaign]))
  const effectMap = new Map(params.effectivenessCampaigns.map((campaign) => [campaign.campaignId, campaign]))

  const items = params.planRecords
    .map((record) => {
      const linkedCampaignId = getLinkedCampaignId(record)
      const linkedCampaign = linkedCampaignId ? campaignMap.get(linkedCampaignId) : undefined
      const linkedEffect = linkedCampaignId ? effectMap.get(linkedCampaignId) : undefined
      const enteredExecution = Boolean(record.createdBatchId) || hasEnteredGovernanceFlow(linkedCampaign)
      const candidateRecurrenceCount = !linkedEffect && record.plan.basedOnCampaignIds.length === 0 && record.status === 'DISMISSED'
        ? 0
        : 0
      const effectivenessLabel = linkedEffect?.effectivenessLabel || getFallbackEffectivenessLabel({
        decisionStatus: record.status,
        candidateRecurrenceCount,
      })
      const recurrenceCount = linkedEffect?.recurrenceCount || candidateRecurrenceCount
      const item: GovernancePlanAdoptionEffect = {
        planId: record.plan.id,
        planTitle: record.plan.planTitle,
        planType: record.plan.planType,
        governanceTheme: record.plan.governanceTheme,
        actor: toGovernanceActorAnalyticsIdentity(record.decisionActor, record.decisionBy),
        priorityLevel: record.plan.priorityLevel,
        whyNow: record.plan.whyNow,
        decisionStatus: record.status,
        adoptionStatus: getAdoptionStatus({
          decisionStatus: record.status,
          enteredExecution,
          linkedCampaignId,
        }),
        linkedCampaignId,
        linkedBatchId: record.createdBatchId,
        enteredExecution,
        beforeCount: linkedEffect?.beforeCount || 0,
        afterCount: linkedEffect?.afterCount || 0,
        changeRate: linkedEffect?.changeRate || 0,
        recurrenceCount,
        highRiskBeforeShare: linkedEffect?.highRiskBeforeShare || 0,
        highRiskAfterShare: linkedEffect?.highRiskAfterShare || 0,
        effectivenessLabel,
        recommendationQualityLabel: 'UNCLEAR',
        decisionType: record.decisionType,
        decisionAt: record.decisionAt,
        note: '',
      }

      const recommendationQualityLabel = getRecommendationQualityLabel({
        decisionStatus: item.decisionStatus,
        enteredExecution: item.enteredExecution,
        effectivenessLabel: item.effectivenessLabel,
        recurrenceCount: item.recurrenceCount,
      })

      return {
        ...item,
        recommendationQualityLabel,
        note: buildPlanAdoptionNote({
          ...item,
          recommendationQualityLabel,
        }),
      }
    })
    .sort((a, b) => {
      const qualityWeight: Record<GovernanceRecommendationQualityLabel, number> = {
        MISSED_BUT_RECURRING: 5,
        LOW_VALUE: 4,
        HIGH_VALUE: 3,
        PLAUSIBLE: 2,
        UNCLEAR: 1,
      }

      if (qualityWeight[b.recommendationQualityLabel] !== qualityWeight[a.recommendationQualityLabel]) {
        return qualityWeight[b.recommendationQualityLabel] - qualityWeight[a.recommendationQualityLabel]
      }

      return (b.decisionAt || '').localeCompare(a.decisionAt || '')
    })

  const dismissedButRecurringPlans = items.filter((item) => item.recommendationQualityLabel === 'MISSED_BUT_RECURRING')
  const themeSummaries = buildThemeSummaries(items)

  return {
    overview: {
      totalPlanCount: items.length,
      adoptedPlanCount: items.filter((item) => item.decisionStatus !== 'DISMISSED' && item.decisionStatus !== 'PROPOSED').length,
      dismissedPlanCount: items.filter((item) => item.decisionStatus === 'DISMISSED').length,
      enteredExecutionCount: items.filter((item) => item.enteredExecution).length,
      highValueCount: items.filter((item) => item.recommendationQualityLabel === 'HIGH_VALUE').length,
      missedButRecurringCount: dismissedButRecurringPlans.length,
    },
    items,
    dismissedButRecurringPlans,
    highQualityPlanTypes: buildHighQualityPlanTypes(items),
    themeSummaries,
    continueRecommendThemes: themeSummaries.filter((item) => item.shouldKeepRecommend).slice(0, 5),
    cautiousThemes: themeSummaries
      .filter((item) => item.recommendationDisposition === 'CAUTION' || item.lowValueCount > 0)
      .sort((a, b) => {
        if (b.lowValueCount !== a.lowValueCount) {
          return b.lowValueCount - a.lowValueCount
        }

        return b.recurringCount - a.recurringCount
      })
      .slice(0, 5),
  }
}