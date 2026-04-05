import type { TuckEndPhaseTwoManualReviewDraft } from './tuckEndBoxPhaseTwoDraft'
import { TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_DRAFT } from './tuckEndBoxPhaseTwoLiveReviewBatchOneDraft'
import { TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_DRAFT } from './tuckEndBoxPhaseTwoLiveReviewBatchTwoDraft'

const cumulativeTargetPathReviews: readonly TuckEndPhaseTwoManualReviewDraft[] = [
  ...TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_ONE_DRAFT,
  ...TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_TWO_DRAFT,
].filter(
  (item) =>
    item.bucketAssessment.pathId === 'standard_double_tuck_main_item' &&
    item.conclusion.disposition === 'limited_role_candidate'
)

const TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT = {
  '2070': {
    assistantMessageId: '7750',
    quoteId: '614',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
  '2068': {
    assistantMessageId: '7744',
    quoteId: '613',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
  '2051': {
    assistantMessageId: '7676',
    quoteId: '610',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
  '2045': {
    assistantMessageId: '7664',
    quoteId: '608',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
  '2065': {
    assistantMessageId: '7728',
    quoteId: '612',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
  '2043': {
    assistantMessageId: '7658',
    quoteId: '607',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
  '2040': {
    assistantMessageId: '7642',
    quoteId: '606',
    shadowSubtotal: 2653,
    liveQuotedSubtotal: 2686,
    subtotalGap: 33,
    subtotalGapPercent: 1.2286,
  },
} as const

type TuckEndPriceProxyBenchmarkDraft =
  (typeof TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT)[keyof typeof TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT]

const createBatchThreeReviewDraft = (item: TuckEndPhaseTwoManualReviewDraft): TuckEndPhaseTwoManualReviewDraft => {
  const benchmark = item.basicInfo.conversationId
    ? TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT[
        item.basicInfo.conversationId as keyof typeof TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT
      ]
    : null

  return {
    ...item,
    termAndCostAssessment: {
      ...item.termAndCostAssessment,
      priceProxySystematicDrift: false,
      priceProxyDriftDirection: benchmark ? 'under' : 'not_enough_evidence',
      priceProxyNote: benchmark
        ? `第三批将 live authoritative quote 记录作为内部 benchmark 复核：shadow subtotal ${benchmark.shadowSubtotal}，live quoted subtotal ${benchmark.liveQuotedSubtotal}，固定低 ${benchmark.subtotalGap} 元（${benchmark.subtotalGapPercent}%）。这说明 clean path 已出现可解释的轻微 under 方向线索，但 benchmark 仍只来自 phase-one 正式报价记录，不是人工确认价或真实成交价，因此还不足以认定为可放权的 price proxy。`
        : '当前没有可用的 live authoritative quote benchmark，仍无法前移 price proxy 判断。',
    },
    conclusion: {
      ...item.conclusion,
      reviewNote: benchmark
        ? `第三批 price proxy 复核显示该 clean path 与 live authoritative quote 之间存在固定 33 元轻微 under gap，但 family/type/status 仍稳定、quoted misrelease 仍为 0，当前仍只能维持 candidate_ready。`
        : item.conclusion.reviewNote,
    },
  }
}

export const TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT = cumulativeTargetPathReviews.map(createBatchThreeReviewDraft)

const batchThreeBenchmarks: readonly TuckEndPriceProxyBenchmarkDraft[] = TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.map((item) => {
  if (!item.basicInfo.conversationId) return null
  return TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT[
    item.basicInfo.conversationId as keyof typeof TUCK_END_PHASE_TWO_PRICE_PROXY_BENCHMARK_BY_CONVERSATION_DRAFT
  ]
}).filter((item): item is TuckEndPriceProxyBenchmarkDraft => item !== null)

const averageGap =
  batchThreeBenchmarks.reduce((sum, item) => sum + item.subtotalGap, 0) / batchThreeBenchmarks.length

const averageGapPercent =
  batchThreeBenchmarks.reduce((sum, item) => sum + item.subtotalGapPercent, 0) / batchThreeBenchmarks.length

export const TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_SUMMARY_DRAFT = {
  batchId: 'tuck_end_phase_two_live_review_batch_three_2026_04_05',
  family: 'tuck_end_box',
  reviewFocusPathId: 'standard_double_tuck_main_item',
  reviewMode: 'price_proxy_crosscheck_on_accumulated_clean_path',
  reviewedCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.length,
  addedStandardDoubleTuckSamples: 0,
  cumulativeStandardDoubleTuckSamples: cumulativeTargetPathReviews.length,
  additionalEligibleLiveSamplesFound: 0,
  sampleAcquisitionNote:
    '在当前母池里按既有 clean quoted 口径继续扫 5000 条 assistant message 后，没有发现第 8 条新的 standard_double_tuck_main_item 合格 live 样本，因此第三批重点转为对累计 7 条 clean path 样本做 price proxy benchmark 复核。',
  quotedMisreleaseCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.filter((item) => item.productAssessment.quotedMisrelease).length,
  cumulativeQuotedMisreleaseCount: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.filter((item) => item.productAssessment.quotedMisrelease).length,
  priceProxyEvidence: {
    benchmarkSource: 'phase_one_authoritative_quote_record',
    benchmarkCoverageCount: batchThreeBenchmarks.length,
    priceContextConversationCount: 0,
    quoteRecordCoverageCount: batchThreeBenchmarks.length,
    directionalHint: 'under',
    systematicHighOrLowObserved: false,
    repeatedFixedGapObserved: batchThreeBenchmarks.every((item) => item.subtotalGap === batchThreeBenchmarks[0]?.subtotalGap),
    averageGapAmount: Number(averageGap.toFixed(2)),
    averageGapPercent: Number(averageGapPercent.toFixed(4)),
    explainabilityAdvanced: true,
    note: 'price proxy 证据已从“没有 benchmark”前进到“有内部 authoritative live quote benchmark”。累计 7 条 clean path 样本都显示 shadow subtotal 2653，对应 live quoted subtotal 2686，固定低 33 元，约低 1.2286%。这说明 price proxy 已出现轻微且可解释的 under 方向线索，但 benchmark 仍属于内部一期正式报价，而不是人工确认价或真实成交价。',
  },
  cleanPathPollutionCheck: {
    companionDriftObservedInsideTargetPath: false,
    reversePollutionObservedOnQuotedCleanSubset: false,
    familyMergeStable: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.every((item) => item.productAssessment.familyMergeStable === true),
    packagingTypeStable: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.every((item) => item.productAssessment.packagingTypeStable === true),
    statusStable: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.every((item) => item.productAssessment.statusMatchesExpected === true),
    manualAdjustmentTouchesCoreCost: TUCK_END_PHASE_TWO_LIVE_REVIEW_BATCH_THREE_DRAFT.some((item) => item.termAndCostAssessment.manualAdjustmentTouchesCoreCost === true),
    note: '第三批复核没有发现 companion drift 反向污染 clean quoted subset；family merge、packaging type、quoted status 继续稳定，manual adjustment 仍未侵入核心成本。',
  },
  recommendationDelta: {
    candidateStatus: 'candidate_ready',
    approvalStatus: 'not_approved_for_limited_role_yet',
    readinessSignal: 'price_proxy_more_explainable_but_external_anchor_missing',
    note: '第三批让 price proxy 从“重复稳定”前进到“有内部 benchmark 的轻微 under 方向线索”，因此离 approved_for_limited_role 更近了一步；但由于没有外部成交价或人工确认价锚点，仍不能直接批准。',
  },
  mainBlockingItem: {
    blockerId: 'external_price_anchor_missing',
    blockerSummary: '当前最主要阻塞项仍是 price proxy 缺少外部价格锚点。',
    whyItStillBlocks:
      '虽然内部一期正式报价已提供可解释 benchmark，但还没有真实成交价、人工确认价或更强价格参照来判断这 33 元固定 under gap 是否可接受，因此还不能把 limited role 从 candidate_ready 推进到批准。',
  },
  keyFindings: [
    '第三批没有新增第 8 条 clean quoted main-item live 样本；当前母池内新增样本已枯竭。',
    '累计 7 条 clean path 样本全部存在一期 authoritative live quote 记录，可作为内部价格 benchmark。',
    '累计 7 条样本中 shadow subtotal 相对 live quoted subtotal 固定低 33 元，约低 1.2286%，形成轻微 under 方向线索。',
    'quoted misrelease 仍为 0，clean path 仍未被 companion drift 污染，manual adjustment 仍未侵入核心成本。',
  ],
} as const