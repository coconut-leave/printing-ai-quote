import type { GovernanceCampaignStatus } from './governanceCampaign'
import {
  buildGovernanceActorAnalysisData,
  type GovernanceActorAnalysisData,
} from './governanceActorAnalytics'
import {
  buildGovernanceDashboardData,
  type GovernanceActionDraftItem,
  type GovernanceCampaignDetail,
} from './governanceDashboard'
import {
  buildGovernancePlanAdoptionData,
  type GovernancePlanAdoptionData,
} from './governancePlanAdoption'
import type {
  ImprovementActionChangeType,
  ImprovementActionRiskLevel,
  ImprovementTargetArea,
} from './improvementSuggestion'
import type { ReflectionForImprovement } from './improvementView'
import { listGovernancePlanRecords } from './governanceStore'

export type GovernanceEffectivenessLabel =
  | 'IMPROVING'
  | 'STABLE'
  | 'RECURRING'
  | 'LOW_SIGNAL'
  | 'NEEDS_REVIEW'

export type GovernanceEffectivenessAggregateDimension =
  | 'governanceTheme'
  | 'targetArea'
  | 'changeType'
  | 'targetFileHint'
  | 'riskLevel'

export type GovernanceCampaignEffectiveness = {
  campaignId: string
  campaignTitle: string
  governanceTheme: string
  targetArea: ImprovementTargetArea
  changeType: ImprovementActionChangeType
  status: GovernanceCampaignStatus
  createdAt: string
  completedAt?: string
  relatedActionCount: number
  resolvedActionCount: number
  remainingActionCount: number
  avgProcessingTime: number
  beforeCount: number
  afterCount: number
  changeRate: number
  recurrenceCount: number
  lastRecurrenceAt?: string
  effectivenessLabel: GovernanceEffectivenessLabel
  avgAcceptedRate: number
  highRiskBeforeShare: number
  highRiskAfterShare: number
  highRiskChangeRate: number
  targetFileHints: string[]
  recommendedNextAction: string
  note: string
}

export type GovernanceEffectivenessAggregate = {
  dimension: GovernanceEffectivenessAggregateDimension
  key: string
  label: string
  campaignCount: number
  relatedActionCount: number
  avgAcceptedRate: number
  avgProcessingTime: number
  beforeCount: number
  afterCount: number
  changeRate: number
  recurrenceCount: number
  highRiskBeforeShare: number
  highRiskAfterShare: number
  highRiskChangeRate: number
  effectivenessLabel: GovernanceEffectivenessLabel
  note: string
}

export type GovernanceEffectivenessData = {
  generatedAt: string
  observationWindowDays: number
  summary: {
    completedCampaignCount: number
    inProgressCampaignCount: number
    avgProcessingTime: number
    improvingCampaignCount: number
    highRiskUnimprovedCampaignCount: number
  }
  campaigns: GovernanceCampaignEffectiveness[]
  aggregates: {
    governanceTheme: GovernanceEffectivenessAggregate[]
    targetArea: GovernanceEffectivenessAggregate[]
    changeType: GovernanceEffectivenessAggregate[]
    targetFileHint: GovernanceEffectivenessAggregate[]
    riskLevel: GovernanceEffectivenessAggregate[]
  }
  recurringThemes: Array<{
    governanceTheme: string
    recurrenceCount: number
    lastHitAt?: string
    campaignCount: number
    note: string
  }>
  recurringTargetFiles: Array<{
    targetFileHint: string
    recurrenceCount: number
    lastHitAt?: string
    campaignCount: number
    note: string
  }>
  benefitInsights: {
    topImprovedTargetAreas: GovernanceEffectivenessAggregate[]
    acceptedButWeakChangeTypes: GovernanceEffectivenessAggregate[]
    highReturnChangeTypes: GovernanceEffectivenessAggregate[]
  }
  planAdoption: GovernancePlanAdoptionData
  actorAnalysis: GovernanceActorAnalysisData
  emptyState: {
    hasCampaigns: boolean
    hasCompletedCampaigns: boolean
  }
}

