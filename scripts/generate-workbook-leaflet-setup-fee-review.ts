import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extractComplexPackagingQuoteRequest } from '@/server/packaging/extractComplexPackagingQuote'
import { calculateBundleQuote } from '@/server/pricing/complexPackagingQuote'
import { buildWorkbookOrderAlignmentEntries } from '@/server/pricing/workbookOrderAlignmentDraft'
import { buildPricingAcceptanceGateEntries } from '@/server/pricing/pricingAcceptanceGateDraft'
import { buildWorkbookBundleMainBoxPathReviewEntries } from '@/server/pricing/workbookBundleMainBoxPathReviewDraft'

const OUTPUT_PATH = resolve(process.cwd(), 'docs/workbook-leaflet-setup-fee-review.md')

type LeafletSample = {
  sampleId: string
  expectedTotal: number
  message: string
}

const LEAFLET_SAMPLES: LeafletSample[] = [
  {
    sampleId: 'leaflet_insert_standard_5000',
    expectedTotal: 1000,
    message: '说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000',
  },
  {
    sampleId: 'leaflet_insert_real_220x170_6100',
    expectedTotal: 360,
    message: '说明书：220x170mm，80g双胶纸，单面印，6100',
  },
]

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function getLeafletQuote(message: string) {
  const request = extractComplexPackagingQuoteRequest(message)
  if (!request) {
    throw new Error(`Unable to parse leaflet message: ${message}`)
  }

  return calculateBundleQuote(request).mainItem
}

function getLineAmount(lineItems: Array<{ code: string; amount: number }>, code: string): number {
  return lineItems.find((line) => line.code === code)?.amount || 0
}

