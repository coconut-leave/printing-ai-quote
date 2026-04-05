import { buildMinimalDashboardStats } from '@/server/analytics/dashboard'

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

console.log('\n=== 运营看板回归测试 ===\n')

test('应按时间窗口聚合趋势，并将非活跃品类移出主统计', () => {
  const now = new Date('2026-04-02T12:00:00.000Z')
  const stats = buildMinimalDashboardStats({
    now,
    period: '7d',
    conversations: [
      {
        id: 1,
        status: 'QUOTED',
        updatedAt: new Date('2026-04-02T12:00:00.000Z'),
        messages: [
          { id: 11, sender: 'ASSISTANT', createdAt: new Date('2026-04-01T10:00:00.000Z'), metadata: { responseStatus: 'consultation_reply', consultationIntent: 'MATERIAL_CONSULTATION', matchedKnowledgeCardTitle: '铜版纸和哑粉纸怎么选', matchedKnowledgeCardId: 'mat-1', consultationCategory: 'MATERIAL', hasRecommendedParams: true } },
          { id: 12, sender: 'ASSISTANT', createdAt: new Date('2026-04-01T10:05:00.000Z'), metadata: { responseStatus: 'recommendation_confirmation', intent: 'RECOMMENDATION_CONFIRMATION' } },
          { id: 13, sender: 'ASSISTANT', createdAt: new Date('2026-04-01T10:10:00.000Z'), metadata: { responseStatus: 'quoted', quoteParams: { productType: 'tuck_end_box' }, missingFields: [] } },
        ],
        quotes: [{ id: 201 }],
        handoffs: [],
      },
      {
        id: 2,
        status: 'MISSING_FIELDS',
        updatedAt: new Date('2026-04-02T12:00:00.000Z'),
        messages: [
          { id: 21, sender: 'ASSISTANT', createdAt: new Date('2026-03-31T09:00:00.000Z'), metadata: { responseStatus: 'consultation_reply', consultationIntent: 'SPEC_RECOMMENDATION', matchedKnowledgeCardTitle: 'A4画册常见页数建议', matchedKnowledgeCardId: 'spec-1', consultationCategory: 'SPEC', hasRecommendedParams: false } },
          { id: 22, sender: 'ASSISTANT', createdAt: new Date('2026-03-31T09:10:00.000Z'), metadata: { responseStatus: 'estimated', estimatedData: { finalPrice: 100, normalizedParams: { productType: 'mailer_box' } }, missingFields: ['length'] } },
          { id: 23, sender: 'ASSISTANT', createdAt: new Date('2026-03-31T09:15:00.000Z'), metadata: { responseStatus: 'missing_fields', mergedParams: { productType: 'mailer_box' }, missingFields: ['length'] } },
        ],
        quotes: [],
        handoffs: [],
      },
      {
        id: 3,
        status: 'PENDING_HUMAN',
        updatedAt: new Date('2026-04-02T12:00:00.000Z'),
        messages: [
          { id: 31, sender: 'ASSISTANT', createdAt: new Date('2026-04-02T08:00:00.000Z'), metadata: { responseStatus: 'handoff_required', mergedParams: { productType: 'window_box' } } },
        ],
        quotes: [],
        handoffs: [{ reason: '涉及设计文件或专业审稿需求', createdAt: new Date('2026-04-02T08:00:00.000Z') }],
      },
      {
        id: 4,
        status: 'QUOTED',
        updatedAt: new Date('2026-04-01T16:00:00.000Z'),
        messages: [
          { id: 41, sender: 'ASSISTANT', createdAt: new Date('2026-03-20T10:00:00.000Z'), metadata: { responseStatus: 'consultation_reply', consultationIntent: 'PROCESS_CONSULTATION', matchedKnowledgeCardTitle: '骑马钉和胶装区别', matchedKnowledgeCardId: 'proc-1', consultationCategory: 'PROCESS', hasRecommendedParams: true } },
          { id: 42, sender: 'ASSISTANT', createdAt: new Date('2026-04-01T16:10:00.000Z'), metadata: { responseStatus: 'quoted', quoteParams: { productType: 'album' }, missingFields: [] } },
        ],
        quotes: [{ id: 202 }],
        handoffs: [],
      },
      {
        id: 5,
        status: 'QUOTED',
        updatedAt: new Date('2026-03-20T12:00:00.000Z'),
        messages: [
          { id: 51, sender: 'ASSISTANT', createdAt: new Date('2026-03-20T10:00:00.000Z'), metadata: { responseStatus: 'quoted', quoteParams: { productType: 'mailer_box' }, missingFields: [] } },
        ],
        quotes: [{ id: 203 }],
        handoffs: [],
      },
    ],
    reflections: [
      {
        id: 1,
        conversationId: 1,
        issueType: 'PARAM_MISSING',
        suggestionDraft: '建议优化 estimated 默认值',
        correctedParams: { pageCount: 24, quantity: 1000 },
        originalExtractedParams: null,
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
      },
      {
        id: 2,
        conversationId: 3,
        issueType: 'SHOULD_HANDOFF',
        suggestionDraft: '建议加强文件型询价转人工',
        correctedParams: null,
        originalExtractedParams: null,
        createdAt: new Date('2026-03-22T12:00:00.000Z'),
      },
    ],
    approvedReflections: [
      {
        id: 1,
        conversationId: 1,
        issueType: 'PARAM_MISSING',
        suggestionDraft: '建议优化 estimated 默认值',
        correctedParams: { pageCount: 24, quantity: 1000 },
        originalExtractedParams: null,
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
      },
    ],
  })

  assert(stats.quotePathOverview.quotedCount === 1, '应统计 quoted 会话数')
  assert(stats.quotePathOverview.estimatedCount === 1, '应统计 estimated 会话数')
  assert(stats.quotePathOverview.missingFieldsCount === 1, '应统计 missing_fields 会话数')
  assert(stats.quotePathOverview.handoffRequiredCount === 1, '应统计 handoff_required 会话数')
  assert(stats.quotePathTrend.quotedCountDelta === 0, '应支持 quoted 趋势对比')

  assert(stats.consultationFunnel.consultationReplyCount === 2, '应统计 consultation_reply 漏斗起点')
  assert(stats.consultationOverview.consultationWithRecommendedParamsCount === 1, '应统计带 recommendedParams 的咨询会话数')
  assert(stats.consultationOverview.consultationToRecommendationConfirmationCount === 1, '应统计 consultation 到 recommendation_confirmation')
  assert(stats.consultationOverview.consultationToEstimatedCount === 1, '应统计 consultation 到 estimated')
  assert(stats.consultationOverview.consultationToQuotedCount === 1, '应统计 consultation 到 quoted')
  assert(stats.consultationFunnelTrend.consultationReplyCountDelta === 1, '应支持 consultation 漏斗趋势对比')

  assert(stats.productTypeBreakdown.find((item) => item.productType === 'tuck_end_box')?.quotedCount === 1, '应在主统计中保留活跃复杂包装正式报价')
  assert(stats.productTypeBreakdown.find((item) => item.productType === 'window_box')?.handoffRequiredCount === 1, '应按活跃复杂包装统计人工复核')
  assert(!stats.productTypeBreakdown.find((item) => item.productType === 'album'), '简单品类不应出现在主统计 productType 拆分中')
  assert(stats.nonActiveProductTypeBreakdown.find((item) => item.productType === 'album')?.quotedCount === 1, '简单品类应下沉到非活跃品类统计中')
  assert(stats.nonActiveProductRecordCount === 1, '应统计被移出主看板的非活跃品类记录数')

  assert(stats.learningOverview.reflectionCount === 1, '应按时间窗口统计 reflection 总数')
  assert(stats.learningOverview.approvedReflectionCount === 1, '应统计 approved reflection 总数')
  assert(stats.topIssues.missingFields[0]?.field === 'pageCount', '应输出最常缺失字段')
  assert(stats.topIssues.consultationTopics[0]?.topic === '铜版纸和哑粉纸怎么选', '应输出最常见咨询主题')
  assert(stats.topIssues.handoffReasons[0]?.reason === '涉及设计文件或专业审稿需求', '应输出最常见转人工原因')
  assert(stats.period.key === '7d', '应返回当前时间窗口')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)