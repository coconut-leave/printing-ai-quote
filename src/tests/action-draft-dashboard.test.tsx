import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActionDraftDashboardView } from '@/components/ActionDraftDashboardView'
import {
  buildActionDraftDashboardStats,
  type ActionDraftDashboardStats,
} from '@/server/learning/actionDraftDashboard'
import { generateImprovementId } from '@/server/learning/improvementSuggestion'
import {
  clearAllStatuses,
  setImprovementStatus,
  setImprovementTargetFileHint,
} from '@/server/learning/improvementStore'

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

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✓ ${name}`)
    })
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name, passed: false, error })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${error}`)
    })
}

function setStatus(reflectionId: number, createdAt: Date, status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'IMPLEMENTED' | 'VERIFIED' | 'REJECTED') {
  setImprovementStatus(generateImprovementId(reflectionId, createdAt), status)
}

function setFileHint(reflectionId: number, createdAt: Date, fileHint: string) {
  setImprovementTargetFileHint(generateImprovementId(reflectionId, createdAt), fileHint)
}

function buildBaseReflections() {
  return [
    {
      id: 1,
      conversationId: 201,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工修正了复杂包装主件材质和克重。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            material: 'single_coated',
            weight: 400,
            printColor: 'black_1',
          },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            material: 'white_card_350g',
            weight: 350,
            printColor: 'cmyk_4',
          },
        },
      },
      createdAt: new Date('2026-03-01T12:00:00.000Z'),
    },
    {
      id: 2,
      conversationId: 202,
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      suggestionDraft: '人工调整了子项结构。',
      originalExtractedParams: {
        productType: 'tuck_end_box',
        packagingContext: {
          mainItem: { productType: 'tuck_end_box', title: '双插盒' },
          subItems: [],
        },
      },
      correctedParams: {
        productType: 'tuck_end_box',
        packagingContext: {
          mainItem: { productType: 'tuck_end_box', title: '双插盒' },
          subItems: [{ productType: 'leaflet_insert', title: '说明书' }],
        },
      },
      createdAt: new Date('2026-03-10T12:00:00.000Z'),
    },
    {
      id: 3,
      conversationId: 203,
      issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
      suggestionDraft: '人工将结果从 quoted 调整到 estimated。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒' },
          packagingReview: { status: 'quoted', reviewReasons: [] },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒' },
        },
      },
      createdAt: new Date('2026-03-15T12:00:00.000Z'),
    },
    {
      id: 4,
      conversationId: 204,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '人工修正报价判断前置结果。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            material: 'single_coated',
          },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            material: 'white_card',
          },
        },
      },
      createdAt: new Date('2026-03-20T12:00:00.000Z'),
    },
    {
      id: 5,
      conversationId: 205,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '人工再次修正报价判断前置结果。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            material: 'single_coated',
          },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            material: 'white_card',
          },
        },
      },
      createdAt: new Date('2026-03-28T12:00:00.000Z'),
    },
  ]
}

function buildPriorityReflections() {
  return [
    {
      id: 11,
      conversationId: 301,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '人工修正报价判断前置结果。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card' },
        },
      },
      createdAt: new Date('2026-02-20T12:00:00.000Z'),
    },
    {
      id: 12,
      conversationId: 302,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '人工再次修正报价判断前置结果。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card' },
        },
      },
      createdAt: new Date('2026-02-24T12:00:00.000Z'),
    },
    {
      id: 13,
      conversationId: 303,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '人工第三次修正报价判断前置结果。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card' },
        },
      },
      createdAt: new Date('2026-02-15T12:00:00.000Z'),
    },
    {
      id: 14,
      conversationId: 304,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工修正了复杂包装材质字段。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card_350g' },
        },
      },
      createdAt: new Date('2026-03-18T12:00:00.000Z'),
    },
    {
      id: 15,
      conversationId: 305,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工再次修正了复杂包装材质字段。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: {
          mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card_350g' },
        },
      },
      createdAt: new Date('2026-03-21T12:00:00.000Z'),
    },
  ]
}

