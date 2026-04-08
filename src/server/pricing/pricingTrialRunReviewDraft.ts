import {
  decideComplexPackagingQuotePath,
  extractComplexPackagingQuoteRequest,
} from '@/server/packaging/extractComplexPackagingQuote'
import {
  buildPricingAcceptanceGateEntries,
  type PricingAcceptanceGateEntry,
} from '@/server/pricing/pricingAcceptanceGateDraft'
import {
  PRICING_TRIAL_RELEASE_ENTRIES,
  PRICING_TRIAL_SCOPE_CANONICAL_DOC_PATH,
  type PricingTrialReleaseEntry,
} from '@/server/pricing/pricingTrialReleaseGateDraft'

export type PricingTrialRunPrimaryTrack = 'coverage_expansion' | 'operations_and_delivery_optimization'

export type PricingTrialRunReviewDisposition = 'not_needed' | 'manual_confirmed' | 'returned_as_estimate' | 'handoff_to_human'

export type PricingTrialRunConfidence = 'stable' | 'watch'

export type PricingTrialRunDocumentKind = 'formal_quote' | 'reference_quote' | 'manual_review'

export type PricingTrialRunScenarioEvaluation = {
  id: string
  label: string
  scopeType: 'item' | 'bundle'
  pathFamily: string
  bundleType: string | null
  runtimeExpectation: 'quoted' | 'estimated' | 'handoff_required'
  actualRuntimeStatus: 'quoted' | 'estimated' | 'handoff_required' | 'missing_fields'
  runtimeAligned: boolean
  deliveryDocumentKind: PricingTrialRunDocumentKind
  entersReviewQueue: boolean
  reviewDisposition: PricingTrialRunReviewDisposition
  confidence: PricingTrialRunConfidence
  operatorConcern: string | null
  acceptanceGateIds: string[]
  acceptanceAccepted: boolean | null
  notes: string
}

export type PricingTrialRunMetricCard = {
  label: string
  count: number
  ratio: string
  note: string
}

export type PricingTrialRunDistributionEntry = {
  label: string
  count: number
  ratio: string
  note: string
}

export type PricingTrialRunBlocker = {
  title: string
  summary: string
  whyItMatters: string
  nextMove: string
}

export type PricingTrialRunRecommendation = {
  primaryTrack: PricingTrialRunPrimaryTrack
  primaryTrackLabel: string
  reason: string
  secondaryTrack: PricingTrialRunPrimaryTrack
  secondaryTrackLabel: string
  orderedNextMoves: string[]
}

export type PricingTrialRunCoverageCandidate = {
  rank: number
  label: string
  pathType: 'bundle' | 'item'
  shouldExpandNow: boolean
  frequencySignal: string
  whyThisRank: string
}

export type PricingTrialRunReviewDraft = {
  docPath: string
  reviewDate: string
  methodology: {
    mode: 'internal_simulated_trial'
    summary: string
    sources: string[]
    totalRepresentativeScenarios: number
    totalAcceptanceGates: number
  }
  overview: {
    runtimeMetrics: PricingTrialRunMetricCard[]
    deliveryMetrics: PricingTrialRunMetricCard[]
    reviewMetrics: PricingTrialRunMetricCard[]
  }
  pathDistribution: {
    quotedTopPaths: PricingTrialRunDistributionEntry[]
    estimatedTopPaths: PricingTrialRunDistributionEntry[]
    handoffTopPaths: PricingTrialRunDistributionEntry[]
    topBundleTypes: PricingTrialRunDistributionEntry[]
    activeScopeOutsideInquiryTypes: PricingTrialRunDistributionEntry[]
  }
  manualHotspots: {
    manualConfirmedPaths: PricingTrialRunDistributionEntry[]
    returnedAsEstimatePaths: PricingTrialRunDistributionEntry[]
    estimatedToHandoffPaths: PricingTrialRunDistributionEntry[]
    acceptedButStillUncomfortablePaths: PricingTrialRunDistributionEntry[]
    quotedRollbackObservation: string
  }
  deliveryExperience: Array<{
    area: string
    verdict: 'good_enough_for_trial' | 'usable_but_watch' | 'needs_next_round'
    summary: string
  }>
  blockers: {
    realTrialBlocker: PricingTrialRunBlocker
    realCoverageBlocker: PricingTrialRunBlocker
    realOperationsBlocker: PricingTrialRunBlocker
  }
  coverageCandidates: PricingTrialRunCoverageCandidate[]
  recommendation: PricingTrialRunRecommendation
  scenarioEvaluations: PricingTrialRunScenarioEvaluation[]
}

