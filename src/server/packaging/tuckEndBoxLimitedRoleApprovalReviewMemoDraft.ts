import type { TuckEndPhaseTwoManualReviewDraft } from './tuckEndBoxPhaseTwoDraft'
import { TUCK_END_BOX_LIMITED_ROLE_REVIEW_MEMO_DRAFT } from './tuckEndBoxLimitedRoleReviewMemoDraft'
import { TUCK_END_COMPANION_FAILURE_ATTRIBUTION_SUMMARY_DRAFT } from './tuckEndBoxCompanionPathFailureAttributionDraft'
import { TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT } from './tuckEndBoxPhaseTwoHandoffLiveCoverageBatchOneDraft'
import { TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_SUMMARY_DRAFT } from './tuckEndBoxPhaseTwoLiveReviewBatchOneDraft'
import { TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_SUMMARY_DRAFT } from './tuckEndBoxPhaseTwoLiveReviewBatchTwoDraft'
import {
  TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT,
  TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT,
} from './tuckEndBoxPhaseTwoLiveReviewBatchThreeDraft'

const targetPathReviews: readonly TuckEndPhaseTwoManualReviewDraft[] = TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT

const targetPathBenchmarkFacts = {
  secondPhaseSubtotal: 2653,
  liveAuthoritativeQuoteSubtotal: 2686,
  fixedGapAmount: -33,
  fixedGapPercent: -1.2286,
} as const