type CampaignEffectivenessInternal = GovernanceCampaignEffectiveness & {
  windowComplete: boolean
  relatedCampaign: GovernanceCampaignDetail
  relatedRiskLevels: ImprovementActionRiskLevel[]
}

function toDate(value?: Date | string): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function share(count: number, total: number): number {
  if (total <= 0) return 0
  return roundToTwo((count / total) * 100)
}

function changeRate(beforeCount: number, afterCount: number): number {
  if (beforeCount <= 0) {
    return afterCount <= 0 ? 0 : 100
  }

  return roundToTwo(((afterCount - beforeCount) / beforeCount) * 100)
}

function getLatestActionTimestamp(item: GovernanceActionDraftItem): Date | null {
  const dates = [item.lastActionAt, item.governanceUpdatedAt]
    .map((value) => toDate(value))
    .filter((value): value is Date => Boolean(value))

  if (dates.length === 0) return null

  return dates.sort((a, b) => b.getTime() - a.getTime())[0]
}

function isResolvedAction(item: GovernanceActionDraftItem): boolean {
  return item.status === 'IMPLEMENTED'
    || item.status === 'VERIFIED'
    || item.status === 'REJECTED'
    || item.governanceStatus === 'ARCHIVED'
}

function getProcessingTimeDays(campaignCreatedAt: Date, item: GovernanceActionDraftItem): number {
  const endAt = getLatestActionTimestamp(item)
  if (!endAt) return 0
  return roundToTwo(Math.max(0, (endAt.getTime() - campaignCreatedAt.getTime()) / (24 * 60 * 60 * 1000)))
}

function matchesCampaignScope(item: GovernanceActionDraftItem, campaign: GovernanceCampaignDetail): boolean {
  const hasFileScope = campaign.targetFileHints.length > 0
  const fileMatched = item.targetFileHint ? campaign.targetFileHints.includes(item.targetFileHint) : false

  return item.governanceTheme === campaign.governanceTheme
    && item.targetArea === campaign.targetArea
    && item.changeType === campaign.changeType
    && (!hasFileScope || fileMatched || !item.targetFileHint)
}

function matchesRecurrenceScope(item: GovernanceActionDraftItem, campaign: GovernanceCampaignDetail): boolean {
  const sameTheme = item.governanceTheme === campaign.governanceTheme
  const sameAreaAndType = item.targetArea === campaign.targetArea && item.changeType === campaign.changeType
  const sameFile = Boolean(item.targetFileHint && campaign.targetFileHints.includes(item.targetFileHint))

  return sameTheme && (sameAreaAndType || sameFile)
}

function buildWindowItems(params: {
  items: GovernanceActionDraftItem[]
  anchorAt: Date
  now: Date
  observationWindowDays: number
}) {
  const windowMs = params.observationWindowDays * 24 * 60 * 60 * 1000
  const beforeStart = params.anchorAt.getTime() - windowMs
  const afterEnd = params.anchorAt.getTime() + windowMs

  const beforeItems = params.items.filter((item) => {
    const createdAt = toDate(item.createdAt)
    return createdAt && createdAt.getTime() >= beforeStart && createdAt.getTime() < params.anchorAt.getTime()
  })
  const afterItems = params.items.filter((item) => {
    const createdAt = toDate(item.createdAt)
    return createdAt && createdAt.getTime() >= params.anchorAt.getTime() && createdAt.getTime() < afterEnd
  })

  return {
    beforeItems,
    afterItems,
    windowComplete: params.now.getTime() >= afterEnd,
  }
}

