import {
  decideComplexPackagingQuotePath,
  extractComplexPackagingQuoteRequest,
} from '@/server/packaging/extractComplexPackagingQuote'
import { calculateBundleQuote } from './complexPackagingQuote'
import { WORKBOOK_ORDER_ALIGNMENT_SAMPLES } from './workbookOrderAlignmentDraft'
import { classifyWorkbookPricingToleranceBand, type WorkbookPricingToleranceBand } from './workbookPricingTolerance'

const round2 = (value: number) => Math.round(value * 100) / 100
const round4 = (value: number) => Math.round(value * 10000) / 10000

export type BundleMainBoxPathReviewAction = 'keep' | 'tune'

export type WorkbookBundleMainBoxPathReviewEntry = {
  sample_id: string
  main_only_message: string
  bundle_message: string
  main_only_boundary: string
  bundle_boundary: string
  main_only_template_id?: string
  bundle_main_template_id?: string
  main_only_line_items: string[]
  bundle_main_line_items: string[]
  main_only_subtotal: number
  bundle_main_subtotal: number
  expected_main_subtotal: number
  main_only_gap_amount: number
  main_only_gap_ratio: number
  bundle_main_gap_amount: number
  bundle_main_gap_ratio: number
  main_only_tolerance_band: WorkbookPricingToleranceBand
  bundle_main_tolerance_band: WorkbookPricingToleranceBand
  bundle_vs_single_gap_amount: number
  bundle_vs_single_gap_ratio: number
  bundle_vs_single_tolerance_band: WorkbookPricingToleranceBand
  main_only_quote_markup: number
  bundle_main_quote_markup: number
  bundle_order_quote_markup: number
  order_level_treatment: string
  main_box_contributed_amount: number
  line_item_delta_summary: string[]
  residual_source_layer: string
  calibration_action: BundleMainBoxPathReviewAction
  status_note: string
}

export const WORKBOOK_BUNDLE_MAIN_BOX_PATH_FIELDS: Array<keyof WorkbookBundleMainBoxPathReviewEntry> = [
  'sample_id',
  'main_only_message',
  'bundle_message',
  'main_only_boundary',
  'bundle_boundary',
  'main_only_template_id',
  'bundle_main_template_id',
  'main_only_line_items',
  'bundle_main_line_items',
  'main_only_subtotal',
  'bundle_main_subtotal',
  'expected_main_subtotal',
  'main_only_gap_amount',
  'main_only_gap_ratio',
  'bundle_main_gap_amount',
  'bundle_main_gap_ratio',
  'main_only_tolerance_band',
  'bundle_main_tolerance_band',
  'bundle_vs_single_gap_amount',
  'bundle_vs_single_gap_ratio',
  'bundle_vs_single_tolerance_band',
  'main_only_quote_markup',
  'bundle_main_quote_markup',
  'bundle_order_quote_markup',
  'order_level_treatment',
  'main_box_contributed_amount',
  'line_item_delta_summary',
  'residual_source_layer',
  'calibration_action',
  'status_note',
]

function extractMainOnlyMessage(rawMessage: string): string {
  return rawMessage.split(/[；;]/)[0]?.trim() || rawMessage.trim()
}

function formatLineItems(items: Array<{ code: string; amount: number }>): string[] {
  return items.map((item) => `${item.code}:${item.amount.toFixed(2)}`)
}

function summarizeLineItemDelta(
  standaloneItems: Array<{ code: string; amount: number }>,
  bundleItems: Array<{ code: string; amount: number }>,
): string[] {
  const standaloneMap = new Map(standaloneItems.map((item) => [item.code, item.amount]))
  const bundleMap = new Map(bundleItems.map((item) => [item.code, item.amount]))
  const codes = Array.from(new Set([...standaloneMap.keys(), ...bundleMap.keys()]))
  const deltas = codes
    .map((code) => {
      const standaloneAmount = standaloneMap.get(code) || 0
      const bundleAmount = bundleMap.get(code) || 0
      const delta = round2(bundleAmount - standaloneAmount)
      return { code, delta }
    })
    .filter((item) => item.delta !== 0)
    .map((item) => `${item.code}:${item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}`)

  return deltas.length > 0 ? deltas : ['none']
}

function getResidualSourceLayer(entry: {
  bundleVsSingleGapAmount: number
  bundleMainGapAmount: number
  lineItemDeltaSummary: string[]
  bundleMainQuoteMarkup: number
  mainOnlyQuoteMarkup: number
}): string {
  if (entry.bundleVsSingleGapAmount !== 0) {
    if (entry.lineItemDeltaSummary.some((item) => item !== 'none')) {
      return 'line_item_layer'
    }

    if (entry.bundleMainQuoteMarkup !== entry.mainOnlyQuoteMarkup) {
      return 'markup_layer'
    }

    return 'bundle_aggregation_layer'
  }

  return entry.bundleMainGapAmount < 0 ? 'main_box_path_itself' : 'none'
}

function getCalibrationAction(entry: {
  bundleVsSingleGapAmount: number
  bundleMainToleranceBand: WorkbookPricingToleranceBand
}): BundleMainBoxPathReviewAction {
  if (entry.bundleVsSingleGapAmount === 0 && entry.bundleMainToleranceBand === 'close') {
    return 'keep'
  }

  return 'tune'
}

