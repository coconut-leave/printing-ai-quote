import { getKnowledgeCardsByCategory, resolveKnowledgeCard } from '@/server/knowledge/registry'

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

console.log('\n=== 知识层 registry 回归测试 ===\n')

test('MATERIAL: 应存在材料类知识卡片', () => {
  const cards = getKnowledgeCardsByCategory('MATERIAL')
  assert(cards.length >= 15, '材料类至少应包含扩充后的多张知识卡片')
  assert(cards.some((card) => card.title.includes('铜版纸')), '应包含铜版纸知识')
  assert(cards.some((card) => card.title.includes('白卡纸')), '应包含白卡纸知识')
  assert(cards.some((card) => card.id === 'material-weight-128'), '应包含 128g 克重知识')
  assert(cards.some((card) => card.id === 'material-weight-300'), '应包含 300g 克重知识')
  assert(cards.some((card) => card.id === 'material-kraft-paper'), '应包含牛皮纸知识')
  assert(cards.some((card) => card.id === 'material-poster-paper-choice'), '应包含海报纸张知识')
})

test('MATERIAL: 白卡纸问题应命中白卡纸知识卡片', () => {
  const card = resolveKnowledgeCard('MATERIAL_CONSULTATION', '白卡纸适合做名片吗？')
  assert(card?.id === 'material-white-card-paper', '应命中白卡纸知识卡片')
  assert(card?.recommendedParams?.paperWeight === 300, '应包含白卡纸常见名片克重')
})

test('MATERIAL: 128g 问题应命中 128g 克重知识卡片', () => {
  const card = resolveKnowledgeCard('MATERIAL_CONSULTATION', '128g 铜版纸一般适合做什么？')
  assert(card?.id === 'material-weight-128', '应命中 128g 克重知识卡片')
})

test('PROCESS: 骑马钉与胶装应能命中工艺知识卡片', () => {
  const card = resolveKnowledgeCard('PROCESS_CONSULTATION', '骑马钉和胶装哪个好？')
  assert(card?.id === 'process-binding-comparison', '应命中装订工艺对比卡片')
})

test('PROCESS: 覆膜问题应命中覆膜知识卡片', () => {
  const card = resolveKnowledgeCard('PROCESS_CONSULTATION', '海报加哑膜和光膜有什么区别？')
  assert(card?.id === 'process-lamination', '应命中覆膜知识卡片')
  assert(card?.recommendedParams?.lamination === 'matte', '应包含常见覆膜推荐')
})

test('PROCESS: 胶装适用场景应命中胶装场景卡片', () => {
  const card = resolveKnowledgeCard('PROCESS_CONSULTATION', '胶装一般更适合什么场景？')
  assert(card?.id === 'process-perfect-bind-usage', '应命中胶装适用场景卡片')
})

test('SPEC: 名片尺寸问题应命中规格知识卡片', () => {
  const card = resolveKnowledgeCard('SPEC_RECOMMENDATION', '名片常见尺寸是多少？')
  assert(card?.id === 'spec-business-card-size', '应命中名片规格卡片')
  assert(card?.recommendedParams?.finishedSize === '90x54mm', '应包含名片推荐尺寸')
})

test('SPEC: 海报尺寸问题应命中海报规格卡片', () => {
  const card = resolveKnowledgeCard('SPEC_RECOMMENDATION', '海报常见尺寸一般怎么选？')
  assert(card?.id === 'spec-poster-size', '应命中海报规格卡片')
})

test('SOLUTION: 标准方案问题应命中方案知识卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '推荐一个常见标准方案')
  assert(card?.id === 'solution-general-standard', '应命中通用标准方案卡片')
  assert(Boolean(card?.recommendedParams), '标准方案卡片应附带 recommendedParams')
})

test('SOLUTION: 企业宣传册问题应命中企业宣传册方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '企业宣传册有什么常见方案？')
  assert(card?.id === 'solution-company-album-standard', '应命中企业宣传册方案卡片')
  assert(card?.recommendedParams?.bindingType === 'perfect_bind', '应包含企业宣传册常见装订')
})

test('SOLUTION: 产品目录问题应命中产品目录方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '产品目录和招商册有什么常见方案？')
  assert(card?.id === 'solution-catalog-standard', '应命中产品目录方案卡片')
})

test('SOLUTION: 展会传单问题应命中展会传单方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '展会传单推荐一个常见方案')
  assert(card?.id === 'solution-tradeshow-flyer-standard', '应命中展会传单方案卡片')
})

test('SOLUTION: 企业宣传册预算有限时应命中经济方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '企业宣传册预算有限，推荐一个经济一点的方案')
  assert(card?.id === 'solution-company-album-economy', '应命中企业宣传册经济方案卡片')
  assert(card?.recommendedParams?.innerWeight === 128, '应返回更经济的内页克重')
  assert(card?.recommendedParams?.bindingType === 'saddle_stitch', '应返回更经济的装订方式')
})

test('SOLUTION: 普通画册更便宜一点时应命中通用经济方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '画册再推荐一个更便宜一点的方案')
  assert(card?.id === 'solution-album-economy', '应命中通用画册经济方案卡片')
  assert(card?.recommendedParams?.pageCount === 24, '应返回更经济的画册页数')
})

test('SOLUTION: 活动传单预算有限时应命中活动经济方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '开业活动传单预算有限，推荐一个便宜一点的方案')
  assert(card?.id === 'solution-event-flyer-economy', '应命中活动传单经济方案卡片')
  assert(card?.recommendedParams?.finishedSize === 'A5', '应返回更经济的活动传单尺寸')
  assert(card?.recommendedParams?.printSides === 'single', '应返回更经济的单面印刷方案')
})

test('SOLUTION: 商务名片应命中商务场景方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '推荐一个商务名片方案')
  assert(card?.id === 'solution-business-card-business', '应命中商务名片方案卡片')
  assert(card?.recommendedParams?.finishType === 'uv', '应返回更正式的商务名片工艺')
})

test('SOLUTION: 名片预算有限时应命中经济名片方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '名片预算有限，便宜一点的方案怎么配')
  assert(card?.id === 'solution-business-card-economy', '应命中经济名片方案卡片')
  assert(card?.recommendedParams?.paperWeight === 250, '应返回更经济的名片克重')
  assert(card?.recommendedParams?.finishType === 'none', '应返回无额外工艺的经济方案')
})

test('SOLUTION: 海报问题应命中海报方案卡片', () => {
  const card = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', '海报常见标准方案是什么？')
  assert(card?.id === 'solution-poster-standard', '应命中海报标准方案卡片')
  assert(card?.recommendedParams?.paperWeight === 157, '应包含海报常见克重')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)