function buildBaseStats() {
  clearAllStatuses()
  const approvedReflections = buildBaseReflections()

  setStatus(1, approvedReflections[0].createdAt, 'ACCEPTED')
  setStatus(2, approvedReflections[1].createdAt, 'VERIFIED')
  setStatus(3, approvedReflections[2].createdAt, 'IMPLEMENTED')
  setStatus(4, approvedReflections[3].createdAt, 'REVIEWED')
  setStatus(5, approvedReflections[4].createdAt, 'NEW')

  return buildActionDraftDashboardStats({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
}

function buildPriorityStats() {
  clearAllStatuses()
  const approvedReflections = buildPriorityReflections()

  setStatus(11, approvedReflections[0].createdAt, 'ACCEPTED')
  setStatus(12, approvedReflections[1].createdAt, 'IMPLEMENTED')
  setStatus(13, approvedReflections[2].createdAt, 'REVIEWED')
  setStatus(14, approvedReflections[3].createdAt, 'ACCEPTED')
  setStatus(15, approvedReflections[4].createdAt, 'ACCEPTED')
  setFileHint(14, approvedReflections[3].createdAt, 'src/server/learning/fieldMappingRules.ts')
  setFileHint(15, approvedReflections[4].createdAt, 'src/server/learning/fieldMappingRules.ts')

  return buildActionDraftDashboardStats({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
}

function renderView(stats: ActionDraftDashboardStats | null, loading = false) {
  return renderToStaticMarkup(
    <ActionDraftDashboardView
      stats={stats}
      loading={loading}
      filters={{
        timeRangeDays: 'ALL',
        status: 'ALL',
        targetArea: 'ALL',
        changeType: 'ALL',
        riskLevel: 'ALL',
      }}
      onFilterChange={() => {}}
    />
  )
}

console.log('\n=== Action Draft Dashboard 回归测试 ===\n')

async function main() {
  await test('priorityScore 计算规则稳定', () => {
    const stats = buildPriorityStats()
    const topAction = stats.priorityInsights.topActions[0]

    assert(topAction.priorityScore === 100, '顶级优先动作的 priorityScore 应稳定为 100')
    assert(topAction.priorityLevel === 'HIGH', '顶级优先动作应为 HIGH')
  })

  await test('高频 + 高风险 + 高接受率的 action 会排到前面', () => {
    const stats = buildPriorityStats()
    const topAction = stats.priorityInsights.topActions[0]

    assert(topAction.sourceReflectionId === 13, '高频高风险且同类接受率较高的 pricing_rule_review 应排第一')
    assert(topAction.changeType === 'pricing_rule_review', '第一名应是 pricing_rule_review')
    assert(topAction.changeTypeAcceptedRate >= 60, '第一名应具备较高接受率')
  })

  await test('governance bucket 分类正确', () => {
    const priorityStats = buildPriorityStats()
    const topAction = priorityStats.priorityInsights.topActions[0]
    const baseStats = buildBaseStats()
    const verifiedPrompt = baseStats.priorityInsights.topActions.find((item) => item.sourceReflectionId === 2)

    assert(topAction.governanceBucket === 'HIGH_RISK_REVIEW', '高风险未闭环动作应归入 HIGH_RISK_REVIEW')
    assert(verifiedPrompt?.governanceBucket === 'WATCHLIST', '已 VERIFIED 的动作应进入 WATCHLIST')
  })

  await test('recommendedNextAction 可生成', () => {
    const stats = buildPriorityStats()
    const topAction = stats.priorityInsights.topActions[0]

    assert(topAction.recommendedNextAction.includes('报价判断前置规则') || topAction.recommendedNextAction.includes('专项治理'), '应生成可执行的中文下一步建议')
    assert(topAction.governanceTheme.includes('复杂包装'), '应生成治理主题')
    assert(topAction.whyNow.length > 0, '应生成 whyNow')
  })

  await test('高频 targetFileHint 可正确识别为专项治理候选', () => {
    const stats = buildPriorityStats()
    const topFileCandidate = stats.priorityInsights.targetFileCandidates[0]

    assert(topFileCandidate.targetFileHint === 'src/server/packaging/extractComplexPackagingQuote.ts', '高频专项治理候选应优先命中包装抽取文件')
    assert(topFileCandidate.isSpecialGovernanceCandidate, '高频目标文件应被识别为专项治理候选')
    assert(topFileCandidate.governanceBucket === 'HIGH_RISK_REVIEW' || topFileCandidate.governanceBucket === 'IMMEDIATE_FIX', '高频目标文件应进入高优先治理桶')
  })

  await test('targetArea 聚合结果正确', () => {
    const stats = buildBaseStats()
    const prompt = stats.targetAreaStats.find((item) => item.targetArea === 'PROMPT')
    const estimate = stats.targetAreaStats.find((item) => item.targetArea === 'ESTIMATE')

    assert(prompt?.totalCount === 1, 'PROMPT targetArea 应聚合到 1 条')
    assert(prompt?.statusCounts.VERIFIED === 1, 'PROMPT targetArea 应包含 VERIFIED 分布')
    assert(estimate?.totalCount === 3, 'ESTIMATE targetArea 应聚合到 3 条')
    assert(estimate?.statusCounts.NEW === 1 && estimate?.statusCounts.REVIEWED === 1, 'ESTIMATE targetArea 应统计待处理状态')
  })

  await test('changeType 的 ACCEPTED 比率统计正确', () => {
    const stats = buildBaseStats()
    const mapping = stats.changeTypeStats.find((item) => item.changeType === 'mapping_update')
    const threshold = stats.changeTypeStats.find((item) => item.changeType === 'threshold_update')

    assert(mapping?.acceptedCount === 1, 'mapping_update 的 ACCEPTED 数量应正确')
    assert(mapping?.acceptedRate === 100, 'mapping_update 的接受率应为 100%')
    assert(threshold?.acceptedOrLaterCount === 1, 'threshold_update 应统计进入 ACCEPTED 后续阶段数量')
    assert(threshold?.acceptedRate === 100, 'threshold_update 的接受率应为 100%')
  })

  await test('riskLevel 积压统计正确', () => {
    const stats = buildBaseStats()
    const high = stats.riskLevelStats.find((item) => item.riskLevel === 'HIGH')

    assert(high?.totalCount === 2, 'HIGH risk 应聚合到 2 条')
    assert(high?.unresolvedCount === 2, 'HIGH risk 未关闭数量应正确')
    assert(high?.pendingReviewCount === 2, 'HIGH risk 待处理数量应正确')
    assert(stats.highRiskBacklog.length === 2, '应列出高风险积压列表')
  })

  await test('dashboard 页面在有数据时渲染稳定', () => {
    const html = renderView(buildPriorityStats())

    assert(html.includes('当前最值得优先治理的问题 Top N'), '应渲染优先治理模块')
    assert(html.includes('高频 targetFileHint 专项治理候选'), '应渲染专项治理候选模块')
    assert(html.includes('高风险积压项'), '应渲染高风险积压模块')
    assert(html.includes('高接受率治理类型'), '应渲染高接受率模块')
    assert(html.includes('建议下一步'), '应渲染 recommendedNextAction')
  })

  await test('dashboard 页面在空数据时也能正常显示', () => {
    const emptyStats = buildActionDraftDashboardStats({
      approvedReflections: [],
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const html = renderView(emptyStats)

    assert(html.includes('暂无 action draft 数据'), '空数据时应显示空态文案')
  })

  await test('现有聚合统计与 actions 工作台不受影响', () => {
    const stats = buildBaseStats()

    assert(stats.summary.totalActionDraftCount === 5, '聚合不应破坏 action draft 生成数量')
    assert(stats.summary.acceptedOrLaterCount === 3, '聚合不应破坏现有状态统计')
    assert(stats.priorityInsights.topActions.length >= 1, '新增优先级视图不应破坏现有 dashboard 数据返回')
  })

  clearAllStatuses()

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
