import type { GovernanceActorAnalyticsIdentity } from '@/lib/actorIdentity'
import type {
  GovernanceActorAnalysisData,
  GovernanceActorBehaviorSummary,
  GovernanceActorThemeAnalysis,
} from './governanceActorAnalytics'
import type { GovernanceCampaignEffectiveness } from './governanceEffectiveness'
import type { GovernancePlanAdoptionData } from './governancePlanAdoption'
import type { ImprovementActionChangeType, ImprovementActionRiskLevel, ImprovementTargetArea } from './improvementSuggestion'
import type { GovernancePlanType } from './governancePlanning'

export type GovernanceActorRecommendationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export type GovernanceActorRecommendationSignalType =
  | 'THEME_EXPERIENCE'
  | 'THEME_ACCEPT_RATE'
  | 'THEME_DISMISS_RATE'
  | 'THEME_EXECUTION_RATE'
  | 'THEME_IMPROVING_RATE'
  | 'THEME_RECURRENCE_RATE'
  | 'TARGET_AREA_MATCH'
  | 'CHANGE_TYPE_MATCH'
  | 'FILE_HINT_MATCH'
  | 'HIGH_RISK_MATCH'
  | 'RECENT_ACTIVITY'
  | 'OVERALL_DISMISS_RATE'
  | 'WEAK_OUTCOME'
  | 'LOW_SAMPLE'
  | 'FALLBACK_ONLY_HISTORY'

export type GovernanceActorRecommendationSignal = {
  signalType: GovernanceActorRecommendationSignalType
  direction: 'positive' | 'negative'
  weight: number
  summary: string
  metricValue?: number
}

export type GovernanceActorCandidateRecommendation = {
  actor: GovernanceActorAnalyticsIdentity
  recommendationScore: number
  recommendationConfidence: GovernanceActorRecommendationConfidence
  recommendationReason: string
  basedOnSignals: GovernanceActorRecommendationSignal[]
}

export type GovernanceActorRecommendation = {
  recommendedActorId?: string
  recommendedActorName?: string
  candidateActors: GovernanceActorCandidateRecommendation[]
  recommendationScore: number
  recommendationConfidence: GovernanceActorRecommendationConfidence
  recommendationReason: string
  basedOnSignals: GovernanceActorRecommendationSignal[]
  hasClearRecommendation: boolean
  noRecommendationReason?: string
}

export type GovernancePlanActorRecommendationInput = {
  planType: GovernancePlanType
  governanceTheme: string
  targetArea: ImprovementTargetArea
  changeType?: ImprovementActionChangeType
  targetFileHints: string[]
  riskLevel?: ImprovementActionRiskLevel
  whyNow: string
}

export type GovernancePlanActorRecommendations = {
  approval: GovernanceActorRecommendation
  execution: GovernanceActorRecommendation
}

export type GovernanceThemeActorRecommendation = {
  governanceTheme: string
  recommendation: GovernanceActorRecommendation
}

type RecommendationProfile = 'APPROVAL' | 'EXECUTION' | 'THEME_OWNER'

type ContextAccumulator = {
  planCount: number
  enteredExecutionCount: number
  improvingCount: number
  recurringCount: number
  recentCount30d: number
  lastHandledAt?: string
}

