import { buildFallbackGovernanceActor, buildGovernanceActor, toGovernanceActorAnalyticsIdentity } from '@/lib/actorIdentity'
import type {
  GovernanceActorAnalysisData,
  GovernanceActorBehaviorSummary,
  GovernanceActorThemeAnalysis,
} from '@/server/learning/governanceActorAnalytics'
import {
  recommendActorForGovernanceTheme,
  recommendActorsForGovernancePlan,
} from '@/server/learning/governanceActorRecommendation'
import type { GovernanceCampaignEffectiveness } from '@/server/learning/governanceEffectiveness'
import type { GovernancePlanAdoptionData, GovernancePlanAdoptionEffect } from '@/server/learning/governancePlanAdoption'

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

const strongActor = buildGovernanceActor({
  actorName: '运营负责人',
  actorEmail: 'ops-lead@factory.test',
  actorSource: 'admin-session',
})
const weakActor = buildGovernanceActor({
  actorName: '值班审批人',
  actorEmail: 'reviewer-b@factory.test',
  actorSource: 'actor-header',
})
const fallbackActor = buildFallbackGovernanceActor()

function buildActorSummary(params: Partial<GovernanceActorBehaviorSummary> & { actor: GovernanceActorBehaviorSummary['actor'] }): GovernanceActorBehaviorSummary {
  return {
    actor: params.actor,
    handledPlanCount: params.handledPlanCount ?? 6,
    decisionCount: params.decisionCount ?? 6,
    outcomePlanCount: params.outcomePlanCount ?? 6,
    acceptedCount: params.acceptedCount ?? 5,
    dismissedCount: params.dismissedCount ?? 1,
    mergedCount: params.mergedCount ?? 0,
    batchCreatedCount: params.batchCreatedCount ?? 1,
    acceptRate: params.acceptRate ?? 83.33,
    dismissRate: params.dismissRate ?? 16.67,
    mergeRate: params.mergeRate ?? 0,
    batchCreatedRate: params.batchCreatedRate ?? 16.67,
    enteredExecutionCount: params.enteredExecutionCount ?? 5,
    enteredExecutionRate: params.enteredExecutionRate ?? 83.33,
    improvingCount: params.improvingCount ?? 4,
    improvingRate: params.improvingRate ?? 80,
    recurringAfterAdoptionCount: params.recurringAfterAdoptionCount ?? 1,
    recurringAfterAdoptionRate: params.recurringAfterAdoptionRate ?? 20,
    dismissedRecurringCount: params.dismissedRecurringCount ?? 0,
    highRiskHandledCount: params.highRiskHandledCount ?? 3,
    highRiskImprovingCount: params.highRiskImprovingCount ?? 2,
    highRiskImprovingRate: params.highRiskImprovingRate ?? 66.67,
    recommendationQualityDistribution: params.recommendationQualityDistribution ?? {
      HIGH_VALUE: 3,
      PLAUSIBLE: 2,
      MISSED_BUT_RECURRING: 0,
      LOW_VALUE: 1,
      UNCLEAR: 0,
    },
  }
}

function buildThemeRow(params: Partial<GovernanceActorThemeAnalysis> & { actor: GovernanceActorThemeAnalysis['actor']; governanceTheme: string }): GovernanceActorThemeAnalysis {
  return {
    actor: params.actor,
    governanceTheme: params.governanceTheme,
    planCount: params.planCount ?? 6,
    decisionCount: params.decisionCount ?? 6,
    acceptedCount: params.acceptedCount ?? 5,
    dismissedCount: params.dismissedCount ?? 1,
    mergedCount: params.mergedCount ?? 0,
    batchCreatedCount: params.batchCreatedCount ?? 1,
    acceptRate: params.acceptRate ?? 83.33,
    dismissRate: params.dismissRate ?? 16.67,
    mergeRate: params.mergeRate ?? 0,
    batchCreatedRate: params.batchCreatedRate ?? 16.67,
    enteredExecutionCount: params.enteredExecutionCount ?? 5,
    enteredExecutionRate: params.enteredExecutionRate ?? 83.33,
    improvingCount: params.improvingCount ?? 4,
    improvingRate: params.improvingRate ?? 80,
    recurringAfterAdoptionCount: params.recurringAfterAdoptionCount ?? 1,
    recurrenceRate: params.recurrenceRate ?? 20,
    recommendationQualityDistribution: params.recommendationQualityDistribution ?? {
      HIGH_VALUE: 3,
      PLAUSIBLE: 2,
      MISSED_BUT_RECURRING: 0,
      LOW_VALUE: 1,
      UNCLEAR: 0,
    },
  }
}

