import {
  createGovernanceCampaignRecord,
  type GovernanceCampaignRecord,
} from './governanceCampaign'
import {
  buildGovernanceActor,
  getGovernanceActorAuditLabel,
  toGovernanceActor,
  type GovernanceActor,
} from '@/lib/actorIdentity'
import { buildGovernanceDashboardData } from './governanceDashboard'
import type {
  GovernanceAssignmentRecord,
  GovernanceAssignmentSource,
  GovernanceRecommendationRole,
} from './governanceAssignment'
import {
  type GovernancePlanDecision,
  type GovernancePlanDecisionType,
  type GovernancePlanStatus,
} from './governancePlanning'
import {
  addGovernanceBatchNote,
  assignActionDraftsToCampaign,
  getGovernanceCampaign,
  recordGovernancePlanAssignment,
  recordGovernancePlanDecision,
  saveGovernanceCampaign,
  setGovernanceCampaignStatus,
} from './governanceStore'
import { buildGovernanceWorkbenchData, type GovernanceWorkbenchPlanView } from './governanceWorkbench'
import type { ReflectionForImprovement } from './improvementView'

function toIsoString(at?: Date | string): string {
  if (!at) return new Date().toISOString()
  return at instanceof Date ? at.toISOString() : new Date(at).toISOString()
}

