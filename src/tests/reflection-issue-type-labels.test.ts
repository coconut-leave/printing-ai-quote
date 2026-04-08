import {
  REFLECTION_ISSUE_TYPE_OPTIONS,
  REFLECTION_ISSUE_TYPE_LABELS,
  getReflectionIssueTypeLabel,
} from '@/lib/reflection/issueTypes'
import {
  REFLECTION_BUSINESS_ISSUE_TYPE_OPTIONS,
  buildReflectionBusinessFeedbackSummary,
} from '@/lib/reflection/businessFeedback'

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
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_PARAM_WRONG === '包装识别不对', 'PACKAGING_PARAM_WRONG 应显示为 包装识别不对')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_PARAM_MISSING === '包装信息没问全', 'PACKAGING_PARAM_MISSING 应显示为 包装信息没问全')
  assert(REFLECTION_ISSUE_TYPE_LABELS.BUNDLE_STRUCTURE_WRONG === '主件/配件归属不对', 'BUNDLE_STRUCTURE_WRONG 应显示为 主件/配件归属不对')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_PRICE_INACCURATE === '包装价格不对', 'PACKAGING_PRICE_INACCURATE 应显示为 包装价格不对')
  assert(REFLECTION_ISSUE_TYPE_LABELS.PACKAGING_REVIEW_REASON_WRONG === '转人工/参考价理由不对', 'PACKAGING_REVIEW_REASON_WRONG 应显示为 转人工/参考价理由不对')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_ESTIMATE_BUT_QUOTED === '这单该给参考价，不该正式报价', 'SHOULD_ESTIMATE_BUT_QUOTED 应显示为 这单该给参考价，不该正式报价')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_HANDOFF_BUT_NOT === '这单该转人工，但系统没转', 'SHOULD_HANDOFF_BUT_NOT 应显示为 这单该转人工，但系统没转')
  assert(REFLECTION_ISSUE_TYPE_LABELS.SHOULD_QUOTED_BUT_ESTIMATED === '这单可以正式报价，不该只给参考价', 'SHOULD_QUOTED_BUT_ESTIMATED 应显示为 这单可以正式报价，不该只给参考价')
})

test('issueType 选项 value 应保持英文枚举兼容', () => {
  assert(REFLECTION_ISSUE_TYPE_OPTIONS.length === 12, '应扩展为 12 个 issueType 选项')
  assert(REFLECTION_ISSUE_TYPE_OPTIONS.every((option) => option.value in REFLECTION_ISSUE_TYPE_LABELS), '选项 value 应保持英文枚举值')
})

test('业务反馈选项与摘要应使用当前订单 / 学习记录口径', () => {
  assert(REFLECTION_BUSINESS_ISSUE_TYPE_OPTIONS.some((option) => option.label === '包装信息没问全'), '业务反馈问题类型应使用更业务化中文')
  const summary = buildReflectionBusinessFeedbackSummary({
    problemSummary: '客户这单只补了说明书尺寸，系统却直接走了正式报价。',
    correctHandling: '应给参考价',
    correctResult: '这单先继续补信息，价格按 ¥1000 左右参考。',
    shouldHandoff: 'no',
    notes: '当前订单已改回参考价，学习记录仅用于后续复盘。',
  })

  assert(summary.includes('这次业务反馈：客户这单只补了说明书尺寸，系统却直接走了正式报价。'), '摘要应使用 这次业务反馈 前缀')
  assert(summary.includes('这单正确处理：应给参考价'), '摘要应使用 这单正确处理 前缀')
  assert(summary.includes('这单是否应转人工：否'), '摘要应使用 这单是否应转人工 前缀')
  assert(summary.includes('补充说明：当前订单已改回参考价，学习记录仅用于后续复盘。'), '摘要应使用 补充说明 前缀')
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