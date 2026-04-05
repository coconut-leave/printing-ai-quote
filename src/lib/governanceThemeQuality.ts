import type { GovernanceEffectivenessLabel } from '@/server/learning/governanceEffectiveness'
import type { GovernanceThemeQualityLabel, GovernanceThemeRecommendationSummary } from '@/server/learning/governancePlanAdoption'
import type { GovernanceWorkbenchPlanView } from '@/server/learning/governanceWorkbench'

export type GovernanceThemeQualitySortField =
  | 'governanceTheme'
  | 'themeQualityLabel'
  | 'acceptedRate'
  | 'improvingCount'
  | 'recurringCount'
  | 'priorityLevel'
  | 'effectivenessLabel'

export type GovernanceThemeQualitySortDirection = 'asc' | 'desc'

export type GovernanceThemeQualityFilterId =
  | 'KEEP_RECOMMENDING'
  | 'HIGH_RECURRING'
  | 'HIGH_ACCEPTED_RATE'
  | 'LOW_QUALITY'
  | 'HIGH_RISK'
  | 'LOW_SIGNAL'

export const GOVERNANCE_THEME_QUALITY_SORT_OPTIONS: Array<{
  value: GovernanceThemeQualitySortField
  label: string
}> = [
  { value: 'themeQualityLabel', label: 'Theme Quality' },
  { value: 'acceptedRate', label: '主题采纳率' },
  { value: 'improvingCount', label: '改善计划数' },
  { value: 'recurringCount', label: '复发累计' },
  { value: 'priorityLevel', label: '计划优先级' },
  { value: 'effectivenessLabel', label: '效果标签' },
  { value: 'governanceTheme', label: '治理主题' },
]

export const GOVERNANCE_THEME_QUALITY_FILTER_OPTIONS: Array<{
  value: GovernanceThemeQualityFilterId
  label: string
}> = [
  { value: 'KEEP_RECOMMENDING', label: '值得继续推荐' },
  { value: 'HIGH_RECURRING', label: '高复发' },
  { value: 'HIGH_ACCEPTED_RATE', label: '高采纳率' },
  { value: 'LOW_QUALITY', label: '低质量主题' },
  { value: 'HIGH_RISK', label: '高风险' },
  { value: 'LOW_SIGNAL', label: '样本不足' },
]

const HIGH_RECURRING_THRESHOLD = 2
const HIGH_ACCEPTED_RATE_THRESHOLD = 60

function themeQualityWeight(value?: GovernanceThemeQualityLabel): number {
  switch (value) {
    case 'KEEP_RECOMMENDING':
      return 3
    case 'WATCH':
      return 2
    case 'CAUTION':
      return 1
    default:
      return 0
  }
}

function priorityWeight(value?: string): number {
  switch (value) {
    case 'HIGH':
      return 3
    case 'MEDIUM':
      return 2
    case 'LOW':
      return 1
    default:
      return 0
  }
}

function effectivenessWeight(value?: GovernanceEffectivenessLabel): number {
  switch (value) {
    case 'IMPROVING':
      return 5
    case 'STABLE':
      return 4
    case 'RECURRING':
      return 3
    case 'NEEDS_REVIEW':
      return 2
    case 'LOW_SIGNAL':
      return 1
    default:
      return 0
  }
}

function compareNumbers(a: number, b: number, direction: GovernanceThemeQualitySortDirection): number {
  return direction === 'asc' ? a - b : b - a
}

function compareStrings(a: string, b: string, direction: GovernanceThemeQualitySortDirection): number {
  return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
}

export function formatThemeQualityLabel(value?: GovernanceThemeQualityLabel): string {
  const map: Record<GovernanceThemeQualityLabel, string> = {
    KEEP_RECOMMENDING: '继续推荐',
    WATCH: '继续观察',
    CAUTION: '谨慎推荐',
  }

  return value ? (map[value] || value) : '继续观察'
}

export function getThemeQualityBadgeClass(value?: GovernanceThemeQualityLabel): string {
  switch (value) {
    case 'KEEP_RECOMMENDING':
      return 'rounded bg-emerald-50 px-3 py-1 text-xs text-emerald-700'
    case 'CAUTION':
      return 'rounded bg-amber-50 px-3 py-1 text-xs text-amber-700'
    case 'WATCH':
    default:
      return 'rounded bg-slate-100 px-3 py-1 text-xs text-slate-700'
  }
}

