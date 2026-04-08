export type PricingBlockerBucket = 'trial' | 'coverage' | 'general_use' | 'non_blocker'

export type PricingBlockerPriority = 'P0' | 'P1' | 'P2' | 'later'

export type PricingBlockerEntry = {
  id: string
  title: string
  bucket: PricingBlockerBucket
  priority: PricingBlockerPriority
  status: 'open' | 'cleared' | 'guardrailed'
  summary: string
  whyItMatters: string
  currentTreatment: string
  evidencePaths: string[]
}

export type PricingExecutionStep = {
  id: string
  title: string
  goal: string
  whyNow: string
  expectedOutcome: string
}

export const PRICING_BLOCKER_EVIDENCE_PATHS = [
  'docs/pricing-module-maturity-review.md',
  'src/server/pricing/pricingTrialScopeDraft.ts',
  'src/server/pricing/pricingAcceptanceGateDraft.ts',
  'src/tests/complex-packaging-pricing.test.ts',
  'src/tests/chat-api-consultative-packaging-routing.test.ts',
  'src/tests/complex-packaging-extraction.test.ts',
] as const

export const PRICING_BLOCKER_REVIEW_DRAFT: PricingBlockerEntry[] = [
  {
    id: 'trial_runtime_gate_consistency',
    title: 'Runtime trial gate consistency',
    bucket: 'trial',
    priority: 'P0',
    status: 'cleared',
    summary: 'allowed quoted / estimated-only / handoff-only trial gate 已进入主链路，并被 extraction、pricing、chat routing 回归覆盖。',
    whyItMatters: '如果这层不稳，limited trial 会直接失去边界控制。',
    currentTreatment: 'cleared in runtime; continue regression guarding',
    evidencePaths: [
      'src/server/pricing/pricingTrialScopeDraft.ts',
      'src/tests/complex-packaging-pricing.test.ts',
      'src/tests/chat-api-consultative-packaging-routing.test.ts',
    ],
  },
  {
    id: 'trial_source_of_truth_sync',
    title: 'Trial source-of-truth sync',
    bucket: 'trial',
    priority: 'P0',
    status: 'cleared',
    summary: 'trial source-of-truth 已同步到 canonical trial scope，runtime / acceptance / release wording 当前一致。',
    whyItMatters: '这层清掉后，coverage blocker 才能继续按单一口径推进。',
    currentTreatment: 'cleared; keep source-of-truth regression guarding',
    evidencePaths: [
      'docs/pricing-trial-scope.md',
      'src/server/pricing/pricingTrialReleaseGateDraft.ts',
    ],
  },
  {
    id: 'standard_bundle_coverage_gap',
    title: 'Standard quoted bundle coverage is still narrow',
    bucket: 'coverage',
    priority: 'P1',
    status: 'open',
    summary: '当前已放开标准双插盒+标准说明书、标准双插盒+标准内托、标准双插盒+标准说明书+标准贴纸、标准主盒+标准贴纸、标准主盒+simple carton、空白铝箔袋+simple carton；剩余 bundle 缺口主要落在 generic leaflet、多配件组合与非白名单主盒+内托。',
    whyItMatters: '这直接限制真实订单承接能力，是当前收益最高的 coverage blocker。',
    currentTreatment: 'selective quoted bundle + estimated fallback',
    evidencePaths: [
      'src/server/pricing/pricingTrialScopeDraft.ts',
      'src/tests/complex-packaging-pricing.test.ts',
      'src/tests/chat-api-consultative-packaging-routing.test.ts',
    ],
  },
  {
    id: 'box_insert_proxy_blocker',
    title: 'Box insert still depends on proxy',
    bucket: 'coverage',
    priority: 'P1',
    status: 'open',
    summary: '显式克重的标准内托已从 proxy 中拆出，标准双插盒 + 标准内托 bundle 也已放开；剩余缺克重内托与非白名单主盒 + 内托组合仍走 estimated。',
    whyItMatters: '当前只清掉了最稳定的一小类 insert bundle；更宽的主盒 + 内托覆盖仍受 proxy 与 order-level 证据限制。',
    currentTreatment: 'narrow quoted bundle + proxy estimated_only + non-whitelisted insert bundle estimated_only',
    evidencePaths: [
      'docs/pricing-trial-scope.md',
      'src/server/pricing/pricingTrialReleaseGateDraft.ts',
      'src/tests/complex-packaging-pricing.test.ts',
    ],
  },
  {
    id: 'generic_leaflet_estimated_only',
    title: 'Generic leaflet is still estimated-only',
    bucket: 'coverage',
    priority: 'P1',
    status: 'open',
    summary: 'generic print 的说明书价格已 close，但边界仍保守停在 estimated。',
    whyItMatters: '这是高频配件，提升它会同时改善单品与 bundle coverage。',
    currentTreatment: 'estimated_only',
    evidencePaths: [
      'docs/pricing-module-maturity-review.md',
      'src/tests/complex-packaging-pricing.test.ts',
    ],
  },
  {
    id: 'window_no_film_estimated_only',
    title: 'Window no-film remains estimated-only',
    bucket: 'coverage',
    priority: 'P2',
    status: 'open',
    summary: '开窗不贴胶片路径已经从 handoff 收紧到 estimated，但尚未进入 quoted。',
    whyItMatters: '这是真实场景中的 coverage 缺口，但优先级低于标准 bundle 和内托 proxy。',
    currentTreatment: 'estimated_only',
    evidencePaths: [
      'docs/pricing-module-maturity-review.md',
      'src/tests/complex-packaging-extraction.test.ts',
    ],
  },
  {
    id: 'printed_foil_bag_and_carton_conservative',
    title: 'Printed foil bag and carton remain conservative',
    bucket: 'coverage',
    priority: 'P2',
    status: 'open',
    summary: '当前 2.5 批只放开 blank foil bag / simple carton，定制印刷路径仍保守。',
    whyItMatters: '这会限制 2.5 批覆盖，但风险高于当前标准 bundle 扩展。',
    currentTreatment: 'estimated_only',
    evidencePaths: [
      'docs/pricing-module-maturity-review.md',
      'src/server/pricing/pricingTrialScopeDraft.ts',
    ],
  },
  {
    id: 'template_outside_active_scope',
    title: 'Template-outside structures',
    bucket: 'general_use',
    priority: 'P2',
    status: 'open',
    summary: '模板外结构、复杂礼盒、复杂外箱仍未进入结构化模板。',
    whyItMatters: '这阻止系统走向 general use，但不应成为当前 limited trial 的优先开发对象。',
    currentTreatment: 'human handoff',
    evidencePaths: ['docs/pricing-module-maturity-review.md'],
  },
  {
    id: 'file_and_dieline_driven_cases',
    title: 'File and dieline driven cases',
    bucket: 'general_use',
    priority: 'P2',
    status: 'open',
    summary: 'PDF、AI、CDR、PSD、ZIP、刀线图驱动案例仍依赖人工兜底。',
    whyItMatters: '这些路径复杂度高、人工判断成分高，不适合当前阶段强行自动化。',
    currentTreatment: 'human handoff',
    evidencePaths: [
      'docs/pricing-module-maturity-review.md',
      'src/server/pricing/pricingTrialScopeDraft.ts',
    ],
  },
  {
    id: 'complex_terms_and_materials',
    title: 'Complex terms and materials',
    bucket: 'general_use',
    priority: 'P2',
    status: 'open',
    summary: '高复杂术语、特材、复杂工艺和长尾材料组合仍依赖人工经验判断。',
    whyItMatters: '这是 general use blocker，不是现在最应该优先消灭的 trial / coverage blocker。',
    currentTreatment: 'human handoff',
    evidencePaths: ['docs/pricing-module-maturity-review.md'],
  },
  {
    id: 'close_band_micro_tuning',
    title: 'Close-band micro tuning',
    bucket: 'non_blocker',
    priority: 'later',
    status: 'guardrailed',
    summary: '已进入 close / accepted 的局部 residual 继续微调，不再是 blocker。',
    whyItMatters: '继续追这些小误差的边际收益很低，且容易打坏已有边界。',
    currentTreatment: 'later improvement only',
    evidencePaths: [
      'docs/workbook-pricing-calibration-comparison.md',
      'docs/workbook-pricing-acceptance-gate.md',
    ],
  },
]