function classifyEffectiveness(params: {
  beforeCount: number
  afterCount: number
  recurrenceCount: number
  windowComplete: boolean
  remainingActionCount: number
  status: GovernanceCampaignStatus
  highRiskBeforeShare: number
  highRiskAfterShare: number
}): GovernanceEffectivenessLabel {
  const signalCount = params.beforeCount + params.afterCount
  if (!params.windowComplete || signalCount < 2) {
    return 'LOW_SIGNAL'
  }

  if (params.recurrenceCount >= 2 || params.afterCount > params.beforeCount) {
    return 'RECURRING'
  }

  if (params.remainingActionCount > 0 && params.afterCount >= params.beforeCount && params.highRiskAfterShare >= params.highRiskBeforeShare) {
    return 'NEEDS_REVIEW'
  }

  if (params.status === 'COMPLETED' && params.remainingActionCount > 0) {
    return 'NEEDS_REVIEW'
  }

  if (params.afterCount < params.beforeCount && params.highRiskAfterShare <= params.highRiskBeforeShare) {
    return 'IMPROVING'
  }

  if (params.highRiskAfterShare > params.highRiskBeforeShare || params.afterCount === params.beforeCount + 1) {
    return 'NEEDS_REVIEW'
  }

  return 'STABLE'
}

function buildCampaignNote(params: {
  beforeCount: number
  afterCount: number
  recurrenceCount: number
  windowComplete: boolean
  highRiskBeforeShare: number
  highRiskAfterShare: number
  label: GovernanceEffectivenessLabel
  observationWindowDays: number
}): string {
  if (!params.windowComplete) {
    return `观察窗按 ${params.observationWindowDays} 天计算，当前专项后续窗口还未完整结束，先作为趋势观察。`
  }

  if (params.beforeCount + params.afterCount < 2) {
    return '当前专项前后样本不足，先保留为低信号观察，不建议过度解读。'
  }

  switch (params.label) {
    case 'IMPROVING':
      return `观察窗内相关问题从 ${params.beforeCount} 降到 ${params.afterCount}，且高风险占比从 ${params.highRiskBeforeShare}% 降到 ${params.highRiskAfterShare}%。`
    case 'RECURRING':
      return `专项后仍复发 ${params.recurrenceCount} 次，且观察窗内问题没有明显下降。`
    case 'NEEDS_REVIEW':
      return `当前高风险占比或剩余未闭环动作没有明显下降，建议回看治理范围和执行质量。`
    case 'STABLE':
      return `观察窗内相关问题从 ${params.beforeCount} 变到 ${params.afterCount}，整体基本稳定。`
    case 'LOW_SIGNAL':
    default:
      return '当前样本或观察窗口不足，先继续观察。'
  }
}

