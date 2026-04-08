import { calculateBundleQuote } from '@/server/pricing/complexPackagingQuote'
import { decideComplexPackagingQuotePath, extractComplexPackagingQuoteRequest } from '@/server/packaging/extractComplexPackagingQuote'
import { buildPricingAcceptanceGateEntries } from '@/server/pricing/pricingAcceptanceGateDraft'
import { buildWorkbookBundleMainBoxPathReviewEntries } from '@/server/pricing/workbookBundleMainBoxPathReviewDraft'
import { buildWorkbookCalibrationComparisonEntries } from '@/server/pricing/workbookCalibrationComparisonDraft'
import { buildWorkbookOrderAlignmentEntries } from '@/server/pricing/workbookOrderAlignmentDraft'
import { classifyWorkbookPricingToleranceBand } from '@/server/pricing/workbookPricingTolerance'
import { decideQuotePath, isOutOfScopeInquiry } from '@/server/quote/workflowPolicy'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: unknown, message: string): asserts condition {
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

console.log('\n=== 复杂包装报价引擎回归测试 ===\n')

function getResult(message: string) {
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别复杂包装请求')
  return calculateBundleQuote(request!)
}

function getLine(message: string) {
  return getResult(message).mainItem
}

test('双插盒进入 workbook line-item 模板后应生成真实类别项', () => {
  const line = getLine('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色 + 正面过哑胶 + 啤 + 粘合，5000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.pricingModel === 'workbook_line_item', '双插盒主路径应进入 workbook line-item 引擎')
  assert(line.templateId === 'tuck_end_box_template', '应命中双插盒模板')
  assert(lineCodes.includes('face_paper'), '应生成面纸项')
  assert(lineCodes.includes('lamination'), '应生成覆膜项')
  assert(lineCodes.includes('printing_fee'), '应生成印刷费项')
  assert(lineCodes.includes('die_mold'), '应生成刀模项')
  assert(lineCodes.includes('die_cut_machine'), '应生成啤机项')
  assert(lineCodes.includes('gluing'), '应生成粘盒项')
  assert(line.costSubtotal > 0, '应输出成本小计')
  assert(line.totalPrice > line.costSubtotal, '对外报价应高于成本小计')
})

test('飞机盒支持外层纸材 / 加强芯 / 内层纸材路径', () => {
  const line = getLine('飞机盒：21*14*7.5CM，展开53*52CM，300克白板 + A9 + 300克白板 + 正面四色 + 反面专色 + 过哑胶 + 裱 + 啤，1000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.pricingModel === 'workbook_line_item', '飞机盒应进入 workbook line-item 引擎')
  assert(line.templateId === 'mailer_box_template', '应命中飞机盒模板')
  assert(lineCodes.includes('outer_liner_material'), '应生成外层纸材项')
  assert(lineCodes.includes('inner_liner_material'), '应生成内层纸材项')
  assert(lineCodes.includes('core_reinforcement'), '应生成芯材/加强芯项')
  assert(lineCodes.includes('mounting'), '应生成裱纸项')
})

test('开窗彩盒支持胶片厚度与面积影响', () => {
  const smallerWindow = getLine('开窗彩盒：21*17*31CM，展开66*47CM，400克单铜，四色，过光胶，开窗贴0.15厚胶片 10*8CM，啤 + 粘，1000')
  const largerWindow = getLine('开窗彩盒：21*17*31CM，展开66*47CM，400克单铜，四色，过光胶，开窗贴0.3厚胶片 23.5*14CM，啤 + 粘，1000')
  const smallerFilm = smallerWindow.lineItems.find((item) => item.code === 'window_film')
  const largerFilm = largerWindow.lineItems.find((item) => item.code === 'window_film')

  assert(Boolean(smallerFilm), '应生成较小胶片项')
  assert(Boolean(largerFilm), '应生成较大胶片项')
  assert((largerFilm?.amount || 0) > (smallerFilm?.amount || 0), '更厚更大的胶片应提高胶片行金额')
  assert(largerWindow.unitPrice > smallerWindow.unitPrice, '更厚更大的胶片应提高最终单价')
})

test('说明书按模板计价，不再只是粗估配件', () => {
  const line = getLine('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.pricingModel === 'workbook_line_item', '说明书应进入 workbook line-item 引擎')
  assert(line.templateId === 'leaflet_insert_template', '应命中说明书模板')
  assert(lineCodes.includes('leaflet_paper'), '应生成纸材项')
  assert(lineCodes.includes('leaflet_printing'), '应生成印刷费项')
  assert(lineCodes.includes('leaflet_folding'), '应生成折页项')
  assert(!lineCodes.includes('leaflet_die_cut'), '未明确裁切/模切时不应默认叠加裁切项')
})

test('内托按模板计价，不再只是附加费', () => {
  const line = getLine('纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.pricingModel === 'workbook_line_item', '内托应进入 workbook line-item 引擎')
  assert(line.templateId === 'box_insert_template', '应命中内托模板')
  assert(line.status === 'quoted', '显式克重标准内托应保持 quoted line-item 状态')
  assert(lineCodes.includes('insert_material'), '应生成内托材质项')
  assert(lineCodes.includes('insert_printing'), '应生成内托印刷费项')
  assert(lineCodes.includes('insert_die_mold'), '应生成刀模项')
  assert(lineCodes.includes('insert_forming'), '应生成啤机/成型项')
})

test('透明贴纸按模板计价，不再只是固定 surcharge', () => {
  const line = getLine('透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.pricingModel === 'workbook_line_item', '封口贴应进入 workbook line-item 引擎')
  assert(line.templateId === 'seal_sticker_template', '应命中封口贴模板')
  assert(lineCodes.includes('sticker_material'), '应生成面材项')
  assert(lineCodes.includes('sticker_die_cut'), '应生成模切/半穿项')
  assert(lineCodes.includes('sticker_processing'), '应生成数量型加工费项')
})

test('真实 workbook 说明书样本不应再被 x1 误判为坑型且不默认叠加裁切', () => {
  const line = getLine('说明书：220x170mm，80g双胶纸，单面印，6100')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'leaflet_insert_template', '应命中说明书模板')
  assert(line.status === 'quoted', '高频通用印刷说明书应进入 quoted candidate')
  assert(lineCodes.includes('leaflet_paper'), '应生成纸材项')
  assert(lineCodes.includes('leaflet_printing'), '应生成印刷费项')
  assert(!lineCodes.includes('leaflet_die_cut'), '未明确裁切/模切时不应默认叠加裁切项')
  assert(Math.abs(line.unitPrice - Number((360 / 6100).toFixed(2))) <= 0.01, '真实说明书样本单价应接近 workbook 行价位')
})

test('缺克重的 WEB 特种纸板内托应补足材料项并进入高频 quoted candidate', () => {
  const line = getLine('内托：20*12CM左右，WEB特种纸板，5000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'box_insert_template', '应命中内托模板')
  assert(line.status === 'quoted', '高频缺克重内托应进入 quoted candidate')
  assert(lineCodes.includes('insert_material'), '应补足内托材料项用于 price proxy')
  assert(Math.abs(line.unitPrice - 0.32) < 0.03, '缺克重内托的预估单价应贴近 workbook archetype')
})

test('已对裱但未明确粘位的真实内托样本不应重复叠加 insert_gluing', () => {
  const line = getLine('纸内托：161x80x175mm，500g白卡（已对裱）+3专+覆哑膜+裱+啤，6100')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'box_insert_template', '应命中内托模板')
  assert(!lineCodes.includes('insert_gluing'), '仅已对裱/裱工时不应重复计入 insert_gluing')
})

test('数量梯度会影响计费数与固定费摊薄', () => {
  const qty500 = getLine('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色，啤 + 粘合，500')
  const qty1000 = getLine('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色，啤 + 粘合，1000')
  const qty5000 = getLine('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色，啤 + 粘合，5000')

  assert(qty500.chargeQuantity > 0 && qty500.chargeQuantity !== qty500.actualQuantity, '新引擎应区分实际数量与计费数')
  assert(qty500.unitPrice > qty1000.unitPrice, '小批量单价应高于 1000 个')
  assert(qty1000.unitPrice > qty5000.unitPrice, '1000 个单价应高于 5000 个')
  assert((qty500.setupCost / qty500.actualQuantity) > (qty5000.setupCost / qty5000.actualQuantity), '小批量固定费摊销到单件后应高于大货')
})

test('bundle 汇总应按组件 subtotal 求和', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 正面过哑胶 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，3000；透明贴纸：2.4*3cm 封口贴，透明贴纸，5000')
  assert(Boolean(request), '应识别组合报价请求')
  const result = calculateBundleQuote(request!)

  assert(result.isBundle === true, '应标记为 bundle')
  assert(result.items.length === 3, '应保留 3 个组件')
  assert(result.items.every((item) => item.pricingModel === 'workbook_line_item'), 'bundle 内组件应各自走模板 line-item 计价')
  assert(result.costSubtotal === Number(result.items.reduce((sum, item) => sum + item.costSubtotal, 0).toFixed(2)), '订单成本小计应等于组件成本小计求和')
  assert(result.totalPrice === Number(result.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)), '订单 subtotal 应等于组件 subtotal 求和')
  assert(result.shippingFee === 0, '未显式声明运费时，复杂包装 bundle 默认不再附加 shipping fee')
  assert(result.finalPrice === result.totalPrice + result.tax, '复杂包装 bundle 最终价应只在 subtotal 之上叠加显式税层')
  assert(result.items[0].pricingModel === 'workbook_line_item', '首个主件应使用 workbook line-item 引擎')
})

test('主件 + 说明书 的整单对齐回归应保持 final 不再被默认 shipping 拉偏', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别主件 + 说明书 bundle')
  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '主件 + 标准说明书 bundle 应进入 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主件 + 标准说明书应命中标准 quoted bundle gate')
  assert(result.mainItem.templateId === 'tuck_end_box_template', '主件应继续命中双插盒模板')
  assert(result.subItems[0]?.templateId === 'leaflet_insert_template', '配件应继续命中说明书模板')
  assert(Math.abs(result.mainItem.totalPrice - 2750) < 25, '主件 subtotal 应继续贴近 workbook 主件行')
  assert(Math.abs(accessorySubtotal - 1000) < 45, '说明书 accessory subtotal 应在 batch-4 fixed-fee 校准后进一步收敛')
  assert(result.shippingFee === 0, '主件 + 说明书 bundle 不应再默认附加 shipping')
  assert(result.finalPrice === result.totalPrice, '无税无运时 final 应等于 order subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 3750) / 3750) === 'close', '主件 + 说明书整单 gap 应进入 order close band')
})

test('主件 + 高频 proxy 内托 的整单对齐回归应进入 quoted 且不默认带 shipping', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000')
  assert(Boolean(request), '应识别主件 + 内托 bundle')
  const result = calculateBundleQuote(request!)

  assert(decideComplexPackagingQuotePath(request!).status === 'quoted', '标准双插盒 + 高频 proxy 内托应进入 quoted')
  assert(result.subItems.some((item) => item.templateId === 'box_insert_template'), '应继续保留内托模板组件')
  assert(result.shippingFee === 0, '主件 + 内托 bundle 不应再默认附加 shipping')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 4350) / 4350) === 'close', '标准双插盒 + 高频 proxy 内托整单 gap 应进入 order close band')
})

