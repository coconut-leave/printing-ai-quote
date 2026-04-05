import {
  buildImprovementSuggestions,
  type ReflectionForImprovement,
} from './improvementView'
import type {
  ImprovementActionChangeType,
  ImprovementActionDraft,
  ImprovementActionRiskLevel,
  ImprovementSuggestion,
  ImprovementSuggestionStatus,
  ImprovementTargetArea,
} from './improvementSuggestion'

export type ActionDraftDashboardTimeRange = 7 | 30 | 90 | 'ALL'
export type ActionDraftPriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW'
export type ActionDraftGovernanceBucket =
  | 'IMMEDIATE_FIX'
  | 'HIGH_RISK_REVIEW'
  | 'BATCH_CLEANUP'
  | 'WATCHLIST'
  | 'LOW_PRIORITY'

export type ActionDraftDashboardFilters = {
  timeRangeDays?: ActionDraftDashboardTimeRange
  status?: ImprovementSuggestionStatus | 'ALL'
  targetArea?: ImprovementTargetArea | 'ALL'
  changeType?: ImprovementActionChangeType | 'ALL'
  riskLevel?: ImprovementActionRiskLevel | 'ALL'
}

export type RankedActionDraftPriority = {
  id: string
  sourceReflectionId: number
  title: string
  actionTitle: string
  targetArea: ImprovementTargetArea
  changeType: ImprovementActionChangeType
  riskLevel: ImprovementActionRiskLevel
  status: ImprovementSuggestionStatus
  targetFileHint?: string
  createdAt: string
  lastActionAt?: string
  stagnantDays: number
  priorityScore: number
  priorityLevel: ActionDraftPriorityLevel
  priorityReason: string
  governanceBucket: ActionDraftGovernanceBucket
  governanceReason: string
  recommendedNextAction: string
  governanceTheme: string
  whyNow: string
  changeTypeAcceptedRate: number
  targetFileHitCount: number
  isSpecialGovernanceCandidate: boolean
}

export type TargetFileGovernanceCandidate = {
  targetFileHint: string
  hitCount: number
  recentHitCount: number
  lastHitAt?: string
  openCount: number
  targetAreaDistribution: Array<{
    targetArea: ImprovementTargetArea
    count: number
  }>
  changeTypeDistribution: Array<{
    changeType: ImprovementActionChangeType
    count: number
  }>
  priorityScore: number
  priorityLevel: ActionDraftPriorityLevel
  governanceBucket: ActionDraftGovernanceBucket
  governanceReason: string
  recommendedNextAction: string
  governanceTheme: string
  whyNow: string
  isSpecialGovernanceCandidate: boolean
}

export type ActionDraftDashboardStats = {
  generatedAt: string
  filters: {
    timeRangeDays: ActionDraftDashboardTimeRange
    recentWindowDays: 7 | 30 | 90
    status: ImprovementSuggestionStatus | 'ALL'
    targetArea: ImprovementTargetArea | 'ALL'
    changeType: ImprovementActionChangeType | 'ALL'
    riskLevel: ImprovementActionRiskLevel | 'ALL'
    activitySince?: string
  }
  summary: {
    totalActionDraftCount: number
    filteredActionDraftCount: number
    exactAcceptedCount: number
    acceptedOrLaterCount: number
    unresolvedCount: number
    pendingReviewCount: number
    highRiskUnresolvedCount: number
    repeatedTargetFileHintCount: number
  }
  targetAreaStats: Array<{
    targetArea: ImprovementTargetArea
    totalCount: number
    acceptedOrLaterCount: number
    acceptedRate: number
    statusCounts: Record<ImprovementSuggestionStatus, number>
    recentCount: number
    lastSeenAt?: string
  }>
  changeTypeStats: Array<{
    changeType: ImprovementActionChangeType
    totalCount: number
    acceptedCount: number
    acceptedOrLaterCount: number
    acceptedRate: number
    statusCounts: Record<ImprovementSuggestionStatus, number>
    lastSeenAt?: string
  }>
  riskLevelStats: Array<{
    riskLevel: ImprovementActionRiskLevel
    totalCount: number
    statusCounts: Record<ImprovementSuggestionStatus, number>
    unresolvedCount: number
    pendingReviewCount: number
    oldestOpenCreatedAt?: string
  }>
  targetFileHintStats: Array<{
    targetFileHint: string
    hitCount: number
    recentHitCount: number
    lastHitAt?: string
    openCount: number
    targetAreaDistribution: Array<{
      targetArea: ImprovementTargetArea
      count: number
    }>
    changeTypeDistribution: Array<{
      changeType: ImprovementActionChangeType
      count: number
    }>
  }>
  rankedActionDrafts: Array<RankedActionDraftPriority>
  highRiskBacklog: Array<RankedActionDraftPriority>
  priorityInsights: {
    topActions: Array<RankedActionDraftPriority>
    governanceBucketCounts: Array<{
      governanceBucket: ActionDraftGovernanceBucket
      count: number
    }>
    targetFileCandidates: Array<TargetFileGovernanceCandidate>
    highAcceptanceDirections: {
      changeTypes: Array<{
        changeType: ImprovementActionChangeType
        totalCount: number
        acceptedRate: number
        recommendedFocus: string
        whyNow: string
      }>
      targetAreas: Array<{
        targetArea: ImprovementTargetArea
        totalCount: number
        acceptedRate: number
        recommendedFocus: string
        whyNow: string
      }>
    }
  }
  emptyState: {
    hasActionDrafts: boolean
    hasFilteredResults: boolean
  }
}

