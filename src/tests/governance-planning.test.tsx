import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GovernanceDashboardView } from '@/components/GovernanceDashboardView'
import { buildGovernanceDashboardData } from '@/server/learning/governanceDashboard'
import { buildGovernanceEffectivenessData } from '@/server/learning/governanceEffectiveness'
import { buildGovernanceWorkbenchData } from '@/server/learning/governanceWorkbench'
import { createGovernanceCampaignRecord } from '@/server/learning/governanceCampaign'
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
      id: 301,
      conversationId: 601,
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
      id: 302,
      conversationId: 602,
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
      id: 303,
      conversationId: 603,
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
      id: 304,
      conversationId: 604,
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
      id: 305,
      conversationId: 605,
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
      id: 306,
      conversationId: 606,
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
      id: 307,
      conversationId: 607,
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
      id: 308,
      conversationId: 608,
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
      id: 309,
      conversationId: 609,
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

  setFileHint(301, approvedReflections[0].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(302, approvedReflections[1].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(303, approvedReflections[2].createdAt, 'src/server/ai/packaging/mapping.ts')
  setFileHint(304, approvedReflections[3].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(305, approvedReflections[4].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(306, approvedReflections[5].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(307, approvedReflections[6].createdAt, 'src/server/ai/packaging/estimate.ts')
  setFileHint(308, approvedReflections[7].createdAt, 'src/server/ai/packaging/pricingReview.ts')
  setFileHint(309, approvedReflections[8].createdAt, 'src/server/ai/packaging/pricingReview.ts')

  setStatus(301, approvedReflections[0].createdAt, 'ACCEPTED', '2026-03-11T10:00:00.000Z')
  setStatus(301, approvedReflections[0].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(301, approvedReflections[0].createdAt, 'VERIFIED', '2026-03-15T10:00:00.000Z')
  setStatus(302, approvedReflections[1].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(302, approvedReflections[1].createdAt, 'VERIFIED', '2026-03-14T10:00:00.000Z')
  setStatus(303, approvedReflections[2].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')

  setStatus(304, approvedReflections[3].createdAt, 'ACCEPTED', '2026-03-12T10:00:00.000Z')
  setStatus(304, approvedReflections[3].createdAt, 'IMPLEMENTED', '2026-03-13T10:00:00.000Z')
  setStatus(305, approvedReflections[4].createdAt, 'ACCEPTED', '2026-03-13T10:00:00.000Z')
  setStatus(305, approvedReflections[4].createdAt, 'VERIFIED', '2026-03-14T10:00:00.000Z')
  setStatus(306, approvedReflections[5].createdAt, 'REVIEWED', '2026-03-20T10:00:00.000Z')
  setStatus(307, approvedReflections[6].createdAt, 'ACCEPTED', '2026-03-21T10:00:00.000Z')

  setStatus(308, approvedReflections[7].createdAt, 'NEW', '2026-03-22T10:00:00.000Z')
  setStatus(309, approvedReflections[8].createdAt, 'REVIEWED', '2026-03-23T10:00:00.000Z')

  const baseDashboard = buildGovernanceDashboardData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })

  const mappingItems = pickItemsByTheme('复杂包装字段映射', 2, baseDashboard.actionDrafts)
  const estimateItems = pickItemsByTheme('复杂包装 estimated / quoted 边界', 2, baseDashboard.actionDrafts)

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

function renderView() {
  const data = buildWorkbenchData()
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

console.log('\n=== Governance Planning 回归测试 ===\n')

async function main() {
  await test('高频复发专项可生成 CONTINUE_CAMPAIGN 计划', () => {
    const data = buildWorkbenchData()
    const plan = data.planDrafts.continueCandidates.find((item) => item.governanceTheme === '复杂包装字段映射')

    assert(Boolean(plan), '应生成继续治理计划')
    assert(plan?.planType === 'CONTINUE_CAMPAIGN', '计划类型应为 CONTINUE_CAMPAIGN')
  })

  await test('高频高风险且未覆盖的问题可生成 NEW_CAMPAIGN 计划', () => {
    const data = buildWorkbenchData()
    const plan = data.planDrafts.newCampaignCandidates.find((item) => item.governanceTheme === '复杂包装报价判断前置')

    assert(Boolean(plan), '应生成新建专项计划')
    assert(plan?.planType === 'NEW_CAMPAIGN', '计划类型应为 NEW_CAMPAIGN')
    assert(plan?.priorityLevel === 'HIGH', '高风险未覆盖问题应给出 HIGH 优先级')
  })

  await test('效果差的专项可生成 REVIEW_CAMPAIGN 计划', () => {
    const data = buildWorkbenchData()
    const plan = data.planDrafts.reviewCandidates.find((item) => item.governanceTheme === '复杂包装 estimated / quoted 边界')

    assert(Boolean(plan), '应生成复盘计划')
    assert(plan?.planType === 'REVIEW_CAMPAIGN', '计划类型应为 REVIEW_CAMPAIGN')
  })

  await test('batch notes 可保存并显示', () => {
    const data = buildWorkbenchData()
    const campaign = data.campaigns.find((item) => item.campaignTitle === '材质映射专项')
    const html = renderView()

    assert(campaign?.lastBatchNote?.batchTitle === '材质映射第一轮', '应能在工作台数据中读取最近批次备注')
    assert(html.includes('材质映射第一轮'), '页面中应显示最近批次备注标题')
  })

  await test('工作台列表可看到 effectivenessLabel 和 recurrenceWarning', () => {
    const html = renderView()

    assert(html.includes('明显改善'), '工作台应展示 effectivenessLabel')
    assert(html.includes('完成后仍复发 1 次'), '工作台应展示 recurrenceWarning')
  })

  await test('自动计划视图在空数据和有数据时都能稳定显示', () => {
    const html = renderView()
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

    assert(html.includes('下一轮推荐治理计划'), '有数据时应稳定渲染自动计划视图')
    assert(emptyHtml.includes('暂无专项治理数据'), '空数据时应稳定显示空态')
  })

  await test('现有治理工作台与评估面板不受影响', () => {
    const approvedReflections = seedScenario()
    const dashboardData = buildGovernanceDashboardData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const effectivenessData = buildGovernanceEffectivenessData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })

    assert(dashboardData.campaigns.length === 2, '现有治理工作台 campaign 统计不应受影响')
    assert(dashboardData.candidateCampaigns.length >= 1, '现有治理候选输出不应受影响')
    assert(effectivenessData.campaigns.length === 2, '效果评估面板统计不应受影响')
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