test('标准双插盒 + 高频 generic 说明书 的整单对齐回归应继续 estimated 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：220x170mm，80g双胶纸，单面印，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准双插盒 + 高频 generic 说明书 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'estimated', '标准双插盒 + 高频 generic 说明书 bundle 应继续保持 estimated')
  assert(decision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', '标准双插盒 + 高频 generic 说明书应命中 estimated-only bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2750) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 346.01) < 0.02, '高频 generic 说明书 accessory subtotal 应贴近新的保守 fixed-fee 锚点')
  assert(result.shippingFee === 0, '标准双插盒 + 高频 generic 说明书 bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税高频 generic 说明书 bundle 的 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 3096.01) / 3096.01) === 'close', '标准双插盒 + 高频 generic 说明书整单 gap 应进入 order close band')
})

test('标准双插盒 + 标准内托 的整单对齐回归应进入 quoted 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准双插盒 + 标准内托 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '标准双插盒 + 标准内托 bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2750) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 2025.61) < 0.02, '标准内托 accessory subtotal 应贴近当前 quoted candidate 样本')
  assert(result.shippingFee === 0, '标准双插盒 + 标准内托 bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税标准双插盒 + 标准内托 bundle 的 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 4775.61) / 4775.61) === 'close', '标准双插盒 + 标准内托整单 gap 应进入 order close band')
})

test('标准双插盒 + 标准说明书 + 标准贴纸 的整单对齐回归应进入 quoted 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准双插盒 + 标准说明书 + 标准贴纸 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '标准双插盒 + 标准说明书 + 标准贴纸 bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '最简单双标准配件 bundle 应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2750) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 1150) < 45, '双标准配件 accessory subtotal 应贴近当前 controlled acceptance 锚点')
  assert(result.shippingFee === 0, '标准双插盒 + 标准说明书 + 标准贴纸 bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税双标准配件 bundle 的 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 3900) / 3900) === 'close', '标准双插盒 + 标准说明书 + 标准贴纸整单 gap 应进入 order close band')
})

test('标准双插盒 + 标准内托 + 标准说明书 的整单对齐回归应进入 quoted 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准双插盒 + 标准内托 + 标准说明书 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '标准双插盒 + 标准内托 + 标准说明书 bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准说明书应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2730.12) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 3028.03) < 35, '标准内托 + 标准说明书 accessory subtotal 应继续保持在当前 acceptance 窄区间内')
  assert(result.shippingFee === 0, '标准双插盒 + 标准内托 + 标准说明书 bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税时 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 5758.15) / 5758.15) === 'close', '标准双插盒 + 标准内托 + 标准说明书整单 gap 应进入 order close band')
})

test('标准双插盒 + 标准内托 + 标准贴纸 的整单对齐回归应进入 quoted 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准双插盒 + 标准内托 + 标准贴纸 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '标准双插盒 + 标准内托 + 标准贴纸 bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准贴纸应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2730.12) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 2181.5) < 35, '标准内托 + 标准贴纸 accessory subtotal 应继续保持在当前 acceptance 窄区间内')
  assert(result.shippingFee === 0, '标准双插盒 + 标准内托 + 标准贴纸 bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税时 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 4911.62) / 4911.62) === 'close', '标准双插盒 + 标准内托 + 标准贴纸整单 gap 应进入 order close band')
})

test('标准双插盒 + 标准说明书 + simple carton 的整单对齐回归应进入 quoted 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；纸箱+包装费：42*42*35CM，5000套'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准双插盒 + 标准说明书 + simple carton bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '标准双插盒 + 标准说明书 + simple carton bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准说明书 + simple carton 应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2730.12) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 4100.02) < 40, '标准说明书 + simple carton accessory subtotal 应继续保持在当前 acceptance 窄区间内')
  assert(result.shippingFee === 0, '标准双插盒 + 标准说明书 + simple carton bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税时 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 6830.14) / 6830.14) === 'close', '标准双插盒 + 标准说明书 + simple carton 整单 gap 应进入 order close band')
})

test('已验证飞机盒 + 标准说明书 + 标准贴纸 的整单对齐回归应进入 quoted 且保持 order close', () => {
  const message = '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别已验证飞机盒 + 标准说明书 + 标准贴纸 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)

  assert(decision.status === 'quoted', '已验证飞机盒 + 标准说明书 + 标准贴纸 bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '已验证飞机盒 + 标准说明书 + 标准贴纸应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 3221.56) < 25, '已验证飞机盒主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)) - 1158.31) < 25, '已验证飞机盒 + 双标准配件 accessory subtotal 应继续保持在当前 acceptance 窄区间内')
  assert(result.shippingFee === 0, '已验证飞机盒 + 标准说明书 + 标准贴纸 bundle 不应混入默认 shipping')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 4371.56) / 4371.56) === 'close', '已验证飞机盒 + 标准说明书 + 标准贴纸整单 gap 应进入 order close band')
})

test('主件 + 贴纸 的整单对齐回归应继续把主要 gap 控制在 sticker processing 层', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别主件 + 贴纸 bundle')
  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '主件 + 标准贴纸 bundle 应进入 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主件 + 标准贴纸应命中标准 quoted bundle gate')
  assert(Math.abs(accessorySubtotal - 150) < 8, '贴纸 accessory subtotal 应在 processing/plate 校准后收敛到 close 区间')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 2900) / 2900) === 'close', '主件 + 贴纸整单 gap 应保持在 order close band')
  assert(result.shippingFee === 0, '主件 + 贴纸 bundle 不应再默认附加 shipping')
})