function buildCampaign(params: Partial<GovernanceCampaignEffectiveness> & { campaignId: string; campaignTitle: string; governanceTheme: string }): GovernanceCampaignEffectiveness {
  return {
    campaignId: params.campaignId,
    campaignTitle: params.campaignTitle,
    governanceTheme: params.governanceTheme,
    targetArea: params.targetArea ?? 'FIELD_MAPPING',
    changeType: params.changeType ?? 'mapping_update',
    status: params.status ?? 'COMPLETED',
    createdAt: params.createdAt ?? '2026-03-01T00:00:00.000Z',
    completedAt: params.completedAt ?? '2026-03-20T00:00:00.000Z',
    relatedActionCount: params.relatedActionCount ?? 6,
    resolvedActionCount: params.resolvedActionCount ?? 5,
    remainingActionCount: params.remainingActionCount ?? 1,
    avgProcessingTime: params.avgProcessingTime ?? 3,
    beforeCount: params.beforeCount ?? 6,
    afterCount: params.afterCount ?? 2,
    changeRate: params.changeRate ?? -66.67,
    recurrenceCount: params.recurrenceCount ?? 1,
    lastRecurrenceAt: params.lastRecurrenceAt ?? '2026-03-28T00:00:00.000Z',
    effectivenessLabel: params.effectivenessLabel ?? 'IMPROVING',
    avgAcceptedRate: params.avgAcceptedRate ?? 80,
    highRiskBeforeShare: params.highRiskBeforeShare ?? 50,
    highRiskAfterShare: params.highRiskAfterShare ?? 20,
    highRiskChangeRate: params.highRiskChangeRate ?? -60,
    targetFileHints: params.targetFileHints ?? ['src/server/ai/packaging/mapping.ts'],
    recommendedNextAction: params.recommendedNextAction ?? '继续补字段映射样例。',
    note: params.note ?? '测试专项。',
  }
}

function buildAdoptionEffect(params: Partial<GovernancePlanAdoptionEffect> & { actor: GovernancePlanAdoptionEffect['actor']; planId: string; governanceTheme: string; linkedCampaignId?: string }): GovernancePlanAdoptionEffect {
  return {
    planId: params.planId,
    planTitle: params.planTitle ?? params.planId,
    planType: params.planType ?? 'CONTINUE_CAMPAIGN',
    governanceTheme: params.governanceTheme,
    actor: params.actor,
    priorityLevel: params.priorityLevel ?? 'HIGH',
    whyNow: params.whyNow ?? '需要继续治理。',
    decisionStatus: params.decisionStatus ?? 'ACCEPTED',
    adoptionStatus: params.adoptionStatus ?? 'ENTERED_EXECUTION',
    linkedCampaignId: params.linkedCampaignId,
    linkedBatchId: params.linkedBatchId,
    enteredExecution: params.enteredExecution ?? true,
    beforeCount: params.beforeCount ?? 6,
    afterCount: params.afterCount ?? 2,
    changeRate: params.changeRate ?? -66.67,
    recurrenceCount: params.recurrenceCount ?? 1,
    highRiskBeforeShare: params.highRiskBeforeShare ?? 50,
    highRiskAfterShare: params.highRiskAfterShare ?? 20,
    effectivenessLabel: params.effectivenessLabel ?? 'IMPROVING',
    recommendationQualityLabel: params.recommendationQualityLabel ?? 'HIGH_VALUE',
    decisionType: params.decisionType ?? 'ACCEPT',
    decisionAt: params.decisionAt ?? '2026-04-01T09:00:00.000Z',
    note: params.note ?? '测试采用效果。',
  }
}

