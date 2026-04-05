// Draft-only line-item structures for complex packaging second phase.
// This file is not imported by the live pricing engine.

export type SecondPhaseLineItemCodeDraft =
  | 'face_paper'
  | 'corrugated_core'
  | 'backing_or_duplex'
  | 'printing'
  | 'lamination'
  | 'die_mold'
  | 'die_cut_machine'
  | 'gluing'
  | 'special_process'
  | 'manual_adjustment'

export type SecondPhaseLineItemSupportLevelDraft = 'initial_scope' | 'deferred' | 'manual_only'

export type SecondPhaseLineItemCategoryDraft =
  | 'material'
  | 'printing'
  | 'process'
  | 'fixed_fee'
  | 'manual_adjustment'

export type SecondPhasePricingBasisTypeDraft =
  | 'ton_price'
  | 'sheet_count'
  | 'area_usage'
  | 'actual_units'
  | 'fixed_setup_fee'
  | 'fixed_tooling_fee'
  | 'fixed_plus_units'
  | 'manual_entry'

export type SecondPhaseDimensionRefDraft = 'finished_size' | 'unfolded_size' | 'sheet_cut_size' | 'not_applicable'

export type SecondPhaseEngineStepDraft =
  | 'normalize_raw_text'
  | 'merge_packaging_family'
  | 'resolve_dimensions'
  | 'expand_material_recipe'
  | 'expand_print_process'
  | 'resolve_pricing_basis'
  | 'build_material_line_items'
  | 'build_process_line_items'
  | 'sum_item_subtotals'
  | 'sum_order_totals'

export type SecondPhaseLineItemDraft = {
  id: string
  itemId: string
  lineCode: SecondPhaseLineItemCodeDraft
  displayName: string
  category: SecondPhaseLineItemCategoryDraft
  pricingBasisType: SecondPhasePricingBasisTypeDraft
  relatedLayer: 'material_recipe' | 'print_process' | 'production_pricing' | 'manual'
  dimensionRef: SecondPhaseDimensionRefDraft
  basisQuantity?: number
  spoilageQuantity?: number
  actualQuantity?: number
  sheetCount?: number
  areaSquareCm?: number
  tonPrice?: number
  unitRate?: number
  fixedFee?: number
  variableFee?: number
  subtotal?: number
  calculationSummary?: string
  rawEvidence: string[]
  confidence: 'high' | 'medium' | 'low'
  note?: string
}

export type SecondPhaseDecisionBoundaryDraft = {
  quotedWhen: string[]
  estimatedWhen: string[]
  handoffWhen: string[]
}

export const SECOND_PHASE_LINE_ITEM_TEMPLATES_DRAFT: ReadonlyArray<{
  lineCode: SecondPhaseLineItemCodeDraft
  displayName: string
  category: SecondPhaseLineItemCategoryDraft
  pricingBasis: readonly SecondPhasePricingBasisTypeDraft[]
  supportLevel: SecondPhaseLineItemSupportLevelDraft
}> = [
  {
    lineCode: 'face_paper',
    displayName: '面纸',
    category: 'material',
    pricingBasis: ['ton_price', 'sheet_count'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'corrugated_core',
    displayName: '坑纸/芯纸',
    category: 'material',
    pricingBasis: ['ton_price', 'sheet_count'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'backing_or_duplex',
    displayName: '裱坑/纸或对裱层',
    category: 'material',
    pricingBasis: ['sheet_count', 'fixed_plus_units'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'printing',
    displayName: '印刷费',
    category: 'printing',
    pricingBasis: ['sheet_count', 'fixed_plus_units', 'fixed_setup_fee'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'lamination',
    displayName: '覆膜/过胶',
    category: 'process',
    pricingBasis: ['area_usage', 'sheet_count'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'die_mold',
    displayName: '刀模',
    category: 'fixed_fee',
    pricingBasis: ['fixed_tooling_fee'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'die_cut_machine',
    displayName: '啤机',
    category: 'process',
    pricingBasis: ['actual_units', 'sheet_count'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'gluing',
    displayName: '粘盒',
    category: 'process',
    pricingBasis: ['actual_units'],
    supportLevel: 'initial_scope',
  },
  {
    lineCode: 'special_process',
    displayName: '特殊工艺附加项',
    category: 'process',
    pricingBasis: ['fixed_plus_units', 'manual_entry'],
    supportLevel: 'manual_only',
  },
  {
    lineCode: 'manual_adjustment',
    displayName: '人工修正项',
    category: 'manual_adjustment',
    pricingBasis: ['manual_entry'],
    supportLevel: 'manual_only',
  },
] as const

export const SECOND_PHASE_DEFERRED_LINE_ITEM_CODES_DRAFT = [
  'window_film',
  'splicing',
  'double_tape',
] as const

export const SECOND_PHASE_ENGINE_SEQUENCE_DRAFT: readonly SecondPhaseEngineStepDraft[] = [
  'normalize_raw_text',
  'merge_packaging_family',
  'resolve_dimensions',
  'expand_material_recipe',
  'expand_print_process',
  'resolve_pricing_basis',
  'build_material_line_items',
  'build_process_line_items',
  'sum_item_subtotals',
  'sum_order_totals',
] as const

export const SECOND_PHASE_DECISION_BOUNDARY_DRAFT: SecondPhaseDecisionBoundaryDraft = {
  quotedWhen: [
    '主类可稳定归并',
    '核心材料配方完整',
    '关键 line-item 可完整计算',
    '未识别术语不影响成本判断',
  ],
  estimatedWhen: [
    '主类已识别但存在少量非关键术语未识别',
    '部分 line-item 使用保守模板',
    '展开或开料尺寸缺失但仍可保守估算',
    '存在特殊工艺但仍可用模板预估',
    '费率模板不完整，不能稳定进入 quoted',
  ],
  handoffWhen: [
    '结构无法归并',
    '核心材料配方不完整',
    '关键 line-item 无法计算',
    '未知坑型、芯材、关键材料层、特殊膜材、窗口片材质、高复杂工艺、结构关键词影响成本判断',
    '多结构组合件无法稳定拆项',
    '依赖设计文件、刀线图或高度复杂工艺',
  ],
}