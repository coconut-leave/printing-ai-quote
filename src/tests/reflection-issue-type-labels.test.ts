import {
  REFLECTION_ISSUE_TYPE_OPTIONS,
  REFLECTION_ISSUE_TYPE_LABELS,
  getReflectionIssueTypeLabel,
} from '@/lib/reflection/issueTypes'

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

console.log('\n=== Reflection issueType 中文映射回归测试 ===\n')

test('issueType 中文标签应符合前端展示要求', () => {
  assert(REFLECTION_ISSUE_TYPE_LABELS.PARAM_MISSING === '缺少参数', 'PARAM_MISSING 应显示为 缺少参数')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PARAM_WRONG === '参数错误', 'PARAM_WRONG 应显示为 参数错误')
  assert(REFLECTION_ISSUE_TYPE_LABELS.QUOTE_INACCURATE === '报价不准确', 'QUOTE_INACCURATE 应显示为 报价不准确')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_HANDOFF === '应转人工', 'SHOULD_HANDOFF 应显示为 应转人工')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_PARAM_WRONG === '包装参数识别错误', 'PACKAGING_PARAM_WRONG 应显示为 包装参数识别错误')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_PARAM_MISSING === '包装参数缺失', 'PACKAGING_PARAM_MISSING 应显示为 包装参数缺失')
  assert(REFLECTION_ISSUE_TYPE_LABELS.BUNDLE_STRUCTURE_WRONG === '组合结构错误', 'BUNDLE_STRUCTURE_WRONG 应显示为 组合结构错误')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_PRICE_INACCURATE === '包装报价偏差', 'PACKAGING_PRICE_INACCURATE 应显示为 包装报价偏差')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_REVIEW_REASON_WRONG === '包装复核原因错误', 'PACKAGING_REVIEW_REASON_WRONG 应显示为 包装复核原因错误')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_ESTIMATE_BUT_QUOTED === '应预报价却正式报价', 'SHOULD_ESTIMATE_BUT_QUOTED 应显示为 应预报价却正式报价')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_HANDOFF_BUT_NOT === '应转人工却未转人工', 'SHOULD_HANDOFF_BUT_NOT 应显示为 应转人工却未转人工')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_QUOTED_BUT_ESTIMATED === '应正式报价却仅预报价', 'SHOULD_QUOTED_BUT_ESTIMATED 应显示为 应正式报价却仅预报价')
})

test('issueType 选项 value 应保持英文枚举兼容', () => {
  assert(REFLECTION_ISSUE_TYPE_OPTIONS.length === 12, '应扩展为 12 个 issueType 选项')
  assert(REFLECTION_ISSUE_TYPE_OPTIONS.every((option) => option.value in REFLECTION_ISSUE_TYPE_LABELS), '选项 value 应保持英文枚举值')
})

test('未知 issueType 应兜底返回原值', () => {
  assert(getReflectionIssueTypeLabel('CUSTOM_UNKNOWN') === 'CUSTOM_UNKNOWN', '未知 issueType 应返回原值')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((result) => result.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}