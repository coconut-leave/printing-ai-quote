import {
  decideComplexPackagingQuotePath,
  extractComplexPackagingQuoteRequest,
} from '@/server/packaging/extractComplexPackagingQuote'
import { calculateBundleQuote } from './complexPackagingQuote'
import { classifyWorkbookPricingToleranceBand, type WorkbookPricingToleranceBand } from './workbookPricingTolerance'

const CLOSE_GAP_RATIO = 0.03

const round2 = (value: number) => Math.round(value * 100) / 100
const round4 = (value: number) => Math.round(value * 10000) / 10000

export type WorkbookOrderGapDirection = 'higher' | 'lower' | 'close'

export type WorkbookOrderBoundaryStatus = 'quoted' | 'estimated' | 'handoff_required' | 'missing_fields'

export type WorkbookOrderAlignmentSampleDraft = {
  sample_id: string
  workbook_name: string
  sheet_name: string
  sample_description: string
  raw_message: string
  main_item_subtotal_expected: number
  accessory_subtotal_expected: number
  order_subtotal_expected: number
  shipping_expected: number
  tax_expected: number
  main_gap_source_hint: string
  accessory_gap_source_hint: string
  status_note: string
}

export type WorkbookOrderAlignmentEntry = {
  sample_id: string
  workbook_name: string
  sheet_name: string
  sample_description: string
  main_item_subtotal_expected: number
  main_item_subtotal_actual: number
  accessory_subtotal_expected: number
  accessory_subtotal_actual: number
  order_subtotal_expected: number
  order_subtotal_actual: number
  markup_expected: number
  markup_actual: number
  shipping_expected: number
  shipping_actual: number
  tax_expected: number
  tax_actual: number
  final_expected: number
  final_actual: number
  gap_amount: number
  gap_ratio: number
  gap_direction: WorkbookOrderGapDirection
  tolerance_band: WorkbookPricingToleranceBand
  main_gap_source: string
  boundary_status: WorkbookOrderBoundaryStatus
  status_note: string
}

export const WORKBOOK_ORDER_ALIGNMENT_FIELDS: Array<keyof WorkbookOrderAlignmentEntry> = [
  'sample_id',
  'workbook_name',
  'sheet_name',
  'sample_description',
  'main_item_subtotal_expected',
  'main_item_subtotal_actual',
  'accessory_subtotal_expected',
  'accessory_subtotal_actual',
  'order_subtotal_expected',
  'order_subtotal_actual',
  'markup_expected',
  'markup_actual',
  'shipping_expected',
  'shipping_actual',
  'tax_expected',
  'tax_actual',
  'final_expected',
  'final_actual',
  'gap_amount',
  'gap_ratio',
  'gap_direction',
  'tolerance_band',
  'main_gap_source',
  'boundary_status',
  'status_note',
]

