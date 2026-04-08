import {
  buildWorkbookCalibrationComparisonEntries,
  type WorkbookCalibrationBoundary,
} from './workbookCalibrationComparisonDraft'
import {
  buildWorkbookOrderAlignmentEntries,
  type WorkbookOrderBoundaryStatus,
} from './workbookOrderAlignmentDraft'
import {
  classifyWorkbookPricingToleranceBand,
  type WorkbookPricingToleranceBand,
  type WorkbookPricingToleranceScope,
} from './workbookPricingTolerance'

const round4 = (value: number) => Math.round(value * 10000) / 10000

const TOLERANCE_SEVERITY: Record<WorkbookPricingToleranceBand, number> = {
  close: 0,
  acceptable: 1,
  review: 2,
}

export type PricingAcceptanceReleaseMode = 'quoted' | 'estimated_only'

export type PricingAcceptanceStatus = 'accepted' | 'guardrailed' | 'blocked'

export type PricingAcceptanceGateEntry = {
  gate_id: string
  scope: WorkbookPricingToleranceScope
  release_mode: PricingAcceptanceReleaseMode
  sample_ids: string[]
  sample_count: number
  expected_boundary: WorkbookCalibrationBoundary | WorkbookOrderBoundaryStatus
  actual_boundaries: string
  worst_sample_id: string
  worst_gap_ratio: number
  tolerance_band: WorkbookPricingToleranceBand
  acceptance_status: PricingAcceptanceStatus
  status_note: string
}

type PricingAcceptanceGateSpec = {
  gate_id: string
  scope: WorkbookPricingToleranceScope
  release_mode: PricingAcceptanceReleaseMode
  sample_ids: string[]
  expected_boundary: WorkbookCalibrationBoundary | WorkbookOrderBoundaryStatus
  status_note: string
}

