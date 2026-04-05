import type {
  SecondPhaseDecisionStatusDraft,
  SecondPhasePackagingFamilyDraft,
  SecondPhasePackagingTypeDraft,
  SecondPhaseVariantTagDraft,
} from './secondPhaseDraft'

export type TuckEndPhaseTwoMotherPoolSourceDraft =
  | 'phase_one_tuck_end_box'
  | 'second_phase_tuck_end_box'
  | 'tuck_end_related_structure_keyword'

export type TuckEndPhaseTwoBucketDraft = 'quoted_clean_subset' | 'estimated_boundary' | 'handoff_boundary'

export type TuckEndPhaseTwoPathIdDraft =
  | 'standard_double_tuck_main_item'
  | 'hanging_or_insert'
  | 'window_film_manual_adjustment'
  | 'reinforced_material'
  | 'open_window_deferred'
  | 'high_complexity_process'

export type TuckEndPhaseTwoReviewDispositionDraft = 'keep_shadow' | 'limited_role_candidate' | 'blocked'

type ReviewFlagDraft = boolean | null

export type TuckEndPhaseTwoManualReviewDraft = {
  schemaVersion: 'tuck_end_phase_two_review_v1_draft'
  family: 'tuck_end_box'
  reviewScope: 'live_shadow' | 'alignment_sample_reference'
  basicInfo: {
    conversationId: string | null
    requestId: string | null
    sampleReferenceId: string | null
    rawText: string
    motherPoolSources: TuckEndPhaseTwoMotherPoolSourceDraft[]
    phaseOne: {
      family: string | null
      type: string | null
      status: string | null
    }
    secondPhase: {
      family: SecondPhasePackagingFamilyDraft | null
      type: SecondPhasePackagingTypeDraft | null
      status: SecondPhaseDecisionStatusDraft | null
      statusReasons: string[]
    }
    variantTags: SecondPhaseVariantTagDraft[]
  }
  bucketAssessment: {
    bucket: TuckEndPhaseTwoBucketDraft | null
    pathId: TuckEndPhaseTwoPathIdDraft | null
    inBucketReasons: string[]
    misbucketRisk: boolean
    misbucketRiskReasons: string[]
  }
  productAssessment: {
    familyMergeStable: ReviewFlagDraft
    packagingTypeStable: ReviewFlagDraft
    statusMatchesExpected: ReviewFlagDraft
    quotedMisrelease: boolean
    highComplexityCorrectlyHandoff: ReviewFlagDraft
    quotedChecks: {
      packagingTypeResolved: ReviewFlagDraft
      coreMaterialRecipeComplete: ReviewFlagDraft
      keyLineItemsComputable: ReviewFlagDraft
      unresolvedTermsSafe: ReviewFlagDraft
    }
  }
  termAndCostAssessment: {
    blockingUnknownTerms: string[]
    nonBlockingUnknownTerms: string[]
    unknownCluster: boolean
    unknownClusterTerms: string[]
    manualAdjustmentPresent: boolean
    manualAdjustmentTouchesCoreCost: ReviewFlagDraft
    coreManualAdjustmentLineCodes: string[]
    lineItemsStable: ReviewFlagDraft
    stableLineItemCodes: string[]
    missingCoreLineItemCodes: string[]
    priceProxySystematicDrift: ReviewFlagDraft
    priceProxyDriftDirection: 'none' | 'under' | 'over' | 'mixed' | 'not_enough_evidence'
    priceProxyNote: string
  }
  conclusion: {
    disposition: TuckEndPhaseTwoReviewDispositionDraft
    blockReason: string | null
    reviewNote: string
  }
}

export const TUCK_END_PHASE_TWO_STRUCTURE_KEYWORDS_DRAFT = [
  '屏幕双插大盒',
  '屏幕双插盒',
  '开窗双插盒',
  '双插开窗盒',
  '双插大盒',
  '双插盒',
  '挂钩彩盒',
] as const

export const TUCK_END_PHASE_TWO_REQUIRED_SHADOW_FIELDS_DRAFT = [
  'packagingFamily',
  'packagingType',
  'variantTags',
  'shadowStatus',
  'statusReasons',
  'quotedChecks',
  'blockingUnknownTerms',
  'nonBlockingUnknownTerms',
  'lineItems',
  'subtotal',
  'diffSummary.familyMergeAligned',
  'diffSummary.packagingTypeAligned',
  'diffSummary.statusAligned',
  'diffSummary.manualAdjustmentPresent',
  'diffSummary.enteredDeferredOrHandoff',
] as const