type ActorRecommendationHistory = {
  theme: Map<string, ContextAccumulator>
  targetArea: Map<string, ContextAccumulator>
  changeType: Map<string, ContextAccumulator>
  targetFileHint: Map<string, ContextAccumulator>
  recentCount30d: number
  lastHandledAt?: string
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function createAccumulator(): ContextAccumulator {
  return {
    planCount: 0,
    enteredExecutionCount: 0,
    improvingCount: 0,
    recurringCount: 0,
    recentCount30d: 0,
  }
}

function rate(count: number, total: number): number {
  if (total <= 0) return 0
  return roundToTwo((count / total) * 100)
}

function daysBetween(now: Date, value?: string): number | undefined {
  if (!value) return undefined
  return Math.floor((now.getTime() - new Date(value).getTime()) / (24 * 60 * 60 * 1000))
}

function isRecent(now: Date, value?: string): boolean {
  const days = daysBetween(now, value)
  return typeof days === 'number' && days >= 0 && days <= 30
}

function ensureContext(map: Map<string, ContextAccumulator>, key?: string): ContextAccumulator | undefined {
  if (!key) return undefined
  const current = map.get(key)
  if (current) {
    return current
  }

  const created = createAccumulator()
  map.set(key, created)
  return created
}

function touchAccumulator(accumulator: ContextAccumulator, effect: { enteredExecution: boolean; effectivenessLabel: string; recurrenceCount: number; decisionAt?: string }, now: Date) {
  accumulator.planCount += 1
  if (effect.enteredExecution) {
    accumulator.enteredExecutionCount += 1
  }
  if (effect.effectivenessLabel === 'IMPROVING') {
    accumulator.improvingCount += 1
  }
  if (effect.recurrenceCount > 0) {
    accumulator.recurringCount += 1
  }
  if (isRecent(now, effect.decisionAt)) {
    accumulator.recentCount30d += 1
  }
  if (!accumulator.lastHandledAt || (effect.decisionAt && effect.decisionAt > accumulator.lastHandledAt)) {
    accumulator.lastHandledAt = effect.decisionAt
  }
}

function getOrCreateActorHistory(map: Map<string, ActorRecommendationHistory>, actorId: string): ActorRecommendationHistory {
  const current = map.get(actorId)
  if (current) {
    return current
  }

  const created: ActorRecommendationHistory = {
    theme: new Map<string, ContextAccumulator>(),
    targetArea: new Map<string, ContextAccumulator>(),
    changeType: new Map<string, ContextAccumulator>(),
    targetFileHint: new Map<string, ContextAccumulator>(),
    recentCount30d: 0,
  }
  map.set(actorId, created)
  return created
}

function buildActorHistoryIndex(params: {
  actorAnalysis: GovernanceActorAnalysisData
  adoptionData: GovernancePlanAdoptionData
  campaigns: GovernanceCampaignEffectiveness[]
  now: Date
}): Map<string, ActorRecommendationHistory> {
  const historyMap = new Map<string, ActorRecommendationHistory>()
  const campaignMap = new Map(params.campaigns.map((item) => [item.campaignId, item]))

  params.adoptionData.items.forEach((effect) => {
    if (effect.actor.isFallbackActor) {
      return
    }

    const actorHistory = getOrCreateActorHistory(historyMap, effect.actor.actorId)
    const decisionAt = effect.decisionAt
    const scopedEffect = {
      enteredExecution: effect.enteredExecution,
      effectivenessLabel: effect.effectivenessLabel,
      recurrenceCount: effect.recurrenceCount,
      decisionAt,
    }

    touchAccumulator(ensureContext(actorHistory.theme, effect.governanceTheme)!, scopedEffect, params.now)

    if (isRecent(params.now, decisionAt)) {
      actorHistory.recentCount30d += 1
    }
    if (!actorHistory.lastHandledAt || (decisionAt && decisionAt > actorHistory.lastHandledAt)) {
      actorHistory.lastHandledAt = decisionAt
    }

    const campaign = effect.linkedCampaignId ? campaignMap.get(effect.linkedCampaignId) : undefined
    if (!campaign) {
      return
    }

    touchAccumulator(ensureContext(actorHistory.targetArea, campaign.targetArea)!, scopedEffect, params.now)
    touchAccumulator(ensureContext(actorHistory.changeType, campaign.changeType)!, scopedEffect, params.now)
    unique(campaign.targetFileHints).forEach((fileHint) => {
      touchAccumulator(ensureContext(actorHistory.targetFileHint, fileHint)!, scopedEffect, params.now)
    })
  })

  params.actorAnalysis.realActors.forEach((item) => {
    getOrCreateActorHistory(historyMap, item.actor.actorId)
  })

  return historyMap
}

function createSignal(
  signalType: GovernanceActorRecommendationSignalType,
  direction: 'positive' | 'negative',
  weight: number,
  summary: string,
  metricValue?: number,
): GovernanceActorRecommendationSignal {
  return {
    signalType,
    direction,
    weight: roundToTwo(Math.abs(weight)),
    summary,
    metricValue,
  }
}

function pushIfWeighted(target: GovernanceActorRecommendationSignal[], signal?: GovernanceActorRecommendationSignal) {
  if (!signal) return
  if (Math.abs(signal.weight) < 0.5) return
  target.push(signal)
}

function getConfidence(params: {
  topScore: number
  topSampleCount: number
  topGap: number
  hasThemeExperience: boolean
}): GovernanceActorRecommendationConfidence {
  if (params.topScore <= 0 || params.topSampleCount <= 0) {
    return 'NONE'
  }

  if (params.hasThemeExperience && params.topSampleCount >= 6 && params.topScore >= 70 && params.topGap >= 8) {
    return 'HIGH'
  }

  if (params.topSampleCount >= 3 && params.topScore >= 58) {
    return 'MEDIUM'
  }

  return 'LOW'
}

function buildCandidateReason(params: {
  profile: RecommendationProfile
  governanceTheme: string
  actor: GovernanceActorAnalyticsIdentity
  signals: GovernanceActorRecommendationSignal[]
  confidence: GovernanceActorRecommendationConfidence
}): string {
  const positive = params.signals
    .filter((item) => item.direction === 'positive')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((item) => item.summary)
  const negative = params.signals
    .filter((item) => item.direction === 'negative')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 1)
    .map((item) => item.summary)

  const targetText = params.profile === 'APPROVAL'
    ? '适合作为这类计划的优先审批人'
    : params.profile === 'EXECUTION'
      ? '适合作为这类计划的优先推进人'
      : '适合作为该治理主题的长期负责人'

  if (positive.length === 0) {
    return `${params.actor.actorLabel} 当前只有有限历史信号，先作为低置信度备选。`
  }

  const positiveText = positive.join('，')
  const negativeText = negative[0] ? `；但${negative[0]}，因此置信度下调。` : '。'
  const confidenceText = params.confidence === 'HIGH'
    ? ''
    : params.confidence === 'MEDIUM'
      ? '整体信号较稳定，'
      : '当前样本仍偏少或差距不够明显，'

  return `${params.actor.actorLabel}在“${params.governanceTheme}”相关处理上${positiveText}，${confidenceText}${targetText}${negativeText}`
}