export const PRICING_TRIAL_RUN_REVIEW_DOC_PATH = 'docs/pricing-trial-run-review.md'

type ScenarioOverride = {
  reviewDisposition: PricingTrialRunReviewDisposition
  operatorConcern?: string
}

const REVIEW_DISPOSITION_OVERRIDES: Record<string, ScenarioOverride> = {
  window_no_film: {
    reviewDisposition: 'manual_confirmed',
    operatorConcern: '当前 no-film 开窗路径仍是保守参考报价，但业务通常能接受先按现口径沟通。',
  },
  carton_packaging_printed: {
    reviewDisposition: 'manual_confirmed',
    operatorConcern: '非标准印刷纸箱路径当前仍保守为参考报价；已进入标准 K636K 单面四色大外箱白名单的单品可直接 quoted。',
  },
  foil_bag_printed_custom: {
    reviewDisposition: 'returned_as_estimate',
    operatorConcern: '定制印刷袋型仍缺稳定模板，当前更适合继续保留参考报价。',
  },
  bundle_non_whitelisted_main_plus_insert: {
    reviewDisposition: 'returned_as_estimate',
    operatorConcern: '非白名单主盒 + 内托仍缺 order-level 放开证据，业务更适合维持参考报价。',
  },
  bundle_multi_accessory: {
    reviewDisposition: 'handoff_to_human',
    operatorConcern: '多配件 bundle 已超出当前白名单，业务通常会要求人工确认整单结构。',
  },
  template_outside_scope: {
    reviewDisposition: 'handoff_to_human',
    operatorConcern: '模板外结构当前没有自动报价意义，必须直接转人工。',
  },
  file_dieline_driven: {
    reviewDisposition: 'handoff_to_human',
    operatorConcern: '文件驱动询价当前必须人工看稿，review queue 的动作基本是确认转人工。',
  },
  blocking_terms_materials: {
    reviewDisposition: 'handoff_to_human',
    operatorConcern: '高复杂术语和特材组合仍依赖人工经验判断。',
  },
  box_insert_handoff_only: {
    reviewDisposition: 'handoff_to_human',
    operatorConcern: '复杂 box_insert 仍没有稳定模板，业务通常直接要求人工兜底。',
  },
}

const WATCH_CONFIDENCE_IDS = new Set([
  'leaflet_generic_high_frequency',
  'box_insert_proxy_high_frequency',
  'foil_bag_standard_printed',
  'bundle_tuck_end_plus_generic_leaflet',
  'bundle_tuck_end_plus_proxy_insert',
])

function formatRatio(count: number, total: number): string {
  if (!total) {
    return '0.0%'
  }

  return `${((count / total) * 100).toFixed(1)}%`
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const map = new Map<string, number>()

  items.forEach((item) => {
    const key = getKey(item)
    if (!key) {
      return
    }

    map.set(key, (map.get(key) || 0) + 1)
  })

  return map
}

function buildDistributionEntries(
  counts: Map<string, number>,
  total: number,
  notes: Record<string, string>,
): PricingTrialRunDistributionEntry[] {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
    .map(([label, count]) => ({
      label,
      count,
      ratio: formatRatio(count, total),
      note: notes[label] || '',
    }))
}

function getAcceptanceGateMap() {
  return new Map(buildPricingAcceptanceGateEntries().map((entry) => [entry.gate_id, entry]))
}

function getPathFamily(entry: PricingTrialReleaseEntry): string {
  if (entry.id.includes('tuck_end') || entry.id.includes('main_box')) {
    return '双插盒 / 标准主盒路径'
  }

  if (entry.id.includes('mailer')) {
    return '飞机盒路径'
  }

  if (entry.id.includes('window')) {
    return '开窗彩盒路径'
  }

  if (entry.id.includes('leaflet')) {
    return '说明书路径'
  }

  if (entry.id.includes('box_insert') || entry.id.includes('insert')) {
    return '内托路径'
  }

  if (entry.id.includes('sticker')) {
    return '封口贴路径'
  }

  if (entry.id.includes('foil_bag')) {
    return '铝箔袋路径'
  }

  if (entry.id.includes('carton')) {
    return '纸箱包装路径'
  }

  if (entry.id.includes('file') || entry.id.includes('template') || entry.id.includes('blocking_terms')) {
    return '文件 / 模板外 / 高复杂术语路径'
  }

  return entry.scopeType === 'bundle' ? '其他 bundle 路径' : '其他单项路径'
}