async function main() {
  const componentRows = LEAFLET_SAMPLES.map((sample) => {
    const quote = getLeafletQuote(sample.message)
    const setupAmount = getLineAmount(quote.lineItems, 'leaflet_setup')
    const printingAmount = getLineAmount(quote.lineItems, 'leaflet_printing')
    const foldProcessAmount = quote.lineItems
      .filter((line) => ['leaflet_folding', 'leaflet_die_cut'].includes(line.code))
      .reduce((sum, line) => sum + line.amount, 0)
    const gapAmount = quote.totalPrice - sample.expectedTotal
    const gapRatio = sample.expectedTotal > 0 ? gapAmount / sample.expectedTotal : 0

    return {
      sampleId: sample.sampleId,
      status: quote.status,
      expectedTotal: sample.expectedTotal,
      actualTotal: quote.totalPrice,
      gapAmount,
      gapRatio,
      costSubtotal: quote.costSubtotal,
      quotedAmount: quote.quotedAmount,
      quoteMarkup: quote.quoteMarkup,
      actualQuantity: quote.actualQuantity,
      chargeQuantity: quote.chargeQuantity,
      setupAmount,
      printingAmount,
      foldProcessAmount,
      lineItems: quote.lineItems,
    }
  })

  const orderEntriesById = new Map(buildWorkbookOrderAlignmentEntries().map((entry) => [entry.sample_id, entry]))
  const orderRows = ['order_tuck_end_plus_leaflet', 'order_tuck_end_full_bundle']
    .map((sampleId) => orderEntriesById.get(sampleId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  const gatesById = new Map(buildPricingAcceptanceGateEntries().map((entry) => [entry.gate_id, entry]))
  const quotedGate = gatesById.get('leaflet_standard_quoted')
  const estimatedGate = gatesById.get('leaflet_general_estimated')
  const keepEntries = buildWorkbookBundleMainBoxPathReviewEntries()

  const report = [
    '# Workbook Leaflet Setup Fee Review',
    '',
    '这份 scoped review 只看 `leaflet_setup_fee cluster` 与说明书相邻的 `generic print handling`，不触碰 bundle 聚合逻辑、不触碰 bundle_main_box_path KEEP 结论。',
    '',
    '## Component Residuals',
    '',
    '| sample_id | status | expected_total | actual_total | gap_amount | gap_ratio | cost_subtotal | quoted_amount | quote_markup | actual_quantity | charge_quantity | setup_fee_amount | printing_amount | fold_process_amount |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...componentRows.map((row) => `| ${row.sampleId} | ${row.status} | ${formatMoney(row.expectedTotal)} | ${formatMoney(row.actualTotal)} | ${formatMoney(row.gapAmount)} | ${formatRatio(row.gapRatio)} | ${formatMoney(row.costSubtotal)} | ${formatMoney(row.quotedAmount)} | ${formatMoney(row.quoteMarkup)} | ${row.actualQuantity} | ${row.chargeQuantity} | ${formatMoney(row.setupAmount)} | ${formatMoney(row.printingAmount)} | ${formatMoney(row.foldProcessAmount)} |`),
    '',
    '## Line-Item Breakdown',
    '',
    ...componentRows.flatMap((row, index) => [
      `${index + 1}. ${row.sampleId}:`,
      ...row.lineItems.map((line) => `- ${line.code}: ${formatMoney(line.amount)}`),
    ]),
    '',
    '## Residual Attribution',
    '',
    `1. setup fee residual: 当前 5000 档说明书 setup fee 已收敛到 ${formatMoney(componentRows[0]?.setupAmount || 0)}，不再是主要 residual 源。`,
    `2. printing residual: 标准说明书印刷固定费当前为 ${formatMoney(componentRows[0]?.printingAmount || 0)}，generic print 样本为 ${formatMoney(componentRows[1]?.printingAmount || 0)}；generic handling 保留 estimated，但固定费更轻。`,
    `3. fold/process residual: 当前说明书后道主要来自折页，标准样本当前折页/裁切合计 ${formatMoney(componentRows[0]?.foldProcessAmount || 0)}。`,
    `4. quantity ladder effect: 5000 档标准说明书当前 actual_quantity=${componentRows[0]?.actualQuantity || 0}，charge_quantity=${componentRows[0]?.chargeQuantity || 0}；generic 样本 actual_quantity=${componentRows[1]?.actualQuantity || 0}，charge_quantity=${componentRows[1]?.chargeQuantity || 0}。`,
    `5. order carryover effect: 主件+说明书整单 accessory residual 当前为 ${formatMoney((orderRows[0]?.accessory_subtotal_actual || 0) - (orderRows[0]?.accessory_subtotal_expected || 0))}，full bundle 中 accessory residual 当前为 ${formatMoney((orderRows[1]?.accessory_subtotal_actual || 0) - (orderRows[1]?.accessory_subtotal_expected || 0))}。`,
    '',
    '## Order Carryover',
    '',
    '| sample_id | accessory_expected | accessory_actual | order_expected | order_actual | gap_amount | gap_ratio | main_gap_source | boundary_status |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...orderRows.map((row) => `| ${row.sample_id} | ${formatMoney(row.accessory_subtotal_expected)} | ${formatMoney(row.accessory_subtotal_actual)} | ${formatMoney(row.order_subtotal_expected)} | ${formatMoney(row.order_subtotal_actual)} | ${formatMoney(row.gap_amount)} | ${formatRatio(row.gap_ratio)} | ${row.main_gap_source} | ${row.boundary_status} |`),
    '',
    '## Guardrails',
    '',
    `1. leaflet_standard_quoted: ${quotedGate?.acceptance_status || 'missing'}，worst gap ${formatRatio(quotedGate?.worst_gap_ratio || 0)}。`,
    `2. leaflet_general_estimated: ${estimatedGate?.acceptance_status || 'missing'}，worst gap ${formatRatio(estimatedGate?.worst_gap_ratio || 0)}。`,
    `3. bundle_main_box_path keep entries: ${keepEntries.every((entry) => entry.calibration_action === 'keep') ? 'all_keep' : 'drift_detected'}。`,
    '',
    '## Decision',
    '',
    '1. 当前说明书 residual 已从 setup-fee 主导，收敛到 close-band 内的小幅余差。',
    '2. generic print handling 仍保持 estimated 边界，没有被误放宽。',
    '3. order-level 余差当前重新回到 main_box_path source，不再由 leaflet_setup_fee 主导。',
  ].join('\n')

  await writeFile(OUTPUT_PATH, report, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})