function buildNoRecommendationResult(params: {
  candidateActors: GovernanceActorCandidateRecommendation[]
  reason: string
}): GovernanceActorRecommendation {
  return {
    candidateActors: params.candidateActors,
    recommendationScore: params.candidateActors[0]?.recommendationScore || 0,
    recommendationConfidence: params.candidateActors[0]?.recommendationConfidence || 'NONE',
    recommendationReason: params.reason,
    basedOnSignals: params.candidateActors[0]?.basedOnSignals || [],
    hasClearRecommendation: false,
    noRecommendationReason: params.reason,
  }
}

function buildMainRecommendation(params: {
  candidateActors: GovernanceActorCandidateRecommendation[]
  topGap: number
  topSampleCount: number
  hasThemeExperience: boolean
}): GovernanceActorRecommendation {
  if (params.candidateActors.length === 0) {
    return buildNoRecommendationResult({
      candidateActors: [],
      reason: '当前只有 fallback actor 或缺少真实操作者留痕，暂时不给出明确推荐。',
    })
  }

  const [topCandidate, secondCandidate] = params.candidateActors
  const confidence = getConfidence({
    topScore: topCandidate.recommendationScore,
    topSampleCount: params.topSampleCount,
    topGap: params.topGap,
    hasThemeExperience: params.hasThemeExperience,
  })
  const hasClearRecommendation = (confidence === 'HIGH' || confidence === 'MEDIUM')
    && topCandidate.recommendationScore >= 52
    && params.topGap >= 3

  if (!hasClearRecommendation) {
    const reason = secondCandidate && params.topGap < 3
      ? '前两位候选分数接近，当前更适合并列参考而不是强行指定主推荐。'
      : '当前真实操作者样本不足，或历史效果信号还不够强，只建议作为备选参考。'
    return buildNoRecommendationResult({
      candidateActors: params.candidateActors,
      reason,
    })
  }

  return {
    recommendedActorId: topCandidate.actor.actorId,
    recommendedActorName: topCandidate.actor.actorName,
    candidateActors: params.candidateActors,
    recommendationScore: topCandidate.recommendationScore,
    recommendationConfidence: confidence,
    recommendationReason: topCandidate.recommendationReason,
    basedOnSignals: topCandidate.basedOnSignals,
    hasClearRecommendation: true,
  }
}