test('说明书 fixed-fee cluster 校准应继续收 setup fee 并把 generic leaflet 保留在单品 quoted candidate', () => {
  const standard = getLine('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  const generic = getLine('说明书：220x170mm，80g双胶纸，单面印，6100')
  const standardPrinting = standard.lineItems.find((item) => item.code === 'leaflet_printing')
  const standardSetup = standard.lineItems.find((item) => item.code === 'leaflet_setup')
  const genericPrinting = generic.lineItems.find((item) => item.code === 'leaflet_printing')
  const genericSetup = generic.lineItems.find((item) => item.code === 'leaflet_setup')

  assert(Boolean(standardPrinting), '标准说明书应继续保留 leaflet_printing line-item')
  assert(Boolean(standardSetup), '标准说明书应继续保留 leaflet_setup line-item')
  assert(Boolean(genericPrinting), 'generic 说明书应继续保留 leaflet_printing line-item')
  assert(Boolean(genericSetup), 'generic 说明书应继续保留 leaflet_setup line-item')
  assert(Math.abs((standardPrinting?.amount || 0) - 268.8) < 0.01, '双面四色说明书印刷固定费应继续收窄到新的倍率')
  assert((standardSetup?.amount || 0) === 10, '说明书 5000 档 setup fee 应继续收窄到新的 fixed-fee')
  assert(Math.abs((genericPrinting?.amount || 0) - 235.2) < 0.01, 'generic 单面印说明书印刷固定费应轻微收窄而不改边界')
  assert((genericSetup?.amount || 0) === 10, 'generic 说明书 5000 档 setup fee 应同步按新 fixed-fee 摊销')
  assert(classifyWorkbookPricingToleranceBand('component', (standard.totalPrice - 1000) / 1000) === 'close', '标准说明书应进入 component close band')
  assert(generic.status === 'quoted', 'generic 说明书样本应提升到 quoted candidate')
  assert(classifyWorkbookPricingToleranceBand('component', (generic.totalPrice - 360) / 360) === 'close', 'generic 说明书应继续保持 component close band')
  assert(Math.abs(generic.totalPrice - 357.6) < 2, 'generic 说明书总价应更贴近 workbook 行价位')
})

test('说明书 residual cluster 应在 component 与 order 两层同时收敛且不影响 KEEP 路径', () => {
  const calibrationEntries = new Map(buildWorkbookCalibrationComparisonEntries().map((entry) => [entry.sample_id, entry]))
  const orderEntries = new Map(buildWorkbookOrderAlignmentEntries().map((entry) => [entry.sample_id, entry]))
  const standardLeaflet = calibrationEntries.get('leaflet_insert_standard_5000')
  const genericLeaflet = calibrationEntries.get('leaflet_insert_real_220x170_6100')
  const orderWithLeaflet = orderEntries.get('order_tuck_end_plus_leaflet')
  const fullBundle = orderEntries.get('order_tuck_end_full_bundle')
  const bundleMainKeepEntries = buildWorkbookBundleMainBoxPathReviewEntries()

  assert(Boolean(standardLeaflet), '应继续保留标准说明书 calibration 样本')
  assert(Boolean(genericLeaflet), '应继续保留 generic 说明书 calibration 样本')
  assert(Boolean(orderWithLeaflet), '应继续保留主件+说明书 order 样本')
  assert(Boolean(fullBundle), '应继续保留 full bundle order 样本')
  assert(Math.abs(standardLeaflet?.gap_ratio || 0) < 0.01, '标准说明书 residual 应继续收敛到 1% 以内')
  assert(Math.abs(genericLeaflet?.gap_ratio || 0) < 0.01, 'generic 说明书 residual 应继续收敛到 1% 以内')
  assert(Math.abs(orderWithLeaflet?.gap_ratio || 0) < 0.006, '主件+说明书 order residual 应继续收敛到 0.6% 以内')
  assert(Math.abs(fullBundle?.gap_ratio || 0) < 0.006, 'full bundle order residual 应继续保持在 0.6% 以内')
  assert(bundleMainKeepEntries.every((entry) => entry.calibration_action === 'keep'), '说明书 cluster 收敛不应打坏 bundle_main_box_path 的 KEEP 结论')
})

test('说明书 accepted gate 与高频 generic quoted gate 在这轮校准后仍应保持 accepted', () => {
  const gates = buildPricingAcceptanceGateEntries()
  const leafletQuotedGate = gates.find((entry) => entry.gate_id === 'leaflet_standard_quoted')
  const genericLeafletGate = gates.find((entry) => entry.gate_id === 'leaflet_generic_high_frequency_quoted')

  assert(leafletQuotedGate?.release_mode === 'quoted', '标准说明书 gate 应继续是 quoted')
  assert(leafletQuotedGate?.acceptance_status === 'accepted', '标准说明书 gate 应继续保持 accepted')
  assert(genericLeafletGate?.release_mode === 'quoted', '高频 generic 说明书 gate 应提升为 quoted')
  assert(genericLeafletGate?.acceptance_status === 'accepted', '高频 generic 说明书 gate 应继续保持 accepted')
})

test('第四批贴纸 processing 校准应把 5000 档透明封口贴压回 close 区间', () => {
  const line = getLine('透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  const plate = line.lineItems.find((item) => item.code === 'sticker_plate')
  const processing = line.lineItems.find((item) => item.code === 'sticker_processing')

  assert((plate?.amount || 0) === 12, '5000 档 sticker plate fee 应收敛到新的 fixed-fee')
  assert(Math.abs((processing?.amount || 0) - 4.7) < 0.02, '5000 档 sticker processing 应收敛到新的数量型加工费')
  assert(classifyWorkbookPricingToleranceBand('component', (line.totalPrice - 150) / 150) === 'close', '透明封口贴应进入 component close band')
})

test('第四批内托默认克重校准应提升到 quoted candidate 且把 specialty_board proxy 拉近 workbook', () => {
  const line = getLine('内托：20*12CM左右，WEB特种纸板，5000')
  const material = line.lineItems.find((item) => item.code === 'insert_material')

  assert(line.status === 'quoted', '高频缺显式克重的内托应提升到 quoted candidate')
  assert(Boolean(material?.notes?.some((note) => note.includes('260g'))), '默认特种纸板克重说明应更新为 260g proxy')
  assert(classifyWorkbookPricingToleranceBand('component', (line.totalPrice - 1600) / 1600) === 'close', '内托默认克重 proxy 应进入 component close band')
})

test('第四批 tolerance band 判定应区分 component 与 order 口径', () => {
  assert(classifyWorkbookPricingToleranceBand('component', 0.04) === 'close', '4% component gap 应记为 close')
  assert(classifyWorkbookPricingToleranceBand('component', 0.09) === 'acceptable', '9% component gap 应记为 acceptable')
  assert(classifyWorkbookPricingToleranceBand('component', 0.13) === 'review', '13% component gap 应记为 review')
  assert(classifyWorkbookPricingToleranceBand('order', 0.01) === 'close', '1% order gap 应记为 close')
  assert(classifyWorkbookPricingToleranceBand('order', 0.025) === 'acceptable', '2.5% order gap 应记为 acceptable')
  assert(classifyWorkbookPricingToleranceBand('order', 0.04) === 'review', '4% order gap 应记为 review')
})

test('第四批 acceptance gate 应把 quoted 与 estimated-only 路径分开验收', () => {
  const entries = buildPricingAcceptanceGateEntries()
  const genericLeafletGate = entries.find((entry) => entry.gate_id === 'leaflet_generic_high_frequency_quoted')
  const stickerGate = entries.find((entry) => entry.gate_id === 'seal_sticker_standard_quoted')
  const noFilmGlossGate = entries.find((entry) => entry.gate_id === 'window_box_no_film_gloss_quoted_candidate')
  const standardInsertGate = entries.find((entry) => entry.gate_id === 'box_insert_standard_quoted_candidate')
  const proxyInsertGate = entries.find((entry) => entry.gate_id === 'box_insert_proxy_high_frequency_quoted')
  const extendedMainPlusInsertQuotedGate = entries.find((entry) => entry.gate_id === 'extended_main_plus_insert_quoted_candidate')
  const extendedMainPlusInsertEstimatedGate = entries.find((entry) => entry.gate_id === 'extended_main_plus_insert_estimated_only')
  const standardQuotedBundleGate = entries.find((entry) => entry.gate_id === 'standard_bundle_quoted')
  const genericLeafletBundleEstimatedGate = entries.find((entry) => entry.gate_id === 'single_generic_leaflet_bundle_estimated_only')
  const multiAccessoryQuotedGate = entries.find((entry) => entry.gate_id === 'multi_accessory_standard_bundle_quoted_candidate')
  const multiAccessoryEstimatedGate = entries.find((entry) => entry.gate_id === 'multi_accessory_standard_bundle_estimated_only')
  const addonBundleGate = entries.find((entry) => entry.gate_id === 'order_addon_bundle_quoted')

  assert(genericLeafletGate?.release_mode === 'quoted', '高频 generic 说明书路径应作为 quoted gate 管理')
  assert(genericLeafletGate?.acceptance_status === 'accepted', '高频 generic 说明书路径应通过 quoted acceptance gate')
  assert(stickerGate?.release_mode === 'quoted', '标准贴纸路径应作为 quoted gate 管理')
  assert(stickerGate?.acceptance_status === 'accepted', '标准贴纸路径应通过 quoted acceptance gate')
  assert(noFilmGlossGate?.release_mode === 'quoted', '标准 glossy no-film window 路径应作为 quoted gate 管理')
  assert(noFilmGlossGate?.acceptance_status === 'accepted', '标准 glossy no-film window quoted gate 应通过')
  assert(standardInsertGate?.release_mode === 'quoted', '显式克重标准内托应作为 quoted gate 管理')
  assert(standardInsertGate?.acceptance_status === 'accepted', '显式克重标准内托 quoted candidate gate 应通过')
  assert(proxyInsertGate?.release_mode === 'quoted', '高频默认克重内托路径应作为 quoted gate 管理')
  assert(proxyInsertGate?.acceptance_status === 'accepted', '高频默认克重内托路径应通过 quoted gate')
  assert(extendedMainPlusInsertQuotedGate?.release_mode === 'quoted', '第一步扩张 mailer + 内托应作为 quoted gate 管理')
  assert(extendedMainPlusInsertQuotedGate?.acceptance_status === 'accepted', '第一步扩张 mailer + 内托 quoted gate 应通过')
  assert(extendedMainPlusInsertQuotedGate?.sample_ids.includes('order_mailer_plus_standard_insert') === true, '已验证飞机盒 + 标准内托应纳入扩张 quoted gate')
  assert(extendedMainPlusInsertQuotedGate?.sample_ids.includes('order_mailer_plus_proxy_insert') === true, '已验证飞机盒 + 高频 proxy 内托应纳入扩张 quoted gate')
  assert(extendedMainPlusInsertEstimatedGate?.release_mode === 'estimated_only', '保守主盒 + 内托子集应继续按 estimated gate 管理')
  assert(extendedMainPlusInsertEstimatedGate?.acceptance_status === 'accepted', '保守主盒 + 内托 estimated gate 应通过')
  assert(extendedMainPlusInsertEstimatedGate?.sample_ids.includes('order_window_plus_standard_insert') === true, '开窗主盒 + 标准内托应纳入扩张 estimated gate')
  assert(extendedMainPlusInsertEstimatedGate?.sample_ids.includes('order_window_plus_proxy_insert') === true, '开窗主盒 + 高频 proxy 内托应纳入扩张 estimated gate')
  assert(standardQuotedBundleGate?.expected_boundary === 'quoted', '已放开的标准 bundle gate 应接受 quoted')
  assert(standardQuotedBundleGate?.acceptance_status === 'accepted', '已放开的标准 bundle quoted gate 应继续通过')
  assert(standardQuotedBundleGate?.sample_ids.includes('order_tuck_end_plus_generic_leaflet') === false, '标准双插盒 + 高频 generic 说明书不应再并入标准 quoted bundle acceptance gate')
  assert(standardQuotedBundleGate?.sample_ids.includes('order_tuck_end_plus_insert') === true, '标准双插盒 + 高频 proxy 内托应并入标准 quoted bundle acceptance gate')
  assert(standardQuotedBundleGate?.sample_ids.includes('order_tuck_end_plus_standard_insert') === true, '标准双插盒 + 标准内托应并入标准 quoted bundle acceptance gate')
  assert(standardQuotedBundleGate?.sample_ids.includes('order_tuck_end_plus_simple_carton') === true, '主盒 + simple carton 应并入标准 quoted bundle acceptance gate')
  assert(genericLeafletBundleEstimatedGate?.release_mode === 'estimated_only', '标准双插盒 + 高频 generic 说明书整单应改由 estimated gate 管理')
  assert(genericLeafletBundleEstimatedGate?.acceptance_status === 'accepted', '标准双插盒 + 高频 generic 说明书整单 estimated gate 应通过')
  assert(genericLeafletBundleEstimatedGate?.sample_ids.includes('order_tuck_end_plus_generic_leaflet') === true, '标准双插盒 + 高频 generic 说明书应纳入单配件 estimated gate')
  assert(multiAccessoryQuotedGate?.expected_boundary === 'quoted', '多配件标准 bundle quoted gate 应接受 quoted')
  assert(multiAccessoryQuotedGate?.acceptance_status === 'accepted', '多配件标准 bundle quoted gate 应继续通过')
  assert(multiAccessoryQuotedGate?.sample_ids.includes('order_tuck_end_plus_leaflet_sticker') === true, '标准双插盒 + 标准说明书 + 标准贴纸应并入多配件 quoted gate')
  assert(multiAccessoryQuotedGate?.sample_ids.includes('order_tuck_end_plus_standard_insert_leaflet') === true, '标准双插盒 + 标准内托 + 标准说明书应并入多配件 quoted gate')
  assert(multiAccessoryQuotedGate?.sample_ids.includes('order_tuck_end_plus_standard_insert_sticker') === true, '标准双插盒 + 标准内托 + 标准贴纸应并入多配件 quoted gate')
  assert(multiAccessoryQuotedGate?.sample_ids.includes('order_tuck_end_plus_leaflet_carton') === true, '标准双插盒 + 标准说明书 + simple carton 应并入多配件 quoted gate')
  assert(multiAccessoryQuotedGate?.sample_ids.includes('order_mailer_plus_leaflet_sticker') === true, '已验证飞机盒 + 标准说明书 + 标准贴纸应并入多配件 quoted gate')
  assert(multiAccessoryEstimatedGate?.expected_boundary === 'estimated', '多配件保守子集 gate 应继续只接受 estimated')
  assert(multiAccessoryEstimatedGate?.acceptance_status === 'accepted', '多配件保守子集 order gap 应通过当前 estimated gate')
  assert(multiAccessoryEstimatedGate?.sample_ids.includes('order_tuck_generic_leaflet_sticker') === true, 'generic leaflet 参与的多配件 bundle 应保留在 estimated gate')
  assert(multiAccessoryEstimatedGate?.sample_ids.includes('order_tuck_proxy_insert_leaflet') === true, 'proxy insert 参与的多配件 bundle 应保留在 estimated gate')
  assert(multiAccessoryEstimatedGate?.sample_ids.includes('order_tuck_end_full_bundle') === true, '更宽的三配件 bundle 应保留在 estimated gate')
  assert(addonBundleGate?.expected_boundary === 'quoted', '带 carton 的订单级 add-on bundle 应继续是 quoted gate')
  assert(addonBundleGate?.acceptance_status === 'accepted', '带 carton 的 quoted order gate 应继续通过')
})

test('第五批单主件 vs bundle 主件对照应证明主件 builder / line-items / subtotal 不发生漂移', () => {
  const entries = buildWorkbookBundleMainBoxPathReviewEntries()

  assert(entries.length >= 3, '应至少覆盖当前 bundle_main_box_path 的标准 order review 样本')
  assert(entries.every((entry) => entry.main_only_template_id === entry.bundle_main_template_id), '单主件与 bundle 主件应继续命中同一模板')
  assert(entries.every((entry) => entry.bundle_vs_single_gap_amount === 0), 'bundle 内主件 subtotal 不应相对单主件再发生漂移')
  assert(entries.every((entry) => entry.line_item_delta_summary.length === 1 && entry.line_item_delta_summary[0] === 'none'), 'bundle 内主件 line-items 不应相对单主件发生折损或漏算')
  assert(entries.every((entry) => entry.main_only_quote_markup === entry.bundle_main_quote_markup), '主件 quote markup 不应因进入 bundle 而变化')
})

test('第五批 bundle_main_box_path residual under-gap 评估应判定为 keep 而不是继续压 bundle 分支', () => {
  const entries = buildWorkbookBundleMainBoxPathReviewEntries()

  assert(entries.every((entry) => entry.bundle_main_tolerance_band === 'close'), 'bundle main box residual gap 应继续处于 component close band')
  assert(entries.every((entry) => entry.residual_source_layer === 'main_box_path_itself'), '残余 under-gap 应归因于主件路径本身而不是 bundle 聚合层')
  assert(entries.every((entry) => entry.calibration_action === 'keep'), '当 bundle 不引入额外压低且 residual 已在 close band 内时，应停止继续压 bundle 分支')
})

test('第五批不应打坏第四批 close 样本与 acceptance/boundary guardrails', () => {
  const leaflet = getLine('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  const genericLeaflet = getLine('说明书：220x170mm，80g双胶纸，单面印，6100')
  const standardInsert = getLine('纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const insert = getLine('内托：20*12CM左右，WEB特种纸板，5000')
  const sticker = getLine('透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  const standardBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000')
  const fullBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000；纸箱+包装费：42*42*35CM，5000套')
  const leafletBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000')
  const genericLeafletBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：220x170mm，80g双胶纸，单面印，5000')
  const orderAddonBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；纸箱+包装费：42*42*35CM，5000套')
  const mainWithStandardInsert = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const mainWithProxyInsert = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；内托：20*12CM左右，WEB特种纸板，5000')
  const multiAccessoryInsertLeaflet = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000')
  const multiAccessoryInsertSticker = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3cm，透明贴纸，5000')
  const multiAccessoryLeafletCarton = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；纸箱+包装费：42*42*35CM，5000套')
  const mailerWithStandardInsert = extractComplexPackagingQuoteRequest('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const mailerWithProxyInsert = extractComplexPackagingQuoteRequest('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；内托：20*12CM左右，WEB特种纸板，5000')
  const mailerLeafletSticker = extractComplexPackagingQuoteRequest('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000')
  const windowWithStandardInsert = extractComplexPackagingQuoteRequest('开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，500')
  const windowWithProxyInsert = extractComplexPackagingQuoteRequest('开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500；内托：20*12CM左右，WEB特种纸板，500')
  const genericLeafletSticker = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：220x170mm，80g双胶纸，单面印，5000；透明贴纸：2.4*3cm，透明贴纸，5000')
  const proxyInsertLeaflet = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000')
  const blockingMain = extractComplexPackagingQuoteRequest('飞机盒，20*12*6CM，300克白卡+Q9坑，四色，裱+啤，1000')
  const gates = buildPricingAcceptanceGateEntries()

  assert(classifyWorkbookPricingToleranceBand('component', (leaflet.totalPrice - 1000) / 1000) === 'close', '说明书 close 样本不应被打坏')
  assert(genericLeaflet.status === 'quoted', '高频 generic 说明书单品应保持 quoted')
  assert(standardInsert.status === 'quoted', '显式克重标准内托单品应保持 quoted')
  assert(insert.status === 'quoted', '高频 proxy 内托单品应保持 quoted')
  assert(classifyWorkbookPricingToleranceBand('component', (insert.totalPrice - 1600) / 1600) === 'close', '内托 close 样本不应被打坏')
  assert(classifyWorkbookPricingToleranceBand('component', (sticker.totalPrice - 150) / 150) === 'close', '贴纸 close 样本不应被打坏')
  assert(gates.every((entry) => entry.acceptance_status === 'accepted' || entry.gate_id === 'window_box_no_film_estimated'), '当前 acceptance gate 不应被打坏')
  assert(Boolean(standardBundle) && decideComplexPackagingQuotePath(standardBundle!).status === 'quoted', '最简单双标准配件 quoted bundle 边界应已放开')
  assert(Boolean(fullBundle) && decideComplexPackagingQuotePath(fullBundle!).status === 'estimated', '更宽的三配件 bundle estimated-only 边界不应被打坏')
  assert(Boolean(leafletBundle) && decideComplexPackagingQuotePath(leafletBundle!).status === 'quoted', '主件 + 标准说明书 quoted bundle 边界应已放开')
  assert(Boolean(genericLeafletBundle) && decideComplexPackagingQuotePath(genericLeafletBundle!).status === 'estimated', '标准双插盒 + 高频 generic 说明书 bundle 应继续保持 estimated')
  assert(Boolean(orderAddonBundle) && decideComplexPackagingQuotePath(orderAddonBundle!).status === 'quoted', '主件 + simple carton bundle 应已放开 quoted')
  assert(Boolean(mainWithStandardInsert) && decideComplexPackagingQuotePath(mainWithStandardInsert!).status === 'quoted', '标准双插盒 + 标准内托 bundle 应已被受控放开')
  assert(Boolean(mainWithProxyInsert) && decideComplexPackagingQuotePath(mainWithProxyInsert!).status === 'quoted', '标准双插盒 + 高频 proxy 内托 bundle 应已被受控放开')
  assert(Boolean(multiAccessoryInsertLeaflet) && decideComplexPackagingQuotePath(multiAccessoryInsertLeaflet!).status === 'quoted', '标准双插盒 + 标准内托 + 标准说明书 bundle 应已被受控放开')
  assert(Boolean(multiAccessoryInsertSticker) && decideComplexPackagingQuotePath(multiAccessoryInsertSticker!).status === 'quoted', '标准双插盒 + 标准内托 + 标准贴纸 bundle 应已被受控放开')
  assert(Boolean(multiAccessoryLeafletCarton) && decideComplexPackagingQuotePath(multiAccessoryLeafletCarton!).status === 'quoted', '标准双插盒 + 标准说明书 + simple carton bundle 应已被受控放开')
  assert(Boolean(mailerWithStandardInsert) && decideComplexPackagingQuotePath(mailerWithStandardInsert!).status === 'quoted', '已验证飞机盒 + 标准内托 bundle 应进入第一步扩张 quoted')
  assert(Boolean(mailerWithProxyInsert) && decideComplexPackagingQuotePath(mailerWithProxyInsert!).status === 'quoted', '已验证飞机盒 + 高频 proxy 内托 bundle 应进入第一步扩张 quoted')
  assert(Boolean(mailerLeafletSticker) && decideComplexPackagingQuotePath(mailerLeafletSticker!).status === 'quoted', '已验证飞机盒 + 标准说明书 + 标准贴纸 bundle 应进入多配件 quoted')
  assert(Boolean(windowWithStandardInsert) && decideComplexPackagingQuotePath(windowWithStandardInsert!).status === 'estimated', '开窗主盒 + 标准内托 bundle 当前应继续 estimated')
  assert(Boolean(windowWithProxyInsert) && decideComplexPackagingQuotePath(windowWithProxyInsert!).status === 'estimated', '开窗主盒 + 高频 proxy 内托 bundle 当前应继续 estimated')
  assert(Boolean(genericLeafletSticker) && decideComplexPackagingQuotePath(genericLeafletSticker!).status === 'estimated', 'generic leaflet 参与的多配件 bundle 当前应继续 estimated')
  assert(Boolean(proxyInsertLeaflet) && decideComplexPackagingQuotePath(proxyInsertLeaflet!).status === 'estimated', 'proxy 内托参与的多配件 bundle 当前应继续 estimated')
  assert(Boolean(blockingMain) && decideComplexPackagingQuotePath(blockingMain!).status === 'handoff_required', 'blocking handoff 边界不应被打坏')
})

test('第五批 KEEP 结论应继续与 order review 和 acceptance gate 证据对齐', () => {
  const reviewEntries = buildWorkbookBundleMainBoxPathReviewEntries()
  const orderEntriesById = new Map(buildWorkbookOrderAlignmentEntries().map((entry) => [entry.sample_id, entry]))
  const gates = buildPricingAcceptanceGateEntries()
  const standardQuotedBundleGate = gates.find((entry) => entry.gate_id === 'standard_bundle_quoted')
  const multiAccessoryQuotedGate = gates.find((entry) => entry.gate_id === 'multi_accessory_standard_bundle_quoted_candidate')
  const multiAccessoryEstimatedGate = gates.find((entry) => entry.gate_id === 'multi_accessory_standard_bundle_estimated_only')
  const addonBundleGate = gates.find((entry) => entry.gate_id === 'order_addon_bundle_quoted')

  reviewEntries.forEach((entry) => {
    const orderEntry = orderEntriesById.get(entry.sample_id)

    assert(Boolean(orderEntry), `${entry.sample_id} 应继续保留在 order alignment review 中`)
    assert(entry.bundle_vs_single_gap_amount === 0, `${entry.sample_id} 的 bundle_vs_single_gap 应继续为 0`)
    assert(entry.calibration_action === 'keep', `${entry.sample_id} 的 residual 结论应继续为 keep`)
    assert(orderEntry?.tolerance_band === 'close', `${entry.sample_id} 的 order tolerance 应继续处于 close band`)
    assert(
      orderEntry?.boundary_status === 'quoted' || orderEntry?.boundary_status === 'estimated',
      `${entry.sample_id} 的 order boundary 应继续保持在当前 guardrailed 范围内`,
    )
    assert(orderEntry?.shipping_actual === 0, `${entry.sample_id} 不应重新混入默认 shipping`)
  })

  const leafletOrder = orderEntriesById.get('order_tuck_end_plus_leaflet')
  const genericLeafletOrder = orderEntriesById.get('order_tuck_end_plus_generic_leaflet')
  const proxyInsertOrder = orderEntriesById.get('order_tuck_end_plus_insert')
  const standardInsertOrder = orderEntriesById.get('order_tuck_end_plus_standard_insert')
  const mailerStandardInsertOrder = orderEntriesById.get('order_mailer_plus_standard_insert')
  const mailerProxyInsertOrder = orderEntriesById.get('order_mailer_plus_proxy_insert')
  const windowStandardInsertOrder = orderEntriesById.get('order_window_plus_standard_insert')
  const windowProxyInsertOrder = orderEntriesById.get('order_window_plus_proxy_insert')
  const leafletStickerOrder = orderEntriesById.get('order_tuck_end_plus_leaflet_sticker')
  const insertLeafletOrder = orderEntriesById.get('order_tuck_end_plus_standard_insert_leaflet')
  const insertStickerOrder = orderEntriesById.get('order_tuck_end_plus_standard_insert_sticker')
  const leafletCartonOrder = orderEntriesById.get('order_tuck_end_plus_leaflet_carton')
  const mailerLeafletStickerOrder = orderEntriesById.get('order_mailer_plus_leaflet_sticker')
  const genericLeafletStickerOrder = orderEntriesById.get('order_tuck_generic_leaflet_sticker')
  const proxyInsertLeafletOrder = orderEntriesById.get('order_tuck_proxy_insert_leaflet')
  const cartonOrder = orderEntriesById.get('order_tuck_end_plus_simple_carton')
  const stickerOrder = orderEntriesById.get('order_tuck_end_plus_sticker')

  assert(leafletOrder?.boundary_status === 'quoted', '主件 + 说明书 order boundary 应提升到 quoted')
  assert(genericLeafletOrder?.boundary_status === 'estimated', '标准双插盒 + 高频 generic 说明书 order boundary 应继续 estimated')
  assert(genericLeafletOrder?.tolerance_band === 'close' || genericLeafletOrder?.tolerance_band === 'acceptable', '标准双插盒 + 高频 generic 说明书 order tolerance 至少应落在 acceptable band 内')
  assert(proxyInsertOrder?.boundary_status === 'quoted', '标准双插盒 + 高频 proxy 内托 order boundary 应提升到 quoted')
  assert(proxyInsertOrder?.tolerance_band === 'close' || proxyInsertOrder?.tolerance_band === 'acceptable', '标准双插盒 + 高频 proxy 内托 order tolerance 至少应落在 acceptable band 内')
  assert(standardInsertOrder?.boundary_status === 'quoted', '标准双插盒 + 标准内托 order boundary 应提升到 quoted')
  assert(standardInsertOrder?.tolerance_band === 'close' || standardInsertOrder?.tolerance_band === 'acceptable', '标准双插盒 + 标准内托 order tolerance 至少应落在 acceptable band 内')
  assert(mailerStandardInsertOrder?.boundary_status === 'quoted', '已验证飞机盒 + 标准内托 order boundary 应进入第一步扩张 quoted')
  assert(mailerStandardInsertOrder?.tolerance_band === 'close' || mailerStandardInsertOrder?.tolerance_band === 'acceptable', '已验证飞机盒 + 标准内托 order tolerance 至少应落在 acceptable band 内')
  assert(mailerProxyInsertOrder?.boundary_status === 'quoted', '已验证飞机盒 + 高频 proxy 内托 order boundary 应进入第一步扩张 quoted')
  assert(mailerProxyInsertOrder?.tolerance_band === 'close' || mailerProxyInsertOrder?.tolerance_band === 'acceptable', '已验证飞机盒 + 高频 proxy 内托 order tolerance 至少应落在 acceptable band 内')
  assert(windowStandardInsertOrder?.boundary_status === 'estimated', '开窗主盒 + 标准内托 order boundary 应继续 estimated')
  assert(windowStandardInsertOrder?.tolerance_band === 'close' || windowStandardInsertOrder?.tolerance_band === 'acceptable', '开窗主盒 + 标准内托 order tolerance 至少应落在 acceptable band 内')
  assert(windowProxyInsertOrder?.boundary_status === 'estimated', '开窗主盒 + 高频 proxy 内托 order boundary 应继续 estimated')
  assert(windowProxyInsertOrder?.tolerance_band === 'close' || windowProxyInsertOrder?.tolerance_band === 'acceptable', '开窗主盒 + 高频 proxy 内托 order tolerance 至少应落在 acceptable band 内')
  assert(leafletStickerOrder?.boundary_status === 'quoted', '标准双插盒 + 标准说明书 + 标准贴纸 order boundary 应提升到 quoted')
  assert(leafletStickerOrder?.tolerance_band === 'close' || leafletStickerOrder?.tolerance_band === 'acceptable', '标准双插盒 + 标准说明书 + 标准贴纸 order tolerance 至少应落在 acceptable band 内')
  assert(insertLeafletOrder?.boundary_status === 'quoted', '标准双插盒 + 标准内托 + 标准说明书 order boundary 应提升到 quoted')
  assert(insertLeafletOrder?.tolerance_band === 'close' || insertLeafletOrder?.tolerance_band === 'acceptable', '标准双插盒 + 标准内托 + 标准说明书 order tolerance 至少应落在 acceptable band 内')
  assert(insertStickerOrder?.boundary_status === 'quoted', '标准双插盒 + 标准内托 + 标准贴纸 order boundary 应提升到 quoted')
  assert(insertStickerOrder?.tolerance_band === 'close' || insertStickerOrder?.tolerance_band === 'acceptable', '标准双插盒 + 标准内托 + 标准贴纸 order tolerance 至少应落在 acceptable band 内')
  assert(leafletCartonOrder?.boundary_status === 'quoted', '标准双插盒 + 标准说明书 + simple carton order boundary 应提升到 quoted')
  assert(leafletCartonOrder?.tolerance_band === 'close' || leafletCartonOrder?.tolerance_band === 'acceptable', '标准双插盒 + 标准说明书 + simple carton order tolerance 至少应落在 acceptable band 内')
  assert(mailerLeafletStickerOrder?.boundary_status === 'quoted', '已验证飞机盒 + 标准说明书 + 标准贴纸 order boundary 应提升到 quoted')
  assert(mailerLeafletStickerOrder?.tolerance_band === 'close' || mailerLeafletStickerOrder?.tolerance_band === 'acceptable', '已验证飞机盒 + 标准说明书 + 标准贴纸 order tolerance 至少应落在 acceptable band 内')
  assert(genericLeafletStickerOrder?.boundary_status === 'estimated', 'generic leaflet 参与的多配件 bundle order boundary 应继续 estimated')
  assert(genericLeafletStickerOrder?.tolerance_band === 'close' || genericLeafletStickerOrder?.tolerance_band === 'acceptable', 'generic leaflet 参与的多配件 order tolerance 至少应落在 acceptable band 内')
  assert(proxyInsertLeafletOrder?.boundary_status === 'estimated', 'proxy 内托参与的多配件 bundle order boundary 应继续 estimated')
  assert(proxyInsertLeafletOrder?.tolerance_band === 'close' || proxyInsertLeafletOrder?.tolerance_band === 'acceptable', 'proxy 内托参与的多配件 order tolerance 至少应落在 acceptable band 内')
  assert(cartonOrder?.boundary_status === 'quoted', '主件 + simple carton order boundary 应提升到 quoted')
  assert(cartonOrder?.tolerance_band === 'close' || cartonOrder?.tolerance_band === 'acceptable', '主件 + simple carton order tolerance 至少应落在 acceptable band 内')
  assert(stickerOrder?.boundary_status === 'quoted', '主件 + 贴纸 order boundary 应提升到 quoted')
  assert(standardQuotedBundleGate?.acceptance_status === 'accepted', 'standard quoted bundle acceptance gate 应继续保持 accepted')
  assert(multiAccessoryQuotedGate?.acceptance_status === 'accepted', 'multi-accessory quoted bundle acceptance gate 应继续保持 accepted')
  assert(multiAccessoryEstimatedGate?.acceptance_status === 'accepted', 'multi-accessory estimated-only bundle acceptance gate 应继续保持 accepted')
  assert(addonBundleGate?.acceptance_status === 'accepted', 'order add-on bundle acceptance gate 应继续保持 accepted')
})

test('标准主盒 + simple carton bundle 应进入 standard_quoted_bundle_in_trial 且保持 order close', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸箱+包装费：42*42*35CM，5000套'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别标准主盒 + simple carton bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  const result = calculateBundleQuote(request!)
  const accessorySubtotal = Number(result.subItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2))

  assert(decision.status === 'quoted', '标准主盒 + simple carton bundle 应允许 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主盒 + simple carton 应命中标准 quoted bundle gate')
  assert(Math.abs(result.mainItem.totalPrice - 2750) < 25, '主件 subtotal 应继续贴近当前 accepted 主件锚点')
  assert(Math.abs(accessorySubtotal - 3097.6) < 15, 'simple carton accessory subtotal 应贴近当前 acceptance 复盘结果')
  assert(result.shippingFee === 0, '主盒 + simple carton bundle 不应混入默认 shipping')
  assert(result.finalPrice === result.totalPrice, '无税主盒 + simple carton bundle 的 final 应等于 subtotal')
  assert(classifyWorkbookPricingToleranceBand('order', (result.finalPrice - 5770) / 5770) === 'close', '主盒 + simple carton 整单 gap 应进入 order close band')
})

test('主件 + handoff-only 内托 bundle 应继续 handoff_required', () => {
  const message = '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM，EVA内托，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别主件 + handoff-only 内托 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'handoff_required', '主件 + handoff-only 内托 bundle 应继续 handoff_required')
  assert(decision.trialBundleGateStatus === 'handoff_only_bundle_in_trial', '主件 + handoff-only 内托应命中 handoff bundle gate')
})

test('已验证飞机盒 + handoff-only 内托 bundle 应继续走 extended main+insert handoff guardrail', () => {
  const message = '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；内托：20*12CM，EVA内托，5000'
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别已验证飞机盒 + handoff-only 内托 bundle')

  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'handoff_required', '已验证飞机盒 + handoff-only 内托 bundle 应继续 handoff_required')
  assert(decision.trialBundleGateStatus === 'handoff_only_bundle_in_trial', '已验证飞机盒 + handoff-only 内托应继续命中 handoff bundle gate')
})

test('主件 + 内托 + 贴纸 的 bundle 能按组件 subtotal 正确汇总', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸内托：20*12CM，500克白卡 + 啤，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  assert(Boolean(request), '应识别主件+内托+贴纸 bundle')
  const result = calculateBundleQuote(request!)

  assert(result.items.length === 3, '应包含 3 个组件')
  assert(result.mainItem.templateId === 'tuck_end_box_template', '主件应保持主盒模板')
  assert(result.subItems.some((item) => item.templateId === 'box_insert_template'), '应包含内托模板组件')
  assert(result.subItems.some((item) => item.templateId === 'seal_sticker_template'), '应包含封口贴模板组件')
  assert(result.totalPrice === Number(result.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)), '订单 subtotal 应严格等于组件 subtotal 求和')
})

