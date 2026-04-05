import type { GovernanceBatchNote } from './governanceCampaign'
import {
  buildGovernanceThemeActorRecommendations,
  recommendActorsForGovernancePlan,
  type GovernancePlanActorRecommendationInput,
  type GovernancePlanActorRecommendations,
  type GovernanceThemeActorRecommendation,
} from './governanceActorRecommendation'
import type { GovernanceActorAnalyticsIdentity } from '@/lib/actorIdentity'
import { buildGovernanceDashboardData, type GovernanceCampaignDetail, type GovernanceDashboardData } from './governanceDashboard'
import {
  buildGovernanceEffectivenessData,
  type GovernanceCampaignEffectiveness,
  type GovernanceEffectivenessLabel,
} from './governanceEffectiveness'
import type {
  GovernancePlanAdoptionEffect,
  GovernancePlanAdoptionOverview,
  GovernancePlanAdoptionStatus,
  GovernanceRecommendationQualityLabel,
  GovernanceThemeQualityLabel,
  GovernanceThemeRecommendationSummary,
} from './governancePlanAdoption'
import {
  buildGovernancePlanDraftGroups,
  buildGovernanceTrackedPlanGroups,
  type GovernancePlanView,
  type GovernanceTrackedPlanGroups,
} from './governancePlanning'
import type { ReflectionForImprovement } from './improvementView'
import type { ImprovementActionRiskLevel } from './improvementSuggestion'
import { listGovernancePlanRecords } from './governanceStore'

export type GovernanceWorkbenchPlanView = GovernancePlanView & {
  adoptionStatus?: GovernancePlanAdoptionStatus
  enteredExecution?: boolean
  effectivenessLabel?: GovernanceEffectivenessLabel
  recommendationQualityLabel?: GovernanceRecommendationQualityLabel
  themeQualityLabel?: GovernanceThemeQualityLabel
  recurrenceCount?: number
  changeRate?: number
  themeSummary?: GovernanceThemeRecommendationSummary
  themePriorityHint?: string
  themeAcceptedRate?: number
  themeRecurringCount?: number
  themePlanCount?: number
  themePriorityRank?: number
  shouldKeepRecommend?: boolean
  riskLevel?: ImprovementActionRiskLevel
  recommendationInput?: GovernancePlanActorRecommendationInput
  actorRecommendations?: GovernancePlanActorRecommendations
}

export type GovernanceWorkbenchTrackedPlanGroups = {
  trackedPlans: GovernanceWorkbenchPlanView[]
  recommendedPlans: GovernanceWorkbenchPlanView[]
  continueCandidates: GovernanceWorkbenchPlanView[]
  newCampaignCandidates: GovernanceWorkbenchPlanView[]
  reviewCandidates: GovernanceWorkbenchPlanView[]
}

export type GovernanceWorkbenchCampaignDetail = GovernanceCampaignDetail & {
  effectivenessLabel?: GovernanceEffectivenessLabel
  recurrenceWarning?: string
  beforeCount?: number
  afterCount?: number
  changeRate?: number
  recurrenceCount?: number
  lastRecurrenceAt?: string
  lastBatchNote?: GovernanceBatchNote
  relatedPlans: GovernanceWorkbenchPlanView[]
}

export type GovernanceWorkbenchData = Omit<GovernanceDashboardData, 'campaigns' | 'summary'> & {
  summary: GovernanceDashboardData['summary'] & {
    recommendedPlanCount: number
    trackedPlanCount: number
    continuePlanCount: number
    reviewPlanCount: number
    improvingCampaignCount: number
  }
  campaigns: GovernanceWorkbenchCampaignDetail[]
  planDrafts: GovernanceWorkbenchTrackedPlanGroups
  recommendationQuality: {
    overview: GovernancePlanAdoptionOverview
    themeSummaries: GovernanceThemeRecommendationSummary[]
    continueRecommendThemes: GovernanceThemeRecommendationSummary[]
    cautiousThemes: GovernanceThemeRecommendationSummary[]
  }
  actorRecommendations?: {
    themeRecommendations: GovernanceThemeActorRecommendation[]
    hasRealActorData: boolean
    availableActors: GovernanceActorAnalyticsIdentity[]
  }
}