function getBundleType(entry: PricingTrialReleaseEntry): string | null {
  if (entry.scopeType !== 'bundle') {
    return null
  }

  if (entry.id.includes('leaflet_sticker')) {
    return '主盒 + 双标准配件'
  }

  if (entry.id.includes('leaflet')) {
    return '主盒 + 说明书'
  }

  if (entry.id.includes('insert')) {
    return '主盒 + 内托'
  }

  if (entry.id.includes('simple_carton') || entry.id.includes('plus_carton')) {
    return '主件 + carton add-on'
  }

  if (entry.id.includes('sticker')) {
    return '主盒 + 贴纸'
  }

  if (entry.id.includes('multi_accessory')) {
    return '主盒 + 多配件'
  }

  return '其他 bundle'
}

function getDeliveryDocumentKind(status: PricingTrialRunScenarioEvaluation['actualRuntimeStatus']): PricingTrialRunDocumentKind {
  if (status === 'quoted') {
    return 'formal_quote'
  }

  if (status === 'estimated') {
    return 'reference_quote'
  }

  return 'manual_review'
}

function isTrialHandoffEquivalent(status: PricingTrialRunScenarioEvaluation['actualRuntimeStatus']) {
  return status === 'handoff_required' || status === 'missing_fields'
}

function isRuntimeAligned(entry: PricingTrialReleaseEntry, actualRuntimeStatus: PricingTrialRunScenarioEvaluation['actualRuntimeStatus']) {
  if (actualRuntimeStatus === entry.runtimeExpectation) {
    return true
  }

  return entry.runtimeExpectation === 'handoff_required' && actualRuntimeStatus === 'missing_fields'
}

function getActualRuntimeStatus(entry: PricingTrialReleaseEntry): PricingTrialRunScenarioEvaluation['actualRuntimeStatus'] {
  const request = extractComplexPackagingQuoteRequest(entry.representativeMessage)
  if (!request) {
    return 'missing_fields'
  }

  return decideComplexPackagingQuotePath(request).status
}

function buildScenarioEvaluation(entry: PricingTrialReleaseEntry, acceptanceGateMap: Map<string, PricingAcceptanceGateEntry>): PricingTrialRunScenarioEvaluation {
  const actualRuntimeStatus = getActualRuntimeStatus(entry)
  const acceptanceEntries = entry.acceptanceGateIds
    .map((gateId) => acceptanceGateMap.get(gateId))
    .filter(Boolean) as PricingAcceptanceGateEntry[]
  const acceptanceAccepted = acceptanceEntries.length > 0
    ? acceptanceEntries.every((gate) => gate.acceptance_status === 'accepted')
    : null
  const override = REVIEW_DISPOSITION_OVERRIDES[entry.id]

  return {
    id: entry.id,
    label: entry.label,
    scopeType: entry.scopeType,
    pathFamily: getPathFamily(entry),
    bundleType: getBundleType(entry),
    runtimeExpectation: entry.runtimeExpectation,
    actualRuntimeStatus,
    runtimeAligned: isRuntimeAligned(entry, actualRuntimeStatus),
    deliveryDocumentKind: getDeliveryDocumentKind(actualRuntimeStatus),
    entersReviewQueue: actualRuntimeStatus !== 'quoted',
    reviewDisposition: actualRuntimeStatus === 'quoted' ? 'not_needed' : override?.reviewDisposition || 'returned_as_estimate',
    confidence: WATCH_CONFIDENCE_IDS.has(entry.id) ? 'watch' : 'stable',
    operatorConcern: override?.operatorConcern || null,
    acceptanceGateIds: entry.acceptanceGateIds,
    acceptanceAccepted,
    notes: entry.notes,
  }
}

function buildMetricCard(label: string, count: number, total: number, note: string): PricingTrialRunMetricCard {
  return {
    label,
    count,
    ratio: formatRatio(count, total),
    note,
  }
}

const ACCEPTANCE_GATE_MAP = getAcceptanceGateMap()

