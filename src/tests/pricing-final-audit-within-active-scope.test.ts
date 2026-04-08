import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PRICING_TRIAL_RELEASE_ENTRIES } from '@/server/pricing/pricingTrialReleaseGateDraft'
import {
  PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DOC_PATH,
  PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT,
} from '@/server/pricing/pricingFinalAuditWithinActiveScopeDraft'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, error: message })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${message}`)
  }
}

console.log('\n=== Active Quoted Scope Final Pricing Audit 回归测试 ===\n')

test('final audit draft 应严格冻结当前 active quoted scope', () => {
  const quotedItems = PRICING_TRIAL_RELEASE_ENTRIES
    .filter((entry) => entry.bucket === 'allowed_quoted_in_trial' && entry.scopeType === 'item')
    .map((entry) => entry.label)
  const quotedBundles = PRICING_TRIAL_RELEASE_ENTRIES
    .filter((entry) => entry.bucket === 'allowed_quoted_in_trial' && entry.scopeType === 'bundle')
    .map((entry) => entry.label)

  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.scopeFreeze.activeQuotedItemPaths.length === quotedItems.length,
    'draft 应覆盖全部 active quoted item paths',
  )
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.scopeFreeze.activeQuotedBundlePaths.length === quotedBundles.length,
    'draft 应覆盖全部 active quoted bundle paths',
  )
  assert(
    quotedItems.every((label) => PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.scopeFreeze.activeQuotedItemPaths.includes(label)),
    'draft 应完整包含当前 active quoted item scope',
  )
  assert(
    quotedBundles.every((label) => PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.scopeFreeze.activeQuotedBundlePaths.includes(label)),
    'draft 应完整包含当前 active quoted bundle scope',
  )
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.scopeFreeze.doNotDo.includes('不扩新模板。'),
    'draft 应明确不扩新模板',
  )
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.scopeFreeze.doNotDo.includes('不继续做交付层功能扩张。'),
    'draft 应明确不继续做交付层扩张',
  )
})

test('final audit draft 应明确当前 quoted scope 已足够接近 Excel，并给出 stop rule', () => {
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.explicitJudgement.canSaySameParamsNearExcel === true,
    'draft 应明确当前可以说同参数下接近 Excel',
  )
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.explicitJudgement.shouldChangePricingCodeNow === false,
    'draft 应明确当前不应继续改 pricing 代码',
  )
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.shouldStopPricingCalibrationNow === true,
    'draft 应明确当前应停止报价层继续细调',
  )
  assert(
    PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.stopRules.filter((item) => item.status === 'met').length >= 4,
    'draft 应明确当前 stop rule 主要条件已满足',
  )
})

test('final audit draft 应只聚焦当前 active quoted scope 内的 Top 3 residual source', () => {
  const topGapSources = PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT.topGapSources

  assert(topGapSources.length === 3, 'Top gap source 应固定为 3 个')
  assert(topGapSources[0]?.id === 'carton_outer_carton_rate', '第一优先级应为 carton_outer_carton_rate')
  assert(topGapSources[1]?.id === 'sticker_processing', '第二优先级应为 sticker_processing')
  assert(topGapSources[2]?.id === 'bundle_main_box_path', '第三优先级应为 bundle_main_box_path')
  assert(
    topGapSources.every((item) => item.action === 'stop_here_and_monitor' || item.action === 'reopen_only_if_repeated_real_drift'),
    'Top gap source 当前只应落到 stop/monitor 口径，而不是继续顺手扩范围',
  )
})

test('final audit markdown 应覆盖最终判断、Top 3 residual source 和 stop rule', () => {
  const markdown = readFileSync(resolve(process.cwd(), PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DOC_PATH), 'utf8')

  assert(markdown.includes('Active Quoted Scope Final Pricing Audit'), 'markdown 应有 final pricing audit 标题')
  assert(markdown.includes('当前 active quoted scope 已经足够接近 Excel/workbook'), 'markdown 应明确当前 quoted scope 已足够接近 Excel')
  assert(markdown.includes('carton_outer_carton_rate'), 'markdown 应覆盖 carton_outer_carton_rate')
  assert(markdown.includes('sticker_processing'), 'markdown 应覆盖 sticker_processing')
  assert(markdown.includes('bundle_main_box_path'), 'markdown 应覆盖 bundle_main_box_path')
  assert(markdown.includes('未来 10+ 连续真实 quoted 订单在同一误差源上出现同向漂移'), 'markdown 应覆盖 calibration reopen 条件')
  assert(markdown.includes('不扩 coverage'), 'markdown 应明确这轮不扩 coverage')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
console.log(`总计: ${passed}/${results.length} 通过`)

if (passed !== results.length) {
  process.exit(1)
}