type ActionDraftImprovement = ImprovementSuggestion & {
  actionDraft: ImprovementActionDraft
}

type ChangeTypeStat = ActionDraftDashboardStats['changeTypeStats'][number]
type TargetAreaStat = ActionDraftDashboardStats['targetAreaStats'][number]
type TargetFileHintStat = ActionDraftDashboardStats['targetFileHintStats'][number]

const ALL_STATUSES: ImprovementSuggestionStatus[] = [
  'NEW',
  'REVIEWED',
  'ACCEPTED',
  'IMPLEMENTED',
  'VERIFIED',
  'REJECTED',
]

const RECENT_WINDOW_DAYS: Array<7 | 30 | 90> = [7, 30, 90]

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 10000) / 100
}

function createStatusCounts(): Record<ImprovementSuggestionStatus, number> {
  return {
    NEW: 0,
    REVIEWED: 0,
    ACCEPTED: 0,
    IMPLEMENTED: 0,
    VERIFIED: 0,
    REJECTED: 0,
  }
}

function isAcceptedOrLater(status: ImprovementSuggestionStatus): boolean {
  return status === 'ACCEPTED' || status === 'IMPLEMENTED' || status === 'VERIFIED'
}

function isClosed(status: ImprovementSuggestionStatus): boolean {
  return status === 'VERIFIED' || status === 'REJECTED'
}

function isUnresolved(status: ImprovementSuggestionStatus): boolean {
  return !isClosed(status)
}

function isPendingReview(status: ImprovementSuggestionStatus): boolean {
  return status === 'NEW' || status === 'REVIEWED'
}

function getActivityDate(item: Pick<ImprovementSuggestion, 'createdAt' | 'lastActionAt'>): Date {
  return toDate(item.lastActionAt) || item.createdAt
}

function getRecentWindowDays(timeRangeDays: ActionDraftDashboardTimeRange): 7 | 30 | 90 {
  if (typeof timeRangeDays === 'number' && RECENT_WINDOW_DAYS.includes(timeRangeDays as 7 | 30 | 90)) {
    return timeRangeDays as 7 | 30 | 90
  }

  return 30
}

function sortDistribution<T extends { count: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.count - a.count)
}

function normalizeFilters(filters?: ActionDraftDashboardFilters): Required<ActionDraftDashboardFilters> {
  return {
    timeRangeDays: filters?.timeRangeDays || 'ALL',
    status: filters?.status || 'ALL',
    targetArea: filters?.targetArea || 'ALL',
    changeType: filters?.changeType || 'ALL',
    riskLevel: filters?.riskLevel || 'ALL',
  }
}

function getNormalizedTargetFileHint(item: ActionDraftImprovement): string {
  return item.targetFileHint || item.actionDraft.targetFileHint || '未指定目标文件'
}

function matchesFilters(item: ActionDraftImprovement, filters: Required<ActionDraftDashboardFilters>, activitySince: Date | null): boolean {
  if (activitySince && getActivityDate(item).getTime() < activitySince.getTime()) {
    return false
  }

  if (filters.status !== 'ALL' && item.status !== filters.status) {
    return false
  }

  if (filters.targetArea !== 'ALL' && item.actionDraft.targetArea !== filters.targetArea) {
    return false
  }

  if (filters.changeType !== 'ALL' && item.actionDraft.changeType !== filters.changeType) {
    return false
  }

  if (filters.riskLevel !== 'ALL' && item.actionDraft.riskLevel !== filters.riskLevel) {
    return false
  }

  return true
}