export const WORKBOOK_ORDER_ALIGNMENT_SAMPLES: WorkbookOrderAlignmentSampleDraft[] = [
  {
    sample_id: 'order_tuck_end_plus_leaflet',
    workbook_name: 'composite: image_quote_archive_2026-04-05 + 1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026-04-05-tuck-end-bundle-quote + 2026.3,.31旺旺耐心点',
    sample_description: '双插盒主件 + 标准说明书的 workbook-grounded 整单复盘。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 1000,
    order_subtotal_expected: 3750,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'leaflet_setup_fee',
    status_note: 'order-level 代表样本，用来验证 leaflet setup fee 是否会在 bundle 里重新放大。',
  },
  {
    sample_id: 'order_tuck_end_plus_generic_leaflet',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + generic_leaflet_runtime_candidate',
    sheet_name: 'trial-generic-leaflet-bundle-quoted',
    sample_description: '标准双插盒主件 + 高频 generic 说明书的受控 estimated bundle 对齐样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：220x170mm，80g双胶纸，单面印，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 348.41,
    order_subtotal_expected: 3098.41,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'generic_leaflet_fixed_fee_cluster',
    status_note: '这条受控样本只用于验证标准双插盒 + 高频 generic 说明书保持 estimated 时，不会打坏当前 order-level subtotal / markup / shipping / tax 口径。',
  },
  {
    sample_id: 'order_tuck_end_plus_insert',
    workbook_name: 'composite: image_quote_archive_2026-04-05 + 1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026-04-05-tuck-end-bundle-quote + 2026.3,.31旺旺耐心点',
    sample_description: '标准双插盒主件 + 高频默认克重 proxy 内托的 workbook-grounded quoted bundle 复盘。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 1600,
    order_subtotal_expected: 4350,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'insert_weight_assumption',
    status_note: '这条 workbook-grounded 样本用于验证标准双插盒 + 高频默认克重 proxy 内托升级后，order-level subtotal / markup / shipping / tax 口径仍保持稳定。',
  },
  {
    sample_id: 'order_tuck_end_plus_standard_insert',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + standard_box_insert_candidate',
    sheet_name: 'trial-standard-bundle-insert-quoted',
    sample_description: '标准双插盒主件 + 显式克重标准内托的受控 quoted bundle acceptance 样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 2025.61,
    order_subtotal_expected: 4775.61,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'standard_box_insert_runtime_candidate',
    status_note: '这条受控 acceptance 样本只用于验证标准双插盒 + 标准内托 quoted bundle 不会打坏当前 order-level subtotal / markup / shipping / tax 口径。',
  },
  {
    sample_id: 'order_mailer_plus_standard_insert',
    workbook_name: 'controlled_acceptance: validated_mailer_anchor + standard_box_insert_candidate',
    sheet_name: 'trial-mailer-standard-insert-quoted',
    sample_description: '已验证飞机盒主件 + 显式克重标准内托的第一步扩张 quoted bundle acceptance 样本。',
    raw_message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000',
    main_item_subtotal_expected: 3221.56,
    accessory_subtotal_expected: 2025.61,
    order_subtotal_expected: 5247.17,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'validated_mailer_main_path',
    accessory_gap_source_hint: 'standard_box_insert_runtime_candidate',
    status_note: '这条受控 acceptance 样本只用于验证已验证飞机盒 + 标准内托进入 quoted 后，不会打坏当前 order-level subtotal / markup / shipping / tax 口径。',
  },
  {
    sample_id: 'order_mailer_plus_proxy_insert',
    workbook_name: 'controlled_acceptance: validated_mailer_anchor + proxy_box_insert_candidate',
    sheet_name: 'trial-mailer-proxy-insert-quoted',
    sample_description: '已验证飞机盒主件 + 高频 proxy 内托的第一步扩张 quoted bundle acceptance 样本。',
    raw_message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；内托：20*12CM左右，WEB特种纸板，5000',
    main_item_subtotal_expected: 3221.56,
    accessory_subtotal_expected: 1598.76,
    order_subtotal_expected: 4820.32,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'validated_mailer_main_path',
    accessory_gap_source_hint: 'proxy_box_insert_runtime_candidate',
    status_note: '这条受控 acceptance 样本只用于验证已验证飞机盒 + 高频 proxy 内托进入 quoted 后，不会打坏当前 order-level subtotal / markup / shipping / tax 口径。',
  },
  {
    sample_id: 'order_window_plus_standard_insert',
    workbook_name: 'controlled_boundary: window_gloss_anchor + standard_box_insert_candidate',
    sheet_name: 'trial-window-standard-insert-estimated',
    sample_description: '标准开窗主件 + 显式克重标准内托的保守 estimated-only 边界样本。',
    raw_message: '开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，500',
    main_item_subtotal_expected: 2511.75,
    accessory_subtotal_expected: 482.92,
    order_subtotal_expected: 2994.67,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'window_gloss_main_path',
    accessory_gap_source_hint: 'standard_box_insert_runtime_candidate',
    status_note: '这条保守 boundary 样本用于锁住 window_box + 标准内托在第一步扩张后仍继续 estimated，不误升 quoted。',
  },
  {
    sample_id: 'order_window_plus_proxy_insert',
    workbook_name: 'controlled_boundary: window_gloss_anchor + proxy_box_insert_candidate',
    sheet_name: 'trial-window-proxy-insert-estimated',
    sample_description: '标准开窗主件 + 高频 proxy 内托的保守 estimated-only 边界样本。',
    raw_message: '开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500；内托：20*12CM左右，WEB特种纸板，500',
    main_item_subtotal_expected: 2511.75,
    accessory_subtotal_expected: 303.34,
    order_subtotal_expected: 2815.09,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'window_gloss_main_path',
    accessory_gap_source_hint: 'proxy_box_insert_runtime_candidate',
    status_note: '这条保守 boundary 样本用于锁住 window_box + 高频 proxy 内托在第一步扩张后仍继续 estimated，不误升 quoted。',
  },
  {
    sample_id: 'order_tuck_end_plus_leaflet_sticker',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + standard_leaflet + standard_sticker',
    sheet_name: 'trial-standard-bundle-leaflet-sticker-quoted',
    sample_description: '标准双插盒主件 + 标准说明书 + 标准贴纸的受控 quoted bundle acceptance 样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 1150,
    order_subtotal_expected: 3900,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'leaflet_sticker_fixed_fee_cluster',
    status_note: '这条受控 acceptance 样本只用于验证标准双插盒 + 标准说明书 + 标准贴纸 quoted bundle 不会打坏当前 order-level subtotal / markup / shipping / tax 口径。',
  },
  {
    sample_id: 'order_tuck_end_plus_standard_insert_leaflet',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + standard_box_insert_candidate + standard_leaflet',
    sheet_name: 'trial-standard-insert-leaflet-quoted',
    sample_description: '标准双插盒主件 + 标准内托 + 标准说明书的多配件 quoted acceptance 样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 3025.61,
    order_subtotal_expected: 5775.61,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'standard_insert_leaflet_cluster',
    status_note: '这条受控 acceptance 样本用于验证标准双插盒 + 标准内托 + 标准说明书进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_tuck_end_plus_standard_insert_sticker',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + standard_box_insert_candidate + standard_sticker',
    sheet_name: 'trial-standard-insert-sticker-quoted',
    sample_description: '标准双插盒主件 + 标准内托 + 标准贴纸的多配件 quoted acceptance 样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 2175.61,
    order_subtotal_expected: 4925.61,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'standard_insert_sticker_cluster',
    status_note: '这条受控 acceptance 样本用于验证标准双插盒 + 标准内托 + 标准贴纸进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_tuck_end_plus_leaflet_carton',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + standard_leaflet + simple_carton',
    sheet_name: 'trial-leaflet-carton-quoted',
    sample_description: '标准双插盒主件 + 标准说明书 + simple carton_packaging 的多配件 quoted acceptance 样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；纸箱+包装费：42*42*35CM，5000套',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 4020,
    order_subtotal_expected: 6770,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'leaflet_carton_cluster',
    status_note: '这条受控 acceptance 样本用于验证标准双插盒 + 标准说明书 + simple carton_packaging 进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_mailer_plus_leaflet_sticker',
    workbook_name: 'controlled_acceptance: validated_mailer_anchor + standard_leaflet + standard_sticker',
    sheet_name: 'trial-mailer-leaflet-sticker-quoted',
    sample_description: '已验证飞机盒主件 + 标准说明书 + 标准贴纸的多配件 quoted acceptance 样本。',
    raw_message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    main_item_subtotal_expected: 3221.56,
    accessory_subtotal_expected: 1150,
    order_subtotal_expected: 4371.56,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'validated_mailer_main_path',
    accessory_gap_source_hint: 'leaflet_sticker_fixed_fee_cluster',
    status_note: '这条受控 acceptance 样本用于验证已验证飞机盒 + 标准说明书 + 标准贴纸进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_mailer_plus_standard_insert_leaflet',
    workbook_name: 'controlled_acceptance: validated_mailer_anchor + standard_box_insert_candidate + standard_leaflet',
    sheet_name: 'trial-mailer-standard-insert-leaflet-quoted',
    sample_description: '已验证飞机盒主件 + 标准内托 + 标准说明书的多配件 quoted acceptance 样本。',
    raw_message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000',
    main_item_subtotal_expected: 3221.56,
    accessory_subtotal_expected: 3025.61,
    order_subtotal_expected: 6247.17,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'validated_mailer_main_path',
    accessory_gap_source_hint: 'standard_insert_leaflet_cluster',
    status_note: '这条受控 acceptance 样本用于验证已验证飞机盒 + 标准内托 + 标准说明书进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_mailer_plus_standard_insert_sticker',
    workbook_name: 'controlled_acceptance: validated_mailer_anchor + standard_box_insert_candidate + standard_sticker',
    sheet_name: 'trial-mailer-standard-insert-sticker-quoted',
    sample_description: '已验证飞机盒主件 + 标准内托 + 标准贴纸的多配件 quoted acceptance 样本。',
    raw_message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    main_item_subtotal_expected: 3221.56,
    accessory_subtotal_expected: 2175.61,
    order_subtotal_expected: 5397.17,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'validated_mailer_main_path',
    accessory_gap_source_hint: 'standard_insert_sticker_cluster',
    status_note: '这条受控 acceptance 样本用于验证已验证飞机盒 + 标准内托 + 标准贴纸进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_mailer_plus_leaflet_carton',
    workbook_name: 'controlled_acceptance: validated_mailer_anchor + standard_leaflet + simple_carton',
    sheet_name: 'trial-mailer-leaflet-carton-quoted',
    sample_description: '已验证飞机盒主件 + 标准说明书 + simple carton_packaging 的多配件 quoted acceptance 样本。',
    raw_message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；纸箱+包装费：42*42*35CM，5000套',
    main_item_subtotal_expected: 3221.56,
    accessory_subtotal_expected: 4020,
    order_subtotal_expected: 7241.56,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'validated_mailer_main_path',
    accessory_gap_source_hint: 'leaflet_carton_cluster',
    status_note: '这条受控 acceptance 样本用于验证已验证飞机盒 + 标准说明书 + simple carton_packaging 进入多配件标准 bundle quoted candidate 后，order 口径仍保持 close。',
  },
  {
    sample_id: 'order_tuck_end_plus_sticker',
    workbook_name: 'composite: image_quote_archive_2026-04-05 + 1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026-04-05-tuck-end-bundle-quote + 2026.3,.31旺旺耐心点',
    sample_description: '双插盒主件 + 透明封口贴的 workbook-grounded 整单复盘。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 150,
    order_subtotal_expected: 2900,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'sticker_processing',
    status_note: '封口贴 order-level 复盘，重点看 sticker processing 是否把 close main item 拉偏。',
  },
  {
    sample_id: 'order_tuck_end_plus_simple_carton',
    workbook_name: 'controlled_acceptance: tuck_end_main_anchor + simple_carton_runtime_bundle',
    sheet_name: 'trial-standard-bundle-carton-quoted',
    sample_description: '标准双插盒主件 + simple carton_packaging 的首批 quoted bundle acceptance 样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸箱+包装费：42*42*35CM，5000套',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 3020,
    order_subtotal_expected: 5770,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'carton_outer_carton_rate',
    status_note: '这条受控 acceptance 样本只用于验证主盒 + simple carton quoted bundle 不会打坏当前 order-level subtotal / markup / shipping / tax 口径。',
  },
  {
    sample_id: 'order_tuck_end_full_bundle',
    workbook_name: 'image_quote_archive_2026-04-05',
    sheet_name: '2026-04-05-tuck-end-bundle-quote',
    sample_description: '双插盒 + 内托 + 说明书 + 透明贴纸整单样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3cm的封口贴，透明贴纸，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 2750,
    order_subtotal_expected: 5500,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'leaflet_setup_fee',
    status_note: '当前最接近真实 workbook 整单的 bundle 样本，用来确认多配件叠加后哪个层先变大。',
  },
  {
    sample_id: 'order_tuck_generic_leaflet_sticker',
    workbook_name: 'controlled_boundary: tuck_end_main_anchor + generic_leaflet + standard_sticker',
    sheet_name: 'trial-generic-leaflet-sticker-estimated',
    sample_description: '标准双插盒主件 + 高频 generic 说明书 + 标准贴纸的保守 estimated-only 多配件样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：220x170mm，80g双胶纸，单面印，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 498.41,
    order_subtotal_expected: 3248.41,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'generic_leaflet_sticker_cluster',
    status_note: '这条保守 boundary 样本用于锁住 generic leaflet + 标准贴纸多配件组合继续 estimated，不误升 quoted。',
  },
  {
    sample_id: 'order_tuck_proxy_insert_leaflet',
    workbook_name: 'controlled_boundary: tuck_end_main_anchor + proxy_insert + standard_leaflet',
    sheet_name: 'trial-proxy-insert-leaflet-estimated',
    sample_description: '标准双插盒主件 + 高频 proxy 内托 + 标准说明书的保守 estimated-only 多配件样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000',
    main_item_subtotal_expected: 2750,
    accessory_subtotal_expected: 2600,
    order_subtotal_expected: 5350,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'bundle_main_box_path',
    accessory_gap_source_hint: 'proxy_insert_leaflet_cluster',
    status_note: '这条保守 boundary 样本用于锁住 proxy 内托 + 标准说明书多配件组合继续 estimated，不误升 quoted。',
  },
  {
    sample_id: 'order_foil_bag_plus_carton',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.4.1谢先生-毛绒定制',
    sample_description: '8 丝空白铝箔袋 + 纸箱包装费的 2.5 批整单样本。',
    raw_message: '铝铂袋：12.5*12.5CM，8丝空白铝铂袋，10000个；纸箱+包装费：42*42*35CM，10000套',
    main_item_subtotal_expected: 11500,
    accessory_subtotal_expected: 5000,
    order_subtotal_expected: 16500,
    shipping_expected: 0,
    tax_expected: 0,
    main_gap_source_hint: 'foil_bag_material',
    accessory_gap_source_hint: 'carton_outer_carton_rate',
    status_note: '2.5 批 order-level 代表样本，用来观察 carton packaging 参与时 bundle 是否仍能稳定 quoted。',
  },
]

