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

console.log('\n=== Second-Phase 复杂包装抽取测试 ===\n')

test('普通彩盒可归并到 folding_carton', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，7*5*5CM，350克白卡，四色，啤+粘，5000')
  assert(Boolean(request), '应识别 second-phase shadow 请求')
  assert(request?.items[0].finishedGoods.packagingFamily === 'folding_carton', '应归并到 folding_carton')
  assert(request?.items[0].finishedGoods.packagingType === 'folding_carton', '应使用 folding_carton 过渡主类')
  assert(request?.recommendedStatus === 'quoted', '首批可计算时应允许进入 quoted shadow')
})

test('双插盒可归并到 tuck_end_box', () => {
  const request = extractComplexPackagingSecondPhaseDraft('双插盒，7*5*5CM，350克白卡，四色，啤+粘，5000')
  assert(Boolean(request), '应识别 second-phase shadow 请求')
  assert(request?.items[0].finishedGoods.packagingType === 'tuck_end_box', '应归并到 tuck_end_box')
  assert(request?.quotedChecks.packagingTypeResolved === true, '应视为主类已解析')
})

test('屏幕双插大盒应保持 tuck_end_box 主类，并拆出 variant tags', () => {
  const request = extractComplexPackagingSecondPhaseDraft('屏幕双插大盒，10*5.2*21.5CM，350克白卡，四色，啤+粘盒，2000')
  assert(Boolean(request), '应识别屏幕双插大盒')
  assert(request?.items[0].finishedGoods.packagingType === 'tuck_end_box', '主类应保持 tuck_end_box')
  assert(request?.items[0].finishedGoods.variantTags.includes('screen_style') === true, '应识别 screen_style')
  assert(request?.items[0].finishedGoods.variantTags.includes('large_box') === true, '应识别 large_box')
})

test('开窗双插盒应进入 window_box deferred，而不是掉回 tuck_end_box', () => {
  const request = extractComplexPackagingSecondPhaseDraft('开窗双插盒，11*12*9.5CM，纸板+开窗不贴胶片+啤成品+粘盒，2000')
  assert(Boolean(request), '应识别开窗双插盒')
  assert(request?.items[0].finishedGoods.packagingType === 'window_box', '开窗双插盒应落到 window_box')
  assert(request?.recommendedStatus === 'handoff_required', '开窗双插盒当前应保持 deferred/handoff')
})

test('挂钩彩盒可带 hanging_tab 变体标签', () => {
  const request = extractComplexPackagingSecondPhaseDraft('挂钩彩盒，9*3*12CM，300克白卡，四色，啤+粘，3000')
  assert(Boolean(request), '应识别挂钩彩盒')
  assert(request?.items[0].finishedGoods.variantTags.includes('hanging_tab') === true, '应带 hanging_tab 变体')
  assert(request?.items[0].finishedGoods.packagingFamily === 'folding_carton', '应归并到 folding_carton 家族')
})

test('普通飞机盒可归并到 mailer_box', () => {
  const request = extractComplexPackagingSecondPhaseDraft('飞机盒，20*12*6CM，300克白卡+WE+120g芯，四色，裱+啤，1000')
  assert(Boolean(request), '应识别飞机盒')
  assert(request?.items[0].finishedGoods.packagingType === 'mailer_box', '应归并到 mailer_box')
  assert(request?.items[0].materialRecipe.corrugationType === 'WE', '应识别 WE')
})

test('普通飞机盒中的 standalone 裱 不应误判为 corrugated mounting', () => {
  const request = extractComplexPackagingSecondPhaseDraft('飞机盒，28*24*6cm，400g白卡+4C+过光胶+裱+啤，1000')
  assert(Boolean(request), '应识别普通飞机盒')
  assert(request?.items[0].materialRecipe.mountingMode === undefined, '普通飞机盒的 standalone 裱 不应强行变成 corrugated mounting')
  assert(request?.items[0].materialRecipe.hasCorrugatedMounting === false, '不应误标 corrugated mounting')
  assert(request?.recommendedStatus === 'quoted', '普通飞机盒主路径应保持 quoted')
})

