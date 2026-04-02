import { buildImprovementSuggestions, type ReflectionForImprovement } from './improvementView'
import type { ImprovementImpactArea, ImprovementSuggestion } from './improvementSuggestion'

export type LearningDashboardStats = {
  totals: {
    reflectionCount: number
    approvedImprovementCount: number
    acceptedImprovementCount: number
    implementedActionCount: number
    verifiedActionCount: number
  }
  issueTypeDistribution: Array<{
    issueType: string
    count: number
  }>
  suggestionTypeAcceptance: Array<{
    suggestionType: string
    totalCount: number
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
    acceptanceRate: number
  }>
  targetAreaActionDistribution: Array<{
    targetArea: string
    actionCount: number
    implementedCount: number
    verifiedCount: number
  }>
  impactAreaDistribution: Array<{
    impactArea: ImprovementImpactArea
    improvementCount: number
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
  }>
  actionConversion: {
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
    implementedRateFromAccepted: number
    verifiedRateFromImplemented: number
    verifiedRateFromAccepted: number
  }
  recentActivityOverview: {
    sevenDays: {
      reflectionCount: number
      approvedImprovementCount: number
      acceptedActionCount: number
      implementedActionCount: number
      verifiedActionCount: number
    }
    thirtyDays: {
      reflectionCount: number
      approvedImprovementCount: number
      acceptedActionCount: number
      implementedActionCount: number
      verifiedActionCount: number
    }
    recentActivities: Array<{
      type: 'REFLECTION' | 'ACCEPTED' | 'IMPLEMENTED' | 'VERIFIED'
      title: string
      impactArea?: ImprovementImpactArea
      at: string
    }>
  }
  improvementObservations: Array<{
    improvementId: string
    title: string
    issueType: string
    impactArea: ImprovementImpactArea
    verifiedAt?: string
    beforeCount?: number
    afterCount?: number
    delta?: number
    status: 'observed' | 'insufficient_data'
    note: string
  }>
  prioritySignals: {
    issueTypeTop: Array<{
      issueType: string
      reflectionCount: number
      approvedCount: number
      acceptedCount: number
      verifiedCount: number
      priorityScore: number
    }>
    suggestionTypeTop: Array<{
      suggestionType: string
      totalCount: number
      acceptedCount: number
      implementedCount: number
      verifiedCount: number
      priorityScore: number
    }>
    impactAreaTop: Array<{
      impactArea: ImprovementImpactArea
      improvementCount: number
      acceptedCount: number
      implementedCount: number
      verifiedCount: number
      priorityScore: number
    }>
    nextEngineeringCandidates: Array<{
      improvementId: string
      title: string
      suggestionType: string
      impactArea: ImprovementImpactArea
      targetArea: string
      reason: string
    }>
    lowSignalVerifiedActions: Array<{
      improvementId: string
      title: string
      impactArea: ImprovementImpactArea
      status: 'insufficient_data' | 'no_clear_improvement'
      note: string
    }>
  }
  chainImpactSignals: Array<{
    impactArea: ImprovementImpactArea
    positiveCount: number
    flatOrNegativeCount: number
    insufficientDataCount: number
    note: string
  }>
}

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function isAcceptedOrBeyond(status: ImprovementSuggestion['status']): boolean {
  return status === 'ACCEPTED' || status === 'IMPLEMENTED' || status === 'VERIFIED'
}

function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 10000) / 100
}

function computePriorityScore(values: {
  total: number
  accepted?: number
  implemented?: number
  verified?: number
}): number {
  return values.total * 3 + (values.accepted || 0) * 2 + (values.implemented || 0) - (values.verified || 0) * 2
}

function buildPeriodStats(improvements: ImprovementSuggestion[], reflections: ReflectionForImprovement[], now: Date, periodDays: number) {
  const start = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  return {
    reflectionCount: reflections.filter((item) => toDate(item.createdAt) && toDate(item.createdAt)!.getTime() >= start.getTime()).length,
    approvedImprovementCount: improvements.filter((item) => item.createdAt.getTime() >= start.getTime()).length,
    acceptedActionCount: improvements.filter((item) => item.status === 'ACCEPTED' && toDate(item.lastActionAt) && toDate(item.lastActionAt)!.getTime() >= start.getTime()).length,
    implementedActionCount: improvements.filter((item) => toDate(item.implementedAt) && toDate(item.implementedAt)!.getTime() >= start.getTime()).length,
    verifiedActionCount: improvements.filter((item) => toDate(item.verifiedAt) && toDate(item.verifiedAt)!.getTime() >= start.getTime()).length,
  }
}

