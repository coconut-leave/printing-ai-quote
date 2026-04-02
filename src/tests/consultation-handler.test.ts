import { handleConsultationIntent } from '@/server/intent/handleConsultation'

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

console.log('\n=== 咨询回复回归测试 ===\n')

test('MATERIAL_CONSULTATION: 铜版纸介绍', () => {
  const result = handleConsultationIntent('MATERIAL_CONSULTATION', '铜版纸有什么特点？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.consultationIntent === 'MATERIAL_CONSULTATION', '应返回 consultationIntent')
  assert(result?.matchedKnowledgeCardId === 'material-coated-paper-generic', '应返回命中的 knowledge card id')
  assert(result?.matchedKnowledgeCardTitle === '铜版纸', '应返回命中的 knowledge card title')
  assert(result?.consultationCategory === 'MATERIAL', '应返回咨询类别')
  assert(result?.hasRecommendedParams === true, '应返回是否带 recommendedParams')
  assert(result?.reply.includes('铜版纸'), '应包含铜版纸说明')
  assert(result?.reply.includes('常见会先按') || result?.reply.includes('常见起步'), '应包含后续建议配置')
  assert(Boolean(result?.recommendedParams?.recommendedParams), '应返回推荐方案参数')
})

test('MATERIAL_CONSULTATION: 哑粉纸介绍', () => {
  const result = handleConsultationIntent('MATERIAL_CONSULTATION', '哑粉纸适合做什么？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.reply.includes('哑粉纸') || result?.reply.includes('哑光纸'), '应包含哑粉纸说明')
  assert(result?.recommendedParams?.recommendedParams?.coverPaper === 'matte', '应返回哑粉纸推荐方案')
})

test('MATERIAL_CONSULTATION: 白卡纸介绍', () => {
  const result = handleConsultationIntent('MATERIAL_CONSULTATION', '白卡纸适合做名片吗？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.reply.includes('白卡纸'), '应包含白卡纸说明')
  assert(result?.recommendedParams?.productType === 'business_card', '应返回白卡纸名片推荐方案')
})

test('MATERIAL_CONSULTATION: 128g 克重介绍', () => {
  const result = handleConsultationIntent('MATERIAL_CONSULTATION', '128g 铜版纸一般适合做什么？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.reply.includes('128g'), '应包含 128g 说明')
  assert(result?.recommendedParams?.recommendedParams?.paperWeight === 128, '应返回 128g 推荐方案')
})

test('PROCESS_CONSULTATION: 骑马钉与胶装区别', () => {
  const result = handleConsultationIntent('PROCESS_CONSULTATION', '骑马钉和胶装哪个好？')
  assert(result?.reply.includes('骑马钉'), '应包含骑马钉说明')
  assert(result?.reply.includes('胶装'), '应包含胶装说明')
})

test('PROCESS_CONSULTATION: 覆膜说明', () => {
  const result = handleConsultationIntent('PROCESS_CONSULTATION', '海报加哑膜和光膜有什么区别？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.reply.includes('覆膜') || result?.reply.includes('哑膜'), '应包含覆膜说明')
  assert(result?.recommendedParams?.productType === 'poster', '应返回海报覆膜推荐方案')
})

test('SPEC_RECOMMENDATION: A4 画册页数建议', () => {
  const result = handleConsultationIntent('SPEC_RECOMMENDATION', 'A4 画册一般多少页比较合适？')
  assert(result?.reply.includes('A4 画册'), '应包含 A4 画册建议')
  assert(result?.recommendedParams?.recommendedParams?.pageCount === 32, '应返回常见页数方案')
})

test('SOLUTION_RECOMMENDATION: 标准方案推荐', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '推荐一个常见标准方案')
  assert(result?.reply.includes('常见标准方案') || result?.reply.includes('常见会先按'), '应返回方案推荐')
  assert(result?.recommendedParams?.productType === 'album', '应返回结构化标准方案')
})

test('MATERIAL_CONSULTATION: 海报纸张问题应返回海报起步建议', () => {
  const result = handleConsultationIntent('MATERIAL_CONSULTATION', '海报一般用什么纸更合适？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.matchedKnowledgeCardId === 'material-poster-paper-choice', '应命中海报纸张卡片')
  assert(result?.recommendedParams?.productType === 'poster', '应返回海报起步方案')
})

test('SPEC_RECOMMENDATION: 产品目录页数问题应返回企业资料册建议', () => {
  const result = handleConsultationIntent('SPEC_RECOMMENDATION', '产品目录一般做多少页比较合适？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.matchedKnowledgeCardId === 'spec-company-album-pages', '应命中企业资料册页数卡片')
})

test('SOLUTION_RECOMMENDATION: 名片标准方案推荐', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '推荐一个名片常见标准方案')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.recommendedParams?.productType === 'business_card', '应返回名片标准方案')
  assert(result?.recommendedParams?.recommendedParams?.paperWeight === 300, '应返回名片常见克重')
})

test('SOLUTION_RECOMMENDATION: 企业宣传册常见方案推荐', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '企业宣传册有什么常见方案？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.recommendedParams?.productType === 'album', '应返回宣传册方案')
  assert(result?.recommendedParams?.recommendedParams?.bindingType === 'perfect_bind', '应返回企业宣传册常见胶装方案')
})

test('SOLUTION_RECOMMENDATION: 企业宣传册预算有限时应返回经济方案', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '企业宣传册预算有限，推荐一个经济一点的方案')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.recommendedParams?.recommendedParams?.innerWeight === 128, '应返回更经济的内页克重')
  assert(result?.recommendedParams?.recommendedParams?.bindingType === 'saddle_stitch', '应返回更经济的装订方式')
})

test('SOLUTION_RECOMMENDATION: 活动传单预算有限时应返回活动经济方案', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '开业活动传单预算有限，给我一个经济方案')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.recommendedParams?.productType === 'flyer', '应返回活动传单方案')
  assert(result?.recommendedParams?.recommendedParams?.finishedSize === 'A5', '应返回更经济的活动传单尺寸')
  assert(result?.recommendedParams?.recommendedParams?.printSides === 'single', '应返回更经济的活动传单单双面建议')
})

test('SOLUTION_RECOMMENDATION: 商务名片推荐应返回更正式方案', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '推荐一个商务名片方案')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.recommendedParams?.productType === 'business_card', '应返回商务名片方案')
  assert(result?.recommendedParams?.recommendedParams?.finishType === 'uv', '应返回更正式的商务名片工艺')
})

test('SOLUTION_RECOMMENDATION: 海报常见方案推荐', () => {
  const result = handleConsultationIntent('SOLUTION_RECOMMENDATION', '海报常见标准方案是什么？')
  assert(result?.status === 'consultation_reply', '应返回 consultation_reply')
  assert(result?.recommendedParams?.productType === 'poster', '应返回海报标准方案')
  assert(result?.recommendedParams?.recommendedParams?.paperWeight === 157, '应返回海报常见克重')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)