function basename(filePath?: string): string {
  if (!filePath) return '当前目标文件'
  const normalized = filePath.split('/').filter(Boolean)
  return normalized[normalized.length - 1] || filePath
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toPriorityLevel(score: number): ActionDraftPriorityLevel {
  if (score >= 75) return 'HIGH'
  if (score >= 45) return 'MEDIUM'
  return 'LOW'
}

function getGovernanceTheme(item: ActionDraftImprovement): string {
  switch (item.actionDraft.changeType) {
    case 'mapping_update':
      return '复杂包装字段映射'
    case 'prompt_update':
      return item.diffCategory === 'BUNDLE_STRUCTURE'
        ? '复杂包装追加识别'
        : '复杂包装抽取提示'
    case 'extraction_rule_update':
      return '复杂包装抽取规则'
    case 'threshold_update':
      return '复杂包装 estimated / quoted 边界'
    case 'policy_update':
      return '复杂包装复核与转人工'
    case 'pricing_rule_review':
      return '复杂包装报价判断前置'
    case 'test_only_update':
      return '复杂包装回归补样'
    case 'other_update':
    default:
      return item.actionDraft.targetArea === 'OTHER'
        ? '通用治理'
        : `${item.actionDraft.targetArea} 治理`
  }
}

function buildTargetAreaStats(items: ActionDraftImprovement[], recentSince: Date) {
  const map = new Map<ImprovementTargetArea, TargetAreaStat>()

  items.forEach((item) => {
    const targetArea = item.actionDraft.targetArea
    const current = map.get(targetArea) || {
      targetArea,
      totalCount: 0,
      acceptedOrLaterCount: 0,
      acceptedRate: 0,
      statusCounts: createStatusCounts(),
      recentCount: 0,
      lastSeenAt: undefined,
    }

    current.totalCount += 1
    if (isAcceptedOrLater(item.status)) {
      current.acceptedOrLaterCount += 1
    }
    current.acceptedRate = roundPercent(current.acceptedOrLaterCount, current.totalCount)
    current.statusCounts[item.status] += 1
    if (getActivityDate(item).getTime() >= recentSince.getTime()) {
      current.recentCount += 1
    }
    if (!current.lastSeenAt || item.createdAt.toISOString() > current.lastSeenAt) {
      current.lastSeenAt = item.createdAt.toISOString()
    }

    map.set(targetArea, current)
  })

  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount)
}

function buildChangeTypeStats(items: ActionDraftImprovement[]) {
  const map = new Map<ImprovementActionChangeType, ChangeTypeStat>()

  items.forEach((item) => {
    const changeType = item.actionDraft.changeType
    const current = map.get(changeType) || {
      changeType,
      totalCount: 0,
      acceptedCount: 0,
      acceptedOrLaterCount: 0,
      acceptedRate: 0,
      statusCounts: createStatusCounts(),
      lastSeenAt: undefined,
    }

    current.totalCount += 1
    if (item.status === 'ACCEPTED') {
      current.acceptedCount += 1
    }
    if (isAcceptedOrLater(item.status)) {
      current.acceptedOrLaterCount += 1
    }
    current.statusCounts[item.status] += 1
    current.acceptedRate = roundPercent(current.acceptedOrLaterCount, current.totalCount)
    if (!current.lastSeenAt || item.createdAt.toISOString() > current.lastSeenAt) {
      current.lastSeenAt = item.createdAt.toISOString()
    }

    map.set(changeType, current)
  })

  return Array.from(map.values()).sort((a, b) => {
    if (b.acceptedRate !== a.acceptedRate) {
      return b.acceptedRate - a.acceptedRate
    }
    return b.totalCount - a.totalCount
  })
}

function buildRiskLevelStats(items: ActionDraftImprovement[]) {
  const map = new Map<ImprovementActionRiskLevel, ActionDraftDashboardStats['riskLevelStats'][number]>()

  items.forEach((item) => {
    const riskLevel = item.actionDraft.riskLevel
    const current = map.get(riskLevel) || {
      riskLevel,
      totalCount: 0,
      statusCounts: createStatusCounts(),
      unresolvedCount: 0,
      pendingReviewCount: 0,
      oldestOpenCreatedAt: undefined,
    }

    current.totalCount += 1
    current.statusCounts[item.status] += 1
    if (isUnresolved(item.status)) {
      current.unresolvedCount += 1
      if (!current.oldestOpenCreatedAt || item.createdAt.toISOString() < current.oldestOpenCreatedAt) {
        current.oldestOpenCreatedAt = item.createdAt.toISOString()
      }
    }
    if (isPendingReview(item.status)) {
      current.pendingReviewCount += 1
    }

    map.set(riskLevel, current)
  })

  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount)
}

