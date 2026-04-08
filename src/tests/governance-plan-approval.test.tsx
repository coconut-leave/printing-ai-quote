import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildFallbackGovernanceActor, buildGovernanceActor } from '@/lib/actorIdentity'
import { GovernanceDashboardView } from '@/components/GovernanceDashboardView'
import { GovernanceEffectivenessView } from '@/components/GovernanceEffectivenessView'
import { applyThemeQualityWorkbenchView, formatThemeQualityLabel } from '@/lib/governanceThemeQuality'
import { createGovernanceCampaignRecord } from '@/server/learning/governanceCampaign'
import { buildGovernanceDashboardData } from '@/server/learning/governanceDashboard'
import { buildGovernanceEffectivenessData } from '@/server/learning/governanceEffectiveness'
import { applyGovernancePlanDecision, assignGovernancePlanActor } from '@/server/learning/governancePlanActions'
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
  getGovernancePlanRecord,
  saveGovernanceCampaign,
  setGovernanceCampaignStatus,
} from '@/server/learning/governanceStore'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: unknown, message: string): asserts condition {
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

function pickItemsByTheme<T extends { id: string; createdAt: string; governanceTheme: string }>(theme: string, count: number, items: T[]) {
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
      id: 401,
      conversationId: 801,
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
      id: 402,
      conversationId: 802,
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
      id: 403,
      conversationId: 803,
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
      id: 404,
      conversationId: 804,
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
      id: 405,
      conversationId: 805,
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
      id: 406,
      conversationId: 806,
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
      id: 407,
      conversationId: 807,
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
      id: 408,
      conversationId: 808,
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
      id: 409,
      conversationId: 809,
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

  setFileHint(401, approvedReflections[0].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(402, approvedReflections[1].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(403, approvedReflections[2].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(404, approvedReflections[3].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(405, approvedReflections[4].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(406, approvedReflections[5].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(407, approvedReflections[6].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(408, approvedReflections[7].createdAt, 'src/server/ai/packaging/pricingReview.ts')
  setFileHint(409, approvedReflections[8].createdAt, 'src/server/ai/packaging/pricingReview.ts')

  setStatus(401, approvedReflections[0].createdAt, 'ACCEPTED', '2026-03-11T10:00:00.000Z')
  setStatus(401, approvedReflections[0].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(401, approvedReflections[0].createdAt, 'VERIFIED', '2026-03-15T10:00:00.000Z')
  setStatus(402, approvedReflections[1].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(402, approvedReflections[1].createdAt, 'VERIFIED', '2026-03-14T10:00:00.000Z')
  setStatus(403, approvedReflections[2].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')

  setStatus(404, approvedReflections[3].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(404, approvedReflections[3].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(405, approvedReflections[4].createdAt, 'ACCEPTED', '2026-03-13T10:00:00.000Z')
  setStatus(405, approvedReflections[4].createdAt, 'VERIFIED', '2026-03-14T10:00:00.000Z')
  setStatus(406, approvedReflections[5].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')
  setStatus(407, approvedReflections[6].createdAt, 'ACCEPTED', '2026-03-21T10:00:00.000Z')

  setStatus(408, approvedReflections[7].createdAt, 'NEW', '2026-03-22T10:00:00.000Z')
  setStatus(409, approvedReflections[8].createdAt, 'REVIEWED', '2026-03-23T10:00:00.000Z')

  const dashboard = buildGovernanceDashboardData({
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

function buildWorkbenchData() {
  const approvedReflections = seedScenario()
  return buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
}

function buildWorkbenchDataWithDecisions() {
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
    decisionNote: '继续推进并准备下一轮。',
    now: '2026-04-04T09:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'CREATE_BATCH',
    decisionNote: '直接拉起治理批次。',
    now: '2026-04-04T10:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: reviewPlan.id,
    decisionType: 'DISMISS',
    decisionNote: '暂时先观察。',
    now: '2026-04-04T11:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: newCampaignPlan.id,
    decisionType: 'MERGE',
    campaignId: estimateCampaign.id,
    decisionNote: '先并入已有专项统一处理。',
    now: '2026-04-04T12:00:00.000Z',
  })

  return buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-05T12:00:00.000Z'),
  })
}

function buildDecisionAppliedDatasets() {
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
    decisionNote: '继续推进并准备下一轮。',
    now: '2026-04-04T09:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'CREATE_BATCH',
    decisionNote: '直接拉起治理批次。',
    now: '2026-04-04T10:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: reviewPlan.id,
    decisionType: 'DISMISS',
    decisionNote: '暂时先观察。',
    now: '2026-04-04T11:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: newCampaignPlan.id,
    decisionType: 'MERGE',
    campaignId: estimateCampaign.id,
    decisionNote: '先并入已有专项统一处理。',
    now: '2026-04-04T12:00:00.000Z',
  })

  return {
    workbench: buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-05T12:00:00.000Z'),
    }),
    effectiveness: buildGovernanceEffectivenessData({
      approvedReflections,
      now: new Date('2026-04-05T12:00:00.000Z'),
    }),
  }
}

function renderView(data = buildWorkbenchData()) {
  return renderToStaticMarkup(
    <GovernanceDashboardView
      data={data}
      loading={false}
      selectedActionIds={[]}
      selectedCampaignId=''
      campaignTitle=''
      batchTitle=''
      batchNote=''
      changedWhat=''
      expectedImpact=''
      selectedDetailType='campaign'
      selectedDetailId={data.campaigns[0]?.id || null}
      selectedCandidate={data.candidateCampaigns[0] || null}
      selectedCampaign={data.campaigns[0] || null}
      onToggleAction={() => {}}
      onToggleAll={() => {}}
      onSelectCampaign={() => {}}
      onSelectCandidate={() => {}}
      onSelectedCampaignIdChange={() => {}}
      onCampaignTitleChange={() => {}}
      onBatchTitleChange={() => {}}
      onBatchNoteChange={() => {}}
      onChangedWhatChange={() => {}}
      onExpectedImpactChange={() => {}}
      onCreateCampaign={() => {}}
      onMergeIntoCampaign={() => {}}
      onBatchActionStatus={() => {}}
      onCampaignStatusChange={() => {}}
      onSaveBatchNote={() => {}}
      getPlanDecisionNote={() => ''}
      getPlanTargetCampaignId={() => ''}
      getPlanAssignmentActorId={() => ''}
      onPlanDecisionNoteChange={() => {}}
      onPlanTargetCampaignIdChange={() => {}}
      onPlanDecision={() => {}}
      onPlanAssignmentActorIdChange={() => {}}
      onPlanAssign={() => {}}
    />
  )
}

function buildWorkbenchDataWithActorRecommendations() {
  const approvedReflections = seedScenario()
  const reviewer = buildGovernanceActor({
    actorName: '推荐审批人',
    actorEmail: 'reviewer@factory.test',
    actorSource: 'admin-session',
  })
  const headerActor = buildGovernanceActor({
    actorName: '候选治理员',
    actorEmail: 'script@factory.test',
    actorSource: 'actor-header',
  })
  const initialWorkbench = buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
  const continuePlan = initialWorkbench.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')
  const newCampaignPlan = initialWorkbench.planDrafts.newCampaignCandidates.find((item) => item.governanceTheme === '复杂包装报价判断前置')
  const estimateCampaign = initialWorkbench.campaigns.find((item) => item.campaignTitle === '报价边界专项')

  if (!continuePlan || !newCampaignPlan || !estimateCampaign) {
    throw new Error('Missing seeded plans or campaigns for assignment test')
  }

  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'ACCEPT',
    decisionActor: reviewer,
    decisionNote: '由真实审批人采纳。',
    now: '2026-04-04T09:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: continuePlan.id,
    decisionType: 'CREATE_BATCH',
    decisionActor: reviewer,
    decisionNote: '进入执行，形成推荐样本。',
    now: '2026-04-04T10:00:00.000Z',
  })
  applyGovernancePlanDecision({
    approvedReflections,
    planId: newCampaignPlan.id,
    decisionType: 'MERGE',
    campaignId: estimateCampaign.id,
    decisionActor: headerActor,
    decisionNote: '补充第二位候选操作者。',
    now: '2026-04-04T11:00:00.000Z',
  })

  const workbench = buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-05T12:00:00.000Z'),
  })
  const recommendedPlan = workbench.planDrafts.trackedPlans.find((item) => item.id === continuePlan.id)
    || workbench.planDrafts.continueCandidates.find((item) => item.id === continuePlan.id)
    || workbench.planDrafts.recommendedPlans.find((item) => item.id === continuePlan.id)
  const batchPlan = workbench.planDrafts.trackedPlans.find((item) => item.id === newCampaignPlan.id)
    || workbench.planDrafts.newCampaignCandidates.find((item) => item.id === newCampaignPlan.id)
    || workbench.planDrafts.recommendedPlans.find((item) => item.id === newCampaignPlan.id)

  if (!recommendedPlan || !batchPlan) {
    throw new Error('Missing workbench plans for assignment test')
  }

  return {
    approvedReflections,
    workbench,
    recommendedPlan,
    batchPlan,
    reviewer,
    headerActor,
  }
}

console.log('\n=== Governance Plan Approval 回归测试 ===\n')

async function main() {
  await test('计划可被采纳并写入审批记录', () => {
    const approvedReflections = seedScenario()
    const reviewer = buildGovernanceActor({
      actorName: '测试审批人',
      actorEmail: 'reviewer@factory.test',
      actorSource: 'admin-session',
    })
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const plan = workbench.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')
    if (!plan) {
      throw new Error('Missing continue plan')
    }

    const result = applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'ACCEPT',
      decisionActor: reviewer,
      decisionNote: '继续补复发样例。',
      now: '2026-04-04T10:00:00.000Z',
    })

    assert(result.planRecord.status === 'ACCEPTED', '采纳后计划状态应为 ACCEPTED')
    assert(result.planRecord.decisionType === 'ACCEPT', '应记录 ACCEPT 决策类型')
    assert(result.planRecord.decisionBy === '测试审批人 (reviewer@factory.test)', '应保留格式化后的处理人')
    assert(result.planRecord.decisionActor?.actorEmail === 'reviewer@factory.test', '应保留结构化处理人信息')
  })

  await test('计划可带原因地忽略', () => {
    const approvedReflections = seedScenario()
    const reviewer = buildFallbackGovernanceActor()
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const plan = workbench.planDrafts.reviewCandidates.find((item) => item.governanceTheme === '复杂包装 estimated / quoted 边界')
    if (!plan) {
      throw new Error('Missing review plan')
    }

    const result = applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'DISMISS',
      decisionActor: reviewer,
      decisionNote: '先观察当前专项是否自然回落。',
      now: '2026-04-04T11:00:00.000Z',
    })

    assert(result.planRecord.status === 'DISMISSED', '忽略后计划状态应为 DISMISSED')
    assert(result.planRecord.decisionNote === '先观察当前专项是否自然回落。', '忽略原因应被保留')
    assert(result.planRecord.decisionActor?.actorSource === 'admin-session-fallback', '信息不完整时应记录 fallback actor')
  })

  await test('计划可并入已有专项', () => {
    const approvedReflections = seedScenario()
    const reviewer = buildGovernanceActor({
      actorName: '运营复核',
      actorEmail: 'ops@factory.test',
      actorSource: 'admin-session',
    })
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const plan = workbench.planDrafts.newCampaignCandidates.find((item) => item.governanceTheme === '复杂包装报价判断前置')
    const targetCampaign = workbench.campaigns.find((item) => item.campaignTitle === '报价边界专项')
    if (!plan || !targetCampaign) {
      throw new Error('Missing merge target')
    }

    const result = applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'MERGE',
      campaignId: targetCampaign.id,
      decisionActor: reviewer,
      decisionNote: '先并入已有专项统一收口。',
      now: '2026-04-04T12:00:00.000Z',
    })

    assert(result.planRecord.status === 'MERGED', '并入后计划状态应为 MERGED')
    assert(result.planRecord.mergedCampaignId === targetCampaign.id, '应记录并入目标专项')
    assert(result.planRecord.decisionActor?.actorName === '运营复核', '并入专项应保留审批操作者')
  })

  await test('计划可创建下一轮治理批次并保留审批历史', () => {
    const approvedReflections = seedScenario()
    const reviewer = buildGovernanceActor({
      actorName: '批次管理员',
      actorEmail: 'batch@factory.test',
      actorSource: 'admin-session',
    })
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const plan = workbench.planDrafts.newCampaignCandidates.find((item) => item.governanceTheme === '复杂包装报价判断前置')
    if (!plan) {
      throw new Error('Missing new campaign plan')
    }

    applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'ACCEPT',
      decisionActor: reviewer,
      decisionNote: '先采纳，再落下一轮批次。',
      now: '2026-04-04T13:00:00.000Z',
    })
    const result = applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'CREATE_BATCH',
      decisionActor: reviewer,
      decisionNote: '直接拉起一轮新批次。',
      now: '2026-04-04T14:00:00.000Z',
    })
    const persisted = getGovernancePlanRecord(plan.id)

    assert(result.planRecord.status === 'BATCH_CREATED', '建批次后计划状态应为 BATCH_CREATED')
    assert(Boolean(result.batchNote?.id), '应创建 batch note')
    assert(result.batchNote?.sourcePlanId === plan.id, 'batch note 应关联来源计划')
    assert(Boolean(result.campaign?.id), '应为计划找到或创建目标专项')
    assert(persisted?.decisionHistory.length === 2, '审批历史应保留 ACCEPT 与 CREATE_BATCH 两次记录')
    assert(persisted?.createdBatchId === result.batchNote?.id, '审批记录应保留 createdBatchId')
    assert(result.batchNote?.createdBy?.actorEmail === 'batch@factory.test', '创建批次应保留批次记录人')
    assert(result.campaign?.updatedBy?.actorName === '批次管理员', '创建批次应更新专项最近操作人')
  })

  await test('治理工作台应展示结构化操作者，并兼容 legacy governance-dashboard', () => {
    const approvedReflections = seedScenario()
    const reviewer = buildGovernanceActor({
      actorName: '测试审批人',
      actorEmail: 'reviewer@factory.test',
      actorSource: 'admin-session',
    })
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const continuePlan = workbench.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')
    const newCampaignPlan = workbench.planDrafts.newCampaignCandidates.find((item) => item.governanceTheme === '复杂包装报价判断前置')

    if (!continuePlan || !newCampaignPlan) {
      throw new Error('Missing plans for actor render test')
    }

    applyGovernancePlanDecision({
      approvedReflections,
      planId: continuePlan.id,
      decisionType: 'ACCEPT',
      decisionActor: reviewer,
      decisionNote: '补真实审批人展示。',
      now: '2026-04-04T16:00:00.000Z',
    })
    applyGovernancePlanDecision({
      approvedReflections,
      planId: newCampaignPlan.id,
      decisionType: 'CREATE_BATCH',
      decisionActor: reviewer,
      decisionNote: '同时验证批次记录人展示。',
      now: '2026-04-04T17:00:00.000Z',
    })
    applyGovernancePlanDecision({
      approvedReflections,
      planId: continuePlan.id,
      decisionType: 'DISMISS',
      decisionBy: 'governance-dashboard',
      decisionNote: '保留旧占位显示。',
      now: '2026-04-04T18:00:00.000Z',
    })

    const html = renderView(buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-05T12:00:00.000Z'),
    }))

    assert(html.includes('测试审批人 (reviewer@factory.test)'), '审批页应展示结构化操作者标签')
    assert(html.includes('记录人: 测试审批人 (reviewer@factory.test)'), '批次备注应展示记录人')
    assert(html.includes('governance-dashboard'), 'legacy governance-dashboard 记录应继续可见')
  })

  await test('无页面 session 时，header actor 也可写入计划审批记录', () => {
    const approvedReflections = seedScenario()
    const headerActor = buildGovernanceActor({
      actorName: '脚本治理员',
      actorEmail: 'script@factory.test',
      actorSource: 'actor-header',
    })
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const plan = workbench.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')

    if (!plan) {
      throw new Error('Missing continue plan for header actor test')
    }

    const result = applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'ACCEPT',
      decisionActor: headerActor,
      decisionNote: '通过脚本调用采纳。',
      now: '2026-04-04T19:00:00.000Z',
    })

    assert(result.planRecord.decisionActor?.actorSource === 'actor-header', 'header actor 应保留在计划审批记录中')
    assert(result.planRecord.decisionBy === '脚本治理员 (script@factory.test)', 'header actor 应格式化展示在 decisionBy 中')
  })

  await test('一键采纳推荐后，计划会记录 assignedActor 与 recommended 来源', () => {
    const { approvedReflections, recommendedPlan } = buildWorkbenchDataWithActorRecommendations()

    const result = assignGovernancePlanActor({
      approvedReflections,
      planId: recommendedPlan.id,
      recommendationRole: 'execution',
      assignmentSource: 'recommended',
      now: '2026-04-05T13:00:00.000Z',
    })
    const persisted = getGovernancePlanRecord(recommendedPlan.id)

    assert(Boolean(result.assignment.assignedActorId), '应写入 assignedActorId')
    assert(result.assignment.assignmentSource === 'recommended', '一键采纳推荐后 assignmentSource 应为 recommended')
    assert(result.assignment.recommendationAccepted === true, '一键采纳主推荐后应记录 recommendationAccepted=true')
    assert(persisted?.assignment?.assignedActorName === result.assignment.assignedActorName, '计划记录中应保留 assignedActorName')
  })

  await test('手动改派后，manuallyOverridden 会被正确记录，且保留原始推荐信息', () => {
    const { approvedReflections, recommendedPlan, headerActor } = buildWorkbenchDataWithActorRecommendations()

    const result = assignGovernancePlanActor({
      approvedReflections,
      planId: recommendedPlan.id,
      recommendationRole: 'execution',
      assignmentSource: 'manual',
      actorId: headerActor.actorId,
      now: '2026-04-05T14:00:00.000Z',
    })

    assert(result.assignment.assignmentSource === 'manual', '手动改派后 assignmentSource 应为 manual')
    assert(result.assignment.manuallyOverridden === true, '手动改派后应记录 manuallyOverridden=true')
    assert(result.assignment.recommendationOffered === true, '有推荐时应记录 recommendationOffered=true')
    assert(Boolean(result.assignment.recommendedActorName), '即使手动改派，也应保留原始推荐操作者')
    assert(result.assignment.assignedActorId === headerActor.actorId, '最终分配人应为手动选择的 actor')
  })

  await test('创建 batch 时会继承当前 assignedActor', () => {
    const { approvedReflections, batchPlan, reviewer } = buildWorkbenchDataWithActorRecommendations()

    assignGovernancePlanActor({
      approvedReflections,
      planId: batchPlan.id,
      recommendationRole: 'approval',
      assignmentSource: 'manual',
      actorId: reviewer.actorId,
      now: '2026-04-05T15:00:00.000Z',
    })
    const result = applyGovernancePlanDecision({
      approvedReflections,
      planId: batchPlan.id,
      decisionType: 'CREATE_BATCH',
      decisionActor: reviewer,
      decisionNote: '验证 batch 继承负责人。',
      now: '2026-04-05T16:00:00.000Z',
    })

    assert(result.batchNote?.assignment?.assignedActorId === reviewer.actorId, '创建 batch 时应继承当前 assignedActorId')
    assert(result.batchNote?.assignment?.assignedActorName === reviewer.actorName, '创建 batch 时应继承当前 assignedActorName')
    assert(result.batchNote?.assignment?.assignmentSource === 'manual', 'batch 应保留负责人来源')
  })

  await test('页面在有推荐与分配信息时都能稳定显示', () => {
    const { approvedReflections, recommendedPlan } = buildWorkbenchDataWithActorRecommendations()

    assignGovernancePlanActor({
      approvedReflections,
      planId: recommendedPlan.id,
      recommendationRole: 'execution',
      assignmentSource: 'recommended',
      now: '2026-04-05T17:00:00.000Z',
    })
    const html = renderView(buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-05T18:00:00.000Z'),
    }))

    assert(html.includes('当前分配'), '有分配信息时应稳定渲染当前分配区域')
    assert(html.includes('一键采纳主推荐'), '有推荐时应稳定渲染一键采纳入口')
    assert(html.includes('清空当前分配'), '有推荐时应稳定渲染清空分配入口')
  })

  await test('workbench 应回流计划推荐质量与主题聚合信号', () => {
    const workbench = buildWorkbenchDataWithDecisions()
    const continuePlan = workbench.planDrafts.trackedPlans.find((item) => item.recommendationQualityLabel === 'HIGH_VALUE')
    const reviewPlan = workbench.planDrafts.trackedPlans.find((item) => item.recommendationQualityLabel === 'MISSED_BUT_RECURRING')
    const cautiousTheme = workbench.recommendationQuality.cautiousThemes.find((item) => item.lowValueCount > 0)

    assert(continuePlan?.recommendationQualityLabel === 'HIGH_VALUE', 'tracked plan 应回流 recommendationQualityLabel')
    assert(continuePlan?.effectivenessLabel === 'IMPROVING', 'tracked plan 应回流 effectivenessLabel')
    assert(continuePlan?.enteredExecution === true, '创建批次后的计划应标记 enteredExecution')
    assert(typeof continuePlan?.themePriorityRank === 'number', 'tracked plan 应包含主题内优先位次')
    assert(reviewPlan?.recommendationQualityLabel === 'MISSED_BUT_RECURRING', '被忽略但复发的计划应在 workbench 中保留质量标签')
    assert(cautiousTheme?.lowValueCount === 1, '出现低质量推荐的主题应进入谨慎推荐聚合')
  })

  await test('工作台可按 themeQualityLabel 排序', () => {
    const workbench = buildWorkbenchDataWithDecisions()
    const sorted = applyThemeQualityWorkbenchView({
      items: workbench.planDrafts.trackedPlans,
      sortField: 'themeQualityLabel',
      sortDirection: 'desc',
      filters: [],
    })
    const weight: Record<string, number> = {
      KEEP_RECOMMENDING: 3,
      WATCH: 2,
      CAUTION: 1,
    }

    assert(sorted[0]?.themeQualityLabel === 'KEEP_RECOMMENDING', '按 themeQualityLabel 降序时应优先展示继续推荐主题')
    assert(sorted.every((item, index) => index === 0 || weight[sorted[index - 1].themeQualityLabel || 'WATCH'] >= weight[item.themeQualityLabel || 'WATCH']), '按 themeQualityLabel 排序后应保持 theme quality 权重非递增')
  })

  await test('工作台可按高复发与高采纳率条件筛选', () => {
    const workbench = buildWorkbenchDataWithDecisions()
    const recurringPlans = applyThemeQualityWorkbenchView({
      items: workbench.planDrafts.trackedPlans,
      sortField: 'recurringCount',
      sortDirection: 'desc',
      filters: ['HIGH_RECURRING'],
    })
    const acceptedPlans = applyThemeQualityWorkbenchView({
      items: workbench.planDrafts.trackedPlans,
      sortField: 'acceptedRate',
      sortDirection: 'desc',
      filters: ['HIGH_ACCEPTED_RATE'],
    })

    assert(recurringPlans.length >= 1, '高复发筛选后应返回至少一条计划')
    assert(recurringPlans.every((item) => (item.themeRecurringCount ?? item.recurrenceCount ?? 0) >= 2), '高复发筛选应只保留复发较高的主题')
    assert(acceptedPlans.length >= 1, '高采纳率筛选后应返回至少一条计划')
    assert(acceptedPlans.every((item) => (item.themeAcceptedRate ?? 0) >= 60), '高采纳率筛选应只保留采纳率较高的主题')
  })

  await test('审批页应展示推荐质量信号卡片与主题推荐模块', () => {
    const html = renderView(buildWorkbenchDataWithDecisions())

    assert(html.includes('推荐质量信号卡片'), '审批页应展示推荐质量信号卡片')
    assert(html.includes('值得继续推荐的治理主题'), '审批页应展示继续推荐主题模块')
    assert(html.includes('需要谨慎推荐的治理主题'), '审批页应展示谨慎推荐主题模块')
    assert(html.includes('Theme Quality 排序与筛选'), '审批页应展示 theme quality 排序与筛选入口')
    assert(html.includes('高价值推荐'), '审批页应展示计划级 recommendationQualityLabel')
    assert(html.includes('忽略后仍复发'), '审批页应展示 dismissed but recurring 信号')
    assert(html.includes('主题历史质量'), '审批页应展示主题历史质量')
    assert(html.includes('主题内优先位次'), '审批页应展示主题内优先位次')
  })

  await test('审批页与治理效果页的 theme quality 标签保持一致', () => {
    const { workbench, effectiveness } = buildDecisionAppliedDatasets()
    const dashboardTheme = workbench.recommendationQuality.themeSummaries.find((item) => item.governanceTheme === '复杂包装字段映射')
    const effectivenessTheme = effectiveness.planAdoption.themeSummaries.find((item) => item.governanceTheme === '复杂包装字段映射')
    const themeQualityLabel = formatThemeQualityLabel(dashboardTheme?.themeQualityLabel)
    const dashboardHtml = renderView(workbench)
    const effectivenessHtml = renderToStaticMarkup(
      <GovernanceEffectivenessView data={effectiveness} loading={false} />
    )

    assert(dashboardTheme?.themeQualityLabel === effectivenessTheme?.themeQualityLabel, '审批页与效果页应共享同一个 themeQualityLabel')
    assert(dashboardHtml.includes(themeQualityLabel), '审批页应展示统一后的 theme quality 标签')
    assert(effectivenessHtml.includes(themeQualityLabel), '治理效果页应展示统一后的 theme quality 标签')
  })

  await test('审批后的治理页面在有数据和空数据时都稳定显示', () => {
    const approvedReflections = seedScenario()
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const plan = workbench.planDrafts.continueCandidates[0]
    if (!plan) {
      throw new Error('Missing plan for render test')
    }

    applyGovernancePlanDecision({
      approvedReflections,
      planId: plan.id,
      decisionType: 'ACCEPT',
      decisionNote: '继续推进。',
      now: '2026-04-04T15:00:00.000Z',
    })

    const html = renderView(buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    }))
    const emptyHtml = renderToStaticMarkup(
      <GovernanceDashboardView
        data={{
          generatedAt: new Date('2026-04-03T12:00:00.000Z').toISOString(),
          summary: {
            actionDraftCount: 0,
            candidateCount: 0,
            campaignCount: 0,
            unassignedCount: 0,
            inGovernanceCount: 0,
            archivedCount: 0,
            recommendedPlanCount: 0,
            trackedPlanCount: 0,
            continuePlanCount: 0,
            reviewPlanCount: 0,
            improvingCampaignCount: 0,
          },
          actionDrafts: [],
          candidateCampaigns: [],
          campaigns: [],
          planDrafts: {
            trackedPlans: [],
            recommendedPlans: [],
            continueCandidates: [],
            newCampaignCandidates: [],
            reviewCandidates: [],
          },
          recommendationQuality: {
            overview: {
              totalPlanCount: 0,
              adoptedPlanCount: 0,
              dismissedPlanCount: 0,
              enteredExecutionCount: 0,
              highValueCount: 0,
              missedButRecurringCount: 0,
            },
            themeSummaries: [],
            continueRecommendThemes: [],
            cautiousThemes: [],
          },
        }}
        loading={false}
        selectedActionIds={[]}
        selectedCampaignId=''
        campaignTitle=''
        batchTitle=''
        batchNote=''
        changedWhat=''
        expectedImpact=''
        selectedDetailType='candidate'
        selectedDetailId={null}
        selectedCandidate={null}
        selectedCampaign={null}
        onToggleAction={() => {}}
        onToggleAll={() => {}}
        onSelectCampaign={() => {}}
        onSelectCandidate={() => {}}
        onSelectedCampaignIdChange={() => {}}
        onCampaignTitleChange={() => {}}
        onBatchTitleChange={() => {}}
        onBatchNoteChange={() => {}}
        onChangedWhatChange={() => {}}
        onExpectedImpactChange={() => {}}
        onCreateCampaign={() => {}}
        onMergeIntoCampaign={() => {}}
        onBatchActionStatus={() => {}}
        onCampaignStatusChange={() => {}}
        onSaveBatchNote={() => {}}
        getPlanDecisionNote={() => ''}
        getPlanTargetCampaignId={() => ''}
        getPlanAssignmentActorId={() => ''}
        onPlanDecisionNoteChange={() => {}}
        onPlanTargetCampaignIdChange={() => {}}
        onPlanDecision={() => {}}
        onPlanAssignmentActorIdChange={() => {}}
        onPlanAssign={() => {}}
      />
    )

    assert(html.includes('治理计划跟踪列表'), '有数据时应渲染计划跟踪区')
    assert(html.includes('审批记录'), '有数据时应显示审批记录')
    assert(html.includes('已采纳'), '有数据时应显示审批状态')
    assert(emptyHtml.includes('暂无专项治理数据'), '空数据时应稳定显示空态')
  })

  await test('审批流不会破坏现有计划与效果评估路径', () => {
    const approvedReflections = seedScenario()
    const workbench = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const effectivenessData = buildGovernanceEffectivenessData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })

    assert(workbench.planDrafts.recommendedPlans.length >= 1, 'workbench 仍应生成推荐计划')
    assert(workbench.campaigns.length === 2, 'workbench campaign 统计不应被审批流破坏')
    assert(effectivenessData.campaigns.length === 2, 'effectiveness 统计不应被审批流破坏')
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