export const PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS = PRICING_TRIAL_RELEASE_ENTRIES.map((entry) => buildScenarioEvaluation(entry, ACCEPTANCE_GATE_MAP))

const TOTAL_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.length
const QUOTED_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.actualRuntimeStatus === 'quoted')
const ESTIMATED_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.actualRuntimeStatus === 'estimated')
const HANDOFF_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => isTrialHandoffEquivalent(item.actualRuntimeStatus))
const REVIEW_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.entersReviewQueue)
const MANUAL_CONFIRMED_SCENARIOS = REVIEW_SCENARIOS.filter((item) => item.reviewDisposition === 'manual_confirmed')
const RETURNED_AS_ESTIMATE_SCENARIOS = REVIEW_SCENARIOS.filter((item) => item.reviewDisposition === 'returned_as_estimate')
const HANDOFF_TO_HUMAN_SCENARIOS = REVIEW_SCENARIOS.filter((item) => item.reviewDisposition === 'handoff_to_human')
const FORMAL_EXPORT_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.deliveryDocumentKind === 'formal_quote')
const REFERENCE_EXPORT_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.deliveryDocumentKind === 'reference_quote')
const MANUAL_REVIEW_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.deliveryDocumentKind === 'manual_review')
const WATCHED_ACCEPTED_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.confidence === 'watch')
const QUOTED_ROLLBACK_SCENARIOS = PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter(
  (item) => item.runtimeExpectation === 'quoted' && item.reviewDisposition !== 'not_needed',
)

const ACCEPTANCE_ENTRIES = buildPricingAcceptanceGateEntries()
const ACCEPTED_GATE_COUNT = ACCEPTANCE_ENTRIES.filter((entry) => entry.acceptance_status === 'accepted').length

const QUOTED_PATH_NOTES: Record<string, string> = {
  '双插盒 / 标准主盒路径': '当前 quoted 样本最集中，说明 active scope 仍明显偏向标准双插盒及其白名单 bundle。',
  '说明书路径': '高频 accessory 单品已能承接 quoted，但仍需区分标准与 narrow generic path。',
  '内托路径': '内托 quoted 已放开到显式克重与高频 proxy 两条窄路径。',
}

const ESTIMATED_PATH_NOTES: Record<string, string> = {
  '双插盒 / 标准主盒路径': '当前最主要 estimated 压力集中在 order-level bundle 白名单之外，而不是单项模板失效。',
  '开窗彩盒路径': 'no-film 开窗已从 handoff 收紧到 estimated，是当前最稳定的单项 estimated 边界。',
  '铝箔袋路径': '定制印刷袋型仍缺稳定模板与交付口径。',
  '纸箱包装路径': 'printed carton 仍偏保守，但业务通常可以先接受参考报价。',
}

const HANDOFF_PATH_NOTES: Record<string, string> = {
  '文件 / 模板外 / 高复杂术语路径': 'handoff 主要仍来自模板外、文件驱动与高复杂术语，而不是当前活跃白名单内部失控。',
  '内托路径': '复杂内托仍属于高复杂长尾，短期不应误升自动化。',
}

const OUTSIDE_SCOPE_PATH_NOTES: Record<string, string> = {
  '文件 / 模板外 / 高复杂术语路径': '当前 active scope 外最常见的仍是文件驱动、模板外结构和 blocking term 组合。',
  '内托路径': '复杂内托属于当前仍保留人工兜底的 in-family 长尾。',
}

const BUNDLE_TYPE_NOTES: Record<string, string> = {
  '主盒 + 说明书': '当前 quoted bundle 最稳定的一类。',
  '主盒 + 内托': '当前仍同时存在 quoted 白名单与 estimated 非白名单，两极分化明显。',
  '主盒 + 双标准配件': '当前只放开一条最简双配件 quoted bundle。',
  '主盒 + 多配件': '当前仍是最典型的 estimated-to-human 候选。',
}

