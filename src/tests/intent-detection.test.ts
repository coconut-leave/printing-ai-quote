import { detectIntent } from '@/server/intent/detectIntent'

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

console.log('\n=== Intent 检测回归测试 ===\n')

test('QUOTE_REQUEST: 标准报价询问', () => {
  const result = detectIntent({ message: '我想印1000本A4画册，多少钱？' })
  assert(result.intent === 'QUOTE_REQUEST', '应识别为 QUOTE_REQUEST')
})

test('PARAM_SUPPLEMENT: 缺参会话中的补参消息', () => {
  const result = detectIntent({
    message: '32页，157g铜版纸，骑马钉',
    conversationStatus: 'MISSING_FIELDS',
    hasHistoricalParams: true,
  })
  assert(result.intent === 'PARAM_SUPPLEMENT', '应识别为 PARAM_SUPPLEMENT')
})

test('RECOMMENDATION_CONFIRMATION: 咨询后直接按推荐方案报价', () => {
  const result = detectIntent({
    message: '按这个方案报价',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'RECOMMENDATION_CONFIRMATION', '应识别为 RECOMMENDATION_CONFIRMATION')
})

test('RECOMMENDATION_CONFIRMATION: 咨询后修改一个参数再报价', () => {
  const result = detectIntent({
    message: '改成胶装再报价',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'RECOMMENDATION_CONFIRMATION', '应识别为 RECOMMENDATION_CONFIRMATION')
})

test('RECOMMENDATION_CONFIRMATION: 咨询后修改多个参数再报价', () => {
  const result = detectIntent({
    message: '页数改成40页，封面还是200g，再算一下',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'RECOMMENDATION_CONFIRMATION', '应识别为 RECOMMENDATION_CONFIRMATION')
})

test('RECOMMENDATION_CONFIRMATION: 咨询后确认并先估价', () => {
  const result = detectIntent({
    message: '可以，先估一下',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'RECOMMENDATION_CONFIRMATION', '应识别为 RECOMMENDATION_CONFIRMATION')
})

test('PARAM_SUPPLEMENT: 推荐方案上下文中的 patch 型补充', () => {
  const result = detectIntent({
    message: '页数改成40',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'PARAM_SUPPLEMENT', '应识别为 PARAM_SUPPLEMENT')
})

test('RECOMMENDATION_CONFIRMATION: 推荐方案上下文中的明确报价触发', () => {
  const result = detectIntent({
    message: '现在算一下',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'RECOMMENDATION_CONFIRMATION', '应识别为 RECOMMENDATION_CONFIRMATION')
})

test('非 RECOMMENDATION_CONFIRMATION: 继续咨询其他推荐方案', () => {
  const result = detectIntent({
    message: '还有别的推荐方案吗？',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'SOLUTION_RECOMMENDATION', '应继续识别为咨询型方案推荐')
})

test('非 RECOMMENDATION_CONFIRMATION: 继续咨询更便宜方案', () => {
  const result = detectIntent({
    message: '你再推荐一个便宜一点的',
    hasRecommendedParams: true,
  })
  assert(result.intent !== 'RECOMMENDATION_CONFIRMATION', '不应误识别为 RECOMMENDATION_CONFIRMATION')
})

test('推荐上下文中: 不要这个方案，再推荐一个更便宜的', () => {
  const result = detectIntent({
    message: '不要这个方案，再推荐一个更便宜的',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'BARGAIN_REQUEST', '应识别为 BARGAIN_REQUEST 以触发重推荐')
})

test('推荐上下文中: 给我一个更常见的方案', () => {
  const result = detectIntent({
    message: '给我一个更常见的方案',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'SOLUTION_RECOMMENDATION', '应识别为 SOLUTION_RECOMMENDATION 以触发重推荐')
})

test('推荐上下文中: 来个适合企业宣传册的版本', () => {
  const result = detectIntent({
    message: '来个适合企业宣传册的版本',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'SOLUTION_RECOMMENDATION', '应识别为 SOLUTION_RECOMMENDATION')
})

test('非 RECOMMENDATION_CONFIRMATION: 继续知识问答', () => {
  const result = detectIntent({
    message: '先说说胶装和骑马钉区别',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'PROCESS_CONSULTATION', '应继续识别为工艺咨询')
})

test('非 RECOMMENDATION_CONFIRMATION: 模糊确认但没有报价意图', () => {
  const result = detectIntent({
    message: '嗯可以',
    hasRecommendedParams: true,
  })
  assert(result.intent === 'UNKNOWN', '模糊确认不应直接进入报价链路')
})

test('非 RECOMMENDATION_CONFIRMATION: 没有 recommendedParams 时按这个来也不应命中', () => {
  const result = detectIntent({
    message: '按这个来',
    hasRecommendedParams: false,
  })
  assert(result.intent !== 'RECOMMENDATION_CONFIRMATION', '没有 recommendedParams 时不应进入 RECOMMENDATION_CONFIRMATION')
})

test('FILE_REVIEW_REQUEST: 文件审稿请求', () => {
  const result = detectIntent({ message: '我有PDF设计稿，帮我看看并报价' })
  assert(result.intent === 'FILE_REVIEW_REQUEST', '应识别为 FILE_REVIEW_REQUEST')
})

test('HUMAN_REQUEST: 主动要求人工', () => {
  const result = detectIntent({ message: '帮我转人工客服' })
  assert(result.intent === 'HUMAN_REQUEST', '应识别为 HUMAN_REQUEST')
})

test('BARGAIN_REQUEST: 议价请求', () => {
  const result = detectIntent({ message: '这个价格能不能再便宜点' })
  assert(result.intent === 'BARGAIN_REQUEST', '应识别为 BARGAIN_REQUEST')
})

test('PROGRESS_INQUIRY: 进度咨询', () => {
  const result = detectIntent({ message: '报价到哪了，什么时候能出？' })
  assert(result.intent === 'PROGRESS_INQUIRY', '应识别为 PROGRESS_INQUIRY')
})

test('MATERIAL_CONSULTATION: 纸张材料咨询不应误判为报价', () => {
  const result = detectIntent({ message: '157g 和 200g 铜版纸有什么区别？' })
  assert(result.intent === 'MATERIAL_CONSULTATION', '应识别为 MATERIAL_CONSULTATION')
})

test('PROCESS_CONSULTATION: 装订工艺咨询', () => {
  const result = detectIntent({ message: '骑马钉和胶装哪个好？' })
  assert(result.intent === 'PROCESS_CONSULTATION', '应识别为 PROCESS_CONSULTATION')
})

test('SPEC_RECOMMENDATION: 规格建议咨询', () => {
  const result = detectIntent({ message: 'A4 画册一般多少页比较合适？' })
  assert(result.intent === 'SPEC_RECOMMENDATION', '应识别为 SPEC_RECOMMENDATION')
})

test('SOLUTION_RECOMMENDATION: 方案推荐咨询', () => {
  const result = detectIntent({ message: '推荐一个常见标准方案' })
  assert(result.intent === 'SOLUTION_RECOMMENDATION', '应识别为 SOLUTION_RECOMMENDATION')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}
