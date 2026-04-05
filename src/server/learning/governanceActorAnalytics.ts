import {
  toGovernanceActorAnalyticsIdentity,
  type GovernanceActorAnalyticsIdentity,
} from '@/lib/actorIdentity'
import type {
  GovernancePlanAdoptionData,
  GovernancePlanAdoptionEffect,
  GovernanceRecommendationQualityLabel,
} from './governancePlanAdoption'
import type { GovernancePlanDecisionType, GovernancePlanRecord } from './governancePlanning'

export type GovernanceActorRecommendationQualityDistribution = Record<GovernanceRecommendationQualityLabel, number>

export type GovernanceActorBehaviorSummary = {
  actor: GovernanceActorAnalyticsIdentity
  handledPlanCount: number
  decisionCount: number
  outcomePlanCount: number
  acceptedCount: number
  dismissedCount: number
  mergedCount: number
  batchCreatedCount: number
  acceptRate: number
  dismissRate: number
  mergeRate: number
  batchCreatedRate: number
  enteredExecutionCount: number
  enteredExecutionRate: number
  improvingCount: number
  improvingRate: number
  recurringAfterAdoptionCount: number
  recurringAfterAdoptionRate: number
  dismissedRecurringCount: number
  highRiskHandledCount: number
  highRiskImprovingCount: number
  highRiskImprovingRate: number
  recommendationQualityDistribution: GovernanceActorRecommendationQualityDistribution
}

export type GovernanceActorThemeAnalysis = {
  actor: GovernanceActorAnalyticsIdentity
  governanceTheme: string
  planCount: number
  decisionCount: number
  acceptedCount: number
  dismissedCount: number
  mergedCount: number
  batchCreatedCount: number
  acceptRate: number
  dismissRate: number
  mergeRate: number
  batchCreatedRate: number
  enteredExecutionCount: number
  enteredExecutionRate: number
  improvingCount: number
  improvingRate: number
  recurringAfterAdoptionCount: number
  recurrenceRate: number
  recommendationQualityDistribution: GovernanceActorRecommendationQualityDistribution
}

export type GovernanceActorAnomalySignalType =
  | 'DISMISS_HIGH_RECURRING'
  | 'ACCEPT_LOW_EXECUTION'
  | 'MERGE_WEAK_OUTCOME'

export type GovernanceActorAnomalySignal = {
  actor: GovernanceActorAnalyticsIdentity
  signalType: GovernanceActorAnomalySignalType
  headline: string
  detail: string
}

export type GovernanceActorAnalysisData = {
  summary: {
    actorCount: number
    realActorCount: number
    fallbackActorCount: number
    handledPlanCount: number
  }
  actors: GovernanceActorBehaviorSummary[]
  realActors: GovernanceActorBehaviorSummary[]
  fallbackActors: GovernanceActorBehaviorSummary[]
  themeActorRows: GovernanceActorThemeAnalysis[]
  anomalySignals: GovernanceActorAnomalySignal[]
  emptyState: {
    hasActorData: boolean
    hasRealActorData: boolean
  }
}

type MutableActorBehaviorSummary = {
  actor: GovernanceActorAnalyticsIdentity
  handledPlanIds: Set<string>
  handledThemes: Set<string>
  decisionCount: number
  outcomePlanCount: number
  acceptedCount: number
  dismissedCount: number
  mergedCount: number
  batchCreatedCount: number
  enteredExecutionCount: number
  improvingCount: number
  recurringAfterAdoptionCount: number
  dismissedRecurringCount: number
  highRiskHandledCount: number
  highRiskImprovingCount: number
  recommendationQualityDistribution: GovernanceActorRecommendationQualityDistribution
}