test('普通飞机盒里的 WE+120+4C 连写不应残留未知噪声', () => {
  const request = extractComplexPackagingSecondPhaseDraft('密胺麻将飞机盒，266x154.5x73mm，300g白卡+WE+120+4C+过哑胶+裱+啤，1000')
  assert(Boolean(request), '应识别带紧凑配方的普通飞机盒')
  assert(request?.items[0].unknownTerms.length === 0, 'WE+120+4C 连写不应残留 unknown term')
  assert(request?.recommendedStatus === 'quoted', 'WE+120 普通飞机盒应保持 quoted')
})

test('彩卡会被分流到 flat_print，不进入折叠彩盒首批范围', () => {
  const request = extractComplexPackagingSecondPhaseDraft('彩卡，210g白卡，4C，贴双面胶，5000')
  assert(Boolean(request), '应生成 shadow 请求用于分流')
  assert(request?.statusReasons.includes('flat_print_redirect') === true, '应标记为 flat_print redirect')
  assert(request?.recommendedStatus === 'estimated', '平面件分流默认 estimated')
})

test('开窗彩盒会进入 deferred_type，不进入首批 quoted', () => {
  const request = extractComplexPackagingSecondPhaseDraft('开窗彩盒，21*17*31cm，400克单铜，四色，开窗贴0.2APET，啤+粘，500')
  assert(Boolean(request), '应识别开窗彩盒')
  assert(request?.statusReasons.includes('deferred_packaging_type') === true, '应标记为 deferred type')
  assert(request?.recommendedStatus === 'handoff_required', '延期结构应直接 handoff')
})

test('未知坑型会触发 blocking unknown term 并 handoff', () => {
  const request = extractComplexPackagingSecondPhaseDraft('飞机盒，20*12*6CM，300克白卡+Q9坑，四色，裱+啤，1000')
  assert(Boolean(request), '应识别 second-phase shadow 请求')
  assert(request?.items[0].unknownTerms.some((term) => term.term === 'Q9坑' && term.severity === 'blocking') === true, '未知坑型应视为 blocking')
  assert(request?.recommendedStatus === 'handoff_required', '未知坑型应 handoff')
})

test('非关键大写代号只会降级为 estimated，不直接 handoff', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，7*5*5CM，350克白卡，四色，啤+粘，5000，备注：CJ03')
  assert(Boolean(request), '应识别 second-phase shadow 请求')
  assert(request?.items[0].unknownTerms.some((term) => term.term === 'CJ03' && term.severity === 'non_blocking') === true, 'CJ03 应视为非阻塞未知代号')
  assert(request?.recommendedStatus === 'estimated', '存在非阻塞未知代号时应降级 estimated')
})

test('真实复合串可识别裱坑、专色、黑墨与展开尺寸', () => {
  const request = extractComplexPackagingSecondPhaseDraft('双插盒，展开18*12cm，成品7*5*5CM，350g白卡裱WE坑+2专+黑+覆哑膜+裱+啤+粘，5000')
  assert(Boolean(request), '应识别真实复合串')
  assert(request?.items[0].materialRecipe.facePaperMaterial === 'white_card', '应识别白卡')
  assert(request?.items[0].materialRecipe.corrugationType === 'WE', '应识别 WE 坑')
  assert(request?.items[0].printProcess.spotColorCount === 2, '应识别 2 专')
  assert(request?.items[0].printProcess.blackInkIncluded === true, '应识别黑墨')
  assert(request?.items[0].printProcess.laminationType === 'matte', '应识别覆哑膜')
  assert(request?.items[0].productionDimensions.unfoldedLength === 18, '应识别展开长度')
  assert(request?.recommendedStatus === 'quoted', '首批稳定组合应保持 quoted shadow')
})

