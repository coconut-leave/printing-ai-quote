import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GovernanceEffectivenessView } from '@/components/GovernanceEffectivenessView'
import { buildFallbackGovernanceActor, buildGovernanceActor } from '@/lib/actorIdentity'
import { formatThemeQualityLabel } from '@/lib/governanceThemeQuality'
import { buildActionDraftDashboardStats } from '@/server/learning/actionDraftDashboard'
import {
  buildGovernanceEffectivenessData,
  type GovernanceEffectivenessData,
} from '@/server/learning/governanceEffectiveness'
import { buildGovernanceDashboardData } from '@/server/learning/governanceDashboard'
import { applyGovernancePlanDecision } from '@/server/learning/governancePlanActions'
import { createGovernanceCampaignRecord } from '@/server/learning/governanceCampaign'
import { generateImprovementId } from '@/server/learning/improvementSuggestion'
import {
  clearAllStatuses,
  setImprovementStatus,
  setImprovementTargetFileHint,
} from '@/server/learning/improvementStore'
import {
  assignActionDraftsToCampaign,
  clearGovernanceStore,
  saveGovernanceCampaign,
  setGovernancePlanRecord,
  setGovernanceCampaignStatus,
} from '@/server/learning/governanceStore'
import { buildGovernanceWorkbenchData } from '@/server/learning/governanceWorkbench'

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

function pickCampaignSeedItems(params: {
  governanceTheme: string
  count: number
  actionDrafts: Array<{
    id: string
    createdAt: string
    governanceTheme: string
  }>
}) {
  const selected = params.actionDrafts
    .filter((item) => item.governanceTheme === params.governanceTheme)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, params.count)

  if (selected.length < params.count) {
    throw new Error(`Missing seed action drafts for governanceTheme=${params.governanceTheme}`)
  }

  return selected
}

