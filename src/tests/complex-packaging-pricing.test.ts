import { calculateBundleQuote } from '@/server/pricing/complexPackagingQuote'
import { extractComplexPackagingQuoteRequest } from '@/server/packaging/extractComplexPackagingQuote'
import { decideQuotePath, isOutOfScopeInquiry } from '@/server/quote/workflowPolicy'

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

console.log('\n=== 复杂包装报价引擎回归测试 ===\n')

function getResult(message: string) {
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), '应识别复杂包装请求')
  return calculateBundleQuote(request!)
}

function getLine(message: string) {
  return getResult(message).mainItem
}

test('材质变化应影响盒类单价', () => {
  const kraft = getLine('双插盒：7*5*5CM，300克牛纸，印黑色，5000')
  const whiteCard = getLine('双插盒：7*5*5CM，300克白卡，印黑色，5000')
  const specialty = getLine('双插盒：7*5*5CM，300克特种纸板，印黑色，5000')

  assert(kraft.unitPrice < whiteCard.unitPrice, '白卡应高于牛纸')
  assert(whiteCard.unitPrice < specialty.unitPrice, '特种纸板应高于白卡')
})

test('克重变化应影响材料成本', () => {
  const weight300 = getLine('飞机盒：20*12*6CM，300克白卡，四色，5000')
  const weight400 = getLine('飞机盒：20*12*6CM，400克白卡，四色，5000')

  assert(weight400.unitPrice > weight300.unitPrice, '400g 应高于 300g')
  assert(weight400.materialUnitCost > weight300.materialUnitCost, '更高克重应提升单位材料成本')
})

test('印色与专色数量应影响印工价格', () => {
  const black = getLine('双插盒：7*5*5CM，350克白卡，印黑色，5000')
  const fourColor = getLine('双插盒：7*5*5CM，350克白卡，四色，5000')
  const withSpot = getLine('双插盒：7*5*5CM，350克白卡，四色 + 2个专色，5000')

  assert(black.printUnitCost < fourColor.printUnitCost, '四色印工应高于黑色')
  assert(fourColor.printUnitCost < withSpot.printUnitCost, '带专色时印工应继续增加')
  assert(black.unitPrice < withSpot.unitPrice, '专色应推高最终单价')
})

test('覆膜、裱、啤、粘合等工艺应带来附加费', () => {
  const base = getLine('双插盒：7*5*5CM，350克白卡，正反四色，5000')
  const processed = getLine('双插盒：7*5*5CM，350克白卡，正反四色，过哑胶 + 裱 + 啤 + 粘合，5000')

  assert(processed.processUnitCost > base.processUnitCost, '工艺更复杂时单位工艺费应更高')
  assert(processed.setupCost > base.setupCost, '工艺更复杂时开机费应更高')
  assert(processed.unitPrice > base.unitPrice, '工艺更复杂时最终单价应更高')
})

test('开窗胶片厚度和窗位尺寸应影响开窗彩盒价格', () => {
  const smallerWindow = getLine('开窗彩盒：21*17*31CM，400克单铜，四色，开窗贴0.15厚胶片 10*8CM，啤 + 粘，5000')
  const largerWindow = getLine('开窗彩盒：21*17*31CM，400克单铜，四色，开窗贴0.3厚胶片 18*14CM，啤 + 粘，5000')

  assert(largerWindow.processUnitCost > smallerWindow.processUnitCost, '较大且较厚胶片应提升开窗工艺成本')
  assert(largerWindow.unitPrice > smallerWindow.unitPrice, '较大窗位和更厚胶片应提高单价')
})

test('数量阶梯应使大货有效单价下降', () => {
  const qty500 = getLine('双插盒：7*5*5CM，350克白卡，正反四色，500')
  const qty1000 = getLine('双插盒：7*5*5CM，350克白卡，正反四色，1000')
  const qty5000 = getLine('双插盒：7*5*5CM，350克白卡，正反四色，5000')

  assert(qty500.unitPrice > qty1000.unitPrice, '500 个的有效单价应高于 1000 个')
  assert(qty1000.unitPrice > qty5000.unitPrice, '1000 个的有效单价应高于 5000 个')
  assert(qty500.setupCost >= qty5000.setupCost, '小批量的开机费分摊不应低于大货')
})

test('组合报价可正确汇总总价，并保留子项数量差异', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡 + 正反四色 + 专色 + 正面过哑胶 + 啤 + 粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，3000；透明贴纸：2.4*3cm 封口贴，透明贴纸，5000')
  assert(Boolean(request), '应识别组合报价请求')
  const result = calculateBundleQuote(request!)
  assert(result.isBundle === true, '应标记为 bundle')
  assert(result.items.length === 4, '应包含 4 个拆分 item')
  assert(result.totalPrice === Number(result.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)), '组合总价应等于所有 item 小计之和')
  assert(result.totalUnitPrice > 0, '组合单套价应大于 0')
  assert(result.shippingFee > 80, 'bundle 运费应包含组合件附加')
  assert(result.items.find((item) => item.itemType === 'leaflet_insert')?.quantity === 3000, '说明书应保留显式覆盖后的数量')
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