test('真实复合串中的窗口片与配内卡会降为 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，展开21*14cm，成品7*5*5CM，300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+贴窗口片+粘 配内卡*1，5000')
  assert(Boolean(request), '应识别窗口片复合串')
  assert(request?.items[0].materialRecipe.backingMaterial === 'white_card', '应识别对裱底纸材质')
  assert(request?.items[0].materialRecipe.backingWeight === 300, '应识别对裱底纸克重')
  assert(request?.items[0].printProcess.windowFilmRequired === true, '应识别窗口片需求')
  assert(request?.items[0].printProcess.processTags.includes('配内卡*1') === true, '应识别配内卡')
  assert(request?.statusReasons.includes('unsupported_window_feature') === true, '窗口片应标记 unsupported_window_feature')
  assert(request?.recommendedStatus === 'estimated', '窗口片组合首批应保持 estimated')
})

test('reinforced folding carton 的 W9 路径会保守保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('公仔包装彩盒，28*19.5*9CM，350g白卡裱W9+110g+四色印刷+过哑胶+啤，2500')
  assert(Boolean(request), '应识别 reinforced folding carton')
  assert(request?.items[0].materialRecipe.corrugationType === 'W9', '应识别 W9')
  assert(request?.items[0].materialRecipe.reinforcementWeight === 110, '应识别 110g 加强芯')
  assert(request?.statusReasons.includes('reinforced_folding_carton_boundary') === true, '应标记 reinforced folding carton 边界')
  assert(request?.recommendedStatus === 'estimated', 'W9 reinforced folding carton 当前应保守保持 estimated')
})

test('A9 加强芯普通彩盒会保守保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('内彩盒，10*10*23CM，300g白板纸裱A9加强芯+4C印刷+过哑膜+裱+啤+粘盒，625')
  assert(Boolean(request), '应识别 A9 加强芯普通彩盒')
  assert(request?.items[0].materialRecipe.corrugationType === 'A9', '应识别 A9')
  assert(request?.recommendedStatus === 'estimated', 'A9 reinforced folding carton 当前应先保持 estimated')
})

test('AE坑会被正式归一并保守保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，12*8*18CM，300g牛皮纸裱AE坑+印黑色+裱+啤，1200')
  assert(Boolean(request), '应识别 AE 坑样本')
  assert(request?.items[0].materialRecipe.corrugationType === 'AE', '应正式归一到 AE')
  assert(request?.recommendedStatus === 'estimated', 'AE 坑普通彩盒当前应保持 estimated')
})

test('reinforced mailer box 的 AE 路径会保守保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('防火风琴文件包飞机盒，365*270*53MM，300克牛纸+AE加强芯+印黑色+裱+啤，1000')
  assert(Boolean(request), '应识别 reinforced mailer box')
  assert(request?.items[0].finishedGoods.packagingType === 'mailer_box', '应归并到 mailer_box')
  assert(request?.items[0].materialRecipe.corrugationType === 'AE', '应识别 AE')
  assert(request?.statusReasons.includes('reinforced_mailer_box_boundary') === true, '应标记 reinforced mailer 边界')
  assert(request?.recommendedStatus === 'estimated', 'reinforced mailer 当前应保持 estimated')
})

test('白E高强芯会被正式归一并保守保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，20*15*6CM，350g白卡裱白E高强芯+4C印刷+过哑胶+啤，1500')
  assert(Boolean(request), '应识别 白E高强芯 样本')
  assert(request?.items[0].materialRecipe.corrugationType === 'E', '应正式归一到 E')
  assert(request?.recommendedStatus === 'estimated', '白E高强芯普通彩盒当前应保持 estimated')
})

test('已对裱普通彩盒会作为 pre-mounted 边界保守保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，9*6*16CM，350g白卡已对裱300g白卡+4C印刷+过哑胶+啤+粘盒，1800')
  assert(Boolean(request), '应识别 已对裱 普通彩盒')
  assert(request?.items[0].materialRecipe.mountingMode === 'pre_mounted', '应识别为 pre_mounted')
  assert(request?.recommendedStatus === 'estimated', '已对裱普通彩盒当前应保持 estimated')
})

test('无印刷普通盒会归入 blank_box 边界并保持 estimated', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，12*8*18CM，350g白卡+无印刷+啤+粘盒，2000')
  assert(Boolean(request), '应识别无印刷普通盒')
  assert(request?.items[0].finishedGoods.variantTags.includes('blank_box') === true, '应补 blank_box 变体')
  assert(request?.items[0].printProcess.frontPrintMode === 'none', '应识别无印刷')
  assert(request?.recommendedStatus === 'estimated', '无印刷普通盒当前应保持 estimated')
})

