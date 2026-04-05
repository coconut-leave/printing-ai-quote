import { calculateSecondPhaseShadowQuote, listSecondPhaseLineCodes } from '@/server/pricing/complexPackagingSecondPhaseQuote'
import { extractComplexPackagingSecondPhaseDraft } from '@/server/packaging/extractComplexPackagingSecondPhase'

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

function getResult(message: string) {
  const request = extractComplexPackagingSecondPhaseDraft(message)
  assert(Boolean(request), '应识别 second-phase shadow 请求')
  return calculateSecondPhaseShadowQuote(request!)
}

console.log('\n=== Second-Phase 复杂包装 line-item 引擎测试 ===\n')

test('首批折叠彩盒可生成核心 line-items', () => {
  const result = getResult('双插盒，7*5*5CM，350克白卡，四色，过哑胶，啤+粘，5000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('face_paper'), '应生成面纸项')
  assert(lineCodes.includes('printing'), '应生成印刷费项')
  assert(lineCodes.includes('lamination'), '应生成覆膜项')
  assert(lineCodes.includes('die_mold'), '应生成刀模项')
  assert(lineCodes.includes('die_cut_machine'), '应生成啤机项')
  assert(lineCodes.includes('gluing'), '应生成粘盒项')
  assert(result.status === 'quoted', '首批模板完整时应允许 quoted shadow')
})

test('裱坑结构会生成 corrugated_core 与 backing_or_duplex', () => {
  const result = getResult('飞机盒，20*12*6CM，300克白卡+WE+120g芯，四色，裱+啤，1000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('corrugated_core'), '应生成坑纸/芯纸项')
  assert(lineCodes.includes('backing_or_duplex'), '应生成裱坑/对裱项')
})

test('普通飞机盒不应因 standalone 裱 强行生成 mounting line-items', () => {
  const result = getResult('飞机盒，28*24*6cm，400g白卡+4C+过光胶+裱+啤，1000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('corrugated_core') === false, '普通飞机盒不应生成 corrugated_core')
  assert(lineCodes.includes('backing_or_duplex') === false, '普通飞机盒不应生成 backing_or_duplex')
  assert(result.status === 'quoted', '普通飞机盒主路径应保持 quoted')
  assert(result.subtotal < 2500, '普通飞机盒 subtotal 应落回真实样本区间')
})

test('材质配方不完整时不勉强 quoted，而是 estimated', () => {
  const result = getResult('普通彩盒，7*5*5CM，四色，啤+粘，5000')
  assert(result.status === 'estimated', '缺少核心材料配方时应 estimated')
  assert(result.quotedChecks.coreMaterialRecipeComplete === false, '应标记核心材料配方不完整')
})

test('非阻塞未知术语存在时降为 estimated', () => {
  const result = getResult('普通彩盒，7*5*5CM，350克白卡，四色，啤+粘，5000，备注：CJ03')
  assert(result.status === 'estimated', '非阻塞未知术语存在时应 estimated')
})

test('blocking unknown term 会保持 handoff_required', () => {
  const result = getResult('飞机盒，20*12*6CM，300克白卡+Q9坑，四色，裱+啤，1000')
  assert(result.status === 'handoff_required', 'blocking unknown term 应 handoff')
})

test('延期结构不会被首批 line-item 模板强行 quoted', () => {
  const result = getResult('开窗彩盒，21*17*31cm，400克单铜，四色，开窗贴0.2APET，啤+粘，500')
  assert(result.status === 'handoff_required', '延期结构应保持 handoff')
})

test('真实复合裱坑串会生成更完整的核心 line-items', () => {
  const result = getResult('双插盒，展开18*12cm，成品7*5*5CM，350g白卡裱WE坑+2专+黑+覆哑膜+裱+啤+粘，5000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('face_paper'), '应生成面纸项')
  assert(lineCodes.includes('corrugated_core'), '应生成坑纸项')
  assert(lineCodes.includes('backing_or_duplex'), '应生成裱坑工费项')
  assert(lineCodes.includes('printing'), '应生成印刷费项')
  assert(lineCodes.includes('lamination'), '应生成覆膜项')
  assert(result.status === 'quoted', '稳定裱坑组合应保持 quoted shadow')
})

test('窗口片与配内卡组合会保留人工修正项并降为 estimated', () => {
  const result = getResult('普通彩盒，展开21*14cm，成品7*5*5CM，300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+贴窗口片+粘 配内卡*1，5000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('manual_adjustment'), '应生成人工修正项')
  assert(lineCodes.includes('backing_or_duplex'), '应保留对裱底纸项')
  assert(result.status === 'estimated', '窗口片首批应保持 estimated')
})

test('高复杂工艺组合保持 handoff 并保留人工修正项', () => {
  const result = getResult('普通彩盒，375银卡+UV印+逆向UV+激凸+局部UV+啤+粘盒，5000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('manual_adjustment'), '应生成人工修正项')
  assert(result.status === 'handoff_required', '高复杂工艺应保持 handoff')
  assert(result.quotedChecks.keyLineItemsComputable === false, '缺少稳定主计价条件时不应视为可完整计算')
})

test('特材代号保持 handoff 并输出人工修正项', () => {
  const result = getResult('普通彩盒，7*5*5CM，350g单白+K636K+啤+粘，5000')
  const lineCodes = listSecondPhaseLineCodes(result)
  assert(lineCodes.includes('manual_adjustment'), '特材代号应生成人工修正项')
  assert(result.status === 'handoff_required', '特材代号应保持 handoff')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}