function buildOverview() {
  return {
    runtimeMetrics: [
      buildMetricCard('正式报价', QUOTED_SCENARIOS.length, TOTAL_SCENARIOS, '当前 active scope 内的 canonical 代表样本里，正式报价仍是主流结果。'),
      buildMetricCard('参考报价', ESTIMATED_SCENARIOS.length, TOTAL_SCENARIOS, 'estimated 样本已经被压缩到少量明确保守边界。'),
      buildMetricCard('人工处理', HANDOFF_SCENARIOS.length, TOTAL_SCENARIOS, 'handoff 样本主要集中在模板外、文件驱动和高复杂术语。'),
    ],
    deliveryMetrics: [
      buildMetricCard('可直接导出正式报价', FORMAL_EXPORT_SCENARIOS.length, TOTAL_SCENARIOS, 'quoted path 可直接形成正式报价单。'),
      buildMetricCard('可导出参考报价', REFERENCE_EXPORT_SCENARIOS.length, TOTAL_SCENARIOS, 'estimated path 保持为参考报价交付。'),
      buildMetricCard('仅保留人工处理提示', MANUAL_REVIEW_SCENARIOS.length, TOTAL_SCENARIOS, 'handoff-only path 不应误导出正式或参考单据。'),
    ],
    reviewMetrics: [
      buildMetricCard('进入 review queue', REVIEW_SCENARIOS.length, TOTAL_SCENARIOS, '当前队列只自动承接 estimated / manual-review / human-followup 类路径。'),
      buildMetricCard('人工确认', MANUAL_CONFIRMED_SCENARIOS.length, REVIEW_SCENARIOS.length, '人工确认主要落在业务能接受当前保守边界的 estimated path。'),
      buildMetricCard('保留参考报价', RETURNED_AS_ESTIMATE_SCENARIOS.length, REVIEW_SCENARIOS.length, '主要发生在 order-level 白名单之外但仍可继续沟通的路径。'),
      buildMetricCard('转人工处理', HANDOFF_TO_HUMAN_SCENARIOS.length, REVIEW_SCENARIOS.length, '高复杂、多配件、文件驱动路径在 review 中最常直接转人工。'),
    ],
  }
}

function buildPathDistribution() {
  return {
    quotedTopPaths: buildDistributionEntries(countBy(QUOTED_SCENARIOS, (item) => item.pathFamily), QUOTED_SCENARIOS.length, QUOTED_PATH_NOTES),
    estimatedTopPaths: buildDistributionEntries(countBy(ESTIMATED_SCENARIOS, (item) => item.pathFamily), ESTIMATED_SCENARIOS.length, ESTIMATED_PATH_NOTES),
    handoffTopPaths: buildDistributionEntries(countBy(HANDOFF_SCENARIOS, (item) => item.pathFamily), HANDOFF_SCENARIOS.length, HANDOFF_PATH_NOTES),
    topBundleTypes: buildDistributionEntries(countBy(PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.bundleType), (item) => item.bundleType), PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS.filter((item) => item.bundleType).length, BUNDLE_TYPE_NOTES),
    activeScopeOutsideInquiryTypes: buildDistributionEntries(countBy(HANDOFF_SCENARIOS, (item) => item.pathFamily), HANDOFF_SCENARIOS.length, OUTSIDE_SCOPE_PATH_NOTES),
  }
}

