import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildWorkbookOrderAlignmentEntries,
  WORKBOOK_ORDER_ALIGNMENT_FIELDS,
} from '@/server/pricing/workbookOrderAlignmentDraft'

const roundPercent = (value: number) => `${(value * 100).toFixed(2)}%`
const money = (value: number) => value.toFixed(2)

const entries = buildWorkbookOrderAlignmentEntries()
const outputPath = resolve(process.cwd(), 'docs/workbook-order-alignment-review.md')

const lines = [
  '# Workbook Order Alignment Review',
  '',
  '当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文件是 order-level 对齐证据，不单独定义业务 release 边界。',
  '',
  '这份复盘把视角从单组件切到整单层。当前 expected shipping / tax 默认按 0 处理，因为现有 workbook-grounded 样本主要保留的是货值行，不单独暴露运费或税额。',
  'markup_expected 采用反推口径：用 workbook 目标 goods subtotal 反推当前 order costSubtotal 需要的倍率，便于判断当前 aggregate markup 是否偏离。',
  'tolerance_band 规则：order close <= 1.5%，acceptable <= 3%，其余记为 review。',
  '',
  `字段：${WORKBOOK_ORDER_ALIGNMENT_FIELDS.join(', ')}`,
  '',
  '| sample_id | workbook_name | sheet_name | sample_description | main_item_subtotal_expected | main_item_subtotal_actual | accessory_subtotal_expected | accessory_subtotal_actual | order_subtotal_expected | order_subtotal_actual | markup_expected | markup_actual | shipping_expected | shipping_actual | tax_expected | tax_actual | final_expected | final_actual | gap_amount | gap_ratio | gap_direction | tolerance_band | main_gap_source | boundary_status |',
  '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |',
  ...entries.map((entry) => `| ${[
    entry.sample_id,
    entry.workbook_name,
    entry.sheet_name,
    entry.sample_description,
    money(entry.main_item_subtotal_expected),
    money(entry.main_item_subtotal_actual),
    money(entry.accessory_subtotal_expected),
    money(entry.accessory_subtotal_actual),
    money(entry.order_subtotal_expected),
    money(entry.order_subtotal_actual),
    money(entry.markup_expected),
    money(entry.markup_actual),
    money(entry.shipping_expected),
    money(entry.shipping_actual),
    money(entry.tax_expected),
    money(entry.tax_actual),
    money(entry.final_expected),
    money(entry.final_actual),
    money(entry.gap_amount),
    roundPercent(entry.gap_ratio),
    entry.gap_direction,
    entry.tolerance_band,
    entry.main_gap_source,
    entry.boundary_status,
  ].join(' | ')} |`),
  '',
  '## Largest Final Gaps',
  '',
  ...[...entries]
    .sort((left, right) => Math.abs(right.gap_amount) - Math.abs(left.gap_amount))
    .slice(0, 5)
    .map((entry, index) => `${index + 1}. ${entry.sample_id}: gap_amount ${money(entry.gap_amount)}，gap_ratio ${roundPercent(entry.gap_ratio)}，tolerance ${entry.tolerance_band}，source ${entry.main_gap_source}。`),
  '',
  '## Layer Attribution',
  '',
  ...entries.map((entry, index) => `${index + 1}. ${entry.sample_id}: markup ${money(entry.markup_actual)} vs implied ${money(entry.markup_expected)}，shipping ${money(entry.shipping_actual)}，tax ${money(entry.tax_actual)}，tolerance ${entry.tolerance_band}，boundary ${entry.boundary_status}。`),
  '',
]

writeFileSync(outputPath, lines.join('\n'), 'utf8')
console.log(`Wrote ${outputPath}`)