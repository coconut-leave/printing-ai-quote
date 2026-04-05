import type {
  SecondPhaseDecisionStatusDraft,
  SecondPhasePackagingFamilyDraft,
  SecondPhasePackagingTypeDraft,
  SecondPhaseVariantTagDraft,
} from './secondPhaseDraft'
import type { SecondPhaseLineItemCodeDraft } from '@/server/pricing/complexPackagingSecondPhaseLineItemsDraft'
import { SECOND_PHASE_TERM_NORMALIZATIONS_DRAFT } from './secondPhaseTermNormalizationDraft'

export type SecondPhaseObservedCostLineCodeDraft =
  | SecondPhaseLineItemCodeDraft
  | 'window_film'
  | 'double_tape'
  | 'other'

export type SecondPhaseAlignmentSampleStageDraft = 'first_batch' | 'excluded_reference_only'

export type SecondPhaseAlignmentSampleBucketDraft =
  | 'folding_carton_quoted_clean_subset'
  | 'folding_carton_flat_quote_reference'
  | 'folding_carton_material_recipe_term_stability'
  | 'folding_carton_estimated_boundary_samples'
  | 'tuck_end_box_clean_subset'
  | 'tuck_end_box_clean_subset_pending_review'
  | 'tuck_end_box_boundary_samples'
  | 'tuck_end_box_reinforced_estimated_boundary_samples'
  | 'window_box_deferred_glossary_samples'
  | 'future_product_type_candidates'

export type SecondPhaseAlignmentBucketCandidateDecisionDraft = 'accepted' | 'rejected'

export type SecondPhaseAlignmentBucketCandidateBomEvidenceDraft = 'bom_rich' | 'flat_quote_only'

export type SecondPhaseAlignmentBucketCandidateEvaluationRoleDraft =
  | 'default_runner_candidate'
  | 'flat_quote_reference_only'
  | 'material_term_stability'
  | 'estimated_boundary'
  | 'boundary_validation'
  | 'future_type_reference'

export type SecondPhaseAlignmentBucketCandidateDraft = {
  candidateId: string
  bucket: SecondPhaseAlignmentSampleBucketDraft
  decision: SecondPhaseAlignmentBucketCandidateDecisionDraft
  sourceWorkbook: string
  sourceSheet: string
  sourceRowHint: string
  productNameRaw: string
  specRaw: string
  materialProcessRaw: string
  gateContribution?: string[]
  bomEvidence?: SecondPhaseAlignmentBucketCandidateBomEvidenceDraft
  evaluationRole?: SecondPhaseAlignmentBucketCandidateEvaluationRoleDraft
  futurePackagingType?: SecondPhasePackagingTypeDraft
  fitSignals: string[]
  rejectionSignals: string[]
  decisionReason: string
}

export type SecondPhaseFactoryTermDictionaryImpactDraft = 'material_recipe' | 'process' | 'boundary'

export type SecondPhaseFactoryTermDictionaryCandidateDraft = {
  term: string
  impactAreas: SecondPhaseFactoryTermDictionaryImpactDraft[]
  normalizedHint: string
  sourceWorkbook: string
  sourceSheet: string
  sourceRowHint: string
  note: string
}

export type SecondPhaseRealQuoteCostItemDraft = {
  rawLineName: string
  normalizedLineCode?: SecondPhaseObservedCostLineCodeDraft
  materialOrProcessRaw?: string
  basisRaw?: string
  length?: number
  width?: number
  tonPrice?: number
  quantityWithSpoilage?: number
  actualQuantity?: number
  amount?: number
  unitPrice?: number
  note?: string
}

export type SecondPhaseRealQuoteSummaryDraft = {
  normalizedPackagingObservation: string
  finishedSpec?: string
  unfoldedSpec?: string
  sheetSpec?: string
  keyTerms: string[]
  lineItemObservation: string[]
  note?: string
}

export type SecondPhaseAlignmentEvaluationSampleDraft = {
  sampleId: string
  stage: SecondPhaseAlignmentSampleStageDraft
  sourceWorkbook: string
  sourceSheet: string
  sourceRowHint: string
  packagingFamilyExpected: SecondPhasePackagingFamilyDraft
  packagingTypeExpected: SecondPhasePackagingTypeDraft
  variantTagsExpected: SecondPhaseVariantTagDraft[]
  productNameRaw: string
  specRaw: string
  materialProcessRaw: string
  quantity: number
  quotedUnitPrice?: number
  quotedAmount?: number
  realSummary: SecondPhaseRealQuoteSummaryDraft
  realCostItems: SecondPhaseRealQuoteCostItemDraft[]
  expectedDecision: SecondPhaseDecisionStatusDraft
  expectedDecisionReason: string
  grayCandidate: boolean
  bomEvidence?: SecondPhaseAlignmentBucketCandidateBomEvidenceDraft
  evaluationRole?: SecondPhaseAlignmentBucketCandidateEvaluationRoleDraft
  note?: string
}

export type SecondPhaseAlignmentMetricDraft = {
  metricId:
    | 'packaging_type_alignment'
    | 'term_coverage'
    | 'line_item_alignment'
    | 'decision_boundary_alignment'
    | 'price_deviation_proxy'
  displayName: string
  questionAnswered: string
  perSampleSignals: string[]
  judgementRules: string[]
  escalationSignals: string[]
  internalCompareReadyHint: string
}

export type SecondPhaseGrayGateCheckDraft = {
  checkId: string
  rule: string
  whyItMatters: string
}

export type SecondPhaseGrayGateDraft = {
  stage: 'internal_compare_observation' | 'limited_product_role'
  goal: string
  requiredChecks: SecondPhaseGrayGateCheckDraft[]
  stayShadowScenarios: string[]
}

export type SecondPhaseCurrentReadinessAssessmentDraft = {
  currentStage: 'shadow_only'
  internalCompareObservationRecommended: boolean
  strongerProductRoleRecommended: boolean
  recommendationSummary: string
  closestGrayCandidates: string[]
  keyGaps: string[]
  nextPriorityDirections: string[]
}