export const TUCK_END_BOX_LIMITED_ROLE_APPROVAL_REVIEW_MEMO_DRAFT = {
  memoId: 'tuck_end_box_limited_role_approval_review_memo_2026_04_05',
  family: 'tuck_end_box',
  approvalTarget: {
    pathId: 'standard_double_tuck_main_item',
    pathBucket: 'quoted_clean_subset',
    currentStatus: 'candidate_ready',
    currentApprovalState: 'not_approved_for_limited_role_yet',
    reviewGoal: 'determine_whether_the_path_is_ready_for_limited_role_approval',
    scopeNote: 'This approval memo remains path-scoped to standard_double_tuck_main_item only. It does not expand approval consideration to the full tuck_end_box family.',
  },
  evidenceSources: [
    'src/server/packaging/tuckEndBoxLimitedRoleReviewMemoDraft.ts',
    'src/server/packaging/tuckEndBoxPhaseTwoLiveReviewBatchOneDraft.ts',
    'src/server/packaging/tuckEndBoxPhaseTwoLiveReviewBatchTwoDraft.ts',
    'src/server/packaging/tuckEndBoxPhaseTwoLiveReviewBatchThreeDraft.ts',
    'src/server/packaging/tuckEndBoxCompanionPathFailureAttributionDraft.ts',
    'src/server/packaging/tuckEndBoxPhaseTwoHandoffLiveCoverageBatchOneDraft.ts',
  ],
  approvalQuestion: 'Why should standard_double_tuck_main_item remain candidate_ready instead of being approved for limited role right now?',
  evidenceRecap: {
    cleanQuotedLiveSampleCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.cumulativeStandardDoubleTuckSamples,
    batchProgression: {
      batchOne: {
        addedSamples: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_SUMMARY_DRAFT.bucketCounts.quoted_clean_subset,
        coreFinding: 'first clean live stability established',
      },
      batchTwo: {
        addedSamples: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_SUMMARY_DRAFT.addedStandardDoubleTuckSamples,
        coreFinding: 'repeat stability strengthened without new misrelease or pollution',
      },
      batchThree: {
        addedSamples: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.addedStandardDoubleTuckSamples,
        coreFinding: 'price proxy moved from no benchmark to internal authoritative benchmark cross-check',
      },
    },
    quotedMisreleaseCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.cumulativeQuotedMisreleaseCount,
    familyMergeStable: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.cleanPathPollutionCheck.familyMergeStable,
    packagingTypeStable: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.cleanPathPollutionCheck.packagingTypeStable,
    statusStable: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.cleanPathPollutionCheck.statusStable,
    blockingUnknownTermsPresent: targetPathReviews.some((item) => item.termAndCostAssessment.blockingUnknownTerms.length > 0),
    unknownClusterObserved: targetPathReviews.some((item) => item.termAndCostAssessment.unknownCluster === true),
    manualAdjustmentTouchesCoreCost: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.cleanPathPollutionCheck.manualAdjustmentTouchesCoreCost,
    companionDriftIsolation: {
      isolatedFromTargetPath: true,
      directlyAffectsQuotedCleanSubset: false,
      primaryInstability: TUCK_END_COMPANION_FAILURE_ATTRIBUTION_SUMMARY_DRAFT.primaryInstability,
      note: 'Companion drift remains a separate boundary-path instability and has not reversed into the clean quoted path.',
    },
    handoffBoundaryObservation: {
      coverageGap: TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT.coverageGap,
      coverageGapType: TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT.coverageGapType,
      currentInterpretation: 'traffic_gap_only',
      note: 'The handoff line is still a traffic gap, not evidence that the clean quoted path is unsafe for observation.',
    },
  },
  priceProxyEvidence: {
    beforeBatchThree: {
      knownFact: 'Batches one and two proved repeated stable clean-path behavior but did not have a benchmark strong enough to judge price direction.',
      state: 'repeated_stability_only',
    },
    batchThreeBenchmark: {
      benchmarkSource: 'internal_phase_one_authoritative_quote_record',
      benchmarkCoverageCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT.priceProxyEvidence.benchmarkCoverageCount,
      secondPhaseSubtotal: targetPathBenchmarkFacts.secondPhaseSubtotal,
      liveAuthoritativeQuoteSubtotal: targetPathBenchmarkFacts.liveAuthoritativeQuoteSubtotal,
      fixedGapAmount: targetPathBenchmarkFacts.fixedGapAmount,
      fixedGapPercent: targetPathBenchmarkFacts.fixedGapPercent,
      directionHint: 'small_under_gap',
    },
    knownFacts: [
      'Across 7 clean-path live reviews, second-phase subtotal stays at 2653.',
      'Across the same 7 conversations, the phase-one authoritative quote subtotal stays at 2686.',
      'The observed gap is fixed at -33 yuan, or about -1.2286%.',
      'The gap is stable rather than noisy, so price proxy evidence is now more explainable than it was after batch two.',
    ],
    currentInference: [
      'The clean path likely has a small and consistent under-direction difference relative to the internal authoritative quote record.',
      'This under-gap appears explainable and bounded rather than randomly unstable.',
    ],
    notYetProven: [
      'It is not yet proven that the -33 yuan gap is acceptable within business tolerance.',
      'It is not yet proven that the same under-gap would remain acceptable against real成交价,人工确认价, or another stronger external price anchor.',
      'It is not yet proven that internal authoritative quote records alone are sufficient approval-grade price evidence for limited role.',
    ],
  },
  approvalBlockers: [
    {
      blockerId: 'price_proxy_external_anchor_gap',
      severity: 'primary',
      isOnlyPrimaryBlocker: true,
      summary: 'Price proxy still lacks an external anchor strong enough for approval.',
      whyItBlocks: [
        'An internal authoritative benchmark is better than no benchmark, but it is not the same as an external approval-grade anchor.',
        'The current evidence still lacks real成交价,人工确认价, or another stronger external price reference.',
        'Without that anchor, the team cannot judge whether the fixed -33 yuan under-gap is inside or outside acceptable tolerance.',
      ],
    },
  ],
  recommendation: {
    candidateStatus: 'remain_candidate_ready',
    approvalStatus: 'not_approved_for_limited_role_yet',
    decision: 'do_not_approve_limited_role_now',
    rationale: [
      'The target path is operationally stable enough to remain the cleanest candidate path.',
      'The target path is not approval-ready because price proxy still stops at internal benchmark evidence rather than external anchor evidence.',
      'The decision remains path-scoped and must not be generalized to the full tuck_end_box family.',
    ],
  },
  nextEvidenceNeeded: {
    approvalGradePriceEvidence: [
      'At least one trustworthy external price anchor on the same clean path, such as real成交价 or人工确认价.',
      'A direct comparison showing whether the repeated -33 yuan under-gap is within acceptable business tolerance.',
      'Preferably more than one anchored sample so the under-gap can be judged as acceptable bias rather than accidental coincidence.',
    ],
    ifExternalAnchorIsUnavailableSoon: [
      'Keep the path at candidate_ready.',
      'Do not expand authority beyond shadow/internal review usage.',
      'Continue treating the current -33 yuan under-gap as informative but not approval-grade evidence.',
    ],
  },
  alignmentWithCurrentCandidateMemo: {
    previousMemoId: TUCK_END_BOX_LIMITED_ROLE_REVIEW_MEMO_DRAFT.memoId,
    previousCandidateStatus: TUCK_END_BOX_LIMITED_ROLE_REVIEW_MEMO_DRAFT.recommendation.candidateStatus,
    previousApprovalStatus: TUCK_END_BOX_LIMITED_ROLE_REVIEW_MEMO_DRAFT.recommendation.approvalStatus,
    stillConsistent: true,
    note: 'This approval review memo tightens the approval rationale; it does not overturn the earlier candidate-ready conclusion.',
  },
} as const