export const TUCK_END_PHASE_TWO_LIVE_SHADOW_MOTHER_POOL_DRAFT = {
  family: 'tuck_end_box',
  phaseOneRemainsAuthoritative: true,
  secondPhaseRemainsShadowOnly: true,
  shadowReadSource: 'assistant.metadata.complexPackagingShadow',
  entryRules: [
    {
      source: 'phase_one_tuck_end_box' as const,
      includeWhen: ['phase-one productType === tuck_end_box'],
      whyItMatters: 'capture live authoritative traffic that phase-one already treats as tuck_end_box',
    },
    {
      source: 'second_phase_tuck_end_box' as const,
      includeWhen: ['complexPackagingShadow.packagingType === tuck_end_box'],
      whyItMatters: 'capture shadow-side tuck_end_box detections even when phase-one differs',
    },
    {
      source: 'tuck_end_related_structure_keyword' as const,
      includeWhen: ['raw request text contains any TUCK_END_PHASE_TWO_STRUCTURE_KEYWORDS_DRAFT term'],
      whyItMatters: 'retain family-merge fallback cases that drift to folding_carton, window_box, or unresolved',
    },
  ],
  requiredShadowFields: TUCK_END_PHASE_TWO_REQUIRED_SHADOW_FIELDS_DRAFT,
} as const

export const TUCK_END_PHASE_TWO_BUCKET_DEFINITIONS_DRAFT = [
  {
    bucket: 'quoted_clean_subset' as const,
    label: 'quoted clean subset',
    pathSemantics: 'Only the cleanest standard double-tuck main-item path is eligible for future limited-role review.',
    includeWhen: [
      'second-phase packagingType === tuck_end_box',
      'second-phase shadowStatus === quoted',
      'quotedChecks.packagingTypeResolved === true',
      'quotedChecks.coreMaterialRecipeComplete === true',
      'quotedChecks.keyLineItemsComputable === true',
      'quotedChecks.unresolvedTermsSafe === true',
      'diffSummary.enteredDeferredOrHandoff === false',
      'manual_adjustment is absent from core cost path',
      'variantTags exclude hanging_tab, with_insert, with_window_film, screen_style, large_box',
    ],
    excludeWhen: [
      'request carries hanging_tab, with_insert, with_window_film, screen_style, or large_box variant tags',
      'request falls into reinforced material path',
      'request carries explicit window structure or high-complexity UV/emboss terms',
      'request depends on bundle splitting or unresolved core-cost terms',
    ],
    observationFocus: [
      'familyMergeAligned remains stable and low-drift',
      'blockingUnknownTerms stay empty and nonBlockingUnknownTerms do not cluster',
      'manualAdjustmentPresent does not appear on core cost path',
      'core lineItems remain stable across repeated traffic',
      'price proxy does not show systematic one-direction drift on the same clean path',
    ],
    paths: [
      {
        pathId: 'standard_double_tuck_main_item' as const,
        includeWhen: [
          'main item is a standard double-tuck box',
          'no window-related structure',
          'no hanging_tab or with_insert variant',
          'no reinforced material path',
          'no high-complexity UV/emboss stack',
        ],
        representativeReferences: ['tuck_end_candidate_image_bundle_main_item_pending_review'],
      },
    ],
  },
  {
    bucket: 'estimated_boundary' as const,
    label: 'estimated boundary',
    pathSemantics: 'Recognized tuck-end traffic that should remain conservative and must not be promoted to quoted.',
    includeWhen: [
      'second-phase stays in tuck_end-oriented interpretation',
      'shadowStatus === estimated',
      'request contains boundary features that keep the path out of clean quoted subset',
    ],
    excludeWhen: [
      'plain standard double-tuck main-item path with complete quoted checks',
      'explicit deferred/handoff path caused by open-window structure or high-complexity process',
    ],
    observationFocus: [
      'no estimated sample is misreleased into quoted',
      'family merge does not drift back to folding_carton or unresolved on the same path',
      'unknown terms do not repeatedly cluster on the same estimated path',
      'manual adjustment does not silently expand into core cost items',
    ],
    paths: [
      {
        pathId: 'hanging_or_insert' as const,
        includeWhen: [
          'variantTags include hanging_tab or with_insert',
          'main structure is still tuck_end oriented',
        ],
        representativeReferences: [
          'tuck_end_hanging_0402_gshifeng_window_insert',
          'tuck_end_hanging_0403_gshifeng_insert',
        ],
      },
      {
        pathId: 'window_film_manual_adjustment' as const,
        includeWhen: [
          'window film or companion parts appear without explicit deferred open-window structure',
          'manual adjustment is present but the path is still observed as tuck_end-related boundary traffic',
        ],
        representativeReferences: ['tuck_end_hanging_0402_gshifeng_window_insert'],
      },
      {
        pathId: 'reinforced_material' as const,
        includeWhen: [
          'reinforced material recipe appears on a tuck_end path',
          'shadow remains conservative instead of promoting to quoted',
        ],
        representativeReferences: ['tuck_end_image_fireproof_file_bag_ae_boundary'],
      },
    ],
  },
  {
    bucket: 'handoff_boundary' as const,
    label: 'handoff boundary',
    pathSemantics: 'Tuck-end-related traffic that must remain in handoff because the path is explicitly deferred or high complexity.',
    includeWhen: [
      'shadowStatus === handoff_required',
      'request either carries explicit open-window deferred structure or high-complexity process stack',
    ],
    excludeWhen: [
      'standard clean quoted path',
      'estimated-only boundary path without explicit handoff/deferred signal',
    ],
    observationFocus: [
      'high-complexity terms are recognized rather than leaking into unresolved clusters',
      'handoff reasons remain clear and consistent across the same path',
      'no handoff path is pulled down into quoted by second-phase',
      'family merge still stays explainable even when packagingType defers to window_box',
    ],
    paths: [
      {
        pathId: 'open_window_deferred' as const,
        includeWhen: [
          'raw text contains 开窗双插盒 or 双插开窗盒',
          'second-phase defers packagingType toward window-related handling',
        ],
        representativeReferences: ['window_boundary_monthly_46085_tuck_end_open_window'],
      },
      {
        pathId: 'high_complexity_process' as const,
        includeWhen: [
          'recognized process stack includes reverse_uv, spot_uv, emboss, or equivalent high-complexity combination',
          'second-phase keeps the path in handoff_required',
        ],
        representativeReferences: ['tuck_end_handoff_monthly_46095', 'tuck_end_handoff_monthly_46100'],
      },
    ],
  },
] as const