function samplePenalty(sampleCount: number): number {
  if (sampleCount >= 6) return 0
  if (sampleCount >= 3) return 6
  if (sampleCount >= 2) return 10
  return 16
}

function buildSignals(params: {
  profile: RecommendationProfile
  input: GovernancePlanActorRecommendationInput | { governanceTheme: string }
  summary: GovernanceActorBehaviorSummary
  themeRow?: GovernanceActorThemeAnalysis
  actorHistory?: ActorRecommendationHistory
}): { signals: GovernanceActorRecommendationSignal[]; sampleCount: number; hasThemeExperience: boolean } {
  const signals: GovernanceActorRecommendationSignal[] = []
  const governanceTheme = params.input.governanceTheme
  const themeHistory = params.actorHistory?.theme.get(governanceTheme)
  const themeSampleCount = params.themeRow?.planCount || themeHistory?.planCount || 0
  const hasThemeExperience = themeSampleCount > 0

  if (themeSampleCount > 0) {
    pushIfWeighted(signals, createSignal(
      'THEME_EXPERIENCE',
      'positive',
      Math.min(themeSampleCount, 6) * (params.profile === 'APPROVAL' ? 3.5 : 3),
      `在该主题下累计处理 ${themeSampleCount} 条计划`,
      themeSampleCount,
    ))
  }

  const effectiveAcceptRate = params.themeRow?.acceptRate ?? params.summary.acceptRate
  const effectiveDismissRate = params.themeRow?.dismissRate ?? params.summary.dismissRate
  const effectiveExecutionRate = params.themeRow?.enteredExecutionRate ?? params.summary.enteredExecutionRate
  const effectiveImprovingRate = params.themeRow?.improvingRate ?? params.summary.improvingRate
  const effectiveRecurrenceRate = params.themeRow?.recurrenceRate ?? params.summary.recurringAfterAdoptionRate

  pushIfWeighted(signals, createSignal(
    'THEME_ACCEPT_RATE',
    effectiveAcceptRate >= 55 ? 'positive' : 'negative',
    ((effectiveAcceptRate - 50) / 50) * (params.profile === 'APPROVAL' ? 16 : 8),
    `采纳率 ${effectiveAcceptRate}%`,
    effectiveAcceptRate,
  ))
  pushIfWeighted(signals, createSignal(
    'THEME_DISMISS_RATE',
    effectiveDismissRate <= 25 ? 'positive' : 'negative',
    ((25 - effectiveDismissRate) / 25) * (params.profile === 'APPROVAL' ? 10 : 6),
    `dismiss 占比 ${effectiveDismissRate}%`,
    effectiveDismissRate,
  ))

  if (params.profile !== 'APPROVAL') {
    pushIfWeighted(signals, createSignal(
      'THEME_EXECUTION_RATE',
      effectiveExecutionRate >= 50 ? 'positive' : 'negative',
      ((effectiveExecutionRate - 45) / 55) * 16,
      `进入执行率 ${effectiveExecutionRate}%`,
      effectiveExecutionRate,
    ))
    pushIfWeighted(signals, createSignal(
      'THEME_IMPROVING_RATE',
      effectiveImprovingRate >= 50 ? 'positive' : 'negative',
      ((effectiveImprovingRate - 45) / 55) * 18,
      `改善率 ${effectiveImprovingRate}%`,
      effectiveImprovingRate,
    ))
    pushIfWeighted(signals, createSignal(
      'THEME_RECURRENCE_RATE',
      effectiveRecurrenceRate <= 25 ? 'positive' : 'negative',
      ((25 - effectiveRecurrenceRate) / 25) * 16,
      `复发率 ${effectiveRecurrenceRate}%`,
      effectiveRecurrenceRate,
    ))
  }

  if (themeHistory?.recentCount30d || params.actorHistory?.recentCount30d) {
    const recentCount = themeHistory?.recentCount30d || params.actorHistory?.recentCount30d || 0
    pushIfWeighted(signals, createSignal(
      'RECENT_ACTIVITY',
      'positive',
      Math.min(6, 2 + recentCount * 1.5),
      `最近 30 天仍有 ${recentCount} 次相关处理`,
      recentCount,
    ))
  }

  const planInput = 'targetArea' in params.input ? params.input : undefined
  if (planInput) {
    const targetAreaStats = params.actorHistory?.targetArea.get(planInput.targetArea)
    if (targetAreaStats) {
      const targetAreaImprovingRate = rate(targetAreaStats.improvingCount, targetAreaStats.enteredExecutionCount || targetAreaStats.planCount)
      pushIfWeighted(signals, createSignal(
        'TARGET_AREA_MATCH',
        'positive',
        4 + Math.min(6, targetAreaStats.planCount * 1.5) + ((targetAreaImprovingRate - 50) / 50) * 4,
        `在 ${planInput.targetArea} 方向已有 ${targetAreaStats.planCount} 条相关经验`,
        targetAreaStats.planCount,
      ))
    }

    if (planInput.changeType) {
      const changeTypeStats = params.actorHistory?.changeType.get(planInput.changeType)
      if (changeTypeStats) {
        const changeTypeImprovingRate = rate(changeTypeStats.improvingCount, changeTypeStats.enteredExecutionCount || changeTypeStats.planCount)
        pushIfWeighted(signals, createSignal(
          'CHANGE_TYPE_MATCH',
          'positive',
          4 + Math.min(5, changeTypeStats.planCount * 1.25) + ((changeTypeImprovingRate - 50) / 50) * 4,
          `在 ${planInput.changeType} 变更类型上已有 ${changeTypeStats.planCount} 条经验`,
          changeTypeStats.planCount,
        ))
      }
    }

    const fileMatches = unique(planInput.targetFileHints)
      .map((fileHint) => params.actorHistory?.targetFileHint.get(fileHint))
      .filter((item): item is ContextAccumulator => Boolean(item))
    if (fileMatches.length > 0) {
      const matchedPlanCount = fileMatches.reduce((sum, item) => sum + item.planCount, 0)
      pushIfWeighted(signals, createSignal(
        'FILE_HINT_MATCH',
        'positive',
        Math.min(8, 3 + matchedPlanCount * 1.5),
        `命中过相近目标文件，累计 ${matchedPlanCount} 条处理记录`,
        matchedPlanCount,
      ))
    }

    if (planInput.riskLevel === 'HIGH') {
      if (params.summary.highRiskHandledCount > 0) {
        pushIfWeighted(signals, createSignal(
          'HIGH_RISK_MATCH',
          params.summary.highRiskImprovingRate >= 50 ? 'positive' : 'negative',
          ((params.summary.highRiskImprovingRate - 40) / 60) * 10,
          `处理高风险计划 ${params.summary.highRiskHandledCount} 条，高风险改善率 ${params.summary.highRiskImprovingRate}%`,
          params.summary.highRiskImprovingRate,
        ))
      } else {
        pushIfWeighted(signals, createSignal(
          'HIGH_RISK_MATCH',
          'negative',
          6,
          '缺少高风险治理经验',
        ))
      }
    }
  }

  pushIfWeighted(signals, createSignal(
    'OVERALL_DISMISS_RATE',
    params.summary.dismissRate <= 30 ? 'positive' : 'negative',
    ((30 - params.summary.dismissRate) / 30) * 8,
    `整体 dismiss 占比 ${params.summary.dismissRate}%`,
    params.summary.dismissRate,
  ))

  if (effectiveImprovingRate < 40 || effectiveRecurrenceRate > 40 || params.summary.dismissedRecurringCount > 0) {
    const weakWeight = Math.max(
      params.summary.dismissedRecurringCount * 3,
      effectiveRecurrenceRate > 40 ? ((effectiveRecurrenceRate - 40) / 60) * 10 : 0,
      effectiveImprovingRate < 40 ? ((40 - effectiveImprovingRate) / 40) * 8 : 0,
    )
    pushIfWeighted(signals, createSignal(
      'WEAK_OUTCOME',
      'negative',
      weakWeight,
      params.summary.dismissedRecurringCount > 0
        ? `历史上出现 ${params.summary.dismissedRecurringCount} 次 dismiss 后仍复发`
        : `历史效果偏弱，改善率 ${effectiveImprovingRate}% / 复发率 ${effectiveRecurrenceRate}%`,
    ))
  }

  const penalty = samplePenalty(themeSampleCount || params.summary.outcomePlanCount || params.summary.handledPlanCount)
  if (penalty > 0) {
    pushIfWeighted(signals, createSignal(
      'LOW_SAMPLE',
      'negative',
      penalty,
      `样本量偏少，目前仅有 ${themeSampleCount || params.summary.outcomePlanCount || params.summary.handledPlanCount} 条可参考记录`,
      themeSampleCount || params.summary.outcomePlanCount || params.summary.handledPlanCount,
    ))
  }

  return {
    signals,
    sampleCount: themeSampleCount || params.summary.outcomePlanCount || params.summary.handledPlanCount,
    hasThemeExperience,
  }
}