const PRICING_ACCEPTANCE_GATE_SPECS: PricingAcceptanceGateSpec[] = [
  {
    gate_id: 'tuck_end_main_item_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['tuck_end_image_bundle_main_item'],
    expected_boundary: 'quoted',
    status_note: '标准双插盒主件路径已用 workbook 主件行做 close 锚点。',
  },
  {
    gate_id: 'mailer_box_quoted_paths',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['mailer_box_0402_3987p', 'mailer_box_0402_xinmeng', 'mailer_box_wang_jack'],
    expected_boundary: 'quoted',
    status_note: '飞机盒 acceptance 继续按 quoted path 评估，但要保留双层+A9 的 guardrail。',
  },
  {
    gate_id: 'window_box_gloss_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['window_box_image_gloss_film'],
    expected_boundary: 'quoted',
    status_note: '标准开窗覆光胶路径可按 quoted 管理。',
  },
  {
    gate_id: 'window_box_no_film_gloss_quoted_candidate',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['window_box_no_film_gloss_2000'],
    expected_boundary: 'quoted',
    status_note: '标准覆光胶 + 明确不贴胶片的最小 no-film 单品子集可按 quoted candidate 管理，但不外推到 bundle 或更复杂开窗结构。',
  },
  {
    gate_id: 'window_box_no_film_estimated',
    scope: 'component',
    release_mode: 'estimated_only',
    sample_ids: ['window_box_no_film_boundary_46085'],
    expected_boundary: 'estimated',
    status_note: '非 glossy / 非标准 / 不完整的 no-film window path 继续只接受 estimated。',
  },
  {
    gate_id: 'leaflet_standard_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['leaflet_insert_standard_5000'],
    expected_boundary: 'quoted',
    status_note: '标准说明书 path 可以 quoted，但 fixed-fee 仍需持续盯住。',
  },
  {
    gate_id: 'leaflet_generic_high_frequency_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['leaflet_insert_real_220x170_6100'],
    expected_boundary: 'quoted',
    status_note: '高频 generic 说明书已进入标准化 quoted candidate，但仍不外推到更复杂 leaflet 长尾。',
  },
  {
    gate_id: 'box_insert_standard_quoted_candidate',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['box_insert_standard_white_card_5000'],
    expected_boundary: 'quoted',
    status_note: '显式克重的标准内托单品可按 quoted candidate gate 管理，但这不等于放开主盒 + 内托 bundle。',
  },
  {
    gate_id: 'box_insert_proxy_high_frequency_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['box_insert_web_specialty_board_5000'],
    expected_boundary: 'quoted',
    status_note: '高频默认克重 proxy 内托已进入标准化 quoted candidate，但仍不外推到更宽的主盒 + 内托组合。',
  },
  {
    gate_id: 'seal_sticker_standard_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['seal_sticker_clear_5000'],
    expected_boundary: 'quoted',
    status_note: '标准透明封口贴路径可 quoted，主要 watch 点是 plate/process 组合。',
  },
  {
    gate_id: 'foil_bag_blank_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['foil_bag_blank_8si_10000'],
    expected_boundary: 'quoted',
    status_note: 'blank foil bag path 继续作为 2.5 批 quoted 基线。',
  },
  {
    gate_id: 'foil_bag_standard_printed_quoted_candidate',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['foil_bag_standard_printed_8si_4c_10000'],
    expected_boundary: 'quoted',
    status_note: '这轮只把标准 8 丝单面四色铝箔袋单品纳入 quoted candidate；generic print、双面印刷、打样和 bundle 不外推。',
  },
  {
    gate_id: 'carton_packaging_quoted',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['carton_packaging_fee_10000', 'carton_packaging_outer_carton_160'],
    expected_boundary: 'quoted',
    status_note: 'simple carton packaging 继续作为 2.5 批 quoted 基线。',
  },
  {
    gate_id: 'carton_packaging_standard_printed_quoted_candidate',
    scope: 'component',
    release_mode: 'quoted',
    sample_ids: ['carton_packaging_standard_printed_k636k_10000'],
    expected_boundary: 'quoted',
    status_note: '这轮只把标准 K636K 单面四色大外箱单品纳入 quoted candidate；双面印刷、成箱/包装费、打样和复杂外箱结构不外推。',
  },
  {
    gate_id: 'extended_main_plus_insert_quoted_candidate',
    scope: 'order',
    release_mode: 'quoted',
    sample_ids: ['order_mailer_plus_standard_insert', 'order_mailer_plus_proxy_insert'],
    expected_boundary: 'quoted',
    status_note: '第一步扩张只把已验证 mailer_box + 标准内托 / 高频 proxy 内托放进 quoted candidate；不外推到 window_box 或其他主盒。',
  },
  {
    gate_id: 'extended_main_plus_insert_estimated_only',
    scope: 'order',
    release_mode: 'estimated_only',
    sample_ids: ['order_window_plus_standard_insert', 'order_window_plus_proxy_insert'],
    expected_boundary: 'estimated',
    status_note: 'extended main + insert 的保守子集当前仍由 window_box + 内托代表，继续只接受 estimated，不误升 quoted。',
  },
  {
    gate_id: 'standard_bundle_quoted',
    scope: 'order',
    release_mode: 'quoted',
    sample_ids: [
      'order_tuck_end_plus_leaflet',
      'order_tuck_end_plus_insert',
      'order_tuck_end_plus_standard_insert',
      'order_tuck_end_plus_simple_carton',
      'order_tuck_end_plus_sticker',
    ],
    expected_boundary: 'quoted',
    status_note: 'trial 已放开的标准双插盒 + 单一标准说明书 / 标准内托 / 高频 proxy 内托 / 贴纸 / simple carton，应按 quoted gate 管理。',
  },
  {
    gate_id: 'single_generic_leaflet_bundle_estimated_only',
    scope: 'order',
    release_mode: 'estimated_only',
    sample_ids: ['order_tuck_end_plus_generic_leaflet'],
    expected_boundary: 'estimated',
    status_note: '标准双插盒 + 高频 generic 说明书整单继续按 estimated gate 管理，防止 generic 单品能力在 bundle 场景误放开成正式报价。',
  },
  {
    gate_id: 'multi_accessory_standard_bundle_quoted_candidate',
    scope: 'order',
    release_mode: 'quoted',
    sample_ids: [
      'order_tuck_end_plus_leaflet_sticker',
      'order_tuck_end_plus_standard_insert_leaflet',
      'order_tuck_end_plus_standard_insert_sticker',
      'order_tuck_end_plus_leaflet_carton',
      'order_mailer_plus_leaflet_sticker',
      'order_mailer_plus_standard_insert_leaflet',
      'order_mailer_plus_standard_insert_sticker',
      'order_mailer_plus_leaflet_carton',
    ],
    expected_boundary: 'quoted',
    status_note: 'multi_accessory_standard_bundle_quoted_candidate 当前只放开标准双插盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸、+ 标准内托 + 标准说明书、+ 标准内托 + 标准贴纸、+ 标准说明书 + simple carton_packaging。',
  },
  {
    gate_id: 'multi_accessory_standard_bundle_estimated_only',
    scope: 'order',
    release_mode: 'estimated_only',
    sample_ids: [
      'order_tuck_end_full_bundle',
      'order_tuck_generic_leaflet_sticker',
      'order_tuck_proxy_insert_leaflet',
    ],
    expected_boundary: 'estimated',
    status_note: 'multi_accessory_standard_bundle_estimated_only 当前继续覆盖 generic leaflet / proxy insert 参与的多配件组合，以及更宽但仍未进入白名单的标准多配件 bundle。',
  },
  {
    gate_id: 'order_addon_bundle_quoted',
    scope: 'order',
    release_mode: 'quoted',
    sample_ids: ['order_foil_bag_plus_carton'],
    expected_boundary: 'quoted',
    status_note: '显式订单级附加项 bundle 可继续 quoted。',
  },
]

