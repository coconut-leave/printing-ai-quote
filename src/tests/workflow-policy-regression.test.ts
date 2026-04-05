import { getRequiredFields } from '@/lib/catalog/helpers'
import { decideQuotePath, getWorkflowRulesSnapshot } from '@/server/quote/workflowPolicy'

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

function checkMissingFields(params: Record<string, any>): string[] {
  const requiredFields = getRequiredFields(params.productType)
  return requiredFields.filter((key) => {
    const value = params[key]
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  })
}

function decideMainRoute(message: string, mergedParams: Record<string, any>) {
  const missingFields = checkMissingFields(mergedParams)
  const decision = decideQuotePath({
    message,
    productType: mergedParams.productType,
    missingFields,
  })

  return { missingFields, decision }
}

console.log('\n=== 统一报价策略四路径回归测试 ===\n')

test('规则快照: 活跃自动报价范围必须只包含一期复杂包装品类', () => {
  const snapshot = getWorkflowRulesSnapshot()
  const productTypes = snapshot.map((item) => item.productType)
  assert(snapshot.length === 6, '应只包含 6 个当前活跃自动报价品类规则')
  assert(productTypes.includes('mailer_box'), '应包含 mailer_box 规则')
  assert(productTypes.includes('tuck_end_box'), '应包含 tuck_end_box 规则')
  assert(productTypes.includes('window_box'), '应包含 window_box 规则')
  assert(productTypes.includes('leaflet_insert'), '应包含 leaflet_insert 规则')
  assert(productTypes.includes('box_insert'), '应包含 box_insert 规则')
  assert(productTypes.includes('seal_sticker'), '应包含 seal_sticker 规则')
})

test('quoted: 支持的一期复杂包装参数齐全应进入 quoted', () => {
  const mergedParams = {
    productType: 'mailer_box',
    quantity: 5000,
    material: 'white_card',
    weight: 300,
    printColor: 'four_color',
    length: 20,
    width: 12,
    height: 6,
  }
  const { missingFields, decision } = decideMainRoute('飞机盒报价，20*12*6cm，300克白卡，四色印刷，5000个', mergedParams)

  assert(missingFields.length === 0, 'quoted 样例不应存在缺失字段')
  assert(decision.status === 'quoted', '状态应为 quoted')
  assert(decision.reason === 'all_required_fields_present', 'reason 应为 all_required_fields_present')
})

test('estimated: 支持的一期复杂包装允许缺失集合应进入 estimated', () => {
  const mergedParams = {
    productType: 'window_box',
    quantity: 2000,
    material: 'white_card',
    weight: 350,
    printColor: 'four_color',
    length: 16,
    width: 10,
    height: 5,
  }
  const { missingFields, decision } = decideMainRoute('开窗彩盒先给个参考价', mergedParams)

  assert(missingFields.length === 3, 'estimated 样例应缺少 3 个开窗字段')
  assert(missingFields.includes('windowFilmThickness'), 'estimated 样例应缺 windowFilmThickness')
  assert(missingFields.includes('windowSizeLength'), 'estimated 样例应缺 windowSizeLength')
  assert(missingFields.includes('windowSizeWidth'), 'estimated 样例应缺 windowSizeWidth')
  assert(decision.status === 'estimated', '状态应为 estimated')
  assert(decision.reason === 'allowed_estimated_missing_set', 'reason 应为 allowed_estimated_missing_set')
})

test('handoff_required: 简单印刷品自动报价已停用时应转人工', () => {
  const decision = decideQuotePath({
    message: '我想印1000本A4画册',
    productType: 'album',
    missingFields: [],
  })

  assert(decision.status === 'handoff_required', '简单印刷品应转人工')
  assert(decision.reason === 'simple_product_auto_quote_deactivated', 'reason 应为 simple_product_auto_quote_deactivated')
})

test('handoff_required: 文件型询价应优先转人工', () => {
  const earlyDecision = decideQuotePath({
    message: '我有PDF和AI设计稿，按文件报价',
    productType: undefined,
    missingFields: ['productType'],
  })

  assert(earlyDecision.status === 'handoff_required', '状态应为 handoff_required')
  assert(earlyDecision.reason === 'file_based_inquiry', 'reason 应为 file_based_inquiry')
})

test('missing_fields: 支持的一期复杂包装缺少关键字段时应进入 missing_fields', () => {
  const mergedParams = {
    productType: 'box_insert',
    quantity: 5000,
  }
  const { missingFields, decision } = decideMainRoute('再加一个内托', mergedParams)

  assert(missingFields.includes('insertMaterial'), 'missing_fields 样例应包含 insertMaterial')
  assert(decision.status === 'missing_fields', '状态应为 missing_fields')
  assert(decision.reason === 'required_fields_missing', 'reason 应为 required_fields_missing')
})

test('missing_fields: 产品类型未明确时不应 estimated 或 quoted', () => {
  const decision = decideQuotePath({
    message: '我想要个外包装推荐',
    productType: undefined,
    missingFields: ['productType'],
  })

  assert(decision.status === 'missing_fields', '产品类型未明确时应保持 missing_fields 或推荐咨询，不应直接报价')
  assert(decision.reason === 'product_type_missing', 'reason 应为 product_type_missing')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}