test('第二批模板输出结果应比旧配件估价更接近 workbook 样本价位', () => {
  const tuck = getLine('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色 + 专色 + 正面过哑胶 + 啤 + 粘合，5000')
  const mailer = getLine('飞机盒：21*14*7.5CM，展开53*52CM，300克白板 + A9 + 300克白板 + 正面四色 + 反面专色 + 过哑胶 + 裱 + 啤，1000')
  const window = getLine('开窗彩盒：21*17*31CM，展开66*47CM，400克单铜，四色，过光胶 + 裱，开窗贴0.2厚胶片 23.5*14CM，啤 + 粘，500')
  const leaflet = getLine('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  const insert = getLine('内托：20*12CM左右，WEB特种纸板，5000')
  const sticker = getLine('透明贴纸：2.4*3cm的封口贴，透明贴纸，5000')

  assert(Math.abs(tuck.unitPrice - 0.55) < 0.25, '双插盒结果应落在 workbook 样本价位附近')
  assert(Math.abs(mailer.unitPrice - 3.65) < 0.8, '飞机盒结果应落在 workbook 样本价位附近')
  assert(Math.abs(window.unitPrice - 5.0) < 1.2, '开窗彩盒结果应落在 workbook 样本价位附近')
  assert(Math.abs(leaflet.unitPrice - 0.2) < 0.12, '说明书结果应落在 workbook 样本价位附近')
  assert(Math.abs(insert.unitPrice - 0.32) < 0.16, '内托结果应落在 workbook 样本价位附近')
  assert(Math.abs(sticker.unitPrice - 0.03) < 0.02, '透明贴纸结果应落在 workbook 样本价位附近')
})

test('第三批主盒校准后应贴近飞机盒 workbook 样本且不过度叠加裱工', () => {
  const simpleMailer = getLine('飞机盒：28*24*6cm，400g白卡+4C+过光胶+裱+啤，1000')
  const reinforcedMailer = getLine('密胺麻将飞机盒：266x154.5x73mm，300g白卡+WE+120+4C+过哑胶+裱+啤，1000')
  const wangMailer = getLine('飞机盒：21x14x7.5cm，300克白板+A9+300克白板+正面印四色+过哑胶+反面印专色+过哑胶，1000')

  assert(simpleMailer.status === 'quoted', '简单飞机盒样本应回到 quoted')
  assert(!simpleMailer.lineItems.some((item) => item.code === 'mounting'), '简单单层飞机盒不应误叠加 mounting')
  assert(Math.abs(simpleMailer.unitPrice - 2.11) < 0.06, '简单飞机盒单价应贴近 3987p workbook 样本')

  assert(reinforcedMailer.lineItems.some((item) => item.code === 'mounting'), '带坑芯的飞机盒应保留 mounting')
  assert(Math.abs(reinforcedMailer.unitPrice - 2.57) < 0.08, '带坑芯飞机盒单价应贴近欣梦创想样本')

  assert(wangMailer.lineItems.some((item) => item.code === 'inner_liner_material'), '双层飞机盒应保留内层纸材项')
  assert(wangMailer.lineItems.some((item) => item.code === 'mounting'), '双层飞机盒应补足 mounting')
  assert(wangMailer.quoteMarkup > reinforcedMailer.quoteMarkup, '双层+A9 飞机盒应高于普通 reinforced 路径的报价倍率')
  assert(Math.abs(wangMailer.unitPrice - 3.65) < 0.08, '双层飞机盒单价应进一步贴近王小姐 workbook 样本')
})

test('Top3 window gloss film 样本应补上 gloss 与裱工 line-items 并保持 quoted', () => {
  const line = getLine('开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'window_box_template', 'image gloss film 样本应继续走 window_box 模板')
  assert(line.status === 'quoted', 'image gloss film 样本当前仍应保持 quoted')
  assert(lineCodes.includes('lamination'), '表面过光同义词应命中 lamination line-item')
  assert(lineCodes.includes('mounting'), '显式 裱 应命中 mounting line-item')
  assert(lineCodes.includes('window_film'), '应继续保留 window_film line-item')
  assert(lineCodes.includes('window_process'), '应继续保留 window_process line-item')
  assert(Math.abs(line.unitPrice - 5.0) < 0.08, 'image gloss film 样本单价应进一步贴近 workbook 参考')
})

test('第三批主盒校准后双插盒主件和整单应更贴近真实 bundle 报价', () => {
  const mainLine = getLine('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000')
  const bundle = getResult('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3cm的封口贴，透明贴纸，5000')

  assert(Math.abs(mainLine.unitPrice - 0.55) < 0.02, '双插盒主件单价应贴近真实 bundle 主件样本')
  assert(Math.abs(bundle.totalPrice - 5500) < 130, '整单 subtotal 应贴近图转写样本总价')
  assert(bundle.mainItem.unitPrice >= 0.54, '主件单价不应再明显低估')
  assert(bundle.shippingFee === 0, '多配件 bundle 的 final 不应再被默认 shipping 扩大')
  assert(bundle.finalPrice === bundle.totalPrice, '无税 bundle 的 final 应继续等于 subtotal')
})

test('订单级 quote markup / tax / shipping 口径应可单独回归', () => {
  const result = getResult('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合+含税，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000')

  assert(result.shippingFee === 0, '未显式声明运费时 order-level shipping 应保持 0')
  assert(result.quoteMarkup === Number((result.quotedAmount / result.costSubtotal).toFixed(2)), 'bundle quoteMarkup 应继续等于 quotedAmount / costSubtotal')
  assert(result.tax > 0, '含税 bundle 应继续保留 tax 层')
  assert(result.finalPrice === Number((result.totalPrice + result.tax).toFixed(2)), '含税 bundle 的 final 应等于 subtotal + tax')
})

test('标准 glossy no-film window 单品应提升到 quoted 且不虚构 window_film', () => {
  const line = getLine('双插开窗盒：110x120x95mm，300克白卡，印黑色，过光胶，开窗不贴胶片，啤成品+粘盒，2000')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'window_box_template', '标准 glossy no-film 样本应继续走 window_box 模板')
  assert(line.status === 'quoted', '标准 glossy no-film 样本当前应提升到 quoted')
  assert(lineCodes.includes('window_process'), '标准 glossy no-film 样本应生成真实 window_process')
  assert(!lineCodes.includes('window_film'), '明确不贴胶片时不应虚构 window_film line-item')
  assert(Math.abs(line.unitPrice - 0.5) < 0.03, '标准 glossy no-film 样本单价应贴近保守 no-film 锚点')
})

test('非 glossy / 非完整 no-film window 边界应继续 estimated 而不是 handoff', () => {
  const line = getLine('双插开窗盒：110x120x95mm，纸板+开窗不贴胶片+啤成品+粘盒，2000')

  assert(line.templateId === 'window_box_template', '开窗不贴胶片样本应继续走 window_box 模板')
  assert(line.status === 'estimated', '非 glossy / 非完整 no-film 样本当前应保持 estimated')
  assert(line.lineItems.some((item) => item.code === 'window_process'), '保守 no-film 样本也应生成真实 window_process')
  assert(!line.lineItems.some((item) => item.code === 'window_film'), '明确不贴胶片时不应虚构 window_film line-item')
  assert(Math.abs(line.unitPrice - 0.61) < 0.05, '保守 no-film 边界样本单价应继续贴近月结参考')
})

test('高复杂 no-film window 仍应 handoff', () => {
  const request = extractComplexPackagingQuoteRequest('双插开窗盒：110x120x95mm，300克白卡，印黑色，过光胶，开窗不贴胶片，烫金+啤成品+粘盒，2000')
  assert(Boolean(request), '应识别高复杂 no-film window 样本')
  const decision = decideComplexPackagingQuotePath(request!)

  assert(decision.status === 'handoff_required', '高复杂 no-film window 仍应 handoff')
})

test('第三批挂钩彩盒 + 配内卡样本不应再因主件数量丢失而掉成 0 价', () => {
  const result = getResult('挂钩彩盒：92x28x92mm，300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+粘 配内卡*1，5000')

  assert(result.mainItem.actualQuantity === 5000, '主件应保留共享数量 5000')
  assert(result.mainItem.totalPrice > 0, '主件不应再掉成 0 价')
  assert(result.subItems.length === 1, '应继续识别 companion 内卡')
  assert(result.mainItem.status === 'estimated', '该边界样本仍应保持 estimated')
})

test('2.5 批铝箔袋模板应生成 workbook 风格行项目并贴近样本单价', () => {
  const line = getLine('铝铂袋：12.5*12.5CM，8丝空白铝铂袋，10000个')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.pricingModel === 'workbook_line_item', '铝箔袋应进入 workbook line-item 引擎')
  assert(line.templateId === 'foil_bag_template', '应命中铝箔袋模板')
  assert(line.status === 'quoted', '空白铝箔袋应允许 quoted')
  assert(lineCodes.includes('foil_bag_material'), '应生成袋材项')
  assert(lineCodes.includes('foil_bag_forming'), '应生成制袋项')
  assert(Math.abs(line.unitPrice - 1.15) < 0.2, '铝箔袋单价应贴近 workbook 样本价位')
})