function rankActors(params: {
  profile: RecommendationProfile
  input: GovernancePlanActorRecommendationInput | { governanceTheme: string }
  actorAnalysis: GovernanceActorAnalysisData
  actorHistoryIndex: Map<string, ActorRecommendationHistory>
}): { candidateActors: GovernanceActorCandidateRecommendation[]; topSampleCount: number; hasThemeExperience: boolean } {
  const governanceTheme = params.input.governanceTheme
  const themeRowMap = new Map(
    params.actorAnalysis.themeActorRows
      .filter((item) => item.governanceTheme === governanceTheme && !item.actor.isFallbackActor)
      .map((item) => [item.actor.actorId, item]),
  )

  const candidates = params.actorAnalysis.realActors
    .map((summary) => {
      const { signals, sampleCount, hasThemeExperience } = buildSignals({
        profile: params.profile,
        input: params.input,
        summary,
        themeRow: themeRowMap.get(summary.actor.actorId),
        actorHistory: params.actorHistoryIndex.get(summary.actor.actorId),
      })
      const scoreDelta = signals.reduce((sum, item) => sum + (item.direction === 'positive' ? item.weight : -item.weight), 0)
      const score = clamp(roundToTwo(50 + scoreDelta), 0, 100)
      const confidence = getConfidence({
        topScore: score,
        topSampleCount: sampleCount,
        topGap: 0,
        hasThemeExperience,
      })

      return {
        actor: summary.actor,
        recommendationScore: score,
        recommendationConfidence: confidence,
        basedOnSignals: signals.sort((a, b) => b.weight - a.weight),
        recommendationReason: buildCandidateReason({
          profile: params.profile,
          governanceTheme,
          actor: summary.actor,
          signals,
          confidence,
        }),
        sampleCount,
        hasThemeExperience,
      }
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore
      }
      return a.actor.actorLabel.localeCompare(b.actor.actorLabel)
    })

  return {
    candidateActors: candidates.slice(0, 3).map(({ sampleCount, hasThemeExperience, ...item }) => item),
    topSampleCount: candidates[0]?.sampleCount || 0,
    hasThemeExperience: Boolean(candidates[0]?.hasThemeExperience),
  }
}