test('V槽会直接触发高复杂 handoff', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，12*8*18CM，350g白卡+4C印刷+过哑胶+V槽+啤+粘盒，2000')
  assert(Boolean(request), '应识别 V 槽样本')
  assert(request?.items[0].printProcess.processTags.includes('V槽') === true, '应识别 V槽')
  assert(request?.recommendedStatus === 'handoff_required', 'V槽 当前应直接 handoff')
})

test('品牌前缀 + 包装盒 + 过光油 仍能识别为 folding carton quoted', () => {
  const request = extractComplexPackagingSecondPhaseDraft('IRTUSDE 企鹅包装盒，80x80x120mm，350克白卡+4C印刷+过光油+啤+粘盒，2000')
  assert(Boolean(request), '应识别包装盒样本')
  assert(request?.items[0].finishedGoods.packagingType === 'folding_carton', '包装盒应归并到 folding_carton')
  assert(request?.recommendedStatus === 'quoted', '过光油普通彩盒不应因品牌英文前缀被误降 estimated')
})

test('真实复合串中的高复杂工艺会直接 handoff', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，375银卡+UV印+逆向UV+激凸+局部UV+啤+粘盒，5000')
  assert(Boolean(request), '应识别高复杂工艺复合串')
  assert(request?.items[0].materialRecipe.facePaperMaterial === 'silver_card', '应识别银卡')
  assert(request?.items[0].printProcess.uvModes?.includes('uv') === true, '应识别 UV')
  assert(request?.items[0].printProcess.uvModes?.includes('reverse_uv') === true, '应识别逆向 UV')
  assert(request?.items[0].printProcess.uvModes?.includes('spot_uv') === true, '应识别局部 UV')
  assert(request?.items[0].printProcess.embossingModes?.includes('emboss') === true, '应识别激凸')
  assert(request?.recommendedStatus === 'handoff_required', '高复杂工艺应直接 handoff')
  assert(request?.items[0].unknownTerms.length === 0, '已识别的高复杂工艺不应再作为 unknown term 误伤 term coverage')
})

test('46100 样本应稳定识别为 tuck_end_box handoff，而不是空 shadow', () => {
  const request = extractComplexPackagingSecondPhaseDraft('激凸UV屏幕双插大盒，100mm*52mm*215mm，375银卡+UV印+激凸+局部UV++啤+粘盒，2000')
  assert(Boolean(request), '应识别 46100 样本')
  assert(request?.items[0].finishedGoods.packagingType === 'tuck_end_box', '应稳定落到 tuck_end_box')
  assert(request?.items[0].finishedGoods.variantTags.includes('screen_style') === true, '应识别 screen_style')
  assert(request?.items[0].finishedGoods.variantTags.includes('large_box') === true, '应识别 large_box')
  assert(request?.items[0].recognizedTerms.some((term) => term.term === '激凸') === true, '应识别 激凸')
  assert(request?.items[0].recognizedTerms.some((term) => term.term === '局部UV') === true, '应识别 局部UV')
  assert(request?.recommendedStatus === 'handoff_required', '高复杂屏幕双插大盒应 handoff')
  assert(request?.items[0].unknownTerms.length === 0, '不应因为高复杂工艺已识别而残留 unknown terms')
})

test('特材代号会被识别并直接 handoff', () => {
  const request = extractComplexPackagingSecondPhaseDraft('普通彩盒，7*5*5CM，350g单白+K636K+啤+粘，5000')
  assert(Boolean(request), '应识别特材代号样本')
  assert(request?.items[0].materialRecipe.facePaperMaterial === 'single_white_board', '应识别单白')
  assert(request?.items[0].materialRecipe.specialMaterialCodes?.includes('K636K') === true, '应保留 K636K 特材代号')
  assert(request?.statusReasons.includes('unsupported_material_code') === true, '应标记 unsupported_material_code')
  assert(request?.recommendedStatus === 'handoff_required', '特材代号应直接 handoff')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}