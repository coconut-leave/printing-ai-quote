import {
  decideComplexPackagingQuotePath,
  extractComplexPackagingQuoteRequest,
} from '@/server/packaging/extractComplexPackagingQuote'
import { calculateBundleQuote } from '@/server/pricing/complexPackagingQuote'
import { classifyWorkbookPricingToleranceBand, type WorkbookPricingToleranceBand } from './workbookPricingTolerance'

const CLOSE_GAP_RATIO = 0.03

const round2 = (value: number) => Math.round(value * 100) / 100
const round4 = (value: number) => Math.round(value * 10000) / 10000

export type WorkbookCalibrationGroup =
  | 'main_box_path'
  | 'accessory_path'
  | 'bundle_path'
  | 'batch_2_5_path'

export type WorkbookCalibrationComparisonScope = 'main_item' | 'bundle_total'

export type WorkbookCalibrationGapDirection = 'higher' | 'lower' | 'close'

export type WorkbookCalibrationBoundary = 'quoted' | 'estimated' | 'handoff_required' | 'missing_fields'

export type WorkbookCalibrationSampleDraft = {
  group: WorkbookCalibrationGroup
  sample_id: string
  workbook_name: string
  sheet_name: string
  product_family: string
  template_name: string
  sample_description: string
  raw_message: string
  comparison_scope: WorkbookCalibrationComparisonScope
  quantity: number
  expected_unit_price: number
  expected_total?: number
  main_gap_source: string
  status_note: string
}

export type WorkbookCalibrationComparisonEntry = {
  sample_id: string
  workbook_name: string
  sheet_name: string
  product_family: string
  template_name: string
  sample_description: string
  expected_unit_price: number
  actual_unit_price: number
  expected_total: number
  actual_total: number
  gap_amount: number
  gap_ratio: number
  gap_direction: WorkbookCalibrationGapDirection
  tolerance_band: WorkbookPricingToleranceBand
  current_boundary: WorkbookCalibrationBoundary
  main_gap_source: string
  status_note: string
  group: WorkbookCalibrationGroup
}

export const WORKBOOK_CALIBRATION_FIELDS: Array<keyof WorkbookCalibrationComparisonEntry> = [
  'sample_id',
  'workbook_name',
  'sheet_name',
  'product_family',
  'template_name',
  'sample_description',
  'expected_unit_price',
  'actual_unit_price',
  'expected_total',
  'actual_total',
  'gap_amount',
  'gap_ratio',
  'gap_direction',
  'tolerance_band',
  'current_boundary',
  'main_gap_source',
  'status_note',
  'group',
]