export function createEmptyTuckEndPhaseTwoManualReviewDraft(): TuckEndPhaseTwoManualReviewDraft {
  return {
    schemaVersion: 'tuck_end_phase_two_review_v1_draft',
    family: 'tuck_end_box',
    reviewScope: 'live_shadow',
    basicInfo: {
      conversationId: null,
      requestId: null,
      sampleReferenceId: null,
      rawText: '',
      motherPoolSources: [],
      phaseOne: {
        family: null,
        type: null,
        status: null,
      },
      secondPhase: {
        family: null,
        type: null,
        status: null,
        statusReasons: [],
      },
      variantTags: [],
    },
    bucketAssessment: {
      bucket: null,
      pathId: null,
      inBucketReasons: [],
      misbucketRisk: false,
      misbucketRiskReasons: [],
    },
    productAssessment: {
      familyMergeStable: null,
      packagingTypeStable: null,
      statusMatchesExpected: null,
      quotedMisrelease: false,
      highComplexityCorrectlyHandoff: null,
      quotedChecks: {
        packagingTypeResolved: null,
        coreMaterialRecipeComplete: null,
        keyLineItemsComputable: null,
        unresolvedTermsSafe: null,
      },
    },
    termAndCostAssessment: {
      blockingUnknownTerms: [],
      nonBlockingUnknownTerms: [],
      unknownCluster: false,
      unknownClusterTerms: [],
      manualAdjustmentPresent: false,
      manualAdjustmentTouchesCoreCost: null,
      coreManualAdjustmentLineCodes: [],
      lineItemsStable: null,
      stableLineItemCodes: [],
      missingCoreLineItemCodes: [],
      priceProxySystematicDrift: null,
      priceProxyDriftDirection: 'not_enough_evidence',
      priceProxyNote: '',
    },
    conclusion: {
      disposition: 'keep_shadow',
      blockReason: null,
      reviewNote: '',
    },
  }
}