function buildTargetFileHintStats(items: ActionDraftImprovement[], recentSince: Date) {
  const map = new Map<string, {
    targetFileHint: string
    hitCount: number
    recentHitCount: number
    lastHitAt?: string
    openCount: number
    targetAreaCounts: Map<ImprovementTargetArea, number>
    changeTypeCounts: Map<ImprovementActionChangeType, number>
  }>()

  items.forEach((item) => {
    const targetFileHint = getNormalizedTargetFileHint(item)
    const current = map.get(targetFileHint) || {
      targetFileHint,
      hitCount: 0,
      recentHitCount: 0,
      lastHitAt: undefined,
      openCount: 0,
      targetAreaCounts: new Map<ImprovementTargetArea, number>(),
      changeTypeCounts: new Map<ImprovementActionChangeType, number>(),
    }

    current.hitCount += 1
    if (item.createdAt.getTime() >= recentSince.getTime()) {
      current.recentHitCount += 1
    }
    if (isUnresolved(item.status)) {
      current.openCount += 1
    }
    if (!current.lastHitAt || item.createdAt.toISOString() > current.lastHitAt) {
      current.lastHitAt = item.createdAt.toISOString()
    }

    current.targetAreaCounts.set(
      item.actionDraft.targetArea,
      (current.targetAreaCounts.get(item.actionDraft.targetArea) || 0) + 1
    )
    current.changeTypeCounts.set(
      item.actionDraft.changeType,
      (current.changeTypeCounts.get(item.actionDraft.changeType) || 0) + 1
    )

    map.set(targetFileHint, current)
  })

  return Array.from(map.values())
    .map((item) => ({
      targetFileHint: item.targetFileHint,
      hitCount: item.hitCount,
      recentHitCount: item.recentHitCount,
      lastHitAt: item.lastHitAt,
      openCount: item.openCount,
      targetAreaDistribution: sortDistribution(
        Array.from(item.targetAreaCounts.entries()).map(([targetArea, count]) => ({ targetArea, count }))
      ),
      changeTypeDistribution: sortDistribution(
        Array.from(item.changeTypeCounts.entries()).map(([changeType, count]) => ({ changeType, count }))
      ),
    }))
    .sort((a, b) => {
      if (b.hitCount !== a.hitCount) {
        return b.hitCount - a.hitCount
      }
      return (b.lastHitAt || '').localeCompare(a.lastHitAt || '')
    })
}

function isMainPathImpact(item: ActionDraftImprovement): boolean {
  return item.targetArea === 'ESTIMATE'
    || item.targetArea === 'HANDOFF_POLICY'
    || item.impactArea === 'PRICING'
    || item.impactArea === 'HANDOFF'
    || item.diffCategory === 'QUOTE_BOUNDARY'
    || item.diffCategory === 'REVIEW_POLICY'
}

function isComplexPackagingCore(item: ActionDraftImprovement): boolean {
  return item.issueType.startsWith('PACKAGING_')
    || item.issueType === 'BUNDLE_STRUCTURE_WRONG'
    || item.issueType === 'SHOULD_ESTIMATE_BUT_QUOTED'
    || item.issueType === 'SHOULD_QUOTED_BUT_ESTIMATED'
    || item.issueType === 'SHOULD_HANDOFF_BUT_NOT'
    || getNormalizedTargetFileHint(item).includes('/packaging/')
    || item.actionDraft.actionTitle.includes('复杂包装')
}

function buildPriorityReason(reasons: string[]): string {
  return reasons.length > 0 ? `${reasons.slice(0, 3).join('；')}。` : '当前暂无明显优先级信号。'
}

function getTargetAreaFocus(targetArea: ImprovementTargetArea): string {
  switch (targetArea) {
    case 'PROMPT':
      return '优先补抽取提示与 continuation 口语样例'
    case 'REGEX':
      return '优先补抽取规则与边界样例'
    case 'FIELD_MAPPING':
      return '优先补材质、克重、印色等字段映射样例'
    case 'ESTIMATE':
      return '优先校准 estimated / quoted 边界测试'
    case 'HANDOFF_POLICY':
      return '优先校准复核原因与转人工阈值'
    case 'OTHER':
    default:
      return '优先补一条最小可复现样例'
  }
}

function getChangeTypeFocus(changeType: ImprovementActionChangeType): string {
  switch (changeType) {
    case 'mapping_update':
      return '补充白卡、单铜、克重、印色等字段映射样例'
    case 'prompt_update':
      return '增强 complex packaging 的口语表达与追加识别 prompt'
    case 'extraction_rule_update':
      return '补充抽取规则和最小回归样例'
    case 'threshold_update':
      return '补充 estimated / quoted 边界回归测试'
    case 'policy_update':
      return '校准 reviewReasons 与 requiresHumanReview 触发条件'
    case 'pricing_rule_review':
      return '先人工复核报价判断前置规则，再补稳定性回归'
    case 'test_only_update':
      return '补一条高价值回归测试并观察重复率'
    case 'other_update':
    default:
      return '先固化最小样例，再决定具体治理方式'
  }
}

function deriveRecommendedNextAction(item: ActionDraftImprovement, fileHitCount: number): string {
  let action = getChangeTypeFocus(item.actionDraft.changeType)

  if (item.diffCategory === 'BUNDLE_STRUCTURE') {
    action = '增强“再加一个说明书/贴纸”这类追加识别 prompt'
  } else if (item.diffCategory === 'PARAM_RECOGNITION' && item.actionDraft.changeType === 'mapping_update') {
    action = '优先补充白卡、单铜、克重、印色等字段映射样例'
  } else if (item.diffCategory === 'QUOTE_BOUNDARY') {
    action = '补充开窗彩盒 estimated / quoted 边界测试'
  } else if (item.diffCategory === 'REVIEW_POLICY') {
    action = '调整 large_window_ratio 等复核阈值并核对转人工条件'
  }

  if (fileHitCount >= 3) {
    action += `，并围绕 ${basename(getNormalizedTargetFileHint(item))} 做专项治理`
  }

  return `建议${action}`
}