export const WORKBOOK_CALIBRATION_SAMPLES: WorkbookCalibrationSampleDraft[] = [
  {
    group: 'main_box_path',
    sample_id: 'tuck_end_image_bundle_main_item',
    workbook_name: 'image_quote_archive_2026-04-05',
    sheet_name: '2026-04-05-tuck-end-bundle-quote',
    product_family: 'tuck_end_box',
    template_name: 'tuck_end_box_template',
    sample_description: '图片转写 bundle 的双插盒主件行，7*5*5CM，350克白卡，5000。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000',
    comparison_scope: 'main_item',
    quantity: 5000,
    expected_unit_price: 0.55,
    expected_total: 2750,
    main_gap_source: 'bundle_main_box_path',
    status_note: '主件单价已经贴近，剩余误差主要来自主盒成本行与最终成品行 rounding。',
  },
  {
    group: 'main_box_path',
    sample_id: 'mailer_box_0402_3987p',
    workbook_name: '1688报价2026-4月-黄娟.xlsx',
    sheet_name: '0402 3987p',
    product_family: 'mailer_box',
    template_name: 'mailer_box_template',
    sample_description: '普通飞机盒，28*24*6cm，400g白卡，4C，过光胶，裱啤，1000。',
    raw_message: '飞机盒：28*24*6cm，400g白卡+4C+过光胶+裱+啤，1000',
    comparison_scope: 'main_item',
    quantity: 1000,
    expected_unit_price: 2.11,
    expected_total: 2110,
    main_gap_source: 'main_box_fixed_fee',
    status_note: '简单飞机盒已经回到 quoted，当前只剩轻微偏高。',
  },
  {
    group: 'main_box_path',
    sample_id: 'mailer_box_0402_xinmeng',
    workbook_name: '1688报价2026-4月-黄娟.xlsx',
    sheet_name: '0402欣梦创想',
    product_family: 'mailer_box',
    template_name: 'mailer_box_template',
    sample_description: '密胺麻将飞机盒，266x154.5x73mm，WE/加强芯路径，1000。',
    raw_message: '密胺麻将飞机盒：266x154.5x73mm，300g白卡+WE+120+4C+过哑胶+裱+啤，1000',
    comparison_scope: 'main_item',
    quantity: 1000,
    expected_unit_price: 2.57,
    expected_total: 2570,
    main_gap_source: 'main_box_material',
    status_note: 'reinforced mailer 已接近 workbook，主要剩余差异在芯材与裱工比例。',
  },
  {
    group: 'main_box_path',
    sample_id: 'mailer_box_wang_jack',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.4.1 JACK  叶先生',
    product_family: 'mailer_box',
    template_name: 'mailer_box_template',
    sample_description: '双层飞机盒，21x14x7.5cm，A9+双层白板，正反不同印面，1000。',
    raw_message: '飞机盒：21x14x7.5cm，300克白板+A9+300克白板+正面印四色+过哑胶+反面印专色+过哑胶，1000',
    comparison_scope: 'main_item',
    quantity: 1000,
    expected_unit_price: 3.65,
    expected_total: 3650,
    main_gap_source: 'main_box_material',
    status_note: '双层 mailer 仍是当前主盒 gap 最大的 quoted archetype，重点在双层纸材、芯材与印工倍率。',
  },
  {
    group: 'main_box_path',
    sample_id: 'window_box_image_gloss_film',
    workbook_name: 'image_quote_archive_2026-04-05',
    sheet_name: '2026-04-05-window-color-box-quote',
    product_family: 'window_box',
    template_name: 'window_box_template',
    sample_description: '开窗彩盒，21*17*31cm，0.2 厚胶片 23.5*14CM，500。',
    raw_message: '开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500',
    comparison_scope: 'main_item',
    quantity: 500,
    expected_unit_price: 5,
    expected_total: 2500,
    main_gap_source: 'window_film',
    status_note: '当前仍偏低，主要误差仍集中在表面过光同义词、window film 和开窗工序费的组合。',
  },
  {
    group: 'main_box_path',
    sample_id: 'window_box_no_film_boundary_46085',
    workbook_name: '1688月结单2026-3月-黄娟.xlsx',
    sheet_name: '3月已交货',
    product_family: 'window_box',
    template_name: 'window_box_template',
    sample_description: '双插开窗盒，110x120x95mm，开窗但不贴胶片，2000。',
    raw_message: '双插开窗盒：110x120x95mm，纸板+开窗不贴胶片+啤成品+粘盒，2000',
    comparison_scope: 'main_item',
    quantity: 2000,
    expected_unit_price: 0.61,
    expected_total: 1220,
    main_gap_source: 'window_film',
    status_note: '边界目标已从 handoff 收紧到 estimated，但 no-film 语义仍需持续看守。',
  },
  {
    group: 'main_box_path',
    sample_id: 'window_box_no_film_gloss_2000',
    workbook_name: 'controlled_trial_probe_2026-04-07',
    sheet_name: 'window-box-no-film-gloss-boundary',
    product_family: 'window_box',
    template_name: 'window_box_template',
    sample_description: '双插开窗盒，110x120x95mm，过光胶但不贴胶片，2000。',
    raw_message: '双插开窗盒：110x120x95mm，300克白卡，印黑色，过光胶，开窗不贴胶片，啤成品+粘盒，2000',
    comparison_scope: 'main_item',
    quantity: 2000,
    expected_unit_price: 0.5,
    expected_total: 1008.95,
    main_gap_source: 'window_process',
    status_note: '这是本轮保守放开的 no-film quoted candidate 锚点，只覆盖标准覆光胶单品，不外推到 bundle 或更复杂 window 结构。',
  },
  {
    group: 'accessory_path',
    sample_id: 'leaflet_insert_standard_5000',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.3,.31旺旺耐心点',
    product_family: 'leaflet_insert',
    template_name: 'leaflet_insert_template',
    sample_description: '标准说明书 archetype，20*5CM，80克双铜纸，双面四色，3 折，5000。',
    raw_message: '说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000',
    comparison_scope: 'main_item',
    quantity: 5000,
    expected_unit_price: 0.2,
    expected_total: 1000,
    main_gap_source: 'leaflet_setup_fee',
    status_note: '这是 quoted archetype proxy，用来观察标准说明书模板的对齐程度。',
  },
  {
    group: 'accessory_path',
    sample_id: 'leaflet_insert_real_220x170_6100',
    workbook_name: '1688报价2026-4月-黄娟.xlsx',
    sheet_name: '0401广州麦柯黎雅化妆品工厂',
    product_family: 'leaflet_insert',
    template_name: 'leaflet_insert_template',
    sample_description: '真实说明书样本，220x170mm，80g双胶纸，单面印，6100。',
    raw_message: '说明书：220x170mm，80g双胶纸，单面印，6100',
    comparison_scope: 'main_item',
    quantity: 6100,
    expected_unit_price: 0.06,
    expected_total: 360,
    main_gap_source: 'leaflet_setup_fee',
    status_note: '当前仍按 estimated 处理，主要误差来源是通用印刷信号与固定费摊销。',
  },
  {
    group: 'accessory_path',
    sample_id: 'box_insert_web_specialty_board_5000',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.3,.31旺旺耐心点',
    product_family: 'box_insert',
    template_name: 'box_insert_template',
    sample_description: 'WEB 特种纸板内托，20*12CM 左右，5000。',
    raw_message: '内托：20*12CM左右，WEB特种纸板，5000',
    comparison_scope: 'main_item',
    quantity: 5000,
    expected_unit_price: 0.32,
    expected_total: 1600,
    main_gap_source: 'insert_weight_assumption',
    status_note: '当前靠默认克重做 price proxy，状态保持 estimated 更合理。',
  },
  {
    group: 'accessory_path',
    sample_id: 'box_insert_standard_white_card_5000',
    workbook_name: 'controlled_acceptance: standard_box_insert_runtime_candidate',
    sheet_name: 'trial-standard-box-insert-quoted-candidate',
    product_family: 'box_insert',
    template_name: 'box_insert_template',
    sample_description: '标准纸内托，20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000。',
    raw_message: '纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000',
    comparison_scope: 'main_item',
    quantity: 5000,
    expected_unit_price: 0.41,
    expected_total: 2025.61,
    main_gap_source: 'standard_box_insert_runtime_candidate',
    status_note: '显式克重标准内托已不再依赖 proxy，可作为单品 quoted candidate 路径。',
  },
  {
    group: 'accessory_path',
    sample_id: 'seal_sticker_clear_5000',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.3,.31旺旺耐心点',
    product_family: 'seal_sticker',
    template_name: 'seal_sticker_template',
    sample_description: '透明封口贴，2.4*3CM，透明贴纸 + 模切，5000。',
    raw_message: '透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000',
    comparison_scope: 'main_item',
    quantity: 5000,
    expected_unit_price: 0.03,
    expected_total: 150,
    main_gap_source: 'sticker_processing',
    status_note: '封口贴已经落到 quoted，但模切/加工费仍是最容易抖动的子项。',
  },
  {
    group: 'bundle_path',
    sample_id: 'tuck_end_bundle_full_order_image',
    workbook_name: 'image_quote_archive_2026-04-05',
    sheet_name: '2026-04-05-tuck-end-bundle-quote',
    product_family: 'bundle',
    template_name: 'bundle_aggregation',
    sample_description: '双插盒 + 内托 + 说明书 + 透明贴纸整单 subtotal 对齐样本。',
    raw_message: '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3cm的封口贴，透明贴纸，5000',
    comparison_scope: 'bundle_total',
    quantity: 5000,
    expected_unit_price: 1.1,
    expected_total: 5500,
    main_gap_source: 'bundle_main_box_path',
    status_note: '整单 gap 仍主要由主件与内托 proxy 叠加造成，但已经明显接近图转写总价。',
  },
  {
    group: 'batch_2_5_path',
    sample_id: 'foil_bag_blank_8si_10000',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.4.1谢先生-毛绒定制',
    product_family: 'foil_bag',
    template_name: 'foil_bag_template',
    sample_description: '8 丝空白铝箔袋，12.5*12.5CM，10000。',
    raw_message: '铝铂袋：12.5*12.5CM，8丝空白铝铂袋，10000个',
    comparison_scope: 'main_item',
    quantity: 10000,
    expected_unit_price: 1.15,
    expected_total: 11500,
    main_gap_source: 'foil_bag_material',
    status_note: '2.5 批当前只把 blank bag 做到 quoted，已足够当作稳定的 close 对照。',
  },
  {
    group: 'batch_2_5_path',
    sample_id: 'foil_bag_standard_printed_8si_4c_10000',
    workbook_name: 'controlled_acceptance: standard_printed_foil_bag_runtime_candidate',
    sheet_name: 'trial-standard-printed-foil-bag-quoted-candidate',
    product_family: 'foil_bag',
    template_name: 'foil_bag_template',
    sample_description: '标准铝箔袋单品，12.5*12.5CM，8丝，单面四色印刷，10000。',
    raw_message: '铝箔袋：12.5*12.5CM，8丝铝箔袋，单面四色印刷，10000个',
    comparison_scope: 'main_item',
    quantity: 10000,
    expected_unit_price: 1.21,
    expected_total: 12139.99,
    main_gap_source: 'standard_printed_foil_bag_runtime_candidate',
    status_note: '这轮只把标准 8 丝单面四色铝箔袋单品纳入 quoted candidate，不外推到 generic print、双面印刷、打样或 bundle。',
  },
  {
    group: 'batch_2_5_path',
    sample_id: 'carton_packaging_fee_10000',
    workbook_name: '1688报价---王小姐2026.4月.xlsx',
    sheet_name: '2026.4.1谢先生-毛绒定制',
    product_family: 'carton_packaging',
    template_name: 'carton_packaging_template',
    sample_description: '纸箱+包装费，42*42*35CM，10000 套。',
    raw_message: '纸箱+包装费：42*42*35CM，10000套',
    comparison_scope: 'main_item',
    quantity: 10000,
    expected_unit_price: 0.5,
    expected_total: 5000,
    main_gap_source: 'carton_outer_carton_rate',
    status_note: '当前 2.5 模板已能稳定给出 quoted，对照价值在外箱基价而不是复杂纸箱结构。',
  },
  {
    group: 'batch_2_5_path',
    sample_id: 'carton_packaging_standard_printed_k636k_10000',
    workbook_name: 'controlled_acceptance: standard_printed_carton_runtime_candidate',
    sheet_name: 'trial-standard-printed-carton-quoted-candidate',
    product_family: 'carton_packaging',
    template_name: 'carton_packaging_template',
    sample_description: '标准大外箱单品，42*42*35CM，K636K 空白箱，单面四色印刷，啤，10000。',
    raw_message: '大外箱：42*42*35CM，K636K空白箱，单面四色印刷，啤，10000个',
    comparison_scope: 'main_item',
    quantity: 10000,
    expected_unit_price: 0.57,
    expected_total: 5703.06,
    main_gap_source: 'standard_printed_carton_runtime_candidate',
    status_note: '这轮只把标准 K636K 单面四色大外箱单品纳入 quoted candidate，不外推到双面印刷、成箱/包装费、打样或复杂外箱结构。',
  },
  {
    group: 'batch_2_5_path',
    sample_id: 'carton_packaging_outer_carton_160',
    workbook_name: '1688报价2026-4月-黄娟.xlsx',
    sheet_name: '0403鸽士锋',
    product_family: 'carton_packaging',
    template_name: 'carton_packaging_template',
    sample_description: '大外箱，44*24.5*22.5CM，K636K 空白箱，160。',
    raw_message: '大外箱：44*24.5*22.5CM，K636K空白箱，160个',
    comparison_scope: 'main_item',
    quantity: 160,
    expected_unit_price: 3.12,
    expected_total: 499.2,
    main_gap_source: 'carton_outer_carton_rate',
    status_note: '低量外箱样本主要用于验证小批量外箱阶梯，不扩展到印刷外箱。',
  },
]