export const TUCK_END_PHASE_TWO_MANUAL_REVIEW_TEMPLATE_DRAFT = createEmptyTuckEndPhaseTwoManualReviewDraft()

export const TUCK_END_PHASE_TWO_MANUAL_REVIEW_EXAMPLES_DRAFT: readonly TuckEndPhaseTwoManualReviewDraft[] = [
  {
    schemaVersion: 'tuck_end_phase_two_review_v1_draft',
    family: 'tuck_end_box',
    reviewScope: 'alignment_sample_reference',
    basicInfo: {
      conversationId: null,
      requestId: null,
      sampleReferenceId: 'tuck_end_candidate_image_bundle_main_item_pending_review',
      rawText: '双插盒，7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合',
      motherPoolSources: ['second_phase_tuck_end_box', 'tuck_end_related_structure_keyword'],
      phaseOne: {
        family: null,
        type: null,
        status: null,
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
      inBucketReasons: [
        '标准双插主件路径',
        '无窗口、无挂钩、无内卡、无 reinforced material path',
        '无高复杂 UV/激凸工艺',
      ],
      misbucketRisk: true,
      misbucketRiskReasons: ['当前证据来自 bundle 图片转写，主件与配件仍需继续拆分核实'],
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
      lineItemsStable: null,
      stableLineItemCodes: [],
      missingCoreLineItemCodes: [],
      priceProxySystematicDrift: null,
      priceProxyDriftDirection: 'not_enough_evidence',
      priceProxyNote: '当前仍缺 live shadow 连续样本与更强 BOM 证据。',
    },
    conclusion: {
      disposition: 'keep_shadow',
      blockReason: 'pending_review_evidence_not_strong_enough',
      reviewNote: '这是当前最接近 limited role 的 quoted clean subset path，但证据级别仍不足以前移角色。',
    },
  },
  {
    schemaVersion: 'tuck_end_phase_two_review_v1_draft',
    family: 'tuck_end_box',
    reviewScope: 'alignment_sample_reference',
    basicInfo: {
      conversationId: null,
      requestId: null,
      sampleReferenceId: 'tuck_end_handoff_monthly_46095',
      rawText: '激凸UV屏幕双插盒，375银卡+UV印+逆向UV+激凸+局部UV++啤+粘盒',
      motherPoolSources: ['second_phase_tuck_end_box', 'tuck_end_related_structure_keyword'],
      phaseOne: {
        family: null,
        type: null,
        status: null,
      },
      secondPhase: {
        family: 'tuck_end_box',
        type: 'tuck_end_box',
        status: 'handoff_required',
        statusReasons: ['tuck_end_box_in_scope', 'high_complexity_process'],
      },
      variantTags: ['screen_style'],
    },
    bucketAssessment: {
      bucket: 'handoff_boundary',
      pathId: 'high_complexity_process',
      inBucketReasons: ['逆向UV、局部UV、激凸构成高复杂工艺叠加', '该路径必须保持 handoff'],
      misbucketRisk: false,
      misbucketRiskReasons: [],
    },
    productAssessment: {
      familyMergeStable: true,
      packagingTypeStable: true,
      statusMatchesExpected: true,
      quotedMisrelease: false,
      highComplexityCorrectlyHandoff: true,
      quotedChecks: {
        packagingTypeResolved: true,
        coreMaterialRecipeComplete: null,
        keyLineItemsComputable: null,
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
      lineItemsStable: null,
      stableLineItemCodes: [],
      missingCoreLineItemCodes: [],
      priceProxySystematicDrift: null,
      priceProxyDriftDirection: 'not_enough_evidence',
      priceProxyNote: '该路径的关键验证点是 handoff 一致性，不是价格贴合度。',
    },
    conclusion: {
      disposition: 'blocked',
      blockReason: 'high_complexity_process_requires_handoff',
      reviewNote: '高复杂工艺路径应持续停留在 shadow/handoff，不进入 limited role 候选。',
    },
  },
] as const