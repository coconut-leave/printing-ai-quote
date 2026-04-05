import type { TuckEndPhaseTwoManualReviewDraft } from './tuckEndBoxPhaseTwoDraft'
import { TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_DRAFT } from './tuckEndBoxPhaseTwoLiveReviewBatchOneDraft'

export const TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_DRAFT = [
  {
    schemaVersion: 'tuck_end_phase_two_review_v1_draft',
    family: 'tuck_end_box',
    reviewScope: 'live_shadow',
    basicInfo: {
      conversationId: '2065',
      requestId: '7728',
      sampleReferenceId: null,
      rawText: '双插盒：7*5*5CM，350克白卡，正反四色，5000',
      motherPoolSources: ['phase_one_tuck_end_box', 'second_phase_tuck_end_box', 'tuck_end_related_structure_keyword'],
      phaseOne: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'quoted',
      },
      secondPhase: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'quoted',
        statusReasons: ['tuck_end_box_in_scope'],
      },
      variantTags: [],
    },
    bucketAssessment: {
      bucket: 'quoted_clean_subset',
      pathId: 'standard_double_tuck_main_item',
      inBucketReasons: ['标准双插主件路径', 'phase-one quoted 与 second-phase quoted 对齐', '无 companion、window、reinforced 或高复杂工艺特征'],
      misbucketRisk: false,
      misbucketRiskReasons: [],
    },
    productAssessment: {
      familyMergeStable: true,
      packagingTypeStable: true,
      statusMatchesExpected: true,
      quotedMisrelease: false,
      highComplexityCorrectlyHandoff: null,
      quotedChecks: {
        packagingTypeResolved: true,
        coreMaterialRecipeComplete: true,
        keyLineItemsComputable: true,
        unresolvedTermsSafe: true,
      },
    },
    termAndCostAssessment: {
      blockingUnknownTerms: [],
      nonBlockingUnknownTerms: [],
      unknownCluster: false,
      unknownClusterTerms: [],
      manualAdjustmentPresent: false,
      manualAdjustmentTouchesCoreCost: false,
      coreManualAdjustmentLineCodes: [],
      lineItemsStable: true,
      stableLineItemCodes: ['face_paper', 'printing'],
      missingCoreLineItemCodes: ['die_mold', 'gluing'],
      priceProxySystematicDrift: null,
      priceProxyDriftDirection: 'not_enough_evidence',
      priceProxyNote: '第二批新增样本继续复现相同 subtotal 与 line-item 骨架，说明 clean path 价格形态稳定，但仍缺少外部成交或人工核价对照。',
    },
    conclusion: {
      disposition: 'limited_role_candidate',
      blockReason: null,
      reviewNote: '继续为标准双插主件 clean quoted 路径补充重复 live 证据，当前仍应作为 candidate 观察而不是批准。',
    },
  },
  {
    schemaVersion: 'tuck_end_phase_two_review_v1_draft',
    family: 'tuck_end_box',
    reviewScope: 'live_shadow',
    basicInfo: {
      conversationId: '2043',
      requestId: '7658',
      sampleReferenceId: null,
      rawText: '双插盒：7*5*5CM，350克白卡，正反四色，5000',
      motherPoolSources: ['phase_one_tuck_end_box', 'second_phase_tuck_end_box', 'tuck_end_related_structure_keyword'],
      phaseOne: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'quoted',
      },
      secondPhase: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'quoted',
        statusReasons: ['tuck_end_box_in_scope'],
      },
      variantTags: [],
    },
    bucketAssessment: {
      bucket: 'quoted_clean_subset',
      pathId: 'standard_double_tuck_main_item',
      inBucketReasons: ['标准双插主件路径', 'family merge / type / status 三项继续对齐', 'blocking unknown 与 manual adjustment 仍为空'],
      misbucketRisk: false,
      misbucketRiskReasons: [],
    },
    productAssessment: {
      familyMergeStable: true,
      packagingTypeStable: true,
      statusMatchesExpected: true,
      quotedMisrelease: false,
      highComplexityCorrectlyHandoff: null,
      quotedChecks: {
        packagingTypeResolved: true,
        coreMaterialRecipeComplete: true,
        keyLineItemsComputable: true,
        unresolvedTermsSafe: true,
      },
    },
    termAndCostAssessment: {
      blockingUnknownTerms: [],
      nonBlockingUnknownTerms: [],
      unknownCluster: false,
      unknownClusterTerms: [],
      manualAdjustmentPresent: false,
      manualAdjustmentTouchesCoreCost: false,
      coreManualAdjustmentLineCodes: [],
      lineItemsStable: true,
      stableLineItemCodes: ['face_paper', 'printing'],
      missingCoreLineItemCodes: ['die_mold', 'gluing'],
      priceProxySystematicDrift: null,
      priceProxyDriftDirection: 'not_enough_evidence',
      priceProxyNote: '累计样本继续增加，但当前仍只能确认同路径影子报价形态重复稳定，不能确认系统性高报或低报。',
    },
    conclusion: {
      disposition: 'limited_role_candidate',
      blockReason: null,
      reviewNote: '第二批重复样本继续支持 clean path 稳定，不支持把 companion drift 问题回灌到该路径。',
    },
  },
  {
    schemaVersion: 'tuck_end_phase_two_review_v1_draft',
    family: 'tuck_end_box',
    reviewScope: 'live_shadow',
    basicInfo: {
      conversationId: '2040',
      requestId: '7642',
      sampleReferenceId: null,
      rawText: '双插盒：7*5*5CM，350克白卡，正反四色，5000',
      motherPoolSources: ['phase_one_tuck_end_box', 'second_phase_tuck_end_box', 'tuck_end_related_structure_keyword'],
      phaseOne: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'quoted',
      },
      secondPhase: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'quoted',
        statusReasons: ['tuck_end_box_in_scope'],
      },
      variantTags: [],
    },
    bucketAssessment: {
      bucket: 'quoted_clean_subset',
      pathId: 'standard_double_tuck_main_item',
      inBucketReasons: ['标准双插主件路径', 'clean path 继续没有 companion / bundle 污染迹象', 'shadow subtotal 与 line-item 结构与前序样本一致'],
      misbucketRisk: false,
      misbucketRiskReasons: [],
    },
    productAssessment: {
      familyMergeStable: true,
      packagingTypeStable: true,
      statusMatchesExpected: true,
      quotedMisrelease: false,
      highComplexityCorrectlyHandoff: null,
      quotedChecks: {
        packagingTypeResolved: true,
        coreMaterialRecipeComplete: true,
        keyLineItemsComputable: true,
        unresolvedTermsSafe: true,
      },
    },
    termAndCostAssessment: {
      blockingUnknownTerms: [],
      nonBlockingUnknownTerms: [],
      unknownCluster: false,
      unknownClusterTerms: [],
      manualAdjustmentPresent: false,
      manualAdjustmentTouchesCoreCost: false,
      coreManualAdjustmentLineCodes: [],
      lineItemsStable: true,
      stableLineItemCodes: ['face_paper', 'printing'],
      missingCoreLineItemCodes: ['die_mold', 'gluing'],
      priceProxySystematicDrift: null,
      priceProxyDriftDirection: 'not_enough_evidence',
      priceProxyNote: '当前价格代理证据比第一批更厚，但依旧停留在“重复稳定、尚无方向性失真证据”的阶段。',
    },
    conclusion: {
      disposition: 'limited_role_candidate',
      blockReason: null,
      reviewNote: '第二批第 3 条 clean quoted 样本继续稳定，当前结论仍是 candidate_ready 但未达到批准门槛。',
    },
  },
] as const satisfies readonly TuckEndPhaseTwoManualReviewDraft[]