function buildCampaignEffectiveness(params: {
  campaign: GovernanceCampaignDetail
  actionDrafts: GovernanceActionDraftItem[]
  now: Date
  observationWindowDays: number
}): CampaignEffectivenessInternal {
  const campaignCreatedAt = toDate(params.campaign.createdAt) || params.now
  const campaignCompletedAt = toDate(params.campaign.completedAt)
  const anchorAt = campaignCompletedAt || campaignCreatedAt
  const scopeItems = params.actionDrafts.filter((item) => matchesCampaignScope(item, params.campaign))
  const { beforeItems, afterItems, windowComplete } = buildWindowItems({
    items: scopeItems,
    anchorAt,
    now: params.now,
    observationWindowDays: params.observationWindowDays,
  })
  const recurrenceItems = campaignCompletedAt
    ? params.actionDrafts.filter((item) => {
        const createdAt = toDate(item.createdAt)
        return createdAt
          && createdAt.getTime() > campaignCompletedAt.getTime()
          && !params.campaign.relatedActionDraftIds.includes(item.id)
          && matchesRecurrenceScope(item, params.campaign)
      })
    : []

  const resolvedActions = params.campaign.relatedActions.filter((item) => isResolvedAction(item))
  const resolvedActionCount = resolvedActions.length
  const remainingActionCount = Math.max(0, params.campaign.relatedActions.length - resolvedActionCount)
  const processingTimes = resolvedActions
    .map((item) => getProcessingTimeDays(campaignCreatedAt, item))
    .filter((value) => value > 0)
  const beforeHighRiskCount = beforeItems.filter((item) => item.riskLevel === 'HIGH').length
  const afterHighRiskCount = afterItems.filter((item) => item.riskLevel === 'HIGH').length
  const highRiskBeforeShare = share(beforeHighRiskCount, beforeItems.length)
  const highRiskAfterShare = share(afterHighRiskCount, afterItems.length)
  const label = classifyEffectiveness({
    beforeCount: beforeItems.length,
    afterCount: afterItems.length,
    recurrenceCount: recurrenceItems.length,
    windowComplete,
    remainingActionCount,
    status: params.campaign.status,
    highRiskBeforeShare,
    highRiskAfterShare,
  })

  return {
    campaignId: params.campaign.id,
    campaignTitle: params.campaign.campaignTitle,
    governanceTheme: params.campaign.governanceTheme,
    targetArea: params.campaign.targetArea,
    changeType: params.campaign.changeType,
    status: params.campaign.status,
    createdAt: params.campaign.createdAt,
    completedAt: params.campaign.completedAt,
    relatedActionCount: params.campaign.relatedActions.length,
    resolvedActionCount,
    remainingActionCount,
    avgProcessingTime: processingTimes.length > 0
      ? average(processingTimes)
      : campaignCompletedAt
        ? roundToTwo((campaignCompletedAt.getTime() - campaignCreatedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 0,
    beforeCount: beforeItems.length,
    afterCount: afterItems.length,
    changeRate: changeRate(beforeItems.length, afterItems.length),
    recurrenceCount: recurrenceItems.length,
    lastRecurrenceAt: recurrenceItems
      .map((item) => item.createdAt)
      .sort((a, b) => b.localeCompare(a))[0],
    effectivenessLabel: label,
    avgAcceptedRate: average(params.campaign.relatedActions.map((item) => item.changeTypeAcceptedRate)),
    highRiskBeforeShare,
    highRiskAfterShare,
    highRiskChangeRate: roundToTwo(highRiskAfterShare - highRiskBeforeShare),
    targetFileHints: params.campaign.targetFileHints,
    recommendedNextAction: params.campaign.recommendedNextAction,
    note: buildCampaignNote({
      beforeCount: beforeItems.length,
      afterCount: afterItems.length,
      recurrenceCount: recurrenceItems.length,
      windowComplete,
      highRiskBeforeShare,
      highRiskAfterShare,
      label,
      observationWindowDays: params.observationWindowDays,
    }),
    windowComplete,
    relatedCampaign: params.campaign,
    relatedRiskLevels: Array.from(new Set(params.campaign.relatedActions.map((item) => item.riskLevel))),
  }
}

function deriveAggregateLabel(items: CampaignEffectivenessInternal[]): GovernanceEffectivenessLabel {
  const completedOrObserved = items.filter((item) => item.windowComplete)
  if (completedOrObserved.length === 0) return 'LOW_SIGNAL'

  const beforeCount = items.reduce((sum, item) => sum + item.beforeCount, 0)
  const afterCount = items.reduce((sum, item) => sum + item.afterCount, 0)
  const recurrenceCount = items.reduce((sum, item) => sum + item.recurrenceCount, 0)
  const remainingActionCount = items.reduce((sum, item) => sum + item.remainingActionCount, 0)
  const highRiskBeforeShare = average(items.map((item) => item.highRiskBeforeShare))
  const highRiskAfterShare = average(items.map((item) => item.highRiskAfterShare))

  return classifyEffectiveness({
    beforeCount,
    afterCount,
    recurrenceCount,
    windowComplete: true,
    remainingActionCount,
    status: 'COMPLETED',
    highRiskBeforeShare,
    highRiskAfterShare,
  })
}

function buildAggregateNote(label: GovernanceEffectivenessLabel, beforeCount: number, afterCount: number, recurrenceCount: number): string {
  switch (label) {
    case 'IMPROVING':
      return `汇总观察窗内相关问题从 ${beforeCount} 降到 ${afterCount}，当前呈改善趋势。`
    case 'RECURRING':
      return `汇总后仍累计复发 ${recurrenceCount} 次，建议继续推进下一轮专项治理。`
    case 'NEEDS_REVIEW':
      return '治理动作已投入，但高风险或剩余问题没有明显改善，需要复盘范围和执行方式。'
    case 'STABLE':
      return `汇总后前后变化有限，从 ${beforeCount} 变到 ${afterCount}。`
    case 'LOW_SIGNAL':
    default:
      return '当前样本不足，先作为观察项保留。'
  }
}

function buildAggregateItem(params: {
  dimension: GovernanceEffectivenessAggregateDimension
  key: string
  label: string
  campaigns: CampaignEffectivenessInternal[]
}): GovernanceEffectivenessAggregate {
  const beforeCount = params.campaigns.reduce((sum, item) => sum + item.beforeCount, 0)
  const afterCount = params.campaigns.reduce((sum, item) => sum + item.afterCount, 0)
  const recurrenceCount = params.campaigns.reduce((sum, item) => sum + item.recurrenceCount, 0)
  const label = deriveAggregateLabel(params.campaigns)

  return {
    dimension: params.dimension,
    key: params.key,
    label: params.label,
    campaignCount: params.campaigns.length,
    relatedActionCount: params.campaigns.reduce((sum, item) => sum + item.relatedActionCount, 0),
    avgAcceptedRate: average(params.campaigns.map((item) => item.avgAcceptedRate)),
    avgProcessingTime: average(params.campaigns.map((item) => item.avgProcessingTime).filter((item) => item > 0)),
    beforeCount,
    afterCount,
    changeRate: changeRate(beforeCount, afterCount),
    recurrenceCount,
    highRiskBeforeShare: average(params.campaigns.map((item) => item.highRiskBeforeShare)),
    highRiskAfterShare: average(params.campaigns.map((item) => item.highRiskAfterShare)),
    highRiskChangeRate: roundToTwo(
      average(params.campaigns.map((item) => item.highRiskAfterShare))
      - average(params.campaigns.map((item) => item.highRiskBeforeShare))
    ),
    effectivenessLabel: label,
    note: buildAggregateNote(label, beforeCount, afterCount, recurrenceCount),
  }
}

function buildGroupedAggregates<T extends string>(params: {
  dimension: GovernanceEffectivenessAggregateDimension
  keys: T[]
  labelOf: (key: T) => string
  include: (campaign: CampaignEffectivenessInternal, key: T) => boolean
  campaigns: CampaignEffectivenessInternal[]
}): GovernanceEffectivenessAggregate[] {
  return params.keys
    .map((key) => {
      const relatedCampaigns = params.campaigns.filter((campaign) => params.include(campaign, key))
      if (relatedCampaigns.length === 0) return null

      return buildAggregateItem({
        dimension: params.dimension,
        key,
        label: params.labelOf(key),
        campaigns: relatedCampaigns,
      })
    })
    .filter((item): item is GovernanceEffectivenessAggregate => Boolean(item))
    .sort((a, b) => {
      if (a.effectivenessLabel !== b.effectivenessLabel) {
        const weight: Record<GovernanceEffectivenessLabel, number> = {
          IMPROVING: 5,
          STABLE: 4,
          RECURRING: 3,
          NEEDS_REVIEW: 2,
          LOW_SIGNAL: 1,
        }
        return weight[b.effectivenessLabel] - weight[a.effectivenessLabel]
      }

      if (a.changeRate !== b.changeRate) {
        return a.changeRate - b.changeRate
      }

      return b.relatedActionCount - a.relatedActionCount
    })
}

function buildRecurringThemes(campaigns: CampaignEffectivenessInternal[]) {
  const map = new Map<string, { recurrenceCount: number; lastHitAt?: string; campaignCount: number }>()

  campaigns.forEach((campaign) => {
    const current = map.get(campaign.governanceTheme) || { recurrenceCount: 0, lastHitAt: undefined, campaignCount: 0 }
    current.recurrenceCount += campaign.recurrenceCount
    current.campaignCount += 1
    if (campaign.lastRecurrenceAt && (!current.lastHitAt || campaign.lastRecurrenceAt > current.lastHitAt)) {
      current.lastHitAt = campaign.lastRecurrenceAt
    }
    map.set(campaign.governanceTheme, current)
  })

  return Array.from(map.entries())
    .map(([governanceTheme, item]) => ({
      governanceTheme,
      recurrenceCount: item.recurrenceCount,
      lastHitAt: item.lastHitAt,
      campaignCount: item.campaignCount,
      note: item.recurrenceCount > 0
        ? `治理后仍有 ${item.recurrenceCount} 次复发，可进入下一轮治理候选。`
        : '当前未观察到明显复发。',
    }))
    .sort((a, b) => {
      if (b.recurrenceCount !== a.recurrenceCount) {
        return b.recurrenceCount - a.recurrenceCount
      }
      return (b.lastHitAt || '').localeCompare(a.lastHitAt || '')
    })
    .slice(0, 8)
}

function buildRecurringTargetFiles(campaigns: CampaignEffectivenessInternal[]) {
  const map = new Map<string, { recurrenceCount: number; lastHitAt?: string; campaignIds: Set<string> }>()

  campaigns.forEach((campaign) => {
    campaign.targetFileHints.forEach((targetFileHint) => {
      const current = map.get(targetFileHint) || { recurrenceCount: 0, lastHitAt: undefined, campaignIds: new Set<string>() }
      current.recurrenceCount += campaign.recurrenceCount
      current.campaignIds.add(campaign.campaignId)
      if (campaign.lastRecurrenceAt && (!current.lastHitAt || campaign.lastRecurrenceAt > current.lastHitAt)) {
        current.lastHitAt = campaign.lastRecurrenceAt
      }
      map.set(targetFileHint, current)
    })
  })

  return Array.from(map.entries())
    .map(([targetFileHint, item]) => ({
      targetFileHint,
      recurrenceCount: item.recurrenceCount,
      lastHitAt: item.lastHitAt,
      campaignCount: item.campaignIds.size,
      note: item.recurrenceCount > 0
        ? '同文件治理后仍持续命中，适合作为下一轮专项入口。'
        : '当前文件暂无明显复发。',
    }))
    .sort((a, b) => {
      if (b.recurrenceCount !== a.recurrenceCount) {
        return b.recurrenceCount - a.recurrenceCount
      }
      return (b.lastHitAt || '').localeCompare(a.lastHitAt || '')
    })
    .slice(0, 8)
}

export function buildGovernanceEffectivenessData(params: {
  approvedReflections: ReflectionForImprovement[]
  now?: Date
  observationWindowDays?: number
}): GovernanceEffectivenessData {
  const now = params.now || new Date()
  const observationWindowDays = params.observationWindowDays || 14
  const governanceData = buildGovernanceDashboardData({
    approvedReflections: params.approvedReflections,
    now,
  })

  const campaigns = governanceData.campaigns
    .map((campaign) => buildCampaignEffectiveness({
      campaign,
      actionDrafts: governanceData.actionDrafts,
      now,
      observationWindowDays,
    }))
    .sort((a, b) => {
      if (a.effectivenessLabel !== b.effectivenessLabel) {
        const weight: Record<GovernanceEffectivenessLabel, number> = {
          RECURRING: 5,
          NEEDS_REVIEW: 4,
          LOW_SIGNAL: 3,
          STABLE: 2,
          IMPROVING: 1,
        }
        return weight[b.effectivenessLabel] - weight[a.effectivenessLabel]
      }

      return (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt)
    })

  const governanceThemes = Array.from(new Set(campaigns.map((item) => item.governanceTheme)))
  const targetAreas = Array.from(new Set(campaigns.map((item) => item.targetArea)))
  const changeTypes = Array.from(new Set(campaigns.map((item) => item.changeType)))
  const targetFileHints = Array.from(new Set(campaigns.flatMap((item) => item.targetFileHints)))
  const riskLevels: ImprovementActionRiskLevel[] = ['HIGH', 'MEDIUM', 'LOW']

  const aggregates = {
    governanceTheme: buildGroupedAggregates({
      dimension: 'governanceTheme',
      keys: governanceThemes,
      labelOf: (key) => key,
      include: (campaign, key) => campaign.governanceTheme === key,
      campaigns,
    }),
    targetArea: buildGroupedAggregates({
      dimension: 'targetArea',
      keys: targetAreas,
      labelOf: (key) => key,
      include: (campaign, key) => campaign.targetArea === key,
      campaigns,
    }),
    changeType: buildGroupedAggregates({
      dimension: 'changeType',
      keys: changeTypes,
      labelOf: (key) => key,
      include: (campaign, key) => campaign.changeType === key,
      campaigns,
    }),
    targetFileHint: buildGroupedAggregates({
      dimension: 'targetFileHint',
      keys: targetFileHints,
      labelOf: (key) => key,
      include: (campaign, key) => campaign.targetFileHints.includes(key),
      campaigns,
    }),
    riskLevel: buildGroupedAggregates({
      dimension: 'riskLevel',
      keys: riskLevels,
      labelOf: (key) => key,
      include: (campaign, key) => campaign.relatedRiskLevels.includes(key),
      campaigns,
    }),
  }

  const avgProcessingTime = average(campaigns.map((item) => item.avgProcessingTime).filter((item) => item > 0))
  const publicCampaigns = campaigns.map(({ windowComplete, relatedCampaign, relatedRiskLevels, ...item }) => item)
  const planAdoption = buildGovernancePlanAdoptionData({
    planRecords: listGovernancePlanRecords(),
    campaigns: governanceData.campaigns,
    effectivenessCampaigns: publicCampaigns,
  })
  const actorAnalysis = buildGovernanceActorAnalysisData({
    planRecords: listGovernancePlanRecords(),
    adoptionData: planAdoption,
  })

  return {
    generatedAt: governanceData.generatedAt,
    observationWindowDays,
    summary: {
      completedCampaignCount: campaigns.filter((item) => item.status === 'COMPLETED').length,
      inProgressCampaignCount: campaigns.filter((item) => item.status === 'NEW' || item.status === 'IN_GOVERNANCE').length,
      avgProcessingTime,
      improvingCampaignCount: campaigns.filter((item) => item.effectivenessLabel === 'IMPROVING').length,
      highRiskUnimprovedCampaignCount: campaigns.filter((item) => {
        const hasHighRisk = item.relatedCampaign.relatedActions.some((action) => action.riskLevel === 'HIGH')
        return hasHighRisk && (item.effectivenessLabel === 'RECURRING' || item.effectivenessLabel === 'NEEDS_REVIEW')
      }).length,
    },
    campaigns: publicCampaigns,
    aggregates,
    recurringThemes: buildRecurringThemes(campaigns),
    recurringTargetFiles: buildRecurringTargetFiles(campaigns),
    benefitInsights: {
      topImprovedTargetAreas: aggregates.targetArea
        .filter((item) => item.effectivenessLabel === 'IMPROVING')
        .sort((a, b) => a.changeRate - b.changeRate)
        .slice(0, 5),
      acceptedButWeakChangeTypes: aggregates.changeType
        .filter((item) => item.avgAcceptedRate >= 60 && item.effectivenessLabel !== 'IMPROVING')
        .sort((a, b) => b.avgAcceptedRate - a.avgAcceptedRate)
        .slice(0, 5),
      highReturnChangeTypes: aggregates.changeType
        .filter((item) => item.relatedActionCount <= 3 && item.effectivenessLabel === 'IMPROVING')
        .sort((a, b) => a.changeRate - b.changeRate)
        .slice(0, 5),
    },
    planAdoption,
      actorAnalysis,
    emptyState: {
      hasCampaigns: campaigns.length > 0,
      hasCompletedCampaigns: campaigns.some((item) => item.status === 'COMPLETED'),
    },
  }
}