test('2.5 批标准定制印刷铝箔袋单品应进入窄白名单 quoted candidate', () => {
  const line = getLine('铝箔袋：12.5*12.5CM，8丝铝箔袋，单面四色印刷，10000个')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'foil_bag_template', '标准 printed foil bag 应命中铝箔袋模板')
  assert(line.status === 'quoted', '标准 8 丝单面四色铝箔袋单品应允许 quoted')
  assert(lineCodes.includes('foil_bag_material'), '标准 printed foil bag 应生成袋材项')
  assert(lineCodes.includes('foil_bag_printing'), '标准 printed foil bag 应生成印刷项')
  assert(lineCodes.includes('foil_bag_setup'), '标准 printed foil bag 应生成开机费项')
  assert(lineCodes.includes('foil_bag_forming'), '标准 printed foil bag 应生成制袋项')
  assert(Math.abs(line.totalPrice - 12139.99) < 0.1, '标准 printed foil bag 总价应与 controlled acceptance 样本对齐')
})

test('2.5 批纸箱包装模板应支持简单外箱价和低量外箱价位', () => {
  const simpleCarton = getLine('纸箱+包装费：42*42*35CM，10000套')
  const outerCarton = getLine('大外箱：44*24.5*22.5CM，K636K空白箱，160个')

  assert(simpleCarton.templateId === 'carton_packaging_template', '纸箱+包装费应命中纸箱包装模板')
  assert(simpleCarton.lineItems.some((item) => item.code === 'outer_carton'), '应生成外箱基础项')
  assert(!simpleCarton.lineItems.some((item) => item.code === 'shipping'), '未声明含运时不应生成 shipping 行')
  assert(Math.abs(simpleCarton.unitPrice - 0.5) < 0.12, '纸箱+包装费样本单价应贴近 workbook 行价位')

  assert(outerCarton.templateId === 'carton_packaging_template', '大外箱应命中纸箱包装模板')
  assert(outerCarton.status === 'quoted', '空白大外箱应允许 quoted')
  assert(Math.abs(outerCarton.unitPrice - 3.12) < 0.4, '大外箱单价应贴近 workbook 行价位')
})

