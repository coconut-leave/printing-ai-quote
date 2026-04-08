import type { SampleFileCategory, SampleFileMetadata } from '@/lib/sampleFiles'

export type ComplexPackagingProductType =
  | 'mailer_box'
  | 'tuck_end_box'
  | 'window_box'
  | 'leaflet_insert'
  | 'box_insert'
  | 'seal_sticker'
  | 'foil_bag'
  | 'carton_packaging'

export type ComplexPackagingPricingModel = 'legacy_multiplier' | 'workbook_line_item'

export type ComplexPackagingTemplateId =
  | 'legacy_fallback'
  | 'tuck_end_box_template'
  | 'mailer_box_template'
  | 'window_box_template'
  | 'leaflet_insert_template'
  | 'box_insert_template'
  | 'seal_sticker_template'
  | 'foil_bag_template'
  | 'carton_packaging_template'

export type ComplexPackagingLineItemType =
  | 'ton_price_material'
  | 'area_based_material'
  | 'fixed_fee'
  | 'quantity_based_process'
  | 'subtotal'
  | 'quote_markup'
  | 'tax_markup'

export type ComplexPackagingFormulaTemplateId =
  | 'ton_price_material'
  | 'area_based_material'
  | 'fixed_fee'
  | 'quantity_based_process'
  | 'line_unit_price'
  | 'subtotal'
  | 'quote_markup'
  | 'tax_markup'

export type ComplexPackagingLineItemCode =
  | 'face_paper'
  | 'main_paper'
  | 'outer_liner_material'
  | 'inner_liner_material'
  | 'leaflet_paper'
  | 'leaflet_printing'
  | 'leaflet_folding'
  | 'leaflet_die_cut'
  | 'leaflet_setup'
  | 'core_reinforcement'
  | 'lamination'
  | 'mounting'
  | 'printing_fee'
  | 'die_mold'
  | 'die_cut_machine'
  | 'gluing'
  | 'forming'
  | 'special_process'
  | 'shipping'
  | 'outer_carton'
  | 'window_film'
  | 'window_process'
  | 'insert_material'
  | 'insert_printing'
  | 'insert_die_mold'
  | 'insert_forming'
  | 'insert_gluing'
  | 'sticker_material'
  | 'sticker_printing'
  | 'sticker_die_cut'
  | 'sticker_plate'
  | 'sticker_processing'
  | 'foil_bag_material'
  | 'foil_bag_printing'
  | 'foil_bag_forming'
  | 'foil_bag_setup'
  | 'carton_printing'
  | 'carton_die_mold'
  | 'carton_forming'
  | 'carton_packaging_fee'

export type ComplexPackagingPriceLineItem = {
  code: ComplexPackagingLineItemCode
  displayName: string
  lineItemType: Extract<ComplexPackagingLineItemType, 'ton_price_material' | 'area_based_material' | 'fixed_fee' | 'quantity_based_process'>
  formulaTemplateId: Extract<ComplexPackagingFormulaTemplateId, 'ton_price_material' | 'area_based_material' | 'fixed_fee' | 'quantity_based_process'>
  amount: number
  unitPrice: number
  formulaUnitPrice?: number
  actualQuantity: number
  chargeQuantity: number
  spoilageQuantity: number
  basisWeight?: number
  basisFactor?: number
  flatLength?: number
  flatWidth?: number
  tonPrice?: number
  areaUnitPrice?: number
  fixedAmount?: number
  notes: string[]
  requiredForQuoted: boolean
}

export type SizeUnit = 'mm' | 'cm'

export type ComplexPackagingItem = {
  productType: ComplexPackagingProductType
  title?: string
  sourceText?: string
  quantity?: number
  material?: string
  weight?: number
  outerMaterial?: string
  outerWeight?: number
  innerMaterial?: string
  innerWeight?: number
  coreMaterialCode?: string
  coreMaterialWeight?: number
  printColor?: string
  surfaceFinish?: string
  processes?: string[]
  notes?: string[]
  boxStyle?: string
  length?: number
  width?: number
  height?: number
  sizeUnit?: SizeUnit
  flatLength?: number
  flatWidth?: number
  actualQuantity?: number
  chargeQuantity?: number
  spoilageQuantity?: number
  mounting?: boolean
  dieCut?: boolean
  gluing?: boolean
  laminationType?: 'none' | 'matte' | 'glossy'
  spotColorCount?: number
  pantoneCodes?: string[]
  hasWindow?: boolean
  windowFilmThickness?: number
  windowSizeLength?: number
  windowSizeWidth?: number
  paperType?: string
  paperWeight?: number
  printSides?: string
  foldType?: string
  foldCount?: number
  insertType?: string
  insertMaterial?: string
  insertLength?: number
  insertWidth?: number
  stickerType?: string
  stickerMaterial?: string
  stickerLength?: number
  stickerWidth?: number
}