function deriveGovernanceBucket(params: {
  item: ActionDraftImprovement
  priorityScore: number
  fileHitCount: number
  changeTypeAcceptedRate: number
  stagnantDays: number
}) {
  const { item, priorityScore, fileHitCount, changeTypeAcceptedRate, stagnantDays } = params

  if (item.status === 'REJECTED') {
    return {
      governanceBucket: 'LOW_PRIORITY' as const,
      governanceReason: '该动作已被拒绝，当前不适合继续投入治理资源。',
    }
  }

  if (item.status === 'VERIFIED') {
    return {
      governanceBucket: 'WATCHLIST' as const,
      governanceReason: '该动作已进入 VERIFIED，更适合继续观察复发情况。',
    }
  }

  if (item.actionDraft.riskLevel === 'HIGH' && isUnresolved(item.status)) {
    return {
      governanceBucket: 'HIGH_RISK_REVIEW' as const,
      governanceReason: stagnantDays >= 7
        ? `该动作高风险且已积压 ${stagnantDays} 天，建议先人工审核再决定是否改规则。`
        : '该动作高风险且尚未闭环，建议优先人工审核。',
    }
  }

  if (priorityScore >= 75 && changeTypeAcceptedRate >= 50 && isUnresolved(item.status)) {
    return {
      governanceBucket: 'IMMEDIATE_FIX' as const,
      governanceReason: `该动作重复出现且同类接受率 ${changeTypeAcceptedRate}% ，适合立即治理。`,
    }
  }

  if (item.actionDraft.riskLevel === 'LOW' && fileHitCount >= 2 && changeTypeAcceptedRate >= 50) {
    return {
      governanceBucket: 'BATCH_CLEANUP' as const,
      governanceReason: '该动作低风险但重复出现，适合集中做一轮批量清理。',
    }
  }

  if (priorityScore >= 40 || fileHitCount >= 2) {
    return {
      governanceBucket: 'WATCHLIST' as const,
      governanceReason: '当前已有一定重复信号，但还需要继续观察收益和时机。',
    }
  }

  return {
    governanceBucket: 'LOW_PRIORITY' as const,
    governanceReason: '当前频次、收益和风险都偏低，可暂缓处理。',
  }
}

function deriveWhyNow(governanceBucket: ActionDraftGovernanceBucket): string {
  switch (governanceBucket) {
    case 'IMMEDIATE_FIX':
      return '近期重复出现，且同类动作更容易落地，现在投入产出比最高。'
    case 'HIGH_RISK_REVIEW':
      return '该类问题直接影响报价或转人工判断，继续拖延会放大人工复核成本。'
    case 'BATCH_CLEANUP':
      return '这类问题低风险但高频，适合集中一轮清理后快速回收收益。'
    case 'WATCHLIST':
      return '当前已有信号，但优先级还不够稳定，适合继续观察。'
    case 'LOW_PRIORITY':
    default:
      return '当前信号较弱，暂时不是最值得先做的治理对象。'
  }
}

