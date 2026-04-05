export type ConversationTimePreset = 'all' | 'today' | 'month' | 'year' | 'custom'

export type ConversationTimeFilterInput = {
  timePreset?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type ResolvedConversationTimeFilter = {
  timePreset: ConversationTimePreset
  startDate?: string
  endDate?: string
  startAt?: Date
  endAtExclusive?: Date
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

export function resolveConversationTimeFilter(
  input: ConversationTimeFilterInput,
  now: Date = new Date()
): ResolvedConversationTimeFilter {
  const presetCandidate = (input.timePreset || 'all').toLowerCase()
  const timePreset: ConversationTimePreset = ['all', 'today', 'month', 'year', 'custom'].includes(presetCandidate)
    ? presetCandidate as ConversationTimePreset
    : 'all'

  if (timePreset === 'today') {
    const startAt = toDayStart(now)
    return {
      timePreset,
      startAt,
      endAtExclusive: addDays(startAt, 1),
    }
  }

  if (timePreset === 'month') {
    const startAt = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      timePreset,
      startAt,
      endAtExclusive: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }

  if (timePreset === 'year') {
    const startAt = new Date(now.getFullYear(), 0, 1)
    return {
      timePreset,
      startAt,
      endAtExclusive: new Date(now.getFullYear() + 1, 0, 1),
    }
  }

  if (timePreset === 'custom') {
    const start = parseDateOnly(input.startDate)
    const end = parseDateOnly(input.endDate)

    if (start && end && start.getTime() <= end.getTime()) {
      return {
        timePreset,
        startDate: input.startDate || undefined,
        endDate: input.endDate || undefined,
        startAt: start,
        endAtExclusive: addDays(end, 1),
      }
    }

    return {
      timePreset,
      startDate: input.startDate || undefined,
      endDate: input.endDate || undefined,
    }
  }

  return { timePreset: 'all' }
}

export function buildConversationUpdatedAtWhere(filter: ResolvedConversationTimeFilter) {
  if (!filter.startAt || !filter.endAtExclusive) {
    return undefined
  }

  return {
    gte: filter.startAt,
    lt: filter.endAtExclusive,
  }
}

export function isDateWithinConversationTimeFilter(value: Date | string, filter: ResolvedConversationTimeFilter): boolean {
  if (!filter.startAt || !filter.endAtExclusive) {
    return true
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date >= filter.startAt && date < filter.endAtExclusive
}

export function getConversationTimeFilterLabel(filter: ResolvedConversationTimeFilter): string {
  switch (filter.timePreset) {
    case 'today':
      return '今日'
    case 'month':
      return '本月'
    case 'year':
      return '本年'
    case 'custom':
      if (filter.startDate && filter.endDate) {
        return `${filter.startDate}至${filter.endDate}`
      }
      return '自定义范围'
    default:
      return '全部时间'
  }
}