export const SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT: readonly SecondPhaseAlignmentEvaluationSampleDraft[] = [
  {
    sampleId: 'folding_carton_0401_mkly_color_box',
    stage: 'first_batch',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0401广州麦柯黎雅化妆品工厂',
    sourceRowHint: '彩盒 / 163x82x177mm / 6100',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'folding_carton',
    variantTagsExpected: ['plain_carton'],
    productNameRaw: '彩盒',
    specRaw: '163x82x177mm',
    materialProcessRaw: '350g白卡裱WE坑+2专+黑+覆哑膜+裱+啤+粘',
    quantity: 6100,
    quotedUnitPrice: 2.23,
    quotedAmount: 13603,
    realSummary: {
      normalizedPackagingObservation: '普通彩盒，WE 裱坑，2 专 + 黑墨，覆哑膜，啤后粘盒',
      finishedSpec: '163x82x177mm',
      unfoldedSpec: '50.5x62.4cm',
      keyTerms: ['白卡', 'WE', '2专', '黑', '覆哑膜', '裱', '啤', '粘'],
      lineItemObservation: ['面纸', '坑纸', '哑胶', '裱坑/纸', '印刷费', '刀模', '啤机', '粘盒'],
      note: '该 sheet 同时展示产品摘要与明细行，但成本金额分布在并排报价列中，适合先用于拆项形态对齐。',
    },
    realCostItems: [
      { rawLineName: '面纸', normalizedLineCode: 'face_paper' },
      { rawLineName: '坑纸', normalizedLineCode: 'corrugated_core', materialOrProcessRaw: 'W9+' },
      { rawLineName: '哑胶', normalizedLineCode: 'lamination' },
      { rawLineName: '裱坑/纸', normalizedLineCode: 'backing_or_duplex' },
      { rawLineName: '印刷费', normalizedLineCode: 'printing', materialOrProcessRaw: '2专+黑' },
      { rawLineName: '刀模', normalizedLineCode: 'die_mold' },
      { rawLineName: '啤机', normalizedLineCode: 'die_cut_machine' },
      { rawLineName: '粘盒', normalizedLineCode: 'gluing' },
    ],
    expectedDecision: 'quoted',
    expectedDecisionReason: '首批范围内，主类、材质、坑型、主工艺和核心拆项都完整，可作为 quoted 候选。',
    grayCandidate: true,
    bomEvidence: 'bom_rich',
    evaluationRole: 'default_runner_candidate',
  },
  {
    sampleId: 'mailer_box_0402_xinmeng',
    stage: 'first_batch',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0402欣梦创想',
    sourceRowHint: '密胺麻将飞机盒 / 266x154.5x73mm / 1000',
    packagingFamilyExpected: 'mailer_box',
    packagingTypeExpected: 'mailer_box',
    variantTagsExpected: [],
    productNameRaw: '密胺麻将飞机盒',
    specRaw: '266x154.5x73mm',
    materialProcessRaw: '300g白卡+WE+120+4C+过哑胶+裱+啤',
    quantity: 1000,
    quotedUnitPrice: 2.57,
    quotedAmount: 2570,
    realSummary: {
      normalizedPackagingObservation: '普通飞机盒，WE/加强芯方向，四色，过哑胶，裱后啤',
      finishedSpec: '266x154.5x73mm',
      unfoldedSpec: '56.6x52cm',
      keyTerms: ['白卡', 'WE', '120', '4C', '过哑胶', '裱', '啤'],
      lineItemObservation: ['面纸', '坑纸', '哑胶', '裱坑/纸', '印刷费', '刀模', '啤机'],
    },
    realCostItems: [
      {
        rawLineName: '面纸',
        normalizedLineCode: 'face_paper',
        basisRaw: '300',
        length: 54,
        width: 59,
        tonPrice: 3800,
        quantityWithSpoilage: 1160,
        actualQuantity: 1000,
        amount: 421.31664,
        unitPrice: 0.42131664,
      },
      {
        rawLineName: '坑纸',
        normalizedLineCode: 'corrugated_core',
        materialOrProcessRaw: 'W9+110',
        basisRaw: '1',
        length: 54,
        width: 59,
        tonPrice: 0.78,
        quantityWithSpoilage: 1160,
        actualQuantity: 1000,
        amount: 446.818277636555,
        unitPrice: 0.446818277636555,
      },
      {
        rawLineName: '哑胶',
        normalizedLineCode: 'lamination',
        basisRaw: '1',
        length: 54,
        width: 59,
        tonPrice: 0.0465,
        quantityWithSpoilage: 1160,
        actualQuantity: 1000,
        amount: 171.85284,
        unitPrice: 0.17185284,
      },
      {
        rawLineName: '裱坑/纸',
        normalizedLineCode: 'backing_or_duplex',
        basisRaw: '1',
        length: 54,
        width: 59,
        tonPrice: 0.028,
        quantityWithSpoilage: 1160,
        actualQuantity: 1000,
        amount: 103.48128,
        unitPrice: 0.10348128,
      },
      { rawLineName: '印刷费', normalizedLineCode: 'printing', quantityWithSpoilage: 1160, actualQuantity: 1000, amount: 600, unitPrice: 0.6 },
      { rawLineName: '刀模', normalizedLineCode: 'die_mold', quantityWithSpoilage: 1160, actualQuantity: 1000, amount: 250, unitPrice: 0.25 },
      { rawLineName: '啤机', normalizedLineCode: 'die_cut_machine', materialOrProcessRaw: '排几模就0.1/几模', amount: 116, unitPrice: 0.116 },
    ],
    expectedDecision: 'quoted',
    expectedDecisionReason: '主类清晰，核心材料和主拆项完整，适合首批 quoted 对齐样本。',
    grayCandidate: true,
  },
  {
    sampleId: 'mailer_box_0402_3987p',
    stage: 'first_batch',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0402 3987p',
    sourceRowHint: '飞机盒 / 28*24*6cm / 1000',
    packagingFamilyExpected: 'mailer_box',
    packagingTypeExpected: 'mailer_box',
    variantTagsExpected: [],
    productNameRaw: '飞机盒',
    specRaw: '28*24*6cm',
    materialProcessRaw: '400g白卡+4C+过光胶+裱+啤',
    quantity: 1000,
    quotedUnitPrice: 2.11,
    quotedAmount: 2110,
    realSummary: {
      normalizedPackagingObservation: '普通飞机盒，400g 白卡，4C，过光胶，裱啤',
      finishedSpec: '28*24*6cm',
      unfoldedSpec: '56.6x52cm',
      keyTerms: ['白卡', '4C', '过光胶', '裱', '啤'],
      lineItemObservation: ['面纸', '光胶', '印刷费', '刀模', '啤机'],
    },
    realCostItems: [
      {
        rawLineName: '面纸',
        normalizedLineCode: 'face_paper',
        basisRaw: '400',
        length: 70,
        width: 54.5,
        tonPrice: 3800,
        quantityWithSpoilage: 1160,
        actualQuantity: 1000,
        amount: 672.6608,
        unitPrice: 0.6726608,
      },
      {
        rawLineName: '光胶',
        normalizedLineCode: 'lamination',
        basisRaw: '1',
        length: 70,
        width: 54.5,
        tonPrice: 0.039,
        quantityWithSpoilage: 1160,
        actualQuantity: 1000,
        amount: 172.5906,
        unitPrice: 0.1725906,
      },
      { rawLineName: '印刷费', normalizedLineCode: 'printing', quantityWithSpoilage: 1160, actualQuantity: 1000, amount: 600, unitPrice: 0.6 },
      { rawLineName: '刀模', normalizedLineCode: 'die_mold', quantityWithSpoilage: 1160, actualQuantity: 1000, amount: 200, unitPrice: 0.2 },
      { rawLineName: '啤机', normalizedLineCode: 'die_cut_machine', materialOrProcessRaw: '排几模就0.1/几模', amount: 116, unitPrice: 0.116 },
    ],
    expectedDecision: 'quoted',
    expectedDecisionReason: '普通飞机盒的核心物料与主要后道完整，属于最接近可灰度的一类。',
    grayCandidate: true,
  },
  {
    sampleId: 'tuck_end_hanging_0402_gshifeng_window_insert',
    stage: 'first_batch',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0402鸽士锋',
    sourceRowHint: '挂钩彩盒 / 92x28x92mm / 5000',
    packagingFamilyExpected: 'tuck_end_box',
    packagingTypeExpected: 'tuck_end_box',
    variantTagsExpected: ['hanging_tab', 'with_window_film', 'with_insert'],
    productNameRaw: '挂钩彩盒',
    specRaw: '92x28x92mm',
    materialProcessRaw: '300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+贴窗口片+粘 配内卡*1',
    quantity: 5000,
    quotedUnitPrice: 0.76,
    quotedAmount: 3800,
    realSummary: {
      normalizedPackagingObservation: '挂钩彩盒，双层白卡，对裱，单面 4C，正面过哑胶，带窗口片和配套内卡',
      finishedSpec: '92x28x92mm',
      unfoldedSpec: '56.6x52cm',
      keyTerms: ['挂钩彩盒', '白卡', '4C', '正面过哑胶', '裱', '啤', '贴窗口片', 'APET', '配内卡*1'],
      lineItemObservation: ['哑胶', '裱坑/纸', '胶片/APET', '印刷费', '刀模'],
      note: '真实报价单可给出成品价，但首批 second-phase 仍应把窗口片和配套内卡视为保守边界。',
    },
    realCostItems: [
      { rawLineName: '哑胶', normalizedLineCode: 'lamination', amount: 181.35992, unitPrice: 0.036271984 },
      { rawLineName: '裱坑/纸', normalizedLineCode: 'backing_or_duplex', amount: 109.205973333333, unitPrice: 0.0218411946666667 },
      {
        rawLineName: '胶片0.2APET10x10cm',
        normalizedLineCode: 'window_film',
        materialOrProcessRaw: '0.2APET10x10cm',
        basisRaw: '0.2',
        length: 0.08,
        width: 0.08,
        tonPrice: 14,
        quantityWithSpoilage: 1033.33333333333,
        actualQuantity: 5000,
        amount: 26.0649984,
        unitPrice: 0.025224192,
      },
      { rawLineName: '印刷费', normalizedLineCode: 'printing', amount: 600, unitPrice: 0.12 },
      { rawLineName: '刀模', normalizedLineCode: 'die_mold', amount: 250, unitPrice: 0.05 },
    ],
    expectedDecision: 'estimated',
    expectedDecisionReason: '挂钩盒主类可识别，但窗口片和配内卡仍应停留在 shadow 保守区。',
    grayCandidate: false,
  },
  {
    sampleId: 'tuck_end_hanging_0403_gshifeng_insert',
    stage: 'first_batch',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0403鸽士锋',
    sourceRowHint: '挂钩彩盒 / 92x28x92mm / 5000',
    packagingFamilyExpected: 'tuck_end_box',
    packagingTypeExpected: 'tuck_end_box',
    variantTagsExpected: ['hanging_tab', 'with_insert'],
    productNameRaw: '挂钩彩盒',
    specRaw: '92x28x92mm',
    materialProcessRaw: '300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+粘 配内卡*1',
    quantity: 5000,
    quotedUnitPrice: 0.73,
    quotedAmount: 3650,
    realSummary: {
      normalizedPackagingObservation: '挂钩彩盒，双层白卡，对裱，单面 4C，正面过哑胶，含配套内卡但无窗口片',
      finishedSpec: '92x28x92mm',
      unfoldedSpec: '56.6x52cm',
      keyTerms: ['挂钩彩盒', '白卡', '4C', '正面过哑胶', '裱', '啤', '粘', '配内卡*1'],
      lineItemObservation: ['哑胶', '裱坑/纸', '印刷费', '刀模', '啤机'],
      note: '该类样本适合检验 second-phase 对 hanging tab + companion insert 的保守策略。',
    },
    realCostItems: [
      { rawLineName: '哑胶', normalizedLineCode: 'lamination', amount: 181.35992, unitPrice: 0.036271984 },
      { rawLineName: '裱坑/纸', normalizedLineCode: 'backing_or_duplex', amount: 109.205973333333, unitPrice: 0.0218411946666666 },
      { rawLineName: '印刷费', normalizedLineCode: 'printing', amount: 600, unitPrice: 0.12 },
      { rawLineName: '刀模', normalizedLineCode: 'die_mold', amount: 250, unitPrice: 0.05 },
      { rawLineName: '啤机', normalizedLineCode: 'die_cut_machine', amount: 103.333333333333, unitPrice: 0.0206666666666667 },
    ],
    expectedDecision: 'estimated',
    expectedDecisionReason: '即使去掉窗口片，配套内卡仍说明该样本需要 manual adjustment，不建议直接 grey。',
    grayCandidate: false,
  },
  {
    sampleId: 'folding_carton_monthly_46094',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688月结单2026-03月---叶子康.xlsx',
    sourceSheet: '2026-03',
    sourceRowHint: '46094 / 裱坑盖板盒',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'folding_carton',
    variantTagsExpected: ['plain_carton'],
    productNameRaw: '裱坑盖板盒',
    specRaw: '103*47*198mm',
    materialProcessRaw: '350g单铜裱W9加120g芯+单面印四色+覆哑膜+啤+粘',
    quantity: 3000,
    quotedUnitPrice: 0.93,
    quotedAmount: 2790,
    realSummary: {
      normalizedPackagingObservation: '普通彩盒方向，单铜面纸，W9 加芯，单面四色，覆哑膜，啤后粘盒',
      finishedSpec: '103*47*198mm',
      keyTerms: ['单铜', 'W9', '120g芯', '单面印四色', '覆哑膜', '啤', '粘'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
      note: '该样本保留为 reference-only，用于结果对齐参考，不再计入默认首批 runner，因为它无法直接支持 core_line_items_present。',
    },
    realCostItems: [],
    expectedDecision: 'quoted',
    expectedDecisionReason: '从月结结果看属于稳定首批盒型，但因缺少可复用 line-item 明细，不再作为默认首批 clean subset quoted 样本。',
    grayCandidate: true,
  },
  {
    sampleId: 'folding_carton_monthly_46090_irtusde_flat_quoted',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: '46090 / IRTUSDE 企鹅包装盒',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'folding_carton',
    variantTagsExpected: ['plain_carton'],
    productNameRaw: 'IRTUSDE 企鹅包装盒',
    specRaw: '80x80x120mm',
    materialProcessRaw: '350克白卡+4C印刷+过光油+啤+粘盒',
    quantity: 2000,
    quotedUnitPrice: 0.805,
    quotedAmount: 1610,
    realSummary: {
      normalizedPackagingObservation: '普通彩盒，350g 白卡，四色印刷，过光油，啤后粘盒',
      finishedSpec: '80x80x120mm',
      keyTerms: ['白卡', '4C', '过光油', '啤', '粘盒'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
      note: '适合作为普通彩盒 quoted clean subset 的 flat quoted 参考样本，用于补 gloss/oil 术语稳定性和 quoted 边界。',
    },
    realCostItems: [],
    expectedDecision: 'quoted',
    expectedDecisionReason: '普通彩盒方向、材质和主工艺都明确，但缺少 BOM 明细，适合作为 flat quoted reference，不应替代 BOM-rich 主样本。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'flat_quote_reference_only',
    note: '该样本可补 critical_term_stability、decision_boundary_alignment 和 price_deviation_proxy，但不能补 core_line_items_present。',
  },
  {
    sampleId: 'folding_carton_monthly_46097_onsoyours_recipe_term',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: '46097 / 公仔包装彩盒-哑光母子蝾螈onsoyours',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'folding_carton',
    variantTagsExpected: ['plain_carton'],
    productNameRaw: '公仔包装彩盒-哑光母子蝾螈onsoyours',
    specRaw: '28*19.5*9CM',
    materialProcessRaw: '350g白卡裱W9+110g+四色印刷+过哑胶+啤',
    quantity: 2500,
    quotedUnitPrice: 2.13,
    quotedAmount: 5325,
    realSummary: {
      normalizedPackagingObservation: '普通彩盒方向，W9 加芯配方，四色印刷，过哑胶，啤后未显式写出粘盒',
      finishedSpec: '28*19.5*9CM',
      keyTerms: ['白卡', 'W9', '110g', '四色印刷', '过哑胶', '啤'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
      note: '同工艺文案在同一单号下重复出现，适合测试材料配方解析和术语稳定性，不适合作为最强 quoted clean subset。',
    },
    realCostItems: [],
    expectedDecision: 'estimated',
    expectedDecisionReason: 'W9+110g 的配方表达和是否默认需要粘盒仍需稳定解析，现阶段更适合作为 estimated / shadow 边界参考。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'material_term_stability',
  },
  {
    sampleId: 'folding_carton_monthly_46097_shownicer_recipe_term',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: '46097 / 公仔包装彩盒-哑光母子蝾螈shownicer',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'folding_carton',
    variantTagsExpected: ['plain_carton'],
    productNameRaw: '公仔包装彩盒-哑光母子蝾螈shownicer',
    specRaw: '28*19.5*9CM',
    materialProcessRaw: '350g白卡裱W9+110g+四色印刷+过哑胶+啤',
    quantity: 2500,
    quotedUnitPrice: 2.13,
    quotedAmount: 5325,
    realSummary: {
      normalizedPackagingObservation: '与 onsoyours 行形成重复配方样本，可验证 W9+110g 与过哑胶术语的重复稳定性',
      finishedSpec: '28*19.5*9CM',
      keyTerms: ['白卡', 'W9', '110g', '四色印刷', '过哑胶', '啤'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
      note: '与同号另一条记录共同组成重复样本对，用于观察 second-phase 是否对相同术语给出一致结果。',
    },
    realCostItems: [],
    expectedDecision: 'estimated',
    expectedDecisionReason: '作为重复术语稳定性样本，更适合验证 quoted / estimated 边界是否一致，而不是直接推进 quoted clean subset。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'material_term_stability',
  },
  {
    sampleId: 'folding_carton_0403_gshifeng_inner_box_a9_boundary',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0403鸽士锋',
    sourceRowHint: 'row 9 / 内彩盒 / 10*10*23CM',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'folding_carton',
    variantTagsExpected: ['plain_carton'],
    productNameRaw: '内彩盒',
    specRaw: '10*10*23CM',
    materialProcessRaw: '300g白板纸裱A9加强芯+4C印刷+过哑膜+裱+啤+粘盒',
    quantity: 625,
    quotedUnitPrice: 2.19,
    quotedAmount: 1368.75,
    realSummary: {
      normalizedPackagingObservation: '普通彩盒方向，A9 加强芯，四色印刷，过哑膜，啤后粘盒，但当前报价依据只直接暴露粘盒行',
      finishedSpec: '10*10*23CM',
      keyTerms: ['白板纸', 'A9', '加强芯', '4C印刷', '过哑膜', '裱', '啤', '粘盒'],
      lineItemObservation: ['当前产品行只直接展示粘盒，材料/印刷/刀模依据未完整并排暴露'],
      note: '适合作为 reinforced folding carton 的 estimated 边界样本，而不是 quoted clean subset。',
    },
    realCostItems: [],
    expectedDecision: 'estimated',
    expectedDecisionReason: 'A9 加强芯的普通彩盒路径当前仍应保持 estimated，以避免 second-phase 对 reinforced folding carton 过早放行。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'estimated_boundary',
  },
  {
    sampleId: 'window_boundary_monthly_46085_tuck_end_open_window',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: '46085 / 双插开窗盒',
    packagingFamilyExpected: 'window_box',
    packagingTypeExpected: 'window_box',
    variantTagsExpected: [],
    productNameRaw: '双插开窗盒',
    specRaw: '110x120x95mm',
    materialProcessRaw: '纸板+开窗不贴胶片+啤成品+粘盒',
    quantity: 2000,
    quotedUnitPrice: 0.61,
    quotedAmount: 1220,
    realSummary: {
      normalizedPackagingObservation: '双插盒结构上带开窗，但明确不贴胶片，是典型的 window-related 边界样本',
      finishedSpec: '110x120x95mm',
      keyTerms: ['双插', '开窗不贴胶片', '啤成品', '粘盒'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
      note: '该样本适合验证“开窗但无胶片”应如何在 tuck_end_box 与 window_box 之间做边界判断。',
    },
    realCostItems: [],
    expectedDecision: 'estimated',
    expectedDecisionReason: '不应并入标准双插盒 clean subset，但可作为 window-related 边界样本观察 second-phase 是否保守处理。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'boundary_validation',
  },
  {
    sampleId: 'tuck_end_image_fireproof_file_bag_ae_boundary',
    stage: 'excluded_reference_only',
    sourceWorkbook: 'image_quote_archive_2026-04-05',
    sourceSheet: '2026-04-05-fireproof-file-bag-quote',
    sourceRowHint: 'line 2 / 防火风琴文件包双插盒 / 365*270*53MM',
    packagingFamilyExpected: 'tuck_end_box',
    packagingTypeExpected: 'tuck_end_box',
    variantTagsExpected: [],
    productNameRaw: '防火风琴文件包双插盒',
    specRaw: '365*270*53MM',
    materialProcessRaw: '300克牛纸+AE加强芯+印黑色+裱+啤',
    quantity: 1000,
    quotedUnitPrice: 2.15,
    quotedAmount: 2150,
    realSummary: {
      normalizedPackagingObservation: '双插盒方向，但使用牛纸 + AE加强芯 + 印黑色 + 裱 + 啤，属于 reinforced material path 的 estimated 边界样本',
      finishedSpec: '365*270*53MM',
      keyTerms: ['双插盒', '牛纸', 'AE加强芯', '印黑色', '裱', '啤'],
      lineItemObservation: ['图片报价仅保留成品行，不含完整 line-item 明细'],
      note: '应补入 reinforced tuck_end estimated boundary，不应并入标准双插盒 clean subset。',
    },
    realCostItems: [],
    expectedDecision: 'estimated',
    expectedDecisionReason: 'AE加强芯 的 reinforced material path 当前应继续保守停在 estimated，用来补材料路径边界，而不是挤进标准双插盒 quoted 主路径。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'estimated_boundary',
  },
  {
    sampleId: 'window_box_image_gloss_film_deferred',
    stage: 'excluded_reference_only',
    sourceWorkbook: 'image_quote_archive_2026-04-05',
    sourceSheet: '2026-04-05-window-color-box-quote',
    sourceRowHint: 'line 1 / 开窗彩盒 / 21*17*31cm',
    packagingFamilyExpected: 'window_box',
    packagingTypeExpected: 'window_box',
    variantTagsExpected: ['with_window_film'],
    productNameRaw: '开窗彩盒',
    specRaw: '21*17*31cm',
    materialProcessRaw: '400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘',
    quantity: 500,
    quotedUnitPrice: 5,
    quotedAmount: 2500,
    realSummary: {
      normalizedPackagingObservation: '开窗彩盒，单铜 + 四色 + 表面过光 + 裱 + 开窗贴 0.2 厚胶片 + 啤 + 粘，适合作为 window-related deferred/glossary 样本',
      finishedSpec: '21*17*31cm',
      keyTerms: ['开窗彩盒', '单铜', '四色', '表面过光', '开窗贴', '0.2厚胶片', '23.5*14CM', '啤', '粘'],
      lineItemObservation: ['图片报价仅保留成品行，不含完整 line-item 明细'],
      note: '价值在于 window-related 边界与术语覆盖，不进入首批 quoted 主路径。',
    },
    realCostItems: [],
    expectedDecision: 'estimated',
    expectedDecisionReason: '带开窗和胶片厚度的样本当前应留在 deferred / glossary 支持桶，用于补边界和术语覆盖，而不是进入首批 quoted 主路径。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'boundary_validation',
  },
  {
    sampleId: 'future_type_monthly_46084_auto_lock_bottom',
    stage: 'excluded_reference_only',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: '46084 / 麦东哑光扣底盒',
    packagingFamilyExpected: 'folding_carton',
    packagingTypeExpected: 'auto_lock_bottom_box',
    variantTagsExpected: [],
    productNameRaw: '麦东哑光扣底盒',
    specRaw: '9 x 9 x 12.5 CM',
    materialProcessRaw: '250g宁波单铜纸W9加强芯+四色印刷+过哑胶+啤+粘',
    quantity: 10000,
    quotedUnitPrice: 0.65,
    quotedAmount: 6500,
    realSummary: {
      normalizedPackagingObservation: '扣底盒方向明确，单铜面纸 + W9 加强芯，四色印刷，过哑胶，啤后粘',
      finishedSpec: '9 x 9 x 12.5 CM',
      keyTerms: ['扣底盒', '单铜纸', 'W9加强芯', '四色印刷', '过哑胶', '啤', '粘'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
      note: '结构类型明确，但属于首批 second-phase 之外的 deferred product type。',
    },
    realCostItems: [],
    expectedDecision: 'handoff_required',
    expectedDecisionReason: '扣底盒属于未来 product type，应独立累积样本，不应挤进首批 clean subset。',
    grayCandidate: false,
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'future_type_reference',
  },
  {
    sampleId: 'tuck_end_handoff_monthly_46095',
    stage: 'first_batch',
    sourceWorkbook: '1688月结单2026-03月---叶子康.xlsx',
    sourceSheet: '2026-03',
    sourceRowHint: '46095 / 激凸UV屏幕双插盒',
    packagingFamilyExpected: 'tuck_end_box',
    packagingTypeExpected: 'tuck_end_box',
    variantTagsExpected: ['screen_style'],
    productNameRaw: '激凸UV屏幕双插盒',
    specRaw: '100mm*15mm*215mm',
    materialProcessRaw: '375银卡+UV印+逆向UV+激凸+局部UV++啤+粘盒',
    quantity: 10000,
    quotedUnitPrice: 1,
    quotedAmount: 10000,
    realSummary: {
      normalizedPackagingObservation: '双插盒方向，但工艺组合明显超出首批 shadow 稳定范围',
      finishedSpec: '100mm*15mm*215mm',
      keyTerms: ['银卡', 'UV印', '逆向UV', '激凸', '局部UV', '啤', '粘盒'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
    },
    realCostItems: [],
    expectedDecision: 'handoff_required',
    expectedDecisionReason: '逆向 UV + 局部 UV + 激凸 的高复杂工艺叠加必须继续停留在 shadow。',
    grayCandidate: false,
  },
  {
    sampleId: 'tuck_end_handoff_monthly_46100',
    stage: 'first_batch',
    sourceWorkbook: '1688月结单2026-03月---叶子康.xlsx',
    sourceSheet: '2026-03',
    sourceRowHint: '46100 / 激凸UV屏幕双插大盒',
    packagingFamilyExpected: 'tuck_end_box',
    packagingTypeExpected: 'tuck_end_box',
    variantTagsExpected: ['screen_style', 'large_box'],
    productNameRaw: '激凸UV屏幕双插大盒',
    specRaw: '100mm*52mm*215mm',
    materialProcessRaw: '375银卡+UV印+激凸+局部UV++啤+粘盒',
    quantity: 2000,
    quotedUnitPrice: 2.15,
    quotedAmount: 4300,
    realSummary: {
      normalizedPackagingObservation: '屏幕双插大盒，银卡 + UV + 激凸 + 局部 UV，属于高复杂后道组合',
      finishedSpec: '100mm*52mm*215mm',
      keyTerms: ['银卡', 'UV印', '激凸', '局部UV', '啤', '粘盒'],
      lineItemObservation: ['月结单仅保留成品价，不含完整 line-item 明细'],
    },
    realCostItems: [],
    expectedDecision: 'handoff_required',
    expectedDecisionReason: '虽无逆向 UV，但局部 UV + 激凸 仍属于首批必须 handoff 的高复杂工艺组合。',
    grayCandidate: false,
  },
] as const

export const SECOND_PHASE_FIRST_BATCH_ALIGNMENT_EVALUATION_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) => sample.stage === 'first_batch')

const SECOND_PHASE_FOLDING_CARTON_QUOTED_CLEAN_SUBSET_SAMPLE_IDS_DRAFT = new Set([
  'folding_carton_0401_mkly_color_box',
])

const SECOND_PHASE_FOLDING_CARTON_FLAT_QUOTE_REFERENCE_SAMPLE_IDS_DRAFT = new Set([
  'folding_carton_monthly_46090_irtusde_flat_quoted',
])

const SECOND_PHASE_FOLDING_CARTON_MATERIAL_RECIPE_TERM_STABILITY_SAMPLE_IDS_DRAFT = new Set([
  'folding_carton_monthly_46097_onsoyours_recipe_term',
  'folding_carton_monthly_46097_shownicer_recipe_term',
])

const SECOND_PHASE_FOLDING_CARTON_ESTIMATED_BOUNDARY_SAMPLE_IDS_DRAFT = new Set([
  'folding_carton_0403_gshifeng_inner_box_a9_boundary',
])

const SECOND_PHASE_TUCK_END_BOUNDARY_SAMPLE_IDS_DRAFT = new Set([
  'window_boundary_monthly_46085_tuck_end_open_window',
])

const SECOND_PHASE_TUCK_END_REINFORCED_ESTIMATED_BOUNDARY_SAMPLE_IDS_DRAFT = new Set([
  'tuck_end_image_fireproof_file_bag_ae_boundary',
])

const SECOND_PHASE_WINDOW_BOX_DEFERRED_GLOSSARY_SAMPLE_IDS_DRAFT = new Set([
  'window_box_image_gloss_film_deferred',
])

const SECOND_PHASE_FUTURE_PRODUCT_TYPE_SAMPLE_IDS_DRAFT = new Set([
  'future_type_monthly_46084_auto_lock_bottom',
])

export const SECOND_PHASE_FOLDING_CARTON_QUOTED_CLEAN_SUBSET_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_FOLDING_CARTON_QUOTED_CLEAN_SUBSET_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_FOLDING_CARTON_FLAT_QUOTE_REFERENCE_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_FOLDING_CARTON_FLAT_QUOTE_REFERENCE_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_FOLDING_CARTON_MATERIAL_RECIPE_TERM_STABILITY_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_FOLDING_CARTON_MATERIAL_RECIPE_TERM_STABILITY_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_FOLDING_CARTON_ESTIMATED_BOUNDARY_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_FOLDING_CARTON_ESTIMATED_BOUNDARY_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_TUCK_END_BOUNDARY_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_TUCK_END_BOUNDARY_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_TUCK_END_REINFORCED_ESTIMATED_BOUNDARY_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_TUCK_END_REINFORCED_ESTIMATED_BOUNDARY_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_WINDOW_BOX_DEFERRED_GLOSSARY_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_WINDOW_BOX_DEFERRED_GLOSSARY_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_FUTURE_PRODUCT_TYPE_CANDIDATE_SAMPLES_DRAFT =
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.filter((sample) =>
    SECOND_PHASE_FUTURE_PRODUCT_TYPE_SAMPLE_IDS_DRAFT.has(sample.sampleId)
  )

export const SECOND_PHASE_FOLDING_CARTON_FOCUSED_EVALUATION_SAMPLES_DRAFT = Array.from(
  new Map(
    [
      ...SECOND_PHASE_FOLDING_CARTON_QUOTED_CLEAN_SUBSET_SAMPLES_DRAFT,
      ...SECOND_PHASE_FOLDING_CARTON_FLAT_QUOTE_REFERENCE_SAMPLES_DRAFT,
      ...SECOND_PHASE_FOLDING_CARTON_MATERIAL_RECIPE_TERM_STABILITY_SAMPLES_DRAFT,
      ...SECOND_PHASE_FOLDING_CARTON_ESTIMATED_BOUNDARY_SAMPLES_DRAFT,
    ].map((sample) => [sample.sampleId, sample])
  ).values()
) as readonly SecondPhaseAlignmentEvaluationSampleDraft[]

export const SECOND_PHASE_ALIGNMENT_BUCKET_SCREENING_DRAFT: readonly SecondPhaseAlignmentBucketCandidateDraft[] = [
  {
    candidateId: 'folding_carton_candidate_0401_mkly_color_box',
    bucket: 'folding_carton_quoted_clean_subset',
    decision: 'accepted',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0401广州麦柯黎雅化妆品工厂',
    sourceRowHint: 'row 7 / 彩盒 / 163x82x177mm',
    productNameRaw: '彩盒',
    specRaw: '163x82x177mm',
    materialProcessRaw: '350g白卡裱WE坑+2专+黑+覆哑膜+裱+啤+粘',
    gateContribution: ['critical_term_stability', 'core_line_items_present', 'type_alignment_majority'],
    bomEvidence: 'bom_rich',
    evaluationRole: 'default_runner_candidate',
    fitSignals: [
      '普通彩盒主类清晰',
      '无窗口、无配内卡、无高复杂工艺',
      '能观察到面纸/坑纸/印刷费/刀模/啤机/粘盒主骨架证据',
      '适合作为 quoted clean subset 的 BOM-rich 样本',
    ],
    rejectionSignals: [],
    decisionReason: '这是当前两份真实单据里最适合作为普通彩盒 quoted clean subset 的主样本，虽然存在“2款为一套”的商业备注，但对 line-item 主骨架验证价值最高。',
  },
  {
    candidateId: 'folding_carton_candidate_monthly_46090_irtusde',
    bucket: 'folding_carton_flat_quote_reference',
    decision: 'accepted',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 13 / 46090 / IRTUSDE 企鹅包装盒',
    productNameRaw: 'IRTUSDE 企鹅包装盒',
    specRaw: '80x80x120mm',
    materialProcessRaw: '350克白卡+4C印刷+过光油+啤+粘盒',
    gateContribution: ['critical_term_stability', 'decision_boundary_alignment', 'price_deviation_proxy'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'flat_quote_reference_only',
    fitSignals: [
      '普通彩盒主类明确',
      '白卡 + 4C + 过光油 + 啤 + 粘盒 的 quoted 路径足够干净',
      '可补“过光油”术语与 quoted 边界的稳定性样本',
    ],
    rejectionSignals: ['月结单只有成品成交价，没有完整 line-item 明细'],
    decisionReason: '适合纳入普通彩盒 flat quoted reference 桶，只补术语稳定性、quoted 边界与价格代理，不再替代 BOM-rich 主样本承担 gray gate。',
  },
  {
    candidateId: 'folding_carton_candidate_0401_mkly_middle_box',
    bucket: 'folding_carton_quoted_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0401广州麦柯黎雅化妆品工厂',
    sourceRowHint: 'row 6 / 中盒 / 170x499x184mm',
    productNameRaw: '中盒',
    specRaw: '170x499x184mm',
    materialProcessRaw: '350g白卡裱WE坑+2专+黑+覆哑膜+裱+啤+粘',
    fitSignals: [
      '结构和工艺方向接近普通彩盒 clean subset',
      '可见印刷费与粘盒明细',
    ],
    rejectionSignals: [
      '同组单据呈现为配套样式，不够干净',
      '当前可见 line-item 不能稳定覆盖刀模与啤机主骨架',
    ],
    decisionReason: '不纳入默认首批 clean subset，因为它更像配套组内组件，且 line-item 主骨架证据不完整。',
  },
  {
    candidateId: 'folding_carton_candidate_0403_gshifeng_inner_box',
    bucket: 'folding_carton_quoted_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0403鸽士锋',
    sourceRowHint: 'row 9 / 内彩盒 / 10*10*23CM',
    productNameRaw: '内彩盒',
    specRaw: '10*10*23CM',
    materialProcessRaw: '300g白板纸裱A9加强芯+4C印刷+过哑膜+裱+啤+粘盒',
    fitSignals: [
      '普通盒类方向明确',
      '无窗口、无配内卡、无高复杂工艺',
      'quoted clean subset 的结构噪音较低',
    ],
    rejectionSignals: [
      '当前可见成本明细主要只有粘盒',
      '不足以直接验证 core_line_items_present',
    ],
    decisionReason: '结构上足够干净，但 BOM 证据过弱，暂不纳入当前以 line-item 主骨架验证为主的 quoted clean subset。',
  },
  {
    candidateId: 'folding_carton_candidate_monthly_46094',
    bucket: 'folding_carton_quoted_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688月结单2026-03月---叶子康.xlsx',
    sourceSheet: '2026-03',
    sourceRowHint: 'row 3 / 46094 / 裱坑盖板盒',
    productNameRaw: '裱坑盖板盒',
    specRaw: '103*47*198mm',
    materialProcessRaw: '350g单铜裱W9加120g芯+单面印四色+覆哑膜+啤+粘',
    fitSignals: [
      '结构和工艺方向接近普通彩盒 quoted clean subset',
      '适合看最终成交价与 quoted 边界',
    ],
    rejectionSignals: [
      '月结单缺少 line-item 明细',
      '不能直接支撑 core_line_items_present',
    ],
    decisionReason: '保留为 reference-only，不再纳入默认首批 quoted clean subset。',
  },
  {
    candidateId: 'folding_carton_candidate_monthly_46097_onsoyours',
    bucket: 'folding_carton_material_recipe_term_stability',
    decision: 'accepted',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 15 / 46097 / 公仔包装彩盒-哑光母子蝾螈onsoyours',
    productNameRaw: '公仔包装彩盒-哑光母子蝾螈onsoyours',
    specRaw: '28*19.5*9CM',
    materialProcessRaw: '350g白卡裱W9+110g+四色印刷+过哑胶+啤',
    gateContribution: ['critical_term_stability', 'family_specific_stability', 'decision_boundary_alignment'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'material_term_stability',
    fitSignals: [
      '普通彩盒方向明确',
      'W9+110g 的配方写法适合补材料配方解析',
      '“过哑胶”与未显式写粘盒的组合适合观察 quoted / estimated 边界',
    ],
    rejectionSignals: ['月结单只有成品价', '不具备 BOM-rich 主骨架证据', '不应直接作为 strongest quoted clean subset'],
    decisionReason: '应纳入 folding carton 材料配方 / 术语稳定性桶，而不是直接抬成最强 quoted clean subset。',
  },
  {
    candidateId: 'folding_carton_candidate_monthly_46097_shownicer',
    bucket: 'folding_carton_material_recipe_term_stability',
    decision: 'accepted',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 16 / 46097 / 公仔包装彩盒-哑光母子蝾螈shownicer',
    productNameRaw: '公仔包装彩盒-哑光母子蝾螈shownicer',
    specRaw: '28*19.5*9CM',
    materialProcessRaw: '350g白卡裱W9+110g+四色印刷+过哑胶+啤',
    gateContribution: ['critical_term_stability', 'family_specific_stability', 'decision_boundary_alignment'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'material_term_stability',
    fitSignals: [
      '与同号另一条记录组成重复配方样本对',
      '可检验相同术语是否稳定落到同一材料配方与边界判断',
      '普通彩盒方向明确但非 BOM-rich',
    ],
    rejectionSignals: ['月结单只有成品价', '不应和 quoted clean subset 主样本争角色'],
    decisionReason: '与 onsoyours 行一起，更适合服务 term stability，而不是抢占 quoted clean subset。',
  },
  {
    candidateId: 'folding_carton_estimated_boundary_0403_gshifeng_inner_box',
    bucket: 'folding_carton_estimated_boundary_samples',
    decision: 'accepted',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0403鸽士锋',
    sourceRowHint: 'row 9 / 内彩盒 / 10*10*23CM',
    productNameRaw: '内彩盒',
    specRaw: '10*10*23CM',
    materialProcessRaw: '300g白板纸裱A9加强芯+4C印刷+过哑膜+裱+啤+粘盒',
    gateContribution: ['decision_boundary_alignment', 'no_aggressive_regression', 'family_specific_stability'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'estimated_boundary',
    fitSignals: [
      '仍属于首批普通彩盒范围，不是超范围 handoff 结构',
      'A9 加强芯会让 second-phase 容易过早放 quoted',
      '来自真实报价表，比月结单更接近报价依据语境',
    ],
    rejectionSignals: ['当前并排可见的 line-item 证据不完整，不适合作为 quoted clean 主样本'],
    decisionReason: '这是更合适的普通彩盒 estimated 边界样本，价值在于校准 reinforced folding carton 什么时候先停在 estimated。',
  },
  {
    candidateId: 'tuck_end_candidate_hanging_0402_gshifeng_window_insert',
    bucket: 'tuck_end_box_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0402鸽士锋',
    sourceRowHint: 'row 6 / 挂钩彩盒 / 92x28x92mm',
    productNameRaw: '挂钩彩盒',
    specRaw: '92x28x92mm',
    materialProcessRaw: '300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+贴窗口片+粘 配内卡*1',
    fitSignals: ['双插类方向相关'],
    rejectionSignals: ['带挂钩', '带窗口片', '带配内卡'],
    decisionReason: '明显不属于标准双插盒 clean subset。',
  },
  {
    candidateId: 'tuck_end_candidate_hanging_0403_gshifeng_insert',
    bucket: 'tuck_end_box_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0403鸽士锋',
    sourceRowHint: 'row 6 / 挂钩彩盒 / 92x28x92mm',
    productNameRaw: '挂钩彩盒',
    specRaw: '92x28x92mm',
    materialProcessRaw: '300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+粘 配内卡*1',
    fitSignals: ['双插类方向相关'],
    rejectionSignals: ['带挂钩', '带配内卡'],
    decisionReason: '去掉窗口后仍不是标准双插 clean subset，因为挂钩和 companion insert 都还在。',
  },
  {
    candidateId: 'tuck_end_candidate_monthly_46095',
    bucket: 'tuck_end_box_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688月结单2026-03月---叶子康.xlsx',
    sourceSheet: '2026-03',
    sourceRowHint: 'row 4 / 46095 / 激凸UV屏幕双插盒',
    productNameRaw: '激凸UV屏幕双插盒',
    specRaw: '100mm*15mm*215mm',
    materialProcessRaw: '375银卡+UV印+逆向UV+激凸+局部UV++啤+粘盒',
    fitSignals: ['明确是双插盒'],
    rejectionSignals: ['逆向UV', '局部UV', '激凸', '银卡高复杂工艺'],
    decisionReason: '虽然主类明确，但明显属于高复杂双插盒，不应混入 clean subset。',
  },
  {
    candidateId: 'tuck_end_candidate_monthly_46100',
    bucket: 'tuck_end_box_clean_subset',
    decision: 'rejected',
    sourceWorkbook: '1688月结单2026-03月---叶子康.xlsx',
    sourceSheet: '2026-03',
    sourceRowHint: 'row 5 / 46100 / 激凸UV屏幕双插大盒',
    productNameRaw: '激凸UV屏幕双插大盒',
    specRaw: '100mm*52mm*215mm',
    materialProcessRaw: '375银卡+UV印+激凸+局部UV++啤+粘盒',
    fitSignals: ['明确是双插盒'],
    rejectionSignals: ['局部UV', '激凸', '银卡高复杂工艺'],
    decisionReason: '主类明确，但仍属于高复杂双插盒，不适合作为 clean subset 稳定性样本。',
  },
  {
    candidateId: 'tuck_end_candidate_image_bundle_main_item_pending_review',
    bucket: 'tuck_end_box_clean_subset_pending_review',
    decision: 'accepted',
    sourceWorkbook: 'image_quote_archive_2026-04-05',
    sourceSheet: '2026-04-05-tuck-end-bundle-quote',
    sourceRowHint: 'line 1 / 双插盒 / 7*5*5CM',
    productNameRaw: '双插盒',
    specRaw: '7*5*5CM',
    materialProcessRaw: '350克白卡+正反四色+专印+正面过哑胶+啤+粘合',
    gateContribution: ['candidate_pool_only'],
    bomEvidence: 'flat_quote_only',
    fitSignals: [
      '主件行本身是标准双插盒方向，且有明确粘合工艺',
      '无窗口、无挂钩、无高复杂 UV/激凸工艺',
      '可作为标准双插盒 clean subset 的 main-item lead',
    ],
    rejectionSignals: ['整图是 bundle 报价，必须把主件与内托/说明书/透明贴纸拆开看', '当前只有图片转写，不具备 workbook/BOM-rich 证据'],
    decisionReason: '先挂到 tuck_end_box clean subset pending review，只作为 main-item candidate，不直接 admitted 到标准双插盒 clean subset。',
  },
  {
    candidateId: 'tuck_end_boundary_candidate_monthly_46085_window_without_film',
    bucket: 'tuck_end_box_boundary_samples',
    decision: 'accepted',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 11 / 46085 / 双插开窗盒',
    productNameRaw: '双插开窗盒',
    specRaw: '110x120x95mm',
    materialProcessRaw: '纸板+开窗不贴胶片+啤成品+粘盒',
    gateContribution: ['decision_boundary_alignment', 'no_aggressive_regression', 'family_specific_stability'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'boundary_validation',
    fitSignals: [
      '“双插”与“开窗”同时出现，适合验证 tuck_end_box vs window-related 边界',
      '“不贴胶片”把窗口开孔和窗口片材料拆开，能单独观察边界规则',
      '有真实成品价，可作为边界验证参考样本',
    ],
    rejectionSignals: ['不能纳入标准双插盒 clean subset', '材料和印刷信息过少，不适合做 quoted clean 主样本'],
    decisionReason: '它的价值在于验证“开窗但无胶片”是否仍应落入 window-related 保守边界，而不是伪装成标准双插盒 clean subset。',
  },
  {
    candidateId: 'tuck_end_reinforced_boundary_image_fireproof_ae',
    bucket: 'tuck_end_box_reinforced_estimated_boundary_samples',
    decision: 'accepted',
    sourceWorkbook: 'image_quote_archive_2026-04-05',
    sourceSheet: '2026-04-05-fireproof-file-bag-quote',
    sourceRowHint: 'line 2 / 防火风琴文件包双插盒 / 365*270*53MM',
    productNameRaw: '防火风琴文件包双插盒',
    specRaw: '365*270*53MM',
    materialProcessRaw: '300克牛纸+AE加强芯+印黑色+裱+啤',
    gateContribution: ['decision_boundary_alignment', 'no_aggressive_regression', 'family_specific_stability'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'estimated_boundary',
    fitSignals: [
      '双插盒方向明确，但材料路径属于 reinforced material path',
      'AE加强芯 有助于补 reinforced term coverage 与 estimated 边界',
      '不会污染标准双插盒 clean subset 主路径',
    ],
    rejectionSignals: ['图片报价只有成品行', '不具备标准 clean subset 所需的 BOM-rich 明细'],
    decisionReason: '正式挂到 reinforced estimated-boundary 支持桶，用于补 reinforced material path 的 estimated 边界。',
  },
  {
    candidateId: 'window_box_deferred_image_gloss_film',
    bucket: 'window_box_deferred_glossary_samples',
    decision: 'accepted',
    sourceWorkbook: 'image_quote_archive_2026-04-05',
    sourceSheet: '2026-04-05-window-color-box-quote',
    sourceRowHint: 'line 1 / 开窗彩盒 / 21*17*31cm',
    productNameRaw: '开窗彩盒',
    specRaw: '21*17*31cm',
    materialProcessRaw: '400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘',
    gateContribution: ['critical_term_stability', 'decision_boundary_alignment', 'family_specific_stability'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'boundary_validation',
    fitSignals: [
      '开窗、胶片厚度和窗口尺寸都写得比较明确',
      '表面过光 可补 gloss 同义术语覆盖',
      '适合作为 window-related deferred/glossary 支持样本',
    ],
    rejectionSignals: ['不应进入首批 quoted 主路径', '不是标准双插盒 clean subset'],
    decisionReason: '正式挂到 window_box deferred/glossary 支持桶，用于补 window-related 边界和术语覆盖。',
  },
  {
    candidateId: 'future_type_candidate_monthly_46084_auto_lock_bottom',
    bucket: 'future_product_type_candidates',
    decision: 'accepted',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 14 / 46084 / 麦东哑光扣底盒',
    productNameRaw: '麦东哑光扣底盒',
    specRaw: '9 x 9 x 12.5 CM',
    materialProcessRaw: '250g宁波单铜纸W9加强芯+四色印刷+过哑胶+啤+粘',
    gateContribution: ['future_type_mapping'],
    bomEvidence: 'flat_quote_only',
    evaluationRole: 'future_type_reference',
    futurePackagingType: 'auto_lock_bottom_box',
    fitSignals: [
      '“扣底盒”结构词明确，可直接挂到 future product type',
      'W9加强芯 + 四色 + 过哑胶 的普通工艺组合有代表性',
      '可作为 auto_lock_bottom_box 的早期真实样本候选',
    ],
    rejectionSignals: ['不在首批 second-phase clean subset 范围', '月结单只有扁平成交价'],
    decisionReason: '应单独挂到 future product type bucket，优先归档为 auto_lock_bottom_box 候选，而不是继续污染首批 clean subset。',
  },
] as const

export const SECOND_PHASE_FACTORY_TERM_DICTIONARY_CANDIDATES_DRAFT: readonly SecondPhaseFactoryTermDictionaryCandidateDraft[] = [
  {
    term: '白E高强芯',
    impactAreas: ['material_recipe'],
    normalizedHint: 'E 坑高强芯 / 白面 E 坑加强芯',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 3-6 / 麻将包装飞机盒等',
    note: '影响 corrugationType 与 reinforcement material 的解析，应归到材料配方词典。',
  },
  {
    term: 'AE坑',
    impactAreas: ['material_recipe'],
    normalizedHint: 'AE 复合坑型 / corrugated mounting recipe',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 7 / 45996 / 飞机盒',
    note: '会直接影响坑型识别和裱坑配方，不应只当作普通文本。',
  },
  {
    term: 'A9加强芯',
    impactAreas: ['material_recipe'],
    normalizedHint: 'A9 corrugation with reinforcement core',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 9, 12 / 46050, 46087',
    note: '需拆出坑型与加强芯，而不是只识别为一个模糊材料词。',
  },
  {
    term: 'W9',
    impactAreas: ['material_recipe'],
    normalizedHint: 'W9 corrugation / corrugated recipe anchor',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 14-16 / 46084, 46097',
    note: '在新表里同时出现在扣底盒和普通彩盒配方中，是当前 folding carton term stability 的核心词。',
  },
  {
    term: '对裱',
    impactAreas: ['material_recipe', 'process'],
    normalizedHint: 'duplex mounting / pre-mounted board',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 17, 19 / 46098, 46097 吹风机彩盒',
    note: '既影响 mountingMode，也影响 line-item 是否需要 backing_or_duplex。',
  },
  {
    term: '已对裱',
    impactAreas: ['material_recipe', 'boundary'],
    normalizedHint: 'pre-mounted duplex board',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 17, 19 / 46098, 46097 吹风机彩盒',
    note: '应区分普通对裱和已预裱完成的 pre-mounted 语义，避免把已对裱普通盒误推 quoted。',
  },
  {
    term: '加强芯',
    impactAreas: ['material_recipe', 'boundary'],
    normalizedHint: 'reinforcement core',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0403鸽士锋',
    sourceRowHint: 'row 9 / 内彩盒 / 10*10*23CM',
    note: '应单独抽出 reinforcement 语义，而不是只依附在 A9/W9 文本后面。',
  },
  {
    term: '裱坑',
    impactAreas: ['material_recipe', 'process'],
    normalizedHint: 'corrugated mounting',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0401广州麦柯黎雅化妆品工厂',
    sourceRowHint: '彩盒 / 163x82x177mm / 6100',
    note: '属于材料配方和 line-item 双重信号，需稳定映射到 corrugated mounting。',
  },
  {
    term: '过哑胶',
    impactAreas: ['process'],
    normalizedHint: 'matte lamination',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 15-16 / 46097',
    note: '需和 覆哑膜 归并到同一 matte 术语集合。',
  },
  {
    term: '覆哑膜',
    impactAreas: ['process'],
    normalizedHint: 'matte lamination',
    sourceWorkbook: '1688报价2026-4月-黄娟.xlsx',
    sourceSheet: '0401广州麦柯黎雅化妆品工厂',
    sourceRowHint: '彩盒 / 163x82x177mm / 6100',
    note: '是报价单里更常见的 matte 书写方式，应与 过哑胶 对齐。',
  },
  {
    term: '正反都过哑膜',
    impactAreas: ['process'],
    normalizedHint: 'double-side matte lamination',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 7 / 45996 / 飞机盒',
    note: '应影响 laminationType 和 laminationSideCount，而不是只识别到单面覆膜。',
  },
  {
    term: '过光油',
    impactAreas: ['process'],
    normalizedHint: 'gloss varnish / gloss oil coating',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'rows 9, 12, 13 / 46050, 46087, 46090',
    note: '是当前 quoted clean folding carton 里缺少的主要表面处理术语之一。',
  },
  {
    term: 'gloss',
    impactAreas: ['process'],
    normalizedHint: 'gloss varnish / gloss coating',
    sourceWorkbook: 'image_quote_archive_2026-04-05',
    sourceSheet: '2026-04-05-window-color-box-quote',
    sourceRowHint: 'line 1 / 开窗彩盒',
    note: '作为英文 gloss 别名保留，避免图片转写或英文客户描述和中文词典脱节。',
  },
  {
    term: '防刮花哑膜',
    impactAreas: ['process'],
    normalizedHint: 'scratch-resistant matte lamination',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 17 / 46098 / Maruchan Gold Box',
    note: '属于覆膜细分词，未来应区分普通 matte 与防刮花 matte。',
  },
  {
    term: 'V槽',
    impactAreas: ['process', 'boundary'],
    normalizedHint: 'V-groove / rigid-box-like structural process',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 17 / 46098 / Maruchan Gold Box',
    note: '不只是工艺词，也可能把样本推向延后类目或更高复杂结构边界。',
  },
  {
    term: '无印刷',
    impactAreas: ['process', 'boundary'],
    normalizedHint: 'blank box / print_mode none',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 10 / 46055 / PUNIPAL飞机盒配用内卡',
    note: '既影响 printMode = none，也影响是否属于 blank_box / accessory 边界。',
  },
  {
    term: '开窗不贴胶片',
    impactAreas: ['boundary'],
    normalizedHint: 'window opening without film',
    sourceWorkbook: '1688月结单2026-3月-黄娟.xlsx',
    sourceSheet: '3月已交货',
    sourceRowHint: 'row 11 / 46085 / 双插开窗盒',
    note: '核心价值在于把“有窗口结构”和“有窗口片材料”这两件事拆开，用于 window-related 边界判断。',
  },
] as const

export const SECOND_PHASE_FACTORY_TERM_NORMALIZATIONS_DRAFT = SECOND_PHASE_TERM_NORMALIZATIONS_DRAFT

export const SECOND_PHASE_ALIGNMENT_METRICS_DRAFT: readonly SecondPhaseAlignmentMetricDraft[] = [
  {
    metricId: 'packaging_type_alignment',
    displayName: '主类归并准确性',
    questionAnswered: 'phase-one 与 second-phase 谁更接近真实单据里的包装主类和变体信息。',
    perSampleSignals: [
      'phase-one 归并结果',
      'second-phase 归并结果',
      '真实样本期望 packagingTypeExpected / variantTagsExpected',
      '是否存在 second-phase 比 phase-one 更接近真实单据的证据',
    ],
    judgementRules: [
      '完全命中期望主类记为 aligned。',
      '主类命中但缺少关键 variant tag 记为 partial。',
      '归并到错误族或错误主类记为 mismatch。',
      '对每条样本明确记录是 phase-one 更接近、second-phase 更接近，还是两者持平。',
    ],
    escalationSignals: [
      '普通彩盒与双插盒互相混淆。',
      '挂钩彩盒未被识别为 hanging_tab 变体。',
      '飞机盒被落到 folding_carton。',
    ],
    internalCompareReadyHint: '只要 second-phase 在首批样本上“更接近或至少不差于 phase-one”成为多数，就可进入内部对比观察。',
  },
  {
    metricId: 'term_coverage',
    displayName: '术语识别覆盖度',
    questionAnswered: 'second-phase 是否命中真实单据中影响成本判断的关键材质、坑型、印刷和后道术语。',
    perSampleSignals: [
      'recognizedTerms 命中的关键术语',
      'unknownTerms / unresolvedTerms 数量',
      '关键材料、坑型、工艺是否命中',
      '未识别术语是否影响核心成本判断',
    ],
    judgementRules: [
      '白卡 / 单铜 / 单白 / 银卡、WE/W9/A9/AF、4C/专色、覆膜、裱、啤、粘等命中越完整越好。',
      '若未识别术语不影响主类和核心成本，可判为 coverage acceptable。',
      '若关键术语落入 unresolved 并直接影响材料或后道理解，必须判为 blocking gap。',
    ],
    escalationSignals: [
      '坑型或特材代号未命中。',
      '高复杂工艺未被识别。',
      '窗口片相关术语没有进入 recognizedTerms。',
    ],
    internalCompareReadyHint: '内部观察前至少要让 second-phase 在首批样本上稳定命中材料、坑型、主要后道三大类关键术语。',
  },
  {
    metricId: 'line_item_alignment',
    displayName: '核心 line-item 对齐度',
    questionAnswered: 'second-phase 的 line-item 拆法是否更接近真实报价单里的成本构成。',
    perSampleSignals: [
      '真实样本 realCostItems 中出现的核心成本项',
      'second-phase lineItems 是否覆盖面纸、坑纸/芯纸、印刷费、刀模、啤机、粘盒等主项',
      '是否缺失窗口片、配内卡、贴双面胶等当前仍需 manual adjustment 的项',
    ],
    judgementRules: [
      '真实单据存在且 second-phase 也能表达的成本项，记为 aligned cost item。',
      '真实单据存在但 second-phase 只能放到 manual_adjustment，记为 partial aligned。',
      '真实单据存在而 second-phase 无法表达的，记为 missing cost item。',
    ],
    escalationSignals: [
      'quoted 候选样本缺少印刷费或刀模。',
      '裱坑样本缺少 corrugated_core 或 backing_or_duplex。',
      '真实样本明显有窗口片或插卡，但 second-phase 完全无对应占位。',
    ],
    internalCompareReadyHint: '如果 quoted 候选样本能稳定对齐到“材料 + 印刷 + 模切后道”主骨架，就具备进入内部比较的价值。',
  },
  {
    metricId: 'decision_boundary_alignment',
    displayName: '决策边界一致性',
    questionAnswered: 'quoted / estimated / handoff 的判断是否合理，且 second-phase 是否比 phase-one 更保守或更接近真实业务边界。',
    perSampleSignals: [
      'phase-one 状态',
      'second-phase 状态',
      '样本 expectedDecision',
      '当两者不一致时，谁更接近真实业务规则',
    ],
    judgementRules: [
      '高复杂工艺、窗口片、关键未知术语样本，只要 second-phase 更保守且更贴近业务规则，可记为 boundary win。',
      '简单首批样本若 second-phase 误降为 handoff，需要记为 false conservative。',
      'phase-one 若把高风险样本直接推到 quoted，而 second-phase 把它压回 estimated/handoff，可记为 second-phase 更合理。',
    ],
    escalationSignals: [
      '简单 quoted 候选被 second-phase 频繁误降级。',
      '高复杂工艺仍被 second-phase 放行到 quoted。',
      'phase-one 与 second-phase 同时对高风险样本过于乐观。',
    ],
    internalCompareReadyHint: '进入内部观察前，至少要确保 second-phase 在高风险样本上不比 phase-one 更激进。',
  },
  {
    metricId: 'price_deviation_proxy',
    displayName: '价格偏差代理指标',
    questionAnswered: '若真实样本有单价或金额，second-phase 的偏差大概落在哪个区间，以及偏差主要来自哪类样本。',
    perSampleSignals: [
      '真实 quotedUnitPrice / quotedAmount',
      'second-phase subtotal',
      'second-phase 是否仅做 subtotal 而未覆盖全部人工修正项',
    ],
    judgementRules: [
      '优先比较方向性：偏低、偏高、接近。',
      '若样本含明显 manual_adjustment 来源，仅做代理比较，不把绝对误差当作硬门槛。',
      '把偏差最大的样本按“窗口片 / 内卡 / 高复杂工艺 / 尺寸来源不清”分桶。',
    ],
    escalationSignals: [
      'quoted 候选样本持续大幅偏低。',
      '带 manual adjustment 的样本偏差无解释。',
      '同类普通飞机盒之间偏差波动过大。',
    ],
    internalCompareReadyHint: '价格代理指标主要用于发现最大偏差桶，不作为首批唯一准入条件。',
  },
] as const

export const SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT: readonly SecondPhaseGrayGateDraft[] = [
  {
    stage: 'internal_compare_observation',
    goal: '允许 second-phase 进入内部对比观察阶段，但仍不影响任何 live 对外结果。',
    requiredChecks: [
      {
        checkId: 'sample_coverage_minimum',
        rule: '首批真实评估集至少覆盖普通彩盒、双插盒/挂钩彩盒、普通飞机盒三类真实样本，每类至少 2 条，且包含 quoted、estimated、handoff 三种决策边界样本。',
        whyItMatters: '没有足够样本覆盖时，任何“更好”判断都容易被个别样本误导。',
      },
      {
        checkId: 'type_alignment_majority',
        rule: '在首批评估集上，second-phase 的主类归并需要在多数样本中达到“更接近或不差于 phase-one”。',
        whyItMatters: '主类归并是后续 line-item 和状态判断的前提。',
      },
      {
        checkId: 'critical_term_stability',
        rule: 'quoted 候选样本中，关键材料、坑型、印刷和主工艺术语必须稳定命中，且不能有影响核心成本的 blocking unresolved terms。',
        whyItMatters: '术语不稳时，后续价格和边界判断都不可信。',
      },
      {
        checkId: 'core_line_items_present',
        rule: 'quoted 候选样本至少要稳定覆盖 face_paper、printing、die_mold/die_cut_machine，以及 corrugated_core/backing_or_duplex 等真实主骨架。',
        whyItMatters: '对齐真实报价单拆法，是 second-phase 相对 phase-one 的关键价值。',
      },
      {
        checkId: 'no_aggressive_regression',
        rule: '对窗口片、高复杂工艺、关键未知术语样本，second-phase 不得比 phase-one 更激进；若出现分歧，优先允许 second-phase 更保守。',
        whyItMatters: '内部观察阶段首先要避免错误放行。',
      },
    ],
    stayShadowScenarios: [
      '关键未知术语仍影响材料或工艺理解。',
      '开窗、APET、窗口片、贴双面胶等 line-item 尚未稳定建模。',
      '配内卡、内托、组合件或 companion insert 仍依赖 manual adjustment。',
      '高复杂工艺叠加，如逆向UV、局部UV、激凸、半穿。',
      '天地盒、外箱、卡牌套装、扣底盒等不在首批范围内的结构。',
    ],
  },
  {
    stage: 'limited_product_role',
    goal: '允许 second-phase 在极小范围内承担更强产品角色，但仍不能直接全面替代 phase-one。',
    requiredChecks: [
      {
        checkId: 'family_specific_stability',
        rule: '准备灰度的具体子场景必须在其所属家族内连续通过真实样本对齐，且不存在已知高风险回退点。',
        whyItMatters: '灰度切换应该按场景逐步放行，而不是整族同时切换。',
      },
      {
        checkId: 'decision_boundary_clean_subset',
        rule: '候选灰度子场景需要满足核心材料配方完整、关键 line-item 可计算、未识别术语不影响核心成本、且 expectedDecision 与 second-phase 一致。',
        whyItMatters: '只有 clean subset 才适合承担更强角色。',
      },
      {
        checkId: 'price_proxy_explainable',
        rule: '若样本有真实单价或金额，偏差必须可解释，且不能持续集中在同一已放行子场景上。',
        whyItMatters: '即使不用复杂评分模型，也要知道偏差主要来自哪里。',
      },
      {
        checkId: 'manual_adjustment_not_core',
        rule: '候选灰度子场景不能把核心成本长期留在 manual_adjustment；manual_adjustment 只能保留少量非核心补项。',
        whyItMatters: '如果核心成本仍靠人工修正，second-phase 还不具备更强产品角色。',
      },
    ],
    stayShadowScenarios: [
      '窗口片或开窗相关结构。',
      '特材代号如 K636K 等仍未转为稳定材料模板。',
      '挂钩彩盒仍携带配内卡或其他 companion insert。',
      '任何需要依赖设计稿、刀线图、人工拆项理解的场景。',
      '真实样本数量仍不足以支撑子场景放行。',
    ],
  },
] as const

export const SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT: SecondPhaseCurrentReadinessAssessmentDraft = {
  currentStage: 'shadow_only',
  internalCompareObservationRecommended: true,
  strongerProductRoleRecommended: false,
  recommendationSummary: '当前 second-phase 已经适合进入“内部对比观察阶段”，但还不适合承担更强的产品角色。理由是首批主类、术语和核心拆项已经具备可比较基础，但真实对齐样本规模、窗口/内卡/manual adjustment 的边界还不够稳。',
  closestGrayCandidates: [
    '普通飞机盒：白卡/白板纸 + 4C + 覆膜 + 裱 + 啤 的 clean subset。',
    '普通彩盒：普通白卡/单铜 + 常规覆膜 + 啤 + 粘，且无窗口、无高复杂工艺的样本。',
    '双插盒：无窗口、无特材、无高复杂工艺、无 companion insert 的标准场景。',
  ],
  keyGaps: [
    '普通彩盒真实评估样本虽已纳入，但带完整金额映射的 line-item 证据仍少于飞机盒样本。',
    '挂钩彩盒与配内卡、窗口片之间的边界还依赖 manual adjustment，尚不能视作稳定 quoted 子场景。',
    '真实对齐还缺一个可重复运行的 runner，目前只是评估集和判定规则草案。',
    '价格偏差代理仍主要用于解释偏差来源，暂时不能作为灰度放行的强证据。',
  ],
  nextPriorityDirections: [
    '先做真实样本评估 runner，把 phase-one 与 second-phase 的对齐结果按样本输出为结构化结论。',
    '继续补普通彩盒和标准双插盒的真实拆项样本，尤其是面纸/印刷费/刀模/啤机/粘盒齐全的样本。',
  ],
}
