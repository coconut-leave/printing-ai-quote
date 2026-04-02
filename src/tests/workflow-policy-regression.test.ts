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

test('规则快照: 必须包含 4 个标准品类', () => {
  const snapshot = getWorkflowRulesSnapshot()
  const productTypes = snapshot.map((item) => item.productType)
  assert(snapshot.length === 4, '应包含 4 个标准品类规则')
  assert(productTypes.includes('album'), '应包含 album 规则')
  assert(productTypes.includes('flyer'), '应包含 flyer 规则')
  assert(productTypes.includes('business_card'), '应包含 business_card 规则')
  assert(productTypes.includes('poster'), '应包含 poster 规则')
})

test('quoted: 参数齐全应进入 quoted', () => {
  const mergedParams = {
    productType: 'flyer',
    finishedSize: 'A4',
    quantity: 5000,
    paperType: 'coated',
    paperWeight: 157,
    printSides: 'double',
  }
  const { missingFields, decision } = decideMainRoute('我要印A4传单，5000份，双面彩印', mergedParams)

  assert(missingFields.length === 0, 'quoted 样例不应存在缺失字段')
  assert(decision.status === 'quoted', '状态应为 quoted')
  assert(decision.reason === 'all_required_fields_present', 'reason 应为 all_required_fields_present')
})

test('estimated: 允许缺失集合应进入 estimated', () => {
  const mergedParams = {
    productType: 'flyer',
    finishedSize: 'A4',
    quantity: 5000,
    paperType: 'coated',
    paperWeight: 157,
  }
  const { missingFields, decision } = decideMainRoute('先给个参考价', mergedParams)

  assert(missingFields.length === 1 && missingFields[0] === 'printSides', 'estimated 样例应仅缺 printSides')
  assert(decision.status === 'estimated', '状态应为 estimated')
  assert(decision.reason === 'allowed_estimated_missing_set', 'reason 应为 allowed_estimated_missing_set')
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

test('missing_fields: 不在允许缺失集合应进入 missing_fields', () => {
  const mergedParams = {
    productType: 'business_card',
    finishedSize: '90x54mm',
    paperType: 'coated',
    paperWeight: 300,
    printSides: 'double',
  }
  const { missingFields, decision } = decideMainRoute('名片报价', mergedParams)

  assert(missingFields.length === 1 && missingFields[0] === 'quantity', 'missing_fields 样例应仅缺 quantity')
  assert(decision.status === 'missing_fields', '状态应为 missing_fields')
  assert(decision.reason === 'required_fields_missing', 'reason 应为 required_fields_missing')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}
