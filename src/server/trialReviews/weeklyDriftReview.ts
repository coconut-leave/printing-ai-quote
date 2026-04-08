import {
  getTrialReviewCalibrationSignalLabel,
  getTrialReviewDriftDirectionLabel,
  getTrialReviewTargetAreaLabel,
  getTrialReviewRejectionCategoryLabel,
} from '@/lib/admin/presentation'

export type WeeklyTrialDriftInput = {
  createdAt: Date | string
  sourceKind: string
  rejectionCategory: string | null
  rejectionTargetArea: string | null
  calibrationSignal: string | null
  driftSourceCandidate: string | null
  driftDirection: string | null
}

export type WeeklyTrialDriftArchive = {
  weekKey: string
  weekLabel: string
  quotedFeedbackCount: number
  targetAreaBreakdown: Array<{ targetArea: string; label: string; count: number }>
  driftDirectionBreakdown: Array<{ direction: string; label: string; count: number }>
  rejectionCategoryBreakdown: Array<{ category: string; label: string; count: number }>
}

export type WeeklyTrialDriftSignal = {
  driftSourceCandidate: string
  driftDirection: string | null
  driftDirectionLabel: string | null
  consecutiveCount: number
  threshold: number
  remainingToThreshold: number
  status: 'far_from_threshold' | 'near_threshold' | 'triggered'
  latestCalibrationSignal: string | null
  latestCalibrationSignalLabel: string | null
}

export type WeeklyTrialDriftReview = {
  threshold: number
  generatedAt: string
  totalQuotedFeedbackCount: number
  weeklyArchives: WeeklyTrialDriftArchive[]
  currentSignal: WeeklyTrialDriftSignal | null
  note: string
}

const WEEKLY_THRESHOLD_NEAR_WINDOW = 3

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function getWeekStart(date: Date): Date {
  const nextDate = new Date(date)
  const day = nextDate.getDay()
  const delta = day === 0 ? -6 : 1 - day
  nextDate.setHours(0, 0, 0, 0)
  nextDate.setDate(nextDate.getDate() + delta)
  return nextDate
}

function formatWeekKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const start = weekStart.toISOString().slice(0, 10)
  const end = weekEnd.toISOString().slice(0, 10)
  return `${start} ~ ${end}`
}

function incrementCounter(counter: Map<string, number>, key: string | null | undefined) {
  if (!key) {
    return
  }

  counter.set(key, (counter.get(key) || 0) + 1)
}

function sortBreakdown(counter: Map<string, number>) {
  return [...counter.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
}

export function buildWeeklyTrialDriftReview(
  entries: WeeklyTrialDriftInput[],
  threshold: number,
): WeeklyTrialDriftReview {
  const quotedEntries = entries
    .filter((item) => item.sourceKind === 'QUOTED_FEEDBACK')
    .sort((left, right) => normalizeDate(left.createdAt).getTime() - normalizeDate(right.createdAt).getTime())

  const weeklyMap = new Map<string, {
    weekStart: Date
    targetAreaCounter: Map<string, number>
    directionCounter: Map<string, number>
    categoryCounter: Map<string, number>
    quotedFeedbackCount: number
  }>()

  let currentSignal: WeeklyTrialDriftSignal | null = null
  let currentSource: string | null = null
  let currentDirection: string | null = null
  let currentCount = 0
  let latestCalibrationSignal: string | null = null

  for (const entry of quotedEntries) {
    const createdAt = normalizeDate(entry.createdAt)
    const weekStart = getWeekStart(createdAt)
    const weekKey = formatWeekKey(weekStart)
    const archive = weeklyMap.get(weekKey) || {
      weekStart,
      targetAreaCounter: new Map<string, number>(),
      directionCounter: new Map<string, number>(),
      categoryCounter: new Map<string, number>(),
      quotedFeedbackCount: 0,
    }

    archive.quotedFeedbackCount += 1
    incrementCounter(archive.targetAreaCounter, entry.rejectionTargetArea)
    incrementCounter(archive.directionCounter, entry.driftDirection)
    incrementCounter(archive.categoryCounter, entry.rejectionCategory)
    weeklyMap.set(weekKey, archive)

    if (!entry.driftSourceCandidate || !entry.driftDirection) {
      currentSource = null
      currentDirection = null
      currentCount = 0
      latestCalibrationSignal = null
      continue
    }

    if (entry.driftSourceCandidate === currentSource && entry.driftDirection === currentDirection) {
      currentCount += 1
    } else {
      currentSource = entry.driftSourceCandidate
      currentDirection = entry.driftDirection
      currentCount = 1
    }

    latestCalibrationSignal = entry.calibrationSignal || null
    const remainingToThreshold = Math.max(threshold - currentCount, 0)
    currentSignal = {
      driftSourceCandidate: currentSource,
      driftDirection: currentDirection,
      driftDirectionLabel: getTrialReviewDriftDirectionLabel(currentDirection),
      consecutiveCount: currentCount,
      threshold,
      remainingToThreshold,
      status: currentCount >= threshold
        ? 'triggered'
        : remainingToThreshold <= WEEKLY_THRESHOLD_NEAR_WINDOW
          ? 'near_threshold'
          : 'far_from_threshold',
      latestCalibrationSignal,
      latestCalibrationSignalLabel: latestCalibrationSignal ? getTrialReviewCalibrationSignalLabel(latestCalibrationSignal) : null,
    }
  }

  const weeklyArchives = [...weeklyMap.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([weekKey, archive]) => ({
      weekKey,
      weekLabel: formatWeekLabel(archive.weekStart),
      quotedFeedbackCount: archive.quotedFeedbackCount,
      targetAreaBreakdown: sortBreakdown(archive.targetAreaCounter).map(([targetArea, count]) => ({
        targetArea,
        label: getTrialReviewTargetAreaLabel(targetArea),
        count,
      })),
      driftDirectionBreakdown: sortBreakdown(archive.directionCounter).map(([direction, count]) => ({
        direction,
        label: getTrialReviewDriftDirectionLabel(direction),
        count,
      })),
      rejectionCategoryBreakdown: sortBreakdown(archive.categoryCounter).map(([category, count]) => ({
        category,
        label: getTrialReviewRejectionCategoryLabel(category),
        count,
      })),
    }))

  return {
    threshold,
    generatedAt: new Date().toISOString(),
    totalQuotedFeedbackCount: quotedEntries.length,
    weeklyArchives,
    currentSignal,
    note: currentSignal
      ? currentSignal.status === 'triggered'
        ? `当前严格连续漂移已达到 ${currentSignal.consecutiveCount} 单，可按 stop rule 重开 calibration。`
        : `当前严格连续漂移为 ${currentSignal.consecutiveCount} 单；只有同一误差源、同一方向连续达到 ${threshold} 单才重开 calibration。`
      : `当前虽已有正式报价反馈，但还没有形成同一误差源、同一方向的连续漂移信号。`,
  }
}