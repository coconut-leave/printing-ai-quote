import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildGovernanceActor } from '@/lib/actorIdentity'
import { GovernanceDashboardView } from '@/components/GovernanceDashboardView'
import {
  areActionDraftsMergeCompatible,
  createGovernanceCampaignRecord,
} from '@/server/learning/governanceCampaign'
import { buildGovernanceDashboardData } from '@/server/learning/governanceDashboard'
import { buildActionDraftDashboardStats } from '@/server/learning/actionDraftDashboard'
import { generateImprovementId } from '@/server/learning/improvementSuggestion'
import { clearAllStatuses, setImprovementStatus } from '@/server/learning/improvementStore'
import { buildGovernanceWorkbenchData } from '@/server/learning/governanceWorkbench'
import {
  addGovernanceBatchNote,
  assignActionDraftsToCampaign,
  clearGovernanceStore,
  getActionDraftGovernanceStatus,
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

function setStatus(reflectionId: number, createdAt: Date, status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'IMPLEMENTED' | 'VERIFIED' | 'REJECTED') {
  setImprovementStatus(generateImprovementId(reflectionId, createdAt), status)
}

function buildReflections() {
  return [
    {
      id: 21,
      conversationId: 401,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工修正了复杂包装材质字段。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: { mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' } },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: { mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card_350g' } },
      },
      createdAt: new Date('2026-03-12T12:00:00.000Z'),
    },
    {
      id: 22,
      conversationId: 402,
      issueType: 'PACKAGING_PARAM_WRONG',
      suggestionDraft: '人工再次修正了复杂包装材质字段。',
      originalExtractedParams: {
        productType: 'window_box',
        packagingContext: { mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'single_coated' } },
      },
      correctedParams: {
        productType: 'window_box',
        packagingContext: { mainItem: { productType: 'window_box', title: '开窗彩盒', material: 'white_card_350g' } },
      },
      createdAt: new Date('2026-03-13T12:00:00.000Z'),
    },
    {
      id: 23,
      conversationId: 403,
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      suggestionDraft: '人工调整了子项追加结构。',
      originalExtractedParams: {
        productType: 'tuck_end_box',
        packagingContext: { mainItem: { productType: 'tuck_end_box', title: '双插盒' }, subItems: [] },
      },
      correctedParams: {
        productType: 'tuck_end_box',
        packagingContext: { mainItem: { productType: 'tuck_end_box', title: '双插盒' }, subItems: [{ productType: 'leaflet_insert', title: '说明书' }] },
      },
      createdAt: new Date('2026-03-14T12:00:00.000Z'),
    },
  ]
}

function buildGovernanceData() {
  clearAllStatuses()
  clearGovernanceStore()
  const approvedReflections = buildReflections()

  setStatus(21, approvedReflections[0].createdAt, 'ACCEPTED')
  setStatus(22, approvedReflections[1].createdAt, 'ACCEPTED')
  setStatus(23, approvedReflections[2].createdAt, 'VERIFIED')

  return buildGovernanceWorkbenchData({
    approvedReflections,
    now: new Date('2026-04-03T12:00:00.000Z'),
  })
}