const batchOneTargetPathReviews = TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_DRAFT.filter(
  (item) => item.bucketAssessment.pathId === 'standard_double_tuck_main_item' && item.conclusion.disposition === 'limited_role_candidate'
)

const batchTwoTargetPathReviews = TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_DRAFT.filter(
  (item) => item.bucketAssessment.pathId === 'standard_double_tuck_main_item' && item.conclusion.disposition === 'limited_role_candidate'
)

const cumulativeTargetPathReviews: readonly TuckEndPhaseTwoManualReviewDraft[] = [...batchOneTargetPathReviews, ...batchTwoTargetPathReviews]
const cumulativeTargetPathSubtotals = new Set(cumulativeTargetPathReviews.map((item) => item.termAndCostAssessment.lineItemsStable ? 2653 : null))
const cumulativeStableLineItemShapes = new Set(
  cumulativeTargetPathReviews.map((item) => item.termAndCostAssessment.stableLineItemCodes.join('+'))
)

export const TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_SUMMARY_DRAFT = {
  batchId: 'tuck_end_phase_two_live_review_batch_two_2026_04_05',
  family: 'tuck_end_box',
  reviewFocusPathId: 'standard_double_tuck_main_item',
  reviewedCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_DRAFT.length,
  addedStandardDoubleTuckSamples: batchTwoTargetPathReviews.length,
  cumulativeStandardDoubleTuckSamples: cumulativeTargetPathReviews.length,
  cumulativeConversationCount: new Set(cumulativeTargetPathReviews.map((item) => item.basicInfo.conversationId).filter(Boolean)).size,
  quotedMisreleaseCount: batchTwoTargetPathReviews.filter((item) => item.productAssessment.quotedMisrelease).length,
  cumulativeQuotedMisreleaseCount: cumulativeTargetPathReviews.filter((item) => item.productAssessment.quotedMisrelease).length,
  priceProxyEvidence: {
    batchTwoDirection: 'not_enough_evidence',
    cumulativeDirection: 'not_enough_evidence',
    systematicHighOrLowObserved: false,
    repeatedStableSubtotalObserved: cumulativeTargetPathSubtotals.size === 1,
    repeatedStableLineItemShapeObserved: cumulativeStableLineItemShapes.size === 1,
    note: '第二批新增 3 条 clean quoted 样本后，累计 7 条标准双插主件 live 样本都保持 face_paper + printing 骨架与相同 shadow subtotal。价格形态稳定性证据更强，但仍缺少真实成交价或人工核价对照，因此还不能把价格代理结论从 not_enough_evidence 前移到明确的 over 或 under。',
  },
  cleanPathPollutionCheck: {
    companionDriftObservedInsideTargetPath: false,
    reversePollutionObservedOnQuotedCleanSubset: false,
    familyMergeStable: cumulativeTargetPathReviews.every((item) => item.productAssessment.familyMergeStable === true),
    packagingTypeStable: cumulativeTargetPathReviews.every((item) => item.productAssessment.packagingTypeStable === true),
    statusStable: cumulativeTargetPathReviews.every((item) => item.productAssessment.statusMatchesExpected === true),
    manualAdjustmentTouchesCoreCost: cumulativeTargetPathReviews.some((item) => item.termAndCostAssessment.manualAdjustmentTouchesCoreCost === true),
    note: '第二批目标样本全部维持 tuck_end_box family merge、packaging type 和 quoted status 对齐，没有出现 companion drift 反向污染 clean quoted subset 的证据。',
  },
  recommendationDelta: {
    candidateStatus: 'candidate_ready',
    approvalStatus: 'not_approved_for_limited_role_yet',
    readinessSignal: 'closer_to_approval_but_still_insufficient',
    note: '第二批把 clean quoted main-item 的重复 live 证据从 4 条补到 7 条，说明 candidate 结论更稳，但 price proxy 仍未突破证据门槛，因此还不能视为 approved_for_limited_role。',
  },
  keyFindings: [
    '第二批新增 3 条 standard_double_tuck_main_item 真实 live quoted 样本。',
    '累计 7 条目标路径样本中 quoted misrelease 仍为 0。',
    '累计目标路径样本继续保持 family/type/status 全对齐，没有 clean path 污染迹象。',
    'price proxy 证据从单批稳定提升为跨两批重复稳定，但仍不足以形成系统性高报或低报判断。',
  ],
} as const