export function recommendActorsForGovernancePlan(params: {
  input: GovernancePlanActorRecommendationInput
  actorAnalysis: GovernanceActorAnalysisData
  adoptionData: GovernancePlanAdoptionData
  campaigns: GovernanceCampaignEffectiveness[]
  now?: Date
}): GovernancePlanActorRecommendations {
  const now = params.now || new Date()
  const actorHistoryIndex = buildActorHistoryIndex({
    actorAnalysis: params.actorAnalysis,
    adoptionData: params.adoptionData,
    campaigns: params.campaigns,
    now,
  })

  const approvalCandidates = rankActors({
    profile: 'APPROVAL',
    input: params.input,
    actorAnalysis: params.actorAnalysis,
    actorHistoryIndex,
  })
  const executionCandidates = rankActors({
    profile: 'EXECUTION',
    input: params.input,
    actorAnalysis: params.actorAnalysis,
    actorHistoryIndex,
  })

  return {
    approval: buildMainRecommendation({
      candidateActors: approvalCandidates.candidateActors,
      topGap: (approvalCandidates.candidateActors[0]?.recommendationScore || 0) - (approvalCandidates.candidateActors[1]?.recommendationScore || 0),
      topSampleCount: approvalCandidates.topSampleCount,
      hasThemeExperience: approvalCandidates.hasThemeExperience,
    }),
    execution: buildMainRecommendation({
      candidateActors: executionCandidates.candidateActors,
      topGap: (executionCandidates.candidateActors[0]?.recommendationScore || 0) - (executionCandidates.candidateActors[1]?.recommendationScore || 0),
      topSampleCount: executionCandidates.topSampleCount,
      hasThemeExperience: executionCandidates.hasThemeExperience,
    }),
  }
}

