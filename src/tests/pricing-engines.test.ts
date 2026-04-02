import { calculateAlbumQuote } from '@/server/pricing/albumQuote'
import { calculateFlyerQuote } from '@/server/pricing/flyerQuote'
import { calculatePosterQuote } from '@/server/pricing/posterQuote'

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

console.log('\n=== 计价引擎单元测试 ===\n')

// Album 计价测试
test('Album: 基础报价计算', () => {
  const result = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
  })

  assert(result.unitPrice > 0, 'unitPrice 应大于 0')
  assert(result.totalPrice === result.unitPrice * 1000, 'totalPrice = unitPrice * quantity')
  assert(result.shippingFee === 50, '国内运费应为 50')
  assert(result.finalPrice === result.totalPrice + result.shippingFee, 'finalPrice 应包含运费')
  assert(result.unitPrice === 28.51, '单价应为 28.51（根据配置）')
})

test('Album: 多页数系数计算', () => {
  const result48 = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 48,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
  })

  const result24 = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 24,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
  })

  assert(result48.unitPrice > result24.unitPrice, '48页单价应大于24页')
})

test('Album: 纸张类型系数计算', () => {
  const baseResult = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'standard',
    coverWeight: 200,
    innerPaper: 'standard',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
  })

  const coatedResult = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
  })

  assert(coatedResult.unitPrice > baseResult.unitPrice, '铜版纸单价应大于标准纸')
})

test('Album: 装订方式系数计算', () => {
  const saddleResult = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
  })

  const perfectResult = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'perfect_bind',
    quantity: 1000,
  })

  assert(perfectResult.unitPrice > saddleResult.unitPrice, '胶装单价应大于骑马钉')
})

test('Album: 税费计算', () => {
  const result = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
    taxRate: 0.13,
  })

  const expectedTax = Math.round(result.totalPrice * 0.13 * 100) / 100
  assert(result.tax === expectedTax, `税费应为 ${expectedTax}`)
  assert(result.finalPrice === result.totalPrice + result.shippingFee + result.tax, 'finalPrice 应包含税费')
})

test('Album: 远程地区运费', () => {
  const result = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
    shippingRegion: 'remote',
  })

  assert(result.shippingFee === 80, '偏远地区运费应为 80')
})

test('Album: 国际运费', () => {
  const result = calculateAlbumQuote({
    finishedSize: 'A4',
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    quantity: 1000,
    shippingRegion: 'international',
  })

  assert(result.shippingFee === 120, '国际运费应为 120')
})

// Flyer 计价测试
test('Flyer: 基础报价计算', () => {
  const result = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 5000,
    paperType: 'matte',
    paperWeight: 200,
    printSides: 'double',
  })

  assert(result.unitPrice > 0, 'unitPrice 应大于 0')
  assert(result.totalPrice === result.unitPrice * 5000, 'totalPrice = unitPrice * quantity')
  assert(result.shippingFee === 30, '国内运费应为 30')
  assert(result.finalPrice === result.totalPrice + result.shippingFee, 'finalPrice 应包含运费')
})

test('Flyer: 双面印刷系数', () => {
  const singleResult = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 200,
    printSides: 'single',
  })

  const doubleResult = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 200,
    printSides: 'double',
  })

  assert(doubleResult.unitPrice > singleResult.unitPrice, '双面单价应大于单面')
  assert(
    Math.abs(doubleResult.unitPrice / singleResult.unitPrice - 1.25) < 0.01,
    '双面系数应为 1.25'
  )
})

test('Flyer: 纸张克重系数', () => {
  const light = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 100,
    printSides: 'double',
  })

  const medium = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 150,
    printSides: 'double',
  })

  const heavy = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 250,
    printSides: 'double',
  })

  assert(medium.unitPrice > light.unitPrice, '150g 单价应大于 100g')
  assert(heavy.unitPrice > medium.unitPrice, '250g 单价应大于 150g')
})

test('Flyer: 传单远程运费', () => {
  const result = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 200,
    printSides: 'double',
    shippingRegion: 'remote',
  })

  assert(result.shippingFee === 60, '偏远地区运费应为 60')
})

test('Flyer: 国际运费', () => {
  const result = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 1000,
    paperType: 'coated',
    paperWeight: 200,
    printSides: 'double',
    shippingRegion: 'international',
  })

  assert(result.shippingFee === 80, '国际运费应为 80')
})

test('Flyer: 金额精度（2位小数）', () => {
  const result = calculateFlyerQuote({
    finishedSize: 'A4',
    quantity: 3,
    paperType: 'coated',
    paperWeight: 200,
    printSides: 'double',
    taxRate: 0.13,
  })

  const hasTwoDecimals = (num: number) => Math.round(num * 100) === num * 100

  assert(hasTwoDecimals(result.unitPrice), `unitPrice ${result.unitPrice} 应为 2 位小数`)
  assert(hasTwoDecimals(result.totalPrice), `totalPrice ${result.totalPrice} 应为 2 位小数`)
  assert(hasTwoDecimals(result.tax), `tax ${result.tax} 应为 2 位小数`)
  assert(hasTwoDecimals(result.finalPrice), `finalPrice ${result.finalPrice} 应为 2 位小数`)
})

test('Poster: 基础报价计算', () => {
  const result = calculatePosterQuote({
    finishedSize: 'A2',
    quantity: 120,
    paperType: 'coated',
    paperWeight: 157,
    lamination: 'none',
  })

  assert(result.unitPrice > 0, 'unitPrice 应大于 0')
  assert(result.totalPrice === result.unitPrice * 120, 'totalPrice = unitPrice * quantity')
  assert(result.shippingFee === 40, '海报国内运费应为 40')
})

test('Poster: 覆膜系数影响单价', () => {
  const none = calculatePosterQuote({
    finishedSize: 'A2',
    quantity: 100,
    paperType: 'coated',
    paperWeight: 157,
    lamination: 'none',
  })
  const matte = calculatePosterQuote({
    finishedSize: 'A2',
    quantity: 100,
    paperType: 'coated',
    paperWeight: 157,
    lamination: 'matte',
  })

  assert(matte.unitPrice > none.unitPrice, '覆膜单价应高于不覆膜')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length
console.log(`通过: ${passed}/${total}`)

if (passed < total) {
  console.log('\n失败的用例:')
  results.filter((r) => !r.passed).forEach((r) => {
    console.log(`  - ${r.name}`)
    if (r.error) console.log(`    ${r.error}`)
  })
  process.exit(1)
}