function deriveRiskLevel(values: ImprovementActionRiskLevel[]): ImprovementActionRiskLevel | undefined {
  if (values.includes('HIGH')) return 'HIGH'
  if (values.includes('MEDIUM')) return 'MEDIUM'
  if (values.includes('LOW')) return 'LOW'
  return undefined
}

function buildPlanRecommendationInput(params: {
  plan: GovernancePlanView
  campaigns: GovernanceCampaignDetail[]
  candidateCampaigns: GovernanceDashboardData['candidateCampaigns']
  actionDrafts: GovernanceDashboardData['actionDrafts']
}): GovernancePlanActorRecommendationInput {
  const linkedCampaigns = params.plan.basedOnCampaignIds
    .map((campaignId) => params.campaigns.find((item) => item.id === campaignId))
    .filter((item): item is GovernanceCampaignDetail => Boolean(item))
  const candidate = params.plan.sourceCandidateId
    ? params.candidateCampaigns.find((item) => item.candidateId === params.plan.sourceCandidateId)
    : undefined
  const candidateActions = candidate
    ? params.actionDrafts.filter((item) => candidate.relatedActionDraftIds.includes(item.id))
    : []
  const linkedActions = linkedCampaigns.flatMap((campaign) => campaign.relatedActions)
  const relatedActions = [...candidateActions, ...linkedActions]

  return {
    planType: params.plan.planType,
    governanceTheme: params.plan.governanceTheme,
    targetArea: candidate?.targetArea || linkedCampaigns[0]?.targetArea || params.plan.targetArea,
    changeType: candidate?.changeType || linkedCampaigns[0]?.changeType,
    targetFileHints: Array.from(new Set([
      ...params.plan.targetFileHints,
      ...(candidate?.targetFileHints || []),
      ...linkedCampaigns.flatMap((campaign) => campaign.targetFileHints),
    ])),
    riskLevel: deriveRiskLevel(relatedActions.map((item) => item.riskLevel)),
    whyNow: params.plan.whyNow,
  }
}

function priorityWeight(value: string): number {
  switch (value) {
    case 'HIGH':
      return 3
    case 'MEDIUM':
      return 2
    case 'LOW':
    default:
      return 1
  }
}

function statusWeight(value: string): number {
  switch (value) {
    case 'ACCEPTED':
      return 5
    case 'BATCH_CREATED':
      return 4
    case 'MERGED':
      return 3
    case 'PROPOSED':
      return 2
    case 'DISMISSED':
    default:
      return 1
  }
}