export const WORKBOOK_CALIBRATION_PRIORITY_DRAFT = {
  top_main_box_follow_ups: [
    {
      sample_id: 'mailer_box_wang_jack',
      reason: '当前是 quoted 主盒 archetype 里 gap 最大的一条，双层纸材、A9 芯材、正反不同印面对材料与印工倍率最敏感。',
    },
    {
      sample_id: 'window_box_image_gloss_film',
      reason: '当前仍明显偏低，且直接暴露了 表面过光 同义词、window film 和开窗工序这组 window 成本路径。',
    },
    {
      sample_id: 'window_box_no_film_boundary_46085',
      reason: '价格已经接近，但 estimated vs handoff 的边界意义大于数值本身，是窗口路径最值得盯住的 boundary archetype。',
    },
    {
      sample_id: 'window_box_no_film_gloss_2000',
      reason: '标准覆光胶 no-film 单品已形成最小可放开 quoted candidate，后续重点应转向验证 guardrail 是否稳定，而不是继续扩大 no-film 外延。',
    },
  ],
  top_close_archetypes: [
    {
      sample_id: 'tuck_end_image_bundle_main_item',
      reason: '双插盒主件已经贴近真实主件单价，可暂时视为 close 基线。',
    },
    {
      sample_id: 'mailer_box_0402_3987p',
      reason: '简单飞机盒已经回到 quoted 且误差很小，当前不值得优先继续打。',
    },
    {
      sample_id: 'mailer_box_0402_xinmeng',
      reason: 'reinforced mailer 已经 close，继续优化的收益低于双层 mailer 和 window 边界。',
    },
  ],
  top_boundary_risks: [
    {
      risk_id: 'window_no_film_boundary',
      note: '开窗但不贴胶片当前已拆成 quoted glossy 子集和 estimated 保守子集，后续要防止 quoted/estimated 边界回弹或误扩。',
    },
    {
      risk_id: 'bundle_companion_quantity_carryover',
      note: '挂钩彩盒 + 配内卡这类 shorthand bundle 仍然依赖共享数量传播和 companion 识别，边界容易因为解析抖动而变形。',
    },
    {
      risk_id: 'accessory_estimated_proxy_guard',
      note: '说明书 generic print 与内托缺克重的 price proxy 现在是 estimated 合理区，后续不能为了提 close 误放成 quoted。',
    },
  ],
} as const

