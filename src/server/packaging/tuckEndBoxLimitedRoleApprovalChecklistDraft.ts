import { SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT } from './secondPhaseAlignmentEvaluationDraft'
import { TUCK_END_BOX_LIMITED_ROLE_APPROVAL_REVIEW_MEMO_DRAFT } from './tuckEndBoxLimitedRoleApprovalReviewMemoDraft'

const limitedProductRoleGate = SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT.find((item) => item.stage === 'limited_product_role')

export const TUCK_END_BOX_LIMITED_ROLE_APPROVAL_CHECKLIST_DRAFT = {
  checklistId: 'tuck_end_box_limited_role_approval_checklist_2026_04_05',
  family: 'tuck_end_box',
  approvalTarget: {
    pathId: 'standard_double_tuck_main_item',
    pathBucket: 'quoted_clean_subset',
    currentStatus: 'candidate_ready',
    currentApprovalState: 'not_approved_for_limited_role_yet',
    checklistPurpose: 'Convert the current approval memo into an executable gate that can be re-used once external price-anchor evidence appears.',
    scopeNote: 'This checklist is path-scoped to standard_double_tuck_main_item only. It does not apply to the whole tuck_end_box family.',
  },
  sourceAlignment: {
    approvalMemoId: TUCK_END_BOX_LIMITED_ROLE_APPROVAL_REVIEW_MEMO_DRAFT.memoId,
    limitedProductRoleGateDefined: Boolean(limitedProductRoleGate),
    limitedProductRoleGateCheckIds: limitedProductRoleGate?.requiredChecks.map((item) => item.checkId) || [],
  },
  sections: [
    'already_satisfied',
    'current_blocking_condition',
    'external_evidence_required',
    'acceptance_question',
    'decision_outcomes',
    'review_trigger',
  ],
  alreadySatisfied: [
    {
      checkId: 'family_specific_stability',
      satisfied: true,
      summary: 'family merge is stable on the clean quoted target path.',
      evidence: 'Three live-review batches show stable tuck_end_box family merge on all 7 clean-path samples.',
    },
    {
      checkId: 'decision_boundary_clean_subset',
      satisfied: true,
      summary: 'packaging type and decision boundary are stable on the clean subset.',
      evidence: 'packaging type and quoted status remain aligned on all 7 target-path samples, with quoted misrelease still at 0.',
    },
    {
      checkId: 'blocking_unknown_not_present',
      satisfied: true,
      summary: 'blocking unknown terms remain 0.',
      evidence: 'No blocking unknown term or unknown cluster has appeared on the target path.',
    },
    {
      checkId: 'manual_adjustment_not_core',
      satisfied: true,
      summary: 'manual adjustment does not invade core cost.',
      evidence: 'manual adjustment has not entered the target path core-cost structure.',
    },
    {
      checkId: 'companion_drift_isolated',
      satisfied: true,
      summary: 'companion drift remains isolated from the clean quoted path.',
      evidence: 'Companion/bundle instability is tracked separately and has not reverse-polluted standard_double_tuck_main_item.',
    },
    {
      checkId: 'handoff_traffic_gap_not_veto',
      satisfied: true,
      summary: 'handoff traffic gap is observed but does not veto the clean quoted path.',
      evidence: 'Current handoff coverage gap is a traffic gap only, not a clean-path instability signal.',
    },
  ],
  currentBlockingCondition: {
    blockerId: 'price_proxy_external_anchor_gap',
    isOnlyPrimaryBlocker: true,
    summary: 'The only primary blocker is that price proxy still lacks an external approval-grade anchor.',
    gateImpact: 'Until this blocker is cleared, the path must not be promoted from candidate_ready to approved_for_limited_role.',
  },
  externalEvidenceRequired: [
    {
      evidenceId: 'real_transaction_price',
      required: true,
      summary: 'At least one real成交价 on the same clean path.',
    },
    {
      evidenceId: 'human_confirmed_price',
      required: false,
      summary: 'A human-confirmed price on the same clean path is also valid as an external anchor.',
    },
    {
      evidenceId: 'stronger_external_price_reference',
      required: false,
      summary: 'Another stronger external price reference is acceptable if it can anchor tolerance judgment.',
    },
    {
      evidenceId: 'business_tolerance_policy',
      required: true,
      summary: 'A usable business tolerance policy or explicit tolerance judgment for the observed under-gap.',
    },
  ],
  acceptanceQuestion: {
    questionId: 'under_gap_within_tolerance',
    prompt: 'Is the repeated -33 yuan / -1.2286% under-gap between second-phase subtotal and the authoritative quoted subtotal inside acceptable business tolerance for standard_double_tuck_main_item?',
    knownCurrentValues: {
      secondPhaseSubtotal: 2653,
      liveAuthoritativeQuoteSubtotal: 2686,
      fixedGapAmount: -33,
      fixedGapPercent: -1.2286,
    },
    answerRequiredBeforeApproval: true,
  },
  decisionOutcomes: [
    {
      outcome: 'remain_candidate_ready',
      useWhen: 'Core stability checks stay satisfied, but external anchor evidence is still missing or tolerance cannot yet be judged.',
    },
    {
      outcome: 'approve_for_limited_role',
      useWhen: 'External anchor evidence is available and confirms that the repeated under-gap is within acceptable business tolerance.',
    },
    {
      outcome: 'block_until_external_anchor_available',
      useWhen: 'The path remains stable, but no external anchor or tolerance policy is available to answer the acceptance question.',
    },
  ],
  reviewTrigger: {
    rerunApprovalReviewWhen: [
      'A usable external price anchor appears on standard_double_tuck_main_item.',
      'Business explicitly defines the acceptable tolerance policy for the observed under-gap.',
    ],
    holdCurrentStateWhen: [
      'No external anchor is available yet.',
      'Tolerance policy is still undefined.',
    ],
  },
  currentActionWhileWaiting: {
    statusToKeep: 'remain_candidate_ready',
    approvalStateToKeep: 'not_approved_for_limited_role_yet',
    note: 'Do not approve, do not expand authority, and do not reinterpret the internal benchmark as sufficient approval evidence by itself.',
  },
} as const