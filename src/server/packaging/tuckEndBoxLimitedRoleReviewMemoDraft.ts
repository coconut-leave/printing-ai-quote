import type { TuckEndPhaseTwoManualReviewDraft } from './tuckEndBoxPhaseTwoDraft'
import { TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_DRAFT, TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_SUMMARY_DRAFT } from './tuckEndBoxPhaseTwoLiveReviewBatchOneDraft'
import { TUCK_END_COMPANION_FAILURE_ATTRIBUTION_SUMMARY_DRAFT } from './tuckEndBoxCompanionPathFailureAttributionDraft'
import { TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT } from './tuckEndBoxPhaseTwoHandoffLiveCoverageBatchOneDraft'
import { TUCK_END_PHASE_TWO_BUCKET_DEFINITIONS_DRAFT } from './tuckEndBoxPhaseTwoDraft'
import { SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT, SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT } from './secondPhaseAlignmentEvaluationDraft'

const standardDoubleTuckCandidateReviews: readonly TuckEndPhaseTwoManualReviewDraft[] =
  TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_DRAFT.filter(
    (item) => item.bucketAssessment.pathId === 'standard_double_tuck_main_item' && item.conclusion.disposition === 'limited_role_candidate'
  )

const limitedProductRoleGate = SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT.find((item) => item.stage === 'limited_product_role')
const handoffBoundaryDefinition = TUCK_END_PHASE_TWO_BUCKET_DEFINITIONS_DRAFT.find((item) => item.bucket === 'handoff_boundary')