function getGapDirection(gapRatio: number): WorkbookOrderGapDirection {
  if (Math.abs(gapRatio) <= CLOSE_GAP_RATIO) {
    return 'close'
  }

  return gapRatio > 0 ? 'higher' : 'lower'
}

function getMainGapSource(
  sample: WorkbookOrderAlignmentSampleDraft,
  mainGap: number,
  accessoryGap: number,
  shippingGap: number,
  taxGap: number,
): string {
  const layers = [
    { key: sample.main_gap_source_hint, value: Math.abs(mainGap) },
    { key: sample.accessory_gap_source_hint, value: Math.abs(accessoryGap) },
    { key: 'shipping', value: Math.abs(shippingGap) },
    { key: 'tax', value: Math.abs(taxGap) },
  ].sort((left, right) => right.value - left.value)

  return layers[0]?.key || sample.main_gap_source_hint
}

export function buildWorkbookOrderAlignmentEntries(): WorkbookOrderAlignmentEntry[] {
  return WORKBOOK_ORDER_ALIGNMENT_SAMPLES.map((sample) => {
    const request = extractComplexPackagingQuoteRequest(sample.raw_message)
    if (!request) {
      throw new Error(`Unable to parse order alignment sample: ${sample.sample_id}`)
    }

    const decision = decideComplexPackagingQuotePath(request)
    const result = calculateBundleQuote(request)
    const mainItemActual = round2(result.mainItem.totalPrice)
    const accessoryActual = round2(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0))
    const orderSubtotalActual = round2(result.totalPrice)
    const shippingActual = round2(result.shippingFee)
    const taxActual = round2(result.tax)
    const finalExpected = round2(sample.order_subtotal_expected + sample.shipping_expected + sample.tax_expected)
    const finalActual = round2(result.finalPrice)
    const gapAmount = round2(finalActual - finalExpected)
    const gapRatio = finalExpected > 0 ? round4(gapAmount / finalExpected) : 0
    const markupExpected = result.costSubtotal > 0 ? round2(sample.order_subtotal_expected / result.costSubtotal) : 1
    const mainGap = round2(mainItemActual - sample.main_item_subtotal_expected)
    const accessoryGap = round2(accessoryActual - sample.accessory_subtotal_expected)
    const shippingGap = round2(shippingActual - sample.shipping_expected)
    const taxGap = round2(taxActual - sample.tax_expected)

    return {
      sample_id: sample.sample_id,
      workbook_name: sample.workbook_name,
      sheet_name: sample.sheet_name,
      sample_description: sample.sample_description,
      main_item_subtotal_expected: round2(sample.main_item_subtotal_expected),
      main_item_subtotal_actual: mainItemActual,
      accessory_subtotal_expected: round2(sample.accessory_subtotal_expected),
      accessory_subtotal_actual: accessoryActual,
      order_subtotal_expected: round2(sample.order_subtotal_expected),
      order_subtotal_actual: orderSubtotalActual,
      markup_expected: markupExpected,
      markup_actual: round2(result.quoteMarkup),
      shipping_expected: round2(sample.shipping_expected),
      shipping_actual: shippingActual,
      tax_expected: round2(sample.tax_expected),
      tax_actual: taxActual,
      final_expected: finalExpected,
      final_actual: finalActual,
      gap_amount: gapAmount,
      gap_ratio: gapRatio,
      gap_direction: getGapDirection(gapRatio),
      tolerance_band: classifyWorkbookPricingToleranceBand('order', gapRatio),
      main_gap_source: getMainGapSource(sample, mainGap, accessoryGap, shippingGap, taxGap),
      boundary_status: decision.status,
      status_note: sample.status_note,
    }
  })
}