import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildPricingAcceptanceGateEntries, type PricingAcceptanceGateEntry } from '@/server/pricing/pricingAcceptanceGateDraft'

const OUTPUT_PATH = resolve(process.cwd(), 'docs/workbook-pricing-acceptance-gate.md')

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatGateTable(entries: PricingAcceptanceGateEntry[]): string {
  const header = [
    'gate_id',
    'scope',
    'release_mode',
    'sample_count',
    'expected_boundary',
    'actual_boundaries',
    'worst_sample_id',
    'worst_gap_ratio',
    'tolerance_band',
    'acceptance_status',
    'status_note',
  ]

  const divider = header.map(() => '---')
  const rows = entries.map((entry) => [
    entry.gate_id,
    entry.scope,
    entry.release_mode,
    String(entry.sample_count),
    entry.expected_boundary,
    entry.actual_boundaries,
    entry.worst_sample_id,
    formatRatio(entry.worst_gap_ratio),
    entry.tolerance_band,
    entry.acceptance_status,
    entry.status_note,
  ])

  return [header, divider, ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n')
}

async function main() {
  const entries = buildPricingAcceptanceGateEntries()
  const componentEntries = entries.filter((entry) => entry.scope === 'component')
  const orderEntries = entries.filter((entry) => entry.scope === 'order')
  const blockedEntries = entries.filter((entry) => entry.acceptance_status === 'blocked')
  const guardrailedEntries = entries.filter((entry) => entry.acceptance_status === 'guardrailed')
  const acceptedEntries = entries.filter((entry) => entry.acceptance_status === 'accepted')

  const report = [
    '# Workbook Pricing Acceptance Gate',
    '',
    '当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文件是 acceptance 证据，不单独定义业务 release 边界。',
    '',
    '这份 gate 不是新样本池，而是把当前 workbook calibration / order alignment 的代表样本压成可发布判断。',
    '',
    '判断规则：',
    '- component tolerance: close <= 5%，acceptable <= 12%，其余 review。',
    '- order tolerance: close <= 1.5%，acceptable <= 3%，其余 review。',
    '- acceptance_status: tolerance 为 review 或 boundary 不匹配时 blocked；tolerance 为 acceptable 时 guardrailed；其余为 accepted。',
    '',
    '## 组件路径 Gate',
    '',
    formatGateTable(componentEntries),
    '',
    '## 整单路径 Gate',
    '',
    formatGateTable(orderEntries),
    '',
    '## Accepted',
    ...acceptedEntries.map((entry, index) => `${index + 1}. ${entry.gate_id}: ${entry.release_mode}，worst ${entry.worst_sample_id}，gap ${formatRatio(entry.worst_gap_ratio)}。`),
    '',
    '## Guardrailed',
    ...(guardrailedEntries.length
      ? guardrailedEntries.map((entry, index) => `${index + 1}. ${entry.gate_id}: ${entry.release_mode}，worst ${entry.worst_sample_id}，gap ${formatRatio(entry.worst_gap_ratio)}。`)
      : ['1. 当前无 guardrailed gate。']),
    '',
    '## Blocked',
    ...(blockedEntries.length
      ? blockedEntries.map((entry, index) => `${index + 1}. ${entry.gate_id}: ${entry.release_mode}，worst ${entry.worst_sample_id}，gap ${formatRatio(entry.worst_gap_ratio)}。`)
      : ['1. 当前无 blocked gate。']),
    '',
  ].join('\n')

  await writeFile(OUTPUT_PATH, report, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})