function buildRankedActionDraftPriority(params: {
  item: ActionDraftImprovement
  now: Date
  targetAreaStat?: TargetAreaStat
  changeTypeStat?: ChangeTypeStat
  targetFileStat?: TargetFileHintStat
}): RankedActionDraftPriority {
  const { item, now, targetAreaStat, changeTypeStat, targetFileStat } = params
  const fileHitCount = targetFileStat?.hitCount || 1
  const changeTypeAcceptedRate = changeTypeStat?.acceptedRate || 0
  const targetAreaAcceptedRate = targetAreaStat?.acceptedRate || 0
  const activityDate = getActivityDate(item)
  const stagnantDays = isUnresolved(item.status)
    ? Math.max(0, Math.floor((now.getTime() - activityDate.getTime()) / (24 * 60 * 60 * 1000)))
    : 0

  let priorityScore = 0
  const reasons: string[] = []

  if (fileHitCount >= 4) {
    priorityScore += 24
    reasons.push(`同一目标文件已反复命中 ${fileHitCount} 次`)
  } else if (fileHitCount >= 3) {
    priorityScore += 18
    reasons.push(`同一目标文件近期重复命中 ${fileHitCount} 次`)
  } else if (fileHitCount >= 2) {
    priorityScore += 10
    reasons.push('同一目标文件已出现重复问题')
  } else {
    priorityScore += 4
  }

  if ((targetAreaStat?.totalCount || 0) >= 4) {
    priorityScore += 10
  } else if ((targetAreaStat?.totalCount || 0) >= 2) {
    priorityScore += 6
  } else {
    priorityScore += 2
  }

  if (changeTypeAcceptedRate >= 80) {
    priorityScore += 18
    reasons.push(`同类 changeType 接受率 ${changeTypeAcceptedRate}%`)
  } else if (changeTypeAcceptedRate >= 60) {
    priorityScore += 12
    reasons.push(`同类 changeType 接受率 ${changeTypeAcceptedRate}%`)
  } else if (changeTypeAcceptedRate >= 40) {
    priorityScore += 6
    reasons.push(`同类 changeType 已出现明确接受信号 (${changeTypeAcceptedRate}%)`)
  }

  switch (item.actionDraft.riskLevel) {
    case 'HIGH':
      priorityScore += 20
      reasons.push('当前属于高风险动作')
      break
    case 'MEDIUM':
      priorityScore += 10
      break
    case 'LOW':
    default:
      priorityScore += 4
      break
  }

  if (isPendingReview(item.status)) {
    priorityScore += 12
    reasons.push(`当前仍处于 ${item.status} 待处理状态`)
  } else if (isUnresolved(item.status)) {
    priorityScore += 6
  }

  if (stagnantDays >= 14) {
    priorityScore += 12
    reasons.push(`已积压 ${stagnantDays} 天`)
  } else if (stagnantDays >= 7) {
    priorityScore += 8
    reasons.push(`已积压 ${stagnantDays} 天`)
  } else if (stagnantDays >= 3) {
    priorityScore += 4
  }

  if (fileHitCount >= 3) {
    priorityScore += 10
    reasons.push('已经具备专项治理价值')
  }

  if (isMainPathImpact(item)) {
    priorityScore += 12
    reasons.push('直接影响预报价或转人工主路径')
  }

  if (isComplexPackagingCore(item)) {
    priorityScore += 8
  }

  if (item.status === 'IMPLEMENTED') {
    priorityScore -= 8
  } else if (item.status === 'VERIFIED') {
    priorityScore -= 28
  } else if (item.status === 'REJECTED') {
    priorityScore -= 35
  }

  if (targetAreaAcceptedRate >= 70) {
    priorityScore += 6
  } else if (targetAreaAcceptedRate >= 40) {
    priorityScore += 3
  }

  const normalizedScore = clampScore(priorityScore)
  const priorityLevel = toPriorityLevel(normalizedScore)
  const { governanceBucket, governanceReason } = deriveGovernanceBucket({
    item,
    priorityScore: normalizedScore,
    fileHitCount,
    changeTypeAcceptedRate,
    stagnantDays,
  })

  return {
    id: item.id,
    sourceReflectionId: item.sourceReflectionId,
    title: item.title,
    actionTitle: item.actionDraft.actionTitle,
    targetArea: item.actionDraft.targetArea,
    changeType: item.actionDraft.changeType,
    riskLevel: item.actionDraft.riskLevel,
    status: item.status,
    targetFileHint: item.targetFileHint || item.actionDraft.targetFileHint,
    createdAt: item.createdAt.toISOString(),
    lastActionAt: item.lastActionAt,
    stagnantDays,
    priorityScore: normalizedScore,
    priorityLevel,
    priorityReason: buildPriorityReason(reasons),
    governanceBucket,
    governanceReason,
    recommendedNextAction: deriveRecommendedNextAction(item, fileHitCount),
    governanceTheme: getGovernanceTheme(item),
    whyNow: deriveWhyNow(governanceBucket),
    changeTypeAcceptedRate,
    targetFileHitCount: fileHitCount,
    isSpecialGovernanceCandidate: fileHitCount >= 3,
  }
}

function buildGovernanceBucketCounts(items: RankedActionDraftPriority[]) {
  const map = new Map<ActionDraftGovernanceBucket, number>()
  items.forEach((item) => {
    map.set(item.governanceBucket, (map.get(item.governanceBucket) || 0) + 1)
  })

  return Array.from(map.entries())
    .map(([governanceBucket, count]) => ({ governanceBucket, count }))
    .sort((a, b) => b.count - a.count)
}

