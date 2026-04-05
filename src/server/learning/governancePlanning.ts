import type { GovernanceBatchNote, GovernanceCampaignCandidate } from './governanceCampaign'
import type { GovernanceCampaignEffectiveness, GovernanceEffectivenessData } from './governanceEffectiveness'
import type { GovernanceActor } from '@/lib/actorIdentity'
import type { GovernanceAssignmentRecord } from './governanceAssignment'

export type GovernancePlanType = 'NEW_CAMPAIGN' | 'CONTINUE_CAMPAIGN' | 'REVIEW_CAMPAIGN'
export type GovernancePlanPriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export type GovernancePlanSuggestedBatchNote = Pick<GovernanceBatchNote, 'batchTitle' | 'batchNote' | 'changedWhat' | 'expectedImpact'>

export type GovernancePlanDraft = {
  id: string
  planTitle: string
  planType: GovernancePlanType
  sourceCandidateId?: string
  whyNow: string
  basedOnCampaignIds: string[]
  governanceTheme: string
  targetArea: string
  targetFileHints: string[]
  keySignals: string[]
  recommendedScope: string
  suggestedBatchNotes: GovernancePlanSuggestedBatchNote[]
  expectedOutcome: string
  watchMetrics: string[]
  priorityLevel: GovernancePlanPriorityLevel
}

export type GovernancePlanDraftGroups = {
  recommendedPlans: GovernancePlanDraft[]
  continueCandidates: GovernancePlanDraft[]
  newCampaignCandidates: GovernancePlanDraft[]
  reviewCandidates: GovernancePlanDraft[]
}

export type GovernancePlanStatus = 'PROPOSED' | 'ACCEPTED' | 'DISMISSED' | 'MERGED' | 'BATCH_CREATED'
export type GovernancePlanDecisionType = 'ACCEPT' | 'DISMISS' | 'MERGE' | 'CREATE_BATCH'

export type GovernancePlanDecision = {
  id: string
  planId: string
  decisionType: GovernancePlanDecisionType
  decisionBy: string
  decisionActor?: GovernanceActor
  decisionAt: string
  decisionNote?: string
  mergedCampaignId?: string
  createdBatchId?: string
}

export type GovernancePlanRecord = {
  plan: GovernancePlanDraft
  status: GovernancePlanStatus
  decisionHistory: GovernancePlanDecision[]
  assignment?: GovernanceAssignmentRecord
  decisionType?: GovernancePlanDecisionType
  decisionBy?: string
  decisionActor?: GovernanceActor
  decisionAt?: string
  decisionNote?: string
  mergedCampaignId?: string
  createdBatchId?: string
}

export type GovernancePlanView = GovernancePlanDraft & {
  status: GovernancePlanStatus
  decisionHistory: GovernancePlanDecision[]
  assignment?: GovernanceAssignmentRecord
  decisionType?: GovernancePlanDecisionType
  decisionBy?: string
  decisionActor?: GovernanceActor
  decisionAt?: string
  decisionNote?: string
  mergedCampaignId?: string
  createdBatchId?: string
}

export type GovernanceTrackedPlanGroups = {
  trackedPlans: GovernancePlanView[]
  recommendedPlans: GovernancePlanView[]
  continueCandidates: GovernancePlanView[]
  newCampaignCandidates: GovernancePlanView[]
  reviewCandidates: GovernancePlanView[]
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]))
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

function sortPlans(items: GovernancePlanDraft[]): GovernancePlanDraft[] {
  return [...items].sort((a, b) => {
    if (priorityWeight(b.priorityLevel) !== priorityWeight(a.priorityLevel)) {
      return priorityWeight(b.priorityLevel) - priorityWeight(a.priorityLevel)
    }

    if (b.basedOnCampaignIds.length !== a.basedOnCampaignIds.length) {
      return b.basedOnCampaignIds.length - a.basedOnCampaignIds.length
    }

    return a.planTitle.localeCompare(b.planTitle)
  })
}

function sortPlanViews(items: GovernancePlanView[]): GovernancePlanView[] {
  return [...items].sort((a, b) => {
    if (priorityWeight(b.priorityLevel) !== priorityWeight(a.priorityLevel)) {
      return priorityWeight(b.priorityLevel) - priorityWeight(a.priorityLevel)
    }

    const aDecisionAt = a.decisionAt || ''
    const bDecisionAt = b.decisionAt || ''
    if (bDecisionAt !== aDecisionAt) {
      return bDecisionAt.localeCompare(aDecisionAt)
    }

    if (b.basedOnCampaignIds.length !== a.basedOnCampaignIds.length) {
      return b.basedOnCampaignIds.length - a.basedOnCampaignIds.length
    }

    return a.planTitle.localeCompare(b.planTitle)
  })
}

