import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PRICING_TRIAL_RELEASE_ENTRIES } from '@/server/pricing/pricingTrialReleaseGateDraft'
import {
  PRICING_PARITY_CLOSURE_REVIEW_DOC_PATH,
  PRICING_PARITY_CLOSURE_REVIEW_DRAFT,
} from '@/server/pricing/pricingParityClosureReviewDraft'

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

console.log('\n=== Pricing Parity Closure Review 回归测试 ===\n')

test('parity closure draft 应冻结当前 active quoted scope，而不是扩新范围', () => {
  const quotedItems = PRICING_TRIAL_RELEASE_ENTRIES
    .filter((entry) => entry.bucket === 'allowed_quoted_in_trial' && entry.scopeType === 'item')
    .map((entry) => entry.label)
  const quotedBundles = PRICING_TRIAL_RELEASE_ENTRIES
    .filter((entry) => entry.bucket === 'allowed_quoted_in_trial' && entry.scopeType === 'bundle')
    .map((entry) => entry.label)

  assert(PRICING_PARITY_CLOSURE_REVIEW_DRAFT.primaryTrack === 'parity_closure', '主线应切到 parity_closure')
  assert(
    PRICING_PARITY_CLOSURE_REVIEW_DRAFT.scopeFreeze.activeQuotedItemPaths.length === quotedItems.length,
    'draft 应覆盖全部 active quoted item paths',
  )
  assert(
    PRICING_PARITY_CLOSURE_REVIEW_DRAFT.scopeFreeze.activeQuotedBundlePaths.length === quotedBundles.length,
    'draft 应覆盖全部 active quoted bundle paths',
  )
  assert(
    quotedItems.every((label) => PRICING_PARITY_CLOSURE_REVIEW_DRAFT.scopeFreeze.activeQuotedItemPaths.includes(label)),
    'draft 应完整包含当前 active quoted item scope',
  )
  assert(
    quotedBundles.every((label) => PRICING_PARITY_CLOSURE_REVIEW_DRAFT.scopeFreeze.activeQuotedBundlePaths.includes(label)),
    'draft 应完整包含当前 active quoted bundle scope',
  )
  assert(
    PRICING_PARITY_CLOSURE_REVIEW_DRAFT.calibrationDecision.shouldChangePricingCodeNow === false,
    '当前 parity closure 结论不应要求继续改 pricing 公式',
  )
})

test('parity closure draft 应只聚焦 active quoted scope 内的 Top 3 gap source', () => {
  const topGapSources = PRICING_PARITY_CLOSURE_REVIEW_DRAFT.topGapSources

  assert(topGapSources.length === 3, 'Top gap source 应固定为 3 个')
  assert(topGapSources[0]?.id === 'carton_outer_carton_rate', '第一优先级应为 carton_outer_carton_rate')
  assert(topGapSources[1]?.id === 'sticker_processing', '第二优先级应为 sticker_processing')
  assert(topGapSources[2]?.id === 'bundle_main_box_path', '第三优先级应为 bundle_main_box_path')
  assert(topGapSources.every((item) => item.recommendedAction === 'monitor_only'), '当前 Top 3 gap source 只应进入观察，不应顺手扩范围')
})

test('parity closure markdown 应覆盖 freeze、Top 3 gap source、stop rule 和客服非主攻结论', () => {
  const markdown = readFileSync(resolve(process.cwd(), PRICING_PARITY_CLOSURE_REVIEW_DOC_PATH), 'utf8')

  assert(markdown.includes('scope freeze + parity closure'), 'markdown 应明确主线切到 scope freeze + parity closure')
  assert(markdown.includes('不扩新模板'), 'markdown 应明确不扩新模板')
  assert(markdown.includes('carton_outer_carton_rate'), 'markdown 应覆盖 carton_outer_carton_rate')
  assert(markdown.includes('sticker_processing'), 'markdown 应覆盖 sticker_processing')
  assert(markdown.includes('bundle_main_box_path'), 'markdown 应覆盖 bundle_main_box_path')
  assert(markdown.includes('未来 10+ 连续真实 quoted 订单在同一误差源上出现同向漂移'), 'markdown 应给出 stop rule')
  assert(markdown.includes('当前不是主攻方向'), 'markdown 应明确客服回复链路当前不是主攻方向')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
console.log(`总计: ${passed}/${results.length} 通过`)

if (passed !== results.length) {
  process.exit(1)
}