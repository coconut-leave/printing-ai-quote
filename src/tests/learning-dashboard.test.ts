import { buildLearningDashboardStats } from '@/server/learning/learningDashboard'
import { deriveImpactArea } from '@/server/learning/improvementSuggestion'
import { clearAllStatuses, setImprovementStatus } from '@/server/learning/improvementStore'

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

console.log('\n=== Learning Dashboard 回归测试 ===\n')

test('impactArea 应优先从 suggestionType / targetArea 推导', () => {
  const pricing = deriveImpactArea({
    issueType: 'PARAM_MISSING',
    suggestionType: 'ESTIMATE_DEFAULT_IMPROVEMENT',
    targetArea: 'ESTIMATE',
    suggestionDraft: '建议优化 estimated 默认值',
  })
  assert(pricing === 'PRICING', 'ESTIMATE_DEFAULT_IMPROVEMENT 应映射到 PRICING')

  const handoff = deriveImpactArea({
    issueType: 'SHOULD_HANDOFF',
    suggestionType: 'HANDOFF_POLICY_IMPROVEMENT',
    targetArea: 'HANDOFF_POLICY',
    suggestionDraft: '建议加强文件型询价转人工',
  })
  assert(handoff === 'HANDOFF', 'HANDOFF_POLICY_IMPROVEMENT 应映射到 HANDOFF')

  const recommendation = deriveImpactArea({
    issueType: 'PARAM_WRONG',
    suggestionType: 'PROMPT_IMPROVEMENT',
    targetArea: 'PROMPT',
    suggestionDraft: '建议优化推荐方案识别和 recommendedParams 输出',
  })
  assert(recommendation === 'RECOMMENDATION', '推荐方案语义应映射到 RECOMMENDATION')
})

test('应统计 learning effectiveness 基础指标与观察性分析', () => {
  clearAllStatuses()
  const now = new Date('2026-04-02T12:00:00.000Z')
  const reflections = [
    {
      id: 1,
      conversationId: 101,
      issueType: 'PARAM_MISSING',
      suggestionDraft: '建议优化 estimated 默认值',
      correctedParams: { quantity: 1000 },
      originalExtractedParams: null,
      createdAt: new Date('2026-03-13T12:00:00.000Z'),
    },
    {
      id: 2,
      conversationId: 102,
      issueType: 'PARAM_MISSING',
      suggestionDraft: '建议优化 estimated 默认值',
      correctedParams: { quantity: 2000 },
      originalExtractedParams: null,
      createdAt: new Date('2026-03-18T12:00:00.000Z'),
    },
    {
      id: 3,
      conversationId: 103,
      issueType: 'SHOULD_HANDOFF',
      suggestionDraft: '建议加强文件型询价转人工',
      correctedParams: null,
      originalExtractedParams: null,
      createdAt: new Date('2026-03-28T12:00:00.000Z'),
    },
    {
      id: 4,
      conversationId: 104,
      issueType: 'QUOTE_INACCURATE',
      suggestionDraft: '建议优化报价默认估算逻辑',
      correctedParams: { paperWeight: 157 },
      originalExtractedParams: null,
      createdAt: new Date('2026-03-30T12:00:00.000Z'),
    },
  ]

  const approvedReflections = [
    {
      id: 1,
      conversationId: 101,
      issueType: 'PARAM_MISSING',
      suggestionDraft: '建议优化 estimated 默认值',
      correctedParams: { quantity: 1000 },
      originalExtractedParams: null,
      createdAt: new Date('2026-03-13T12:00:00.000Z'),
    },
    {
      id: 3,
      conversationId: 103,
      issueType: 'SHOULD_HANDOFF',
      suggestionDraft: '建议加强文件型询价转人工',
      correctedParams: null,
      originalExtractedParams: null,
      createdAt: new Date('2026-03-28T12:00:00.000Z'),
    },
    {
      id: 4,
      conversationId: 104,
      issueType: 'QUOTE_INACCURATE',
      suggestionDraft: '建议优化推荐方案 patch 后报价逻辑',
      correctedParams: { pageCount: 40 },
      originalExtractedParams: null,
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
    },
  ]

  setImprovementStatus('imp_1_1773403200', 'ACCEPTED')
  setImprovementStatus('imp_3_1774699200', 'VERIFIED')
  setImprovementStatus('imp_4_1774180800', 'ACCEPTED')

  const stats = buildLearningDashboardStats({ reflections, approvedReflections, now })

  const pricingImprovement = stats.suggestionTypeAcceptance.find((item) => item.suggestionType === 'ESTIMATE_DEFAULT_IMPROVEMENT')
  assert(pricingImprovement?.totalCount === 1, '应统计估算默认值建议数量')

  assert(stats.totals.reflectionCount === 4, '应统计 reflection 总数')
  assert(stats.totals.approvedImprovementCount === 3, '应统计 approved improvements 总数')

  const topIssue = stats.issueTypeDistribution[0]
  assert(topIssue.issueType === 'PARAM_MISSING' && topIssue.count === 2, '应统计 issueType TOP')

  const impactAreas = stats.impactAreaDistribution.map((item) => item.impactArea)
  assert(impactAreas.includes('PRICING'), '应包含 PRICING impactArea')
  assert(impactAreas.includes('HANDOFF'), '应包含 HANDOFF impactArea')
  assert(impactAreas.includes('PATCH'), '应包含 PATCH impactArea')

  assert(stats.recentActivityOverview.thirtyDays.reflectionCount === 4, '30 天活动应统计 reflection 数')
  assert(stats.prioritySignals.issueTypeTop[0]?.issueType === 'PARAM_MISSING', '应给出当前优先问题类型')
  assert(stats.prioritySignals.nextEngineeringCandidates.length >= 1, '应给出下一轮工程任务候选')
  assert(stats.prioritySignals.lowSignalVerifiedActions.length >= 1, '应识别低信号 verified actions')

  clearAllStatuses()
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)