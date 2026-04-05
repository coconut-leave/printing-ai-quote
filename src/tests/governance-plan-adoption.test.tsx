import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GovernanceEffectivenessView } from '@/components/GovernanceEffectivenessView'
import { buildGovernanceEffectivenessData } from '@/server/learning/governanceEffectiveness'
import { applyGovernancePlanDecision } from '@/server/learning/governancePlanActions'
import { buildGovernanceWorkbenchData } from '@/server/learning/governanceWorkbench'
import { generateImprovementId } from '@/server/learning/improvementSuggestion'
import {
  clearAllStatuses,
  setImprovementStatus,
  setImprovementTargetFileHint,
} from '@/server/learning/improvementStore'
import {
  addGovernanceBatchNote,
  assignActionDraftsToCampaign,
  clearGovernanceStore,
  saveGovernanceCampaign,
  setGovernanceCampaignStatus,
} from '@/server/learning/governanceStore'
import { createGovernanceCampaignRecord } from '@/server/learning/governanceCampaign'

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

type TestStatus = 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'IMPLEMENTED' | 'VERIFIED' | 'REJECTED'

function setStatus(reflectionId: number, createdAt: Date, status: TestStatus, at: string) {
  setImprovementStatus(generateImprovementId(reflectionId, createdAt), status, new Date(at))
}

function setFileHint(reflectionId: number, createdAt: Date, fileHint: string) {
  setImprovementTargetFileHint(generateImprovementId(reflectionId, createdAt), fileHint)
}

function pickItemsByTheme(theme: string, count: number, items: Array<{ id: string; createdAt: string; governanceTheme: string }>) {
  const selected = items
    .filter((item) => item.governanceTheme === theme)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, count)

  if (selected.length < count) {
    throw new Error(`Missing seed items for ${theme}`)
  }

  return selected
}

function buildReflections() {
  return [
    {
      id: 501,
      conversationId: 901,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工修正复杂包装材质字段。',
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
      createdAt: new Date('2026-03-10T12:00:00.000Z'),
    },
    {
      id: 502,
      conversationId: 902,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工再次修正复杂包装材质字段。',
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
      createdAt: new Date('2026-03-12T12:00:00.000Z'),
    },
    {
      id: 503,
      conversationId: 903,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '治理后仍出现复杂包装材质字段问题。',
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
      createdAt: new Date('2026-03-20T12:00:00.000Z'),
    },
    {
      id: 504,
      conversationId: 904,
      issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
      suggestionDraft: 'estimated / quoted 边界判断过早。',
      originalExtractedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'quoted' },
        },
      },
      correctedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'estimated' },
        },
      },
      createdAt: new Date('2026-03-11T12:00:00.000Z'),
    },
    {
      id: 505,
      conversationId: 905,
      issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
      suggestionDraft: 'estimated / quoted 边界再次判断过早。',
      originalExtractedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'quoted' },
        },
      },
      correctedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'estimated' },
        },
      },
      createdAt: new Date('2026-03-12T12:00:00.000Z'),
    },
    {
      id: 506,
      conversationId: 906,
      issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
      suggestionDraft: '治理后仍出现 estimated / quoted 边界问题。',
      originalExtractedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'quoted' },
        },
      },
      correctedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'estimated' },
        },
      },
      createdAt: new Date('2026-03-20T12:00:00.000Z'),
    },
    {
      id: 507,
      conversationId: 907,
      issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
      suggestionDraft: '治理后再次出现 estimated / quoted 边界问题。',
      originalExtractedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'quoted' },
        },
      },
      correctedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒' },
          packagingReview: { status: 'estimated' },
        },
      },
      createdAt: new Date('2026-03-21T12:00:00.000Z'),
    },
    {
      id: 508,
      conversationId: 908,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '复杂包装报价判断前置不稳定。',
      originalExtractedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒', material: 'white_card_350g' },
        },
      },
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
    },
    {
      id: 509,
      conversationId: 909,
      issueType: 'PACKAGING_PRICE_INACCURATE',
      suggestionDraft: '复杂包装报价判断前置再次不稳定。',
      originalExtractedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒', material: 'single_coated' },
        },
      },
      correctedParams: {
        productType: 'mailer_box',
        packagingContext: {
          mainItem: { productType: 'mailer_box', title: '飞机盒', material: 'white_card_350g' },
        },
      },
      createdAt: new Date('2026-03-23T12:00:00.000Z'),
    },
  ]
}

