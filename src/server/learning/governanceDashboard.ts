import { buildActionDraftDashboardStats, type RankedActionDraftPriority } from './actionDraftDashboard'
import type { GovernanceActor } from '@/lib/actorIdentity'
import type { ReflectionForImprovement } from './improvementView'
import type { ImprovementActionRiskLevel } from './improvementSuggestion'
import {
  buildGovernanceCampaignCandidates,
  type ActionDraftGovernanceStatus,
  type GovernanceCampaignCandidate,
  type GovernanceCampaignRecord,
} from './governanceCampaign'
import {
  getActionDraftCampaignId,
  getActionDraftGovernanceStatus,
  getActionDraftGovernanceUpdatedAt,
  getActionDraftGovernanceUpdatedBy,
  listGovernanceCampaigns,
} from './governanceStore'

export type GovernanceActionDraftItem = RankedActionDraftPriority & {
  governanceStatus: ActionDraftGovernanceStatus
  governanceUpdatedAt?: string
  governanceUpdatedBy?: GovernanceActor
  campaignId?: string
  campaignTitle?: string
}

export type GovernanceCampaignDetail = GovernanceCampaignRecord & {
  actionCount: number
  relatedActions: GovernanceActionDraftItem[]
  riskLevelDistribution: Record<ImprovementActionRiskLevel, number>
}

export type GovernanceDashboardData = {
  generatedAt: string
  summary: {
    actionDraftCount: number
    candidateCount: number
    campaignCount: number
    unassignedCount: number
    inGovernanceCount: number
    archivedCount: number
  }
  actionDrafts: GovernanceActionDraftItem[]
  candidateCampaigns: GovernanceCampaignCandidate[]
  campaigns: GovernanceCampaignDetail[]
}

function buildRiskLevelDistribution(items: GovernanceActionDraftItem[]): Record<ImprovementActionRiskLevel, number> {
  return items.reduce<Record<ImprovementActionRiskLevel, number>>((acc, item) => {
    acc[item.riskLevel] += 1
    return acc
  }, {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  })
}

function enrichActionDrafts(items: RankedActionDraftPriority[], campaigns: GovernanceCampaignRecord[]): GovernanceActionDraftItem[] {
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]))

  return items.map((item) => {
    const campaignId = getActionDraftCampaignId(item.id)
    const campaign = campaignId ? campaignMap.get(campaignId) : undefined

    return {
      ...item,
      governanceStatus: getActionDraftGovernanceStatus(item.id),
      governanceUpdatedAt: getActionDraftGovernanceUpdatedAt(item.id),
      governanceUpdatedBy: getActionDraftGovernanceUpdatedBy(item.id),
      campaignId,
      campaignTitle: campaign?.campaignTitle,
    }
  })
}

function buildCampaignDetails(campaigns: GovernanceCampaignRecord[], actionDrafts: GovernanceActionDraftItem[]): GovernanceCampaignDetail[] {
  return campaigns.map((campaign) => {
    const relatedActions = actionDrafts.filter((item) => campaign.relatedActionDraftIds.includes(item.id))

    return {
      ...campaign,
      actionCount: relatedActions.length,
      relatedActions,
      riskLevelDistribution: buildRiskLevelDistribution(relatedActions),
    }
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function buildGovernanceDashboardData(params: {
  approvedReflections: ReflectionForImprovement[]
  now?: Date
}) : GovernanceDashboardData {
  const priorityStats = buildActionDraftDashboardStats({
    approvedReflections: params.approvedReflections,
    now: params.now,
  })
  const campaigns = listGovernanceCampaigns()
  const actionDrafts = enrichActionDrafts(priorityStats.rankedActionDrafts, campaigns)
  const candidateCampaigns = buildGovernanceCampaignCandidates(
    actionDrafts.filter((item) => item.governanceStatus === 'UNASSIGNED')
  )
  const campaignDetails = buildCampaignDetails(campaigns, actionDrafts)

  return {
    generatedAt: priorityStats.generatedAt,
    summary: {
      actionDraftCount: actionDrafts.length,
      candidateCount: candidateCampaigns.length,
      campaignCount: campaignDetails.length,
      unassignedCount: actionDrafts.filter((item) => item.governanceStatus === 'UNASSIGNED').length,
      inGovernanceCount: actionDrafts.filter((item) => item.governanceStatus === 'IN_GOVERNANCE').length,
      archivedCount: actionDrafts.filter((item) => item.governanceStatus === 'ARCHIVED').length,
    },
    actionDrafts,
    candidateCampaigns,
    campaigns: campaignDetails,
  }
}