function buildReflections() {
  return [
    {
      id: 101,
      conversationId: 501,
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
      createdAt: new Date('2026-03-10T12:00:00.000Z'),
    },
    {
      id: 102,
      conversationId: 502,
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
      id: 103,
      conversationId: 503,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '治理后再次出现材质字段错误。',
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
      id: 104,
      conversationId: 504,
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      suggestionDraft: '人工修正复杂包装追加识别。',
      originalExtractedParams: { productType: 'tuck_end_box', packagingContext: { subItems: [] } },
      correctedParams: { productType: 'tuck_end_box', packagingContext: { subItems: [{ productType: 'leaflet_insert' }] } },
      createdAt: new Date('2026-03-06T12:00:00.000Z'),
    },
    {
      id: 105,
      conversationId: 505,
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      suggestionDraft: '人工再次修正复杂包装追加识别。',
      originalExtractedParams: { productType: 'tuck_end_box', packagingContext: { subItems: [] } },
      correctedParams: { productType: 'tuck_end_box', packagingContext: { subItems: [{ productType: 'leaflet_insert' }] } },
      createdAt: new Date('2026-03-07T12:00:00.000Z'),
    },
    {
      id: 106,
      conversationId: 506,
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
      id: 107,
      conversationId: 507,
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
      id: 108,
      conversationId: 508,
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
      id: 109,
      conversationId: 509,
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
  ]
}

function seedGovernanceScenario() {
  clearAllStatuses()
  clearGovernanceStore()

  const approvedReflections = buildReflections()

  setFileHint(101, approvedReflections[0].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(102, approvedReflections[1].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(103, approvedReflections[2].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(104, approvedReflections[3].createdAt, 'src/server/ai/prompts/packaging.ts')
  setFileHint(105, approvedReflections[4].createdAt, 'src/server/ai/prompts/packaging.ts')
  setFileHint(106, approvedReflections[5].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(107, approvedReflections[6].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(108, approvedReflections[7].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(109, approvedReflections[8].createdAt, 'src/server/ai/packaging/estimate.ts')

  setStatus(101, approvedReflections[0].createdAt, 'ACCEPTED', '2026-03-11T10:00:00.000Z')
  setStatus(101, approvedReflections[0].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(101, approvedReflections[0].createdAt, 'VERIFIED', '2026-03-15T10:00:00.000Z')
  setStatus(102, approvedReflections[1].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(102, approvedReflections[1].createdAt, 'IMPLEMENTED', '2026-03-14T10:00:00.000Z')
  setStatus(103, approvedReflections[2].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')

  setStatus(104, approvedReflections[3].createdAt, 'ACCEPTED', '2026-03-07T10:00:00.000Z')
  setStatus(104, approvedReflections[3].createdAt, 'VERIFIED', '2026-03-09T10:00:00.000Z')
  setStatus(105, approvedReflections[4].createdAt, 'ACCEPTED', '2026-03-08T10:00:00.000Z')
  setStatus(105, approvedReflections[4].createdAt, 'VERIFIED', '2026-03-10T10:00:00.000Z')

  setStatus(106, approvedReflections[5].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(107, approvedReflections[6].createdAt, 'ACCEPTED', '2026-03-13T10:00:00.000Z')
  setStatus(108, approvedReflections[7].createdAt, 'ACCEPTED', '2026-03-20T10:00:00.000Z')
  setStatus(109, approvedReflections[8].createdAt, 'ACCEPTED', '2026-03-21T10:00:00.000Z')

  const initialDashboard = buildGovernanceDashboardData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })

  const mappingItems = pickCampaignSeedItems({
    governanceTheme: '复杂包装字段映射',
    count: 2,
    actionDrafts: initialDashboard.actionDrafts,
  })
  const estimateItems = pickCampaignSeedItems({
    governanceTheme: '复杂包装 estimated / quoted 边界',
    count: 2,
    actionDrafts: initialDashboard.actionDrafts,
  })

  const mappingCampaign = createGovernanceCampaignRecord({
    items: mappingItems,
    campaignTitle: '材质映射专项',
    now: new Date('2026-03-13T09:00:00.000Z'),
  })
  saveGovernanceCampaign(mappingCampaign)
  assignActionDraftsToCampaign(mappingCampaign.id, mappingItems.map((item) => item.id), '2026-03-13T09:00:00.000Z')
  setGovernanceCampaignStatus(mappingCampaign.id, 'IN_GOVERNANCE', '2026-03-14T09:00:00.000Z')
  setGovernanceCampaignStatus(mappingCampaign.id, 'COMPLETED', '2026-03-16T09:00:00.000Z')

  const estimateCampaign = createGovernanceCampaignRecord({
    items: estimateItems,
    campaignTitle: '报价边界专项',
    now: new Date('2026-03-13T09:00:00.000Z'),
  })
  saveGovernanceCampaign(estimateCampaign)
  assignActionDraftsToCampaign(estimateCampaign.id, estimateItems.map((item) => item.id), '2026-03-13T09:00:00.000Z')
  setGovernanceCampaignStatus(estimateCampaign.id, 'IN_GOVERNANCE', '2026-03-14T09:00:00.000Z')

  return approvedReflections
}

function buildEffectivenessData() {
  const approvedReflections = seedGovernanceScenario()

  return buildGovernanceEffectivenessData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
    observationWindowDays: 14,
  })
}

function buildEffectivenessDataWithPlanDecisions() {
  const approvedReflections = seedGovernanceScenario()
  const workbench = buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
  const continuePlan = workbench.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')

  if (!continuePlan) {
    throw new Error('Missing continue plan for effectiveness theme quality test')
  }

  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'ACCEPT',
    decisionNote: '继续推进。',
    now: '2026-04-04T09:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'CREATE_BATCH',
    decisionNote: '拉起下一轮治理。',
    now: '2026-04-04T10:00:00.000Z',
  })

  return buildGovernanceEffectivenessData({
    approvedReflections,
    now: new Date('2026-04-05T12:00:00.000Z'),
    observationWindowDays: 14,
  })
}

function buildEffectivenessDataWithActorDecisions() {
  const approvedReflections = seedGovernanceScenario()
  const workbench = buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
  const mappingCampaign = workbench.campaigns.find((item) => item.campaignTitle === '材质映射专项')
  const estimateCampaign = workbench.campaigns.find((item) => item.campaignTitle === '报价边界专项')

  if (!mappingCampaign || !estimateCampaign) {
    throw new Error('Missing seeded campaigns for actor analysis test')
  }

  const sessionActor = buildGovernanceActor({
    actorName: '审批主管',
    actorEmail: 'reviewer@factory.test',
    actorSource: 'admin-session',
  })
  const headerActor = buildGovernanceActor({
    actorName: '脚本治理员',
    actorEmail: 'script@factory.test',
    actorSource: 'actor-header',
  })
  const fallbackActor = buildFallbackGovernanceActor()

  setGovernancePlanRecord({
    plan: {
      id: 'plan_actor_mapping_batch',
      planTitle: '材质映射专项 - 批次推进计划',
      planType: 'CONTINUE_CAMPAIGN',
      whyNow: '材质映射专项已经改善，但仍有复发，需要继续推进下一轮。',
      basedOnCampaignIds: [mappingCampaign.id],
      governanceTheme: '复杂包装字段映射',
      targetArea: 'FIELD_MAPPING',
      targetFileHints: mappingCampaign.targetFileHints,
      keySignals: ['changeRate=-50%', 'recurrenceCount=1'],
      recommendedScope: '继续补字段映射样例。',
      suggestedBatchNotes: [],
      expectedOutcome: '继续降低字段映射复发。',
      watchMetrics: ['recurrenceCount', 'changeRate'],
      priorityLevel: 'HIGH',
    },
    status: 'BATCH_CREATED',
    decisionHistory: [
      {
        id: 'decision_actor_mapping_accept',
        planId: 'plan_actor_mapping_batch',
        decisionType: 'ACCEPT',
        decisionBy: '审批主管 (reviewer@factory.test)',
        decisionActor: sessionActor,
        decisionAt: '2026-04-04T09:00:00.000Z',
        decisionNote: '先接受并观察。',
      },
      {
        id: 'decision_actor_mapping_batch',
        planId: 'plan_actor_mapping_batch',
        decisionType: 'CREATE_BATCH',
        decisionBy: '审批主管 (reviewer@factory.test)',
        decisionActor: sessionActor,
        decisionAt: '2026-04-04T10:00:00.000Z',
        decisionNote: '继续推进下一轮。',
        mergedCampaignId: mappingCampaign.id,
        createdBatchId: 'batch_actor_mapping_1',
      },
    ],
    decisionType: 'CREATE_BATCH',
    decisionBy: '审批主管 (reviewer@factory.test)',
    decisionActor: sessionActor,
    decisionAt: '2026-04-04T10:00:00.000Z',
    decisionNote: '继续推进下一轮。',
    mergedCampaignId: mappingCampaign.id,
    createdBatchId: 'batch_actor_mapping_1',
  })
  setGovernancePlanRecord({
    plan: {
      id: 'plan_actor_mapping_dismiss',
      planTitle: '材质映射专项 - 先忽略计划',
      planType: 'REVIEW_CAMPAIGN',
      whyNow: '先观察复发是否自然回落。',
      basedOnCampaignIds: [mappingCampaign.id],
      governanceTheme: '复杂包装字段映射',
      targetArea: 'FIELD_MAPPING',
      targetFileHints: mappingCampaign.targetFileHints,
      keySignals: ['recurrenceCount=1'],
      recommendedScope: '暂时先不继续推进。',
      suggestedBatchNotes: [],
      expectedOutcome: '观察是否自然消退。',
      watchMetrics: ['recurrenceCount'],
      priorityLevel: 'MEDIUM',
    },
    status: 'DISMISSED',
    decisionHistory: [{
      id: 'decision_actor_mapping_dismiss',
      planId: 'plan_actor_mapping_dismiss',
      decisionType: 'DISMISS',
      decisionBy: '后台管理员',
      decisionActor: fallbackActor,
      decisionAt: '2026-04-04T11:00:00.000Z',
      decisionNote: '先不处理。',
    }],
    decisionType: 'DISMISS',
    decisionBy: '后台管理员',
    decisionActor: fallbackActor,
    decisionAt: '2026-04-04T11:00:00.000Z',
    decisionNote: '先不处理。',
  })
  setGovernancePlanRecord({
    plan: {
      id: 'plan_actor_merge_header',
      planTitle: '报价判断前置 - 并入计划',
      planType: 'NEW_CAMPAIGN',
      whyNow: '先并入已有专项统一处理。',
      basedOnCampaignIds: [],
      governanceTheme: '复杂包装报价判断前置',
      targetArea: 'ESTIMATE',
      targetFileHints: ['src/server/ai/packaging/pricingReview.ts'],
      keySignals: ['priorityLevel=HIGH'],
      recommendedScope: '先并入已有报价边界专项。',
      suggestedBatchNotes: [],
      expectedOutcome: '统一收敛报价判断前置问题。',
      watchMetrics: ['changeRate'],
      priorityLevel: 'HIGH',
    },
    status: 'MERGED',
    decisionHistory: [{
      id: 'decision_actor_merge_header',
      planId: 'plan_actor_merge_header',
      decisionType: 'MERGE',
      decisionBy: '脚本治理员 (script@factory.test)',
      decisionActor: headerActor,
      decisionAt: '2026-04-04T12:00:00.000Z',
      decisionNote: '并入已有专项。',
      mergedCampaignId: estimateCampaign.id,
    }],
    decisionType: 'MERGE',
    decisionBy: '脚本治理员 (script@factory.test)',
    decisionActor: headerActor,
    decisionAt: '2026-04-04T12:00:00.000Z',
    decisionNote: '并入已有专项。',
    mergedCampaignId: estimateCampaign.id,
  })

  return buildGovernanceEffectivenessData({
    approvedReflections,
    now: new Date('2026-04-05T12:00:00.000Z'),
    observationWindowDays: 14,
  })
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

function renderView(data: GovernanceEffectivenessData) {
  return renderToStaticMarkup(
    <GovernanceEffectivenessView data={data} loading={false} />
  )
}

console.log('\n=== Governance Effectiveness 回归测试 ===\n')

async function main() {
  await test('before / after 数量变化计算正确', () => {
    const data = buildEffectivenessData()
    const mappingCampaign = data.campaigns.find((item) => item.campaignTitle === '材质映射专项')

    assert(Boolean(mappingCampaign), '应生成材质映射专项评估数据')
    assert(mappingCampaign?.beforeCount === 2, '材质映射专项 beforeCount 应为 2')
    assert(mappingCampaign?.afterCount === 1, '材质映射专项 afterCount 应为 1')
    assert(mappingCampaign?.changeRate === -50, '材质映射专项 changeRate 应为 -50%')
  })

  await test('专项处理效率统计正确', () => {
    const data = buildEffectivenessData()
    const mappingCampaign = data.campaigns.find((item) => item.campaignTitle === '材质映射专项')

    assert(mappingCampaign?.resolvedActionCount === 2, '材质映射专项已解决动作数应为 2')
    assert(mappingCampaign?.remainingActionCount === 0, '材质映射专项剩余动作数应为 0')
    assert((mappingCampaign?.avgProcessingTime || 0) > 1, '材质映射专项平均处理时长应大于 1 天')
  })

  await test('recurrenceCount 计算正确', () => {
    const data = buildEffectivenessData()
    const estimateCampaign = data.campaigns.find((item) => item.campaignTitle === '报价边界专项')
    const mappingCampaign = data.campaigns.find((item) => item.campaignTitle === '材质映射专项')

    assert(mappingCampaign?.recurrenceCount === 1, '材质映射专项完成后应统计到 1 次复发')
    assert(estimateCampaign?.recurrenceCount === 0, '未完成专项不应统计完成后复发')
  })

  await test('effectivenessLabel 分类正确', () => {
    const data = buildEffectivenessData()
    const mappingCampaign = data.campaigns.find((item) => item.campaignTitle === '材质映射专项')
    const estimateCampaign = data.campaigns.find((item) => item.campaignTitle === '报价边界专项')

    assert(mappingCampaign?.effectivenessLabel === 'IMPROVING', '材质映射专项应被归类为 IMPROVING')
    assert(estimateCampaign?.effectivenessLabel === 'NEEDS_REVIEW', '报价边界专项应被归类为 NEEDS_REVIEW')
  })

  await test('governanceTheme quality 透视视图应展示聚合结果', () => {
    const data = buildEffectivenessDataWithPlanDecisions()
    const mappingTheme = data.planAdoption.themeSummaries.find((item) => item.governanceTheme === '复杂包装字段映射')
    const html = renderView(data)

    assert(Boolean(mappingTheme), '应生成复杂包装字段映射的 theme summary')
    assert(mappingTheme?.acceptedRate === 100, '复杂包装字段映射主题采纳率应为 100%')
    assert(mappingTheme?.improvingCount === 1, '复杂包装字段映射主题 improvingCount 应为 1')
    assert(html.includes('governanceTheme quality 透视视图'), '治理效果页应渲染主题质量透视视图')
    assert(html.includes('复杂包装字段映射'), '治理效果页应展示具体治理主题')
    assert(html.includes(formatThemeQualityLabel(mappingTheme?.themeQualityLabel)), '治理效果页应展示统一的 theme quality 标签')
    assert(html.includes('采纳率 100%'), '治理效果页应展示主题采纳率字段')
  })

  await test('actor 聚合的 accepted / dismissed / merged / batchCreated 统计正确', () => {
    const data = buildEffectivenessDataWithActorDecisions()
    const sessionActor = data.actorAnalysis.actors.find((item) => item.actor.actorLabel.includes('reviewer@factory.test'))
    const headerActor = data.actorAnalysis.actors.find((item) => item.actor.actorLabel.includes('script@factory.test'))
    const fallbackActor = data.actorAnalysis.actors.find((item) => item.actor.isFallbackActor)

    assert(sessionActor?.acceptedCount === 1, '页面 session actor 的 acceptedCount 应正确')
    assert(sessionActor?.batchCreatedCount === 1, '页面 session actor 的 batchCreatedCount 应正确')
    assert(headerActor?.mergedCount === 1, 'header actor 的 mergedCount 应正确')
    assert(fallbackActor?.dismissedCount === 1, 'fallback actor 的 dismissedCount 应正确')
  })

  await test('enteredExecution / improving / recurringAfterAdoption 统计正确', () => {
    const data = buildEffectivenessDataWithActorDecisions()
    const sessionActor = data.actorAnalysis.actors.find((item) => item.actor.actorLabel.includes('reviewer@factory.test'))

    assert(sessionActor?.enteredExecutionCount === 1, '进入执行计数应正确')
    assert(sessionActor?.improvingCount === 1, '改善计数应正确')
    assert(sessionActor?.recurringAfterAdoptionCount === 1, '采纳后复发计数应正确')
  })

  await test('governanceTheme × actor 视图聚合正确', () => {
    const data = buildEffectivenessDataWithActorDecisions()
    const sessionThemeRow = data.actorAnalysis.themeActorRows.find((item) => (
      item.governanceTheme === '复杂包装字段映射'
      && item.actor.actorLabel.includes('reviewer@factory.test')
    ))

    assert(Boolean(sessionThemeRow), '应生成 actor × theme 聚合行')
    assert(sessionThemeRow?.planCount === 1, 'actor × theme 的计划数应正确')
    assert(sessionThemeRow?.acceptRate === 50, 'actor × theme 的接受率应按审批动作正确计算')
    assert(sessionThemeRow?.enteredExecutionRate === 100, 'actor × theme 的进入执行率应正确')
    assert(sessionThemeRow?.improvingRate === 100, 'actor × theme 的改善率应正确')
    assert(sessionThemeRow?.recurrenceRate === 100, 'actor × theme 的复发率应正确')
    assert(sessionThemeRow?.recommendationQualityDistribution.HIGH_VALUE === 1, 'actor × theme 的推荐质量分布应正确')
  })

  await test('fallback actor 能被正确识别和区分', () => {
    const data = buildEffectivenessDataWithActorDecisions()

    assert(data.actorAnalysis.summary.fallbackActorCount === 1, 'fallback actor 数量应正确')
    assert(data.actorAnalysis.summary.realActorCount === 2, '真实 actor 数量应正确')
    assert(data.actorAnalysis.fallbackActors.every((item) => item.actor.isFallbackActor), 'fallback actor 列表应全部标记为 fallback')
    assert(data.actorAnalysis.realActors.every((item) => !item.actor.isFallbackActor), '真实 actor 列表中不应混入 fallback actor')
  })

  await test('页面在有数据和空数据时都能稳定渲染', () => {
    const data = buildEffectivenessDataWithActorDecisions()
    const html = renderView(data)
    const emptyHtml = renderView({
      generatedAt: new Date('2026-04-03T12:00:00.000Z').toISOString(),
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
    })

    assert(html.includes('专项治理效果列表'), '有数据时应稳定渲染专项效果列表')
    assert(html.includes('计划采用概览'), '有数据时应稳定渲染计划采用概览')
    assert(html.includes('高质量推荐类型'), '有数据时应稳定渲染推荐类型模块')
    assert(html.includes('governanceTheme quality 透视视图'), '有数据时应稳定渲染主题质量透视视图')
    assert(html.includes('审批人与采用行为分析'), '有数据时应稳定渲染 actor 行为分析模块')
    assert(html.includes('按主题差异视图'), '有数据时应稳定渲染 actor × theme 视图')
    assert(html.includes('异常信号'), '有数据时应稳定渲染异常信号模块')
    assert(html.includes('高频复发主题'), '有数据时应稳定渲染高频复发主题')
    assert(emptyHtml.includes('暂无治理成效数据'), '空数据时应稳定显示空态')
  })

  await test('现有 governance / actions / priority dashboard 不受影响', () => {
    const approvedReflections = seedGovernanceScenario()
    const governanceData = buildGovernanceDashboardData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const priorityStats = buildActionDraftDashboardStats({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })

    assert(governanceData.campaigns.length === 2, '现有治理工作台 campaign 数量不应受影响')
    assert(priorityStats.summary.totalActionDraftCount >= 7, 'priority dashboard 统计不应受影响')
    assert(priorityStats.priorityInsights.topActions.length >= 1, 'priority dashboard 优先级输出不应受影响')
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