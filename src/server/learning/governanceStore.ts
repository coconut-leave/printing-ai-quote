import type {
  ActionDraftGovernanceStatus,
  GovernanceBatchNote,
  GovernanceCampaignRecord,
  GovernanceCampaignStatus,
} from './governanceCampaign'
import {
  createGovernancePlanRecord,
  updateGovernancePlanRecord,
  type GovernancePlanDecision,
  type GovernancePlanDraft,
  type GovernancePlanRecord,
  type GovernancePlanStatus,
} from './governancePlanning'
import type { GovernanceActor } from '@/lib/actorIdentity'
import type { GovernanceAssignmentRecord } from './governanceAssignment'

type GovernanceStoreState = {
  campaigns: Map<string, GovernanceCampaignRecord>
  actionCampaignIds: Map<string, string>
  actionStatuses: Map<string, ActionDraftGovernanceStatus>
  actionUpdatedAt: Map<string, string>
  actionUpdatedBy: Map<string, GovernanceActor>
  planRecords: Map<string, GovernancePlanRecord>
}

declare global {
  // eslint-disable-next-line no-var
  var __governanceStoreState: GovernanceStoreState | undefined
}

const store = global.__governanceStoreState || {
  campaigns: new Map<string, GovernanceCampaignRecord>(),
  actionCampaignIds: new Map<string, string>(),
  actionStatuses: new Map<string, ActionDraftGovernanceStatus>(),
  actionUpdatedAt: new Map<string, string>(),
  actionUpdatedBy: new Map<string, GovernanceActor>(),
  planRecords: new Map<string, GovernancePlanRecord>(),
}

if (!global.__governanceStoreState) {
  global.__governanceStoreState = store
}

function toIsoString(at?: Date | string): string {
  if (!at) return new Date().toISOString()
  return at instanceof Date ? at.toISOString() : new Date(at).toISOString()
}

function markActionDraftUpdated(actionDraftId: string, at?: Date | string, actor?: GovernanceActor): void {
  store.actionUpdatedAt.set(actionDraftId, toIsoString(at))
  if (actor) {
    store.actionUpdatedBy.set(actionDraftId, actor)
  }
}