function renderView(data = buildGovernanceData()) {
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
      selectedDetailType='candidate'
      selectedDetailId={data.candidateCampaigns[0]?.candidateId || null}
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

console.log('\n=== Governance Dashboard 回归测试 ===\n')

async function main() {
  await test('同主题 action draft 可被正确归并', () => {
    const data = buildGovernanceData()
    const candidate = data.candidateCampaigns[0]

    assert(candidate.campaignTitle.includes('复杂包装字段映射专项'), '同主题字段映射应生成专项候选')
    assert(candidate.relatedActionDraftIds.length === 2, '同主题 action draft 应被归并到同一候选')
  })

  await test('不同 targetArea 的 action draft 不会被错误合并', () => {
    const stats = buildActionDraftDashboardStats({
      approvedReflections: buildReflections(),
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const mappingItems = stats.rankedActionDrafts.filter((item) => item.targetArea === 'FIELD_MAPPING')
    const promptItems = stats.rankedActionDrafts.filter((item) => item.targetArea === 'PROMPT')

    assert(areActionDraftsMergeCompatible([...mappingItems, ...promptItems]) === false, '不同 targetArea 不应被视为可兼容归并')
  })

  await test('批量选择后可创建专项治理任务', () => {
    const data = buildGovernanceData()
    const selectedItems = data.actionDrafts.filter((item) => data.candidateCampaigns[0].relatedActionDraftIds.includes(item.id))
    const campaign = createGovernanceCampaignRecord({ items: selectedItems })
    saveGovernanceCampaign(campaign)
    assignActionDraftsToCampaign(campaign.id, selectedItems.map((item) => item.id))

    assert(campaign.relatedActionDraftIds.length === 2, '应从批量选中项创建专项')
    assert(getActionDraftGovernanceStatus(selectedItems[0].id) === 'MERGED_INTO_CAMPAIGN', '创建专项后 action draft 应变为 MERGED_INTO_CAMPAIGN')
  })

  await test('action draft 可批量归并到已有专项', () => {
    const data = buildGovernanceData()
    const selectedItems = data.actionDrafts.filter((item) => data.candidateCampaigns[0].relatedActionDraftIds.includes(item.id))
    const campaign = createGovernanceCampaignRecord({ items: selectedItems })
    saveGovernanceCampaign(campaign)
    assignActionDraftsToCampaign(campaign.id, selectedItems.map((item) => item.id))

    assert(getActionDraftGovernanceStatus(selectedItems[1].id) === 'MERGED_INTO_CAMPAIGN', '批量归并到已有专项后应更新治理状态')
  })

  await test('专项状态流转正确', () => {
    const data = buildGovernanceData()
    const selectedItems = data.actionDrafts.filter((item) => data.candidateCampaigns[0].relatedActionDraftIds.includes(item.id))
    const campaign = createGovernanceCampaignRecord({ items: selectedItems })
    saveGovernanceCampaign(campaign)
    assignActionDraftsToCampaign(campaign.id, selectedItems.map((item) => item.id))

    const updated = setGovernanceCampaignStatus(campaign.id, 'IN_GOVERNANCE')
    assert(updated?.status === 'IN_GOVERNANCE', '专项应可流转到 IN_GOVERNANCE')
    assert(getActionDraftGovernanceStatus(selectedItems[0].id) === 'IN_GOVERNANCE', '专项进入治理中后，关联 action draft 应同步进入 IN_GOVERNANCE')
  })

  await test('header actor 可贯穿专项创建、批量流转和批次备注', () => {
    clearAllStatuses()
    clearGovernanceStore()
    const approvedReflections = buildReflections()

    setStatus(21, approvedReflections[0].createdAt, 'ACCEPTED')
    setStatus(22, approvedReflections[1].createdAt, 'ACCEPTED')
    setStatus(23, approvedReflections[2].createdAt, 'VERIFIED')

    const data = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-03T12:00:00.000Z'),
    })
    const headerActor = buildGovernanceActor({
      actorName: '脚本治理员',
      actorEmail: 'script@factory.test',
      actorSource: 'actor-header',
    })
    const selectedItems = data.actionDrafts.filter((item) => data.candidateCampaigns[0].relatedActionDraftIds.includes(item.id))
    const campaign = createGovernanceCampaignRecord({
      items: selectedItems,
      createdBy: headerActor,
    })
    saveGovernanceCampaign(campaign)
    assignActionDraftsToCampaign(campaign.id, selectedItems.map((item) => item.id), '2026-04-04T09:00:00.000Z', headerActor)
    const inGovernanceCampaign = setGovernanceCampaignStatus(campaign.id, 'IN_GOVERNANCE', '2026-04-04T10:00:00.000Z', headerActor)
    const batchResult = addGovernanceBatchNote({
      campaignId: campaign.id,
      batchTitle: '脚本批次一轮',
      batchNote: '通过接口脚本写入专项备注。',
      changedWhat: '批量流转与记录人留痕。',
      expectedImpact: '验证 header actor 持久化。',
      createdAt: '2026-04-04T11:00:00.000Z',
      createdBy: headerActor,
    })
    const refreshed = buildGovernanceWorkbenchData({
      approvedReflections,
      now: new Date('2026-04-04T12:00:00.000Z'),
    }).campaigns.find((item) => item.id === campaign.id)

    assert(campaign.createdBy?.actorSource === 'actor-header', '专项创建应保留 header actor 来源')
    assert(inGovernanceCampaign?.updatedBy?.actorEmail === 'script@factory.test', '专项流转应保留 header actor')
    assert(batchResult?.note.createdBy?.actorName === '脚本治理员', '批次备注应保留 header actor')
    assert(refreshed?.lastBatchNote?.createdBy?.actorSource === 'actor-header', '工作台读取最近批次时应保留 header actor 来源')
    assert(refreshed?.relatedActions.every((item) => item.governanceUpdatedBy?.actorSource === 'actor-header'), '批量流转后的 action 应保留 header actor')
  })

  await test('dashboard 页面在空数据和有数据时都稳定显示', () => {
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

    assert(html.includes('专项治理候选列表'), '有数据时应稳定渲染治理候选区')
    assert(html.includes('批量归并入口'), '有数据时应稳定渲染批量入口')
    assert(html.includes('Theme Quality 排序与筛选'), '有数据时应稳定渲染 theme quality 排序筛选入口')
    assert(html.includes('推荐给更合适的操作者'), '有数据时应稳定渲染操作者推荐区')
    assert(html.includes('审批推荐操作者'), '有数据时应稳定渲染计划级操作者推荐卡片')
    assert(emptyHtml.includes('暂无专项治理数据'), '空数据时应稳定显示空态')
  })

  await test('现有 actions / improvements / priority dashboard 路径不受影响', () => {
    const stats = buildActionDraftDashboardStats({
      approvedReflections: buildReflections(),
      now: new Date('2026-04-03T12:00:00.000Z'),
    })

    assert(stats.summary.totalActionDraftCount === 3, 'priority dashboard 基础统计不应受影响')
    assert(stats.priorityInsights.topActions.length >= 1, 'priority dashboard 优先级结果不应受影响')
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