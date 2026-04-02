import { parseHandoffRequestPayload } from '@/server/conversations/handoffRequest'

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

console.log('\n=== 人工接管请求校验回归测试 ===\n')

test('缺省或空白字段应被规范化为默认值', () => {
  const result = parseHandoffRequestPayload({ reason: '   ', assignedTo: '   ' })

  assert(result.success, '空白字符串应允许并被规范化')
  if (!result.success) {
    return
  }

  assert(result.data.reason === '人工接管请求', '空白 reason 应回退到默认值')
  assert(result.data.assignedTo === undefined, '空白 assignedTo 应转为 undefined')
})

test('应裁剪前后空格并保留有效值', () => {
  const result = parseHandoffRequestPayload({ reason: '  客户要求人工跟进  ', assignedTo: '  sales-a  ' })

  assert(result.success, '合法字符串应通过校验')
  if (!result.success) {
    return
  }

  assert(result.data.reason === '客户要求人工跟进', 'reason 应被 trim')
  assert(result.data.assignedTo === 'sales-a', 'assignedTo 应被 trim')
})

test('非对象请求体应被拒绝', () => {
  const result = parseHandoffRequestPayload('handoff')

  assert(!result.success, '字符串请求体应被拒绝')
  if (result.success) {
    return
  }

  assert(result.error === '人工接管请求体必须是 JSON 对象', '错误消息应明确指出 JSON 对象要求')
})

test('字段类型错误或超长应被拒绝', () => {
  const invalidType = parseHandoffRequestPayload({ reason: 123 })
  const tooLongReason = parseHandoffRequestPayload({ reason: 'a'.repeat(201) })
  const tooLongAssignee = parseHandoffRequestPayload({ assignedTo: 'b'.repeat(81) })

  assert(!invalidType.success, '非字符串 reason 应被拒绝')
  assert(!tooLongReason.success, '超长 reason 应被拒绝')
  assert(!tooLongAssignee.success, '超长 assignedTo 应被拒绝')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}