test('2.5 批标准 printed carton 单品应进入窄白名单 quoted candidate', () => {
  const line = getLine('大外箱：42*42*35CM，K636K空白箱，单面四色印刷，啤，10000个')
  const lineCodes = line.lineItems.map((item) => item.code)

  assert(line.templateId === 'carton_packaging_template', '标准 printed carton 应命中纸箱包装模板')
  assert(line.status === 'quoted', '标准 K636K 单面四色大外箱单品应允许 quoted')
  assert(lineCodes.includes('outer_carton'), '标准 printed carton 应生成外箱基础项')
  assert(lineCodes.includes('carton_printing'), '标准 printed carton 应生成外箱印刷费项')
  assert(lineCodes.includes('carton_die_mold'), '标准 printed carton 应生成外箱刀模项')
  assert(!lineCodes.includes('carton_forming'), '未明确成箱/粘箱时不应默认生成成箱项')
  assert(Math.abs(line.totalPrice - 5703.06) < 0.1, '标准 printed carton 总价应与 controlled acceptance 样本对齐')
})

test('2.5 批 bundle 中加入纸箱包装时仍按组件 subtotal 聚合且不混入 shipping 行', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸箱+包装费：42*42*35CM，5000套')
  assert(Boolean(request), '应识别主件+纸箱包装 bundle')
  const result = calculateBundleQuote(request!)
  const cartonItem = result.items.find((item) => item.itemType === 'carton_packaging')

  assert(Boolean(cartonItem), 'bundle 中应包含 carton_packaging 组件')
  assert(cartonItem?.lineItems.some((item) => item.code === 'outer_carton'), 'carton 组件应保留外箱基础行')
  assert(!cartonItem?.lineItems.some((item) => item.code === 'shipping'), 'carton 组件不应误带 shipping 行')
  assert(result.totalPrice === Number(result.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)), '订单 subtotal 应继续严格等于组件 subtotal 求和')
  assert(result.shippingFee === 0, 'carton packaging 已作为订单级附加项时不应再重复叠加 shipping')
})

