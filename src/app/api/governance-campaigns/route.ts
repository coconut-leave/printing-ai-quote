import { cookies } from 'next/headers'
import { ADMIN_ACTOR_COOKIE_NAME, resolveGovernanceActor } from '@/lib/adminActorSession'
import { ADMIN_ACCESS_COOKIE_NAME } from '@/lib/adminAccess'
import { createSuccessResponse, withErrorHandler } from '@/server/api/response'
import { getApprovedReflections } from '@/server/db/conversations'
import {
  areActionDraftsMergeCompatible,
  createGovernanceCampaignRecord,
  refreshGovernanceCampaignRecord,
  type ActionDraftGovernanceStatus,
  type GovernanceCampaignStatus,
} from '@/server/learning/governanceCampaign'
import { applyGovernancePlanDecision } from '@/server/learning/governancePlanActions'
import { assignGovernancePlanActor } from '@/server/learning/governancePlanActions'
import { buildGovernanceDashboardData } from '@/server/learning/governanceDashboard'
import type { GovernancePlanDecisionType } from '@/server/learning/governancePlanning'
import type { GovernanceAssignmentSource, GovernanceRecommendationRole } from '@/server/learning/governanceAssignment'
import {
  addGovernanceBatchNote,
  assignActionDraftsToCampaign,
  getGovernanceCampaign,
  saveGovernanceCampaign,
  setActionDraftGovernanceStatus,
  setGovernanceCampaignStatus,
} from '@/server/learning/governanceStore'

const VALID_ACTION_STATUSES: ActionDraftGovernanceStatus[] = [
  'UNASSIGNED',
  'MERGED_INTO_CAMPAIGN',
  'IN_GOVERNANCE',
  'ARCHIVED',
]

const VALID_CAMPAIGN_STATUSES: GovernanceCampaignStatus[] = [
  'NEW',
  'IN_GOVERNANCE',
  'COMPLETED',
  'ARCHIVED',
]

const VALID_PLAN_DECISION_TYPES: GovernancePlanDecisionType[] = [
  'ACCEPT',
  'DISMISS',
  'MERGE',
  'CREATE_BATCH',
]

const VALID_ASSIGNMENT_SOURCES: GovernanceAssignmentSource[] = ['recommended', 'manual']
const VALID_RECOMMENDATION_ROLES: GovernanceRecommendationRole[] = ['approval', 'execution']

async function loadApprovedReflections() {
  const { records } = await getApprovedReflections(2000, 0)
  return records.map((item) => ({
    id: item.id,
    conversationId: item.conversationId,
    issueType: item.issueType,
    suggestionDraft: item.suggestionDraft,
    originalExtractedParams: item.originalExtractedParams as Record<string, any> | null,
    correctedParams: item.correctedParams as Record<string, any> | null,
    createdAt: item.createdAt,
  }))
}

export async function POST(request: Request) {
  return withErrorHandler(async () => {
    const body = await request.json()
    const actor = resolveGovernanceActor({
      accessSessionToken: cookies().get(ADMIN_ACCESS_COOKIE_NAME)?.value,
      actorCookieValue: cookies().get(ADMIN_ACTOR_COOKIE_NAME)?.value,
      headers: request.headers,
    })
    const { mode, actionDraftIds, campaignId, campaignTitle, summary } = body as {
      mode?: string
      actionDraftIds?: string[]
      campaignId?: string
      campaignTitle?: string
      summary?: string
    }

    if (!Array.isArray(actionDraftIds) || actionDraftIds.length === 0) {
      throw new Error('Invalid actionDraftIds')
    }

    const approvedReflections = await loadApprovedReflections()
    const governanceData = buildGovernanceDashboardData({
      approvedReflections,
    })
    const selectedItems = governanceData.actionDrafts.filter((item) => actionDraftIds.includes(item.id))

    if (selectedItems.length !== actionDraftIds.length) {
      throw new Error('Some action drafts could not be found')
    }

    if (!areActionDraftsMergeCompatible(selectedItems)) {
      throw new Error('Selected action drafts are not compatible for the same governance campaign')
    }

    if (mode === 'create') {
      const campaign = createGovernanceCampaignRecord({
        items: selectedItems,
        campaignTitle,
        summary,
        createdBy: actor,
      })
      saveGovernanceCampaign(campaign)
      assignActionDraftsToCampaign(campaign.id, actionDraftIds, undefined, actor)

      return createSuccessResponse({
        campaign,
      })
    }

    if (mode === 'merge') {
      if (!campaignId) {
        throw new Error('campaignId is required when merging into an existing campaign')
      }

      const existing = getGovernanceCampaign(campaignId)
      if (!existing) {
        throw new Error('Campaign not found')
      }

      if (
        existing.governanceTheme !== selectedItems[0].governanceTheme
        || existing.targetArea !== selectedItems[0].targetArea
        || existing.changeType !== selectedItems[0].changeType
      ) {
        throw new Error('Selected action drafts do not match the target campaign theme')
      }

      const existingItems = governanceData.actionDrafts.filter((item) => existing.relatedActionDraftIds.includes(item.id))
      const updatedCampaign = refreshGovernanceCampaignRecord(
        existing,
        [...existingItems, ...selectedItems],
        undefined,
        actor,
      )
      saveGovernanceCampaign(updatedCampaign)
      assignActionDraftsToCampaign(campaignId, actionDraftIds, undefined, actor)

      return createSuccessResponse({
        campaign: updatedCampaign,
      })
    }

    throw new Error('Unsupported governance campaign mode')
  }, 'governance-campaigns-post')
}