function getGapDirection(gapRatio: number): WorkbookCalibrationGapDirection {
  if (Math.abs(gapRatio) <= CLOSE_GAP_RATIO) {
    return 'close'
  }

  return gapRatio > 0 ? 'higher' : 'lower'
}

function getExpectedTotal(sample: WorkbookCalibrationSampleDraft): number {
  if (typeof sample.expected_total === 'number') {
    return round2(sample.expected_total)
  }

  return round2(sample.expected_unit_price * sample.quantity)
}

function getActualBoundary(sample: WorkbookCalibrationSampleDraft): WorkbookCalibrationBoundary {
  const request = extractComplexPackagingQuoteRequest(sample.raw_message)
  if (!request) {
    throw new Error(`Unable to parse calibration sample: ${sample.sample_id}`)
  }

  const decision = decideComplexPackagingQuotePath(request)
  if (sample.comparison_scope === 'bundle_total') {
    return decision.status
  }

  const result = calculateBundleQuote(request)
  return (result.mainItem.status || decision.status) as WorkbookCalibrationBoundary
}

function getActualPrices(sample: WorkbookCalibrationSampleDraft): { actualUnitPrice: number; actualTotal: number } {
  const request = extractComplexPackagingQuoteRequest(sample.raw_message)
  if (!request) {
    throw new Error(`Unable to parse calibration sample: ${sample.sample_id}`)
  }

  const result = calculateBundleQuote(request)
  if (sample.comparison_scope === 'bundle_total') {
    return {
      actualUnitPrice: round2(result.totalUnitPrice),
      actualTotal: round2(result.totalPrice),
    }
  }

  return {
    actualUnitPrice: round2(result.mainItem.unitPrice),
    actualTotal: round2(result.mainItem.totalPrice),
  }
}

export function buildWorkbookCalibrationComparisonEntries(): WorkbookCalibrationComparisonEntry[] {
  return WORKBOOK_CALIBRATION_SAMPLES.map((sample) => {
    const expectedTotal = getExpectedTotal(sample)
    const { actualUnitPrice, actualTotal } = getActualPrices(sample)
    const gapAmount = round2(actualTotal - expectedTotal)
    const gapRatio = expectedTotal > 0 ? round4(gapAmount / expectedTotal) : 0

    return {
      sample_id: sample.sample_id,
      workbook_name: sample.workbook_name,
      sheet_name: sample.sheet_name,
      product_family: sample.product_family,
      template_name: sample.template_name,
      sample_description: sample.sample_description,
      expected_unit_price: round2(sample.expected_unit_price),
      actual_unit_price: actualUnitPrice,
      expected_total: expectedTotal,
      actual_total: actualTotal,
      gap_amount: gapAmount,
      gap_ratio: gapRatio,
      gap_direction: getGapDirection(gapRatio),
      tolerance_band: classifyWorkbookPricingToleranceBand('component', gapRatio),
      current_boundary: getActualBoundary(sample),
      main_gap_source: sample.main_gap_source,
      status_note: sample.status_note,
      group: sample.group,
    }
  })
}