export type ComplexPackagingRequest = {
  isBundle: boolean
  mainItem: ComplexPackagingItem
  subItems: ComplexPackagingItem[]
  allItems: ComplexPackagingItem[]
  hasReferenceFile: boolean
  referenceFileCategory?: SampleFileCategory
  referenceFiles: SampleFileMetadata[]
  requiresHumanReview: boolean
  notes: string[]
}

export type ComplexPackagingConversationAction =
  | 'new_request'
  | 'supplement_params'
  | 'modify_existing_item'
  | 'add_sub_item'
  | 'remove_sub_item'
  | 'view_existing_quote'

export type ComplexPackagingTurnResolution = {
  request: ComplexPackagingRequest | null
  action: ComplexPackagingConversationAction | null
  targetItemType?: ComplexPackagingProductType
  targetItemTitle?: string
}

export type ComplexPackagingMissingDetail = {
  itemIndex: number
  itemLabel: string
  productType: ComplexPackagingProductType
  fields: string[]
}

export type ComplexPackagingRouteStatus = 'quoted' | 'estimated' | 'handoff_required' | 'missing_fields'

export type PricingTrialGateStatus = 'allowed_quoted_in_trial' | 'estimated_only_in_trial' | 'handoff_only_in_trial'

export type PricingTrialBundleGateStatus = 'standard_quoted_bundle_in_trial' | 'estimated_only_bundle_in_trial' | 'handoff_only_bundle_in_trial'

export type ComplexPackagingDecision = {
  status: ComplexPackagingRouteStatus
  reason: string
  reasonText?: string
  trialGateStatus?: PricingTrialGateStatus
  trialBundleGateStatus?: PricingTrialBundleGateStatus
  missingDetails: ComplexPackagingMissingDetail[]
  missingFields: string[]
}

export type ComplexPackagingReviewReasonCode =
  | 'low_quantity_box'
  | 'high_spot_color_count'
  | 'thick_window_film'
  | 'large_window_ratio'
  | 'high_weight_specialty_board'
  | 'nonstandard_process_combo'

export type ComplexPackagingReviewReason = {
  code: ComplexPackagingReviewReasonCode
  label: string
  message: string
  severity: 'info' | 'warning'
  itemType?: ComplexPackagingProductType
  itemTitle?: string
}

export type ComplexPackagingLineQuote = {
  itemType: ComplexPackagingProductType
  title: string
  pricingModel: ComplexPackagingPricingModel
  templateId?: ComplexPackagingTemplateId
  normalizedParams: ComplexPackagingItem
  quantity: number
  actualQuantity: number
  chargeQuantity: number
  unitPrice: number
  totalPrice: number
  costSubtotal: number
  quotedAmount: number
  quoteMarkup: number
  taxMultiplier: number
  setupCost: number
  runCost: number
  materialUnitCost: number
  printUnitCost: number
  processUnitCost: number
  lineItems: ComplexPackagingPriceLineItem[]
  status?: Exclude<ComplexPackagingRouteStatus, 'missing_fields'>
  statusReasons?: string[]
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
  notes: string[]
}

export type ComplexPackagingQuoteResult = {
  normalizedParams: Record<string, any>
  unitPrice: number
  totalUnitPrice: number
  costSubtotal: number
  quotedAmount: number
  quoteMarkup: number
  taxMultiplier: number
  totalPrice: number
  shippingFee: number
  tax: number
  finalPrice: number
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
  notes: string[]
  mainItem: ComplexPackagingLineQuote
  subItems: ComplexPackagingLineQuote[]
  items: ComplexPackagingLineQuote[]
  isBundle: boolean
  requiresHumanReview: boolean
  referenceFiles: SampleFileMetadata[]
}

export type ComplexPackagingConversationSnapshot = {
  messages?: Array<{
    sender?: string
    metadata?: any
  }>
  quotes?: Array<{
    parameters?: any
  }>
}