function seedScenario() {
  clearAllStatuses()
  clearGovernanceStore()

  const approvedReflections = buildReflections()

  setFileHint(501, approvedReflections[0].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(502, approvedReflections[1].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(503, approvedReflections[2].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(504, approvedReflections[3].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(505, approvedReflections[4].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(506, approvedReflections[5].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(507, approvedReflections[6].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(508, approvedReflections[7].createdAt, 'src/server/ai/packaging/pricingReview.ts')
  setFileHint(509, approvedReflections[8].createdAt, 'src/server/ai/packaging/pricingReview.ts')

  setStatus(501, approvedReflections[0].createdAt, 'ACCEPTED', '2026-03-11T10:00:00.000Z')
  setStatus(501, approvedReflections[0].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(501, approvedReflections[0].createdAt, 'VERIFIED', '2026-03-15T10:00:00.000Z')
  setStatus(502, approvedReflections[1].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(502, approvedReflections[1].createdAt, 'VERIFIED', '2026-03-14T10:00:00.000Z')
  setStatus(503, approvedReflections[2].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')

  setStatus(504, approvedReflections[3].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(504, approvedReflections[3].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(505, approvedReflections[4].createdAt, 'ACCEPTED', '2026-03-13T10:00:00.000Z')
  setStatus(505, approvedReflections[4].createdAt, 'VERIFIED', '2026-03-14T10:00:00.000Z')
  setStatus(506, approvedReflections[5].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')
  setStatus(507, approvedReflections[6].createdAt, 'ACCEPTED', '2026-03-21T10:00:00.000Z')

  setStatus(508, approvedReflections[7].createdAt, 'NEW', '2026-03-22T10:00:00.000Z')
  setStatus(509, approvedReflections[8].createdAt, 'REVIEWED', '2026-03-23T10:00:00.000Z')

  const dashboard = buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })

  const mappingItems = pickItemsByTheme('复杂包装字段映射', 2, dashboard.actionDrafts)
  const estimateItems = pickItemsByTheme('复杂包装 estimated / quoted 边界', 2, dashboard.actionDrafts)

  const mappingCampaign = createGovernanceCampaignRecord({
    items: mappingItems,
    campaignTitle: '材质映射专项',
    now: new Date('2026-03-13T09:00:00.000Z'),
  })
  saveGovernanceCampaign(mappingCampaign)
  assignActionDraftsToCampaign(mappingCampaign.id, mappingItems.map((item) => item.id), '2026-03-13T09:00:00.000Z')
  setGovernanceCampaignStatus(mappingCampaign.id, 'COMPLETED', '2026-03-16T09:00:00.000Z')
  addGovernanceBatchNote({
    campaignId: mappingCampaign.id,
    batchTitle: '材质映射第一轮',
    batchNote: '补了白卡材质映射和目标文件回归。',
    changedWhat: '增加字段映射样例并补测试。',
    expectedImpact: '降低材质字段复发。',
    createdAt: '2026-03-16T10:00:00.000Z',
  })

  const estimateCampaign = createGovernanceCampaignRecord({
    items: estimateItems,
    campaignTitle: '报价边界专项',
    now: new Date('2026-03-13T09:00:00.000Z'),
  })
  saveGovernanceCampaign(estimateCampaign)
  assignActionDraftsToCampaign(estimateCampaign.id, estimateItems.map((item) => item.id), '2026-03-13T09:00:00.000Z')
  setGovernanceCampaignStatus(estimateCampaign.id, 'COMPLETED', '2026-03-15T09:00:00.000Z')
  addGovernanceBatchNote({
    campaignId: estimateCampaign.id,
    batchTitle: '报价边界第一轮',
    batchNote: '校准了 estimated / quoted 边界提示。',
    changedWhat: '补了边界判断样例。',
    expectedImpact: '降低 quoted 过早输出。',
    createdAt: '2026-03-15T10:00:00.000Z',
  })

  return approvedReflections
}

function buildAdoptionData() {
  const approvedReflections = seedScenario()
  const workbench = buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })

  const continuePlan = workbench.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')
  const reviewPlan = workbench.planDrafts.reviewCandidates.find((item) => item.governanceTheme === '复杂包装 estimated / quoted 边界')
  const newCampaignPlan = workbench.planDrafts.newCampaignCandidates.find((item) => item.governanceTheme === '复杂包装报价判断前置')
  const estimateCampaign = workbench.campaigns.find((item) => item.campaignTitle === '报价边界专项')

  if (!continuePlan || !reviewPlan || !newCampaignPlan || !estimateCampaign) {
    throw new Error('Missing seeded plans or campaigns')
  }

  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'ACCEPT',
    decisionNote: '继续推进并拉下一轮批次。',
    now: '2026-04-04T09:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'CREATE_BATCH',
    decisionNote: '直接创建新一轮治理批次。',
    now: '2026-04-04T10:00:00.000Z',
  })

  applyGovernancePlanDecision({
    approvedReflections,
    planId: reviewPlan.id,
    decisionType: 'DISMISS',
    decisionNote: '暂时不继续处理。',
    now: '2026-04-04T11:00:00.000Z',
  })

  applyGovernancePlanDecision({
    approvedReflections,
    planId: newCampaignPlan.id,
    decisionType: 'MERGE',
    campaignId: estimateCampaign.id,
    decisionNote: '先并入已有边界专项统一处理。',
    now: '2026-04-04T12:00:00.000Z',
  })

  return buildGovernanceEffectivenessData({
    approvedReflections,
    now: new Date('2026-04-05T12:00:00.000Z'),
    observationWindowDays: 14,
  })
}

function renderView() {
  const data = buildAdoptionData()
  return renderToStaticMarkup(<GovernanceEffectivenessView data={data} loading={false} />)
}

function buildEmptyActorAnalysis() {
  return {
    summary: {
      actorCount: 0,
      realActorCount: 0,
      fallbackActorCount: 0,
      handledPlanCount: 0,
    },
    actors: [],
    realActors: [],
    fallbackActors: [],
    themeActorRows: [],
    anomalySignals: [],
    emptyState: {
      hasActorData: false,
      hasRealActorData: false,
    },
  }
}

console.log('\n=== Governance Plan Adoption 回归测试 ===\n')

async function main() {
  await test('ACCEPTED + batch created 后应标记 enteredExecution', () => {
    const data = buildAdoptionData()
    const item = data.planAdoption.items.find((plan) => plan.planType === 'CONTINUE_CAMPAIGN')

    assert(Boolean(item), '应生成 continue plan adoption item')
    assert(item?.enteredExecution === true, '创建批次后的计划应进入执行')
    assert(Boolean(item?.linkedBatchId), '创建批次后的计划应保留 linkedBatchId')
  })

  await test('MERGED 到治理中的专项后应被追踪', () => {
    const data = buildAdoptionData()
    const item = data.planAdoption.items.find((plan) => plan.planType === 'NEW_CAMPAIGN')

    assert(Boolean(item?.linkedCampaignId), '并入后的计划应保留 linkedCampaignId')
    assert(item?.adoptionStatus === 'ENTERED_EXECUTION', '并入已进入治理流的专项后应标记为 ENTERED_EXECUTION')
  })

  await test('DISMISSED 但后续仍复发时应标记 MISSED_BUT_RECURRING', () => {
    const data = buildAdoptionData()
    const item = data.planAdoption.items.find((plan) => plan.planType === 'REVIEW_CAMPAIGN')

    assert(item?.recommendationQualityLabel === 'MISSED_BUT_RECURRING', '已忽略但后续复发的计划应标记为 MISSED_BUT_RECURRING')
    assert(data.planAdoption.dismissedButRecurringPlans.length === 1, '应汇总到 dismissedButRecurringPlans')
  })

  await test('plan adoption effectivenessLabel 分类正确', () => {
    const data = buildAdoptionData()
    const continuePlan = data.planAdoption.items.find((plan) => plan.planType === 'CONTINUE_CAMPAIGN')
    const reviewPlan = data.planAdoption.items.find((plan) => plan.planType === 'REVIEW_CAMPAIGN')

    assert(continuePlan?.effectivenessLabel === 'IMPROVING', '改善中的 continue plan 应继承 IMPROVING 标签')
    assert(reviewPlan?.effectivenessLabel === 'RECURRING' || reviewPlan?.effectivenessLabel === 'NEEDS_REVIEW', '已忽略但复发的 review plan 应保留复发类标签')
  })

  await test('plan recommendationQualityLabel 分类正确', () => {
    const data = buildAdoptionData()
    const continuePlan = data.planAdoption.items.find((plan) => plan.planType === 'CONTINUE_CAMPAIGN')
    const newCampaignPlan = data.planAdoption.items.find((plan) => plan.planType === 'NEW_CAMPAIGN')

    assert(continuePlan?.recommendationQualityLabel === 'HIGH_VALUE', '改善中的执行计划应标记 HIGH_VALUE')
    assert(newCampaignPlan?.recommendationQualityLabel === 'LOW_VALUE', '并入弱效果专项的计划应标记 LOW_VALUE')
  })

  await test('governanceTheme 推荐质量聚合应正确计算 acceptedRate / improvingCount / recurringCount', () => {
    const data = buildAdoptionData()
    const mappingTheme = data.planAdoption.themeSummaries.find((item) => item.improvingCount === 1)
    const estimateTheme = data.planAdoption.themeSummaries.find((item) => item.dismissedRecurringCount === 1)
    const cautiousTheme = data.planAdoption.themeSummaries.find((item) => item.lowValueCount > 0)

    assert(mappingTheme?.acceptedRate === 100, '高价值主题的 acceptedRate 应正确计算为 100')
    assert(mappingTheme?.improvingCount === 1, '改善主题的 improvingCount 应正确累计')
    assert(mappingTheme?.recurringCount === 1, '改善主题的 recurringCount 应继承执行后复发次数')
    assert(mappingTheme?.themeQualityLabel === 'KEEP_RECOMMENDING', '高价值主题应标记为 KEEP_RECOMMENDING')
    assert(mappingTheme?.shouldKeepRecommend === true, '高价值主题应继续推荐')

    assert(estimateTheme?.acceptedRate === 50, '混合主题的 acceptedRate 应按主题内已采纳计划占比计算')
    assert(estimateTheme?.planCount === 2, '同主题下多条计划应正确汇总到同一个 theme summary')
    assert(estimateTheme?.dismissedRecurringCount === 1, '已忽略但复发的主题应正确累计 dismissedRecurringCount')
    assert(estimateTheme?.shouldKeepRecommend === true, '被忽略但持续复发的主题仍应继续推荐')

    assert(cautiousTheme?.lowValueCount === 1, '出现低质量推荐的主题应正确累计 lowValueCount')
    assert(cautiousTheme?.improvingCount === 0, '弱效果主题不应误计 improvingCount')
  })

  await test('应识别值得继续推荐和需要谨慎推荐的治理主题', () => {
    const data = buildAdoptionData()

    assert(data.planAdoption.continueRecommendThemes.some((item) => item.improvingCount === 1), '高价值主题应出现在 continueRecommendThemes')
    assert(data.planAdoption.continueRecommendThemes.some((item) => item.dismissedRecurringCount === 1), '被忽略但复发的主题应继续保留在推荐列表')
    assert(data.planAdoption.cautiousThemes.some((item) => item.lowValueCount > 0), '出现低质量推荐的主题应出现在 cautiousThemes')
  })

  await test('效果页在有数据和空数据时都能稳定渲染计划采用模块', () => {
    const html = renderView()
    const emptyHtml = renderToStaticMarkup(
      <GovernanceEffectivenessView
        data={{
          generatedAt: new Date('2026-04-05T12:00:00.000Z').toISOString(),
          observationWindowDays: 14,
          summary: {
            completedCampaignCount: 0,
            inProgressCampaignCount: 0,
            avgProcessingTime: 0,
            improvingCampaignCount: 0,
            highRiskUnimprovedCampaignCount: 0,
          },
          campaigns: [],
          aggregates: {
            governanceTheme: [],
            targetArea: [],
            changeType: [],
            targetFileHint: [],
            riskLevel: [],
          },
          recurringThemes: [],
          recurringTargetFiles: [],
          benefitInsights: {
            topImprovedTargetAreas: [],
            acceptedButWeakChangeTypes: [],
            highReturnChangeTypes: [],
          },
          planAdoption: {
            overview: {
              totalPlanCount: 0,
              adoptedPlanCount: 0,
              dismissedPlanCount: 0,
              enteredExecutionCount: 0,
              highValueCount: 0,
              missedButRecurringCount: 0,
            },
            items: [],
            dismissedButRecurringPlans: [],
            highQualityPlanTypes: [],
            themeSummaries: [],
            continueRecommendThemes: [],
            cautiousThemes: [],
          },
          actorAnalysis: buildEmptyActorAnalysis(),
          emptyState: {
            hasCampaigns: false,
            hasCompletedCampaigns: false,
          },
        }}
        loading={false}
      />
    )

    assert(html.includes('计划采用概览'), '有数据时应渲染计划采用概览')
    assert(html.includes('被忽略但后续复发的计划'), '有数据时应渲染 dismissed recurring 区块')
    assert(html.includes('高质量推荐类型'), '有数据时应渲染推荐类型区块')
    assert(emptyHtml.includes('暂无治理成效数据'), '空数据时应稳定显示总空态')
  })

  clearAllStatuses()
  clearGovernanceStore()

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