function buildTargetFileGovernanceCandidates(params: {
  items: ActionDraftImprovement[]
  targetFileHintStats: TargetFileHintStat[]
  changeTypeStatsMap: Map<ImprovementActionChangeType, ChangeTypeStat>
}): TargetFileGovernanceCandidate[] {
  const grouped = new Map<string, ActionDraftImprovement[]>()
  params.items.forEach((item) => {
    const key = getNormalizedTargetFileHint(item)
    const current = grouped.get(key) || []
    current.push(item)
    grouped.set(key, current)
  })

  return params.targetFileHintStats.map((fileStat) => {
    const relatedItems = grouped.get(fileStat.targetFileHint) || []
    const dominantTargetArea = fileStat.targetAreaDistribution[0]?.targetArea || 'OTHER'
    const dominantChangeType = fileStat.changeTypeDistribution[0]?.changeType || 'other_update'
    const dominantChangeTypeAcceptedRate = params.changeTypeStatsMap.get(dominantChangeType)?.acceptedRate || 0
    const hasHighRiskOpen = relatedItems.some((item) => item.actionDraft.riskLevel === 'HIGH' && isUnresolved(item.status))
    const isSpecialGovernanceCandidate = fileStat.hitCount >= 3 || (fileStat.hitCount >= 2 && fileStat.openCount >= 2)

    let score = 0
    if (fileStat.hitCount >= 5) score += 35
    else if (fileStat.hitCount >= 3) score += 26
    else if (fileStat.hitCount >= 2) score += 18
    else score += 8

    if (fileStat.openCount >= 3) score += 20
    else if (fileStat.openCount >= 2) score += 12
    else if (fileStat.openCount >= 1) score += 6

    if (hasHighRiskOpen) score += 18
    if (dominantChangeTypeAcceptedRate >= 80) score += 16
    else if (dominantChangeTypeAcceptedRate >= 60) score += 10
    else if (dominantChangeTypeAcceptedRate >= 40) score += 5
    if (dominantTargetArea === 'ESTIMATE' || dominantTargetArea === 'HANDOFF_POLICY') score += 12

    const priorityScore = clampScore(score)
    const priorityLevel = toPriorityLevel(priorityScore)

    let governanceBucket: ActionDraftGovernanceBucket = 'LOW_PRIORITY'
    let governanceReason = '当前频次和收益都偏低，可暂缓。'

    if (hasHighRiskOpen && isSpecialGovernanceCandidate) {
      governanceBucket = 'HIGH_RISK_REVIEW'
      governanceReason = '该文件反复命中且包含高风险未闭环项，建议作为优先人工审核对象。'
    } else if (isSpecialGovernanceCandidate && dominantChangeTypeAcceptedRate >= 60 && priorityScore >= 70) {
      governanceBucket = 'IMMEDIATE_FIX'
      governanceReason = '该文件命中频次高，且主导变更类型接受率高，适合优先专项治理。'
    } else if (isSpecialGovernanceCandidate) {
      governanceBucket = 'BATCH_CLEANUP'
      governanceReason = '该文件问题重复出现，适合围绕同一文件做一轮批量清理。'
    } else if (priorityScore >= 40) {
      governanceBucket = 'WATCHLIST'
      governanceReason = '该文件已出现一定重复信号，但还需要继续观察。'
    }

    return {
      targetFileHint: fileStat.targetFileHint,
      hitCount: fileStat.hitCount,
      recentHitCount: fileStat.recentHitCount,
      lastHitAt: fileStat.lastHitAt,
      openCount: fileStat.openCount,
      targetAreaDistribution: fileStat.targetAreaDistribution,
      changeTypeDistribution: fileStat.changeTypeDistribution,
      priorityScore,
      priorityLevel,
      governanceBucket,
      governanceReason,
      recommendedNextAction: `建议围绕 ${basename(fileStat.targetFileHint)} 集中治理 ${getTargetAreaFocus(dominantTargetArea)}。`,
      governanceTheme: dominantTargetArea === 'OTHER' ? '专项治理候选' : `${dominantTargetArea} 专项治理`,
      whyNow: governanceBucket === 'HIGH_RISK_REVIEW'
        ? '该文件同时承载高频与高风险问题，优先处理能减少主路径不稳定性。'
        : governanceBucket === 'IMMEDIATE_FIX'
          ? '该文件问题已经形成重复模式，且治理成功率较高，适合现在投入。'
          : governanceBucket === 'BATCH_CLEANUP'
            ? '同一文件内问题形态集中，批量处理的边际成本更低。'
            : '当前已有信号，但优先级仍低于更直接的治理对象。',
      isSpecialGovernanceCandidate,
    }
  }).sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore
    }
    return b.hitCount - a.hitCount
  })
}

function buildHighAcceptanceDirections(params: {
  changeTypeStats: ChangeTypeStat[]
  targetAreaStats: TargetAreaStat[]
}) {
  return {
    changeTypes: params.changeTypeStats
      .filter((item) => item.acceptedRate > 0)
      .sort((a, b) => {
        if (b.acceptedRate !== a.acceptedRate) {
          return b.acceptedRate - a.acceptedRate
        }
        return b.totalCount - a.totalCount
      })
      .slice(0, 5)
      .map((item) => ({
        changeType: item.changeType,
        totalCount: item.totalCount,
        acceptedRate: item.acceptedRate,
        recommendedFocus: `建议优先${getChangeTypeFocus(item.changeType)}`,
        whyNow: `该 changeType 当前接受率 ${item.acceptedRate}% ，更适合作为优先投入方向。`,
      })),
    targetAreas: params.targetAreaStats
      .filter((item) => item.acceptedRate > 0)
      .sort((a, b) => {
        if (b.acceptedRate !== a.acceptedRate) {
          return b.acceptedRate - a.acceptedRate
        }
        return b.totalCount - a.totalCount
      })
      .slice(0, 5)
      .map((item) => ({
        targetArea: item.targetArea,
        totalCount: item.totalCount,
        acceptedRate: item.acceptedRate,
        recommendedFocus: `建议${getTargetAreaFocus(item.targetArea)}`,
        whyNow: `该 targetArea 当前接受率 ${item.acceptedRate}% ，适合优先投入。`,
      })),
  }
}

