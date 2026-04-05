import {
  decideComplexPackagingQuotePath,
  extractComplexPackagingQuoteRequest,
} from '@/server/packaging/extractComplexPackagingQuote'

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

console.log('\n=== 复杂包装抽取与缺参回归测试 ===\n')

test('飞机盒参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('防火风琴文件包飞机盒，规格365*270*53MM，300克牛纸 + A/E加强芯 + 印黑色 + 裱 + 啤，数量1000')
  assert(Boolean(request), '应识别飞机盒复杂包装请求')
  assert(request?.mainItem.productType === 'mailer_box', '主件应识别为飞机盒')
  assert(request?.mainItem.length === 365, '应识别长度 365')
  assert(request?.mainItem.width === 270, '应识别宽度 270')
  assert(request?.mainItem.height === 53, '应识别高度 53')
  assert(request?.mainItem.material === 'kraft', '应识别牛纸材质')
  assert(request?.mainItem.printColor === 'black', '应识别黑色印刷')
})

test('双插盒参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('防火风琴文件包双插盒，规格365*270*53MM，300克牛纸 + A/E加强芯 + 印黑色 + 裱 + 啤，数量1000')
  assert(Boolean(request), '应识别双插盒复杂包装请求')
  assert(request?.mainItem.productType === 'tuck_end_box', '主件应识别为双插盒')
  assert(request?.mainItem.quantity === 1000, '应识别数量 1000')
})

test('开窗彩盒参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克单铜 + 印四色 + 表面过光胶 + 裱 + 开窗贴0.2厚胶片 23.5*14CM + 啤 + 粘，数量500')
  assert(Boolean(request), '应识别开窗彩盒请求')
  assert(request?.mainItem.productType === 'window_box', '应识别为开窗彩盒')
  assert(request?.mainItem.windowFilmThickness === 0.2, '应识别胶片厚度 0.2')
  assert(request?.mainItem.windowSizeLength === 23.5, '应识别窗长 23.5')
  assert(request?.mainItem.windowSizeWidth === 14, '应识别窗宽 14')
})

test('说明书参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(request), '应识别说明书请求')
  assert(request?.mainItem.productType === 'leaflet_insert', '应识别为说明书')
  assert(request?.mainItem.paperWeight === 80, '应识别纸张克重 80')
  assert(request?.mainItem.foldCount === 3, '应识别 3 折')
})

test('开窗参数不完整时进入 estimated', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克单铜，印四色，过光胶，500个')
  assert(Boolean(request), '应识别开窗彩盒请求')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'estimated', '窗口参数不完整时应给预报价或 estimated')
})

test('带 PDF 参考文件时可引用 sample files 且不会阻塞复杂包装识别', () => {
  const request = extractComplexPackagingQuoteRequest('我上传了 Battery USB-C color box 的 PDF 设计文件，双插盒：7*5*5CM，350克白卡，正反四色 + 专色，5000')
  assert(Boolean(request), '应识别复杂包装请求')
  assert(request?.hasReferenceFile === true, '应识别参考文件信号')
  assert((request?.referenceFiles.length || 0) > 0, '应附带 sample files 元信息')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'estimated', '有文件参考但参数齐全时应给预报价而非阻塞')
})

test('高不确定性的开窗彩盒即使参数齐全也应进入 estimated', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克特种纸板，正反四色 + 3个专色，开窗贴0.35厚胶片 18*16CM，啤 + 粘，数量300')
  assert(Boolean(request), '应识别高复杂度开窗彩盒请求')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'estimated', '高复杂度开窗彩盒不应强行进入 quoted')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}