function getLastBatchNote(campaign: GovernanceCampaignDetail): GovernanceBatchNote | undefined {
  return [...campaign.batchNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function buildRecurrenceWarning(effect?: GovernanceCampaignEffectiveness): string | undefined {
  if (!effect) return undefined
  if (effect.recurrenceCount > 0) {
    return `完成后仍复发 ${effect.recurrenceCount} 次`
  }
  if (effect.effectivenessLabel === 'NEEDS_REVIEW' || effect.effectivenessLabel === 'RECURRING') {
    return '当前成效偏弱，建议复盘'
  }
  return undefined
}

function buildPlanPriorityRanks(items: GovernancePlanView[]): Map<string, number> {
  const rankMap = new Map<string, number>()
  const themeGroups = new Map<string, GovernancePlanView[]>()

  items.forEach((item) => {
    const current = themeGroups.get(item.governanceTheme) || []
    current.push(item)
    themeGroups.set(item.governanceTheme, current)
  })

  Array.from(themeGroups.values()).forEach((themeItems) => {
    const sorted = [...themeItems].sort((a, b) => {
      if (priorityWeight(b.priorityLevel) !== priorityWeight(a.priorityLevel)) {
        return priorityWeight(b.priorityLevel) - priorityWeight(a.priorityLevel)
      }

      if (statusWeight(b.status) !== statusWeight(a.status)) {
        return statusWeight(b.status) - statusWeight(a.status)
      }

      return a.planTitle.localeCompare(b.planTitle)
    })

    sorted.forEach((item, index) => {
      rankMap.set(item.id, index + 1)
    })
  })

  return rankMap
}

function enrichPlan(params: {
  plan: GovernancePlanView
  adoptionMap: Map<string, GovernancePlanAdoptionEffect>
  themeSummaryMap: Map<string, GovernanceThemeRecommendationSummary>
  themePriorityRanks: Map<string, number>
  campaigns: GovernanceCampaignDetail[]
  candidateCampaigns: GovernanceDashboardData['candidateCampaigns']
  actionDrafts: GovernanceDashboardData['actionDrafts']
  effectivenessData: ReturnType<typeof buildGovernanceEffectivenessData>
}): GovernanceWorkbenchPlanView {
  const adoption = params.adoptionMap.get(params.plan.id)
  const themeSummary = params.themeSummaryMap.get(params.plan.governanceTheme)
  const recommendationInput = buildPlanRecommendationInput({
    plan: params.plan,
    campaigns: params.campaigns,
    candidateCampaigns: params.candidateCampaigns,
    actionDrafts: params.actionDrafts,
  })
  const actorRecommendations = recommendActorsForGovernancePlan({
    input: recommendationInput,
    actorAnalysis: params.effectivenessData.actorAnalysis,
    adoptionData: params.effectivenessData.planAdoption,
    campaigns: params.effectivenessData.campaigns,
    now: new Date(params.effectivenessData.generatedAt),
  })

  return {
    ...params.plan,
    adoptionStatus: adoption?.adoptionStatus,
    enteredExecution: adoption?.enteredExecution,
    effectivenessLabel: adoption?.effectivenessLabel,
    recommendationQualityLabel: adoption?.recommendationQualityLabel,
    themeQualityLabel: themeSummary?.themeQualityLabel,
    recurrenceCount: adoption?.recurrenceCount,
    changeRate: adoption?.changeRate,
    themeSummary,
    themePriorityHint: themeSummary?.themePriorityHint,
    themeAcceptedRate: themeSummary?.acceptedRate,
    themeRecurringCount: themeSummary?.recurringCount,
    themePlanCount: themeSummary?.planCount,
    themePriorityRank: params.themePriorityRanks.get(params.plan.id),
    shouldKeepRecommend: themeSummary?.shouldKeepRecommend,
    riskLevel: recommendationInput.riskLevel,
    recommendationInput,
    actorRecommendations,
  }
}

function enrichPlanGroups(params: {
  planDrafts: GovernanceTrackedPlanGroups
  adoptionItems: GovernancePlanAdoptionEffect[]
  themeSummaries: GovernanceThemeRecommendationSummary[]
  campaigns: GovernanceCampaignDetail[]
  candidateCampaigns: GovernanceDashboardData['candidateCampaigns']
  actionDrafts: GovernanceDashboardData['actionDrafts']
  effectivenessData: ReturnType<typeof buildGovernanceEffectivenessData>
}): GovernanceWorkbenchTrackedPlanGroups {
  const adoptionMap = new Map(params.adoptionItems.map((item) => [item.planId, item]))
  const themeSummaryMap = new Map(params.themeSummaries.map((item) => [item.governanceTheme, item]))
  const themePriorityRanks = buildPlanPriorityRanks(params.planDrafts.trackedPlans)

  const enrich = (items: GovernancePlanView[]) => items.map((plan) => enrichPlan({
    plan,
    adoptionMap,
    themeSummaryMap,
    themePriorityRanks,
    campaigns: params.campaigns,
    candidateCampaigns: params.candidateCampaigns,
    actionDrafts: params.actionDrafts,
    effectivenessData: params.effectivenessData,
  }))

  return {
    trackedPlans: enrich(params.planDrafts.trackedPlans),
    recommendedPlans: enrich(params.planDrafts.recommendedPlans),
    continueCandidates: enrich(params.planDrafts.continueCandidates),
    newCampaignCandidates: enrich(params.planDrafts.newCampaignCandidates),
    reviewCandidates: enrich(params.planDrafts.reviewCandidates),
  }
}

function enrichCampaigns(params: {
  campaigns: GovernanceCampaignDetail[]
  effectivenessCampaigns: GovernanceCampaignEffectiveness[]
  trackedPlans: GovernanceWorkbenchPlanView[]
}): GovernanceWorkbenchCampaignDetail[] {
  const effectMap = new Map(params.effectivenessCampaigns.map((item) => [item.campaignId, item]))

  return params.campaigns.map((campaign) => {
    const effect = effectMap.get(campaign.id)
    const relatedPlans = params.trackedPlans.filter((plan) => (
      plan.basedOnCampaignIds.includes(campaign.id)
      || plan.mergedCampaignId === campaign.id
    ))

    return {
      ...campaign,
      effectivenessLabel: effect?.effectivenessLabel,
      recurrenceWarning: buildRecurrenceWarning(effect),
      beforeCount: effect?.beforeCount,
      afterCount: effect?.afterCount,
      changeRate: effect?.changeRate,
      recurrenceCount: effect?.recurrenceCount,
      lastRecurrenceAt: effect?.lastRecurrenceAt,
      lastBatchNote: getLastBatchNote(campaign),
      relatedPlans,
    }
  })
}

export function buildGovernanceWorkbenchData(params: {
  approvedReflections: ReflectionForImprovement[]
  now?: Date
}): GovernanceWorkbenchData {
  const dashboardData = buildGovernanceDashboardData({
    approvedReflections: params.approvedReflections,
    now: params.now,
  })
  const effectivenessData = buildGovernanceEffectivenessData({
    approvedReflections: params.approvedReflections,
    now: params.now,
  })
  const draftGroups = buildGovernancePlanDraftGroups({
    candidateCampaigns: dashboardData.candidateCampaigns,
    effectivenessData,
  })
  const planDrafts = buildGovernanceTrackedPlanGroups({
    planDrafts: draftGroups,
    planRecords: listGovernancePlanRecords(),
  })
  const themeRecommendations = buildGovernanceThemeActorRecommendations({
    governanceThemes: effectivenessData.planAdoption.themeSummaries.map((item) => item.governanceTheme),
    actorAnalysis: effectivenessData.actorAnalysis,
    adoptionData: effectivenessData.planAdoption,
    campaigns: effectivenessData.campaigns,
    now: new Date(effectivenessData.generatedAt),
  })
  const enrichedPlanDrafts = enrichPlanGroups({
    planDrafts,
    adoptionItems: effectivenessData.planAdoption.items,
    themeSummaries: effectivenessData.planAdoption.themeSummaries,
    campaigns: dashboardData.campaigns,
    candidateCampaigns: dashboardData.candidateCampaigns,
    actionDrafts: dashboardData.actionDrafts,
    effectivenessData,
  })
  const campaigns = enrichCampaigns({
    campaigns: dashboardData.campaigns,
    effectivenessCampaigns: effectivenessData.campaigns,
    trackedPlans: enrichedPlanDrafts.trackedPlans,
  })

  return {
    generatedAt: dashboardData.generatedAt,
    summary: {
      ...dashboardData.summary,
      recommendedPlanCount: planDrafts.recommendedPlans.length,
      trackedPlanCount: planDrafts.trackedPlans.length,
      continuePlanCount: planDrafts.continueCandidates.length,
      reviewPlanCount: planDrafts.reviewCandidates.length,
      improvingCampaignCount: effectivenessData.summary.improvingCampaignCount,
    },
    actionDrafts: dashboardData.actionDrafts,
    candidateCampaigns: dashboardData.candidateCampaigns,
    campaigns,
    planDrafts: enrichedPlanDrafts,
    recommendationQuality: {
      overview: effectivenessData.planAdoption.overview,
      themeSummaries: effectivenessData.planAdoption.themeSummaries,
      continueRecommendThemes: effectivenessData.planAdoption.continueRecommendThemes,
      cautiousThemes: effectivenessData.planAdoption.cautiousThemes,
    },
    actorRecommendations: {
      themeRecommendations,
      hasRealActorData: effectivenessData.actorAnalysis.emptyState.hasRealActorData,
      availableActors: effectivenessData.actorAnalysis.realActors.map((item) => item.actor),
    },
  }
}