export function matchesThemeQualityFilter(item: GovernanceWorkbenchPlanView, filterId: GovernanceThemeQualityFilterId): boolean {
  switch (filterId) {
    case 'KEEP_RECOMMENDING':
      return item.themeQualityLabel === 'KEEP_RECOMMENDING' || Boolean(item.shouldKeepRecommend)
    case 'HIGH_RECURRING':
      return (item.themeRecurringCount ?? item.recurrenceCount ?? 0) >= HIGH_RECURRING_THRESHOLD
    case 'HIGH_ACCEPTED_RATE':
      return (item.themeAcceptedRate ?? 0) >= HIGH_ACCEPTED_RATE_THRESHOLD
    case 'LOW_QUALITY':
      return item.themeQualityLabel === 'CAUTION' || (item.themeSummary?.lowValueCount ?? 0) > 0 || item.recommendationQualityLabel === 'LOW_VALUE'
    case 'HIGH_RISK':
      return item.priorityLevel === 'HIGH' || item.effectivenessLabel === 'RECURRING' || item.effectivenessLabel === 'NEEDS_REVIEW'
    case 'LOW_SIGNAL':
      return item.effectivenessLabel === 'LOW_SIGNAL' || item.recommendationQualityLabel === 'UNCLEAR' || (item.themePlanCount ?? 0) <= 1
    default:
      return true
  }
}

export function applyThemeQualityWorkbenchView(params: {
  items: GovernanceWorkbenchPlanView[]
  sortField: GovernanceThemeQualitySortField
  sortDirection: GovernanceThemeQualitySortDirection
  filters: GovernanceThemeQualityFilterId[]
}): GovernanceWorkbenchPlanView[] {
  const filtered = params.filters.length === 0
    ? [...params.items]
    : params.items.filter((item) => params.filters.every((filterId) => matchesThemeQualityFilter(item, filterId)))

  return filtered.sort((a, b) => {
    switch (params.sortField) {
      case 'governanceTheme':
        return compareStrings(a.governanceTheme, b.governanceTheme, params.sortDirection)
      case 'themeQualityLabel': {
        const byWeight = compareNumbers(themeQualityWeight(a.themeQualityLabel), themeQualityWeight(b.themeQualityLabel), params.sortDirection)
        if (byWeight !== 0) return byWeight
        return compareNumbers(a.themeAcceptedRate ?? 0, b.themeAcceptedRate ?? 0, 'desc')
      }
      case 'acceptedRate':
        return compareNumbers(a.themeAcceptedRate ?? 0, b.themeAcceptedRate ?? 0, params.sortDirection)
      case 'improvingCount':
        return compareNumbers(a.themeSummary?.improvingCount ?? 0, b.themeSummary?.improvingCount ?? 0, params.sortDirection)
      case 'recurringCount':
        return compareNumbers(a.themeRecurringCount ?? a.recurrenceCount ?? 0, b.themeRecurringCount ?? b.recurrenceCount ?? 0, params.sortDirection)
      case 'priorityLevel':
        return compareNumbers(priorityWeight(a.priorityLevel), priorityWeight(b.priorityLevel), params.sortDirection)
      case 'effectivenessLabel':
        return compareNumbers(effectivenessWeight(a.effectivenessLabel), effectivenessWeight(b.effectivenessLabel), params.sortDirection)
      default:
        return 0
    }
  })
}

export function sortThemeSummaries(items: GovernanceThemeRecommendationSummary[]): GovernanceThemeRecommendationSummary[] {
  return [...items].sort((a, b) => {
    if (themeQualityWeight(b.themeQualityLabel) !== themeQualityWeight(a.themeQualityLabel)) {
      return themeQualityWeight(b.themeQualityLabel) - themeQualityWeight(a.themeQualityLabel)
    }

    if (b.improvingCount !== a.improvingCount) {
      return b.improvingCount - a.improvingCount
    }

    if (b.recurringCount !== a.recurringCount) {
      return b.recurringCount - a.recurringCount
    }

    return b.acceptedRate - a.acceptedRate
  })
}