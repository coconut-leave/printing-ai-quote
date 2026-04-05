// Draft-only types for complex packaging second phase.
// These definitions are intentionally not wired into the live phase-one runtime path.

export type SecondPhasePackagingFamilyDraft =
  | 'folding_carton'
  | 'mailer_box'
  | 'tuck_end_box'
  | 'window_box'
  | 'leaflet'
  | 'insert'
  | 'outer_carton'
  | 'rigid_box'
  | 'card_set_or_kit'

export type SecondPhasePackagingTypeDraft =
  | 'mailer_box'
  | 'tuck_end_box'
  | 'leaflet_insert'
  | 'box_insert'
  | 'seal_sticker'
  | 'folding_carton'
  | 'window_box'
  | 'auto_lock_bottom_box'
  | 'lid_base_box'
  | 'outer_carton'
  | 'card_set_or_kit'

export type SecondPhaseVariantTagDraft =
  | 'large_box'
  | 'screen_style'
  | 'hanging_tab'
  | 'suitcase_handle'
  | 'plain_carton'
  | 'with_insert'
  | 'with_leaflet'
  | 'with_window_film'
  | 'blank_box'
  | 'kit_component'

export type SecondPhaseSizeUnitDraft = 'mm' | 'cm'

export type SecondPhaseConfidenceDraft = 'high' | 'medium' | 'low'

export type SecondPhaseSourceDraft = 'user_input' | 'quote_sheet' | 'settlement_sheet' | 'manual_fill' | 'derived'

export type SecondPhaseBundleRoleDraft =
  | 'main_item'
  | 'insert'
  | 'leaflet'
  | 'outer_carton'
  | 'accessory'
  | 'kit_component'

export type SecondPhaseFacePaperMaterialDraft =
  | 'white_card'
  | 'single_coated'
  | 'single_white_board'
  | 'silver_card'
  | 'cotton_paper'
  | 'duplex_board'
  | 'kraft'
  | 'other'

export type SecondPhaseCorrugationDraft = 'WE' | 'W9' | 'A9' | 'AF' | 'other'
  | 'AE'
  | 'E'

export type SecondPhaseMountingModeDraft = 'none' | 'corrugated_mounting' | 'duplex_mounting' | 'pre_mounted' | 'other'

export type SecondPhasePrintModeDraft =
  | 'none'
  | 'black'
  | 'four_color'
  | 'double_four_color'
  | 'spot_only'
  | 'four_color_plus_spot'
  | 'other'

export type SecondPhasePrintSidesDraft = 'single' | 'double' | 'unknown'

export type SecondPhaseLaminationDraft = 'none' | 'gloss' | 'matte' | 'soft_touch' | 'other'

export type SecondPhaseUvModeDraft = 'uv' | 'reverse_uv' | 'spot_uv'

export type SecondPhaseEmbossingModeDraft = 'emboss' | 'deboss' | 'texture'

export type SecondPhaseDecisionStatusDraft = 'quoted' | 'estimated' | 'handoff_required'

export type SecondPhaseUnknownTermSeverityDraft = 'non_blocking' | 'blocking'

export type SecondPhaseApplicabilityDraft = 'in_scope' | 'deferred_type' | 'flat_print' | 'out_of_scope' | 'not_packaging'

export type SecondPhaseShadowDecisionReasonCodeDraft =
  | 'folding_carton_in_scope'
  | 'mailer_box_in_scope'
  | 'tuck_end_box_in_scope'
  | 'reinforced_folding_carton_boundary'
  | 'reinforced_mailer_box_boundary'
  | 'deferred_packaging_type'
  | 'flat_print_redirect'
  | 'unknown_blocking_term'
  | 'unsupported_window_feature'
  | 'unsupported_material_code'
  | 'high_complexity_process'
  | 'core_material_incomplete'
  | 'line_item_template_incomplete'
  | 'line_item_calculation_incomplete'
  | 'phase_one_shadow_only'

export type SecondPhaseQuotedRequirementCheckDraft = {
  packagingTypeResolved: boolean
  coreMaterialRecipeComplete: boolean
  keyLineItemsComputable: boolean
  unresolvedTermsSafe: boolean
}

export type SecondPhaseFinishedGoodsLayerDraft = {
  packagingFamily: SecondPhasePackagingFamilyDraft
  packagingType: SecondPhasePackagingTypeDraft
  variantTags: SecondPhaseVariantTagDraft[]
  productName?: string
  customerAlias?: string
  finishedLength?: number
  finishedWidth?: number
  finishedHeight?: number
  sizeUnit?: SecondPhaseSizeUnitDraft
  orderQuantity?: number
  unit?: string
  bundleRole?: SecondPhaseBundleRoleDraft
  customerNote?: string
}