test('订单级 quoted / estimated 边界应收敛到 order-level 完整度而不是组件可算度', () => {
  const completeAccessoryBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  const widerAccessoryBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000；纸箱+包装费：42*42*35CM，5000套')
  const cartonBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸箱+包装费：42*42*35CM，5000套')
  const addonQuotedBundle = extractComplexPackagingQuoteRequest('铝铂袋：12.5*12.5CM，8丝空白铝铂袋，10000个；纸箱+包装费：42*42*35CM，10000套')

  assert(Boolean(completeAccessoryBundle), '应识别标准 accessory bundle')
  assert(Boolean(widerAccessoryBundle), '应识别更宽的多配件 bundle')
  assert(Boolean(cartonBundle), '应识别带 carton packaging 的 bundle')
  assert(Boolean(addonQuotedBundle), '应识别已验证的 foil bag + carton quoted bundle')
  assert(decideComplexPackagingQuotePath(completeAccessoryBundle!).status === 'quoted', '最简单双标准配件 bundle 应提升到 quoted')
  assert(decideComplexPackagingQuotePath(widerAccessoryBundle!).status === 'estimated', '更宽的多配件 bundle 应继续保持 estimated')
  assert(decideComplexPackagingQuotePath(cartonBundle!).status === 'quoted', '主盒 + simple carton bundle 应提升到 quoted')
  assert(decideComplexPackagingQuotePath(addonQuotedBundle!).status === 'quoted', '已验证的 foil bag + carton add-on bundle 应继续 quoted')
})

test('非标复杂包装不会误正式报价', () => {
  assert(isOutOfScopeInquiry('磁吸礼盒报价，EVA 内衬，木盒结构') === true, '磁吸礼盒仍应视为超出一期范围')
  const decision = decideQuotePath({
    message: '磁吸礼盒报价，EVA 内衬，木盒结构',
    productType: undefined,
    missingFields: ['productType'],
  })
  assert(decision.status === 'handoff_required', '非标复杂包装不应误入正式报价')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}