export const PRICING_EXECUTION_ORDER_DRAFT: PricingExecutionStep[] = [
  {
    id: 'step_1',
    title: 'Sync trial source of truth',
    goal: '把 runtime gate、acceptance gate、业务侧 release 口径统一成单一事实源。',
    whyNow: '这一步已经完成，现在只需要继续靠 source-of-truth regression 保持一致。',
    expectedOutcome: '业务与技术当前已共享同一 trial 范围解释。',
  },
  {
    id: 'step_2',
    title: 'Expand standard quoted bundles',
    goal: '继续扩大普通标准 bundle quoted 覆盖；主盒+simple carton、标准双插盒+标准内托，以及最简单的双标准配件组合都已纳入同一准入体系。',
    whyNow: '当前最稳定、最有 workbook-grounded 或 controlled acceptance 证据的标准 bundle 已经可以按 order-ready 口径统一放开。',
    expectedOutcome: '系统扩大真实标准订单承接能力，但仍保持 quoted bundle 的窄白名单与 order-level acceptance guardrails。',
  },
  {
    id: 'step_3',
    title: 'De-proxy high-frequency estimated paths',
    goal: '优先评估 generic leaflet，再看 window no-film 是否能升级到更窄 quoted 子路径。',
    whyNow: '标准双插盒 + 标准内托这条最稳的 insert bundle 已经放开，下一批更适合处理高频 estimated 单品路径。',
    expectedOutcome: '更多高频标准单品进入 quoted 或更清晰的保守子路径，同时保住 limited trial guardrails。',
  },
  {
    id: 'step_4',
    title: 'Keep long-tail and file-driven paths manual',
    goal: '模板外结构、复杂文件、复杂礼盒/外箱、高复杂术语继续保留人工兜底。',
    whyNow: '这些是 general-use blocker，不适合在当前阶段强行推进自动化。',
    expectedOutcome: '系统继续保持 ready_for_limited_trial，而不是被误拉向高风险 general use。',
  },
]

export function getOpenPricingBlockers(bucket?: Exclude<PricingBlockerBucket, 'non_blocker'>) {
  return PRICING_BLOCKER_REVIEW_DRAFT.filter((entry) => {
    if (entry.status !== 'open') {
      return false
    }

    return bucket ? entry.bucket === bucket : entry.bucket !== 'non_blocker'
  })
}