function buildObservation(reflections: ReflectionForImprovement[], improvement: ImprovementSuggestion, now: Date): LearningDashboardStats['improvementObservations'][number] {
  const verifiedAt = toDate(improvement.verifiedAt)
  if (!verifiedAt) {
    return {
      improvementId: improvement.id,
      title: improvement.title,
      issueType: improvement.issueType,
      impactArea: improvement.impactArea,
      status: 'insufficient_data',
      note: '当前还没有 VERIFIED 时间，暂无法做 verified 前后观察。',
    }
  }

  const windowMs = 7 * 24 * 60 * 60 * 1000
  const beforeStart = verifiedAt.getTime() - windowMs
  const afterEnd = verifiedAt.getTime() + windowMs

  if (now.getTime() < afterEnd) {
    return {
      improvementId: improvement.id,
      title: improvement.title,
      issueType: improvement.issueType,
      impactArea: improvement.impactArea,
      verifiedAt: improvement.verifiedAt,
      status: 'insufficient_data',
      note: '已可观察，但 VERIFIED 后窗口期还不完整，暂无法严格验证。',
    }
  }

  const sameIssueReflections = reflections.filter((item) => item.issueType === improvement.issueType)
  const beforeCount = sameIssueReflections.filter((item) => {
    const createdAt = toDate(item.createdAt)
    return createdAt && createdAt.getTime() >= beforeStart && createdAt.getTime() < verifiedAt.getTime()
  }).length
  const afterCount = sameIssueReflections.filter((item) => {
    const createdAt = toDate(item.createdAt)
    return createdAt && createdAt.getTime() >= verifiedAt.getTime() && createdAt.getTime() < afterEnd
  }).length

  if (beforeCount === 0 && afterCount === 0) {
    return {
      improvementId: improvement.id,
      title: improvement.title,
      issueType: improvement.issueType,
      impactArea: improvement.impactArea,
      verifiedAt: improvement.verifiedAt,
      status: 'insufficient_data',
      note: '已可观察，但当前 verified 前后都缺少足够的同类 reflection 样本。',
    }
  }

  const delta = afterCount - beforeCount
  const note = delta < 0
    ? `VERIFIED 后 7 天内，同类问题从 ${beforeCount} 降到 ${afterCount}，可作为正向观察线索，但不构成严格因果。`
    : delta > 0
    ? `VERIFIED 后 7 天内，同类问题从 ${beforeCount} 升到 ${afterCount}，当前未观察到改善信号。`
    : `VERIFIED 前后 7 天内，同类问题都为 ${beforeCount}，当前变化不明显。`

  return {
    improvementId: improvement.id,
    title: improvement.title,
    issueType: improvement.issueType,
    impactArea: improvement.impactArea,
    verifiedAt: improvement.verifiedAt,
    beforeCount,
    afterCount,
    delta,
    status: 'observed',
    note,
  }
}