export function recommendActorForGovernanceTheme(params: {
  governanceTheme: string
  actorAnalysis: GovernanceActorAnalysisData
  adoptionData: GovernancePlanAdoptionData
  campaigns: GovernanceCampaignEffectiveness[]
  now?: Date
}): GovernanceActorRecommendation {
  const now = params.now || new Date()
  const actorHistoryIndex = buildActorHistoryIndex({
    actorAnalysis: params.actorAnalysis,
    adoptionData: params.adoptionData,
    campaigns: params.campaigns,
    now,
  })
  const ranked = rankActors({
    profile: 'THEME_OWNER',
    input: { governanceTheme: params.governanceTheme },
    actorAnalysis: params.actorAnalysis,
    actorHistoryIndex,
  })

  return buildMainRecommendation({
    candidateActors: ranked.candidateActors,
    topGap: (ranked.candidateActors[0]?.recommendationScore || 0) - (ranked.candidateActors[1]?.recommendationScore || 0),
    topSampleCount: ranked.topSampleCount,
    hasThemeExperience: ranked.hasThemeExperience,
  })
}

export function buildGovernanceThemeActorRecommendations(params: {
  governanceThemes: string[]
  actorAnalysis: GovernanceActorAnalysisData
  adoptionData: GovernancePlanAdoptionData
  campaigns: GovernanceCampaignEffectiveness[]
  now?: Date
}): GovernanceThemeActorRecommendation[] {
  return unique(params.governanceThemes)
    .map((governanceTheme) => ({
      governanceTheme,
      recommendation: recommendActorForGovernanceTheme({
        governanceTheme,
        actorAnalysis: params.actorAnalysis,
        adoptionData: params.adoptionData,
        campaigns: params.campaigns,
        now: params.now,
      }),
    }))
    .sort((a, b) => {
      if (b.recommendation.recommendationScore !== a.recommendation.recommendationScore) {
        return b.recommendation.recommendationScore - a.recommendation.recommendationScore
      }
      return a.governanceTheme.localeCompare(b.governanceTheme)
    })
}