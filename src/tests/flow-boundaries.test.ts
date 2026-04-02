import {
  canKnowledgeIntentOfferRecommendation,
  canPatchRecommendation,
  canRecommendationEnterQuote,
  getIntentBoundary,
  getIntentPrimaryLayer,
  isImmediateHandoffIntent,
  isNonQuoteFlowIntent,
} from '@/server/catalog/flowBoundaries'

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
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${error}`)
  }
}

console.log('\n=== 知识层与规则层边界回归测试 ===\n')

test('材料咨询应归到知识层，并允许过渡到推荐层', () => {
  assert(getIntentPrimaryLayer('MATERIAL_CONSULTATION') === 'knowledge', '材料咨询应归到知识层')
  assert(canKnowledgeIntentOfferRecommendation('MATERIAL_CONSULTATION'), '材料咨询应允许输出推荐方案')
})

test('标准方案推荐应归到推荐层，并允许进入报价层', () => {
  assert(getIntentPrimaryLayer('SOLUTION_RECOMMENDATION') === 'recommendation', '标准方案推荐应归到推荐层')
  assert(getIntentBoundary('SOLUTION_RECOMMENDATION').crossesTo?.includes('pricing_routing'), '标准方案推荐应允许后续进入报价层')
})

test('推荐方案确认应允许从推荐进入报价', () => {
  assert(getIntentPrimaryLayer('RECOMMENDATION_CONFIRMATION') === 'recommendation', '推荐确认应归到推荐层')
  assert(canRecommendationEnterQuote('RECOMMENDATION_CONFIRMATION'), '推荐确认应能进入报价')
})

test('参数补充默认归报价层，但允许作为推荐 patch', () => {
  assert(getIntentPrimaryLayer('PARAM_SUPPLEMENT') === 'pricing_routing', '参数补充默认应归报价层')
  assert(canPatchRecommendation('PARAM_SUPPLEMENT'), '参数补充应允许作为推荐 patch')
})

test('文件、人工、投诉应优先转人工', () => {
  assert(isImmediateHandoffIntent('FILE_REVIEW_REQUEST'), '文件审稿应优先转人工')
  assert(isImmediateHandoffIntent('HUMAN_REQUEST'), '人工请求应优先转人工')
  assert(isImmediateHandoffIntent('COMPLAINT'), '投诉应优先转人工')
})

test('报价主链路 intent 不应被归为非报价流', () => {
  assert(!isNonQuoteFlowIntent('QUOTE_REQUEST'), '报价请求不应落入非报价流')
  assert(!isNonQuoteFlowIntent('PARAM_SUPPLEMENT'), '参数补充不应落入非报价流')
  assert(!isNonQuoteFlowIntent('RECOMMENDATION_CONFIRMATION'), '推荐确认不应落入非报价流')
})

test('进度查询应作为强制短路流处理', () => {
  assert(isNonQuoteFlowIntent('PROGRESS_INQUIRY'), '进度查询应直接走非报价短路流')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)