export function buildLearningDashboardStats(params: {
  reflections: ReflectionForImprovement[]
  approvedReflections: ReflectionForImprovement[]
  now?: Date
}): LearningDashboardStats {
  const now = params.now || new Date()
  const improvements = buildImprovementSuggestions(params.approvedReflections)

  const issueTypeMap = new Map<string, number>()
  const suggestionTypeMap = new Map<string, {
    totalCount: number
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
  }>()
  const targetAreaActionMap = new Map<string, {
    actionCount: number
    implementedCount: number
    verifiedCount: number
  }>()
  const impactAreaMap = new Map<ImprovementImpactArea, {
    improvementCount: number
    acceptedCount: number
    implementedCount: number
    verifiedCount: number
  }>()
  const issueTypePriorityMap = new Map<string, {
    reflectionCount: number
    approvedCount: number
    acceptedCount: number
    verifiedCount: number
  }>()

  params.reflections.forEach((item) => {
    issueTypeMap.set(item.issueType, (issueTypeMap.get(item.issueType) || 0) + 1)
    const current = issueTypePriorityMap.get(item.issueType) || {
      reflectionCount: 0,
      approvedCount: 0,
      acceptedCount: 0,
      verifiedCount: 0,
    }
    current.reflectionCount += 1
    issueTypePriorityMap.set(item.issueType, current)
  })

  improvements.forEach((item) => {
    const suggestionCurrent = suggestionTypeMap.get(item.suggestionType) || {
      totalCount: 0,
      acceptedCount: 0,
      implementedCount: 0,
      verifiedCount: 0,
    }
    suggestionCurrent.totalCount += 1
    if (isAcceptedOrBeyond(item.status)) suggestionCurrent.acceptedCount += 1
    if (item.status === 'IMPLEMENTED' || item.status === 'VERIFIED') suggestionCurrent.implementedCount += 1
    if (item.status === 'VERIFIED') suggestionCurrent.verifiedCount += 1
    suggestionTypeMap.set(item.suggestionType, suggestionCurrent)

    const impactCurrent = impactAreaMap.get(item.impactArea) || {
      improvementCount: 0,
      acceptedCount: 0,
      implementedCount: 0,
      verifiedCount: 0,
    }
    impactCurrent.improvementCount += 1
    if (isAcceptedOrBeyond(item.status)) impactCurrent.acceptedCount += 1
    if (item.status === 'IMPLEMENTED' || item.status === 'VERIFIED') impactCurrent.implementedCount += 1
    if (item.status === 'VERIFIED') impactCurrent.verifiedCount += 1
    impactAreaMap.set(item.impactArea, impactCurrent)

    const issuePriorityCurrent = issueTypePriorityMap.get(item.issueType) || {
      reflectionCount: 0,
      approvedCount: 0,
      acceptedCount: 0,
      verifiedCount: 0,
    }
    issuePriorityCurrent.approvedCount += 1
    if (isAcceptedOrBeyond(item.status)) issuePriorityCurrent.acceptedCount += 1
    if (item.status === 'VERIFIED') issuePriorityCurrent.verifiedCount += 1
    issueTypePriorityMap.set(item.issueType, issuePriorityCurrent)

    if (isAcceptedOrBeyond(item.status)) {
      const targetCurrent = targetAreaActionMap.get(item.targetArea) || {
        actionCount: 0,
        implementedCount: 0,
        verifiedCount: 0,
      }
      targetCurrent.actionCount += 1
      if (item.status === 'IMPLEMENTED' || item.status === 'VERIFIED') targetCurrent.implementedCount += 1
      if (item.status === 'VERIFIED') targetCurrent.verifiedCount += 1
      targetAreaActionMap.set(item.targetArea, targetCurrent)
    }
  })

  const acceptedImprovementCount = improvements.filter((item) => isAcceptedOrBeyond(item.status)).length
  const implementedActionCount = improvements.filter((item) => item.status === 'IMPLEMENTED' || item.status === 'VERIFIED').length
  const verifiedActionCount = improvements.filter((item) => item.status === 'VERIFIED').length

  const recentActivities = [
    ...params.reflections.map((item) => ({
      type: 'REFLECTION' as const,
      title: `${item.issueType} reflection #${item.id}`,
      at: toDate(item.createdAt)?.toISOString() || new Date(0).toISOString(),
    })),
    ...improvements
      .filter((item) => item.status === 'ACCEPTED' && item.lastActionAt)
      .map((item) => ({
        type: 'ACCEPTED' as const,
        title: item.title,
        impactArea: item.impactArea,
        at: item.lastActionAt!,
      })),
    ...improvements
      .filter((item) => item.implementedAt)
      .map((item) => ({
        type: 'IMPLEMENTED' as const,
        title: item.title,
        impactArea: item.impactArea,
        at: item.implementedAt!,
      })),
    ...improvements
      .filter((item) => item.verifiedAt)
      .map((item) => ({
        type: 'VERIFIED' as const,
        title: item.title,
        impactArea: item.impactArea,
        at: item.verifiedAt!,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 15)

  const improvementObservations = improvements
    .filter((item) => item.status === 'VERIFIED')
    .sort((a, b) => new Date(b.verifiedAt || 0).getTime() - new Date(a.verifiedAt || 0).getTime())
    .slice(0, 8)
    .map((item) => buildObservation(params.reflections, item, now))

  const issueTypeTop = Array.from(issueTypePriorityMap.entries())
    .map(([issueType, value]) => ({
      issueType,
      ...value,
      priorityScore: computePriorityScore({
        total: value.reflectionCount,
        accepted: value.acceptedCount,
        verified: value.verifiedCount,
      }),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)

  const suggestionTypeTop = Array.from(suggestionTypeMap.entries())
    .map(([suggestionType, value]) => ({
      suggestionType,
      ...value,
      priorityScore: computePriorityScore({
        total: value.totalCount,
        accepted: value.acceptedCount,
        implemented: value.implementedCount,
        verified: value.verifiedCount,
      }),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)

  const impactAreaTop = Array.from(impactAreaMap.entries())
    .map(([impactArea, value]) => ({
      impactArea,
      ...value,
      priorityScore: computePriorityScore({
        total: value.improvementCount,
        accepted: value.acceptedCount,
        implemented: value.implementedCount,
        verified: value.verifiedCount,
      }),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6)

  const issuePriorityScoreMap = new Map(issueTypeTop.map((item) => [item.issueType, item.priorityScore]))
  const impactAreaPriorityScoreMap = new Map(impactAreaTop.map((item) => [item.impactArea, item.priorityScore]))

  const nextEngineeringCandidates = improvements
    .filter((item) => item.status === 'ACCEPTED')
    .map((item) => {
      const issueScore = issuePriorityScoreMap.get(item.issueType) || 0
      const impactScore = impactAreaPriorityScoreMap.get(item.impactArea) || 0
      return {
        improvementId: item.id,
        title: item.title,
        suggestionType: item.suggestionType,
        impactArea: item.impactArea,
        targetArea: item.targetArea,
        reason: `同类问题出现 ${issueTypeMap.get(item.issueType) || 0} 次，当前已 ACCEPTED，且 ${item.impactArea} 链路仍有优化空间。`,
        priorityScore: issueScore + impactScore,
      }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6)
    .map(({ priorityScore: _priorityScore, ...item }) => item)

  const lowSignalVerifiedActions = improvementObservations
    .filter((item) => item.status === 'insufficient_data' || (item.delta ?? 0) >= 0)
    .map((item) => ({
      improvementId: item.improvementId,
      title: item.title,
      impactArea: item.impactArea,
      status: item.status === 'insufficient_data' ? 'insufficient_data' as const : 'no_clear_improvement' as const,
      note: item.note,
    }))

  const chainImpactSignalMap = new Map<ImprovementImpactArea, {
    positiveCount: number
    flatOrNegativeCount: number
    insufficientDataCount: number
  }>()

  improvementObservations.forEach((item) => {
    const current = chainImpactSignalMap.get(item.impactArea) || {
      positiveCount: 0,
      flatOrNegativeCount: 0,
      insufficientDataCount: 0,
    }

    if (item.status === 'insufficient_data') {
      current.insufficientDataCount += 1
    } else if ((item.delta ?? 0) < 0) {
      current.positiveCount += 1
    } else {
      current.flatOrNegativeCount += 1
    }

    chainImpactSignalMap.set(item.impactArea, current)
  })

  const chainImpactSignals = Array.from(chainImpactSignalMap.entries())
    .map(([impactArea, value]) => ({
      impactArea,
      ...value,
      note: value.positiveCount > 0
        ? `${value.positiveCount} 个 VERIFIED 动作在观察窗口内出现正向迹象。`
        : value.flatOrNegativeCount > 0
        ? `当前已有 ${value.flatOrNegativeCount} 个 VERIFIED 动作未看到明显改善迹象。`
        : '当前 mostly 处于样本不足或窗口未完成状态。',
    }))
    .sort((a, b) => (b.positiveCount + b.flatOrNegativeCount + b.insufficientDataCount) - (a.positiveCount + a.flatOrNegativeCount + a.insufficientDataCount))

  return {
    totals: {
      reflectionCount: params.reflections.length,
      approvedImprovementCount: improvements.length,
      acceptedImprovementCount,
      implementedActionCount,
      verifiedActionCount,
    },
    issueTypeDistribution: Array.from(issueTypeMap.entries())
      .map(([issueType, count]) => ({ issueType, count }))
      .sort((a, b) => b.count - a.count),
    suggestionTypeAcceptance: Array.from(suggestionTypeMap.entries())
      .map(([suggestionType, value]) => ({
        suggestionType,
        ...value,
        acceptanceRate: roundPercent(value.acceptedCount, value.totalCount),
      }))
      .sort((a, b) => b.acceptedCount - a.acceptedCount),
    targetAreaActionDistribution: Array.from(targetAreaActionMap.entries())
      .map(([targetArea, value]) => ({ targetArea, ...value }))
      .sort((a, b) => b.actionCount - a.actionCount),
    impactAreaDistribution: Array.from(impactAreaMap.entries())
      .map(([impactArea, value]) => ({ impactArea, ...value }))
      .sort((a, b) => b.improvementCount - a.improvementCount),
    actionConversion: {
      acceptedCount: acceptedImprovementCount,
      implementedCount: implementedActionCount,
      verifiedCount: verifiedActionCount,
      implementedRateFromAccepted: roundPercent(implementedActionCount, acceptedImprovementCount),
      verifiedRateFromImplemented: roundPercent(verifiedActionCount, implementedActionCount),
      verifiedRateFromAccepted: roundPercent(verifiedActionCount, acceptedImprovementCount),
    },
    recentActivityOverview: {
      sevenDays: buildPeriodStats(improvements, params.reflections, now, 7),
      thirtyDays: buildPeriodStats(improvements, params.reflections, now, 30),
      recentActivities,
    },
    improvementObservations,
    prioritySignals: {
      issueTypeTop,
      suggestionTypeTop,
      impactAreaTop,
      nextEngineeringCandidates,
      lowSignalVerifiedActions,
    },
    chainImpactSignals,
  }
}