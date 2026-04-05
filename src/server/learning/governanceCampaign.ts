import type {
  ActionDraftGovernanceBucket,
  ActionDraftPriorityLevel,
  RankedActionDraftPriority,
} from './actionDraftDashboard'
import type {
  ImprovementActionChangeType,
  ImprovementActionRiskLevel,
  ImprovementTargetArea,
} from './improvementSuggestion'
import type { GovernanceActor } from '@/lib/actorIdentity'
import type { GovernanceAssignmentRecord } from './governanceAssignment'

export type GovernanceCampaignStatus = 'NEW' | 'IN_GOVERNANCE' | 'COMPLETED' | 'ARCHIVED'
export type ActionDraftGovernanceStatus = 'UNASSIGNED' | 'MERGED_INTO_CAMPAIGN' | 'IN_GOVERNANCE' | 'ARCHIVED'

export type GovernanceBatchNote = {
  id: string
  batchTitle: string
  batchNote: string
  changedWhat: string
  expectedImpact: string
  createdAt: string
  createdBy?: GovernanceActor
  assignment?: GovernanceAssignmentRecord
  sourcePlanId?: string
  sourcePlanTitle?: string
}

export type GovernanceCampaignRecord = {
  id: string
  campaignTitle: string
  governanceTheme: string
  targetArea: ImprovementTargetArea
  changeType: ImprovementActionChangeType
  targetFileHints: string[]
  priorityLevel: ActionDraftPriorityLevel
  priorityReason: string
  relatedActionDraftIds: string[]
  status: GovernanceCampaignStatus
  summary: string
  recommendedNextAction: string
  createdAt: string
  updatedAt: string
  createdBy?: GovernanceActor
  updatedBy?: GovernanceActor
  completedAt?: string
  batchNotes: GovernanceBatchNote[]
}

export type GovernanceCampaignCandidate = {
  candidateId: string
  campaignTitle: string
  governanceTheme: string
  targetArea: ImprovementTargetArea
  changeType: ImprovementActionChangeType
  targetFileHints: string[]
  priorityScore: number
  priorityLevel: ActionDraftPriorityLevel
  priorityReason: string
  governanceBucket: ActionDraftGovernanceBucket
  mergeReason: string
  relatedActionDraftIds: string[]
  summary: string
  recommendedNextAction: string
}

