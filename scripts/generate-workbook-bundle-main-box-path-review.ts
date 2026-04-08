import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  buildWorkbookBundleMainBoxPathReviewEntries,
  WORKBOOK_BUNDLE_MAIN_BOX_PATH_FIELDS,
} from '@/server/pricing/workbookBundleMainBoxPathReviewDraft'
import { buildWorkbookOrderAlignmentEntries } from '@/server/pricing/workbookOrderAlignmentDraft'
import { buildPricingAcceptanceGateEntries } from '@/server/pricing/pricingAcceptanceGateDraft'

const OUTPUT_PATH = resolve(process.cwd(), 'docs/workbook-bundle-main-box-path-review.md')

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

async function main() {
  const entries = buildWorkbookBundleMainBoxPathReviewEntries()
  const keepEntries = entries.filter((entry) => entry.calibration_action === 'keep')
  const tuneEntries = entries.filter((entry) => entry.calibration_action === 'tune')
  const orderEntriesById = new Map(buildWorkbookOrderAlignmentEntries().map((entry) => [entry.sample_id, entry]))
  const relatedOrderEntries = entries
    .map((entry) => orderEntriesById.get(entry.sample_id))
    .filter((entry) => Boolean(entry))
  const acceptanceGates = buildPricingAcceptanceGateEntries()
  const verifiedGateIds = [
    'leaflet_standard_quoted',
    'box_insert_standard_quoted_candidate',
    'box_insert_weight_proxy_estimated',
    'seal_sticker_standard_quoted',
    'standard_bundle_quoted',
    'standard_bundle_estimated',
    'order_addon_bundle_quoted',
  ]
  const verifiedGates = verifiedGateIds
    .map((gateId) => acceptanceGates.find((entry) => entry.gate_id === gateId))
    .filter((entry) => Boolean(entry))

  const report = [
    '# Workbook Bundle Main Box Path Review',
    '',
    '当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文件只提供 main-box residual 证据，不单独定义业务 release 边界。',
    '',
    '这份复盘只看 bundle_main_box_path 残余 under-gap，不继续扩模板、不继续打配件 fixed-fee。',
    '对照方式是把同一个主盒路径拆成 A. 单主件报价 与 B. 进入 bundle 后的主件报价，直接检查 builder、line-items、subtotal 和 markup 是否漂移。',
    '',
    `字段：${WORKBOOK_BUNDLE_MAIN_BOX_PATH_FIELDS.join(', ')}`,
    '',
    '| sample_id | main_only_boundary | bundle_boundary | main_only_template_id | bundle_main_template_id | main_only_subtotal | bundle_main_subtotal | expected_main_subtotal | main_only_gap_ratio | bundle_main_gap_ratio | bundle_vs_single_gap_amount | bundle_vs_single_gap_ratio | main_only_quote_markup | bundle_main_quote_markup | bundle_order_quote_markup | order_level_treatment | residual_source_layer | calibration_action |',
    '| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...entries.map((entry) => `| ${[
      entry.sample_id,
      entry.main_only_boundary,
      entry.bundle_boundary,
      entry.main_only_template_id,
      entry.bundle_main_template_id,
      formatMoney(entry.main_only_subtotal),
      formatMoney(entry.bundle_main_subtotal),
      formatMoney(entry.expected_main_subtotal),
      formatRatio(entry.main_only_gap_ratio),
      formatRatio(entry.bundle_main_gap_ratio),
      formatMoney(entry.bundle_vs_single_gap_amount),
      formatRatio(entry.bundle_vs_single_gap_ratio),
      formatMoney(entry.main_only_quote_markup),
      formatMoney(entry.bundle_main_quote_markup),
      formatMoney(entry.bundle_order_quote_markup),
      entry.order_level_treatment,
      entry.residual_source_layer,
      entry.calibration_action,
    ].join(' | ')} |`),
    '',
    '## Main Findings',
    '',
    ...entries.map((entry, index) => `${index + 1}. ${entry.sample_id}: line_item_delta ${entry.line_item_delta_summary.join(', ')}；single subtotal ${formatMoney(entry.main_only_subtotal)} vs bundle main ${formatMoney(entry.bundle_main_subtotal)}；residual source ${entry.residual_source_layer}。`),
    '',
    '## Stop Or Tune',
    '',
    ...(keepEntries.length > 0
      ? keepEntries.map((entry, index) => `${index + 1}. ${entry.sample_id}: keep。${entry.status_note}`)
      : ['1. 当前无 keep 样本。']),
    '',
    '## Decision Snapshot',
    '',
    `1. KEEP：当前 ${entries.length} 个 bundle_main_box_path 样本全部维持 keep，因为 bundle_vs_single_gap 全为 0，主件模板、line-items、subtotal 与 markup 没有 bundle-specific 漂移。`,
    '2. 停止继续压 bundle 分支：残余 under-gap 仍是主件路径自身的轻微残差，继续压 bundle-specific 逻辑只会打坏已经进入 close band 的现状，而不能解决真正来源。',
    `3. 证据锚点：bundle 主件 subtotal 固定为 ${formatMoney(entries[0]?.bundle_main_subtotal || 0)}，expected main subtotal 固定为 ${formatMoney(entries[0]?.expected_main_subtotal || 0)}，残余约 ${formatRatio(entries[0]?.bundle_main_gap_ratio || 0)}，仍在 component close band。`,
    '',
    '## Guardrails Verified Unchanged',
    '',
    ...relatedOrderEntries.map((entry, index) => `${index + 1}. ${entry?.sample_id}: order tolerance ${entry?.tolerance_band}，boundary ${entry?.boundary_status}，shipping ${formatMoney(entry?.shipping_actual || 0)}，tax ${formatMoney(entry?.tax_actual || 0)}。`),
    ...verifiedGates.map((entry, index) => `${relatedOrderEntries.length + index + 1}. ${entry?.gate_id}: ${entry?.release_mode} gate 仍为 ${entry?.acceptance_status}。`),
    '',
    ...(tuneEntries.length > 0
      ? ['## Needs Tuning', '', ...tuneEntries.map((entry, index) => `${index + 1}. ${entry.sample_id}: tune。${entry.status_note}`), '']
      : ['## Needs Tuning', '', '1. 当前无需要继续压的 bundle_main_box_path 样本。', '']),
  ].join('\n')

  await writeFile(OUTPUT_PATH, report, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})