export async function PATCH(request: Request) {
  return withErrorHandler(async () => {
    const body = await request.json()
    const actor = resolveGovernanceActor({
      accessSessionToken: cookies().get(ADMIN_ACCESS_COOKIE_NAME)?.value,
      actorCookieValue: cookies().get(ADMIN_ACTOR_COOKIE_NAME)?.value,
      headers: request.headers,
      legacyActorName: typeof body.decisionBy === 'string' ? body.decisionBy : undefined,
    })
    const { mode, campaignId, status, actionDraftIds } = body as {
      mode?: string
      campaignId?: string
      status?: string
      actionDraftIds?: string[]
      batchTitle?: string
      batchNote?: string
      changedWhat?: string
      expectedImpact?: string
    }

    if (mode === 'campaign-status') {
      if (!campaignId || !status || !VALID_CAMPAIGN_STATUSES.includes(status as GovernanceCampaignStatus)) {
        throw new Error('Invalid campaign status update payload')
      }

      const campaign = setGovernanceCampaignStatus(campaignId, status as GovernanceCampaignStatus, undefined, actor)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      return createSuccessResponse({ campaign })
    }

    if (mode === 'action-status') {
      if (!Array.isArray(actionDraftIds) || actionDraftIds.length === 0 || !status || !VALID_ACTION_STATUSES.includes(status as ActionDraftGovernanceStatus)) {
        throw new Error('Invalid action governance status update payload')
      }

      setActionDraftGovernanceStatus(actionDraftIds, status as ActionDraftGovernanceStatus, undefined, actor)

      return createSuccessResponse({
        actionDraftIds,
        status,
      })
    }

    if (mode === 'batch-note') {
      const { batchTitle, batchNote, changedWhat, expectedImpact } = body as {
        batchTitle?: string
        batchNote?: string
        changedWhat?: string
        expectedImpact?: string
      }

      if (!campaignId || !batchTitle?.trim() || !batchNote?.trim() || !changedWhat?.trim() || !expectedImpact?.trim()) {
        throw new Error('Invalid batch note payload')
      }

      const campaign = addGovernanceBatchNote({
        campaignId,
        batchTitle,
        batchNote,
        changedWhat,
        expectedImpact,
        createdBy: actor,
      })

      if (!campaign) {
        throw new Error('Campaign not found')
      }

      return createSuccessResponse({ campaign: campaign.campaign, batchNote: campaign.note })
    }

    if (mode === 'plan-decision') {
      const { planId, decisionType, decisionNote, decisionBy } = body as {
        planId?: string
        decisionType?: GovernancePlanDecisionType
        decisionNote?: string
        decisionBy?: string
      }

      if (!planId || !decisionType || !VALID_PLAN_DECISION_TYPES.includes(decisionType)) {
        throw new Error('Invalid governance plan decision payload')
      }

      const approvedReflections = await loadApprovedReflections()
      const result = applyGovernancePlanDecision({
        approvedReflections,
        planId,
        decisionType,
        campaignId,
        decisionBy,
        decisionActor: actor,
        decisionNote,
      })

      return createSuccessResponse(result)
    }

    if (mode === 'plan-assignment') {
      const {
        planId,
        actorId,
        assignmentSource,
        recommendationRole,
        clearAssignment,
      } = body as {
        planId?: string
        actorId?: string
        assignmentSource?: GovernanceAssignmentSource
        recommendationRole?: GovernanceRecommendationRole
        clearAssignment?: boolean
      }

      if (!planId || !assignmentSource || !VALID_ASSIGNMENT_SOURCES.includes(assignmentSource)) {
        throw new Error('Invalid governance plan assignment payload')
      }

      if (!recommendationRole || !VALID_RECOMMENDATION_ROLES.includes(recommendationRole)) {
        throw new Error('Invalid recommendationRole for governance plan assignment')
      }

      if (!clearAssignment && assignmentSource === 'manual' && !actorId) {
        throw new Error('actorId is required for manual assignment')
      }

      const approvedReflections = await loadApprovedReflections()
      const result = assignGovernancePlanActor({
        approvedReflections,
        planId,
        actorId,
        assignmentSource,
        recommendationRole,
        assignedBy: typeof body.decisionBy === 'string' ? body.decisionBy : undefined,
        assignedByActor: actor,
        clearAssignment,
      })

      return createSuccessResponse(result)
    }

    throw new Error('Unsupported governance campaign patch mode')
  }, 'governance-campaigns-patch')
}