import type { SampleFileCategory, SampleFileMetadata } from '@/lib/sampleFiles'

export type ComplexPackagingProductType =
  | 'mailer_box'
  | 'tuck_end_box'
  | 'window_box'
  | 'leaflet_insert'
  | 'box_insert'
  | 'seal_sticker'

export type SizeUnit = 'mm' | 'cm'

export type ComplexPackagingItem = {
  productType: ComplexPackagingProductType
  title?: string
  quantity?: number
  material?: string
  weight?: number
  printColor?: string
  surfaceFinish?: string
  processes?: string[]
  notes?: string[]
  boxStyle?: string
  length?: number
  width?: number
  height?: number
  sizeUnit?: SizeUnit
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

export type ComplexPackagingDecision = {
  status: ComplexPackagingRouteStatus
  reason: string
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
  normalizedParams: ComplexPackagingItem
  quantity: number
  unitPrice: number
  totalPrice: number
  setupCost: number
  runCost: number
  materialUnitCost: number
  printUnitCost: number
  processUnitCost: number
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
  notes: string[]
}

export type ComplexPackagingQuoteResult = {
  normalizedParams: Record<string, any>
  unitPrice: number
  totalUnitPrice: number
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