type MutableThemeAnalysis = {
  actor: GovernanceActorAnalyticsIdentity
  governanceTheme: string
  planIds: Set<string>
  decisionCount: number
  outcomePlanCount: number
  acceptedCount: number
  dismissedCount: number
  mergedCount: number
  batchCreatedCount: number
  enteredExecutionCount: number
  improvingCount: number
  recurringAfterAdoptionCount: number
  recommendationQualityDistribution: GovernanceActorRecommendationQualityDistribution
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function rate(count: number, total: number): number {
  if (total <= 0) return 0
  return roundToTwo((count / total) * 100)
}

function createRecommendationQualityDistribution(): GovernanceActorRecommendationQualityDistribution {
  return {
    HIGH_VALUE: 0,
    PLAUSIBLE: 0,
    MISSED_BUT_RECURRING: 0,
    LOW_VALUE: 0,
    UNCLEAR: 0,
  }
}

function createActorAccumulator(actor: GovernanceActorAnalyticsIdentity): MutableActorBehaviorSummary {
  return {
    actor,
    handledPlanIds: new Set<string>(),
    handledThemes: new Set<string>(),
    decisionCount: 0,
    outcomePlanCount: 0,
    acceptedCount: 0,
    dismissedCount: 0,
    mergedCount: 0,
    batchCreatedCount: 0,
    enteredExecutionCount: 0,
    improvingCount: 0,
    recurringAfterAdoptionCount: 0,
    dismissedRecurringCount: 0,
    highRiskHandledCount: 0,
    highRiskImprovingCount: 0,
    recommendationQualityDistribution: createRecommendationQualityDistribution(),
  }
}

function createThemeAccumulator(actor: GovernanceActorAnalyticsIdentity, governanceTheme: string): MutableThemeAnalysis {
  return {
    actor,
    governanceTheme,
    planIds: new Set<string>(),
    decisionCount: 0,
    outcomePlanCount: 0,
    acceptedCount: 0,
    dismissedCount: 0,
    mergedCount: 0,
    batchCreatedCount: 0,
    enteredExecutionCount: 0,
    improvingCount: 0,
    recurringAfterAdoptionCount: 0,
    recommendationQualityDistribution: createRecommendationQualityDistribution(),
  }
}

function incrementDecisionCount(target: {
  acceptedCount: number
  dismissedCount: number
  mergedCount: number
  batchCreatedCount: number
}, decisionType?: GovernancePlanDecisionType) {
  switch (decisionType) {
    case 'ACCEPT':
      target.acceptedCount += 1
      break
    case 'DISMISS':
      target.dismissedCount += 1
      break
    case 'MERGE':
      target.mergedCount += 1
      break
    case 'CREATE_BATCH':
      target.batchCreatedCount += 1
      break
  }
}

function toBehaviorSummary(item: MutableActorBehaviorSummary): GovernanceActorBehaviorSummary {
  return {
    actor: item.actor,
    handledPlanCount: item.handledPlanIds.size,
    decisionCount: item.decisionCount,
    outcomePlanCount: item.outcomePlanCount,
    acceptedCount: item.acceptedCount,
    dismissedCount: item.dismissedCount,
    mergedCount: item.mergedCount,
    batchCreatedCount: item.batchCreatedCount,
    acceptRate: rate(item.acceptedCount, item.decisionCount),
    dismissRate: rate(item.dismissedCount, item.decisionCount),
    mergeRate: rate(item.mergedCount, item.decisionCount),
    batchCreatedRate: rate(item.batchCreatedCount, item.decisionCount),
    enteredExecutionCount: item.enteredExecutionCount,
    enteredExecutionRate: rate(item.enteredExecutionCount, item.outcomePlanCount),
    improvingCount: item.improvingCount,
    improvingRate: rate(item.improvingCount, item.enteredExecutionCount || item.outcomePlanCount),
    recurringAfterAdoptionCount: item.recurringAfterAdoptionCount,
    recurringAfterAdoptionRate: rate(item.recurringAfterAdoptionCount, item.enteredExecutionCount || item.outcomePlanCount),
    dismissedRecurringCount: item.dismissedRecurringCount,
    highRiskHandledCount: item.highRiskHandledCount,
    highRiskImprovingCount: item.highRiskImprovingCount,
    highRiskImprovingRate: rate(item.highRiskImprovingCount, item.highRiskHandledCount),
    recommendationQualityDistribution: item.recommendationQualityDistribution,
  }
}

function toThemeAnalysis(item: MutableThemeAnalysis): GovernanceActorThemeAnalysis {
  return {
    actor: item.actor,
    governanceTheme: item.governanceTheme,
    planCount: item.planIds.size,
    decisionCount: item.decisionCount,
    acceptedCount: item.acceptedCount,
    dismissedCount: item.dismissedCount,
    mergedCount: item.mergedCount,
    batchCreatedCount: item.batchCreatedCount,
    acceptRate: rate(item.acceptedCount, item.decisionCount),
    dismissRate: rate(item.dismissedCount, item.decisionCount),
    mergeRate: rate(item.mergedCount, item.decisionCount),
    batchCreatedRate: rate(item.batchCreatedCount, item.decisionCount),
    enteredExecutionCount: item.enteredExecutionCount,
    enteredExecutionRate: rate(item.enteredExecutionCount, item.outcomePlanCount),
    improvingCount: item.improvingCount,
    improvingRate: rate(item.improvingCount, item.enteredExecutionCount || item.outcomePlanCount),
    recurringAfterAdoptionCount: item.recurringAfterAdoptionCount,
    recurrenceRate: rate(item.recurringAfterAdoptionCount, item.enteredExecutionCount || item.outcomePlanCount),
    recommendationQualityDistribution: item.recommendationQualityDistribution,
  }
}

function sortBehaviorSummaries(items: GovernanceActorBehaviorSummary[]): GovernanceActorBehaviorSummary[] {
  return [...items].sort((a, b) => {
    if (b.handledPlanCount !== a.handledPlanCount) {
      return b.handledPlanCount - a.handledPlanCount
    }

    if (b.decisionCount !== a.decisionCount) {
      return b.decisionCount - a.decisionCount
    }

    return a.actor.actorLabel.localeCompare(b.actor.actorLabel)
  })
}

function sortThemeRows(items: GovernanceActorThemeAnalysis[]): GovernanceActorThemeAnalysis[] {
  return [...items].sort((a, b) => {
    if (b.planCount !== a.planCount) {
      return b.planCount - a.planCount
    }

    if (b.acceptRate !== a.acceptRate) {
      return b.acceptRate - a.acceptRate
    }

    if (b.improvingRate !== a.improvingRate) {
      return b.improvingRate - a.improvingRate
    }

    if (a.governanceTheme !== b.governanceTheme) {
      return a.governanceTheme.localeCompare(b.governanceTheme)
    }

    return a.actor.actorLabel.localeCompare(b.actor.actorLabel)
  })
}

function buildAnomalySignals(items: GovernanceActorBehaviorSummary[]): GovernanceActorAnomalySignal[] {
  const signals: Array<GovernanceActorAnomalySignal & { severity: number }> = []

  items.forEach((item) => {
    if (item.dismissedCount > 0 && item.dismissedRecurringCount > 0) {
      signals.push({
        actor: item.actor,
        signalType: 'DISMISS_HIGH_RECURRING',
        headline: `${item.actor.actorLabel} 忽略较多且后续仍有复发`,
        detail: `累计忽略 ${item.dismissedCount} 次，其中 ${item.dismissedRecurringCount} 条后续仍复发。`,
        severity: item.dismissedRecurringCount * 10 + item.dismissedCount,
      })
    }

    if (item.acceptedCount >= 2 && item.enteredExecutionRate < 50) {
      signals.push({
        actor: item.actor,
        signalType: 'ACCEPT_LOW_EXECUTION',
        headline: `${item.actor.actorLabel} 采纳较多但进入执行偏低`,
        detail: `累计采纳 ${item.acceptedCount} 次，但进入执行率只有 ${item.enteredExecutionRate}%。`,
        severity: item.acceptedCount * 10 + Math.max(0, 50 - item.enteredExecutionRate),
      })
    }

    if (item.mergedCount > 0 && item.outcomePlanCount > 0 && item.improvingRate < 50) {
      signals.push({
        actor: item.actor,
        signalType: 'MERGE_WEAK_OUTCOME',
        headline: `${item.actor.actorLabel} 经常 merge 到专项但成效一般`,
        detail: `累计 merge ${item.mergedCount} 次，当前改善率 ${item.improvingRate}%，复发率 ${item.recurringAfterAdoptionRate}%。`,
        severity: item.mergedCount * 10 + Math.max(0, 50 - item.improvingRate),
      })
    }
  })

  return signals
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 8)
    .map(({ severity, ...item }) => item)
}