export function buildWorkbookBundleMainBoxPathReviewEntries(): WorkbookBundleMainBoxPathReviewEntry[] {
  return WORKBOOK_ORDER_ALIGNMENT_SAMPLES
    .filter((sample) => sample.main_gap_source_hint === 'bundle_main_box_path')
    .map((sample) => {
      const mainOnlyMessage = extractMainOnlyMessage(sample.raw_message)
      const mainOnlyRequest = extractComplexPackagingQuoteRequest(mainOnlyMessage)
      const bundleRequest = extractComplexPackagingQuoteRequest(sample.raw_message)

      if (!mainOnlyRequest || !bundleRequest) {
        throw new Error(`Unable to parse bundle main-box review sample: ${sample.sample_id}`)
      }

      const mainOnlyDecision = decideComplexPackagingQuotePath(mainOnlyRequest)
      const bundleDecision = decideComplexPackagingQuotePath(bundleRequest)
      const mainOnlyResult = calculateBundleQuote(mainOnlyRequest)
      const bundleResult = calculateBundleQuote(bundleRequest)
      const mainOnlyMain = mainOnlyResult.mainItem
      const bundleMain = bundleResult.mainItem
      const mainOnlySubtotal = round2(mainOnlyMain.totalPrice)
      const bundleMainSubtotal = round2(bundleMain.totalPrice)
      const expectedMainSubtotal = round2(sample.main_item_subtotal_expected)
      const mainOnlyGapAmount = round2(mainOnlySubtotal - expectedMainSubtotal)
      const mainOnlyGapRatio = expectedMainSubtotal > 0 ? round4(mainOnlyGapAmount / expectedMainSubtotal) : 0
      const bundleMainGapAmount = round2(bundleMainSubtotal - expectedMainSubtotal)
      const bundleMainGapRatio = expectedMainSubtotal > 0 ? round4(bundleMainGapAmount / expectedMainSubtotal) : 0
      const bundleVsSingleGapAmount = round2(bundleMainSubtotal - mainOnlySubtotal)
      const bundleVsSingleGapRatio = mainOnlySubtotal > 0 ? round4(bundleVsSingleGapAmount / mainOnlySubtotal) : 0
      const lineItemDeltaSummary = summarizeLineItemDelta(mainOnlyMain.lineItems, bundleMain.lineItems)
      const mainOnlyQuoteMarkup = round2(mainOnlyMain.quoteMarkup)
      const bundleMainQuoteMarkup = round2(bundleMain.quoteMarkup)

      const residualSourceLayer = getResidualSourceLayer({
        bundleVsSingleGapAmount,
        bundleMainGapAmount,
        lineItemDeltaSummary,
        bundleMainQuoteMarkup,
        mainOnlyQuoteMarkup,
      })
      const bundleMainToleranceBand = classifyWorkbookPricingToleranceBand('component', bundleMainGapRatio)

      return {
        sample_id: sample.sample_id,
        main_only_message: mainOnlyMessage,
        bundle_message: sample.raw_message,
        main_only_boundary: mainOnlyDecision.status,
        bundle_boundary: bundleDecision.status,
        main_only_template_id: mainOnlyMain.templateId,
        bundle_main_template_id: bundleMain.templateId,
        main_only_line_items: formatLineItems(mainOnlyMain.lineItems),
        bundle_main_line_items: formatLineItems(bundleMain.lineItems),
        main_only_subtotal: mainOnlySubtotal,
        bundle_main_subtotal: bundleMainSubtotal,
        expected_main_subtotal: expectedMainSubtotal,
        main_only_gap_amount: mainOnlyGapAmount,
        main_only_gap_ratio: mainOnlyGapRatio,
        bundle_main_gap_amount: bundleMainGapAmount,
        bundle_main_gap_ratio: bundleMainGapRatio,
        main_only_tolerance_band: classifyWorkbookPricingToleranceBand('component', mainOnlyGapRatio),
        bundle_main_tolerance_band: bundleMainToleranceBand,
        bundle_vs_single_gap_amount: bundleVsSingleGapAmount,
        bundle_vs_single_gap_ratio: bundleVsSingleGapRatio,
        bundle_vs_single_tolerance_band: classifyWorkbookPricingToleranceBand('component', bundleVsSingleGapRatio),
        main_only_quote_markup: mainOnlyQuoteMarkup,
        bundle_main_quote_markup: bundleMainQuoteMarkup,
        bundle_order_quote_markup: round2(bundleResult.quoteMarkup),
        order_level_treatment: bundleDecision.status,
        main_box_contributed_amount: bundleMainSubtotal,
        line_item_delta_summary: lineItemDeltaSummary,
        residual_source_layer: residualSourceLayer,
        calibration_action: getCalibrationAction({
          bundleVsSingleGapAmount,
          bundleMainToleranceBand,
        }),
        status_note: bundleVsSingleGapAmount === 0
          ? 'bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。'
          : 'bundle 内主件与单主件存在实际金额差异，需要继续定位 bundle 分支。',
      }
    })
}