type PricingSampleSnapshot = {
  sample_id: string
  boundary: WorkbookCalibrationBoundary | WorkbookOrderBoundaryStatus
  gap_ratio: number
}

function getAcceptanceStatus(
  toleranceBand: WorkbookPricingToleranceBand,
  boundaryMatch: boolean,
): PricingAcceptanceStatus {
  if (!boundaryMatch || toleranceBand === 'review') {
    return 'blocked'
  }

  if (toleranceBand === 'acceptable') {
    return 'guardrailed'
  }

  return 'accepted'
}

function getWorstSample(samples: PricingSampleSnapshot[], scope: WorkbookPricingToleranceScope): PricingSampleSnapshot {
  return [...samples].sort((left, right) => {
    const leftBand = classifyWorkbookPricingToleranceBand(scope, left.gap_ratio)
    const rightBand = classifyWorkbookPricingToleranceBand(scope, right.gap_ratio)
    const severityDelta = TOLERANCE_SEVERITY[rightBand] - TOLERANCE_SEVERITY[leftBand]

    if (severityDelta !== 0) {
      return severityDelta
    }

    return Math.abs(right.gap_ratio) - Math.abs(left.gap_ratio)
  })[0]
}

export function buildPricingAcceptanceGateEntries(): PricingAcceptanceGateEntry[] {
  const componentEntries = new Map(
    buildWorkbookCalibrationComparisonEntries().map((entry) => [entry.sample_id, entry]),
  )
  const orderEntries = new Map(
    buildWorkbookOrderAlignmentEntries().map((entry) => [entry.sample_id, entry]),
  )

  return PRICING_ACCEPTANCE_GATE_SPECS.map((spec) => {
    const samples: PricingSampleSnapshot[] = spec.sample_ids.map((sampleId) => {
      if (spec.scope === 'component') {
        const entry = componentEntries.get(sampleId)
        if (!entry) {
          throw new Error(`Missing component acceptance sample: ${sampleId}`)
        }

        return {
          sample_id: entry.sample_id,
          boundary: entry.current_boundary,
          gap_ratio: entry.gap_ratio,
        }
      }

      const entry = orderEntries.get(sampleId)
      if (!entry) {
        throw new Error(`Missing order acceptance sample: ${sampleId}`)
      }

      return {
        sample_id: entry.sample_id,
        boundary: entry.boundary_status,
        gap_ratio: entry.gap_ratio,
      }
    })

    const worstSample = getWorstSample(samples, spec.scope)
    const toleranceBand = classifyWorkbookPricingToleranceBand(spec.scope, worstSample.gap_ratio)
    const boundaryMatch = samples.every((sample) => sample.boundary === spec.expected_boundary)
    const actualBoundaries = Array.from(new Set(samples.map((sample) => sample.boundary))).join(', ')

    return {
      gate_id: spec.gate_id,
      scope: spec.scope,
      release_mode: spec.release_mode,
      sample_ids: spec.sample_ids,
      sample_count: spec.sample_ids.length,
      expected_boundary: spec.expected_boundary,
      actual_boundaries: actualBoundaries,
      worst_sample_id: worstSample.sample_id,
      worst_gap_ratio: round4(worstSample.gap_ratio),
      tolerance_band: toleranceBand,
      acceptance_status: getAcceptanceStatus(toleranceBand, boundaryMatch),
      status_note: spec.status_note,
    }
  })
}