export function listGovernanceCampaigns(): GovernanceCampaignRecord[] {
  return Array.from(store.campaigns.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getGovernanceCampaign(campaignId: string): GovernanceCampaignRecord | undefined {
  return store.campaigns.get(campaignId)
}

export function saveGovernanceCampaign(campaign: GovernanceCampaignRecord): GovernanceCampaignRecord {
  store.campaigns.set(campaign.id, campaign)
  campaign.relatedActionDraftIds.forEach((actionDraftId) => {
    store.actionCampaignIds.set(actionDraftId, campaign.id)
    if (!store.actionStatuses.has(actionDraftId)) {
      store.actionStatuses.set(actionDraftId, 'MERGED_INTO_CAMPAIGN')
    }
    markActionDraftUpdated(actionDraftId, campaign.updatedAt, campaign.updatedBy || campaign.createdBy)
  })
  return campaign
}

export function getActionDraftCampaignId(actionDraftId: string): string | undefined {
  return store.actionCampaignIds.get(actionDraftId)
}

export function getActionDraftGovernanceStatus(actionDraftId: string): ActionDraftGovernanceStatus {
  return store.actionStatuses.get(actionDraftId) ?? 'UNASSIGNED'
}

export function getActionDraftGovernanceUpdatedAt(actionDraftId: string): string | undefined {
  return store.actionUpdatedAt.get(actionDraftId)
}

export function getActionDraftGovernanceUpdatedBy(actionDraftId: string): GovernanceActor | undefined {
  return store.actionUpdatedBy.get(actionDraftId)
}

export function setActionDraftGovernanceStatus(
  actionDraftIds: string[],
  status: ActionDraftGovernanceStatus,
  at?: Date | string,
  actor?: GovernanceActor
): void {
  actionDraftIds.forEach((actionDraftId) => {
    store.actionStatuses.set(actionDraftId, status)
    markActionDraftUpdated(actionDraftId, at, actor)
  })
}

export function assignActionDraftsToCampaign(
  campaignId: string,
  actionDraftIds: string[],
  at?: Date | string,
  actor?: GovernanceActor
): void {
  actionDraftIds.forEach((actionDraftId) => {
    store.actionCampaignIds.set(actionDraftId, campaignId)
    store.actionStatuses.set(actionDraftId, 'MERGED_INTO_CAMPAIGN')
    markActionDraftUpdated(actionDraftId, at, actor)
  })
}

export function setGovernanceCampaignStatus(
  campaignId: string,
  status: GovernanceCampaignStatus,
  at?: Date | string,
  actor?: GovernanceActor
): GovernanceCampaignRecord | undefined {
  const current = store.campaigns.get(campaignId)
  if (!current) return undefined

  const updated: GovernanceCampaignRecord = {
    ...current,
    status,
    updatedAt: toIsoString(at),
    updatedBy: actor || current.updatedBy,
    completedAt: status === 'COMPLETED'
      ? current.completedAt || toIsoString(at)
      : current.completedAt,
  }
  store.campaigns.set(campaignId, updated)

  if (status === 'IN_GOVERNANCE') {
    setActionDraftGovernanceStatus(updated.relatedActionDraftIds, 'IN_GOVERNANCE', at, actor)
  }

  if (status === 'ARCHIVED') {
    setActionDraftGovernanceStatus(updated.relatedActionDraftIds, 'ARCHIVED', at, actor)
  }

  return updated
}

export function addGovernanceBatchNote(params: {
  campaignId: string
  batchTitle: string
  batchNote: string
  changedWhat: string
  expectedImpact: string
  createdAt?: Date | string
  createdBy?: GovernanceActor
  assignment?: GovernanceAssignmentRecord
  sourcePlanId?: string
  sourcePlanTitle?: string
}): { campaign: GovernanceCampaignRecord; note: GovernanceBatchNote } | undefined {
  const current = store.campaigns.get(params.campaignId)
  if (!current) return undefined

  const createdAt = toIsoString(params.createdAt)
  const note: GovernanceBatchNote = {
    id: `batch_${new Date(createdAt).getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    batchTitle: params.batchTitle.trim(),
    batchNote: params.batchNote.trim(),
    changedWhat: params.changedWhat.trim(),
    expectedImpact: params.expectedImpact.trim(),
    createdAt,
    createdBy: params.createdBy,
    assignment: params.assignment,
    sourcePlanId: params.sourcePlanId,
    sourcePlanTitle: params.sourcePlanTitle,
  }

  const updated: GovernanceCampaignRecord = {
    ...current,
    batchNotes: [...current.batchNotes, note].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    updatedAt: createdAt,
    updatedBy: params.createdBy || current.updatedBy,
  }

  store.campaigns.set(params.campaignId, updated)
  return {
    campaign: updated,
    note,
  }
}

export function listGovernancePlanRecords(): GovernancePlanRecord[] {
  return Array.from(store.planRecords.values()).sort((a, b) => (b.decisionAt || '').localeCompare(a.decisionAt || ''))
}

export function getGovernancePlanRecord(planId: string): GovernancePlanRecord | undefined {
  return store.planRecords.get(planId)
}

export function setGovernancePlanRecord(record: GovernancePlanRecord): GovernancePlanRecord {
  store.planRecords.set(record.plan.id, record)
  return record
}

export function recordGovernancePlanDecision(params: {
  plan: GovernancePlanDraft
  status: GovernancePlanStatus
  decision: GovernancePlanDecision
}): GovernancePlanRecord {
  const current = store.planRecords.get(params.plan.id)
  const nextRecord = current
    ? updateGovernancePlanRecord({
      current,
      plan: params.plan,
      status: params.status,
      decision: params.decision,
    })
    : createGovernancePlanRecord({
      plan: params.plan,
      status: params.status,
      decision: params.decision,
    })

  store.planRecords.set(params.plan.id, nextRecord)
  return nextRecord
}

export function recordGovernancePlanAssignment(params: {
  plan: GovernancePlanDraft
  assignment: GovernanceAssignmentRecord
}): GovernancePlanRecord {
  const current = store.planRecords.get(params.plan.id)
  const nextRecord: GovernancePlanRecord = current
    ? {
      ...current,
      plan: params.plan,
      assignment: params.assignment,
    }
    : {
      plan: params.plan,
      status: 'PROPOSED',
      decisionHistory: [],
      assignment: params.assignment,
    }

  store.planRecords.set(params.plan.id, nextRecord)
  return nextRecord
}

export function clearGovernanceStore(): void {
  store.campaigns.clear()
  store.actionCampaignIds.clear()
  store.actionStatuses.clear()
  store.actionUpdatedAt.clear()
  store.actionUpdatedBy.clear()
  store.planRecords.clear()
}