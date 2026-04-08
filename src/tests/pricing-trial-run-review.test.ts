import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  PRICING_TRIAL_RUN_REVIEW_DRAFT,
  PRICING_TRIAL_RUN_REVIEW_DOC_PATH,
  PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS,
} from '@/server/pricing/pricingTrialRunReviewDraft'
import { PRICING_TRIAL_RELEASE_ENTRIES } from '@/server/pricing/pricingTrialReleaseGateDraft'

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

console.log('\n=== Pricing Trial Run Review 回归测试 ===\n')

test('trial run draft 应覆盖全部 canonical representative scenarios 且 runtime 对齐', () => {
  assert(PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.length === PRICING_TRIAL_RELEASE_ENTRIES.length, 'draft 应覆盖全部 canonical representative scenarios')
  assert(PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.every((item) => item.runtimeAligned), '全部 canonical representative scenarios 应继续与 runtime decision 对齐')
})

test('trial run draft 指标应与当前代表样本总量一致', () => {
  const runtimeCards = PRICING_TRIAL_RUN_REVIEW_DRAFT.overview.runtimeMetrics
  const reviewCards = PRICING_TRIAL_RUN_REVIEW_DRAFT.overview.reviewMetrics
  const runtimeTotal = runtimeCards.reduce((sum, item) => sum + item.count, 0)

  assert(runtimeTotal === PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.length, 'quoted / estimated / handoff 总量应等于代表样本总量')
  assert(reviewCards.find((item) => item.label === '进入 review queue')?.count === 10, '当前内部 trial queue 进入量应为 10')
  assert(reviewCards.find((item) => item.label === '人工确认')?.count === 2, 'manual confirmation 数应保持为 2')
  assert(reviewCards.find((item) => item.label === '保留参考报价')?.count === 3, 'returned_as_estimate 数应保持为 3')
  assert(reviewCards.find((item) => item.label === '转人工处理')?.count === 5, 'handoff_to_human 数应保持为 5')
  assert(PRICING_TRIAL_RUN_REVIEW_DRAFT.recommendation.primaryTrack === 'operations_and_delivery_optimization', '当前 trial 复盘主线应切到真实反馈与运营落地')
  assert(PRICING_TRIAL_RUN_REVIEW_DRAFT.recommendation.primaryTrackLabel.includes('真实反馈'), '主线标签应强调真实反馈收集')
  assert(PRICING_TRIAL_RUN_REVIEW_DRAFT.coverageCandidates[0]?.label === 'printed/custom foil_bag', '第一优先级应切换为 printed/custom foil_bag')
  assert(PRICING_TRIAL_RUN_REVIEW_DRAFT.coverageCandidates[1]?.label === 'printed carton_packaging（非标准 printed / bundle）', '第二优先级应为更宽非白名单 printed carton 边界')
})

test('trial run review markdown 应覆盖关键结论与推荐主线', () => {
  const markdown = readFileSync(resolve(process.cwd(), PRICING_TRIAL_RUN_REVIEW_DOC_PATH), 'utf8')

  assert(markdown.includes('trial 运营落地与真实反馈收集'), 'markdown 应明确给出 trial ops 主线')
  assert(markdown.includes('quoted 抽检留痕仍是盲区'), 'markdown 应覆盖真实 trial blocker')
  assert(markdown.includes('window_box no-film'), 'markdown 应明确讨论 window_box no-film')
  assert(markdown.includes('不扩模板、不扩 coverage、不改 pricing kernel'), 'markdown 应明确当前保持 pricing freeze')
  assert(markdown.includes('连续 10 单正式报价反馈出现同源同向 drift'), 'markdown 应明确 calibration reopen trigger')
  assert(markdown.includes('generic / proxy 多配件标准 bundle'), 'markdown 应覆盖多配件 guardrail 继续保守的结论')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
console.log(`总计: ${passed}/${results.length} 通过`)

if (passed !== results.length) {
  process.exit(1)
}