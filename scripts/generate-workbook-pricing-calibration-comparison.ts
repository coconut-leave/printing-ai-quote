import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  WORKBOOK_CALIBRATION_FIELDS,
  WORKBOOK_CALIBRATION_PRIORITY_DRAFT,
  buildWorkbookCalibrationComparisonEntries,
  type WorkbookCalibrationComparisonEntry,
  type WorkbookCalibrationGroup,
} from '@/server/pricing/workbookCalibrationComparisonDraft'

const OUTPUT_PATH = resolve(process.cwd(), 'docs/workbook-pricing-calibration-comparison.md')

const GROUP_TITLES: Record<WorkbookCalibrationGroup, string> = {
  main_box_path: '1. 主盒路径',
  accessory_path: '2. 第二批配件路径',
  bundle_path: '3. bundle 汇总路径',
  batch_2_5_path: '4. 2.5 批样本',
}

const GROUP_ORDER: WorkbookCalibrationGroup[] = [
  'main_box_path',
  'accessory_path',
  'bundle_path',
  'batch_2_5_path',
]

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatSampleTable(entries: WorkbookCalibrationComparisonEntry[]): string {
  const header = [
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
  ]

  const divider = header.map(() => '---')
  const rows = entries.map((entry) => [
    entry.sample_id,
    entry.workbook_name,
    entry.sheet_name,
    entry.product_family,
    entry.template_name,
    entry.sample_description,
    formatMoney(entry.expected_unit_price),
    formatMoney(entry.actual_unit_price),
    formatMoney(entry.expected_total),
    formatMoney(entry.actual_total),
    formatMoney(entry.gap_amount),
    formatRatio(entry.gap_ratio),
    entry.gap_direction,
    entry.tolerance_band,
    entry.current_boundary,
    entry.main_gap_source,
    entry.status_note,
  ])

  return [header, divider, ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n')
}

function formatPriorityList(
  title: string,
  items: ReadonlyArray<{ sample_id?: string; risk_id?: string; reason?: string; note?: string }>,
  entriesById: Map<string, WorkbookCalibrationComparisonEntry>,
): string {
  const lines = [`## ${title}`]

  items.forEach((item, index) => {
    if (item.sample_id) {
      const entry = entriesById.get(item.sample_id)
      if (!entry) {
        return
      }

      lines.push(`${index + 1}. ${entry.sample_id}: ${item.reason} 当前 expected_total ${formatMoney(entry.expected_total)}，actual_total ${formatMoney(entry.actual_total)}，gap_ratio ${formatRatio(entry.gap_ratio)}，boundary ${entry.current_boundary}。`)
      return
    }

    if (item.risk_id) {
      lines.push(`${index + 1}. ${item.risk_id}: ${item.note}`)
    }
  })

  return lines.join('\n')
}

async function main() {
  const entries = buildWorkbookCalibrationComparisonEntries()
  const entriesById = new Map(entries.map((entry) => [entry.sample_id, entry]))
  const groupedEntries = new Map<WorkbookCalibrationGroup, WorkbookCalibrationComparisonEntry[]>()

  for (const entry of entries) {
    const existing = groupedEntries.get(entry.group) || []
    existing.push(entry)
    groupedEntries.set(entry.group, existing)
  }

  const closeEntries = [...entries]
    .filter((entry) => entry.gap_direction === 'close')
    .sort((left, right) => Math.abs(left.gap_ratio) - Math.abs(right.gap_ratio))
    .slice(0, 5)

  const largestGapEntries = [...entries]
    .sort((left, right) => Math.abs(right.gap_ratio) - Math.abs(left.gap_ratio))
    .slice(0, 5)

  const mainBoxGapEntries = entries
    .filter((entry) => entry.group === 'main_box_path')
    .filter((entry) => entry.main_gap_source.startsWith('main_box') || entry.main_gap_source.startsWith('window') || entry.main_gap_source.startsWith('bundle_main_box'))

  const accessoryGapEntries = entries
    .filter((entry) => entry.group === 'accessory_path')
    .filter((entry) => entry.main_gap_source.startsWith('leaflet') || entry.main_gap_source.startsWith('insert') || entry.main_gap_source.startsWith('sticker'))

  const report = [
    '# Workbook Pricing Calibration Comparison',
    '',
    '这份对照表用于盘清当前 workbook 样本校准现状，不继续扩模板，也不继续改主盒逻辑。',
    '',
    '对照口径：',
    '- actual_total 统一使用当前系统 line subtotal 或 bundle subtotal，不含 shipping 和 tax，便于和 workbook 成品行对齐。',
    '- gap_amount = actual_total - expected_total。',
    '- gap_ratio = gap_amount / expected_total。',
    '- gap_direction 规则：|gap_ratio| <= 3% 记为 close，否则按 higher / lower 记录。',
    '- tolerance_band 规则：component close <= 5%，acceptable <= 12%，其余记为 review。',
    '',
    '当前字段：',
    `- ${WORKBOOK_CALIBRATION_FIELDS.join(', ')}`,
    '',
    ...GROUP_ORDER
      .filter((group) => groupedEntries.has(group))
      .flatMap((group) => [
        `## ${GROUP_TITLES[group]}`,
        '',
        formatSampleTable(groupedEntries.get(group) || []),
        '',
      ]),
    '## 当前已经 close 的样本',
    ...closeEntries.map((entry, index) => `${index + 1}. ${entry.sample_id}: expected_total ${formatMoney(entry.expected_total)}，actual_total ${formatMoney(entry.actual_total)}，gap_ratio ${formatRatio(entry.gap_ratio)}，tolerance ${entry.tolerance_band}，boundary ${entry.current_boundary}。`),
    '',
    '## 当前 gap 最大的样本',
    ...largestGapEntries.map((entry, index) => `${index + 1}. ${entry.sample_id}: expected_total ${formatMoney(entry.expected_total)}，actual_total ${formatMoney(entry.actual_total)}，gap_amount ${formatMoney(entry.gap_amount)}，gap_ratio ${formatRatio(entry.gap_ratio)}，tolerance ${entry.tolerance_band}，source ${entry.main_gap_source}。`),
    '',
    '## 主要来自主盒 path 的 gap',
    ...mainBoxGapEntries.map((entry, index) => `${index + 1}. ${entry.sample_id}: ${entry.main_gap_source}，gap_ratio ${formatRatio(entry.gap_ratio)}，boundary ${entry.current_boundary}。`),
    '',
    '## 主要来自配件 path 的 gap',
    ...accessoryGapEntries.map((entry, index) => `${index + 1}. ${entry.sample_id}: ${entry.main_gap_source}，gap_ratio ${formatRatio(entry.gap_ratio)}，boundary ${entry.current_boundary}。`),
    '',
    formatPriorityList('后续最该优先校准的 Top 3 主盒 archetype', WORKBOOK_CALIBRATION_PRIORITY_DRAFT.top_main_box_follow_ups, entriesById),
    '',
    formatPriorityList('Top 3 可以先不动的 close archetype', WORKBOOK_CALIBRATION_PRIORITY_DRAFT.top_close_archetypes, entriesById),
    '',
    formatPriorityList('Top 3 主要边界风险点', WORKBOOK_CALIBRATION_PRIORITY_DRAFT.top_boundary_risks, entriesById),
    '',
  ].join('\n')

  await writeFile(OUTPUT_PATH, report, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})