function buildDecision(params: {
  planId: string
  decisionType: GovernancePlanDecisionType
  decisionBy?: string
  decisionActor?: GovernanceActor
  decisionNote?: string
  mergedCampaignId?: string
  createdBatchId?: string
  now?: Date | string
}): GovernancePlanDecision {
  const decisionAt = toIsoString(params.now)

  return {
    id: `plan_decision_${new Date(decisionAt).getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    planId: params.planId,
    decisionType: params.decisionType,
    decisionBy: getGovernanceActorAuditLabel(params.decisionActor, params.decisionBy?.trim() || 'governance-dashboard'),
    decisionActor: params.decisionActor,
    decisionAt,
    decisionNote: params.decisionNote?.trim() || undefined,
    mergedCampaignId: params.mergedCampaignId,
    createdBatchId: params.createdBatchId,
  }
}

function mapDecisionToStatus(decisionType: GovernancePlanDecisionType): GovernancePlanStatus {
  switch (decisionType) {
    case 'ACCEPT':
      return 'ACCEPTED'
    case 'DISMISS':
      return 'DISMISSED'
    case 'MERGE':
      return 'MERGED'
    case 'CREATE_BATCH':
      return 'BATCH_CREATED'
  }
}

function requirePlan(approvedReflections: ReflectionForImprovement[], planId: string, now?: Date | string): GovernanceWorkbenchPlanView {
  const workbench = buildGovernanceWorkbenchData({
    approvedReflections,
    now: now ? new Date(toIsoString(now)) : undefined,
  })
  const plan = workbench.planDrafts.trackedPlans.find((item) => item.id === planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  return plan
}

function getRecommendationForRole(plan: GovernanceWorkbenchPlanView, recommendationRole: GovernanceRecommendationRole) {
  return recommendationRole === 'approval'
    ? plan.actorRecommendations?.approval
    : plan.actorRecommendations?.execution
}

function buildAssignmentSnapshot(params: {
  plan: GovernanceWorkbenchPlanView
  recommendationRole: GovernanceRecommendationRole
  assignmentSource: GovernanceAssignmentSource
  assignedActor?: GovernanceActor
  assignedBy?: string
  assignedByActor?: GovernanceActor
  now?: Date | string
  clearAssignment?: boolean
}): GovernanceAssignmentRecord {
  const recommendation = getRecommendationForRole(params.plan, params.recommendationRole)
  const recommendedActorId = recommendation?.recommendedActorId || recommendation?.candidateActors[0]?.actor.actorId
  const recommendedActorName = recommendation?.recommendedActorName || recommendation?.candidateActors[0]?.actor.actorName
  const acceptedRecommendedActor = Boolean(params.assignedActor?.actorId && recommendedActorId && params.assignedActor.actorId === recommendedActorId)

  return {
    assignedActorId: params.clearAssignment ? undefined : params.assignedActor?.actorId,
    assignedActorName: params.clearAssignment ? undefined : params.assignedActor?.actorName,
    assignedActorSource: params.clearAssignment ? undefined : params.assignedActor?.actorSource,
    assignedBy: getGovernanceActorAuditLabel(params.assignedByActor, params.assignedBy),
    assignedByActor: params.assignedByActor,
    assignedAt: toIsoString(params.now),
    assignmentSource: params.assignmentSource,
    recommendationRole: params.recommendationRole,
    recommendationOffered: Boolean(recommendation && recommendation.candidateActors.length > 0),
    recommendationAccepted: !params.clearAssignment && params.assignmentSource === 'recommended' && acceptedRecommendedActor,
    acceptedRecommendedActor: !params.clearAssignment && acceptedRecommendedActor,
    manuallyOverridden: !params.clearAssignment && params.assignmentSource === 'manual' && Boolean(recommendedActorId) && params.assignedActor?.actorId !== recommendedActorId,
    recommendedActorId,
    recommendedActorName,
    recommendationScore: recommendation?.recommendationScore,
    recommendationConfidence: recommendation?.recommendationConfidence,
    recommendationReason: recommendation?.recommendationReason || recommendation?.noRecommendationReason,
    candidateActors: recommendation?.candidateActors.map((candidate) => ({
      actorId: candidate.actor.actorId,
      actorName: candidate.actor.actorName,
      actorSource: candidate.actor.actorSource,
      recommendationScore: candidate.recommendationScore,
      recommendationConfidence: candidate.recommendationConfidence,
    })) || [],
  }
}

function resolveAssignmentActor(params: {
  plan: GovernanceWorkbenchPlanView
  workbench: ReturnType<typeof buildGovernanceWorkbenchData>
  actorId?: string
  recommendationRole: GovernanceRecommendationRole
  assignmentSource: GovernanceAssignmentSource
}): GovernanceActor {
  const recommendation = getRecommendationForRole(params.plan, params.recommendationRole)
  const recommendedActor = params.actorId
    ? recommendation?.candidateActors.find((candidate) => candidate.actor.actorId === params.actorId)?.actor
    : recommendation?.candidateActors[0]?.actor

  if (params.assignmentSource === 'recommended') {
    if (!recommendedActor) {
      throw new Error('No recommended actor available for this plan')
    }

    return toGovernanceActor(recommendedActor)
  }

  const availableActor = params.workbench.actorRecommendations?.availableActors.find((actor) => actor.actorId === params.actorId)
  if (!availableActor) {
    throw new Error('Assigned actor is not available in current governance workbench')
  }

  return buildGovernanceActor({
    actorId: availableActor.actorId,
    actorName: availableActor.actorName,
    actorSource: availableActor.actorSource,
  })
}

function requireCampaign(campaignId: string): GovernanceCampaignRecord {
  const campaign = getGovernanceCampaign(campaignId)
  if (!campaign) {
    throw new Error('Campaign not found')
  }
  return campaign
}

function ensureBatchCampaign(params: {
  approvedReflections: ReflectionForImprovement[]
  plan: GovernanceWorkbenchPlanView
  campaignId?: string
  now?: Date | string
  actor?: GovernanceActor
}): GovernanceCampaignRecord {
  if (params.campaignId) {
    return requireCampaign(params.campaignId)
  }

  const basedOnCampaignId = params.plan.basedOnCampaignIds[0]
  if (basedOnCampaignId) {
    return requireCampaign(basedOnCampaignId)
  }

  if (!params.plan.sourceCandidateId) {
    throw new Error('Plan does not have a target campaign for batch creation')
  }

  const dashboardData = buildGovernanceDashboardData({
    approvedReflections: params.approvedReflections,
    now: params.now ? new Date(toIsoString(params.now)) : undefined,
  })
  const candidate = dashboardData.candidateCampaigns.find((item) => item.candidateId === params.plan.sourceCandidateId)
  if (!candidate) {
    throw new Error('Plan source candidate is no longer available')
  }

  const items = dashboardData.actionDrafts.filter((item) => candidate.relatedActionDraftIds.includes(item.id))
  if (items.length === 0) {
    throw new Error('No action drafts available for creating a campaign from this plan')
  }

  const campaign = createGovernanceCampaignRecord({
    items,
    campaignTitle: candidate.campaignTitle,
    summary: candidate.summary,
    now: params.now ? new Date(toIsoString(params.now)) : undefined,
    createdBy: params.actor,
  })
  saveGovernanceCampaign(campaign)
  assignActionDraftsToCampaign(campaign.id, items.map((item) => item.id), params.now, params.actor)

  return campaign
}

export function applyGovernancePlanDecision(params: {
  approvedReflections: ReflectionForImprovement[]
  planId: string
  decisionType: GovernancePlanDecisionType
  campaignId?: string
  decisionBy?: string
  decisionActor?: GovernanceActor
  decisionNote?: string
  now?: Date | string
}) {
  const plan = requirePlan(params.approvedReflections, params.planId, params.now)

  if (params.decisionType === 'DISMISS' && !params.decisionNote?.trim()) {
    throw new Error('Dismissed plans require a reason')
  }

  if (params.decisionType === 'MERGE' && !params.campaignId) {
    throw new Error('campaignId is required when merging a plan into an existing campaign')
  }

  if (params.decisionType === 'MERGE') {
    requireCampaign(params.campaignId!)
  }

  if (params.decisionType === 'CREATE_BATCH') {
    const campaign = ensureBatchCampaign({
      approvedReflections: params.approvedReflections,
      plan,
      campaignId: params.campaignId,
      now: params.now,
      actor: params.decisionActor,
    })
    const suggestedNote = plan.suggestedBatchNotes[0]
    const batchResult = addGovernanceBatchNote({
      campaignId: campaign.id,
      batchTitle: suggestedNote?.batchTitle || `${plan.planTitle} - 治理批次`,
      batchNote: suggestedNote?.batchNote || plan.whyNow,
      changedWhat: suggestedNote?.changedWhat || plan.recommendedScope,
      expectedImpact: suggestedNote?.expectedImpact || plan.expectedOutcome,
      createdAt: params.now,
      createdBy: params.decisionActor,
      assignment: plan.assignment?.assignedActorId ? plan.assignment : undefined,
      sourcePlanId: plan.id,
      sourcePlanTitle: plan.planTitle,
    })

    if (!batchResult) {
      throw new Error('Failed to create governance batch note')
    }

    setGovernanceCampaignStatus(campaign.id, 'IN_GOVERNANCE', params.now, params.decisionActor)

    const decision = buildDecision({
      planId: plan.id,
      decisionType: params.decisionType,
      decisionBy: params.decisionBy,
      decisionActor: params.decisionActor,
      decisionNote: params.decisionNote,
      mergedCampaignId: campaign.id,
      createdBatchId: batchResult.note.id,
      now: params.now,
    })
    const planRecord = recordGovernancePlanDecision({
      plan,
      status: mapDecisionToStatus(params.decisionType),
      decision,
    })

    return {
      planRecord,
      campaign: batchResult.campaign,
      batchNote: batchResult.note,
    }
  }

  const decision = buildDecision({
    planId: plan.id,
    decisionType: params.decisionType,
    decisionBy: params.decisionBy,
    decisionActor: params.decisionActor,
    decisionNote: params.decisionNote,
    mergedCampaignId: params.campaignId,
    now: params.now,
  })
  const planRecord = recordGovernancePlanDecision({
    plan,
    status: mapDecisionToStatus(params.decisionType),
    decision,
  })

  return {
    planRecord,
    campaign: params.campaignId ? getGovernanceCampaign(params.campaignId) : undefined,
  }
}

export function assignGovernancePlanActor(params: {
  approvedReflections: ReflectionForImprovement[]
  planId: string
  recommendationRole: GovernanceRecommendationRole
  assignmentSource: GovernanceAssignmentSource
  actorId?: string
  assignedBy?: string
  assignedByActor?: GovernanceActor
  clearAssignment?: boolean
  now?: Date | string
}) {
  const workbench = buildGovernanceWorkbenchData({
    approvedReflections: params.approvedReflections,
    now: params.now ? new Date(toIsoString(params.now)) : undefined,
  })
  const plan = workbench.planDrafts.trackedPlans.find((item) => item.id === params.planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const assignedActor = params.clearAssignment
    ? undefined
    : resolveAssignmentActor({
      plan,
      workbench,
      actorId: params.actorId,
      recommendationRole: params.recommendationRole,
      assignmentSource: params.assignmentSource,
    })

  const assignment = buildAssignmentSnapshot({
    plan,
    recommendationRole: params.recommendationRole,
    assignmentSource: params.assignmentSource,
    assignedActor,
    assignedBy: params.assignedBy,
    assignedByActor: params.assignedByActor,
    now: params.now,
    clearAssignment: params.clearAssignment,
  })

  const planRecord = recordGovernancePlanAssignment({
    plan,
    assignment,
  })

  return {
    planRecord,
    assignment,
  }
}