function statusWeight(status: GovernancePlanStatus): number {
  switch (status) {
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

function toPlanView(plan: GovernancePlanDraft, record?: GovernancePlanRecord): GovernancePlanView {
  return {
    ...plan,
    status: record?.status || 'PROPOSED',
    decisionHistory: record?.decisionHistory || [],
    assignment: record?.assignment,
    decisionType: record?.decisionType,
    decisionBy: record?.decisionBy,
    decisionActor: record?.decisionActor,
    decisionAt: record?.decisionAt,
    decisionNote: record?.decisionNote,
    mergedCampaignId: record?.mergedCampaignId,
    createdBatchId: record?.createdBatchId,
  }
}

function uniquePlans(items: GovernancePlanView[]): GovernancePlanView[] {
  const byId = new Map<string, GovernancePlanView>()

  items.forEach((item) => {
    const current = byId.get(item.id)
    if (!current) {
      byId.set(item.id, item)
      return
    }

    if (statusWeight(item.status) > statusWeight(current.status)) {
      byId.set(item.id, item)
      return
    }

    if (item.decisionAt && (!current.decisionAt || item.decisionAt > current.decisionAt)) {
      byId.set(item.id, item)
    }
  })

  return Array.from(byId.values())
}

function findCurrentPlanById(groups: GovernancePlanDraftGroups, planId: string): GovernancePlanDraft | undefined {
  const all = [
    ...groups.recommendedPlans,
    ...groups.continueCandidates,
    ...groups.newCampaignCandidates,
    ...groups.reviewCandidates,
  ]

  return all.find((item) => item.id === planId)
}

function mergePlanGroup(items: GovernancePlanDraft[], records: Map<string, GovernancePlanRecord>): GovernancePlanView[] {
  return sortPlanViews(items.map((item) => toPlanView(item, records.get(item.id))))
}

export function createGovernancePlanRecord(params: {
  plan: GovernancePlanDraft
  status: GovernancePlanStatus
  decision: GovernancePlanDecision
  assignment?: GovernanceAssignmentRecord
}): GovernancePlanRecord {
  return {
    plan: params.plan,
    status: params.status,
    decisionHistory: [params.decision],
    assignment: params.assignment,
    decisionType: params.decision.decisionType,
    decisionBy: params.decision.decisionBy,
    decisionActor: params.decision.decisionActor,
    decisionAt: params.decision.decisionAt,
    decisionNote: params.decision.decisionNote,
    mergedCampaignId: params.decision.mergedCampaignId,
    createdBatchId: params.decision.createdBatchId,
  }
}

export function updateGovernancePlanRecord(params: {
  current: GovernancePlanRecord
  plan: GovernancePlanDraft
  status: GovernancePlanStatus
  decision: GovernancePlanDecision
}): GovernancePlanRecord {
  return {
    plan: params.plan,
    status: params.status,
    decisionHistory: [...params.current.decisionHistory, params.decision].sort((a, b) => a.decisionAt.localeCompare(b.decisionAt)),
    assignment: params.current.assignment,
    decisionType: params.decision.decisionType,
    decisionBy: params.decision.decisionBy,
    decisionActor: params.decision.decisionActor,
    decisionAt: params.decision.decisionAt,
    decisionNote: params.decision.decisionNote,
    mergedCampaignId: params.decision.mergedCampaignId ?? params.current.mergedCampaignId,
    createdBatchId: params.decision.createdBatchId ?? params.current.createdBatchId,
  }
}

export function buildGovernanceTrackedPlanGroups(params: {
  planDrafts: GovernancePlanDraftGroups
  planRecords: GovernancePlanRecord[]
}): GovernanceTrackedPlanGroups {
  const recordMap = new Map(params.planRecords.map((item) => [item.plan.id, item]))
  const trackedPlans = uniquePlans([
    ...params.planRecords.map((record) => toPlanView(findCurrentPlanById(params.planDrafts, record.plan.id) || record.plan, record)),
    ...params.planDrafts.recommendedPlans.map((plan) => toPlanView(plan, recordMap.get(plan.id))),
    ...params.planDrafts.continueCandidates.map((plan) => toPlanView(plan, recordMap.get(plan.id))),
    ...params.planDrafts.newCampaignCandidates.map((plan) => toPlanView(plan, recordMap.get(plan.id))),
    ...params.planDrafts.reviewCandidates.map((plan) => toPlanView(plan, recordMap.get(plan.id))),
  ])

  return {
    trackedPlans: sortPlanViews(trackedPlans),
    recommendedPlans: mergePlanGroup(params.planDrafts.recommendedPlans, recordMap),
    continueCandidates: mergePlanGroup(params.planDrafts.continueCandidates, recordMap),
    newCampaignCandidates: mergePlanGroup(params.planDrafts.newCampaignCandidates, recordMap),
    reviewCandidates: mergePlanGroup(params.planDrafts.reviewCandidates, recordMap),
  }
}

function buildPlanId(prefix: string, seed: string): string {
  return `${prefix}_${Buffer.from(seed).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`
}

function buildSuggestedBatchNotes(params: {
  campaignTitle: string
  governanceTheme: string
  expectedImpact: string
  changedWhat: string
}): GovernancePlanSuggestedBatchNote[] {
  return [{
    batchTitle: `${params.campaignTitle} - 下一轮批次`,
    batchNote: `围绕 ${params.governanceTheme} 继续做一轮小范围治理，记录本轮修改点与观察指标。`,
    changedWhat: params.changedWhat,
    expectedImpact: params.expectedImpact,
  }]
}

function buildContinuePlan(campaign: GovernanceCampaignEffectiveness): GovernancePlanDraft {
  const priorityLevel: GovernancePlanPriorityLevel = campaign.recurrenceCount >= 2 ? 'HIGH' : 'MEDIUM'

  return {
    id: buildPlanId('continue', campaign.campaignId),
    planTitle: `${campaign.campaignTitle} - 继续治理计划`,
    planType: 'CONTINUE_CAMPAIGN',
    whyNow: `该专项已有改善信号，但完成后仍复发 ${campaign.recurrenceCount} 次，说明治理方向对了，但覆盖范围还不够。`,
    basedOnCampaignIds: [campaign.campaignId],
    governanceTheme: campaign.governanceTheme,
    targetArea: campaign.targetArea,
    targetFileHints: campaign.targetFileHints,
    keySignals: [
      `effectivenessLabel=${campaign.effectivenessLabel}`,
      `changeRate=${campaign.changeRate}%`,
      `recurrenceCount=${campaign.recurrenceCount}`,
      `highRiskAfterShare=${campaign.highRiskAfterShare}%`,
    ],
    recommendedScope: `建议继续围绕 ${campaign.governanceTheme} 扩展治理样本，并优先覆盖 ${campaign.targetFileHints.slice(0, 2).join('、') || '当前主题关联文件'}。`,
    suggestedBatchNotes: buildSuggestedBatchNotes({
      campaignTitle: campaign.campaignTitle,
      governanceTheme: campaign.governanceTheme,
      changedWhat: '补充最近复发场景对应的规则样例，扩大同主题测试覆盖。',
      expectedImpact: '进一步降低 recurrenceCount，并压低高风险占比。',
    }),
    expectedOutcome: '进一步降低复发率，并让治理后的高风险问题占比继续下降。',
    watchMetrics: ['recurrenceCount', 'afterCount', 'highRiskAfterShare', 'changeRate'],
    priorityLevel,
  }
}

function buildNewCampaignPlan(candidate: GovernanceCampaignCandidate): GovernancePlanDraft {
  return {
    id: buildPlanId('new', candidate.candidateId),
    planTitle: `${candidate.campaignTitle} - 新建专项计划`,
    planType: 'NEW_CAMPAIGN',
    sourceCandidateId: candidate.candidateId,
    whyNow: `这组高优先级 action draft 还没有专项覆盖，但已经在 ${candidate.governanceTheme} 上形成集中命中，适合现在新建专项。`,
    basedOnCampaignIds: [],
    governanceTheme: candidate.governanceTheme,
    targetArea: candidate.targetArea,
    targetFileHints: candidate.targetFileHints,
    keySignals: [
      `priorityLevel=${candidate.priorityLevel}`,
      `priorityScore=${candidate.priorityScore}`,
      `relatedActionCount=${candidate.relatedActionDraftIds.length}`,
      candidate.priorityReason,
    ],
    recommendedScope: `建议围绕 ${candidate.governanceTheme} 集中治理，并优先查看 ${candidate.targetFileHints.slice(0, 2).join('、') || '当前命中文件'}。`,
    suggestedBatchNotes: buildSuggestedBatchNotes({
      campaignTitle: candidate.campaignTitle,
      governanceTheme: candidate.governanceTheme,
      changedWhat: '先补最小可复现样例和高频命中文件对应的规则，再补回归测试。',
      expectedImpact: '降低未归并高优先级问题数量，收敛重复命中。',
    }),
    expectedOutcome: '把当前高频高风险但尚未专项治理的问题，转成一轮可执行的专项治理。',
    watchMetrics: ['unassignedCount', 'priorityScore', 'relatedActionCount', 'highRiskAfterShare'],
    priorityLevel: candidate.priorityLevel,
  }
}

function buildReviewPlan(campaign: GovernanceCampaignEffectiveness): GovernancePlanDraft {
  const priorityLevel: GovernancePlanPriorityLevel = campaign.effectivenessLabel === 'RECURRING'
    || campaign.highRiskAfterShare >= campaign.highRiskBeforeShare
    ? 'HIGH'
    : 'MEDIUM'

  return {
    id: buildPlanId('review', campaign.campaignId),
    planTitle: `${campaign.campaignTitle} - 复盘计划`,
    planType: 'REVIEW_CAMPAIGN',
    whyNow: `该专项已经投入治理，但当前 changeRate=${campaign.changeRate}% 且 recurrenceCount=${campaign.recurrenceCount}，成效不够稳定，应该先复盘再决定下一步。`,
    basedOnCampaignIds: [campaign.campaignId],
    governanceTheme: campaign.governanceTheme,
    targetArea: campaign.targetArea,
    targetFileHints: campaign.targetFileHints,
    keySignals: [
      `effectivenessLabel=${campaign.effectivenessLabel}`,
      `changeRate=${campaign.changeRate}%`,
      `recurrenceCount=${campaign.recurrenceCount}`,
      `highRiskBeforeShare=${campaign.highRiskBeforeShare}%`,
      `highRiskAfterShare=${campaign.highRiskAfterShare}%`,
    ],
    recommendedScope: `先复盘 ${campaign.governanceTheme} 的治理边界、批次改动和观测口径，再决定是否继续扩专项。`,
    suggestedBatchNotes: buildSuggestedBatchNotes({
      campaignTitle: campaign.campaignTitle,
      governanceTheme: campaign.governanceTheme,
      changedWhat: '回看本轮改动是否真的覆盖到复发场景，核对目标文件和规则入口是否选对。',
      expectedImpact: '识别为什么投入后成效仍弱，并明确下一轮应继续还是重建专项。',
    }),
    expectedOutcome: '明确成效弱的原因，避免在错误治理方向上继续投入。',
    watchMetrics: ['changeRate', 'recurrenceCount', 'highRiskAfterShare', 'remainingActionCount'],
    priorityLevel,
  }
}

export function buildGovernancePlanDraftGroups(params: {
  candidateCampaigns: GovernanceCampaignCandidate[]
  effectivenessData: GovernanceEffectivenessData
}): GovernancePlanDraftGroups {
  const continueCandidates = params.effectivenessData.campaigns
    .filter((campaign) => campaign.recurrenceCount > 0 && campaign.changeRate < 0 && campaign.effectivenessLabel !== 'RECURRING' && campaign.effectivenessLabel !== 'NEEDS_REVIEW')
    .map((campaign) => buildContinuePlan(campaign))

  const newCampaignCandidates = params.candidateCampaigns
    .filter((candidate) => candidate.priorityLevel === 'HIGH' || candidate.priorityScore >= 60)
    .map((candidate) => buildNewCampaignPlan(candidate))

  const reviewCandidates = params.effectivenessData.campaigns
    .filter((campaign) => campaign.effectivenessLabel === 'RECURRING' || campaign.effectivenessLabel === 'NEEDS_REVIEW')
    .map((campaign) => buildReviewPlan(campaign))

  const recommendedPlans = sortPlans([
    ...continueCandidates,
    ...reviewCandidates,
    ...newCampaignCandidates,
  ]).slice(0, 6)

  return {
    recommendedPlans,
    continueCandidates: sortPlans(continueCandidates),
    newCampaignCandidates: sortPlans(newCampaignCandidates),
    reviewCandidates: sortPlans(reviewCandidates),
  }
}