export type SecondPhaseProductionDimensionsLayerDraft = {
  finishedSpecRaw?: string
  unfoldedLength?: number
  unfoldedWidth?: number
  sheetCutLength?: number
  sheetCutWidth?: number
  sheetSpecRaw?: string
  expandSpecRaw?: string
  productionSizeSource?: SecondPhaseSourceDraft
  dimensionConfidence?: SecondPhaseConfidenceDraft
}

export type SecondPhaseMaterialRecipeLayerDraft = {
  materialProcessRaw?: string
  facePaperMaterial?: SecondPhaseFacePaperMaterialDraft
  facePaperMaterialRaw?: string
  facePaperWeight?: number
  corrugationType?: SecondPhaseCorrugationDraft
  corrugationRaw?: string
  reinforcementMaterial?: string
  reinforcementWeight?: number
  backingMaterial?: string
  backingMaterialRaw?: string
  backingWeight?: number
  mountingMode?: SecondPhaseMountingModeDraft
  hasCorrugatedMounting?: boolean
  hasDuplexMounting?: boolean
  windowFilmMaterial?: string
  windowFilmMaterialRaw?: string
  windowFilmThickness?: number
  insertMaterial?: string
  specialMaterialCodes?: string[]
  rawMaterialTerms: string[]
}

export type SecondPhasePrintProcessLayerDraft = {
  frontPrintMode?: SecondPhasePrintModeDraft
  frontPrintModeRaw?: string
  backPrintMode?: SecondPhasePrintModeDraft
  backPrintModeRaw?: string
  fourColorCount?: number
  spotColorCount?: number
  blackInkIncluded?: boolean
  pantoneCodes?: string[]
  printSides?: SecondPhasePrintSidesDraft
  laminationType?: SecondPhaseLaminationDraft
  laminationRaw?: string
  laminationSideCount?: number
  uvModes?: SecondPhaseUvModeDraft[]
  embossingModes?: SecondPhaseEmbossingModeDraft[]
  dieCutRequired?: boolean
  gluingRequired?: boolean
  halfCutRequired?: boolean
  splicingRequired?: boolean
  doubleTapeRequired?: boolean
  windowFilmRequired?: boolean
  processTags: string[]
  processRawTerms: string[]
}

export type SecondPhaseProductionPricingLayerDraft = {
  orderQuantity?: number
  basisQuantity?: number
  spoilageQuantity?: number
  actualProductionQuantity?: number
  tonPrice?: number
  sheetCount?: number
  fixedSetupFee?: number
  printFee?: number
  dieMoldFee?: number
  dieCutMachineFee?: number
  gluingFee?: number
  mountingFee?: number
  filmFee?: number
  tapeFee?: number
  specialProcessFee?: number
  itemSubtotal?: number
  pricingLineRefs: string[]
}

export type SecondPhaseRawEvidenceLayerDraft = {
  rawProductName?: string
  rawSpecText?: string
  rawMaterialProcessText?: string
  rawRemarkText?: string
  recognizedTerms: string[]
  unresolvedTerms: string[]
  sourceWorkbook?: string
  sourceSheet?: string
  sourceRowHint?: string
  parseWarnings: string[]
}

export type SecondPhaseUnknownTermDraft = {
  term: string
  severity: SecondPhaseUnknownTermSeverityDraft
  reason: string
}

export type SecondPhaseRecognizedTermDraft = {
  term: string
  category:
    | 'material'
    | 'corrugation'
    | 'material_code'
    | 'print'
    | 'spot_color'
    | 'lamination'
    | 'uv'
    | 'embossing'
    | 'process'
    | 'window'
    | 'structure'
}

export type SecondPhaseComplexPackagingItemDraft = {
  id: string
  finishedGoods: SecondPhaseFinishedGoodsLayerDraft
  productionDimensions: SecondPhaseProductionDimensionsLayerDraft
  materialRecipe: SecondPhaseMaterialRecipeLayerDraft
  printProcess: SecondPhasePrintProcessLayerDraft
  productionPricing: SecondPhaseProductionPricingLayerDraft
  rawEvidence: SecondPhaseRawEvidenceLayerDraft
  recognizedTerms: SecondPhaseRecognizedTermDraft[]
  unknownTerms: SecondPhaseUnknownTermDraft[]
  lineItemIds: string[]
}