function basename(filePath?: string): string {
  if (!filePath) return '当前文件'
  const parts = filePath.split('/').filter(Boolean)
  return parts[parts.length - 1] || filePath
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function priorityLevelWeight(level: ActionDraftPriorityLevel): number {
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

function maxPriorityLevel(items: RankedActionDraftPriority[]): ActionDraftPriorityLevel {
  return items
    .map((item) => item.priorityLevel)
    .sort((a, b) => priorityLevelWeight(b) - priorityLevelWeight(a))[0] || 'LOW'
}

function normalizeGroupingFileHint(item: RankedActionDraftPriority): string {
  if (item.targetFileHitCount >= 2 && item.targetFileHint) {
    return item.targetFileHint
  }

  return 'MULTI_FILE'
}

function getGroupingKey(item: RankedActionDraftPriority): string {
  return [
    item.governanceTheme,
    item.targetArea,
    item.changeType,
    normalizeGroupingFileHint(item),
  ].join('::')
}

function formatRiskDistribution(items: RankedActionDraftPriority[]): string {
  const counts: Record<ImprovementActionRiskLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  }

  items.forEach((item) => {
    counts[item.riskLevel] += 1
  })

  return `高风险 ${counts.HIGH} / 中风险 ${counts.MEDIUM} / 低风险 ${counts.LOW}`
}

function buildCampaignTitle(items: RankedActionDraftPriority[]): string {
  const top = items[0]
  const repeatedFileHint = unique(items.map((item) => normalizeGroupingFileHint(item))).find((item) => item !== 'MULTI_FILE')

  if (repeatedFileHint) {
    return `${basename(repeatedFileHint)} - ${top.governanceTheme}专项`
  }

  return `${top.governanceTheme}专项`
}

function buildSummary(items: RankedActionDraftPriority[]): string {
  const top = items[0]
  const fileHints = unique(items.map((item) => item.targetFileHint))
  const fileSummary = fileHints.length > 0
    ? `主要集中在 ${fileHints.slice(0, 2).map((item) => basename(item)).join('、')}`
    : '当前没有稳定的目标文件集中度'

  return `共 ${items.length} 条 action draft，主线为 ${top.governanceTheme}，${fileSummary}，${formatRiskDistribution(items)}。`
}

function buildMergeReason(items: RankedActionDraftPriority[]): string {
  const top = items[0]
  const fileHints = unique(items.map((item) => normalizeGroupingFileHint(item))).filter((item) => item !== 'MULTI_FILE')
  const filePart = fileHints.length > 0
    ? `，并集中命中 ${fileHints.slice(0, 2).map((item) => basename(item)).join('、')}`
    : ''

  return `这些 action draft 同属 ${top.governanceTheme}，targetArea=${top.targetArea}、changeType=${top.changeType}${filePart}，适合按同一专项治理。`
}

export function areActionDraftsMergeCompatible(items: RankedActionDraftPriority[]): boolean {
  if (items.length <= 1) return true
  const first = items[0]

  return items.every((item) => (
    item.governanceTheme === first.governanceTheme
    && item.targetArea === first.targetArea
    && item.changeType === first.changeType
  ))
}

export function buildGovernanceCampaignCandidate(items: RankedActionDraftPriority[]): GovernanceCampaignCandidate {
  if (items.length === 0) {
    throw new Error('Cannot build governance campaign candidate from empty action drafts')
  }

  const sortedItems = [...items].sort((a, b) => b.priorityScore - a.priorityScore)
  const top = sortedItems[0]
  const priorityScore = Math.max(...sortedItems.map((item) => item.priorityScore))

  return {
    candidateId: `candidate_${Buffer.from(getGroupingKey(top)).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`,
    campaignTitle: buildCampaignTitle(sortedItems),
    governanceTheme: top.governanceTheme,
    targetArea: top.targetArea,
    changeType: top.changeType,
    targetFileHints: unique(sortedItems.map((item) => item.targetFileHint)),
    priorityScore,
    priorityLevel: maxPriorityLevel(sortedItems),
    priorityReason: `${top.priorityReason} 当前这一组共 ${sortedItems.length} 条。`,
    governanceBucket: top.governanceBucket,
    mergeReason: buildMergeReason(sortedItems),
    relatedActionDraftIds: sortedItems.map((item) => item.id),
    summary: buildSummary(sortedItems),
    recommendedNextAction: top.recommendedNextAction,
  }
}

export function buildGovernanceCampaignCandidates(items: RankedActionDraftPriority[]): GovernanceCampaignCandidate[] {
  const groups = new Map<string, RankedActionDraftPriority[]>()

  items.forEach((item) => {
    const key = getGroupingKey(item)
    const current = groups.get(key) || []
    current.push(item)
    groups.set(key, current)
  })

  return Array.from(groups.values())
    .filter((groupedItems) => groupedItems.length >= 2 && areActionDraftsMergeCompatible(groupedItems))
    .map((groupedItems) => buildGovernanceCampaignCandidate(groupedItems))
    .sort((a, b) => {
      if (priorityLevelWeight(b.priorityLevel) !== priorityLevelWeight(a.priorityLevel)) {
        return priorityLevelWeight(b.priorityLevel) - priorityLevelWeight(a.priorityLevel)
      }

      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore
      }

      return b.relatedActionDraftIds.length - a.relatedActionDraftIds.length
    })
}

export function createGovernanceCampaignRecord(params: {
  items: RankedActionDraftPriority[]
  campaignTitle?: string
  summary?: string
  now?: Date
  createdBy?: GovernanceActor
}): GovernanceCampaignRecord {
  const candidate = buildGovernanceCampaignCandidate(params.items)
  const now = params.now || new Date()

  return {
    id: `gov_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    campaignTitle: params.campaignTitle?.trim() || candidate.campaignTitle,
    governanceTheme: candidate.governanceTheme,
    targetArea: candidate.targetArea,
    changeType: candidate.changeType,
    targetFileHints: candidate.targetFileHints,
    priorityLevel: candidate.priorityLevel,
    priorityReason: candidate.priorityReason,
    relatedActionDraftIds: candidate.relatedActionDraftIds,
    status: 'NEW',
    summary: params.summary?.trim() || candidate.summary,
    recommendedNextAction: candidate.recommendedNextAction,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    batchNotes: [],
  }
}

export function refreshGovernanceCampaignRecord(
  current: GovernanceCampaignRecord,
  items: RankedActionDraftPriority[],
  now?: Date,
  updatedBy?: GovernanceActor
): GovernanceCampaignRecord {
  const candidate = buildGovernanceCampaignCandidate(items)
  const updatedAt = (now || new Date()).toISOString()

  return {
    ...current,
    governanceTheme: candidate.governanceTheme,
    targetArea: candidate.targetArea,
    changeType: candidate.changeType,
    targetFileHints: candidate.targetFileHints,
    priorityLevel: candidate.priorityLevel,
    priorityReason: candidate.priorityReason,
    relatedActionDraftIds: candidate.relatedActionDraftIds,
    summary: candidate.summary,
    recommendedNextAction: candidate.recommendedNextAction,
    updatedAt,
    updatedBy: updatedBy || current.updatedBy,
    batchNotes: current.batchNotes,
  }
}