function buildRecommendationFixture(): {
  actorAnalysis: GovernanceActorAnalysisData
  adoptionData: GovernancePlanAdoptionData
  campaigns: GovernanceCampaignEffectiveness[]
} {
  const strongIdentity = toGovernanceActorAnalyticsIdentity(strongActor)
  const weakIdentity = toGovernanceActorAnalyticsIdentity(weakActor)
  const fallbackIdentity = toGovernanceActorAnalyticsIdentity(fallbackActor)

  const actorAnalysis: GovernanceActorAnalysisData = {
    summary: {
      actorCount: 3,
      realActorCount: 2,
      fallbackActorCount: 1,
      handledPlanCount: 15,
    },
    actors: [
      buildActorSummary({ actor: strongIdentity }),
      buildActorSummary({
        actor: weakIdentity,
        handledPlanCount: 5,
        decisionCount: 5,
        outcomePlanCount: 5,
        acceptedCount: 1,
        dismissedCount: 3,
        batchCreatedCount: 0,
        acceptRate: 20,
        dismissRate: 60,
        batchCreatedRate: 0,
        enteredExecutionCount: 2,
        enteredExecutionRate: 40,
        improvingCount: 1,
        improvingRate: 25,
        recurringAfterAdoptionCount: 3,
        recurringAfterAdoptionRate: 60,
        dismissedRecurringCount: 2,
        highRiskHandledCount: 1,
        highRiskImprovingCount: 0,
        highRiskImprovingRate: 0,
        recommendationQualityDistribution: {
          HIGH_VALUE: 0,
          PLAUSIBLE: 1,
          MISSED_BUT_RECURRING: 2,
          LOW_VALUE: 2,
          UNCLEAR: 0,
        },
      }),
      buildActorSummary({
        actor: fallbackIdentity,
        handledPlanCount: 8,
        decisionCount: 8,
        outcomePlanCount: 8,
        acceptedCount: 7,
        dismissedCount: 1,
        acceptRate: 87.5,
        dismissRate: 12.5,
        enteredExecutionCount: 6,
        enteredExecutionRate: 75,
        improvingCount: 5,
        improvingRate: 83.33,
        recurringAfterAdoptionCount: 1,
        recurringAfterAdoptionRate: 16.67,
      }),
    ],
    realActors: [
      buildActorSummary({ actor: strongIdentity }),
      buildActorSummary({
        actor: weakIdentity,
        handledPlanCount: 5,
        decisionCount: 5,
        outcomePlanCount: 5,
        acceptedCount: 1,
        dismissedCount: 3,
        batchCreatedCount: 0,
        acceptRate: 20,
        dismissRate: 60,
        batchCreatedRate: 0,
        enteredExecutionCount: 2,
        enteredExecutionRate: 40,
        improvingCount: 1,
        improvingRate: 25,
        recurringAfterAdoptionCount: 3,
        recurringAfterAdoptionRate: 60,
        dismissedRecurringCount: 2,
        highRiskHandledCount: 1,
        highRiskImprovingCount: 0,
        highRiskImprovingRate: 0,
        recommendationQualityDistribution: {
          HIGH_VALUE: 0,
          PLAUSIBLE: 1,
          MISSED_BUT_RECURRING: 2,
          LOW_VALUE: 2,
          UNCLEAR: 0,
        },
      }),
    ],
    fallbackActors: [
      buildActorSummary({
        actor: fallbackIdentity,
        handledPlanCount: 8,
        decisionCount: 8,
        outcomePlanCount: 8,
        acceptedCount: 7,
        dismissedCount: 1,
        acceptRate: 87.5,
        dismissRate: 12.5,
        enteredExecutionCount: 6,
        enteredExecutionRate: 75,
        improvingCount: 5,
        improvingRate: 83.33,
        recurringAfterAdoptionCount: 1,
        recurringAfterAdoptionRate: 16.67,
      }),
    ],
    themeActorRows: [
      buildThemeRow({ actor: strongIdentity, governanceTheme: '复杂包装字段映射' }),
      buildThemeRow({
        actor: weakIdentity,
        governanceTheme: '复杂包装字段映射',
        planCount: 5,
        decisionCount: 5,
        acceptedCount: 1,
        dismissedCount: 3,
        batchCreatedCount: 0,
        acceptRate: 20,
        dismissRate: 60,
        batchCreatedRate: 0,
        enteredExecutionCount: 2,
        enteredExecutionRate: 40,
        improvingCount: 1,
        improvingRate: 25,
        recurringAfterAdoptionCount: 3,
        recurrenceRate: 60,
        recommendationQualityDistribution: {
          HIGH_VALUE: 0,
          PLAUSIBLE: 1,
          MISSED_BUT_RECURRING: 2,
          LOW_VALUE: 2,
          UNCLEAR: 0,
        },
      }),
      buildThemeRow({
        actor: fallbackIdentity,
        governanceTheme: '复杂包装字段映射',
        planCount: 8,
        decisionCount: 8,
        acceptedCount: 7,
        dismissedCount: 1,
        acceptRate: 87.5,
        dismissRate: 12.5,
        enteredExecutionCount: 6,
        enteredExecutionRate: 75,
        improvingCount: 5,
        improvingRate: 83.33,
        recurringAfterAdoptionCount: 1,
        recurrenceRate: 16.67,
      }),
    ],
    anomalySignals: [],
    emptyState: {
      hasActorData: true,
      hasRealActorData: true,
    },
  }

  const campaigns = [
    buildCampaign({
      campaignId: 'campaign_mapping',
      campaignTitle: '材质映射专项',
      governanceTheme: '复杂包装字段映射',
      targetArea: 'FIELD_MAPPING',
      changeType: 'mapping_update',
      targetFileHints: ['src/server/ai/packaging/mapping.ts'],
    }),
  ]

  const adoptionData: GovernancePlanAdoptionData = {
    overview: {
      totalPlanCount: 15,
      adoptedPlanCount: 12,
      dismissedPlanCount: 3,
      enteredExecutionCount: 10,
      highValueCount: 5,
      missedButRecurringCount: 2,
    },
    items: [
      ...Array.from({ length: 6 }, (_, index) => buildAdoptionEffect({
        actor: strongIdentity,
        planId: `strong_plan_${index + 1}`,
        governanceTheme: '复杂包装字段映射',
        linkedCampaignId: 'campaign_mapping',
        decisionAt: `2026-04-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
      })),
      ...Array.from({ length: 5 }, (_, index) => buildAdoptionEffect({
        actor: weakIdentity,
        planId: `weak_plan_${index + 1}`,
        governanceTheme: '复杂包装字段映射',
        linkedCampaignId: 'campaign_mapping',
        decisionAt: `2026-02-${String(index + 10).padStart(2, '0')}T09:00:00.000Z`,
        effectivenessLabel: index < 3 ? 'RECURRING' : 'LOW_SIGNAL',
        enteredExecution: index >= 3,
        recurrenceCount: 2,
        recommendationQualityLabel: index < 3 ? 'MISSED_BUT_RECURRING' : 'LOW_VALUE',
      })),
      ...Array.from({ length: 4 }, (_, index) => buildAdoptionEffect({
        actor: fallbackIdentity,
        planId: `fallback_plan_${index + 1}`,
        governanceTheme: '复杂包装字段映射',
        linkedCampaignId: 'campaign_mapping',
        decisionAt: `2026-04-${String(index + 10).padStart(2, '0')}T09:00:00.000Z`,
      })),
    ],
    dismissedButRecurringPlans: [],
    highQualityPlanTypes: [],
    themeSummaries: [],
    continueRecommendThemes: [],
    cautiousThemes: [],
  }

  return {
    actorAnalysis,
    adoptionData,
    campaigns,
  }
}

console.log('\n=== Governance Actor Recommendation 回归测试 ===\n')

async function main() {
  await test('governanceTheme 经验高且 acceptRate 高的 actor 会排在前面', () => {
    const fixture = buildRecommendationFixture()
    const result = recommendActorsForGovernancePlan({
      input: {
        planType: 'CONTINUE_CAMPAIGN',
        governanceTheme: '复杂包装字段映射',
        targetArea: 'FIELD_MAPPING',
        changeType: 'mapping_update',
        targetFileHints: ['src/server/ai/packaging/mapping.ts'],
        riskLevel: 'HIGH',
        whyNow: '字段映射问题再次复发。',
      },
      actorAnalysis: fixture.actorAnalysis,
      adoptionData: fixture.adoptionData,
      campaigns: fixture.campaigns,
      now: new Date('2026-04-04T12:00:00.000Z'),
    })

    assert(result.approval.recommendedActorName === '运营负责人', '审批推荐应优先选择主题经验更强的 actor')
    assert(result.execution.recommendedActorName === '运营负责人', '推进推荐应优先选择效果更强的 actor')
    assert(result.approval.candidateActors[0].recommendationScore > result.approval.candidateActors[1].recommendationScore, '第一名分数应高于第二名')
  })

  await test('高 dismiss 且复发高的 actor 会被降权', () => {
    const fixture = buildRecommendationFixture()
    const result = recommendActorForGovernanceTheme({
      governanceTheme: '复杂包装字段映射',
      actorAnalysis: fixture.actorAnalysis,
      adoptionData: fixture.adoptionData,
      campaigns: fixture.campaigns,
      now: new Date('2026-04-04T12:00:00.000Z'),
    })

    const weakCandidate = result.candidateActors.find((item) => item.actor.actorName === '值班审批人')
    const strongCandidate = result.candidateActors.find((item) => item.actor.actorName === '运营负责人')

    assert(Boolean(weakCandidate && strongCandidate), '应返回真实 actor 候选')
    assert((weakCandidate?.recommendationScore || 0) < (strongCandidate?.recommendationScore || 0), 'dismiss 高且复发高的 actor 应被降权')
    assert(weakCandidate?.recommendationReason.includes('dismiss') || weakCandidate?.recommendationReason.includes('复发'), '降权理由中应体现 dismiss/复发信号')
  })

  await test('fallback actor 不会被误推荐为优先人选', () => {
    const fixture = buildRecommendationFixture()
    const result = recommendActorForGovernanceTheme({
      governanceTheme: '复杂包装字段映射',
      actorAnalysis: fixture.actorAnalysis,
      adoptionData: fixture.adoptionData,
      campaigns: fixture.campaigns,
      now: new Date('2026-04-04T12:00:00.000Z'),
    })

    assert(result.candidateActors.every((item) => !item.actor.isFallbackActor), '候选列表中不应混入 fallback actor')
    assert(result.recommendedActorName !== fallbackActor.actorName, 'fallback actor 不应成为主推荐')
  })

  await test('样本不足时 recommendationConfidence 会降低', () => {
    const actorIdentity = toGovernanceActorAnalyticsIdentity(strongActor)
    const actorAnalysis: GovernanceActorAnalysisData = {
      summary: {
        actorCount: 1,
        realActorCount: 1,
        fallbackActorCount: 0,
        handledPlanCount: 1,
      },
      actors: [buildActorSummary({ actor: actorIdentity, handledPlanCount: 1, decisionCount: 1, outcomePlanCount: 1, acceptRate: 100, dismissRate: 0, enteredExecutionRate: 100, improvingRate: 100, recurringAfterAdoptionRate: 0 })],
      realActors: [buildActorSummary({ actor: actorIdentity, handledPlanCount: 1, decisionCount: 1, outcomePlanCount: 1, acceptRate: 100, dismissRate: 0, enteredExecutionRate: 100, improvingRate: 100, recurringAfterAdoptionRate: 0 })],
      fallbackActors: [],
      themeActorRows: [buildThemeRow({ actor: actorIdentity, governanceTheme: '复杂包装字段映射', planCount: 1, decisionCount: 1, acceptedCount: 1, dismissedCount: 0, acceptRate: 100, dismissRate: 0, enteredExecutionCount: 1, enteredExecutionRate: 100, improvingCount: 1, improvingRate: 100, recurringAfterAdoptionCount: 0, recurrenceRate: 0 })],
      anomalySignals: [],
      emptyState: {
        hasActorData: true,
        hasRealActorData: true,
      },
    }
    const adoptionData: GovernancePlanAdoptionData = {
      overview: {
        totalPlanCount: 1,
        adoptedPlanCount: 1,
        dismissedPlanCount: 0,
        enteredExecutionCount: 1,
        highValueCount: 1,
        missedButRecurringCount: 0,
      },
      items: [buildAdoptionEffect({ actor: actorIdentity, planId: 'single_plan', governanceTheme: '复杂包装字段映射', linkedCampaignId: 'campaign_mapping', decisionAt: '2026-04-04T09:00:00.000Z' })],
      dismissedButRecurringPlans: [],
      highQualityPlanTypes: [],
      themeSummaries: [],
      continueRecommendThemes: [],
      cautiousThemes: [],
    }
    const campaigns = [buildCampaign({ campaignId: 'campaign_mapping', campaignTitle: '材质映射专项', governanceTheme: '复杂包装字段映射' })]

    const result = recommendActorForGovernanceTheme({
      governanceTheme: '复杂包装字段映射',
      actorAnalysis,
      adoptionData,
      campaigns,
      now: new Date('2026-04-04T12:00:00.000Z'),
    })

    assert(result.recommendationConfidence === 'LOW' || result.recommendationConfidence === 'NONE', '样本不足时置信度应降低')
    assert(result.hasClearRecommendation === false, '样本不足时不应强行给出高置信度主推荐')
  })

  await test('单条计划推荐与主题推荐都能正常输出', () => {
    const fixture = buildRecommendationFixture()
    const planResult = recommendActorsForGovernancePlan({
      input: {
        planType: 'CONTINUE_CAMPAIGN',
        governanceTheme: '复杂包装字段映射',
        targetArea: 'FIELD_MAPPING',
        changeType: 'mapping_update',
        targetFileHints: ['src/server/ai/packaging/mapping.ts'],
        riskLevel: 'HIGH',
        whyNow: '需要继续治理字段映射。',
      },
      actorAnalysis: fixture.actorAnalysis,
      adoptionData: fixture.adoptionData,
      campaigns: fixture.campaigns,
      now: new Date('2026-04-04T12:00:00.000Z'),
    })
    const themeResult = recommendActorForGovernanceTheme({
      governanceTheme: '复杂包装字段映射',
      actorAnalysis: fixture.actorAnalysis,
      adoptionData: fixture.adoptionData,
      campaigns: fixture.campaigns,
      now: new Date('2026-04-04T12:00:00.000Z'),
    })

    assert(planResult.approval.candidateActors.length >= 1, '单条计划审批推荐应返回候选')
    assert(planResult.execution.candidateActors.length >= 1, '单条计划推进推荐应返回候选')
    assert(themeResult.candidateActors.length >= 1, '主题推荐应返回候选')
    assert(planResult.approval.recommendationReason.length > 0, '单条计划推荐应返回可读理由')
    assert(themeResult.recommendationReason.length > 0 || Boolean(themeResult.noRecommendationReason), '主题推荐应返回理由或保守说明')
  })

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