function buildManualHotspots() {
  const manualConfirmedPaths = buildDistributionEntries(
    countBy(MANUAL_CONFIRMED_SCENARIOS, (item) => item.label),
    MANUAL_CONFIRMED_SCENARIOS.length,
    {
      'window_box no-film（保守子集）': '当前 no-film 开窗路径里未进入 glossy 窄白名单的保守子集，业务通常还能接受先按参考报价继续跟进。',
      'printed carton_packaging': '未进入标准 K636K 单面四色大外箱白名单的 printed carton 当前仍以人工确认后维持参考报价为主。',
    },
  )

  const returnedAsEstimatePaths = buildDistributionEntries(
    countBy(RETURNED_AS_ESTIMATE_SCENARIOS, (item) => item.label),
    RETURNED_AS_ESTIMATE_SCENARIOS.length,
    {
      'printed/custom foil_bag': '定制袋型当前更多是被人工明确保留在参考报价。',
      '非白名单主盒 + 内托': 'order-level 白名单之外的主盒 + 内托当前仍以保留参考报价为主。',
    },
  )

  const estimatedToHandoffPaths = buildDistributionEntries(
    countBy(
      REVIEW_SCENARIOS.filter((item) => item.runtimeExpectation === 'estimated' && item.reviewDisposition === 'handoff_to_human'),
      (item) => item.label,
    ),
    Math.max(1, REVIEW_SCENARIOS.filter((item) => item.runtimeExpectation === 'estimated' && item.reviewDisposition === 'handoff_to_human').length),
    {
      '多配件标准 bundle': '当前最容易从 estimated 升级为人工处理的是更宽的多配件整单。',
    },
  )

  const acceptedButStillUncomfortablePaths = buildDistributionEntries(
    countBy(WATCHED_ACCEPTED_SCENARIOS, (item) => item.label),
    WATCHED_ACCEPTED_SCENARIOS.length,
    {
      'generic leaflet（高频标准化）': '虽然已 accepted，但依旧属于 narrow generic path，业务需要持续观察。',
      'proxy box_insert（高频标准化）': '虽然已 accepted，但 proxy insert 仍不应外推到更宽长尾。',
      'standard printed foil_bag': '虽然已放开最小单品子集，但当前仍只是 controlled acceptance quoted candidate，不应外推到 generic print、双面印刷或 bundle。',
      '标准双插盒 + 高频 generic 说明书': '当前仅在双插盒窄白名单内放心。',
      '标准双插盒 + 高频 proxy 内托': '当前仅在双插盒窄白名单内放心。',
    },
  )

  return {
    manualConfirmedPaths,
    returnedAsEstimatePaths,
    estimatedToHandoffPaths,
    acceptedButStillUncomfortablePaths,
    quotedRollbackObservation: QUOTED_ROLLBACK_SCENARIOS.length === 0
      ? '当前内部 trial 样本没有观察到 quoted 被打回的已留痕案例。这不是“风险为零”，而是说明当前 workflow 还缺 quoted 抽检 / 打回的专门观察通道。'
      : '当前已出现 quoted 被打回的留痕，应尽快收口 quoted 抽检规则。',
  }
}

function buildDeliveryExperience() {
  return [
    {
      area: 'runtime stability',
      verdict: 'good_enough_for_trial' as const,
      summary: '本轮已把 RAG/OpenAI eager import 改为 lazy load，并按 lockfile 重建导出依赖树；交付关键链路 coverage 已补齐，顶层 MVP 主回归现已恢复到 37/37 全通过。',
    },
    {
      area: 'quote export',
      verdict: 'good_enough_for_trial' as const,
      summary: `当前 ${TOTAL_SCENARIOS} 个内部样本中有 ${FORMAL_EXPORT_SCENARIOS.length} 个可直接形成正式报价单，${REFERENCE_EXPORT_SCENARIOS.length} 个可形成参考报价单，${MANUAL_REVIEW_SCENARIOS.length} 个 handoff-only 路径被正确阻断为人工处理提示。`,
    },
    {
      area: 'batch export / ledger',
      verdict: 'good_enough_for_trial' as const,
      summary: '今日 / 本月 / 本年筛选、quoted / estimated 台账区分、业务归档分类与对外使用建议当前都已有交付回归保护，已经够 limited trial 留档和月末抽查使用。',
    },
    {
      area: 'review queue',
      verdict: 'good_enough_for_trial' as const,
      summary: `review queue 对 ${REVIEW_SCENARIOS.length} 个非 quoted 样本已经够用，状态筛选、非法筛选保护、中文流转展示和来源切换都已被回归锁住；剩余缺口主要是 quoted 抽检留痕，而不是队列本身不好用。`,
    },
    {
      area: 'manual confirmation',
      verdict: 'good_enough_for_trial' as const,
      summary: '处理人必填、manualConfirmedAt、中文动作留痕、状态筛选和后台状态联动都已经补齐回归；当前 manual confirmation 已经足够支撑实际 limited trial 跟单。',
    },
    {
      area: 'audit trail / reflection / business feedback',
      verdict: 'good_enough_for_trial' as const,
      summary: '反馈区已经能展示 reflection、business feedback、当前处理人、人工确认时间和最近处理备注；留痕链路现在更像“可复盘的业务记录”，而不只是技术审计日志。',
    },
    {
      area: '中文业务化表达',
      verdict: 'good_enough_for_trial' as const,
      summary: '会话详情、导出和 trial review 面板已经基本能用中文解释 quoted / estimated / handoff / trial scope / bundle gate，不再主要暴露内部枚举。',
    },
    {
      area: 'trial review 面板复盘能力',
      verdict: 'usable_but_watch' as const,
      summary: '当前面板已经足够支撑单案例复盘，但跨周期趋势、top blockers 和 quoted audit 还需要独立复盘视图或固定周报。',
    },
  ]
}