function getAdoptionEffectMap(adoptionData: GovernancePlanAdoptionData): Map<string, GovernancePlanAdoptionEffect> {
  return new Map(adoptionData.items.map((item) => [item.planId, item]))
}

export function buildGovernanceActorAnalysisData(params: {
  planRecords: GovernancePlanRecord[]
  adoptionData: GovernancePlanAdoptionData
}): GovernanceActorAnalysisData {
  const adoptionEffectMap = getAdoptionEffectMap(params.adoptionData)
  const actorSummaryMap = new Map<string, MutableActorBehaviorSummary>()
  const themeAnalysisMap = new Map<string, MutableThemeAnalysis>()

  function ensureActorSummary(actor: GovernanceActorAnalyticsIdentity): MutableActorBehaviorSummary {
    const current = actorSummaryMap.get(actor.actorId)
    if (current) {
      return current
    }

    const created = createActorAccumulator(actor)
    actorSummaryMap.set(actor.actorId, created)
    return created
  }

  function ensureThemeAnalysis(actor: GovernanceActorAnalyticsIdentity, governanceTheme: string): MutableThemeAnalysis {
    const key = `${actor.actorId}::${governanceTheme}`
    const current = themeAnalysisMap.get(key)
    if (current) {
      return current
    }

    const created = createThemeAccumulator(actor, governanceTheme)
    themeAnalysisMap.set(key, created)
    return created
  }

  params.planRecords.forEach((record) => {
    const effect = adoptionEffectMap.get(record.plan.id)
    if (!effect) {
      return
    }

    const governanceTheme = record.plan.governanceTheme

    record.decisionHistory.forEach((decision) => {
      const decisionActor = toGovernanceActorAnalyticsIdentity(decision.decisionActor, decision.decisionBy)
      const actorSummary = ensureActorSummary(decisionActor)
      actorSummary.handledPlanIds.add(record.plan.id)
      actorSummary.handledThemes.add(governanceTheme)
      actorSummary.decisionCount += 1
      incrementDecisionCount(actorSummary, decision.decisionType)

      const themeSummary = ensureThemeAnalysis(decisionActor, governanceTheme)
      themeSummary.planIds.add(record.plan.id)
      themeSummary.decisionCount += 1
      incrementDecisionCount(themeSummary, decision.decisionType)
    })

    const actorSummary = ensureActorSummary(effect.actor)
    actorSummary.handledPlanIds.add(record.plan.id)
    actorSummary.handledThemes.add(governanceTheme)
    actorSummary.outcomePlanCount += 1
    actorSummary.recommendationQualityDistribution[effect.recommendationQualityLabel] += 1

    const themeSummary = ensureThemeAnalysis(effect.actor, governanceTheme)
    themeSummary.planIds.add(record.plan.id)
    themeSummary.outcomePlanCount += 1
    themeSummary.recommendationQualityDistribution[effect.recommendationQualityLabel] += 1

    if (effect.enteredExecution) {
      actorSummary.enteredExecutionCount += 1
      themeSummary.enteredExecutionCount += 1
    }

    if (effect.effectivenessLabel === 'IMPROVING') {
      actorSummary.improvingCount += 1
      themeSummary.improvingCount += 1
    }

    if (record.status !== 'DISMISSED' && effect.recurrenceCount > 0) {
      actorSummary.recurringAfterAdoptionCount += 1
      themeSummary.recurringAfterAdoptionCount += 1
    }

    if (effect.recommendationQualityLabel === 'MISSED_BUT_RECURRING') {
      actorSummary.dismissedRecurringCount += 1
    }

    if (effect.highRiskBeforeShare > 0) {
      actorSummary.highRiskHandledCount += 1
      if (effect.effectivenessLabel === 'IMPROVING') {
        actorSummary.highRiskImprovingCount += 1
      }
    }
  })

  const actors = sortBehaviorSummaries(Array.from(actorSummaryMap.values()).map((item) => toBehaviorSummary(item)))
  const realActors = actors.filter((item) => !item.actor.isFallbackActor)
  const fallbackActors = actors.filter((item) => item.actor.isFallbackActor)
  const themeActorRows = sortThemeRows(Array.from(themeAnalysisMap.values()).map((item) => toThemeAnalysis(item)))

  return {
    summary: {
      actorCount: actors.length,
      realActorCount: realActors.length,
      fallbackActorCount: fallbackActors.length,
      handledPlanCount: params.planRecords.length,
    },
    actors,
    realActors,
    fallbackActors,
    themeActorRows,
    anomalySignals: buildAnomalySignals(actors),
    emptyState: {
      hasActorData: actors.length > 0,
      hasRealActorData: realActors.length > 0,
    },
  }
}