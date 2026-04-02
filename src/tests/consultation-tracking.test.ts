import { buildConsultationTrackingStats } from '@/server/analytics/consultationTracking'

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

console.log('\n=== 咨询命中与推荐转化追踪回归测试 ===\n')

test('应统计咨询分布、recommendedParams 与 estimated/quoted 转化', () => {
  const stats = buildConsultationTrackingStats([
    {
      id: 1,
      status: 'OPEN',
      messages: [
        { id: 11, sender: 'ASSISTANT', metadata: { intent: 'MATERIAL_CONSULTATION', consultationIntent: 'MATERIAL_CONSULTATION', matchedKnowledgeCardId: 'material-coated-paper-generic', matchedKnowledgeCardTitle: '铜版纸', consultationCategory: 'MATERIAL', hasRecommendedParams: false, productType: 'album', responseStatus: 'consultation_reply' } },
      ],
      quotes: [],
    },
    {
      id: 2,
      status: 'MISSING_FIELDS',
      messages: [
        { id: 21, sender: 'ASSISTANT', metadata: { intent: 'SPEC_RECOMMENDATION', consultationIntent: 'SPEC_RECOMMENDATION', matchedKnowledgeCardId: 'spec-flyer-weight', matchedKnowledgeCardTitle: '传单常见克重', consultationCategory: 'SPEC', hasRecommendedParams: true, productType: 'flyer', responseStatus: 'consultation_reply', recommendedParams: { productType: 'flyer' } } },
        { id: 22, sender: 'ASSISTANT', metadata: { intent: 'RECOMMENDATION_CONFIRMATION', responseStatus: 'estimated', mergedParams: { productType: 'flyer' }, estimatedData: { normalizedParams: { productType: 'flyer' }, finalPrice: 123 } } },
      ],
      quotes: [],
    },
    {
      id: 3,
      status: 'QUOTED',
      messages: [
        { id: 31, sender: 'ASSISTANT', metadata: { intent: 'SOLUTION_RECOMMENDATION', consultationIntent: 'SOLUTION_RECOMMENDATION', matchedKnowledgeCardId: 'solution-general-standard', matchedKnowledgeCardTitle: '通用标准方案', consultationCategory: 'SOLUTION', hasRecommendedParams: true, productType: 'album', responseStatus: 'consultation_reply', recommendedParams: { productType: 'album' } } },
        { id: 32, sender: 'ASSISTANT', metadata: { intent: 'RECOMMENDATION_CONFIRMATION', responseStatus: 'quoted', quoteParams: { productType: 'album' }, missingFields: [] } },
      ],
      quotes: [{ id: 301 }],
    },
    {
      id: 4,
      status: 'PENDING_HUMAN',
      messages: [
        { id: 41, sender: 'ASSISTANT', metadata: { intent: 'PROCESS_CONSULTATION', consultationIntent: 'PROCESS_CONSULTATION', matchedKnowledgeCardId: 'process-binding-comparison', matchedKnowledgeCardTitle: '骑马钉与胶装', consultationCategory: 'PROCESS', hasRecommendedParams: true, productType: 'album', responseStatus: 'consultation_reply', recommendedParams: { productType: 'album' } } },
        { id: 42, sender: 'ASSISTANT', metadata: { intent: 'FILE_REVIEW_REQUEST', responseStatus: 'handoff_required' } },
      ],
      quotes: [],
    },
    {
      id: 5,
      status: 'OPEN',
      messages: [
        { id: 51, sender: 'ASSISTANT', metadata: { intent: 'SOLUTION_RECOMMENDATION', consultationIntent: 'SOLUTION_RECOMMENDATION', matchedKnowledgeCardId: 'solution-flyer-standard', matchedKnowledgeCardTitle: '传单标准方案', consultationCategory: 'SOLUTION', hasRecommendedParams: true, productType: 'flyer', responseStatus: 'consultation_reply', recommendedParams: { productType: 'flyer' } } },
        { id: 52, sender: 'ASSISTANT', metadata: { intent: 'PARAM_SUPPLEMENT', responseStatus: 'recommendation_updated', mergedRecommendedParams: { productType: 'flyer' }, patchSummary: '尺寸改为 A3' } },
      ],
      quotes: [],
    },
    {
      id: 6,
      status: 'MISSING_FIELDS',
      messages: [
        { id: 61, sender: 'ASSISTANT', metadata: { intent: 'SOLUTION_RECOMMENDATION', consultationIntent: 'SOLUTION_RECOMMENDATION', matchedKnowledgeCardId: 'solution-business-card-standard', matchedKnowledgeCardTitle: '名片标准方案', consultationCategory: 'SOLUTION', hasRecommendedParams: true, productType: 'business_card', responseStatus: 'consultation_reply', recommendedParams: { productType: 'business_card' } } },
        { id: 62, sender: 'ASSISTANT', metadata: { intent: 'RECOMMENDATION_CONFIRMATION', responseStatus: 'missing_fields', mergedParams: { productType: 'business_card' }, missingFields: ['quantity'] } },
      ],
      quotes: [],
    },
  ])

  assert(stats.totals.consultationMessageCount === 6, '应统计 6 条咨询消息')
  assert(stats.totals.consultationWithRecommendedParamsCount === 5, '应统计 5 条带 recommendedParams 的咨询')
  assert(stats.totals.recommendationConfirmationConversationCount === 3, '应统计 3 个 recommendation_confirmation 会话')
  assert(stats.totals.recommendationUpdatedCount === 1, '应统计 1 条 recommendation_updated 消息')
  assert(stats.totals.estimatedConversionCount === 1, '应统计 1 个 estimated 转化')
  assert(stats.totals.quotedConversionCount === 1, '应统计 1 个 quoted 转化')
  assert(stats.totals.knowledgeOnlyConversationCount === 1, '应统计 1 个仅知识回复会话')
  assert(stats.totals.recommendationToEstimatedCount === 1, '应统计 1 个 recommendation 到 estimated')
  assert(stats.totals.recommendationToQuotedCount === 1, '应统计 1 个 recommendation 到 quoted')
  assert(stats.totals.recommendationToHandoffCount === 1, '应统计 1 个 recommendation 到 handoff')
  assert(stats.totals.recommendationUpdatedStalledCount === 1, '应统计 1 个停留在 recommendation_updated 的 flow')
  assert(stats.totals.recommendationMissingFieldsStalledCount === 1, '应统计 1 个停留在 missing_fields 的 flow')
  assert(stats.knowledgeCardHitDistribution.length === 6, '应统计 6 张命中的 knowledge card')
  assert(stats.recentKnowledgeHits.length === 6, '应返回最近命中的 knowledge card 列表')

  const coated = stats.knowledgeCardHitDistribution.find((item) => item.cardId === 'material-coated-paper-generic')
  assert(coated?.hitCount === 1, '应统计具体 knowledge card 命中次数')

  const solutionHit = stats.recentKnowledgeHits.find((item) => item.cardId === 'solution-general-standard')
  assert(solutionHit?.hasRecommendedParams === true, '应返回 knowledge card 是否带 recommendedParams')

  const spec = stats.consultationOutcomeByIntent.find((item) => item.intent === 'SPEC_RECOMMENDATION')
  assert(spec?.estimatedCount === 1, '规格建议应转化 1 个 estimated')

  const solution = stats.consultationOutcomeByIntent.find((item) => item.intent === 'SOLUTION_RECOMMENDATION')
  assert(solution?.quotedCount === 1, '方案推荐应转化 1 个 quoted')

  const flyerProductFlow = stats.productTypeRecommendationConversion.find((item) => item.productType === 'flyer')
  assert(flyerProductFlow?.estimatedCount === 1, 'flyer recommendation 应统计 estimated 转化')
  assert(flyerProductFlow?.missingFieldsStalledCount === 0, 'flyer recommendation 不应统计 missing_fields 停留')

  const standardSolution = stats.recommendedSolutionConversion.find((item) => item.cardId === 'solution-general-standard')
  assert(standardSolution?.quotedCount === 1, '通用标准方案应统计 1 个 quoted')
  assert(standardSolution?.quotedRate === 100, '通用标准方案 quoted rate 应为 100%')

  const stalledFlyer = stats.recommendationStallDistribution.find((item) => item.cardId === 'solution-flyer-standard')
  assert(stalledFlyer?.recommendationUpdatedStalledCount === 1, '传单标准方案应统计 1 个 recommendation_updated 停留')

  const missingBusinessCard = stats.recommendationStallDistribution.find((item) => item.cardId === 'solution-business-card-standard')
  assert(missingBusinessCard?.missingFieldsStalledCount === 1, '名片标准方案应统计 1 个 missing_fields 停留')

  const recentQuotedFlow = stats.recentRecommendationFlows.find((item) => item.cardId === 'solution-general-standard')
  assert(recentQuotedFlow?.latestStage === 'quoted', '最近 recommendation flow 应包含 quoted 样例')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)