function buildBlockers() {
  return {
    realTrialBlocker: {
      title: 'quoted 抽检留痕仍是盲区',
      summary: `当前内部样本中有 ${QUOTED_SCENARIOS.length} 个 quoted path，但自动进入 review queue 的只有 ${REVIEW_SCENARIOS.length} 个非 quoted path。已 accepted 但仍需要观察的 generic/proxy 窄路径没有结构化的 quoted 打回证据面。`,
      whyItMatters: '这会让团队知道“当前能跑”，却还难以用留痕证明“当前 quoted path 在真实业务里到底有多放心”。',
      nextMove: '把 quoted 抽检与打回留痕作为 coverage 扩张的并行治理项，而不是继续卡住下一条路径。',
    },
    realCoverageBlocker: {
      title: 'estimated-only 主压力已转到更宽 printed/custom foil_bag 与非白名单 printed carton 边界',
      summary: `当前标准 K636K 单面四色大外箱单品已从 estimated-only 中拆出后，${ESTIMATED_SCENARIOS.length} 个 estimated 样本里的下一步重点不再是这条最窄 printed carton 单品，而是更宽 printed/custom foil_bag 单项边界，以及仍需人工确认的非白名单 printed carton / bundle；generic / proxy 多配件组合和 window + insert 继续保留 guardrail。`,
      whyItMatters: '这意味着 coverage 扩张仍可继续沿着单项、低复杂、证据边界清晰的路径推进，但不应该把刚放开的 printed carton 子集外推到更宽 carton 结构或 bundle。',
      nextMove: 'coverage 下一步优先评估更宽 printed/custom foil_bag 单项子集；非白名单 printed carton 与 printed carton bundle 继续守住当前 guardrail。',
    },
    realOperationsBlocker: {
      title: 'trial 复盘仍然依赖人工拼接证据',
      summary: '当前有 queue、导出、台账、panel、audit trail 和 business feedback，而且本轮已经清掉 RAG/OpenAI 加载与导出依赖损坏这类基础稳定性问题；但 period-level 指标、top reason、review disposition 汇总还没有固定产物，导致每轮 trial 复盘都要重新拼数据。',
      whyItMatters: '如果复盘成本高，团队很容易又退回到凭感觉推进 coverage 或 workflow。',
      nextMove: '把本轮 markdown + structured draft 固化成固定周报入口，后续只需要替换样本或真实流量即可持续复用，但它不再阻断下一条 coverage 推进。',
    },
  }
}

function buildCoverageCandidates(): PricingTrialRunCoverageCandidate[] {
  return [
    {
      rank: 1,
      label: 'printed/custom foil_bag',
      pathType: 'item',
      shouldExpandNow: true,
      frequencySignal: '当前 canonical simulated trial 里直接贡献 1 条 estimated case，且更宽定制印刷袋型仍持续落在 returned_as_estimate。',
      whyThisRank: '在标准 printed carton 单品已拆出最小 quoted candidate 后，更宽 printed/custom foil_bag 成为边界更清晰、仍值得继续做单项保守升级的下一条候选。',
    },
    {
      rank: 2,
      label: 'printed carton_packaging（非标准 printed / bundle）',
      pathType: 'item',
      shouldExpandNow: false,
      frequencySignal: '当前 canonical simulated trial 里仍保留 1 条 estimated case，并且业务更多是 manual confirmation 后继续参考报价。',
      whyThisRank: '最窄标准 printed carton 单品已经放开，但其余 printed carton 仍涉及数量门槛、印刷面、成箱/包装费和 bundle 复杂度，不适合马上继续外推。',
    },
    {
      rank: 3,
      label: 'window_box no-film（保守子集）',
      pathType: 'item',
      shouldExpandNow: false,
      frequencySignal: '当前 canonical simulated trial 里仍保留 1 条 estimated case，但本轮已经拆出 glossy 窄白名单 quoted 子集。',
      whyThisRank: '当前更重要的是守住新拆出来的 glossy/no-film 边界，而不是继续扩大 no-film 外延。',
    },
    {
      rank: 4,
      label: 'generic / proxy 多配件标准 bundle',
      pathType: 'bundle',
      shouldExpandNow: false,
      frequencySignal: '当前 canonical simulated trial 里仍有代表样本落在 estimated-only，但本轮已明确保持为 guardrail，不再作为立即扩张对象。',
      whyThisRank: 'generic leaflet / proxy insert 参与的多配件组合仍缺更稳的 order-level 证据，继续保守更合理。',
    },
    {
      rank: 5,
      label: 'window_box + insert conservative subset',
      pathType: 'bundle',
      shouldExpandNow: false,
      frequencySignal: '当前 canonical simulated trial 里仍由开窗主盒 + 标准内托 / proxy 内托样本代表 estimated-only guardrail。',
      whyThisRank: 'window 主件的 order-level 扩张仍应放在 no-film 单项之后，避免同时放松两个 window 相关边界。',
    },
  ]
}