export type SecondPhasePhaseOneDiffSummaryDraft = {
  familyMergeAligned: boolean
  packagingTypeAligned: boolean
  statusAligned: boolean
  phaseOnePackagingFamily?: SecondPhasePackagingFamilyDraft
  secondPhasePackagingFamily?: SecondPhasePackagingFamilyDraft
  phaseOneProductType?: string
  secondPhasePackagingType?: SecondPhasePackagingTypeDraft
  phaseOneStatus?: string
  secondPhaseStatus?: SecondPhaseDecisionStatusDraft
  manualAdjustmentPresent: boolean
  enteredDeferredOrHandoff: boolean
  keyUnresolvedTerms: string[]
}

export type SecondPhaseShadowPayloadDraft = {
  schemaVersion: 'second_phase_v1_draft'
  applicable: SecondPhaseApplicabilityDraft
  inInitialScope: boolean
  deferred: boolean
  packagingFamily?: SecondPhasePackagingFamilyDraft
  packagingType?: SecondPhasePackagingTypeDraft
  variantTags: SecondPhaseVariantTagDraft[]
  shadowStatus: SecondPhaseDecisionStatusDraft
  statusReasons: SecondPhaseShadowDecisionReasonCodeDraft[]
  quotedChecks: SecondPhaseQuotedRequirementCheckDraft
  unresolvedTerms: string[]
  blockingUnknownTerms: string[]
  nonBlockingUnknownTerms: string[]
  lineItems?: Array<{
    id: string
    lineCode: string
    displayName: string
    subtotal?: number
  }>
  subtotal?: number
  parseWarnings: string[]
  usedForResponse: false
  diffSummary: SecondPhasePhaseOneDiffSummaryDraft
}

export type SecondPhaseComplexPackagingRequestDraft = {
  requestId: string
  source: SecondPhaseSourceDraft
  isBundle: boolean
  items: SecondPhaseComplexPackagingItemDraft[]
  customerMessageRaw?: string
  unresolvedTerms: string[]
  parseWarnings: string[]
  recommendedStatus: SecondPhaseDecisionStatusDraft
  statusReasons: SecondPhaseShadowDecisionReasonCodeDraft[]
  quotedChecks: SecondPhaseQuotedRequirementCheckDraft
  shadowPayload?: SecondPhaseShadowPayloadDraft
}

export const SECOND_PHASE_INITIAL_SCOPE_DRAFT: readonly SecondPhasePackagingTypeDraft[] = [
  'folding_carton',
  'tuck_end_box',
  'mailer_box',
] as const

export const SECOND_PHASE_DEFERRED_PACKAGING_TYPES_DRAFT: readonly SecondPhasePackagingTypeDraft[] = [
  'window_box',
  'auto_lock_bottom_box',
  'lid_base_box',
  'outer_carton',
  'card_set_or_kit',
] as const

export const SECOND_PHASE_FLAT_PRINT_REDIRECT_TYPES_DRAFT: readonly SecondPhasePackagingTypeDraft[] = [
  'leaflet_insert',
  'seal_sticker',
] as const

export const SECOND_PHASE_INITIAL_SCOPE_FAMILIES_DRAFT: readonly SecondPhasePackagingFamilyDraft[] = [
  'folding_carton',
  'mailer_box',
  'tuck_end_box',
] as const

export const SECOND_PHASE_BLOCKING_UNKNOWN_TERM_HINTS_DRAFT = [
  '坑',
  '芯',
  '膜',
  '窗口片',
  '胶片',
  '结构',
  '瓦楞',
  '特殊工艺',
  'uv',
  '逆向uv',
  '局部uv',
  '激凸',
] as const

export const SECOND_PHASE_REQUIRED_CONFIRMATIONS_DRAFT = [
  '首批范围只做普通彩盒、双插盒、挂钩彩盒、普通飞机盒',
  '接受 folding_carton 作为过渡主族',
  '未知坑型、芯材、关键材料层、特殊膜材、窗口片材质、高复杂工艺、结构关键词触发 handoff_required',
  'second-phase 首批以 shadow 模式并行接入，且只挂 metadata / debug payload',
  '费率来源首批走规则模板 + 人工可修正',
  '延期结构包括天地盒、外箱、卡牌套装、灰板结构，扣底盒进入第二批候选',
  '彩卡先归平面件体系，不进入折叠盒首批',
  '原始保真字段允许长期存库',
] as const