export function buildActionDraftDashboardStats(params: {
  approvedReflections: ReflectionForImprovement[]
  filters?: ActionDraftDashboardFilters
  now?: Date
}): ActionDraftDashboardStats {
  const now = params.now || new Date()
  const filters = normalizeFilters(params.filters)
  const recentWindowDays = getRecentWindowDays(filters.timeRangeDays)
  const recentSince = new Date(now.getTime() - recentWindowDays * 24 * 60 * 60 * 1000)
  const activitySince = typeof filters.timeRangeDays === 'number'
    ? new Date(now.getTime() - filters.timeRangeDays * 24 * 60 * 60 * 1000)
    : null

  const allActionDrafts = buildImprovementSuggestions(params.approvedReflections)
    .filter((item): item is ActionDraftImprovement => Boolean(item.actionDraft))
  const filteredItems = allActionDrafts.filter((item) => matchesFilters(item, filters, activitySince))

  const targetAreaStats = buildTargetAreaStats(filteredItems, recentSince)
  const changeTypeStats = buildChangeTypeStats(filteredItems)
  const riskLevelStats = buildRiskLevelStats(filteredItems)
  const targetFileHintStats = buildTargetFileHintStats(filteredItems, recentSince)
  const highRiskUnresolvedCount = filteredItems.filter((item) => item.actionDraft.riskLevel === 'HIGH' && isUnresolved(item.status)).length
  const repeatedTargetFileHintCount = targetFileHintStats.filter((item) => item.hitCount >= 2).length

  const targetAreaStatsMap = new Map(targetAreaStats.map((item) => [item.targetArea, item]))
  const changeTypeStatsMap = new Map(changeTypeStats.map((item) => [item.changeType, item]))
  const targetFileHintStatsMap = new Map(targetFileHintStats.map((item) => [item.targetFileHint, item]))

  const rankedItems = filteredItems
    .map((item) => buildRankedActionDraftPriority({
      item,
      now,
      targetAreaStat: targetAreaStatsMap.get(item.actionDraft.targetArea),
      changeTypeStat: changeTypeStatsMap.get(item.actionDraft.changeType),
      targetFileStat: targetFileHintStatsMap.get(getNormalizedTargetFileHint(item)),
    }))
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore
      }
      if (b.targetFileHitCount !== a.targetFileHitCount) {
        return b.targetFileHitCount - a.targetFileHitCount
      }
      return b.stagnantDays - a.stagnantDays
    })

  const targetFileCandidates = buildTargetFileGovernanceCandidates({
    items: filteredItems,
    targetFileHintStats,
    changeTypeStatsMap,
  })

  return {
    generatedAt: now.toISOString(),
    filters: {
      timeRangeDays: filters.timeRangeDays,
      recentWindowDays,
      status: filters.status,
      targetArea: filters.targetArea,
      changeType: filters.changeType,
      riskLevel: filters.riskLevel,
      activitySince: activitySince?.toISOString(),
    },
    summary: {
      totalActionDraftCount: allActionDrafts.length,
      filteredActionDraftCount: filteredItems.length,
      exactAcceptedCount: filteredItems.filter((item) => item.status === 'ACCEPTED').length,
      acceptedOrLaterCount: filteredItems.filter((item) => isAcceptedOrLater(item.status)).length,
      unresolvedCount: filteredItems.filter((item) => isUnresolved(item.status)).length,
      pendingReviewCount: filteredItems.filter((item) => isPendingReview(item.status)).length,
      highRiskUnresolvedCount,
      repeatedTargetFileHintCount,
    },
    targetAreaStats,
    changeTypeStats,
    riskLevelStats,
    targetFileHintStats,
    rankedActionDrafts: rankedItems,
    highRiskBacklog: rankedItems.filter((item) => item.riskLevel === 'HIGH' && item.status !== 'VERIFIED' && item.status !== 'REJECTED').slice(0, 10),
    priorityInsights: {
      topActions: rankedItems.filter((item) => item.governanceBucket !== 'LOW_PRIORITY').slice(0, 10),
      governanceBucketCounts: buildGovernanceBucketCounts(rankedItems),
      targetFileCandidates: targetFileCandidates.slice(0, 10),
      highAcceptanceDirections: buildHighAcceptanceDirections({
        changeTypeStats,
        targetAreaStats,
      }),
    },
    emptyState: {
      hasActionDrafts: allActionDrafts.length > 0,
      hasFilteredResults: filteredItems.length > 0,
    },
  }
}

export function getActionDraftDashboardFilterOptions() {
  return {
    statuses: ['ALL', ...ALL_STATUSES] as const,
    timeRanges: ['ALL', 7, 30, 90] as const,
  }
}