function buildRecommendation(): PricingTrialRunRecommendation {
  return {
    primaryTrack: 'operations_and_delivery_optimization',
    primaryTrackLabel: 'trial 运营落地与真实反馈收集',
    reason: `当前定价内核已经冻结，active scope 的内部 trial 结论也已经做过 parity closure。下一步不再继续扩模板、扩 coverage 或追公式微调，而是把 quoted rollback、manual confirmation、review note、calibration signal 和 drift evidence 先沉淀成真实运营证据；只有当正式报价反馈出现连续同源同向漂移时，才重开 calibration。`,
    secondaryTrack: 'coverage_expansion',
    secondaryTrackLabel: '后续 coverage 候选储备',
    orderedNextMoves: [
      '先让正式报价反馈进入结构化留痕：quote status、review status、manual confirmation result、review note、rejection reason、rejection target area、calibration signal、drift source candidate。',
      '业务只登记真实回传的 quoted feedback，不把所有正式报价自动塞进 review queue。',
      '按连续同源同向 10 单的规则监控 calibration reopen trigger；没达到阈值前继续保持 pricing freeze。',
      '继续验证 quote export、review queue、manual confirmation、audit trail 和 batch export 是否足够支撑 limited trial 归档。',
      'coverage 扩张只保留为后续候选储备，等真实 trial 证据收敛后再重排优先级。',
    ],
  }
}

export const PRICING_TRIAL_RUN_REVIEW_DRAFT: PricingTrialRunReviewDraft = {
  docPath: PRICING_TRIAL_RUN_REVIEW_DOC_PATH,
  reviewDate: '2026-04-07',
  methodology: {
    mode: 'internal_simulated_trial',
    summary: `当前还没有可用于决策的稳定真实流量样本，所以这轮复盘使用 canonical trial scope 的 ${TOTAL_SCENARIOS} 条 representative messages，叠加 acceptance gate、RAG/router fallback 回归、quote export 回归、trial review queue workflow 和现有观察面板，做一轮内部试运行验证；本轮也已把此前阻塞顶层 MVP 的 OpenAI eager import 与导出依赖损坏修复重新纳入结论。`,
    sources: [
      PRICING_TRIAL_SCOPE_CANONICAL_DOC_PATH,
      'src/server/pricing/pricingTrialReleaseGateDraft.ts',
      'src/server/pricing/pricingAcceptanceGateDraft.ts',
      'src/tests/pricing-trial-scope-source-of-truth.test.ts',
      'src/tests/mvp-regression.test.ts',
      'src/tests/lightweight-agent-router-rag.test.ts',
      'src/tests/chat-api-rag-routing.test.ts',
      'src/tests/quote-excel-export.test.ts',
      'src/tests/conversation-export-filters.test.ts',
      'src/tests/trial-review-queue.test.ts',
      'src/tests/trial-review-observation.test.ts',
      'src/tests/delivery-admin-status-consistency.test.ts',
      'docs/pricing-delivery-coverage-review.md',
      'src/app/trial-reviews/page.tsx',
    ],
    totalRepresentativeScenarios: TOTAL_SCENARIOS,
    totalAcceptanceGates: ACCEPTANCE_ENTRIES.length,
  },
  overview: buildOverview(),
  pathDistribution: buildPathDistribution(),
  manualHotspots: buildManualHotspots(),
  deliveryExperience: buildDeliveryExperience(),
  blockers: buildBlockers(),
  coverageCandidates: buildCoverageCandidates(),
  recommendation: buildRecommendation(),
  scenarioEvaluations: PRICING_TRIAL_RUN_SCENARIO_EVALUATIONS,
}