export const TUCK_END_BOX_LIMITED_ROLE_REVIEW_MEMO_DRAFT = {
  memoId: 'tuck_end_box_limited_role_review_memo_2026_04_05',
  family: 'tuck_end_box',
  reviewTarget: {
    pathId: 'standard_double_tuck_main_item',
    pathBucket: 'quoted_clean_subset',
    reviewRole: 'limited_role_candidate',
    approvalState: 'not_approved_for_limited_role_yet',
    note: 'This memo evaluates only the cleanest quoted main-item path. It does not expand candidate status to the whole tuck_end_box family.',
  },
  evidenceSources: [
    'src/server/packaging/tuckEndBoxPhaseTwoLiveReviewBatchOneDraft.ts',
    'src/server/packaging/tuckEndBoxCompanionPathFailureAttributionDraft.ts',
    'src/server/packaging/tuckEndBoxPhaseTwoHandoffLiveCoverageBatchOneDraft.ts',
    'src/server/packaging/tuckEndBoxPhaseTwoDraft.ts',
    'src/server/packaging/secondPhaseAlignmentEvaluationDraft.ts',
  ],
  evidenceSummary: {
    liveReviewSampleCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_SUMMARY_DRAFT.reviewedCount,
    quotedCleanSubsetReviewCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_SUMMARY_DRAFT.bucketCounts.quoted_clean_subset,
    standardDoubleTuckCandidateSampleCount: standardDoubleTuckCandidateReviews.length,
    quotedMisreleaseCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_SUMMARY_DRAFT.quotedMisreleaseCount,
    familyMergeStableOnTargetPath: standardDoubleTuckCandidateReviews.every((item) => item.productAssessment.familyMergeStable === true),
    packagingTypeStableOnTargetPath: standardDoubleTuckCandidateReviews.every((item) => item.productAssessment.packagingTypeStable === true),
    statusStableOnTargetPath: standardDoubleTuckCandidateReviews.every((item) => item.productAssessment.statusMatchesExpected === true),
    blockingUnknownTermsOnTargetPath: standardDoubleTuckCandidateReviews.flatMap((item) => item.termAndCostAssessment.blockingUnknownTerms),
    unknownClusterObservedOnTargetPath: standardDoubleTuckCandidateReviews.some((item) => item.termAndCostAssessment.unknownCluster === true),
    manualAdjustmentTouchesCoreCostOnTargetPath: standardDoubleTuckCandidateReviews.some((item) => item.termAndCostAssessment.manualAdjustmentTouchesCoreCost === true),
    priceProxyEvidenceState: 'not_enough_evidence',
    handoffBoundaryCoverageGap: TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT.coverageGap,
    handoffBoundaryCoverageGapType: TUCK_END_PHASE_TWO_HANDOFF_LIVE_COVERAGE_BATCH_ONE_SUMMARY_DRAFT.coverageGapType,
    companionPathIsolation: {
      primaryInstability: TUCK_END_COMPANION_FAILURE_ATTRIBUTION_SUMMARY_DRAFT.primaryInstability,
      affectsQuotedCleanSubsetDirectly: false,
      affectsLimitedRoleConfidenceFamilyWide: true,
    },
  },
  conditionsAlreadySatisfied: [
    'standard_double_tuck_main_item has repeated live quoted samples and is the current closest limited-role candidate path.',
    'family merge is stable on the target path.',
    'packaging type is stable on the target path.',
    'status alignment is stable on the target path.',
    'quoted misrelease count remains 0 in the current live review batch.',
    'blocking unknown terms remain 0 on the target path.',
    'unknown cluster has not been observed on the target path.',
    'manual adjustment does not invade core cost on the target path.',
    'companion drift has been isolated as a separate failure class and should not be confused with the clean quoted path.',
  ],
  conditionsNotYetSatisfied: [
    'Live sample count is still small and supports candidate review, not approval.',
    'Price proxy evidence is still insufficient and has not yet become a positive approval signal.',
    'Family-wide stability is not established because companion/bundle paths remain unstable.',
    'Handoff boundary has a traffic gap, so the full three-line live evidence set is not yet complete.',
  ],
  explicitNonCandidatePaths: [
    {
      pathId: 'hanging_or_insert',
      currentRole: 'keep_shadow',
      reason: 'Companion and insert-related paths still drift or lose tuck_end identity in live review.',
    },
    {
      pathId: 'bundle_companion_path',
      currentRole: 'keep_shadow',
      reason: 'Bundle companion paths show primary-item loss and family drift toward folding_carton.',
    },
    {
      pathId: 'reinforced_material',
      currentRole: 'keep_shadow',
      reason: 'Reinforced material remains an estimated-boundary path, not a clean quoted main-item path.',
    },
    {
      pathId: 'window_related',
      currentRole: 'keep_shadow',
      reason: 'Window-related structures belong to deferred or handoff-style boundary treatment, not candidate scope.',
    },
    {
      pathId: 'high_complexity_process',
      currentRole: 'keep_shadow',
      reason: 'High-complexity process combinations remain explicit handoff-boundary paths by design.',
    },
    {
      pathId: 'handoff_traffic_gap_path',
      currentRole: 'keep_shadow',
      reason: 'Current live data has no explicit handoff keyword traffic, so no candidate conclusion can be drawn for that line.',
    },
  ],
  simplifiedEntryConditions: {
    candidateReadyChecks: [
      'family merge stable on the target path',
      'quoted misrelease = 0',
      'blocking unknown = 0',
      'manual adjustment does not touch core cost',
      'no obvious systematic price proxy distortion',
      'live review evidence exists on the target path',
    ],
    vetoConditions: [
      'any quoted misrelease appears on the target path',
      'blocking unknown terms appear on the target path',
      'manual adjustment invades core cost on the target path',
      'family merge drifts away from tuck_end_box on the target path',
      'clear one-direction systematic price proxy distortion appears on the target path',
    ],
  },
  recommendation: {
    candidateStatus: 'candidate_ready',
    approvalStatus: 'not_approved_for_limited_role_yet',
    rationale: [
      'The clean quoted main-item path has enough live evidence to enter limited-role review as a candidate.',
      'The same evidence is not strong enough to approve limited role because sample count remains small and price proxy evidence is still weak.',
      'The recommendation remains path-scoped and must not be generalized to the full tuck_end_box family.',
    ],
  },
  nextEvidenceNeeded: [
    'More repeated live reviews on standard_double_tuck_main_item.',
    'Stronger price proxy evidence for the clean quoted path.',
    'Continued confirmation that quoted misrelease remains 0 on the target path.',
    'Continued isolation of companion drift from the clean quoted path.',
    'Future handoff-boundary live samples once explicit keyword traffic appears.',
  ],
  alignmentWithExistingDrafts: {
    limitedProductRoleGateDefined: Boolean(limitedProductRoleGate),
    limitedProductRoleGateCheckIds: limitedProductRoleGate?.requiredChecks.map((item) => item.checkId) || [],
    handoffBoundaryPathDefinitionPresent: Boolean(handoffBoundaryDefinition),
    currentReadinessStillNotApproved: SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT.strongerProductRoleRecommended === false,
  },
} as const