import type { TuckEndPhaseTwoManualReviewDraft } from './tuckEndBoxPhaseTwoDraft'

export const TUCK_END_PHASE_TWO_HANDOFF_LIVE_KEYWORDS_DRAFT = [
  '开窗双插盒',
  '双插开窗盒',
  '激凸',
  '局部UV',
  '逆向UV',
  '屏幕双插盒',
  '屏幕双插大盒',
] as const

export const TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_DRAFT = [] as const satisfies readonly TuckEndPhaseTwoManualReviewDraft[]

export const TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT = {
  batchId: 'tuck_end_phase_two_handoff_live_coverage_batch_one_2026_04_05',
  family: 'tuck_end_box',
  reviewIntent: 'explicit_handoff_live_coverage',
  searchScope: 'all live customer messages with next assistant turn inspection, filtered by explicit tuck_end handoff keywords',
  keywords: TUCK_END_PHASE_TWO_HANDOFF_LIVE_KEYWORDS_DRAFT,
  keywordHitCount: 0,
  motherPoolMatches: 0,
  reviewedCount: 0,
  coverageGap: true,
  coverageGapType: 'no_live_traffic_for_explicit_handoff_keywords',
  finding: 'Current live data contains no customer messages matching the explicit tuck_end handoff keyword set, so the handoff boundary gap is presently a traffic gap rather than a no-shadow gap or unstable handoff gap.',
  conclusions: {
    hasExplicitHandoffTraffic: false,
    hasTrafficButNoShadow: false,
    hasShadowButNotHandoffRequired: false,
    packagingTypeStabilityObserved: false,
    highComplexityRecognitionObserved: false,
  },
  nextCoverageAction: 'Keep handoff coverage isolated from companion drift and continue monitoring the live mother pool for the same explicit keyword set until the first real handoff-boundary sample appears.',
} as const