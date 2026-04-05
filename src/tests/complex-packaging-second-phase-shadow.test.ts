import { buildComplexPackagingSecondPhaseShadow } from '@/server/packaging/complexPackagingSecondPhaseShadow'

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

console.log('\n=== Second-Phase shadow payload 测试 ===\n')

test('首批范围内的双插盒会生成 shadow payload', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '双插盒，7*5*5CM，350克白卡，四色，啤+粘，5000',
    phaseOneProductType: 'tuck_end_box',
    phaseOneStatus: 'quoted',
  })

  assert(Boolean(payload), '应生成 shadow payload')
  assert(payload?.inInitialScope === true, '应属于首批范围')
  assert(payload?.packagingType === 'tuck_end_box', '应归并为 tuck_end_box')
  assert(payload?.diffSummary.familyMergeAligned === true, '应保留 family merge 对齐结果')
  assert(payload?.diffSummary.packagingTypeAligned === true, '应与 phase-one 主类一致')
  assert(payload?.diffSummary.statusAligned === true, '应与 phase-one 状态一致')
})

test('存在非阻塞未知术语时可在 diffSummary 看见状态差异和关键术语', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '普通彩盒，7*5*5CM，350克白卡，四色，啤+粘，5000，备注：CJ03',
    phaseOneProductType: 'window_box',
    phaseOneStatus: 'quoted',
  })

  assert(Boolean(payload), '应生成 shadow payload')
  assert(payload?.diffSummary.packagingTypeAligned === false, '应能看出主类归并不一致')
  assert(payload?.diffSummary.statusAligned === false, '应能看出状态判断不一致')
  assert(payload?.diffSummary.keyUnresolvedTerms.includes('CJ03') === true, '应保留关键未识别术语')
  assert(payload?.usedForResponse === false, 'shadow payload 不应直接用于对外响应')
})

test('延期结构会生成 deferred shadow payload', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '开窗彩盒，21*17*31cm，400克单铜，四色，开窗贴0.2APET，啤+粘，500',
    phaseOneProductType: 'window_box',
    phaseOneStatus: 'estimated',
  })

  assert(Boolean(payload), '应生成 shadow payload')
  assert(payload?.deferred === true, '延期结构应标记 deferred')
  assert(payload?.shadowStatus === 'handoff_required', '延期结构应保持 handoff')
})

test('非包装消息不会生成 shadow payload', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '帮我查一下物流进度',
    phaseOneStatus: 'estimated',
  })

  assert(payload === null, '非包装消息不应生成 shadow payload')
})

test('真实窗口片复合串会在 shadow payload 中保留 estimated 差异', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '普通彩盒，展开21*14cm，成品7*5*5CM，300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+贴窗口片+粘 配内卡*1，5000',
    phaseOneProductType: 'folding_carton',
    phaseOneStatus: 'quoted',
  })

  assert(Boolean(payload), '应生成 shadow payload')
  assert(payload?.shadowStatus === 'estimated', '窗口片组合应在 shadow 中降为 estimated')
  assert(payload?.statusReasons.includes('unsupported_window_feature') === true, '应标记 unsupported_window_feature')
  assert(payload?.lineItems.some((line) => line.lineCode === 'manual_adjustment') === true, '应保留人工修正项')
  assert(payload?.diffSummary.manualAdjustmentPresent === true, '应显式记录 manual_adjustment 是否出现')
  assert(payload?.diffSummary.statusAligned === false, '应与 phase-one quoted 形成状态差异')
  assert(payload?.diffSummary.enteredDeferredOrHandoff === false, '窗口片 estimated 仍不应被误记为 handoff/deferred')
})

test('reinforced folding carton 会在 shadow payload 中保留 estimated 差异', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '公仔包装彩盒，28*19.5*9CM，350g白卡裱W9+110g+四色印刷+过哑胶+啤，2500',
    phaseOneProductType: 'window_box',
    phaseOneStatus: 'quoted',
  })

  assert(Boolean(payload), '应生成 reinforced folding carton shadow payload')
  assert(payload?.packagingType === 'folding_carton', '应归并到 folding_carton')
  assert(payload?.shadowStatus === 'estimated', 'reinforced folding carton 应保持 estimated')
  assert(payload?.statusReasons.includes('reinforced_folding_carton_boundary') === true, '应标记 reinforced folding carton 边界')
  assert(payload?.diffSummary.statusAligned === false, '应与 phase-one quoted 形成状态差异')
})

test('特材代号复合串会在 shadow payload 中直接 handoff', () => {
  const payload = buildComplexPackagingSecondPhaseShadow({
    message: '普通彩盒，7*5*5CM，350g单白+K636K+啤+粘，5000',
    phaseOneProductType: 'folding_carton',
    phaseOneStatus: 'quoted',
  })

  assert(Boolean(payload), '应生成 shadow payload')
  assert(payload?.shadowStatus === 'handoff_required', '特材代号应直接 handoff')
  assert(payload?.statusReasons.includes('unsupported_material_code') === true, '应标记 unsupported_material_code')
  assert(payload?.lineItems.some((line) => line.lineCode === 'manual_adjustment') === true, '应保留人工修正项')
  assert(payload?.diffSummary.statusAligned === false, '应与 phase-one quoted 形成状态差异')
  assert(payload?.diffSummary.enteredDeferredOrHandoff === true, 'handoff 样本应显式记录进入 deferred/handoff 观察')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}